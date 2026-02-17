'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── 스텝 데이터 ──
const STEPS = [
    {
        id: 'welcome',
        title: '어텐션(Attention)이란?',
        emoji: '🔍',
        subtitle: 'AI는 어떻게 중요한 단어에 집중할까?',
    },
    {
        id: 'qkv',
        title: 'Q, K, V — 세 가지 역할',
        emoji: '🔑',
        subtitle: '질문하고, 찾고, 가져오는 3단계',
    },
    {
        id: 'dotproduct',
        title: '내적 = 유사도 측정',
        emoji: '📐',
        subtitle: '두 벡터가 얼마나 비슷한지 숫자로!',
    },
    {
        id: 'softmax',
        title: 'Softmax = 확률로 변환',
        emoji: '📊',
        subtitle: '점수를 확률로 바꿔 집중도를 결정!',
    },
    {
        id: 'heatmap',
        title: '어텐션 히트맵',
        emoji: '🗺️',
        subtitle: '문장 속 단어들의 관계를 한눈에!',
    },
    {
        id: 'lab',
        title: '어텐션 게임 시작!',
        emoji: '🎮',
        subtitle: '직접 어텐션을 조작해보세요!',
    },
];

// ── 검색 엔진 비유 데모 ──
function SearchDemo() {
    const [query, setQuery] = useState('빨간');
    const docs = [
        { text: '빨간 사과', relevance: 0 },
        { text: '파란 하늘', relevance: 0 },
        { text: '빨간 장미', relevance: 0 },
        { text: '초록 나무', relevance: 0 },
        { text: '빨간 자동차', relevance: 0 },
    ];

    const scored = docs.map((d, idx) => ({
        ...d,
        relevance: d.text.includes(query) ? 0.9 + idx * 0.01 : 0.1 + idx * 0.02,
    })).sort((a, b) => b.relevance - a.relevance);

    return (
        <div style={ds.container}>
            <p style={ds.instruction}>
                검색 엔진에 <strong style={{ color: '#fbbf24' }}>Query(검색어)</strong>를 입력하면 관련 문서가 상위에 오듯,<br />
                AI도 현재 처리 중인 단어(Query)와 관련 높은 단어에 더 집중합니다!
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Query:</span>
                {['빨간', '파란', '사과'].map((q) => (
                    <button
                        key={q}
                        onClick={() => setQuery(q)}
                        style={{
                            ...ds.miniBtn,
                            ...(query === q ? ds.miniBtnActive : {}),
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>
            <div style={ds.resultList}>
                {scored.map((d, i) => (
                    <div key={d.text} style={{
                        ...ds.resultItem,
                        borderLeft: `4px solid ${d.relevance > 0.5 ? '#fbbf24' : 'rgba(107,114,128,0.3)'}`,
                        opacity: 0.4 + d.relevance * 0.6,
                    }}>
                        <span style={{ flex: 1 }}>{d.text}</span>
                        <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: d.relevance > 0.5 ? '#fbbf24' : 'var(--text-dim)',
                        }}>
                            {d.relevance > 0.5 ? '높음' : '낮음'}
                        </span>
                    </div>
                ))}
            </div>
            <p style={{ ...ds.hint, marginTop: 12 }}>
                Query &quot;{query}&quot;와 관련 높은 문서일수록 더 높은 <strong>어텐션 점수</strong>를 받습니다!
            </p>
        </div>
    );
}

// ── Q, K, V 시각화 ──
function QKVDemo() {
    const [activeRole, setActiveRole] = useState(null);

    const roles = [
        {
            key: 'Q',
            label: 'Query (질문)',
            color: '#f43f5e',
            icon: '❓',
            desc: '내가 찾고 싶은 정보',
            example: '"사과"는 어떤 색이지?',
        },
        {
            key: 'K',
            label: 'Key (열쇠)',
            color: '#fbbf24',
            icon: '🔑',
            desc: '각 단어가 가진 정보 라벨',
            example: '"빨간"→색상, "맛있다"→맛',
        },
        {
            key: 'V',
            label: 'Value (값)',
            color: '#10b981',
            icon: '💎',
            desc: '실제로 가져올 정보의 내용',
            example: '매칭된 Key의 실제 데이터',
        },
    ];

    return (
        <div style={ds.container}>
            <p style={ds.instruction}>
                어텐션은 세 가지 역할로 나뉩니다. 각각을 클릭해보세요!
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                {roles.map((r) => (
                    <div
                        key={r.key}
                        onClick={() => setActiveRole(activeRole === r.key ? null : r.key)}
                        style={{
                            ...ds.qkvCard,
                            border: `1px solid ${activeRole === r.key ? r.color : 'rgba(124,92,252,0.15)'}`,
                            background: activeRole === r.key ? `${r.color}15` : 'rgba(15,10,40,0.6)',
                            cursor: 'pointer',
                            transform: activeRole === r.key ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.3s',
                        }}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: 6 }}>{r.icon}</div>
                        <div style={{ fontWeight: 700, color: r.color, fontSize: '0.9rem' }}>{r.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>{r.desc}</div>
                    </div>
                ))}
            </div>
            {activeRole && (
                <div style={ds.exampleBox}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        예시: <strong style={{ color: roles.find((r) => r.key === activeRole).color }}>
                            {roles.find((r) => r.key === activeRole).example}
                        </strong>
                    </div>
                </div>
            )}
            <div style={ds.flowBox}>
                <div style={ds.flowStep}>
                    <span style={{ color: '#f43f5e', fontWeight: 700 }}>Q</span>
                    <span style={{ color: 'var(--text-dim)' }}>질문</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>×</span>
                <div style={ds.flowStep}>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>K</span>
                    <span style={{ color: 'var(--text-dim)' }}>매칭</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>→</span>
                <div style={ds.flowStep}>
                    <span style={{ color: '#7c5cfc', fontWeight: 700 }}>점수</span>
                    <span style={{ color: 'var(--text-dim)' }}>유사도</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: '1.2rem' }}>→</span>
                <div style={ds.flowStep}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>V</span>
                    <span style={{ color: 'var(--text-dim)' }}>가져오기</span>
                </div>
            </div>
        </div>
    );
}

// ── 내적(Dot Product) 인터랙티브 데모 ──
function DotProductDemo() {
    const [vecA, setVecA] = useState([3, 4]);
    const [vecB, setVecB] = useState([4, 3]);
    const canvasRef = useRef(null);

    const dotProduct = vecA[0] * vecB[0] + vecA[1] * vecB[1];
    const magA = Math.sqrt(vecA[0] ** 2 + vecA[1] ** 2);
    const magB = Math.sqrt(vecB[0] ** 2 + vecB[1] ** 2);
    const cosine = magA > 0 && magB > 0 ? dotProduct / (magA * magB) : 0;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const scale = 30;

        ctx.clearRect(0, 0, W, H);

        // 그리드
        ctx.strokeStyle = 'rgba(124,92,252,0.06)';
        ctx.lineWidth = 1;
        for (let i = -5; i <= 5; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * scale, 0);
            ctx.lineTo(cx + i * scale, H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, cy + i * scale);
            ctx.lineTo(W, cy + i * scale);
            ctx.stroke();
        }

        // 축
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.stroke();

        // 벡터 A (Query)
        const drawVec = (v, color, label) => {
            const ex = cx + v[0] * scale;
            const ey = cy - v[1] * scale;
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.moveTo(cx, cy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            // 화살표 머리
            const angle = Math.atan2(-(v[1]), v[0]);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - 10 * Math.cos(angle - 0.4), ey + 10 * Math.sin(angle - 0.4));
            ctx.lineTo(ex - 10 * Math.cos(angle + 0.4), ey + 10 * Math.sin(angle + 0.4));
            ctx.fill();
            // 라벨
            ctx.fillStyle = color;
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, ex + (v[0] > 0 ? 12 : -12), ey + (v[1] > 0 ? -8 : 16));
        };

        drawVec(vecA, '#f43f5e', `Q [${vecA[0]},${vecA[1]}]`);
        drawVec(vecB, '#fbbf24', `K [${vecB[0]},${vecB[1]}]`);

        // 각도 호
        const angleA = Math.atan2(vecA[1], vecA[0]);
        const angleB = Math.atan2(vecB[1], vecB[0]);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(124,92,252,0.5)';
        ctx.lineWidth = 2;
        ctx.arc(cx, cy, 40, -angleA, -angleB, angleA > angleB);
        ctx.stroke();
    }, [vecA, vecB]);

    return (
        <div style={ds.container}>
            <p style={ds.instruction}>
                슬라이더로 Q(빨강)와 K(노랑) 벡터를 바꿔보세요!<br />
                <strong style={{ color: '#7c5cfc' }}>내적(Dot Product)</strong>이 유사도 점수가 됩니다.
            </p>
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                style={{
                    width: '100%', maxWidth: 300, height: 'auto',
                    borderRadius: 12, background: 'rgba(15,10,40,0.6)',
                    border: '1px solid rgba(124,92,252,0.15)',
                    margin: '0 auto', display: 'block',
                }}
            />
            <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: '0.78rem', color: '#f43f5e', fontWeight: 700 }}>Q 벡터</label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input type="range" className="slider-cosmic" min={-5} max={5} step={1}
                            value={vecA[0]} onChange={(e) => setVecA([+e.target.value, vecA[1]])}
                            style={{ flex: 1 }} />
                        <input type="range" className="slider-cosmic" min={-5} max={5} step={1}
                            value={vecA[1]} onChange={(e) => setVecA([vecA[0], +e.target.value])}
                            style={{ flex: 1 }} />
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700 }}>K 벡터</label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <input type="range" className="slider-cosmic" min={-5} max={5} step={1}
                            value={vecB[0]} onChange={(e) => setVecB([+e.target.value, vecB[1]])}
                            style={{ flex: 1 }} />
                        <input type="range" className="slider-cosmic" min={-5} max={5} step={1}
                            value={vecB[1]} onChange={(e) => setVecB([vecB[0], +e.target.value])}
                            style={{ flex: 1 }} />
                    </div>
                </div>
            </div>
            <div style={ds.resultBox}>
                <div style={ds.resultRow}>
                    <span style={{ color: 'var(--text-dim)' }}>내적 (Q · K):</span>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: dotProduct > 15 ? '#10b981' : dotProduct > 0 ? '#fbbf24' : '#f43f5e' }}>
                        {dotProduct}
                    </span>
                </div>
                <div style={ds.resultRow}>
                    <span style={{ color: 'var(--text-dim)' }}>코사인 유사도:</span>
                    <span style={{ fontWeight: 700, color: '#7c5cfc' }}>
                        {cosine.toFixed(3)}
                    </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 8, textAlign: 'center' }}>
                    {cosine > 0.9 ? '거의 같은 방향! → 높은 어텐션' :
                        cosine > 0.5 ? '비슷한 방향 → 보통 어텐션' :
                            cosine > 0 ? '다른 방향 → 낮은 어텐션' :
                                '반대 방향! → 무시'}
                </p>
            </div>
        </div>
    );
}

// ── Softmax 시각화 ──
function SoftmaxDemo() {
    const [scores, setScores] = useState([5, 2, 1, 0.5]);
    const [temperature, setTemperature] = useState(1);
    const words = ['빨간', '사과를', '먹었다', '어제'];

    const softmax = (vals, T) => {
        const scaled = vals.map((v) => v / T);
        const maxVal = Math.max(...scaled);
        const exps = scaled.map((v) => Math.exp(v - maxVal));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map((e) => e / sum);
    };

    const probs = softmax(scores, temperature);

    return (
        <div style={ds.container}>
            <p style={ds.instruction}>
                내적으로 구한 점수를 <strong style={{ color: '#7c5cfc' }}>Softmax</strong>로 확률(0~1)로 변환합니다!<br />
                Temperature를 바꿔보세요.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>T=0.1</span>
                <input
                    type="range" className="slider-cosmic"
                    min={0.1} max={3} step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>T=3.0</span>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 700, fontFamily: 'monospace', color: '#7c5cfc' }}>
                Temperature = {temperature.toFixed(1)}
                <span style={{ marginLeft: 12, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {temperature < 0.5 ? '🎯 매우 집중!' : temperature < 1.5 ? '✅ 균형' : '🌊 분산됨'}
                </span>
            </div>

            {/* 점수 조절 */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 6 }}>
                    각 단어의 어텐션 점수(logit)를 조절해보세요:
                </div>
                {words.map((w, i) => (
                    <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 50, fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'right' }}>{w}</span>
                        <input
                            type="range" className="slider-cosmic"
                            min={0} max={10} step={0.5}
                            value={scores[i]}
                            onChange={(e) => {
                                const newScores = [...scores];
                                newScores[i] = parseFloat(e.target.value);
                                setScores(newScores);
                            }}
                            style={{ flex: 1 }}
                        />
                        <span style={{ width: 30, fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{scores[i].toFixed(1)}</span>
                    </div>
                ))}
            </div>

            {/* 확률 막대 */}
            <div style={ds.barChart}>
                {words.map((w, i) => (
                    <div key={w} style={ds.barItem}>
                        <div style={ds.barLabel}>{w}</div>
                        <div style={ds.barTrack}>
                            <div style={{
                                ...ds.barFill,
                                width: `${probs[i] * 100}%`,
                                background: probs[i] > 0.4 ? '#fbbf24' : probs[i] > 0.2 ? '#7c5cfc' : 'rgba(124,92,252,0.3)',
                            }} />
                        </div>
                        <div style={ds.barValue}>{(probs[i] * 100).toFixed(1)}%</div>
                    </div>
                ))}
            </div>
            <p style={{ ...ds.hint, marginTop: 12 }}>
                T가 낮으면 → 가장 높은 점수에 집중! | T가 높으면 → 골고루 분산
            </p>
        </div>
    );
}

// ── 어텐션 히트맵 ──
function AttentionHeatmap() {
    const sentence = ['나는', '빨간', '사과를', '먹었다'];
    // 사전 계산된 어텐션 가중치 (셀프 어텐션 시뮬레이션)
    const attentionWeights = [
        [0.65, 0.10, 0.15, 0.10], // 나는 → ...
        [0.05, 0.50, 0.40, 0.05], // 빨간 → ...
        [0.10, 0.45, 0.35, 0.10], // 사과를 → ...
        [0.30, 0.10, 0.20, 0.40], // 먹었다 → ...
    ];
    const [hoveredCell, setHoveredCell] = useState(null);

    const getColor = (v) => {
        const r = Math.round(124 + (251 - 124) * v);
        const g = Math.round(92 + (191 - 92) * v);
        const b = Math.round(252 + (36 - 252) * v);
        return `rgba(${r},${g},${b},${0.15 + v * 0.85})`;
    };

    return (
        <div style={ds.container}>
            <p style={ds.instruction}>
                &quot;나는 빨간 사과를 먹었다&quot; — 각 단어가 다른 단어에 얼마나 주목하는지!<br />
                셀을 호버하면 상세 정보를 볼 수 있어요.
            </p>
            <div style={ds.heatmapGrid}>
                {/* 헤더 행 */}
                <div style={ds.heatmapCorner} />
                {sentence.map((w) => (
                    <div key={`h-${w}`} style={ds.heatmapHeader}>{w}</div>
                ))}

                {/* 데이터 행 */}
                {sentence.map((rowWord, ri) => (
                    <>
                        <div key={`r-${rowWord}`} style={ds.heatmapRowLabel}>{rowWord}</div>
                        {sentence.map((_, ci) => (
                            <div
                                key={`${ri}-${ci}`}
                                style={{
                                    ...ds.heatmapCell,
                                    background: getColor(attentionWeights[ri][ci]),
                                    transform: hoveredCell?.r === ri && hoveredCell?.c === ci ? 'scale(1.15)' : 'scale(1)',
                                    zIndex: hoveredCell?.r === ri && hoveredCell?.c === ci ? 10 : 1,
                                }}
                                onMouseEnter={() => setHoveredCell({ r: ri, c: ci })}
                                onMouseLeave={() => setHoveredCell(null)}
                            >
                                {(attentionWeights[ri][ci] * 100).toFixed(0)}%
                            </div>
                        ))}
                    </>
                ))}
            </div>
            {hoveredCell && (
                <div style={ds.heatmapTooltip}>
                    &quot;<strong>{sentence[hoveredCell.r]}</strong>&quot;이
                    &quot;<strong>{sentence[hoveredCell.c]}</strong>&quot;에 주목하는 정도:
                    <span style={{ color: '#fbbf24', fontWeight: 800, marginLeft: 6 }}>
                        {(attentionWeights[hoveredCell.r][hoveredCell.c] * 100).toFixed(1)}%
                    </span>
                </div>
            )}
            <p style={{ ...ds.hint, marginTop: 16 }}>
                &quot;빨간&quot;은 &quot;사과를&quot;에 40% 집중 → 형용사가 수식 대상에 집중!<br />
                이것이 바로 <strong>Self-Attention</strong>입니다.
            </p>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week10IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };
    const goToLab = () => router.push('/week10');

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome':
                return (
                    <div style={ds.welcomeBox}>
                        {/* 브리지: 8주차 → 10주차 */}
                        <div style={{
                            padding: '12px 16px', borderRadius: 10,
                            background: 'rgba(251, 191, 36, 0.08)',
                            border: '1px solid rgba(251, 191, 36, 0.15)',
                            marginBottom: 16, fontSize: '0.85rem',
                            color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'left',
                        }}>
                            <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                            8주차에서 RNN이 토큰을 <strong>순차적으로</strong> 처리하며 기억을 유지하는 걸 배웠어요.
                            하지만 긴 문장에서는 기억이 사라지는 문제가 있었죠.
                            오늘 배울 <strong>어텐션(Attention)</strong>은 이 한계를 근본적으로 해결하는, Transformer의 핵심 기술입니다!
                        </div>
                        <p style={ds.text}>
                            우리가 책을 읽을 때, 모든 글자를 똑같이 읽지 않죠.<br />
                            <strong style={{ color: '#fbbf24' }}>중요한 단어</strong>에 자연스럽게 눈이 가듯이,<br /><br />
                            AI도 문장에서 <strong style={{ color: '#7c5cfc' }}>관련 있는 단어</strong>에 더 집중합니다.<br />
                            이것을 <strong style={{ color: '#f43f5e' }}>어텐션(Attention)</strong>이라 합니다!<br /><br />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                마치 검색 엔진에 Query(검색어)를 넣으면 관련 문서가 상위에 오는 것처럼요!
                            </span>
                        </p>
                        <SearchDemo />
                    </div>
                );
            case 'qkv':
                return <QKVDemo />;
            case 'dotproduct':
                return <DotProductDemo />;
            case 'softmax':
                return <SoftmaxDemo />;
            case 'heatmap':
                return <AttentionHeatmap />;
            case 'lab':
                return (
                    <div style={{ ...ds.container, textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: 16 }} className="animate-float">✨</div>
                        <p style={ds.text}>
                            지금까지 배운 어텐션의 원리를<br />
                            <strong style={{ color: '#fbbf24' }}>직접 체험</strong>할 시간입니다!<br /><br />
                            3D 어텐션 시각화와 멀티플레이어 게임으로<br />
                            <strong style={{ color: '#7c5cfc' }}>Q, K, V를 직접 조작</strong>해보세요.
                        </p>
                        <button
                            className="btn-nova"
                            style={{ marginTop: 24, padding: '14px 40px', fontSize: '1.1rem' }}
                            onClick={goToLab}
                        >
                            <span>🚀 어텐션 게임 시작!</span>
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={pageStyles.container}>
            {/* 진행바 */}
            <div style={pageStyles.progressBar}>
                {STEPS.map((s, i) => (
                    <div
                        key={s.id}
                        style={{
                            ...pageStyles.progressDot,
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124,92,252,0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div style={{
                    ...pageStyles.progressFill,
                    width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                }} />
            </div>

            {/* 헤더 */}
            <div style={pageStyles.header}>
                <span style={pageStyles.weekBadge}>10주차</span>
                <div style={{ fontSize: '3rem' }}>{step.emoji}</div>
                <h1 style={pageStyles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
                <p style={pageStyles.subtitle}>{step.subtitle}</p>
            </div>

            {/* 콘텐츠 */}
            <div style={pageStyles.content}>
                {renderStepContent()}
            </div>

            {/* 네비게이션 */}
            <div style={pageStyles.navBar}>
                <button
                    className="btn-nova"
                    style={{ ...pageStyles.navBtn, opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>&larr; 이전</span>
                </button>
                <span style={pageStyles.stepCount}>
                    {currentStep + 1} / {STEPS.length}
                </span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={nextStep}>
                        <span>다음 &rarr;</span>
                    </button>
                ) : (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={goToLab}>
                        <span>🚀 실습 시작</span>
                    </button>
                )}
            </div>
        </div>
    );
}

// ── 페이지 스타일 ──
const pageStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', maxWidth: 680, margin: '0 auto' },
    progressBar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, position: 'relative', width: '100%', maxWidth: 300, justifyContent: 'center' },
    progressDot: { width: 12, height: 12, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s', zIndex: 1 },
    progressFill: { position: 'absolute', left: 6, top: '50%', height: 3, background: 'var(--accent-nova)', borderRadius: 2, transform: 'translateY(-50%)', transition: 'width 0.3s', zIndex: 0 },
    header: { textAlign: 'center', marginBottom: 24 },
    weekBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', marginBottom: 12, letterSpacing: '0.05em' },
    title: { fontSize: '1.6rem', fontWeight: 800, marginTop: 8, marginBottom: 6 },
    subtitle: { fontSize: '0.95rem', color: 'var(--text-secondary)' },
    content: { flex: 1, width: '100%', marginBottom: 24 },
    navBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' },
    navBtn: { padding: '10px 24px', fontSize: '0.9rem' },
    stepCount: { fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 },
};

// ── 데모 스타일 ──
const ds = {
    container: { padding: 20 },
    welcomeBox: { textAlign: 'center', padding: 20 },
    text: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 },
    instruction: { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 },
    hint: { fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.6 },
    miniBtn: {
        padding: '6px 14px', borderRadius: 8,
        border: '1px solid rgba(124,92,252,0.2)', background: 'rgba(124,92,252,0.06)',
        color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    },
    miniBtnActive: {
        background: 'var(--accent-nova)', color: '#fff', border: '1px solid var(--accent-nova)',
        boxShadow: '0 4px 16px rgba(124,92,252,0.4)',
    },
    resultList: {
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: 16, borderRadius: 12, background: 'rgba(15,10,40,0.6)',
        border: '1px solid rgba(124,92,252,0.12)',
    },
    resultItem: {
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        borderRadius: 8, background: 'rgba(255,255,255,0.03)',
        fontSize: '0.88rem', color: 'var(--text-secondary)', transition: 'opacity 0.3s',
    },
    qkvCard: {
        padding: '16px 20px', borderRadius: 14,
        border: '1px solid rgba(124,92,252,0.15)',
        textAlign: 'center', minWidth: 130, flex: 1,
    },
    exampleBox: {
        padding: 14, borderRadius: 10,
        background: 'rgba(15,10,40,0.6)', border: '1px solid rgba(124,92,252,0.12)',
        textAlign: 'center', marginBottom: 16,
    },
    flowBox: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, marginTop: 16, flexWrap: 'wrap',
        padding: 14, borderRadius: 12, background: 'rgba(15,10,40,0.4)',
    },
    flowStep: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 14px', borderRadius: 10,
        background: 'rgba(124,92,252,0.08)', fontSize: '0.82rem', gap: 2,
    },
    resultBox: {
        marginTop: 16, padding: 16, borderRadius: 12,
        background: 'rgba(15,10,40,0.6)', border: '1px solid rgba(124,92,252,0.12)',
    },
    resultRow: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.9rem', marginBottom: 6,
    },
    barChart: {
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 16, borderRadius: 12, background: 'rgba(15,10,40,0.6)',
        border: '1px solid rgba(124,92,252,0.12)',
    },
    barItem: {
        display: 'flex', alignItems: 'center', gap: 10,
    },
    barLabel: {
        width: 50, fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'right',
    },
    barTrack: {
        flex: 1, height: 22, borderRadius: 6, background: 'rgba(124,92,252,0.08)', overflow: 'hidden',
    },
    barFill: {
        height: '100%', borderRadius: 6, transition: 'width 0.4s ease, background 0.4s',
    },
    barValue: {
        width: 50, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', fontFamily: 'monospace',
    },
    heatmapGrid: {
        display: 'grid',
        gridTemplateColumns: '60px repeat(4, 1fr)',
        gap: 4,
        maxWidth: 400,
        margin: '0 auto',
    },
    heatmapCorner: {
        /* empty corner */
    },
    heatmapHeader: {
        textAlign: 'center', fontSize: '0.78rem', fontWeight: 700,
        color: 'var(--text-secondary)', padding: '6px 0',
    },
    heatmapRowLabel: {
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)',
        paddingRight: 8,
    },
    heatmapCell: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, padding: '10px 4px',
        fontSize: '0.75rem', fontWeight: 700, color: '#fff',
        cursor: 'pointer', transition: 'transform 0.2s',
    },
    heatmapTooltip: {
        marginTop: 12, padding: '10px 16px', borderRadius: 10,
        background: 'rgba(15,10,40,0.8)', border: '1px solid rgba(251,191,36,0.3)',
        fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center',
    },
};
