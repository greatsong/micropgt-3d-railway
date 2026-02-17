'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { useClassStore } from '@/stores/useClassStore';
import { getSocket, connectSocket } from '@/lib/socket';

// ── Self-Attention 히트맵용 데이터 ──
const SENTENCES = [
    {
        id: 'apple',
        text: '나는 빨간 사과를 먹었다',
        words: ['나는', '빨간', '사과를', '먹었다'],
        weights: [
            [0.65, 0.10, 0.15, 0.10],
            [0.05, 0.50, 0.40, 0.05],
            [0.10, 0.45, 0.35, 0.10],
            [0.30, 0.10, 0.20, 0.40],
        ],
    },
    {
        id: 'cat',
        text: '고양이가 소파 위에서 자고 있다',
        words: ['고양이가', '소파', '위에서', '자고', '있다'],
        weights: [
            [0.55, 0.10, 0.05, 0.20, 0.10],
            [0.08, 0.45, 0.40, 0.04, 0.03],
            [0.05, 0.50, 0.35, 0.05, 0.05],
            [0.30, 0.05, 0.10, 0.35, 0.20],
            [0.15, 0.05, 0.05, 0.45, 0.30],
        ],
    },
    {
        id: 'student',
        text: '학생이 도서관에서 책을 읽는다',
        words: ['학생이', '도서관에서', '책을', '읽는다'],
        weights: [
            [0.50, 0.15, 0.15, 0.20],
            [0.10, 0.55, 0.25, 0.10],
            [0.08, 0.32, 0.45, 0.15],
            [0.25, 0.10, 0.30, 0.35],
        ],
    },
];

// ── Multi-Head Attention 데모용 데이터 ──
const MULTI_HEAD_DATA = {
    words: ['나는', '빨간', '사과를', '먹었다'],
    heads: [
        {
            name: 'Head 1: 형용사 → 명사',
            color: '#f43f5e',
            weights: [
                [0.70, 0.10, 0.10, 0.10],
                [0.02, 0.18, 0.75, 0.05],
                [0.05, 0.55, 0.30, 0.10],
                [0.15, 0.05, 0.50, 0.30],
            ],
        },
        {
            name: 'Head 2: 주어 → 동사',
            color: '#3b82f6',
            weights: [
                [0.30, 0.05, 0.10, 0.55],
                [0.10, 0.60, 0.20, 0.10],
                [0.15, 0.10, 0.45, 0.30],
                [0.55, 0.05, 0.15, 0.25],
            ],
        },
        {
            name: 'Head 3: 위치 근접성',
            color: '#10b981',
            weights: [
                [0.50, 0.30, 0.15, 0.05],
                [0.25, 0.40, 0.25, 0.10],
                [0.10, 0.30, 0.40, 0.20],
                [0.05, 0.15, 0.30, 0.50],
            ],
        },
    ],
};

export default function Week10Page() {
    const router = useRouter();
    const studentName = useClassStore((s) => s.studentName);
    const roomCode = useClassStore((s) => s.roomCode);

    // 다른 학생들의 어텐션 상태
    const [classAttention, setClassAttention] = useState({});

    // ── 상태: Query, Key 벡터 ──
    const [query, setQuery] = useState({ x: 1.0, y: 0.2 });
    const keys = useMemo(() => [
        { id: 'K1', x: 0.8, y: 0.1, label: '나 (I)' },
        { id: 'K2', x: 0.1, y: 0.9, label: '사과 (Apple)' },
        { id: 'K3', x: -0.5, y: -0.5, label: '컴퓨터 (Computer)' },
    ], []);

    // ── Attention Score ──
    const scores = keys.map(k => ({
        ...k,
        score: (query.x * k.x + query.y * k.y) * 3.0
    }));

    const maxScore = Math.max(...scores.map(s => s.score));
    const expScores = scores.map(s => Math.exp(s.score - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const attentionWeights = expScores.map(e => e / sumExp);

    // ── 미션 ──
    const [missionPhase, setMissionPhase] = useState(0);
    const missions = [
        { targetId: 'K2', label: '사과 (Apple)', threshold: 0.7 },
        { targetId: 'K3', label: '컴퓨터 (Computer)', threshold: 0.7 }
    ];
    const currentMission = missions[missionPhase];

    const targetKeyIndex = currentMission ? keys.findIndex(k => k.id === currentMission.targetId) : -1;
    const currentScore = targetKeyIndex !== -1 ? attentionWeights[targetKeyIndex] : 0;
    const isSuccess = currentMission && currentScore >= currentMission.threshold;

    const handleNextMission = () => {
        if (missionPhase < missions.length - 1) {
            setMissionPhase(p => p + 1);
        } else {
            setMissionPhase(2);
        }
    };

    // ── Self-Attention 히트맵 상태 ──
    const [selectedSentence, setSelectedSentence] = useState('apple');
    const [hoveredCell, setHoveredCell] = useState(null);
    const sentenceData = SENTENCES.find(s => s.id === selectedSentence);

    // ── Multi-Head 상태 ──
    const [activeHead, setActiveHead] = useState(0);

    // ── 한 걸음 더 (Deep Dive) ──
    const [showDeepDive, setShowDeepDive] = useState(false);

    // ── Socket 연결: 어텐션 상태 공유 ──
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        if (!socket.connected) connectSocket();

        const handleConnect = () => {
            if (roomCode) {
                socket.emit('join_class', {
                    studentName: studentName || '익명',
                    schoolCode: 'UNKNOWN',
                    roomCode,
                });
            }
        };

        if (socket.connected && roomCode) handleConnect();
        socket.on('connect', handleConnect);

        const handleAttentionUpdated = (data) => {
            if (data.studentId === socket.id) return;
            setClassAttention(prev => ({
                ...prev,
                [data.studentId]: data,
            }));
        };

        socket.on('attention_updated', handleAttentionUpdated);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('attention_updated', handleAttentionUpdated);
        };
    }, [roomCode, studentName]);

    // 내 어텐션 상태 변경 시 서버에 전송
    useEffect(() => {
        const socket = getSocket();
        if (!socket?.connected || !roomCode) return;

        socket.emit('update_attention_slider', {
            sliderValue_Q: query.x,
            sliderValue_K: query.y,
            attentionWeights: sentenceData ? sentenceData.weights : [],
            selectedWord: `Q(${query.x.toFixed(1)}, ${query.y.toFixed(1)})`,
            sentenceName: selectedSentence,
            headCount: activeHead + 1,
        });
    }, [query, selectedSentence, activeHead, roomCode]);

    const getHeatColor = (v) => {
        const r = Math.round(124 + (251 - 124) * v);
        const g = Math.round(92 + (191 - 92) * v);
        const b = Math.round(252 + (36 - 252) * v);
        return `rgba(${r},${g},${b},${0.15 + v * 0.85})`;
    };

    return (
        <div style={styles.container}>
            <Breadcrumb
                items={[{ label: '10주차 인트로', href: '/week10/intro' }]}
                current="어텐션 게임"
            />
            <div style={styles.header}>
                <h1 style={styles.title}>10주차: 어텐션 게임 (Attention)</h1>
            </div>

            <div style={styles.content}>
                {/* ── Mission Board ── */}
                <div style={{
                    ...styles.card,
                    background: missionPhase === 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                    border: missionPhase === 2 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                    {missionPhase < 2 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h2 style={{ ...styles.cardTitle, color: '#93c5fd' }}>🎯 미션 {missionPhase + 1}</h2>
                                <p style={{ color: '#e2e8f0', fontSize: '1.05rem' }}>
                                    Query 벡터를 조절해서 <strong>&quot;{currentMission.label}&quot;</strong>의 어텐션을 <strong>{(currentMission.threshold * 100).toFixed(0)}% 이상</strong>으로!
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: isSuccess ? '#4ade80' : '#f43f5e' }}>
                                    {(currentScore * 100).toFixed(1)}%
                                </div>
                                {isSuccess && (
                                    <button onClick={handleNextMission} style={styles.nextBtn} className="animate-pulse">
                                        다음 단계 →
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ ...styles.cardTitle, color: '#4ade80', fontSize: '1.5rem' }}>🎉 미션 클리어!</h2>
                            <p style={{ color: '#e2e8f0', marginBottom: 20 }}>
                                어텐션의 원리를 완벽하게 이해하셨군요!<br />
                                아래의 <strong>Self-Attention 히트맵</strong>과 <strong>Multi-Head Attention</strong>도 탐험해보세요!
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Query 조절 ── */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🔍 Query 조절하기 (나의 관심사)</h2>
                    <p style={styles.desc}>슬라이더를 움직여 Query 벡터(노란색 화살표)를 변경해보세요!</p>
                    <div style={styles.controls}>
                        <div style={styles.controlRow}>
                            <span>X: {query.x.toFixed(2)}</span>
                            <input type="range" min="-1" max="1" step="0.1" value={query.x}
                                onChange={e => setQuery({ ...query, x: parseFloat(e.target.value) })} className="slider-cosmic" />
                        </div>
                        <div style={styles.controlRow}>
                            <span>Y: {query.y.toFixed(2)}</span>
                            <input type="range" min="-1" max="1" step="0.1" value={query.y}
                                onChange={e => setQuery({ ...query, y: parseFloat(e.target.value) })} className="slider-cosmic" />
                        </div>
                    </div>
                </div>

                <div style={styles.vizContainer}>
                    {/* 벡터 시각화 */}
                    <div style={styles.vizCard}>
                        <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>벡터 공간 (Vector Space)</h3>
                        <svg viewBox="-1.2 -1.2 2.4 2.4" style={styles.svg}>
                            <defs>
                                <marker id="arrowH" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#fbbf24" /></marker>
                                <marker id="arrowK" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" /></marker>
                                <marker id="arrowTarget" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#3b82f6" /></marker>
                            </defs>
                            <circle cx="0" cy="0" r="1" fill="none" stroke="#334155" strokeDasharray="0.05 0.05" vectorEffect="non-scaling-stroke" />
                            <line x1="-1.2" y1="0" x2="1.2" y2="0" stroke="#475569" strokeWidth="0.02" />
                            <line x1="0" y1="-1.2" x2="0" y2="1.2" stroke="#475569" strokeWidth="0.02" />

                            {keys.map((k) => {
                                const isTarget = currentMission && k.id === currentMission.targetId;
                                return (
                                    <g key={k.id}>
                                        <line x1="0" y1="0" x2={k.x} y2={-k.y}
                                            stroke={isTarget ? "#3b82f6" : "#94a3b8"} strokeWidth={isTarget ? "0.05" : "0.03"}
                                            markerEnd={isTarget ? "url(#arrowTarget)" : "url(#arrowK)"} opacity={isTarget ? "1" : "0.6"} />
                                        <text x={k.x * 1.1} y={-k.y * 1.1} fill={isTarget ? "#60a5fa" : "#94a3b8"}
                                            fontSize={isTarget ? "0.15" : "0.12"} fontWeight={isTarget ? "bold" : "normal"} textAnchor="middle">
                                            {k.label}
                                        </text>
                                    </g>
                                );
                            })}
                            <line x1="0" y1="0" x2={query.x} y2={-query.y} stroke="#fbbf24" strokeWidth="0.05" markerEnd="url(#arrowH)" />
                            <text x={query.x * 1.1} y={-query.y * 1.1} fill="#fbbf24" fontSize="0.15" fontWeight="bold" textAnchor="middle">Query</text>
                        </svg>
                    </div>

                    {/* 어텐션 가중치 */}
                    <div style={styles.vizCard}>
                        <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>어텐션 가중치 (Attention Weights)</h3>
                        <div style={styles.barChart}>
                            {keys.map((k, i) => {
                                const weight = attentionWeights[i];
                                const percent = (weight * 100).toFixed(1);
                                const isTarget = currentMission && k.id === currentMission.targetId;
                                return (
                                    <div key={k.id} style={styles.barRow}>
                                        <div style={{ ...styles.barLabel, color: isTarget ? '#60a5fa' : '#cbd5e1', fontWeight: isTarget ? 'bold' : 'normal' }}>{k.label}</div>
                                        <div style={styles.barTrack}>
                                            <div style={{
                                                ...styles.barFill,
                                                width: `${percent}%`,
                                                opacity: 0.3 + weight,
                                                background: isTarget ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' : 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                                            }} />
                                            <span style={styles.barValue}>{percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p style={styles.hint}>
                            Query 벡터가 Key 벡터와 비슷할수록(내적 값이 클수록)<br />
                            <strong>Softmax</strong>를 통과한 어텐션 점수가 높아집니다!
                            <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Softmax = 여러 점수를 0~1 확률로 변환하는 함수 (합이 1이 됨)</span>
                        </p>
                        <div style={{
                            marginTop: 10,
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'rgba(124, 92, 252, 0.08)',
                            border: '1px solid rgba(124, 92, 252, 0.2)',
                            fontSize: '0.83rem',
                            color: '#c4b5fd',
                            lineHeight: 1.6,
                        }}>
                            <strong style={{ color: '#a78bfa' }}>내적(Dot Product)</strong> = 두 벡터의 같은 위치 숫자를 곱해서 전부 더한 값. 결과가 클수록 두 벡터가 비슷한 방향을 가리킵니다.
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                     Self-Attention 히트맵
                   ══════════════════════════════════════════ */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🗺️ Self-Attention 히트맵</h2>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8 }}>Self = 같은 문장 내 단어끼리 서로 주목</div>
                    <p style={styles.desc}>
                        실제 문장에서 각 단어가 다른 단어에 얼마나 &quot;주목&quot;하는지 히트맵으로 확인해보세요!<br />
                        행(→)이 Query, 열(↓)이 Key입니다.
                    </p>

                    {/* 문장 선택 */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                        {SENTENCES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => { setSelectedSentence(s.id); setHoveredCell(null); }}
                                style={{
                                    ...styles.sentenceBtn,
                                    background: s.id === selectedSentence ? 'var(--accent-nova)' : 'rgba(255,255,255,0.05)',
                                    color: s.id === selectedSentence ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                {s.text}
                            </button>
                        ))}
                    </div>

                    {/* 히트맵 그리드 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `80px repeat(${sentenceData.words.length}, 1fr)`,
                        gap: 4,
                        maxWidth: 500,
                        margin: '0 auto',
                    }}>
                        {/* 헤더 */}
                        <div />
                        {sentenceData.words.map(w => (
                            <div key={`h-${w}`} style={styles.hmHeader}>{w}</div>
                        ))}
                        {/* 행 */}
                        {sentenceData.words.map((rowWord, ri) => (
                            <div key={`row-${ri}`} style={{ display: 'contents' }}>
                                <div style={styles.hmRowLabel}>{rowWord}</div>
                                {sentenceData.words.map((_, ci) => {
                                    const v = sentenceData.weights[ri][ci];
                                    const isHovered = hoveredCell?.r === ri && hoveredCell?.c === ci;
                                    return (
                                        <div
                                            key={`${ri}-${ci}`}
                                            style={{
                                                ...styles.hmCell,
                                                background: getHeatColor(v),
                                                transform: isHovered ? 'scale(1.12)' : 'scale(1)',
                                                zIndex: isHovered ? 10 : 1,
                                                boxShadow: isHovered ? '0 0 12px rgba(251,191,36,0.4)' : 'none',
                                            }}
                                            onMouseEnter={() => setHoveredCell({ r: ri, c: ci })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            {(v * 100).toFixed(0)}%
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {hoveredCell && (
                        <div style={styles.hmTooltip}>
                            &quot;<strong>{sentenceData.words[hoveredCell.r]}</strong>&quot;이
                            &quot;<strong>{sentenceData.words[hoveredCell.c]}</strong>&quot;에 주목:
                            <span style={{ color: '#fbbf24', fontWeight: 800, marginLeft: 6 }}>
                                {(sentenceData.weights[hoveredCell.r][hoveredCell.c] * 100).toFixed(1)}%
                            </span>
                        </div>
                    )}

                    <p style={{ ...styles.hint, marginTop: 16 }}>
                        대각선(자기 자신)의 값이 높으면 → 자기 참조가 강함<br />
                        &quot;빨간&quot;→&quot;사과를&quot;처럼 수식 관계가 있는 단어 쌍은 높은 어텐션을 보입니다!
                    </p>
                </div>

                {/* ══════════════════════════════════════════
                     Multi-Head Attention
                   ══════════════════════════════════════════ */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>🎭 Multi-Head Attention</h2>
                    <p style={styles.desc}>
                        하나의 어텐션 헤드는 하나의 관점만 봐요. 여러 헤드를 두면 문법적 관계, 의미적 관계, 위치적 관계 등을 동시에 파악할 수 있습니다.<br />
                        Head를 클릭해 각 Head가 포착하는 패턴을 비교해보세요!
                    </p>

                    {/* Head 선택 */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                        {MULTI_HEAD_DATA.heads.map((head, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveHead(idx)}
                                style={{
                                    ...styles.headBtn,
                                    background: idx === activeHead ? `${head.color}22` : 'rgba(255,255,255,0.03)',
                                    border: `2px solid ${idx === activeHead ? head.color : 'rgba(255,255,255,0.1)'}`,
                                    color: idx === activeHead ? head.color : 'var(--text-dim)',
                                }}
                            >
                                {head.name}
                            </button>
                        ))}
                    </div>

                    {/* Multi-Head 히트맵 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '80px repeat(4, 1fr)',
                        gap: 4,
                        maxWidth: 420,
                        margin: '0 auto',
                    }}>
                        <div />
                        {MULTI_HEAD_DATA.words.map(w => (
                            <div key={`mh-h-${w}`} style={styles.hmHeader}>{w}</div>
                        ))}
                        {MULTI_HEAD_DATA.words.map((rowWord, ri) => (
                            <div key={`mh-row-${ri}`} style={{ display: 'contents' }}>
                                <div style={styles.hmRowLabel}>{rowWord}</div>
                                {MULTI_HEAD_DATA.words.map((_, ci) => {
                                    const headData = MULTI_HEAD_DATA.heads[activeHead];
                                    const v = headData.weights[ri][ci];
                                    return (
                                        <div key={`mh-${ri}-${ci}`} style={{
                                            ...styles.hmCell,
                                            background: `${headData.color}${Math.round(15 + v * 85).toString(16).padStart(2, '0')}`,
                                            color: v > 0.4 ? '#fff' : 'rgba(255,255,255,0.7)',
                                        }}>
                                            {(v * 100).toFixed(0)}%
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Multi-Head 설명 */}
                    <div style={styles.mhExplain}>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {MULTI_HEAD_DATA.heads.map((head, idx) => (
                                <div key={idx} style={{
                                    ...styles.mhCard,
                                    border: `1px solid ${idx === activeHead ? head.color : 'rgba(255,255,255,0.05)'}`,
                                    opacity: idx === activeHead ? 1 : 0.5,
                                }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: head.color, marginBottom: 4 }}>{head.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {idx === 0 && '형용사가 수식하는 명사에 집중'}
                                        {idx === 1 && '주어와 동사의 관계를 포착'}
                                        {idx === 2 && '가까이 있는 단어끼리 연결'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 14, textAlign: 'center', lineHeight: 1.6 }}>
                            실제 GPT-2는 <strong>12개의 Head</strong>를, GPT-3는 <strong>96개의 Head</strong>를 사용합니다.<br />
                            각 Head의 출력을 합쳐(Concat) 하나의 벡터로 만든 뒤, 다음 레이어로 전달합니다.
                        </p>
                    </div>

                    <div style={{ ...styles.formulaBox, marginTop: 16 }}>
                        <code style={{ fontSize: '0.82rem', color: '#fbbf24' }}>
                            MultiHead(Q,K,V) = Concat(head₁, head₂, ..., headₕ) · W^O
                        </code>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>
                            각 headᵢ = Attention(Q·Wᵢᵠ, K·Wᵢᴷ, V·Wᵢⱽ)
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 6 }}>
                            Concat = 각 Head 결과를 이어붙이기, W^O = 원래 차원으로 합치는 가중치
                        </div>
                    </div>
                </div>

                {/* ── Theory Section ── */}
                <div style={styles.theoryCard}>
                    <h3 style={styles.theoryTitle}>🤖 트랜스포머(Transformer)의 핵심</h3>
                    <div style={styles.theoryContent}>
                        <p>
                            <strong>&quot;나는 맛있는 [ ? ]를 먹었다&quot;</strong> 문장 완성하기
                        </p>
                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                            <li><strong>Query (탐색)</strong>: 빈칸 [ ? ]에 들어갈 단어를 찾기 위해 주변을 둘러봅니다.
                                <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Query = '나는 뭘 찾고 있는지' (비유: 질문)</span>
                            </li>
                            <li><strong>Key (정보)</strong>: &quot;나는&quot;, &quot;맛있는&quot;, &quot;먹었다&quot; 같은 단어들이 자신의 정보를 가지고 기다립니다.
                                <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Key = '나는 이런 정보를 가지고 있다' (비유: 이름표)</span>
                            </li>
                            <li><strong>Attention (집중)</strong>: &quot;먹었다&quot;와 &quot;맛있는&quot;이라는 단어에 <strong>높은 가중치(Attention)</strong>를 둡니다.
                                <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Value = 실제 전달할 정보 (비유: 답변 내용)</span>
                            </li>
                        </ul>
                        <p>
                            트랜스포머 모델은 문장 내의 모든 단어들 사이의 관계(Attention)를 계산하여
                            <strong>문맥(Context)을 파악</strong>합니다.
                        </p>
                        <div style={styles.tipBox}>
                            <strong>💡 Scaled Dot-Product Attention</strong><br />
                            <code style={{ color: '#fbbf24' }}>Attention(Q,K,V) = softmax(QK<sup>T</sup> / √d<sub>k</sub>) · V</code><br />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>K<sup>T</sup>(전치) = K를 세로/가로 뒤집은 것. 이렇게 해야 Q와 K의 내적을 한 번에 계산 가능</span><br />
                            <span style={{ fontSize: '0.82rem' }}>
                                벡터 차원이 클수록 내적 값이 커지므로, √d<sub>k</sub>로 나눠서 값을 적당한 크기로 조절합니다. 안 나누면 Softmax 결과가 극단적으로 치우쳐요.
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── 한 걸음 더: 내적의 기하학적 의미 ── */}
                <div style={{
                    background: 'rgba(124, 92, 252, 0.08)',
                    border: '1px solid rgba(124, 92, 252, 0.25)',
                    borderRadius: 16,
                    overflow: 'hidden',
                }}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            color: '#c4b5fd',
                            fontSize: '1.05rem',
                            fontWeight: 700,
                        }}
                    >
                        <span>{"🔬 한 걸음 더: 내적의 기하학적 의미"}</span>
                        <span style={{
                            transform: showDeepDive ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                            fontSize: '1.2rem',
                        }}>
                            ▼
                        </span>
                    </button>
                    {showDeepDive && (
                        <div style={{
                            padding: '0 24px 20px 24px',
                            color: '#cbd5e1',
                            fontSize: '0.92rem',
                            lineHeight: 1.8,
                        }}>
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: 10,
                                background: 'rgba(124, 92, 252, 0.1)',
                                border: '1px solid rgba(124, 92, 252, 0.15)',
                                marginBottom: 12,
                                textAlign: 'center',
                                fontFamily: 'monospace',
                                fontSize: '1rem',
                                color: '#e2e8f0',
                            }}>
                                두 벡터의 내적 = |A| x |B| x cos(θ)
                            </div>
                            <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <li><strong style={{ color: '#4ade80' }}>같은 방향</strong>이면 cos(0°) = 1 → 내적이 <strong>최대</strong></li>
                                <li><strong style={{ color: '#fbbf24' }}>직각(90°)</strong>이면 cos(90°) = 0 → 내적이 <strong>0</strong></li>
                                <li><strong style={{ color: '#f43f5e' }}>반대 방향</strong>이면 cos(180°) = -1 → 내적이 <strong>음수(최소)</strong></li>
                            </ul>
                            <p style={{ marginTop: 12 }}>
                                이것이 바로 &quot;유사도&quot;를 측정하는 원리입니다. <strong style={{ color: '#a78bfa' }}>코사인 유사도(Cosine Similarity)</strong>도 이 원리를 활용합니다.
                                어텐션에서 Query와 Key의 내적이 높다는 것은 두 벡터가 비슷한 방향을 가리킨다는 뜻이에요!
                            </p>
                        </div>
                    )}
                </div>

                {/* ── 클래스 어텐션 현황 ── */}
                {roomCode && Object.keys(classAttention).length > 0 && (
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>👥 클래스 어텐션 현황</h2>
                        <p style={styles.desc}>
                            같은 수업에 참여한 학생들이 어떤 어텐션 패턴을 탐색하고 있는지 실시간으로 확인하세요!
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: 10,
                        }}>
                            {Object.values(classAttention).map((a) => (
                                <div key={a.studentId} style={{
                                    padding: 12,
                                    borderRadius: 10,
                                    background: 'rgba(124, 92, 252, 0.06)',
                                    border: '1px solid rgba(124, 92, 252, 0.15)',
                                }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', marginBottom: 8,
                                    }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>
                                            {a.studentName}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                            H{a.headCount || 1}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {a.selectedWord || '-'}
                                    </div>
                                    {a.attentionWeights && a.attentionWeights.length > 0 && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: `repeat(${a.attentionWeights.length}, 1fr)`,
                                            gap: 2, marginTop: 6,
                                        }}>
                                            {a.attentionWeights.map((row, ri) =>
                                                row.map((w, ci) => (
                                                    <div key={`${ri}-${ci}`} style={{
                                                        aspectRatio: '1',
                                                        background: `rgba(124, 92, 252, ${w * 0.85 + 0.05})`,
                                                        borderRadius: 2,
                                                    }} />
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Navigation ── */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, paddingBottom: 40 }}>
                    <button onClick={() => router.push('/week10/intro')} style={styles.navBtn}>← 인트로로</button>
                    <button onClick={() => router.push('/week12/intro')} className="btn-nova" style={{ padding: '10px 24px' }}>
                        <span>12주차: 정규화 →</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: 20,
        maxWidth: 1000,
        margin: '0 auto',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 30,
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '1rem',
        marginRight: 20,
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 700,
        background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
    },
    card: {
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(255,255,255,0.1)',
    },
    cardTitle: {
        fontSize: '1.1rem',
        fontWeight: 600,
        color: '#f8fafc',
        marginBottom: 10,
    },
    desc: {
        color: '#94a3b8',
        lineHeight: 1.6,
        marginBottom: 16,
        fontSize: '0.9rem',
    },
    controls: {
        display: 'flex',
        gap: 30,
        flexWrap: 'wrap',
    },
    controlRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#cbd5e1',
        flex: 1,
        minWidth: 200,
    },
    vizContainer: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
    },
    vizCard: {
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    svg: {
        width: '100%',
        height: 'auto',
        maxHeight: 300,
        background: '#0f172a',
        borderRadius: 8,
    },
    barChart: {
        width: '100%',
        marginTop: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    barRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    barLabel: {
        width: 80,
        fontSize: '0.9rem',
        textAlign: 'right',
    },
    barTrack: {
        flex: 1,
        height: 24,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
    },
    barFill: {
        height: '100%',
        transition: 'width 0.3s ease',
    },
    barValue: {
        position: 'absolute',
        right: 8,
        fontSize: '0.85rem',
        color: '#fff',
        fontWeight: 'bold',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    },
    hint: {
        marginTop: 16,
        fontSize: '0.85rem',
        color: '#94a3b8',
        background: 'rgba(251, 191, 36, 0.08)',
        padding: 12,
        borderRadius: 8,
        lineHeight: 1.5,
        textAlign: 'center',
    },
    nextBtn: {
        background: '#10b981',
        color: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 8,
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)',
        transition: 'transform 0.2s',
    },
    // ── Self-Attention 히트맵 ──
    sentenceBtn: {
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
    },
    hmHeader: {
        textAlign: 'center',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        padding: '6px 2px',
    },
    hmRowLabel: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: 'var(--text-secondary)',
        paddingRight: 8,
    },
    hmCell: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        padding: '10px 2px',
        fontSize: '0.73rem',
        fontWeight: 700,
        color: '#fff',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    hmTooltip: {
        marginTop: 12,
        padding: '10px 16px',
        borderRadius: 10,
        background: 'rgba(15,10,40,0.8)',
        border: '1px solid rgba(251,191,36,0.3)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        textAlign: 'center',
    },
    // ── Multi-Head ──
    headBtn: {
        padding: '10px 16px',
        borderRadius: 10,
        border: '2px solid',
        cursor: 'pointer',
        fontSize: '0.82rem',
        fontWeight: 600,
        transition: 'all 0.2s',
        background: 'transparent',
    },
    mhExplain: {
        marginTop: 20,
        padding: 16,
        borderRadius: 12,
        background: 'rgba(15,10,40,0.4)',
    },
    mhCard: {
        padding: '10px 16px',
        borderRadius: 10,
        border: '1px solid',
        minWidth: 140,
        transition: 'opacity 0.2s',
    },
    formulaBox: {
        textAlign: 'center',
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(251,191,36,0.06)',
        border: '1px solid rgba(251,191,36,0.15)',
    },
    // ── Theory ──
    theoryCard: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 16,
        padding: 24,
    },
    theoryTitle: {
        color: '#60a5fa',
        fontSize: '1.2rem',
        fontWeight: 700,
        marginBottom: 16,
    },
    theoryContent: {
        color: '#cbd5e1',
        fontSize: '0.95rem',
        lineHeight: 1.7,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    tipBox: {
        padding: 14,
        borderRadius: 10,
        background: 'rgba(251, 191, 36, 0.08)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
    },
    navBtn: {
        padding: '10px 24px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
};
