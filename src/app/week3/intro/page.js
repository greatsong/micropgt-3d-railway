'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── 스텝 데이터 ──
const STEPS = [
    {
        id: 'welcome',
        title: '단어는 어떻게 숫자가 될까?',
        emoji: '🤔',
        subtitle: 'AI에게 "고양이"를 알려주려면?',
    },
    {
        id: 'encoding',
        title: '인코딩이란?',
        emoji: '🔢',
        subtitle: '정보를 숫자로 바꾸는 방법',
    },
    {
        id: 'onehot',
        title: '원-핫 인코딩',
        emoji: '1️⃣',
        subtitle: '각 단어에 번호표를 달자!',
    },
    {
        id: 'problem',
        title: '원-핫의 문제점',
        emoji: '😱',
        subtitle: '단어 10만 개면... 10만 차원?!',
    },
    {
        id: 'distance',
        title: '거리가 전부 같다?!',
        emoji: '📏',
        subtitle: '원-핫 벡터의 치명적 한계',
    },
    {
        id: 'lab',
        title: '직접 체험해봐요!',
        emoji: '🧪',
        subtitle: '원-핫 인코딩 실험실로 출발',
    },
];

// ── Welcome ──
function WelcomeDemo() {
    return (
        <div style={demoStyles.container}>
            {/* 브리지: 2주차 → 3주차 */}
            <div style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: 'rgba(251, 191, 36, 0.08)',
                border: '1px solid rgba(251, 191, 36, 0.15)',
                marginBottom: 16,
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
            }}>
                <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                2주차에서 AI가 다음 토큰을 <strong>확률</strong>로 예측한다는 걸 배웠어요.
                그런데 확률을 계산하려면, 단어를 <strong>숫자</strong>로 표현해야 하잖아요?
                오늘은 그 첫 번째 방법을 알아봅니다!
            </div>
            <p style={demoStyles.welcomeText}>
                GPT는 글자를 읽을 수 없어요.<br />
                GPT가 이해할 수 있는 건 오직 <strong style={{ color: '#fbbf24' }}>숫자</strong>뿐!<br /><br />
                그래서 우리는 단어를 숫자로 바꿔야 합니다.<br />
                이 과정을 <strong style={{ color: '#f59e0b' }}>인코딩(Encoding)</strong>이라 불러요.
            </p>
            <div style={demoStyles.welcomeVisual}>
                <span style={{ fontSize: '2.5rem' }}>🐱</span>
                <span style={{ fontSize: '2rem', color: 'var(--text-dim)' }}>→</span>
                <code style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 700 }}>???</code>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 12 }}>
                어떤 숫자로 바꿔야 할까? 가장 간단한 방법부터 알아봐요!
            </p>
        </div>
    );
}

// ── 인코딩 개념 ──
function EncodingDemo() {
    const examples = [
        { input: '빨간색', encoded: '#FF0000', type: 'HEX 코드', emoji: '🎨' },
        { input: '서울역', encoded: '37.55°N, 126.97°E', type: 'GPS 좌표', emoji: '📍' },
        { input: 'A', encoded: '65', type: 'ASCII 코드', emoji: '💻' },
        { input: '고양이', encoded: '[0, 1, 0, 0, 0]', type: '???', emoji: '🐱' },
    ];

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                인코딩은 우리 주변에도 이미 있어요!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {examples.map((ex, i) => (
                    <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        borderRadius: 10, background: i === 3 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(15, 10, 40, 0.4)',
                        border: i === 3 ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(124, 92, 252, 0.08)',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{ex.emoji}</span>
                        <span style={{ fontWeight: 600, minWidth: 60 }}>{ex.input}</span>
                        <span style={{ color: 'var(--text-dim)' }}>→</span>
                        <code style={{ color: i === 3 ? '#fbbf24' : '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>{ex.encoded}</code>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>{ex.type}</span>
                    </div>
                ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 14 }}>
                단어를 숫자 벡터로 바꾸는 가장 간단한 방법이<br />
                바로 <strong style={{ color: '#f59e0b' }}>원-핫 인코딩</strong>입니다!
            </p>
        </div>
    );
}

// ── 원-핫 인코딩 데모 ──
function OneHotDemo() {
    const [selected, setSelected] = useState(null);
    const words = ['고양이', '강아지', '자동차', '비행기', '피자'];

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                👇 단어를 클릭해서 원-핫 벡터를 확인해보세요!
            </p>
            <div style={demoStyles.wordRow}>
                {words.map((w, i) => (
                    <button key={w} onClick={() => setSelected(i)}
                        style={{ ...demoStyles.wordBtn, ...(selected === i ? demoStyles.wordBtnActive : {}) }}>
                        {w}
                    </button>
                ))}
            </div>
            {selected !== null && (
                <div style={demoStyles.vectorBox}>
                    <div style={demoStyles.vectorLabel}>
                        &quot;{words[selected]}&quot; 의 원-핫 벡터:
                    </div>
                    <div style={demoStyles.vectorRow}>
                        [
                        {words.map((_, i) => (
                            <span key={i} style={{
                                ...demoStyles.vectorDigit,
                                color: i === selected ? '#fbbf24' : '#6b7280',
                                fontWeight: i === selected ? 800 : 400,
                                transform: i === selected ? 'scale(1.4)' : 'scale(1)',
                            }}>
                                {i === selected ? '1' : '0'}
                                {i < words.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                        ]
                    </div>
                    <p style={demoStyles.vectorHint}>
                        ↑ {words.length}차원 중 딱 하나만 1이에요! ("원-핫")
                    </p>
                </div>
            )}
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(124, 92, 252, 0.06)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>원-핫(One-Hot)</strong> = 벡터에서 딱 하나만 뜨겁다(Hot)! 🔥
                </span>
            </div>
        </div>
    );
}

// ── 원-핫 문제점: 차원 폭발 ──
function ProblemDemo() {
    const vocabBreakpoints = [5, 10, 20, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
    const [sliderIdx, setSliderIdx] = useState(0);
    const vocabSize = vocabBreakpoints[sliderIdx];
    const maxShow = Math.min(vocabSize, 20);

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                🔧 슬라이더로 단어장 크기를 늘려보세요!
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>5개</span>
                <input type="range" className="slider-cosmic" min={0} max={vocabBreakpoints.length - 1} step={1}
                    value={sliderIdx} onChange={(e) => setSliderIdx(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>10만개</span>
            </div>
            <div style={demoStyles.problemBox}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: vocabSize > 1000 ? '#f43f5e' : vocabSize > 100 ? '#fbbf24' : '#10b981' }}>
                    {vocabSize.toLocaleString()}차원
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                    {vocabSize > 50000
                        ? '🤯 GPT의 단어장이 이 정도예요! 벡터 하나에 100KB...'
                        : vocabSize > 5000
                            ? '😰 너무 크다... 99.9%가 0인 낭비'
                            : vocabSize > 100
                                ? '🤔 벌써 꽤 크네요?'
                                : '✅ 아직은 괜찮아요!'}
                </p>
                <div style={demoStyles.sparseViz}>
                    {Array.from({ length: maxShow }).map((_, i) => (
                        <div key={i} style={{
                            ...demoStyles.sparseCell,
                            backgroundColor: i === 0 ? '#fbbf24' : 'rgba(107, 114, 128, 0.15)',
                        }} />
                    ))}
                    {vocabSize > 20 && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            ... +{(vocabSize - 20).toLocaleString()}개 0
                        </span>
                    )}
                </div>
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.15)' }}>
                    <span style={{ fontSize: '0.78rem', color: '#f43f5e', fontWeight: 600 }}>
                        💡 실제 GPT 토크나이저의 vocab size: <strong>50,257개</strong>
                    </span>
                </div>
                {/* 한 걸음 더: 차원의 저주 */}
                <div style={{
                    marginTop: 14,
                    borderRadius: 10,
                    border: '1px solid rgba(124, 92, 252, 0.2)',
                    overflow: 'hidden',
                    textAlign: 'left',
                }}>
                    <button
                        onClick={() => {
                            const el = document.getElementById('curse-of-dim');
                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(124, 92, 252, 0.08)',
                            border: 'none',
                            color: '#a78bfa',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        ▶ 한 걸음 더: 차원의 저주(Curse of Dimensionality)란?
                    </button>
                    <div id="curse-of-dim" style={{
                        display: 'none',
                        padding: 14,
                        background: 'rgba(124, 92, 252, 0.04)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7,
                    }}>
                        <p style={{ marginBottom: 6 }}>
                            차원(숫자의 개수)이 늘어나면, 공간이 기하급수적으로 넓어져요.
                        </p>
                        <p style={{ marginBottom: 6 }}>
                            <strong style={{ color: '#fbbf24' }}>비유</strong>: 1차원(선)에서 10칸이면 10개 점으로 충분하지만,
                            2차원(평면)은 100개, 3차원(공간)은 1,000개가 필요해요.
                            50,000차원이면? 상상할 수 없을 만큼의 데이터가 필요합니다!
                        </p>
                        <p>
                            이것이 <strong style={{ color: '#a78bfa' }}>차원의 저주</strong>예요.
                            원-핫 벡터처럼 불필요하게 차원이 높으면, AI가 패턴을 학습하기 매우 어려워집니다.
                            그래서 <strong>임베딩</strong>(다음 실험실)으로 차원을 확 줄이는 거예요!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 원-핫 문제점: 거리 동일 ──
function DistanceDemo() {
    const canvasRef = useRef(null);
    const [selectedPair, setSelectedPair] = useState(null);

    const words = ['고양이', '강아지', '자동차'];
    const pairs = [
        { a: 0, b: 1, label: '고양이 ↔ 강아지' },
        { a: 0, b: 2, label: '고양이 ↔ 자동차' },
        { a: 1, b: 2, label: '강아지 ↔ 자동차' },
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // 3D-ish axes
        const cx = w / 2, cy = h * 0.55;
        const pts = [
            { x: cx + 100, y: cy - 80, label: '고양이 [1,0,0]', color: '#f43f5e' },
            { x: cx - 80, y: cy - 60, label: '강아지 [0,1,0]', color: '#f97316' },
            { x: cx, y: cy + 80, label: '자동차 [0,0,1]', color: '#3b82f6' },
        ];

        // Draw lines between all pairs
        pts.forEach((p1, i) => {
            pts.forEach((p2, j) => {
                if (i >= j) return;
                const isSelected = selectedPair !== null && (
                    (pairs[selectedPair].a === i && pairs[selectedPair].b === j) ||
                    (pairs[selectedPair].a === j && pairs[selectedPair].b === i)
                );
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = isSelected ? '#fbbf24' : 'rgba(255,255,255,0.15)';
                ctx.lineWidth = isSelected ? 3 : 1;
                ctx.setLineDash(isSelected ? [] : [4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // distance label
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                ctx.fillStyle = isSelected ? '#fbbf24' : 'rgba(255,255,255,0.3)';
                ctx.font = `${isSelected ? 'bold ' : ''}12px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText('√2 ≈ 1.414', mx, my - 8);
            });
        });

        // Draw points
        pts.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y - 16);
        });
    }, [selectedPair]);

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                👇 두 단어 쌍을 선택해 거리를 비교해보세요!
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                {pairs.map((p, i) => (
                    <button key={i} onClick={() => setSelectedPair(i)}
                        style={{
                            padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                            border: selectedPair === i ? '2px solid #fbbf24' : '1px solid rgba(124,92,252,0.2)',
                            background: selectedPair === i ? 'rgba(251,191,36,0.1)' : 'rgba(15,10,40,0.4)',
                            color: selectedPair === i ? '#fbbf24' : 'var(--text-secondary)',
                            fontSize: '0.82rem', fontWeight: 600,
                        }}>
                        {p.label}
                    </button>
                ))}
            </div>
            <canvas ref={canvasRef} width={350} height={280}
                style={{ width: '100%', maxWidth: 350, height: 'auto', borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', margin: '0 auto', display: 'block' }} />
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.15)', textAlign: 'center' }}>
                <strong style={{ color: '#f43f5e' }}>모든 쌍의 거리가 √2로 동일!</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
                    "고양이"와 "강아지"가 비슷하다는 정보를 담을 수 없어요 😵
                </p>
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week3IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };
    const goToLab = () => router.push('/week3');

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome': return <WelcomeDemo />;
            case 'encoding': return <EncodingDemo />;
            case 'onehot': return <OneHotDemo />;
            case 'problem': return <ProblemDemo />;
            case 'distance': return <DistanceDemo />;
            case 'lab':
                return (
                    <div style={{ ...demoStyles.container, textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: 16 }} className="animate-float">🧪</div>
                        <p style={demoStyles.welcomeText}>
                            원-핫 인코딩의 문제점을 직접 체험해볼까요?<br /><br />
                            실험실에서 <strong style={{ color: '#f59e0b' }}>단어장 크기</strong>를 바꿔보고,<br />
                            <strong style={{ color: '#f43f5e' }}>거리 비교</strong>도 해봐요.<br /><br />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                다음 주차에서 이 문제를 해결하는 <strong style={{ color: '#7c5cfc' }}>임베딩</strong>을 배워요!
                            </span>
                        </p>
                        <button className="btn-nova" style={{ marginTop: 24, padding: '14px 40px', fontSize: '1.1rem' }} onClick={goToLab}>
                            <span>🧪 실험 시작!</span>
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.progressBar}>
                {STEPS.map((s, i) => (
                    <div key={s.id} style={{
                        ...pageStyles.progressDot,
                        background: i <= currentStep ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                    }} onClick={() => setCurrentStep(i)} />
                ))}
                <div style={{ ...pageStyles.progressFill, width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>

            <div style={pageStyles.header}>
                <span style={pageStyles.weekBadge}>3주차</span>
                <div style={{ fontSize: '3rem' }}>{step.emoji}</div>
                <h1 style={pageStyles.title}><span className="text-gradient">{step.title}</span></h1>
                <p style={pageStyles.subtitle}>{step.subtitle}</p>
            </div>

            <div style={pageStyles.content}>{renderStepContent()}</div>

            <div style={pageStyles.navBar}>
                <button className="btn-nova" style={{ ...pageStyles.navBtn, opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep} disabled={currentStep === 0}>
                    <span>← 이전</span>
                </button>
                <span style={pageStyles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={nextStep}><span>다음 →</span></button>
                ) : (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={goToLab}><span>🧪 실험 시작</span></button>
                )}
            </div>
        </div>
    );
}

const pageStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', maxWidth: 680, margin: '0 auto' },
    progressBar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, position: 'relative', width: '100%', maxWidth: 300, justifyContent: 'center' },
    progressDot: { width: 12, height: 12, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s', zIndex: 1 },
    progressFill: { position: 'absolute', left: 6, top: '50%', height: 3, background: '#f59e0b', borderRadius: 2, transform: 'translateY(-50%)', transition: 'width 0.3s', zIndex: 0 },
    header: { textAlign: 'center', marginBottom: 24 },
    weekBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', marginBottom: 12, letterSpacing: '0.05em' },
    title: { fontSize: '1.6rem', fontWeight: 800, marginTop: 8, marginBottom: 6 },
    subtitle: { fontSize: '0.95rem', color: 'var(--text-secondary)' },
    content: { flex: 1, width: '100%', marginBottom: 24 },
    navBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' },
    navBtn: { padding: '10px 24px', fontSize: '0.9rem' },
    stepCount: { fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 },
};

const demoStyles = {
    container: { padding: 20 },
    instruction: { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' },
    welcomeText: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 },
    welcomeVisual: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        marginTop: 24, padding: 20, borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)',
    },
    wordRow: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
    wordBtn: {
        padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(245, 158, 11, 0.2)',
        background: 'rgba(245, 158, 11, 0.06)', color: 'var(--text-primary)',
        fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    },
    wordBtnActive: { background: '#f59e0b', color: '#000', border: '1px solid #f59e0b', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)' },
    vectorBox: { padding: 20, borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', border: '1px solid rgba(245, 158, 11, 0.15)', textAlign: 'center' },
    vectorLabel: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 },
    vectorRow: { fontFamily: 'monospace', fontSize: '1.4rem', display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center', color: 'var(--text-dim)' },
    vectorDigit: { transition: 'all 0.3s', display: 'inline-block' },
    vectorHint: { fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 8 },
    problemBox: { padding: 24, borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', border: '1px solid rgba(245, 158, 11, 0.15)', textAlign: 'center' },
    sparseViz: { display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap', marginTop: 12, alignItems: 'center' },
    sparseCell: { width: 14, height: 14, borderRadius: 3 },
};
