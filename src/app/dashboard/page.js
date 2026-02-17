'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import useIsMobile from '@/lib/useIsMobile';
import { useClassStore } from '@/stores/useClassStore';
import { useGalaxyStore } from '@/stores/useGalaxyStore';
import { useRaceStore } from '@/stores/useRaceStore';
import { connectSocket, getSocket } from '@/lib/socket';

const DashLoadingUI = ({ emoji, text }) => (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--bg-void)' }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>{emoji}</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{text}</p>
    </div>
);

const EmbeddingGalaxy = dynamic(() => import('@/components/3d/EmbeddingGalaxy'), {
    ssr: false,
    loading: () => <DashLoadingUI emoji="🌌" text="관제탑 로딩 중..." />,
});

const GradientRaceScene = dynamic(() => import('@/components/3d/GradientRaceScene'), {
    ssr: false,
    loading: () => <DashLoadingUI emoji="🏔️" text="레이싱 로딩 중..." />,
});

export default function DashboardPage() {
    const isMobile = useIsMobile();
    const students = useClassStore((s) => s.students);
    const setStudents = useClassStore((s) => s.setStudents);
    const addStudent = useClassStore((s) => s.addStudent);
    const removeStudent = useClassStore((s) => s.removeStudent);
    const notifications = useClassStore((s) => s.notifications);
    const addNotification = useClassStore((s) => s.addNotification);

    const stars = useGalaxyStore((s) => s.stars);
    const addOrUpdateStar = useGalaxyStore((s) => s.addOrUpdateStar);
    const removeStar = useGalaxyStore((s) => s.removeStar);
    const loadFromRoomState = useGalaxyStore((s) => s.loadFromRoomState);

    const racePhase = useRaceStore((s) => s.racePhase);
    const setRacePhase = useRaceStore((s) => s.setRacePhase);
    const raceTeams = useRaceStore((s) => s.teams);
    const setTeams = useRaceStore((s) => s.setTeams);
    const updateBalls = useRaceStore((s) => s.updateBalls);
    const setResults = useRaceStore((s) => s.setResults);
    const raceResults = useRaceStore((s) => s.results);
    const resetRace = useRaceStore((s) => s.reset);

    const [roomCode, setRoomCode] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [activeWeek, setActiveWeek] = useState(3);
    const [attentionStates, setAttentionStates] = useState({});

    // 퀴즈 시스템
    const [showQuizPanel, setShowQuizPanel] = useState(false);
    const [quizType, setQuizType] = useState('ox');
    const [quizQuestion, setQuizQuestion] = useState('');
    const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
    const [quizCorrect, setQuizCorrect] = useState('O');
    const [quizTimeLimit, setQuizTimeLimit] = useState(15);
    const [quizLive, setQuizLive] = useState(null);
    const [quizAnswerCount, setQuizAnswerCount] = useState(0);
    const [quizResults, setQuizResults] = useState(null);

    const handleConnect = () => {
        if (!roomCode.trim()) return;

        const socket = connectSocket();

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join_dashboard', { roomCode: roomCode.trim() });
            addNotification('🎓 관제탑 연결 완료');
        });

        socket.on('room_state', (data) => {
            setStudents(data.students);
            loadFromRoomState(data.students);
            // 레이싱 상태 복원
            if (data.raceTeams) setTeams(data.raceTeams);
            if (data.racePhase) setRacePhase(data.racePhase);
            if (data.raceBalls) updateBalls(data.raceBalls);
        });

        socket.on('student_joined', (data) => {
            addStudent(data.student);
            addNotification(`🚀 ${data.student.studentName}(${data.student.schoolCode}) 입장! (${data.totalCount}명)`);
        });

        socket.on('student_left', (data) => {
            removeStudent(data.studentId);
            removeStar(data.studentId);
            addNotification(`💫 ${data.studentName} 퇴장 (${data.totalCount}명)`);
        });

        socket.on('word_registered', (data) => {
            addOrUpdateStar(data.studentId, {
                studentName: data.studentName,
                word: data.word,
                position: data.position,
                color: data.color,
            });
            addNotification(`⭐ ${data.studentName}이(가) "${data.word}" 별을 생성!`);
        });

        socket.on('word_moved', (data) => {
            addOrUpdateStar(data.studentId, { position: data.position });
        });

        // 레이싱 이벤트
        socket.on('race_teams_updated', (data) => setTeams(data.teams));
        socket.on('race_started', (data) => {
            setRacePhase('racing');
            updateBalls(data.balls);
            addNotification('🏁 레이스 시작!');
        });
        socket.on('race_tick', (data) => updateBalls(data.balls));
        socket.on('race_alert', (data) => addNotification(data.message));
        socket.on('race_finished', (data) => {
            setRacePhase('finished');
            setResults(data.results);
            addNotification('🏆 레이스 종료!');
        });
        socket.on('race_reset', () => {
            resetRace();
            addNotification('🔄 레이스 리셋');
        });

        // 어텐션 이벤트 (Week 10)
        socket.on('attention_updated', (data) => {
            setAttentionStates((prev) => ({
                ...prev,
                [data.studentId]: data,
            }));
        });

        // 퀴즈 이벤트
        socket.on('quiz_answer_received', (data) => {
            setQuizAnswerCount(data.totalAnswered);
            addNotification(`✅ ${data.studentName} 퀴즈 답변 제출 (${data.totalAnswered}/${data.totalStudents})`);
        });
        socket.on('quiz_results', (data) => {
            setQuizResults(data);
            setQuizLive(null);
            addNotification(`📊 퀴즈 결과: 정답률 ${data.correctRate}%`);
        });
    };

    const handleTeacherCommand = (command) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('teacher_command', { command, roomCode });
            addNotification(`📢 교사 명령: ${command}`);
        }
    };

    const handleStartRace = () => {
        const socket = getSocket();
        if (socket) socket.emit('start_race');
    };

    const handleResetRace = () => {
        const socket = getSocket();
        if (socket) socket.emit('reset_race');
    };

    // 퀴즈 전송
    const handleSendQuiz = () => {
        if (!quizQuestion.trim()) return;
        const socket = getSocket();
        if (!socket) return;

        const payload = {
            question: quizQuestion,
            type: quizType,
            correctAnswer: quizCorrect,
            timeLimit: quizTimeLimit,
        };
        if (quizType === 'choice') {
            payload.options = quizOptions.filter(o => o.trim());
        }

        socket.emit('send_quiz', payload);
        setQuizLive(payload);
        setQuizAnswerCount(0);
        setQuizResults(null);
        setShowQuizPanel(false);
        addNotification(`📝 퀴즈 전송! "${quizQuestion}"`);
    };

    // 퀴즈 결과 공개
    const handleRevealResults = () => {
        const socket = getSocket();
        if (socket) socket.emit('reveal_quiz_results');
    };

    // 퀴즈 취소
    const handleCancelQuiz = () => {
        const socket = getSocket();
        if (socket) socket.emit('cancel_quiz');
        setQuizLive(null);
        setQuizAnswerCount(0);
    };

    // ── 미연결 상태 ──
    if (!isConnected) {
        return (
            <div style={styles.loginContainer}>
                <div className="glass-card animate-fade-in" style={styles.loginCard}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ fontSize: '4rem', marginBottom: 12 }} className="animate-float">🎓</div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                            <span className="text-gradient">교사 관제탑</span>
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                            학생들의 우주를 한눈에 관찰하고 관리합니다
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label className="label-cosmic">수업 방 코드</label>
                            <input
                                className="input-cosmic"
                                placeholder="학생들에게 알려준 방 코드 입력"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>
                        <button className="btn-nova" style={{ width: '100%' }} onClick={handleConnect}>
                            <span>🔭 관제탑 접속</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── 관제탑 메인 화면 ──
    const starCount = Object.keys(stars).length;
    const raceTeamCount = Object.keys(raceTeams).length;

    return (
        <div style={{
            ...styles.container,
            ...(isMobile ? { height: 'auto', minHeight: '100vh', overflow: 'auto' } : {}),
        }}>
            {/* 상단 바 */}
            <div style={styles.topBar}>
                <div style={styles.topLeft}>
                    <h1 style={styles.dashTitle}>🎓 관제탑</h1>
                    <span className="badge-glow online">🟢 방: {roomCode}</span>
                    <span className="badge-glow">👨‍🚀 {students.length}명</span>

                    {/* 주차 선택 탭 */}
                    <div style={styles.weekTabs}>
                        <button
                            style={{ ...styles.weekTab, ...(activeWeek === 3 ? styles.weekTabActive : {}) }}
                            onClick={() => setActiveWeek(3)}
                        >
                            🌌 3주차
                        </button>
                        <button
                            style={{ ...styles.weekTab, ...(activeWeek === 5 ? styles.weekTabActive : {}) }}
                            onClick={() => setActiveWeek(5)}
                        >
                            🏎️ 5주차
                        </button>
                        <button
                            style={{ ...styles.weekTab, ...(activeWeek === 10 ? styles.weekTabActive : {}) }}
                            onClick={() => setActiveWeek(10)}
                        >
                            ✨ 10주차
                        </button>
                    </div>
                </div>
                <div style={styles.topRight}>
                    {activeWeek === 5 && (
                        <>
                            <button
                                className="btn-nova"
                                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                                onClick={handleStartRace}
                                disabled={racePhase === 'racing'}
                            >
                                <span>🏁 레이스 시작 ({raceTeamCount}팀)</span>
                            </button>
                            <button
                                className="btn-nova"
                                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                                onClick={handleResetRace}
                            >
                                <span>🔄 리셋</span>
                            </button>
                        </>
                    )}
                    <button
                        className="btn-nova"
                        style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                        onClick={() => setShowQuizPanel(!showQuizPanel)}
                    >
                        <span>📝 퀴즈</span>
                    </button>
                    <button
                        className="btn-nova"
                        style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                        onClick={() => handleTeacherCommand('PAUSE')}
                    >
                        <span>⏸️ 일시정지</span>
                    </button>
                </div>
            </div>

            {/* 메인 영역 */}
            <div style={{
                ...styles.mainArea,
                ...(isMobile ? { flexDirection: 'column' } : {}),
            }}>
                {/* 3D 메인 스크린 */}
                <div style={{
                    ...styles.canvasArea,
                    ...(isMobile ? { height: 350, flex: 'none' } : {}),
                }}>
                    {activeWeek === 3 ? (
                        <WebGLErrorBoundary fallbackProps={{
                            weekTitle: '3D 임베딩 은하수',
                            conceptSummary: '3D 뷰어를 사용할 수 없습니다. 학생 현황은 오른쪽 패널에서 확인하세요.',
                        }}>
                            <EmbeddingGalaxy />
                        </WebGLErrorBoundary>
                    ) : activeWeek === 5 ? (
                        <WebGLErrorBoundary fallbackProps={{
                            weekTitle: '3D 경사하강법 레이싱',
                            conceptSummary: '3D 뷰어를 사용할 수 없습니다. 레이스 결과는 오른쪽 패널에서 확인하세요.',
                        }}>
                            <GradientRaceScene />
                        </WebGLErrorBoundary>
                    ) : (
                        <AttentionOverview attentionStates={attentionStates} />
                    )}
                    <div style={styles.overlayBadge}>
                        <span className="badge-glow" style={{ fontSize: '1rem', padding: '8px 18px' }}>
                            {activeWeek === 3
                                ? '🌌 임베딩 은하수 · 빔프로젝터 투사용'
                                : activeWeek === 5
                                    ? `🏔️ 경사하강법 레이싱 · ${racePhase === 'racing' ? '레이싱 중!' : racePhase === 'finished' ? '완료!' : '대기 중'}`
                                    : `✨ 어텐션 게임 · ${Object.keys(attentionStates).length}명 참여 중`}
                        </span>
                    </div>
                </div>

                {/* 우측 사이드바 */}
                <div style={{
                    ...styles.sidebar,
                    ...(isMobile ? { width: '100%', borderLeft: 'none', borderTop: '1px solid var(--border-subtle)' } : {}),
                }}>
                    {/* 학생 현황 */}
                    <div className="glass-card" style={styles.sideSection}>
                        <label className="label-cosmic">접속 학생 현황</label>
                        {students.length === 0 ? (
                            <div style={styles.emptyState}>
                                <span style={{ fontSize: '2rem' }}>👨‍🚀</span>
                                <p>학생들이 입장하면 여기에 표시됩니다</p>
                            </div>
                        ) : (
                            <div style={styles.studentGrid}>
                                {students.map((s) => (
                                    <div key={s.id} style={styles.studentCard}>
                                        <div style={{
                                            ...styles.cardDot,
                                            background: s.color || 'var(--accent-nova)',
                                        }} />
                                        <div>
                                            <div style={styles.cardName}>{s.studentName}</div>
                                            <div style={styles.cardSchool}>
                                                {s.schoolCode === 'SEOUL_HIGH' ? '서울고' :
                                                    s.schoolCode === 'DONGDUK_GIRL' ? '동덕여고' :
                                                        s.schoolCode === 'SANGMUN_HIGH' ? '상문고' : s.schoolCode}
                                            </div>
                                        </div>
                                        {stars[s.id] && (
                                            <span style={styles.cardWord}>{stars[s.id].word}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 레이스 결과 (Week 5) */}
                    {activeWeek === 5 && raceResults.length > 0 && (
                        <div className="glass-card" style={styles.sideSection}>
                            <label className="label-cosmic">🏆 레이스 결과</label>
                            {raceResults.map((r) => (
                                <div key={r.teamId} style={styles.resultRow}>
                                    <span>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}</span>
                                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.82rem' }}>{r.teamName}</span>
                                    <span style={{ fontSize: '0.75rem', color: r.status === 'escaped' ? '#f43f5e' : '#10b981', fontFamily: 'monospace' }}>
                                        {r.status === 'escaped' ? '이탈' : `${r.finalLoss?.toFixed(3)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 어텐션 참여자 (Week 10) */}
                    {activeWeek === 10 && Object.keys(attentionStates).length > 0 && (
                        <div className="glass-card" style={styles.sideSection}>
                            <label className="label-cosmic">✨ 어텐션 참여자</label>
                            <div style={styles.studentGrid}>
                                {Object.values(attentionStates).map((a) => (
                                    <div key={a.studentId} style={styles.studentCard}>
                                        <div style={{ ...styles.cardDot, background: '#fbbf24' }} />
                                        <div>
                                            <div style={styles.cardName}>{a.studentName}</div>
                                            <div style={styles.cardSchool}>
                                                {a.sentenceName || '-'} · H{a.headCount || 1}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 퀴즈 패널 */}
                    {showQuizPanel && !quizLive && (
                        <div className="glass-card" style={styles.sideSection}>
                            <label className="label-cosmic">📝 퀴즈 만들기</label>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                <button
                                    onClick={() => { setQuizType('ox'); setQuizCorrect('O'); }}
                                    style={{
                                        ...styles.quizTypeBtn,
                                        ...(quizType === 'ox' ? styles.quizTypeBtnActive : {}),
                                    }}
                                >⭕❌ O/X</button>
                                <button
                                    onClick={() => { setQuizType('choice'); setQuizCorrect(''); }}
                                    style={{
                                        ...styles.quizTypeBtn,
                                        ...(quizType === 'choice' ? styles.quizTypeBtnActive : {}),
                                    }}
                                >①②③④ 선택</button>
                            </div>
                            <input
                                className="input-cosmic"
                                placeholder="질문을 입력하세요"
                                value={quizQuestion}
                                onChange={e => setQuizQuestion(e.target.value)}
                                style={{ fontSize: '0.85rem' }}
                            />
                            {quizType === 'ox' && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        onClick={() => setQuizCorrect('O')}
                                        style={{
                                            ...styles.quizTypeBtn, flex: 1,
                                            ...(quizCorrect === 'O' ? { background: 'rgba(96,165,250,0.2)', border: '1px solid #60a5fa', color: '#60a5fa' } : {}),
                                        }}
                                    >정답: ⭕ O</button>
                                    <button
                                        onClick={() => setQuizCorrect('X')}
                                        style={{
                                            ...styles.quizTypeBtn, flex: 1,
                                            ...(quizCorrect === 'X' ? { background: 'rgba(248,113,113,0.2)', border: '1px solid #f87171', color: '#f87171' } : {}),
                                        }}
                                    >정답: ❌ X</button>
                                </div>
                            )}
                            {quizType === 'choice' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {quizOptions.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <input
                                                className="input-cosmic"
                                                placeholder={`선택지 ${i + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const next = [...quizOptions];
                                                    next[i] = e.target.value;
                                                    setQuizOptions(next);
                                                }}
                                                style={{ flex: 1, fontSize: '0.8rem', padding: '6px 10px' }}
                                            />
                                            <button
                                                onClick={() => setQuizCorrect(opt)}
                                                style={{
                                                    padding: '4px 8px', borderRadius: 6, fontSize: '0.7rem',
                                                    border: quizCorrect === opt ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                    background: quizCorrect === opt ? 'rgba(16,185,129,0.2)' : 'transparent',
                                                    color: quizCorrect === opt ? '#10b981' : 'var(--text-dim)',
                                                    cursor: 'pointer',
                                                }}
                                            >정답</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>제한시간:</span>
                                {[10, 15, 20, 30].map(t => (
                                    <button key={t} onClick={() => setQuizTimeLimit(t)} style={{
                                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem',
                                        border: quizTimeLimit === t ? '1px solid #a78bfa' : '1px solid rgba(255,255,255,0.1)',
                                        background: quizTimeLimit === t ? 'rgba(167,139,250,0.2)' : 'transparent',
                                        color: quizTimeLimit === t ? '#a78bfa' : 'var(--text-dim)',
                                        cursor: 'pointer',
                                    }}>{t}초</button>
                                ))}
                            </div>
                            <button className="btn-nova" style={{ width: '100%', padding: '10px' }} onClick={handleSendQuiz}>
                                <span>🚀 퀴즈 전송 ({students.length}명에게)</span>
                            </button>
                        </div>
                    )}

                    {/* 진행 중인 퀴즈 */}
                    {quizLive && !quizResults && (
                        <div className="glass-card" style={styles.sideSection}>
                            <label className="label-cosmic">📝 퀴즈 진행 중</label>
                            <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                                {quizLive.question}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    응답: <strong style={{ color: '#10b981' }}>{quizAnswerCount}</strong> / {students.length}명
                                </span>
                                <div style={{
                                    width: 60, height: 6, borderRadius: 3,
                                    background: 'rgba(255,255,255,0.1)',
                                }}>
                                    <div style={{
                                        width: `${students.length > 0 ? (quizAnswerCount / students.length * 100) : 0}%`,
                                        height: '100%', borderRadius: 3,
                                        background: '#10b981', transition: 'width 0.3s',
                                    }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-nova" style={{ flex: 1, padding: '8px' }} onClick={handleRevealResults}>
                                    <span>📊 결과 공개</span>
                                </button>
                                <button onClick={handleCancelQuiz} style={{
                                    padding: '8px 14px', borderRadius: 8,
                                    background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
                                    color: '#f43f5e', fontSize: '0.82rem', cursor: 'pointer',
                                }}>취소</button>
                            </div>
                        </div>
                    )}

                    {/* 퀴즈 결과 */}
                    {quizResults && (
                        <div className="glass-card" style={styles.sideSection}>
                            <label className="label-cosmic">📊 퀴즈 결과</label>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {quizResults.question}
                            </p>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <div style={styles.quizResultStat}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                                        {quizResults.correctRate}%
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>정답률</span>
                                </div>
                                <div style={styles.quizResultStat}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa' }}>
                                        {quizResults.correctCount}/{quizResults.totalAnswered}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>정답/응답</span>
                                </div>
                            </div>
                            {quizResults.fastest && (
                                <div style={{
                                    padding: '6px 10px', borderRadius: 6,
                                    background: 'rgba(251,191,36,0.1)',
                                    fontSize: '0.78rem', color: '#fbbf24', textAlign: 'center',
                                }}>
                                    ⚡ 최빠 정답: {quizResults.fastest.studentName} ({(quizResults.fastest.responseTime / 1000).toFixed(1)}초)
                                </div>
                            )}
                            {/* 답변 분포 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {Object.entries(quizResults.tally).map(([answer, count]) => (
                                    <div key={answer} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '4px 8px', borderRadius: 6,
                                        background: answer === quizResults.correctAnswer
                                            ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                                    }}>
                                        <span style={{
                                            fontSize: '0.8rem', fontWeight: 600, minWidth: 30,
                                            color: answer === quizResults.correctAnswer ? '#10b981' : 'var(--text-dim)',
                                        }}>
                                            {answer === quizResults.correctAnswer ? '✅' : ''} {answer}
                                        </span>
                                        <div style={{
                                            flex: 1, height: 6, borderRadius: 3,
                                            background: 'rgba(255,255,255,0.05)',
                                        }}>
                                            <div style={{
                                                width: `${quizResults.totalAnswered > 0 ? (count / quizResults.totalAnswered * 100) : 0}%`,
                                                height: '100%', borderRadius: 3,
                                                background: answer === quizResults.correctAnswer ? '#10b981' : '#64748b',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: 20 }}>
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setQuizResults(null)} style={{
                                padding: '6px 12px', borderRadius: 6,
                                background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.2)',
                                color: '#a78bfa', fontSize: '0.78rem', cursor: 'pointer', width: '100%',
                            }}>닫기</button>
                        </div>
                    )}

                    {/* 알림 로그 */}
                    <div className="glass-card" style={{ ...styles.sideSection, flex: 1, minHeight: 0 }}>
                        <label className="label-cosmic">실시간 알림 📢</label>
                        <div style={styles.notifScroll}>
                            {notifications.length === 0 ? (
                                <div style={styles.emptyState}>
                                    <span style={{ fontSize: '1.5rem' }}>📭</span>
                                    <p>아직 알림이 없습니다</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} style={styles.notifItem}>
                                        <span style={styles.notifTime}>{n.time}</span>
                                        <span style={styles.notifMsg}>{n.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 어텐션 오버뷰 (Week 10 메인 스크린) ──
function AttentionOverview({ attentionStates }) {
    const entries = Object.values(attentionStates);

    if (entries.length === 0) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-void)',
            }}>
                <div style={{ fontSize: '4rem', marginBottom: 16 }}>✨</div>
                <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>
                    학생들이 어텐션 게임에 참여하면 여기에 표시됩니다
                </p>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%', height: '100%',
            padding: 24, overflowY: 'auto',
            background: 'var(--bg-void)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16, alignContent: 'start',
        }}>
            {entries.map((a) => (
                <div key={a.studentId} style={{
                    padding: 16,
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fbbf24' }}>
                            {a.studentName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {a.sentenceName || '-'} · H{a.headCount || 1}
                        </span>
                    </div>
                    {a.attentionWeights ? (
                        <DashboardHeatmap weights={a.attentionWeights} />
                    ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>데이터 대기 중...</p>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── 대시보드 히트맵 (어텐션 가중치 시각화) ──
function DashboardHeatmap({ weights }) {
    if (!weights || !weights.length) return null;
    const n = weights.length;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, gap: 3 }}>
            {weights.map((row, i) =>
                row.map((w, j) => (
                    <div
                        key={`${i}-${j}`}
                        style={{
                            width: '100%',
                            aspectRatio: '1',
                            background: `rgba(124, 92, 252, ${w * 0.85 + 0.05})`,
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.65rem',
                            fontFamily: 'monospace',
                            color: w > 0.35 ? '#fff' : 'rgba(255,255,255,0.35)',
                            fontWeight: w > 0.3 ? 700 : 400,
                            transition: 'all 0.3s ease',
                        }}
                    >
                        {(w * 100).toFixed(0)}
                    </div>
                ))
            )}
        </div>
    );
}

const styles = {
    loginContainer: {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginCard: {
        width: '100%',
        maxWidth: 440,
        padding: '44px 36px',
        margin: 20,
    },
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    topBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        flexWrap: 'wrap',
        gap: 8,
    },
    topLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    topRight: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    dashTitle: {
        fontSize: '1.2rem',
        fontWeight: 800,
    },
    weekTabs: {
        display: 'flex',
        gap: 4,
        marginLeft: 8,
        background: 'rgba(124, 92, 252, 0.08)',
        borderRadius: 8,
        padding: 3,
    },
    weekTab: {
        padding: '6px 14px',
        fontSize: '0.8rem',
        fontWeight: 600,
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        background: 'transparent',
        color: 'var(--text-dim)',
        transition: 'all 0.2s',
    },
    weekTabActive: {
        background: 'var(--accent-nova)',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(124, 92, 252, 0.4)',
    },
    mainArea: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
    },
    canvasArea: {
        flex: 1,
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden',
    },
    overlayBadge: {
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
    },
    sidebar: {
        width: 340,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        borderLeft: '1px solid var(--border-subtle)',
        overflowY: 'auto',
    },
    sideSection: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    studentGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 250,
        overflowY: 'auto',
    },
    studentCard: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(124, 92, 252, 0.06)',
        border: '1px solid rgba(124, 92, 252, 0.1)',
    },
    cardDot: {
        width: 12,
        height: 12,
        borderRadius: '50%',
        flexShrink: 0,
    },
    cardName: {
        fontSize: '0.82rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    cardSchool: {
        fontSize: '0.7rem',
        color: 'var(--text-dim)',
    },
    cardWord: {
        marginLeft: 'auto',
        fontSize: '0.75rem',
        color: 'var(--accent-laser-gold)',
        fontWeight: 600,
    },
    resultRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(124, 92, 252, 0.05)',
    },
    notifScroll: {
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    notifItem: {
        display: 'flex',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        background: 'rgba(124, 92, 252, 0.04)',
        fontSize: '0.78rem',
    },
    notifTime: {
        color: 'var(--text-dim)',
        fontFamily: 'monospace',
        fontSize: '0.7rem',
        flexShrink: 0,
    },
    notifMsg: {
        color: 'var(--text-secondary)',
    },
    emptyState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '24px 16px',
        color: 'var(--text-dim)',
        fontSize: '0.82rem',
        textAlign: 'center',
    },
    quizTypeBtn: {
        flex: 1,
        padding: '6px 12px',
        borderRadius: 8,
        fontSize: '0.78rem',
        fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'transparent',
        color: 'var(--text-dim)',
        cursor: 'pointer',
    },
    quizTypeBtnActive: {
        background: 'rgba(124, 92, 252, 0.15)',
        border: '1px solid rgba(124, 92, 252, 0.4)',
        color: '#a78bfa',
    },
    quizResultStat: {
        textAlign: 'center',
        padding: '8px 16px',
        borderRadius: 8,
        background: 'rgba(15, 10, 40, 0.4)',
        flex: 1,
    },
};
