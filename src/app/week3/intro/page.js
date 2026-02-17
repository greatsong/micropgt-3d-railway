'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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
        <div className={styles.demoContainer}>
            {/* 브리지: 2주차 → 3주차 */}
            <div className={styles.bridgeBox}>
                <strong className={styles.bridgeBoxStrong}>🔗 지난 시간 복습</strong><br/>
                2주차에서 AI가 다음 토큰을 <strong>확률</strong>로 예측한다는 걸 배웠어요.
                그런데 확률을 계산하려면, 단어를 <strong>숫자</strong>로 표현해야 하잖아요?
                오늘은 그 첫 번째 방법을 알아봅니다!
            </div>
            <p className={styles.welcomeText}>
                GPT는 글자를 읽을 수 없어요.<br />
                GPT가 이해할 수 있는 건 오직 <strong className={styles.highlightYellow}>숫자</strong>뿐!<br /><br />
                그래서 우리는 단어를 숫자로 바꿔야 합니다.<br />
                이 과정을 <strong className={styles.highlightAmber}>인코딩(Encoding)</strong>이라 불러요.
            </p>
            <div className={styles.welcomeVisual}>
                <span className={styles.catEmoji}>🐱</span>
                <span className={styles.arrowIcon}>→</span>
                <code className={styles.questionCode}>???</code>
            </div>
            <p className={styles.welcomeHint}>
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                인코딩은 우리 주변에도 이미 있어요!
            </p>
            <div className={styles.encodingColumn}>
                {examples.map((ex, i) => (
                    <div key={i} className={`${styles.encodingRow} ${i === 3 ? styles.encodingRowHighlight : styles.encodingRowDefault}`}>
                        <span className={styles.encodingRowEmoji}>{ex.emoji}</span>
                        <span className={styles.encodingRowInput}>{ex.input}</span>
                        <span className={styles.encodingRowArrow}>→</span>
                        <code className={i === 3 ? styles.encodingRowCodeYellow : styles.encodingRowCodeGreen}>{ex.encoded}</code>
                        <span className={styles.encodingRowType}>{ex.type}</span>
                    </div>
                ))}
            </div>
            <p className={styles.encodingBottomText}>
                단어를 숫자 벡터로 바꾸는 가장 간단한 방법이<br />
                바로 <strong className={styles.highlightAmber}>원-핫 인코딩</strong>입니다!
            </p>
        </div>
    );
}

// ── 원-핫 인코딩 데모 ──
function OneHotDemo() {
    const [selected, setSelected] = useState(null);
    const words = ['고양이', '강아지', '자동차', '비행기', '피자'];

    return (
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                👇 단어를 클릭해서 원-핫 벡터를 확인해보세요!
            </p>
            <div className={styles.wordRow}>
                {words.map((w, i) => (
                    <button key={w} onClick={() => setSelected(i)}
                        className={`${styles.wordBtn} ${selected === i ? styles.wordBtnActive : ''}`}>
                        {w}
                    </button>
                ))}
            </div>
            {selected !== null && (
                <div className={styles.vectorBox}>
                    <div className={styles.vectorLabel}>
                        &quot;{words[selected]}&quot; 의 원-핫 벡터:
                    </div>
                    <div className={styles.vectorRow}>
                        [
                        {words.map((_, i) => (
                            <span key={i} className={styles.vectorDigit} style={{
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
                    <p className={styles.vectorHint}>
                        ↑ {words.length}차원 중 딱 하나만 1이에요! ("원-핫")
                    </p>
                </div>
            )}
            <div className={styles.onehotNameBox}>
                <span className={styles.onehotNameText}>
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                🔧 슬라이더로 단어장 크기를 늘려보세요!
            </p>
            <div className={styles.sliderRow}>
                <span className={styles.sliderLabel}>5개</span>
                <input type="range" className={`slider-cosmic ${styles.sliderFlex}`} min={0} max={vocabBreakpoints.length - 1} step={1}
                    value={sliderIdx} onChange={(e) => setSliderIdx(parseInt(e.target.value))} />
                <span className={styles.sliderLabel}>10만개</span>
            </div>
            <div className={styles.problemBox}>
                <div className={styles.dimensionText} style={{ color: vocabSize > 1000 ? '#f43f5e' : vocabSize > 100 ? '#fbbf24' : '#10b981' }}>
                    {vocabSize.toLocaleString()}차원
                </div>
                <p className={styles.dimensionDesc}>
                    {vocabSize > 50000
                        ? '🤯 GPT의 단어장이 이 정도예요! 벡터 하나에 100KB...'
                        : vocabSize > 5000
                            ? '😰 너무 크다... 99.9%가 0인 낭비'
                            : vocabSize > 100
                                ? '🤔 벌써 꽤 크네요?'
                                : '✅ 아직은 괜찮아요!'}
                </p>
                <div className={styles.sparseViz}>
                    {Array.from({ length: maxShow }).map((_, i) => (
                        <div key={i} className={styles.sparseCell} style={{
                            backgroundColor: i === 0 ? '#fbbf24' : 'rgba(107, 114, 128, 0.15)',
                        }} />
                    ))}
                    {vocabSize > 20 && (
                        <span className={styles.sparseOverflow}>
                            ... +{(vocabSize - 20).toLocaleString()}개 0
                        </span>
                    )}
                </div>
                <div className={styles.vocabHintBox}>
                    <span className={styles.vocabHintText}>
                        💡 실제 GPT 토크나이저의 vocab size: <strong>50,257개</strong>
                    </span>
                </div>
                {/* 한 걸음 더: 차원의 저주 */}
                <div className={styles.accordionWrapper}>
                    <button
                        onClick={() => {
                            const el = document.getElementById('curse-of-dim');
                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }}
                        className={styles.accordionButton}
                    >
                        ▶ 한 걸음 더: 차원의 저주(Curse of Dimensionality)란?
                    </button>
                    <div id="curse-of-dim" className={styles.accordionContent}>
                        <p className={styles.accordionParagraph}>
                            차원(숫자의 개수)이 늘어나면, 공간이 기하급수적으로 넓어져요.
                        </p>
                        <p className={styles.accordionParagraph}>
                            <strong className={styles.highlightYellow}>비유</strong>: 1차원(선)에서 10칸이면 10개 점으로 충분하지만,
                            2차원(평면)은 100개, 3차원(공간)은 1,000개가 필요해요.
                            50,000차원이면? 상상할 수 없을 만큼의 데이터가 필요합니다!
                        </p>
                        <p>
                            이것이 <strong className={styles.highlightPurpleLight}>차원의 저주</strong>예요.
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                👇 두 단어 쌍을 선택해 거리를 비교해보세요!
            </p>
            <div className={styles.pairButtonRow}>
                {pairs.map((p, i) => (
                    <button key={i} onClick={() => setSelectedPair(i)}
                        className={styles.pairButton}
                        style={{
                            border: selectedPair === i ? '2px solid #fbbf24' : '1px solid rgba(124,92,252,0.2)',
                            background: selectedPair === i ? 'rgba(251,191,36,0.1)' : 'rgba(15,10,40,0.4)',
                            color: selectedPair === i ? '#fbbf24' : 'var(--text-secondary)',
                        }}>
                        {p.label}
                    </button>
                ))}
            </div>
            <canvas ref={canvasRef} width={350} height={280} className={styles.distanceCanvas} />
            <div className={styles.distanceResultBox}>
                <strong className={styles.highlightRose}>모든 쌍의 거리가 √2로 동일!</strong>
                <p className={styles.distanceResultText}>
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
                    <div className={styles.labContainer}>
                        <div className={`${styles.labEmoji} animate-float`}>🧪</div>
                        <p className={styles.welcomeText}>
                            원-핫 인코딩의 문제점을 직접 체험해볼까요?<br /><br />
                            실험실에서 <strong className={styles.highlightAmber}>단어장 크기</strong>를 바꿔보고,<br />
                            <strong className={styles.highlightRose}>거리 비교</strong>도 해봐요.<br /><br />
                            <span className={styles.labHintText}>
                                다음 주차에서 이 문제를 해결하는 <strong className={styles.highlightPurple}>임베딩</strong>을 배워요!
                            </span>
                        </p>
                        <button className={`btn-nova ${styles.labButton}`} onClick={goToLab}>
                            <span>🧪 실험 시작!</span>
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.progressBar}>
                {STEPS.map((s, i) => (
                    <div key={s.id} className={styles.progressDot} style={{
                        background: i <= currentStep ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                    }} onClick={() => setCurrentStep(i)} />
                ))}
                <div className={styles.progressFill} style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>

            <div className={styles.header}>
                <span className={styles.weekBadge}>3주차</span>
                <div className={styles.headerEmoji}>{step.emoji}</div>
                <h1 className={styles.title}><span className="text-gradient">{step.title}</span></h1>
                <p className={styles.subtitle}>{step.subtitle}</p>
            </div>

            <div className={styles.content}>{renderStepContent()}</div>

            <div className={styles.navBar}>
                <button className={`btn-nova ${styles.navBtn}`} style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep} disabled={currentStep === 0}>
                    <span>← 이전</span>
                </button>
                <span className={styles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={nextStep}><span>다음 →</span></button>
                ) : (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}><span>🧪 실험 시작</span></button>
                )}
            </div>
        </div>
    );
}
