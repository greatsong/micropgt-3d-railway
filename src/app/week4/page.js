'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import useIsMobile from '@/lib/useIsMobile';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { useClassStore } from '@/stores/useClassStore';
import { useGalaxyStore } from '@/stores/useGalaxyStore';
import { getSocket, connectSocket } from '@/lib/socket';
import s from './page.module.css';

// ── 사전 정의된 예시 단어 세트 ──
const PRESET_WORDS = {
    '동물': [
        { word: '고양이', pos: { x: 3, y: 2, z: 1 } },
        { word: '강아지', pos: { x: 3.5, y: 2.3, z: 0.8 } },
        { word: '금붕어', pos: { x: 2.5, y: 1.5, z: 1.5 } },
    ],
    '음식': [
        { word: '피자', pos: { x: -3, y: 1, z: 2 } },
        { word: '햄버거', pos: { x: -2.5, y: 1.3, z: 2.2 } },
        { word: '초밥', pos: { x: -2, y: 0.8, z: 1.5 } },
    ],
    '감정': [
        { word: '기쁨', pos: { x: 1, y: 5, z: -1 } },
        { word: '슬픔', pos: { x: -1, y: -4, z: 1 } },
        { word: '분노', pos: { x: -2, y: -3, z: 2 } },
    ],
};

// VectorArithmeticPanel은 /week4/practice 페이지로 이동
function __REMOVED__() { /* eslint-disable-line */
    const [gloveData, setGloveData] = useState(null);
    const [selectedExample, setSelectedExample] = useState(0);
    const [customMode, setCustomMode] = useState(false);
    const [wordA, setWordA] = useState('king');
    const [wordB, setWordB] = useState('man');
    const [wordC, setWordC] = useState('woman');

    useEffect(() => {
        fetch('/data/glove_vectors.json')
            .then(r => r.json())
            .then(data => setGloveData(data))
            .catch(() => {});
    }, []);

    if (!gloveData) return (
        <div className={s.simFunFact}>
            <strong>🧮 벡터 연산 체험</strong>
            <p className={s.loadingHint}>임베딩 데이터 로딩 중...</p>
        </div>
    );

    const vectors = gloveData.words;
    const labels = gloveData.labels;
    const allWords = Object.keys(vectors);

    const ex = GLOVE_EXAMPLES[selectedExample];
    const curA = customMode ? wordA : ex.a;
    const curB = customMode ? wordB : ex.b;
    const curC = customMode ? wordC : ex.c;

    const vecA = vectors[curA];
    const vecB = vectors[curB];
    const vecC = vectors[curC];

    if (!vecA || !vecB || !vecC) return null;

    const resultVec = vecA.map((v, i) => v - vecB[i] + vecC[i]);

    const cosSim = (a, b) => {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i];
        }
        if (magA === 0 || magB === 0) return 0;
        return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    const rankings = allWords
        .filter(w => w !== curA && w !== curB && w !== curC)
        .map(word => ({ word, label: labels[word], sim: cosSim(resultVec, vectors[word]) }))
        .sort((a, b) => b.sim - a.sim);

    const bestMatch = rankings[0];
    const label = (w) => labels[w] ? `${labels[w]}(${w})` : w;

    return (
        <div className={s.simFunFact}>
            <strong>🧮 실제 임베딩으로 벡터 연산 체험</strong>
            <p className={s.gloveSource}>
                Stanford GloVe — Wikipedia + Gigaword 학습 데이터, 300차원 벡터
            </p>
            <p className={s.gloveDesc}>
                실제 AI가 학습한 단어 벡터로 빼기/더하기 연산을 해보세요!
            </p>

            {/* 추천 예시 버튼 */}
            {!customMode && (
                <div className={s.presetBtnRow}>
                    {GLOVE_EXAMPLES.map((ex, i) => (
                        <button key={i} onClick={() => setSelectedExample(i)} style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: '0.68rem', cursor: 'pointer',
                            border: i === selectedExample ? '1px solid #7c5cfc' : '1px solid rgba(255,255,255,0.1)',
                            background: i === selectedExample ? 'rgba(124,92,252,0.15)' : 'rgba(255,255,255,0.03)',
                            color: i === selectedExample ? '#a78bfa' : 'var(--text-dim)',
                        }}>
                            {ex.emoji} {ex.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 자유 모드 토글 */}
            <div className={s.toggleCenter}>
                <button onClick={() => setCustomMode(!customMode)} style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', cursor: 'pointer',
                    border: '1px solid rgba(251,191,36,0.3)',
                    background: customMode ? 'rgba(251,191,36,0.15)' : 'transparent',
                    color: '#fbbf24',
                }}>
                    {customMode ? '📋 추천 예시로 돌아가기' : '✏️ 자유롭게 조합하기'}
                </button>
            </div>

            {/* 자유 모드: 드롭다운 */}
            {customMode && (
                <div className={s.customInputRow}>
                    <select className={`select-cosmic ${s.selectSmall}`}
                        value={wordA} onChange={(e) => setWordA(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span className={s.operatorMinus}>−</span>
                    <select className={`select-cosmic ${s.selectSmall}`}
                        value={wordB} onChange={(e) => setWordB(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                    <span className={s.operatorPlus}>+</span>
                    <select className={`select-cosmic ${s.selectSmall}`}
                        value={wordC} onChange={(e) => setWordC(e.target.value)}>
                        {allWords.map(w => <option key={w} value={w}>{labels[w]}({w})</option>)}
                    </select>
                </div>
            )}

            {/* 수식 표시 */}
            <div className={s.formulaDisplay}>
                {label(curA)} <span className={s.formulaMinusBold}>−</span> {label(curB)} <span className={s.formulaPlusBold}>+</span> {label(curC)} <span className={s.formulaEquals}>=</span> ?
            </div>

            {/* 결과 */}
            {bestMatch && (
                <div className={s.resultBox}>
                    <div className={s.resultLabel}>가장 가까운 단어 (300차원 코사인 유사도)</div>
                    <span className={s.resultWord}>{bestMatch.label || bestMatch.word}</span>
                    <span className={s.resultMeta}>
                        ({bestMatch.word}, 유사도 {Math.round(bestMatch.sim * 100)}%)
                    </span>
                    <div className={s.resultFormula}>
                        {label(curA)} − {label(curB)} + {label(curC)} ≈ <strong>{bestMatch.label || bestMatch.word}</strong>
                    </div>
                </div>
            )}

            {/* 순위 */}
            <div className={s.rankSection}>
                <div className={s.rankLabel}>Top 5 후보:</div>
                <div className={s.rankList}>
                    {rankings.slice(0, 5).map((r, i) => (
                        <span key={r.word} style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
                            background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(124,92,252,0.06)',
                            color: i === 0 ? '#10b981' : 'var(--text-dim)',
                            fontWeight: i === 0 ? 700 : 400,
                        }}>
                            {r.label || r.word} {Math.round(r.sim * 100)}%
                        </span>
                    ))}
                </div>
            </div>

            {/* 출처 표기 */}
            <div className={s.sourceAttrib}>
                데이터 출처: GloVe (Stanford NLP) — 51개 단어, 300차원 실제 임베딩 벡터
            </div>
        </div>
    );
}

// ── 코사인 유사도 계산기 컴포넌트 ──
function CosineSimilarityPanel({ stars }) {
    const starEntries = Object.entries(stars);
    const allWords = [
        ...starEntries.map(([id, star]) => ({ id, word: star.word, pos: star.position })),
        ...Object.values(PRESET_WORDS).flat().map((w, i) => ({ id: `preset-${i}`, word: w.word, pos: w.pos })),
    ];

    const [wordAId, setWordAId] = useState(null);
    const [wordBId, setWordBId] = useState(null);

    const wordA = allWords.find(w => w.id === wordAId);
    const wordB = allWords.find(w => w.id === wordBId);

    const cosineSim = (a, b) => {
        if (!a || !b) return null;
        const dot = a.x * b.x + a.y * b.y + a.z * b.z;
        const magA = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
        const magB = Math.sqrt(b.x ** 2 + b.y ** 2 + b.z ** 2);
        if (magA === 0 || magB === 0) return 0;
        return dot / (magA * magB);
    };

    const eucDist = (a, b) => {
        if (!a || !b) return null;
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    };

    const sim = wordA && wordB ? cosineSim(wordA.pos, wordB.pos) : null;
    const dist = wordA && wordB ? eucDist(wordA.pos, wordB.pos) : null;
    const angleDeg = sim !== null ? (Math.acos(Math.max(-1, Math.min(1, sim))) * 180 / Math.PI) : null;

    if (allWords.length < 2) return null;

    return (
        <div className={`glass-card ${s.simPanel}`}>
            <label className="label-cosmic">📐 코사인 유사도 계산기</label>
            <p className={s.cosineDesc}>코사인 유사도 = 두 벡터가 얼마나 같은 방향을 가리키는지 (1에 가까울수록 비슷)</p>
            <p className={s.simHint}>두 단어를 선택하면 유사도, 거리, 각도를 계산합니다!</p>

            <div className={s.selectPairRow}>
                <div className={s.selectPairCol}>
                    <div className={s.simSelectLabel}>단어 A</div>
                    <select className={`select-cosmic ${s.selectCosmic}`}
                        value={wordAId || ''} onChange={(e) => setWordAId(e.target.value || null)}>
                        <option value="">선택...</option>
                        {allWords.map(w => (
                            <option key={w.id} value={w.id}>{w.word}</option>
                        ))}
                    </select>
                </div>
                <div className={s.selectPairCol}>
                    <div className={s.simSelectLabel}>단어 B</div>
                    <select className={`select-cosmic ${s.selectCosmic}`}
                        value={wordBId || ''} onChange={(e) => setWordBId(e.target.value || null)}>
                        <option value="">선택...</option>
                        {allWords.filter(w => w.id !== wordAId).map(w => (
                            <option key={w.id} value={w.id}>{w.word}</option>
                        ))}
                    </select>
                </div>
            </div>

            {sim !== null && (
                <div className={s.simResultBox}>
                    <div className={s.simResultRow}>
                        <span className={s.textDim}>코사인 유사도:</span>
                        <span className={sim > 0.8 ? s.simValueHigh : sim > 0.3 ? s.simValueMid : s.simValueLow}>
                            {sim.toFixed(3)}
                        </span>
                    </div>
                    <div className={s.simResultRow}>
                        <span className={s.textDim}>각도:</span>
                        <span className={s.angleValue}>{angleDeg.toFixed(1)}°</span>
                    </div>
                    <div className={s.simResultRow}>
                        <span className={s.textDim}>유클리드 거리:</span>
                        <span className={s.distValue}>{dist.toFixed(2)}</span>
                    </div>
                    <div className={s.simInterpretation}>
                        {sim > 0.8 ? '🧲 매우 비슷! 같은 카테고리에 속할 가능성 높음' :
                            sim > 0.3 ? '📏 약간 비슷하지만 다른 맥락도 있음' :
                                sim > 0 ? '🔀 꽤 다른 의미의 단어들' :
                                    '⚡ 반대 방향! 대조적인 의미'}
                    </div>
                </div>
            )}

            {/* 벡터 연산 실습 페이지 링크 */}
            <div className={s.simFunFact}>
                <strong>🧮 벡터 연산 더 해보고 싶다면?</strong>
                <p className={s.funFactDesc}>
                    실제 AI 임베딩(GloVe 300차원)으로 벡터 빼기/더하기를 해볼 수 있어요!
                </p>
                <button className={`btn-nova ${s.funFactBtn}`}
                    onClick={() => window.location.href = '/week4/practice'}>
                    <span>📐 코사인 유사도 실습 페이지로</span>
                </button>
            </div>
        </div>
    );
}

// Three.js는 SSR 미지원 → 동적 임포트
const EmbeddingGalaxy = dynamic(() => import('@/components/3d/EmbeddingGalaxy'), {
    ssr: false,
    loading: () => (
        <div className={s.loadingStyle}>
            <div className={`animate-pulse-glow ${s.loadingBox}`}>
                🌌 은하수 로딩 중...
            </div>
        </div>
    ),
});

export default function Week4Page() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const studentName = useClassStore((st) => st.studentName);
    const schoolCode = useClassStore((st) => st.schoolCode);
    const roomCode = useClassStore((st) => st.roomCode);
    const students = useClassStore((st) => st.students);
    const setStudents = useClassStore((st) => st.setStudents);
    const addStudent = useClassStore((st) => st.addStudent);
    const removeStudent = useClassStore((st) => st.removeStudent);
    const addNotification = useClassStore((st) => st.addNotification);

    const stars = useGalaxyStore((st) => st.stars);
    const addOrUpdateStar = useGalaxyStore((st) => st.addOrUpdateStar);
    const removeStar = useGalaxyStore((st) => st.removeStar);
    const loadFromRoomState = useGalaxyStore((st) => st.loadFromRoomState);
    const myWord = useGalaxyStore((st) => st.myWord);
    const setMyWord = useGalaxyStore((st) => st.setMyWord);
    const myPosition = useGalaxyStore((st) => st.myPosition);
    const setMyPosition = useGalaxyStore((st) => st.setMyPosition);

    const [wordInput, setWordInput] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);

    // ── Socket 이벤트 리스너 ──
    useEffect(() => {
        const socket = getSocket();

        // 소켓이 연결되어 있지 않으면 연결 + 방 재입장
        if (!socket.connected) {
            connectSocket();
        }

        // 연결 시 방에 자동 입장 (직접 URL 접근 또는 재연결 시)
        const handleConnect = () => {
            if (roomCode) {
                socket.emit('join_class', {
                    studentName: studentName || '익명',
                    schoolCode: schoolCode || 'UNKNOWN',
                    roomCode,
                });
            }
        };

        // 이미 연결 상태라면 바로 방 입장
        if (socket.connected && roomCode) {
            handleConnect();
        }

        socket.on('connect', handleConnect);

        const handleRoomState = (data) => {
            setStudents(data.students);
            loadFromRoomState(data.students);
        };
        const handleStudentJoined = (data) => {
            addStudent(data.student);
            addNotification(`🚀 ${data.student.studentName} 입장! (${data.totalCount}명)`);
        };
        const handleStudentLeft = (data) => {
            removeStudent(data.studentId);
            removeStar(data.studentId);
            addNotification(`💫 ${data.studentName} 퇴장 (${data.totalCount}명)`);
        };
        const handleWordRegistered = (data) => {
            addOrUpdateStar(data.studentId, {
                studentName: data.studentName,
                word: data.word,
                position: data.position,
                color: data.color,
            });
        };
        const handleWordMoved = (data) => {
            addOrUpdateStar(data.studentId, {
                position: data.position,
            });
        };

        socket.on('room_state', handleRoomState);
        socket.on('student_joined', handleStudentJoined);
        socket.on('student_left', handleStudentLeft);
        socket.on('word_registered', handleWordRegistered);
        socket.on('word_moved', handleWordMoved);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('room_state', handleRoomState);
            socket.off('student_joined', handleStudentJoined);
            socket.off('student_left', handleStudentLeft);
            socket.off('word_registered', handleWordRegistered);
            socket.off('word_moved', handleWordMoved);
        };
    }, [roomCode]);

    // ── 단어 등록 ──
    const handleRegisterWord = useCallback(() => {
        if (!wordInput.trim()) return;
        const socket = getSocket();
        const word = wordInput.trim();
        setMyWord(word);

        // 로컬에 즉시 별 추가 (서버 응답 전에 바로 보이게)
        const myColor = `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
        const localPos = {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: (Math.random() - 0.5) * 10,
        };
        addOrUpdateStar(socket.id || 'local', {
            studentName: studentName || '나',
            word,
            position: localPos,
            color: myColor,
        });
        setMyPosition(localPos);

        // 서버에도 전송 (서버 응답이 오면 덮어씀)
        socket.emit('register_word', { word });
        setIsRegistered(true);
    }, [wordInput, setMyWord, studentName, addOrUpdateStar, setMyPosition]);

    // ── 슬라이더로 좌표 변경 ──
    const handleSlider = useCallback(
        (axis, value) => {
            const newPos = { ...myPosition, [axis]: parseFloat(value) };
            setMyPosition(newPos);

            // 로컬 별 위치도 즉시 업데이트
            const socket = getSocket();
            addOrUpdateStar(socket.id || 'local', { position: newPos });

            socket.emit('update_word_position', { position: newPos });
        },
        [myPosition, setMyPosition, addOrUpdateStar]
    );

    const starCount = Object.keys(stars).length;

    return (
        <div className={isMobile ? s.containerMobile : s.container}>
            {/* ── 모바일: 3D 캔버스 상단 ── */}
            {isMobile && (
                <div className={s.mobileCanvasWrap}>
                    <WebGLErrorBoundary fallbackProps={{
                        weekTitle: '3D 임베딩 은하수',
                        conceptSummary: '임베딩(Embedding)은 단어를 벡터(숫자 목록)로 변환하는 기술입니다. 비슷한 의미의 단어("고양이"↔"강아지")는 벡터 공간에서 가까운 위치에, 다른 의미("고양이"↔"자동차")는 먼 위치에 놓입니다.',
                    }}>
                        <EmbeddingGalaxy />
                    </WebGLErrorBoundary>
                    <div className={s.canvasOverlay}>
                        <span className={`badge-glow ${s.canvasOverlayBadgeSm}`}>
                            🌌 터치로 탐색
                        </span>
                    </div>
                </div>
            )}

            {/* ── 좌측 패널 ── */}
            <div className={isMobile ? s.leftPanelMobile : s.leftPanel}>
                {/* 헤더 */}
                <Breadcrumb
                    items={[{ label: '4주차 인트로', href: '/week4/intro' }]}
                    current="임베딩 은하수"
                />
                <div className={s.header}>
                    <h2 className={s.weekTitle}>4주차</h2>
                    <h1 className={s.moduleTitle}>
                        <span className="text-gradient">3D 임베딩 은하수</span>
                    </h1>
                    <p className={s.description}>
                        단어를 입력하고 좌표를 움직여 보세요.<br />
                        모든 친구들의 별이 실시간으로 연결됩니다! ✨
                    </p>
                    <p className={s.embeddingHint}>
                        임베딩(Embedding) = 단어를 숫자 좌표로 변환하는 기술. 비슷한 의미의 단어는 가까운 좌표에, 다른 의미는 먼 좌표에 놓입니다.
                    </p>
                </div>

                {/* 접속 현황 */}
                <div className={`glass-card ${s.statusCard}`}>
                    <div className={s.statusRow}>
                        <span className="badge-glow online">🟢 온라인</span>
                        <span className={s.statusText}>
                            {students.length}명 접속 · {starCount}개 별
                        </span>
                    </div>
                </div>

                {/* 단어 입력 */}
                {!isRegistered ? (
                    <div className={`glass-card ${s.inputCard}`}>
                        <label className="label-cosmic">나만의 단어 별 만들기 🌟</label>
                        <p className={s.inputHint}>
                            좋아하는 음식, 동물, 취미 등 아무 단어나 입력하세요!
                        </p>
                        <input
                            className="input-cosmic"
                            placeholder="예: 마라탕, 고양이, 축구..."
                            value={wordInput}
                            onChange={(e) => setWordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRegisterWord()}
                            maxLength={10}
                        />
                        <button
                            className={`btn-nova ${s.registerBtn}`}
                            onClick={handleRegisterWord}
                            disabled={!wordInput.trim()}
                        >
                            <span>⭐ 별 생성하기</span>
                        </button>
                    </div>
                ) : (
                    /* 좌표 슬라이더 */
                    <div className={`glass-card ${s.sliderCard}`}>
                        <div className={s.myWordBadge}>
                            <span className={s.myWordBadgeStar}>⭐</span>
                            <span className={s.myWordBadgeText}>
                                {myWord}
                            </span>
                        </div>

                        <label className="label-cosmic">의미 좌표 조종석</label>
                        <p className={s.inputHint}>
                            슬라이더를 움직여 별의 위치를 바꿔보세요. 비슷한 단어끼리 가까이 놓으면 군집이 만들어집니다!
                        </p>

                        {['x', 'y', 'z'].map((axis) => (
                            <div key={axis} className={s.sliderRow}>
                                <span className={s.axisLabel}>
                                    {axis === 'x' ? '↔️ X축' : axis === 'y' ? '↕️ Y축' : '↗️ Z축'}
                                </span>
                                <input
                                    type="range"
                                    className="slider-cosmic"
                                    min={-8}
                                    max={8}
                                    step={0.1}
                                    value={myPosition[axis]}
                                    onChange={(e) => handleSlider(axis, e.target.value)}
                                />
                                <span className={s.sliderValue}>
                                    {myPosition[axis].toFixed(1)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── 코사인 유사도 계산기 ── */}
                <CosineSimilarityPanel stars={stars} />

                {/* 접속자 리스트 */}
                <div className={`glass-card ${s.studentList}`}>
                    <label className="label-cosmic">은하수 탐험대 👨‍🚀</label>
                    <div className={s.studentScroll}>
                        {Object.entries(stars).map(([id, star]) => (
                            <div key={id} className={s.studentItem}>
                                <div
                                    className={s.studentDot}
                                    style={{ background: star.color }}
                                />
                                <span className={s.studentNameText}>{star.studentName}</span>
                                <span className={s.studentWord}>{star.word}</span>
                            </div>
                        ))}
                        {starCount === 0 && (
                            <p className={s.emptyText}>
                                아직 아무도 별을 만들지 않았어요...
                            </p>
                        )}
                    </div>
                </div>

                {/* ── Theory Section ── */}
                <div className={`glass-card ${s.card}`}>
                    <label className="label-cosmic">🤖 LLM의 뇌를 들여다보면?</label>
                    <div className={s.theoryDescription}>
                        <p className={s.theoryP}>
                            <strong>1. 의미의 공간 (Vector Space)</strong><span className={s.theoryDim}> — 벡터 = 숫자들의 목록, 공간 = 그 숫자들이 만드는 좌표계</span><br />
                            LLM은 단어의 뜻을 사전에서 찾는 게 아니라, 이 3D 은하수 같은 <strong>&quot;벡터 공간&quot;</strong>에서의 위치로 이해합니다.
                            &quot;왕&quot;과 &quot;여왕&quot;은 가깝고, &quot;사과&quot;는 멀리 떨어져 있겠죠?
                        </p>
                        <p>
                            <strong>2. 검색 증강 생성 (RAG)</strong><span className={s.theoryDim}> — Retrieval-Augmented Generation: 검색해서 찾은 정보를 바탕으로 답변 생성</span><br />
                            여러분이 챗봇에게 회사 문서를 물어보면, AI는 그 문서들을 벡터로 바꿔서 저장해둡니다.
                            그리고 질문과 가장 가까운 위치에 있는 문서를 찾아(Search) 답변을 생성(Generate)합니다!
                        </p>
                    </div>
                </div>

                {/* 네비게이션 */}
                <div className={s.navRow}>
                    <button onClick={() => router.push('/week4/intro')} className={s.navBackBtn}>← 인트로로</button>
                    <button className={`btn-nova ${s.navNextBtn}`} onClick={() => router.push('/week5/intro')}>
                        <span>🏔️ 5주차: 경사하강법 →</span>
                    </button>
                </div>
            </div>

            {/* ── 우측: 3D 캔버스 (데스크톱만) ── */}
            {!isMobile && (
                <div className={s.canvasWrapper}>
                    <WebGLErrorBoundary fallbackProps={{
                        weekTitle: '3D 임베딩 은하수',
                        conceptSummary: '임베딩(Embedding)은 단어를 벡터(숫자 목록)로 변환하는 기술입니다. 비슷한 의미의 단어("고양이"↔"강아지")는 벡터 공간에서 가까운 위치에, 다른 의미("고양이"↔"자동차")는 먼 위치에 놓입니다. 이 거리를 코사인 유사도로 측정합니다.',
                    }}>
                        <EmbeddingGalaxy />
                    </WebGLErrorBoundary>

                    {/* 오버레이 UI */}
                    <div className={s.canvasOverlay}>
                        <span className={`badge-glow ${s.canvasOverlayBadge}`}>
                            🌌 단어 은하수 · 마우스로 드래그하여 탐색
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
