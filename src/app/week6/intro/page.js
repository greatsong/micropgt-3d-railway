'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const STEPS = [
    {
        id: 'welcome',
        title: '뇌를 흉내 내는 AI',
        emoji: '🧠',
        subtitle: '생물학적 뉴런에서 인공 뉴런으로',
    },
    {
        id: 'neuron',
        title: '인공 뉴런의 구조',
        emoji: '⚡',
        subtitle: '입력 × 가중치 + 편향 → 활성화!',
    },
    {
        id: 'activation',
        title: '활성화 함수 체험',
        emoji: '📈',
        subtitle: '직접 입력값을 바꿔가며 출력 곡선을 확인!',
    },
    {
        id: 'why',
        title: '왜 비선형이 필요할까?',
        emoji: '🤔',
        subtitle: '선형만으로는 해결할 수 없는 문제',
    },
    {
        id: 'connect',
        title: '뉴런을 연결하면?',
        emoji: '🕸️',
        subtitle: '신경망(Neural Network)의 탄생!',
    },
    {
        id: 'lab',
        title: '뉴런 실험실로!',
        emoji: '🧪',
        subtitle: '직접 뉴런을 조작해보자!',
    },
];

// ── Welcome: 생물학적 vs 인공 뉴런 ──
function WelcomeDemo() {
    return (
        <div className={styles.dsContainer}>
            {/* 브리지: 5주차 → 6주차 */}
            <div className={styles.bridgeBox}>
                <strong className={styles.bridgeStrong}>🔗 지난 시간 복습</strong><br/>
                5주차에서 <strong>경사하강법</strong>으로 최적의 값을 찾는 방법을 배웠어요.
                그런데 &quot;무엇의&quot; 최적값을 찾는 걸까요? 바로 오늘 배울 <strong>뉴런의 가중치(w)</strong>입니다!
            </div>
            <p className={styles.dsText}>
                우리 뇌에는 약 <strong className={styles.colorRed}>860억 개</strong>의 뉴런이 있어요.<br />
                과학자들은 이 뉴런의 작동 원리를 모방하여<br />
                <strong className={styles.colorBlue}>인공 뉴런</strong>을 만들었습니다!
            </p>
            <div className={styles.compareFlex}>
                <div className={styles.compareCard}>
                    <div className={styles.compareEmoji}>🧬</div>
                    <strong className={styles.colorRed}>생물학적 뉴런</strong>
                    <div className={styles.compareDesc}>
                        수상돌기 → 세포체 → 축색돌기<br />
                        시냅스로 신호 전달
                    </div>
                </div>
                <div className={styles.arrowLabel}>→ 모방 →</div>
                <div className={styles.compareCard}>
                    <div className={styles.compareEmoji}>⚡</div>
                    <strong className={styles.colorBlue}>인공 뉴런</strong>
                    <div className={styles.compareDesc}>
                        입력(x) → 가중치 합 → 활성화<br />
                        가중치(w)로 중요도 조절
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 인공 뉴런 구조 시각화 ──
function NeuronDemo() {
    const [x1, setX1] = useState(1.0);
    const [x2, setX2] = useState(0.5);
    const w1 = 0.7, w2 = -0.3, b = 0.1;
    const z = x1 * w1 + x2 * w2 + b;
    const sigmoid = (v) => 1 / (1 + Math.exp(-v));
    const output = sigmoid(z);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                슬라이더로 입력값(x)을 바꿔보세요. 출력이 어떻게 변하나요?
            </p>
            <div className={styles.sliderRow}>
                <div className={styles.sliderItem}>
                    <label className={styles.sliderLabel}>x₁ = {x1.toFixed(1)}</label>
                    <input type="range" className={`slider-cosmic ${styles.sliderFull}`} min={-3} max={3} step={0.1}
                        value={x1} onChange={(e) => setX1(parseFloat(e.target.value))} />
                </div>
                <div className={styles.sliderItem}>
                    <label className={styles.sliderLabel}>x₂ = {x2.toFixed(1)}</label>
                    <input type="range" className={`slider-cosmic ${styles.sliderFull}`} min={-3} max={3} step={0.1}
                        value={x2} onChange={(e) => setX2(parseFloat(e.target.value))} />
                </div>
            </div>

            {/* 계산 과정 시각화 */}
            <div className={styles.formulaFlow}>
                <div className={styles.flowItem}>
                    <span className={styles.dimLabel}>가중치 합</span>
                    <code className={styles.weightSumCode}>
                        {x1.toFixed(1)}×{w1} + {x2.toFixed(1)}×{w2} + {b}
                    </code>
                    <span className={styles.weightSumResult}>= {z.toFixed(2)}</span>
                </div>
                <span className={styles.sigmoidArrow}>→</span>
                <div className={styles.flowItem}>
                    <span className={styles.dimLabel}>Sigmoid</span>
                    <span style={{ fontWeight: 800, color: output > 0.7 ? '#10b981' : output < 0.3 ? '#f43f5e' : '#fbbf24', fontSize: '1.3rem' }}>
                        {output.toFixed(3)}
                    </span>
                    <span className={styles.dimLabel}>
                        {output > 0.7 ? '활성화!' : output < 0.3 ? '비활성' : '중간'}
                    </span>
                </div>
            </div>
            <p className={styles.dsHint}>
                💡 <strong>가중치(w)</strong>는 입력의 중요도, <strong>편향(b)</strong>은 활성화 기준선입니다
            </p>
        </div>
    );
}

// ── 활성화 함수 그래프 ──
function ActivationDemo() {
    const canvasRef = useRef(null);
    const [funcType, setFuncType] = useState('sigmoid');
    const [inputVal, setInputVal] = useState(0);

    const funcs = {
        sigmoid: { fn: (x) => 1 / (1 + Math.exp(-x)), color: '#10b981', label: 'Sigmoid', range: '0~1' },
        relu: { fn: (x) => Math.max(0, x), color: '#3b82f6', label: 'ReLU', range: '0~∞' },
        tanh: { fn: (x) => Math.tanh(x), color: '#f59e0b', label: 'Tanh', range: '-1~1' },
        step: { fn: (x) => x >= 0 ? 1 : 0, color: '#f43f5e', label: 'Step', range: '0 or 1' },
    };

    const drawGraph = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;

        ctx.clearRect(0, 0, W, H);

        // 그리드
        ctx.strokeStyle = 'rgba(124,92,252,0.06)';
        ctx.lineWidth = 1;
        for (let i = -5; i <= 5; i++) {
            const x = cx + i * (W / 10);
            const y = cy + i * (H / 10);
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // 축
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

        // 축 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('입력(x)', W - 25, cy - 6);
        ctx.fillText('출력(y)', cx + 20, 14);

        // 함수 곡선
        const f = funcs[funcType];
        ctx.beginPath();
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 3;
        for (let px = 0; px < W; px++) {
            const x = (px - cx) / (W / 10); // -5 ~ 5
            const y = f.fn(x);
            const py = cy - y * (H / 4);
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 현재 입력값 점
        const dotX = cx + inputVal * (W / 10);
        const dotY = cy - f.fn(inputVal) * (H / 4);
        // 수직선
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(251,191,36,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(dotX, cy); ctx.lineTo(dotX, dotY); ctx.stroke();
        ctx.setLineDash([]);

        // 글로우
        ctx.beginPath();
        ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
        ctx.fillStyle = `${f.color}30`;
        ctx.fill();
        // 점
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 값 표시
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`f(${inputVal.toFixed(1)}) = ${f.fn(inputVal).toFixed(3)}`, dotX, dotY - 16);
    }, [funcType, inputVal]);

    useEffect(() => { drawGraph(); }, [drawGraph]);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                활성화 함수를 선택하고, 입력값을 바꿔보세요!
            </p>
            <div className={styles.funcBtnRow}>
                {Object.entries(funcs).map(([key, f]) => (
                    <button key={key} onClick={() => setFuncType(key)}
                        className={styles.funcBtn}
                        style={{
                            border: funcType === key ? `2px solid ${f.color}` : '1px solid rgba(124,92,252,0.15)',
                            background: funcType === key ? `${f.color}15` : 'rgba(15,10,40,0.4)',
                            color: funcType === key ? f.color : 'var(--text-secondary)',
                        }}>
                        {f.label}
                        <span className={styles.funcRangeLabel}>({f.range})</span>
                    </button>
                ))}
            </div>
            <canvas ref={canvasRef} width={400} height={300}
                className={styles.canvasGraph}
            />
            <div className={styles.rangeRow}>
                <span className={styles.rangeLabel}>-5</span>
                <input type="range" className={`slider-cosmic ${styles.sliderFlex}`} min={-5} max={5} step={0.1}
                    value={inputVal} onChange={(e) => setInputVal(parseFloat(e.target.value))} />
                <span className={styles.rangeLabel}>5</span>
            </div>
            <div className={styles.outputDisplay} style={{ color: funcs[funcType].color }}>
                입력: {inputVal.toFixed(1)} → 출력: {funcs[funcType].fn(inputVal).toFixed(3)}
            </div>
        </div>
    );
}

// ── 왜 비선형이 필요한가? ──
function WhyNonlinearDemo() {
    const canvasRef = useRef(null);
    const [showNonlinear, setShowNonlinear] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // XOR 데이터 점들
        const points = [
            { x: 0.25, y: 0.25, cls: 0 },
            { x: 0.75, y: 0.25, cls: 1 },
            { x: 0.25, y: 0.75, cls: 1 },
            { x: 0.75, y: 0.75, cls: 0 },
        ];

        // 배경: 결정 경계
        if (showNonlinear) {
            for (let px = 0; px < W; px += 4) {
                for (let py = 0; py < H; py += 4) {
                    const nx = px / W;
                    const ny = py / H;
                    const xor = (nx > 0.5 ? 1 : 0) !== (ny > 0.5 ? 1 : 0);
                    ctx.fillStyle = xor ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)';
                    ctx.fillRect(px, py, 4, 4);
                }
            }
        }

        // 선형 경계 시도
        if (!showNonlinear) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(244,63,94,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.moveTo(0, H);
            ctx.lineTo(W, 0);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(244,63,94,0.3)';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('직선 하나로는 분류 불가!', W / 2, H / 2);
        }

        // 데이터 점
        points.forEach((p) => {
            const px = p.x * W, py = p.y * H;
            ctx.beginPath();
            ctx.arc(px, py, 14, 0, Math.PI * 2);
            ctx.fillStyle = p.cls === 1 ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = p.cls === 1 ? '#10b981' : '#f43f5e';
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.cls.toString(), px, py + 5);
        });

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('XOR 문제', 8, 16);
    }, [showNonlinear]);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                <strong className={styles.colorRed}>XOR 문제</strong>: (0,0)→0, (0,1)→1, (1,0)→1, (1,1)→0<br />
                직선 하나로 빨강과 초록을 나눌 수 있을까요?
            </p>
            <canvas ref={canvasRef} width={300} height={300}
                className={styles.canvasSmall}
            />
            <div className={styles.xorBtnRow}>
                <button className={`btn-nova ${styles.xorBtn}`}
                    onClick={() => setShowNonlinear(false)}>
                    <span>선형(직선)</span>
                </button>
                <button className={`btn-nova ${styles.xorBtn}`}
                    onClick={() => setShowNonlinear(true)}>
                    <span>비선형(곡선) ✓</span>
                </button>
            </div>
            <p className={styles.dsHintMt}>
                {showNonlinear
                    ? '✅ 비선형 활성화 함수를 쓰면 곡선 경계가 가능해져요!'
                    : '❌ 직선(선형)으로는 XOR을 절대 나눌 수 없어요!'}
            </p>
        </div>
    );
}

// ── 뉴런 연결 (레이어 시각화) ──
function ConnectDemo() {
    const canvasRef = useRef(null);
    const [layers, setLayers] = useState(2);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        const layerSizes = [2];
        for (let i = 0; i < layers; i++) layerSizes.push(3);
        layerSizes.push(1);

        const nLayers = layerSizes.length;
        const xGap = W / (nLayers + 1);

        const nodePositions = layerSizes.map((size, li) => {
            const x = xGap * (li + 1);
            return Array.from({ length: size }).map((_, ni) => ({
                x,
                y: (H / (size + 1)) * (ni + 1),
            }));
        });

        // 연결선
        for (let li = 0; li < nLayers - 1; li++) {
            nodePositions[li].forEach((from) => {
                nodePositions[li + 1].forEach((to) => {
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(124,92,252,0.15)';
                    ctx.lineWidth = 1;
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);
                    ctx.stroke();
                });
            });
        }

        // 노드
        const layerColors = ['#3b82f6', ...Array(layers).fill('#7c5cfc'), '#10b981'];
        nodePositions.forEach((layer, li) => {
            layer.forEach((n) => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = `${layerColors[li]}20`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(n.x, n.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15,10,40,0.8)';
                ctx.fill();
                ctx.strokeStyle = layerColors[li];
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        });

        // 레이어 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('입력', xGap, H - 10);
        for (let i = 0; i < layers; i++) {
            ctx.fillText(`은닉${i + 1}`, xGap * (i + 2), H - 10);
        }
        ctx.fillText('출력', xGap * (nLayers), H - 10);

        // 파라미터 수 계산
        let params = 0;
        for (let i = 0; i < nLayers - 1; i++) {
            params += layerSizes[i] * layerSizes[i + 1] + layerSizes[i + 1];
        }
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`총 파라미터: ${params}개`, W / 2, 18);
    }, [layers]);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                은닉층 수를 바꿔보세요. 층이 깊어질수록 더 복잡한 패턴을 학습할 수 있어요!
            </p>
            <div className={styles.layerSliderRow}>
                <span className={styles.layerRangeLabel}>은닉층 1개</span>
                <input type="range" className={`slider-cosmic ${styles.layerSlider}`} min={1} max={5} step={1}
                    value={layers} onChange={(e) => setLayers(parseInt(e.target.value))} />
                <span className={styles.layerRangeLabel}>5개</span>
            </div>
            <div className={styles.layerInfo}>
                은닉층 {layers}개 = {layers + 2}층 신경망
            </div>
            <canvas ref={canvasRef} width={500} height={250}
                className={styles.canvasWide}
            />
            <p className={styles.dsHintMt}>
                💡 GPT-3는 이런 층을 <strong>96개</strong>나 쌓았어요! (파라미터 1,750억 개)
            </p>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week6IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };
    const goToLab = () => router.push('/week6');

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome': return <WelcomeDemo />;
            case 'neuron': return <NeuronDemo />;
            case 'activation': return <ActivationDemo />;
            case 'why': return <WhyNonlinearDemo />;
            case 'connect': return <ConnectDemo />;
            case 'lab':
                return (
                    <div className={styles.dsContainerCenter}>
                        <div className={`${styles.emojiHuge} animate-float`}>🧪</div>
                        <p className={styles.dsText}>
                            이제 <strong>실험실</strong>에서<br />
                            활성화 함수별 <strong className={styles.colorBlue}>출력 곡선</strong>을 비교하고<br />
                            <strong className={styles.colorGold}>뉴런을 직접 조작</strong>해보세요!
                        </p>
                        <button className={`btn-nova ${styles.labBtn}`} onClick={goToLab}>
                            <span>🧪 뉴런 실험실 입장!</span>
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
                        background: i <= currentStep ? '#60a5fa' : 'rgba(96, 165, 250, 0.15)',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                    }} onClick={() => setCurrentStep(i)} />
                ))}
                <div className={styles.progressFill} style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>

            <div className={styles.header}>
                <span className={styles.weekBadge}>6주차</span>
                <div className={styles.emojiLarge}>{step.emoji}</div>
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
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}><span>🧪 실습 시작</span></button>
                )}
            </div>
        </div>
    );
}
