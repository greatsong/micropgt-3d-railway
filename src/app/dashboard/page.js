'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import useIsMobile from '@/lib/useIsMobile';
import { useClassStore } from '@/stores/useClassStore';
import { useGalaxyStore } from '@/stores/useGalaxyStore';
import { useRaceStore } from '@/stores/useRaceStore';
import { connectSocket, getSocket } from '@/lib/socket';
import s from './page.module.css';

const DashLoadingUI = ({ emoji, text }) => (
    <div className={s.loadingContainer}>
        <div className={`animate-spin ${s.loadingEmoji}`}>{emoji}</div>
        <p className={s.loadingText}>{text}</p>
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
    const students = useClassStore((st) => st.students);
    const setStudents = useClassStore((st) => st.setStudents);
    const addStudent = useClassStore((st) => st.addStudent);
    const removeStudent = useClassStore((st) => st.removeStudent);
    const notifications = useClassStore((st) => st.notifications);
    const addNotification = useClassStore((st) => st.addNotification);

    const stars = useGalaxyStore((st) => st.stars);
    const addOrUpdateStar = useGalaxyStore((st) => st.addOrUpdateStar);
    const removeStar = useGalaxyStore((st) => st.removeStar);
    const loadFromRoomState = useGalaxyStore((st) => st.loadFromRoomState);

    const racePhase = useRaceStore((st) => st.racePhase);
    const setRacePhase = useRaceStore((st) => st.setRacePhase);
    const raceTeams = useRaceStore((st) => st.teams);
    const setTeams = useRaceStore((st) => st.setTeams);
    const updateBalls = useRaceStore((st) => st.updateBalls);
    const setResults = useRaceStore((st) => st.setResults);
    const raceResults = useRaceStore((st) => st.results);
    const resetRace = useRaceStore((st) => st.reset);

    const [roomCode, setRoomCode] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
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
    const [authenticated, setAuthenticated] = useState(false);

    // 소켓 연결 및 이벤트 핸들러 등록 — 인증 성공 후 유지
    useEffect(() => {
        if (!authenticated) return;

        const socket = getSocket();
        if (!socket) return;

        // 이벤트 핸들러 정의
        const onRoomState = (data) => {
            setIsConnected(true);
            addNotification('🎓 관제탑 연결 완료');
            setStudents(data.students);
            loadFromRoomState(data.students);
            // 레이싱 상태 복원
            if (data.raceTeams) setTeams(data.raceTeams);
            if (data.racePhase) setRacePhase(data.racePhase);
            if (data.raceBalls) updateBalls(data.raceBalls);
        };

        const onStudentJoined = (data) => {
            addStudent(data.student);
            addNotification(`🚀 ${data.student.studentName}(${data.student.schoolCode}) 입장! (${data.totalCount}명)`);
        };

        const onStudentLeft = (data) => {
            removeStudent(data.studentId);
            removeStar(data.studentId);
            addNotification(`💫 ${data.studentName} 퇴장 (${data.totalCount}명)`);
        };

        const onWordRegistered = (data) => {
            addOrUpdateStar(data.studentId, {
                studentName: data.studentName,
                word: data.word,
                position: data.position,
                color: data.color,
            });
            addNotification(`⭐ ${data.studentName}이(가) "${data.word}" 별을 생성!`);
        };

        const onWordMoved = (data) => {
            addOrUpdateStar(data.studentId, { position: data.position });
        };

        // 레이싱 이벤트
        const onRaceTeamsUpdated = (data) => setTeams(data.teams);
        const onRaceStarted = (data) => {
            setRacePhase('racing');
            updateBalls(data.balls);
            addNotification('🏁 레이스 시작!');
        };
        const onRaceTick = (data) => updateBalls(data.balls);
        const onRaceAlert = (data) => addNotification(data.message);
        const onRaceFinished = (data) => {
            setRacePhase('finished');
            setResults(data.results);
            addNotification('🏆 레이스 종료!');
        };
        const onRaceReset = () => {
            resetRace();
            addNotification('🔄 레이스 리셋');
        };

        // 어텐션 이벤트 (Week 10)
        const onAttentionUpdated = (data) => {
            setAttentionStates((prev) => ({
                ...prev,
                [data.studentId]: data,
            }));
        };

        // 퀴즈 이벤트
        const onQuizAnswerReceived = (data) => {
            setQuizAnswerCount(data.totalAnswered);
            addNotification(`✅ ${data.studentName} 퀴즈 답변 제출 (${data.totalAnswered}/${data.totalStudents})`);
        };
        const onQuizResults = (data) => {
            setQuizResults(data);
            setQuizLive(null);
            addNotification(`📊 퀴즈 결과: 정답률 ${data.correctRate}%`);
        };

        // 이벤트 등록
        socket.on('room_state', onRoomState);
        socket.on('student_joined', onStudentJoined);
        socket.on('student_left', onStudentLeft);
        socket.on('word_registered', onWordRegistered);
        socket.on('word_moved', onWordMoved);
        socket.on('race_teams_updated', onRaceTeamsUpdated);
        socket.on('race_started', onRaceStarted);
        socket.on('race_tick', onRaceTick);
        socket.on('race_alert', onRaceAlert);
        socket.on('race_finished', onRaceFinished);
        socket.on('race_reset', onRaceReset);
        socket.on('attention_updated', onAttentionUpdated);
        socket.on('quiz_answer_received', onQuizAnswerReceived);
        socket.on('quiz_results', onQuizResults);

        // cleanup — 컴포넌트 언마운트 또는 authenticated 변경 시 리스너 해제
        return () => {
            socket.off('room_state', onRoomState);
            socket.off('student_joined', onStudentJoined);
            socket.off('student_left', onStudentLeft);
            socket.off('word_registered', onWordRegistered);
            socket.off('word_moved', onWordMoved);
            socket.off('race_teams_updated', onRaceTeamsUpdated);
            socket.off('race_started', onRaceStarted);
            socket.off('race_tick', onRaceTick);
            socket.off('race_alert', onRaceAlert);
            socket.off('race_finished', onRaceFinished);
            socket.off('race_reset', onRaceReset);
            socket.off('attention_updated', onAttentionUpdated);
            socket.off('quiz_answer_received', onQuizAnswerReceived);
            socket.off('quiz_results', onQuizResults);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated]);

    // 접속 버튼 핸들러 — 소켓 연결 + 인증 요청만 수행
    const handleConnect = () => {
        if (!roomCode.trim() || !password.trim()) return;
        setAuthError('');

        const socket = connectSocket();

        // 인증 관련 일회성 핸들러 — 매 시도마다 교체
        socket.off('connect');
        socket.off('auth_error');

        const onConnect = () => {
            socket.emit('join_dashboard', { roomCode: roomCode.trim(), password: password.trim() });
        };

        const onAuthError = (data) => {
            // 소켓은 유지하고 에러 메시지만 표시 — 재시도 가능
            setAuthError(data.message || '인증에 실패했습니다.');
            setAuthenticated(false);
        };

        const onRoomState = () => {
            // 인증 성공 — 일회성 핸들러 정리 후 authenticated 플래그로 전환
            socket.off('auth_error', onAuthError);
            setAuthenticated(true);
        };

        socket.on('connect', onConnect);
        socket.on('auth_error', onAuthError);
        // room_state가 오면 인증 성공으로 판단
        socket.once('room_state', onRoomState);

        // 이미 연결된 상태라면 즉시 인증 요청
        if (socket.connected) {
            onConnect();
        }
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
            <div className={s.loginContainer}>
                <div className={`glass-card animate-fade-in ${s.loginCard}`}>
                    <div className={s.loginHeader}>
                        <div className={`animate-float ${s.loginEmoji}`}>🎓</div>
                        <h1 className={s.loginTitle}>
                            <span className="text-gradient">교사 관제탑</span>
                        </h1>
                        <p className={s.loginSubtext}>
                            학생들의 우주를 한눈에 관찰하고 관리합니다
                        </p>
                    </div>
                    <div className={s.loginForm}>
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
                        <div>
                            <label className="label-cosmic">교사 비밀번호</label>
                            <input
                                className="input-cosmic"
                                type="password"
                                placeholder="교사 인증 비밀번호 입력"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                            />
                        </div>
                        {authError && (
                            <p className={s.authError}>{authError}</p>
                        )}
                        <button className={`btn-nova ${s.loginBtn}`} onClick={handleConnect}>
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
        <div className={`${s.container} ${isMobile ? s.containerMobile : ''}`}>
            {/* 상단 바 */}
            <div className={s.topBar}>
                <div className={s.topLeft}>
                    <h1 className={s.dashTitle}>🎓 관제탑</h1>
                    <span className="badge-glow online">🟢 방: {roomCode}</span>
                    <span className="badge-glow">👨‍🚀 {students.length}명</span>

                    {/* 주차 선택 탭 */}
                    <div className={s.weekTabs}>
                        <button
                            className={`${s.weekTab} ${activeWeek === 3 ? s.weekTabActive : ''}`}
                            onClick={() => setActiveWeek(3)}
                        >
                            🌌 3주차
                        </button>
                        <button
                            className={`${s.weekTab} ${activeWeek === 5 ? s.weekTabActive : ''}`}
                            onClick={() => setActiveWeek(5)}
                        >
                            🏎️ 5주차
                        </button>
                        <button
                            className={`${s.weekTab} ${activeWeek === 10 ? s.weekTabActive : ''}`}
                            onClick={() => setActiveWeek(10)}
                        >
                            ✨ 10주차
                        </button>
                    </div>
                </div>
                <div className={s.topRight}>
                    {activeWeek === 5 && (
                        <>
                            <button
                                className={`btn-nova ${s.btnSmall}`}
                                onClick={handleStartRace}
                                disabled={racePhase === 'racing'}
                            >
                                <span>🏁 레이스 시작 ({raceTeamCount}팀)</span>
                            </button>
                            <button
                                className={`btn-nova ${s.btnSmall}`}
                                onClick={handleResetRace}
                            >
                                <span>🔄 리셋</span>
                            </button>
                        </>
                    )}
                    <button
                        className={`btn-nova ${s.btnSmall}`}
                        onClick={() => setShowQuizPanel(!showQuizPanel)}
                    >
                        <span>📝 퀴즈</span>
                    </button>
                    <button
                        className={`btn-nova ${s.btnSmall}`}
                        onClick={() => handleTeacherCommand('PAUSE')}
                    >
                        <span>⏸️ 일시정지</span>
                    </button>
                </div>
            </div>

            {/* 메인 영역 */}
            <div className={`${s.mainArea} ${isMobile ? s.mainAreaMobile : ''}`}>
                {/* 3D 메인 스크린 */}
                <div className={`${s.canvasArea} ${isMobile ? s.canvasAreaMobile : ''}`}>
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
                    <div className={s.overlayBadge}>
                        <span className={`badge-glow ${s.overlayBadgeText}`}>
                            {activeWeek === 3
                                ? '🌌 임베딩 은하수 · 빔프로젝터 투사용'
                                : activeWeek === 5
                                    ? `🏔️ 경사하강법 레이싱 · ${racePhase === 'racing' ? '레이싱 중!' : racePhase === 'finished' ? '완료!' : '대기 중'}`
                                    : `✨ 어텐션 게임 · ${Object.keys(attentionStates).length}명 참여 중`}
                        </span>
                    </div>
                </div>

                {/* 우측 사이드바 */}
                <div className={`${s.sidebar} ${isMobile ? s.sidebarMobile : ''}`}>
                    {/* 학생 현황 */}
                    <div className={`glass-card ${s.sideSection}`}>
                        <label className="label-cosmic">접속 학생 현황</label>
                        {students.length === 0 ? (
                            <div className={s.emptyState}>
                                <span className={s.emptyIcon}>👨‍🚀</span>
                                <p>학생들이 입장하면 여기에 표시됩니다</p>
                            </div>
                        ) : (
                            <div className={s.studentGrid}>
                                {students.map((st) => (
                                    <div key={st.id} className={s.studentCard}>
                                        <div
                                            className={s.cardDot}
                                            style={{ background: st.color || 'var(--accent-nova)' }}
                                        />
                                        <div>
                                            <div className={s.cardName}>{st.studentName}</div>
                                            <div className={s.cardSchool}>
                                                {st.schoolCode === 'DANGOK_HIGH' ? '당곡고' :
                                                    st.schoolCode === 'SINRIM_HIGH' ? '신림고' :
                                                        st.schoolCode === 'SUDO_GIRL' ? '수도여고' : st.schoolCode}
                                            </div>
                                        </div>
                                        {stars[st.id] && (
                                            <span className={s.cardWord}>{stars[st.id].word}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 레이스 결과 (Week 5) */}
                    {activeWeek === 5 && raceResults.length > 0 && (
                        <div className={`glass-card ${s.sideSection}`}>
                            <label className="label-cosmic">🏆 레이스 결과</label>
                            {raceResults.map((r) => (
                                <div key={r.teamId} className={s.resultRow}>
                                    <span>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}</span>
                                    <span className={s.resultName}>{r.teamName}</span>
                                    <span className={r.status === 'escaped' ? s.resultEscaped : s.resultSuccess}>
                                        {r.status === 'escaped' ? '이탈' : `${r.finalLoss?.toFixed(3)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 어텐션 참여자 (Week 10) */}
                    {activeWeek === 10 && Object.keys(attentionStates).length > 0 && (
                        <div className={`glass-card ${s.sideSection}`}>
                            <label className="label-cosmic">✨ 어텐션 참여자</label>
                            <div className={s.studentGrid}>
                                {Object.values(attentionStates).map((a) => (
                                    <div key={a.studentId} className={s.studentCard}>
                                        <div className={`${s.cardDot} ${s.attentionDot}`} />
                                        <div>
                                            <div className={s.cardName}>{a.studentName}</div>
                                            <div className={s.cardSchool}>
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
                        <div className={`glass-card ${s.sideSection}`}>
                            <label className="label-cosmic">📝 퀴즈 만들기</label>
                            <div className={s.quizBtnRow}>
                                <button
                                    onClick={() => { setQuizType('ox'); setQuizCorrect('O'); }}
                                    className={`${s.quizTypeBtn} ${quizType === 'ox' ? s.quizTypeBtnActive : ''}`}
                                >⭕❌ O/X</button>
                                <button
                                    onClick={() => { setQuizType('choice'); setQuizCorrect(''); }}
                                    className={`${s.quizTypeBtn} ${quizType === 'choice' ? s.quizTypeBtnActive : ''}`}
                                >①②③④ 선택</button>
                            </div>
                            <input
                                className={`input-cosmic ${s.inputSmall}`}
                                placeholder="질문을 입력하세요"
                                value={quizQuestion}
                                onChange={e => setQuizQuestion(e.target.value)}
                            />
                            {quizType === 'ox' && (
                                <div className={s.oxRow}>
                                    <button
                                        onClick={() => setQuizCorrect('O')}
                                        className={s.quizTypeBtn}
                                        style={{
                                            flex: 1,
                                            ...(quizCorrect === 'O' ? { background: 'rgba(96,165,250,0.2)', border: '1px solid #60a5fa', color: '#60a5fa' } : {}),
                                        }}
                                    >정답: ⭕ O</button>
                                    <button
                                        onClick={() => setQuizCorrect('X')}
                                        className={s.quizTypeBtn}
                                        style={{
                                            flex: 1,
                                            ...(quizCorrect === 'X' ? { background: 'rgba(248,113,113,0.2)', border: '1px solid #f87171', color: '#f87171' } : {}),
                                        }}
                                    >정답: ❌ X</button>
                                </div>
                            )}
                            {quizType === 'choice' && (
                                <div className={s.choiceCol}>
                                    {quizOptions.map((opt, i) => (
                                        <div key={i} className={s.choiceRow}>
                                            <input
                                                className={`input-cosmic ${s.choiceInput}`}
                                                placeholder={`선택지 ${i + 1}`}
                                                value={opt}
                                                onChange={e => {
                                                    const next = [...quizOptions];
                                                    next[i] = e.target.value;
                                                    setQuizOptions(next);
                                                }}
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
                            <div className={s.timeLimitRow}>
                                <span className={s.timeLimitLabel}>제한시간:</span>
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
                            <button className={`btn-nova ${s.quizSendBtn}`} onClick={handleSendQuiz}>
                                <span>🚀 퀴즈 전송 ({students.length}명에게)</span>
                            </button>
                        </div>
                    )}

                    {/* 진행 중인 퀴즈 */}
                    {quizLive && !quizResults && (
                        <div className={`glass-card ${s.sideSection}`}>
                            <label className="label-cosmic">📝 퀴즈 진행 중</label>
                            <p className={s.quizLiveQuestion}>
                                {quizLive.question}
                            </p>
                            <div className={s.quizLiveRow}>
                                <span className={s.quizLiveCount}>
                                    응답: <strong className={s.quizLiveCountHighlight}>{quizAnswerCount}</strong> / {students.length}명
                                </span>
                                <div className={s.progressBarOuter}>
                                    <div
                                        className={s.progressBarInner}
                                        style={{ width: `${students.length > 0 ? (quizAnswerCount / students.length * 100) : 0}%` }}
                                    />
                                </div>
                            </div>
                            <div className={s.quizActionRow}>
                                <button className={`btn-nova ${s.quizRevealBtn}`} onClick={handleRevealResults}>
                                    <span>📊 결과 공개</span>
                                </button>
                                <button onClick={handleCancelQuiz} className={s.quizCancelBtn}>취소</button>
                            </div>
                        </div>
                    )}

                    {/* 퀴즈 결과 */}
                    {quizResults && (
                        <div className={`glass-card ${s.sideSection}`}>
                            <label className="label-cosmic">📊 퀴즈 결과</label>
                            <p className={s.quizResultQuestion}>
                                {quizResults.question}
                            </p>
                            <div className={s.quizResultStatRow}>
                                <div className={s.quizResultStat}>
                                    <span className={`${s.quizResultStatValue} ${s.quizResultStatValueGreen}`}>
                                        {quizResults.correctRate}%
                                    </span>
                                    <span className={s.quizResultStatLabel}>정답률</span>
                                </div>
                                <div className={s.quizResultStat}>
                                    <span className={`${s.quizResultStatValue} ${s.quizResultStatValueBlue}`}>
                                        {quizResults.correctCount}/{quizResults.totalAnswered}
                                    </span>
                                    <span className={s.quizResultStatLabel}>정답/응답</span>
                                </div>
                            </div>
                            {quizResults.fastest && (
                                <div className={s.fastestBadge}>
                                    ⚡ 최빠 정답: {quizResults.fastest.studentName} ({(quizResults.fastest.responseTime / 1000).toFixed(1)}초)
                                </div>
                            )}
                            {/* 답변 분포 */}
                            <div className={s.tallyCol}>
                                {Object.entries(quizResults.tally).map(([answer, count]) => (
                                    <div key={answer} className={`${s.tallyRow} ${answer === quizResults.correctAnswer ? s.tallyRowCorrect : s.tallyRowWrong}`}>
                                        <span className={`${s.tallyAnswer} ${answer === quizResults.correctAnswer ? s.tallyAnswerCorrect : s.tallyAnswerWrong}`}>
                                            {answer === quizResults.correctAnswer ? '✅' : ''} {answer}
                                        </span>
                                        <div className={s.tallyBarOuter}>
                                            <div
                                                className={`${s.tallyBarInner} ${answer === quizResults.correctAnswer ? s.tallyBarCorrect : s.tallyBarWrong}`}
                                                style={{ width: `${quizResults.totalAnswered > 0 ? (count / quizResults.totalAnswered * 100) : 0}%` }}
                                            />
                                        </div>
                                        <span className={s.tallyCount}>
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setQuizResults(null)} className={s.quizCloseBtn}>닫기</button>
                        </div>
                    )}

                    {/* 알림 로그 */}
                    <div className={`glass-card ${s.sideSection} ${s.sideSectionFlex}`}>
                        <label className="label-cosmic">실시간 알림 📢</label>
                        <div className={s.notifScroll}>
                            {notifications.length === 0 ? (
                                <div className={s.emptyState}>
                                    <span className={s.emptyIconSmall}>📭</span>
                                    <p>아직 알림이 없습니다</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div key={n.id} className={s.notifItem}>
                                        <span className={s.notifTime}>{n.time}</span>
                                        <span className={s.notifMsg}>{n.message}</span>
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
            <div className={s.attentionEmpty}>
                <div className={s.attentionEmptyIcon}>✨</div>
                <p className={s.attentionEmptyText}>
                    학생들이 어텐션 게임에 참여하면 여기에 표시됩니다
                </p>
            </div>
        );
    }

    return (
        <div className={s.attentionGrid}>
            {entries.map((a) => (
                <div key={a.studentId} className={s.attentionCard}>
                    <div className={s.attentionCardHeader}>
                        <span className={s.attentionStudentName}>
                            {a.studentName}
                        </span>
                        <span className={s.attentionMeta}>
                            {a.sentenceName || '-'} · H{a.headCount || 1}
                        </span>
                    </div>
                    {a.attentionWeights ? (
                        <DashboardHeatmap weights={a.attentionWeights} />
                    ) : (
                        <p className={s.attentionWaiting}>데이터 대기 중...</p>
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
                        className={s.heatmapCell}
                        style={{
                            background: `rgba(124, 92, 252, ${w * 0.85 + 0.05})`,
                            color: w > 0.35 ? '#fff' : 'rgba(255,255,255,0.35)',
                            fontWeight: w > 0.3 ? 700 : 400,
                        }}
                    >
                        {(w * 100).toFixed(0)}
                    </div>
                ))
            )}
        </div>
    );
}
