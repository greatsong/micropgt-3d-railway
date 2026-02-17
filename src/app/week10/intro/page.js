'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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
        <div className={styles.dsContainer}>
            <p className={styles.instruction}>
                검색 엔진에 <strong className={styles.highlightYellow}>Query(검색어)</strong>를 입력하면 관련 문서가 상위에 오듯,<br />
                AI도 현재 처리 중인 단어(Query)와 관련 높은 단어에 더 집중합니다!
            </p>
            <div className={styles.searchQueryRow}>
                <span className={styles.queryLabel}>Query:</span>
                {['빨간', '파란', '사과'].map((q) => (
                    <button
                        key={q}
                        onClick={() => setQuery(q)}
                        className={`${styles.miniBtn} ${query === q ? styles.miniBtnActive : ''}`}
                    >
                        {q}
                    </button>
                ))}
            </div>
            <div className={styles.resultList}>
                {scored.map((d, i) => (
                    <div key={d.text} className={styles.resultItem} style={{
                        borderLeft: `4px solid ${d.relevance > 0.5 ? '#fbbf24' : 'rgba(107,114,128,0.3)'}`,
                        opacity: 0.4 + d.relevance * 0.6,
                    }}>
                        <span className={styles.flex1}>{d.text}</span>
                        <span className={d.relevance > 0.5 ? styles.relevanceHigh : styles.relevanceLow}>
                            {d.relevance > 0.5 ? '높음' : '낮음'}
                        </span>
                    </div>
                ))}
            </div>
            <p className={styles.hintMt12}>
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
        <div className={styles.dsContainer}>
            <p className={styles.instruction}>
                어텐션은 세 가지 역할로 나뉩니다. 각각을 클릭해보세요!
            </p>
            <div className={styles.qkvCardRow}>
                {roles.map((r) => (
                    <div
                        key={r.key}
                        onClick={() => setActiveRole(activeRole === r.key ? null : r.key)}
                        className={styles.qkvCard}
                        style={{
                            border: `1px solid ${activeRole === r.key ? r.color : 'rgba(124,92,252,0.15)'}`,
                            background: activeRole === r.key ? `${r.color}15` : 'rgba(15,10,40,0.6)',
                            cursor: 'pointer',
                            transform: activeRole === r.key ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.3s',
                        }}
                    >
                        <div className={styles.qkvIcon}>{r.icon}</div>
                        <div style={{ fontWeight: 700, color: r.color, fontSize: '0.9rem' }}>{r.label}</div>
                        <div className={styles.qkvDesc}>{r.desc}</div>
                    </div>
                ))}
            </div>
            {activeRole && (
                <div className={styles.exampleBox}>
                    <div className={styles.exampleText}>
                        예시: <strong style={{ color: roles.find((r) => r.key === activeRole).color }}>
                            {roles.find((r) => r.key === activeRole).example}
                        </strong>
                    </div>
                </div>
            )}
            <div className={styles.flowBox}>
                <div className={styles.flowStep}>
                    <span className={styles.colorQ}>Q</span>
                    <span className={styles.flowDimText}>질문</span>
                </div>
                <span className={styles.flowArrow}>×</span>
                <div className={styles.flowStep}>
                    <span className={styles.colorK}>K</span>
                    <span className={styles.flowDimText}>매칭</span>
                </div>
                <span className={styles.flowArrow}>→</span>
                <div className={styles.flowStep}>
                    <span className={styles.colorScore}>점수</span>
                    <span className={styles.flowDimText}>유사도</span>
                </div>
                <span className={styles.flowArrow}>→</span>
                <div className={styles.flowStep}>
                    <span className={styles.colorV}>V</span>
                    <span className={styles.flowDimText}>가져오기</span>
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
        <div className={styles.dsContainer}>
            <p className={styles.instruction}>
                슬라이더로 Q(빨강)와 K(노랑) 벡터를 바꿔보세요!<br />
                <strong className={styles.highlightPurple}>내적(Dot Product)</strong>이 유사도 점수가 됩니다.
            </p>
            <canvas
                ref={canvasRef}
                width={300}
                height={300}
                className={styles.canvas}
            />
            <div className={styles.sliderRow}>
                <div className={styles.sliderGroup}>
                    <label className={styles.labelQ}>Q 벡터</label>
                    <div className={styles.sliderInner}>
                        <input type="range" className={`slider-cosmic ${styles.flex1}`} min={-5} max={5} step={1}
                            value={vecA[0]} onChange={(e) => setVecA([+e.target.value, vecA[1]])} />
                        <input type="range" className={`slider-cosmic ${styles.flex1}`} min={-5} max={5} step={1}
                            value={vecA[1]} onChange={(e) => setVecA([vecA[0], +e.target.value])} />
                    </div>
                </div>
                <div className={styles.sliderGroup}>
                    <label className={styles.labelK}>K 벡터</label>
                    <div className={styles.sliderInner}>
                        <input type="range" className={`slider-cosmic ${styles.flex1}`} min={-5} max={5} step={1}
                            value={vecB[0]} onChange={(e) => setVecB([+e.target.value, vecB[1]])} />
                        <input type="range" className={`slider-cosmic ${styles.flex1}`} min={-5} max={5} step={1}
                            value={vecB[1]} onChange={(e) => setVecB([vecB[0], +e.target.value])} />
                    </div>
                </div>
            </div>
            <div className={styles.resultBox}>
                <div className={styles.resultRow}>
                    <span className={styles.textDim}>내적 (Q · K):</span>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: dotProduct > 15 ? '#10b981' : dotProduct > 0 ? '#fbbf24' : '#f43f5e' }}>
                        {dotProduct}
                    </span>
                </div>
                <div className={styles.resultRow}>
                    <span className={styles.textDim}>코사인 유사도:</span>
                    <span className={styles.colorScore}>
                        {cosine.toFixed(3)}
                    </span>
                </div>
                <p className={styles.cosineInfo}>
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
        <div className={styles.dsContainer}>
            <p className={styles.instruction}>
                내적으로 구한 점수를 <strong className={styles.highlightPurple}>Softmax</strong>로 확률(0~1)로 변환합니다!<br />
                Temperature를 바꿔보세요.
            </p>
            <div className={styles.tempSliderRow}>
                <span className={styles.tempLabel}>T=0.1</span>
                <input
                    type="range" className={`slider-cosmic ${styles.flex1}`}
                    min={0.1} max={3} step={0.1}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                />
                <span className={styles.tempLabel}>T=3.0</span>
            </div>
            <div className={styles.tempDisplay}>
                Temperature = {temperature.toFixed(1)}
                <span className={styles.tempIndicator}>
                    {temperature < 0.5 ? '🎯 매우 집중!' : temperature < 1.5 ? '✅ 균형' : '🌊 분산됨'}
                </span>
            </div>

            {/* 점수 조절 */}
            <div className={styles.scoreSection}>
                <div className={styles.scoreSectionLabel}>
                    각 단어의 어텐션 점수(logit)를 조절해보세요:
                </div>
                {words.map((w, i) => (
                    <div key={w} className={styles.scoreRow}>
                        <span className={styles.scoreWord}>{w}</span>
                        <input
                            type="range" className={`slider-cosmic ${styles.flex1}`}
                            min={0} max={10} step={0.5}
                            value={scores[i]}
                            onChange={(e) => {
                                const newScores = [...scores];
                                newScores[i] = parseFloat(e.target.value);
                                setScores(newScores);
                            }}
                        />
                        <span className={styles.scoreValue}>{scores[i].toFixed(1)}</span>
                    </div>
                ))}
            </div>

            {/* 확률 막대 */}
            <div className={styles.barChart}>
                {words.map((w, i) => (
                    <div key={w} className={styles.barItem}>
                        <div className={styles.barLabel}>{w}</div>
                        <div className={styles.barTrack}>
                            <div className={styles.barFill} style={{
                                width: `${probs[i] * 100}%`,
                                background: probs[i] > 0.4 ? '#fbbf24' : probs[i] > 0.2 ? '#7c5cfc' : 'rgba(124,92,252,0.3)',
                            }} />
                        </div>
                        <div className={styles.barValue}>{(probs[i] * 100).toFixed(1)}%</div>
                    </div>
                ))}
            </div>
            <p className={styles.hintMt12}>
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
        <div className={styles.dsContainer}>
            <p className={styles.instruction}>
                &quot;나는 빨간 사과를 먹었다&quot; — 각 단어가 다른 단어에 얼마나 주목하는지!<br />
                셀을 호버하면 상세 정보를 볼 수 있어요.
            </p>
            <div className={styles.heatmapGrid}>
                {/* 헤더 행 */}
                <div className={styles.heatmapCorner} />
                {sentence.map((w) => (
                    <div key={`h-${w}`} className={styles.heatmapHeader}>{w}</div>
                ))}

                {/* 데이터 행 */}
                {sentence.map((rowWord, ri) => (
                    <>
                        <div key={`r-${rowWord}`} className={styles.heatmapRowLabel}>{rowWord}</div>
                        {sentence.map((_, ci) => (
                            <div
                                key={`${ri}-${ci}`}
                                className={styles.heatmapCell}
                                style={{
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
                <div className={styles.heatmapTooltip}>
                    &quot;<strong>{sentence[hoveredCell.r]}</strong>&quot;이
                    &quot;<strong>{sentence[hoveredCell.c]}</strong>&quot;에 주목하는 정도:
                    <span className={styles.tooltipHighlight}>
                        {(attentionWeights[hoveredCell.r][hoveredCell.c] * 100).toFixed(1)}%
                    </span>
                </div>
            )}
            <p className={styles.hintMt16}>
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
                    <div className={styles.welcomeBox}>
                        {/* 브리지: 8주차 → 10주차 */}
                        <div className={styles.bridgeBox}>
                            <strong className={styles.highlightYellow}>🔗 지난 시간 복습</strong><br/>
                            8주차에서 RNN이 토큰을 <strong>순차적으로</strong> 처리하며 기억을 유지하는 걸 배웠어요.
                            하지만 긴 문장에서는 기억이 사라지는 문제가 있었죠.
                            오늘 배울 <strong>어텐션(Attention)</strong>은 이 한계를 근본적으로 해결하는, Transformer의 핵심 기술입니다!
                        </div>
                        <p className={styles.text}>
                            우리가 책을 읽을 때, 모든 글자를 똑같이 읽지 않죠.<br />
                            <strong className={styles.highlightYellow}>중요한 단어</strong>에 자연스럽게 눈이 가듯이,<br /><br />
                            AI도 문장에서 <strong className={styles.highlightPurple}>관련 있는 단어</strong>에 더 집중합니다.<br />
                            이것을 <strong className={styles.colorQ}>어텐션(Attention)</strong>이라 합니다!<br /><br />
                            <span className={styles.searchHint}>
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
                    <div className={styles.labContainerCenter}>
                        <div className={`${styles.labEmoji} animate-float`}>✨</div>
                        <p className={styles.text}>
                            지금까지 배운 어텐션의 원리를<br />
                            <strong className={styles.highlightYellow}>직접 체험</strong>할 시간입니다!<br /><br />
                            3D 어텐션 시각화와 멀티플레이어 게임으로<br />
                            <strong className={styles.highlightPurple}>Q, K, V를 직접 조작</strong>해보세요.
                        </p>
                        <button
                            className={`btn-nova ${styles.labBtn}`}
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
        <div className={styles.container}>
            {/* 진행바 */}
            <div className={styles.progressBar}>
                {STEPS.map((s, i) => (
                    <div
                        key={s.id}
                        className={styles.progressDot}
                        style={{
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124,92,252,0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div className={styles.progressFill} style={{
                    width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                }} />
            </div>

            {/* 헤더 */}
            <div className={styles.header}>
                <span className={styles.weekBadge}>10주차</span>
                <div className={styles.emojiLarge}>{step.emoji}</div>
                <h1 className={styles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
                <p className={styles.subtitle}>{step.subtitle}</p>
            </div>

            {/* 콘텐츠 */}
            <div className={styles.content}>
                {renderStepContent()}
            </div>

            {/* 네비게이션 */}
            <div className={styles.navBar}>
                <button
                    className={`btn-nova ${styles.navBtn}`}
                    style={currentStep === 0 ? { opacity: 0.3 } : undefined}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>&larr; 이전</span>
                </button>
                <span className={styles.stepCount}>
                    {currentStep + 1} / {STEPS.length}
                </span>
                {currentStep < STEPS.length - 1 ? (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={nextStep}>
                        <span>다음 &rarr;</span>
                    </button>
                ) : (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}>
                        <span>🚀 실습 시작</span>
                    </button>
                )}
            </div>
        </div>
    );
}
