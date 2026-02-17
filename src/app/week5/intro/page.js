'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const STEPS = [
    {
        id: 'welcome',
        title: 'AI는 어떻게 학습할까?',
        emoji: '🧠',
        subtitle: '산에서 눈을 감고 가장 낮은 곳을 찾는 비유',
    },
    {
        id: 'slope',
        title: '기울기 = 방향',
        emoji: '📐',
        subtitle: '경사가 급한 방향으로 한 걸음씩!',
    },
    {
        id: 'lr',
        title: '학습률 = 보폭',
        emoji: '👟',
        subtitle: '보폭이 크면 빠르지만 넘어질 수 있어요',
    },
    {
        id: 'momentum',
        title: '모멘텀 = 관성',
        emoji: '🎳',
        subtitle: '볼링공처럼 관성으로 구덩이를 탈출!',
    },
    {
        id: 'local',
        title: '지역 최솟값의 함정',
        emoji: '🕳️',
        subtitle: '진짜 최저점이 아닌 곳에 빠질 수 있다!',
    },
    {
        id: 'race',
        title: '경사하강법 레이싱!',
        emoji: '🏎️',
        subtitle: '직접 학습률과 모멘텀을 설정하고 레이싱하자!',
    },
];

// ── 1D 경사하강법 시각화 ──
function GradientDescentDemo({ learningRate, showMomentum }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const [isRunning, setIsRunning] = useState(false);
    const stateRef = useRef({ x: 1.5, v: 0, trail: [], step: 0 });

    const lossFunc = (x) => {
        // 더 가파른 곡면: 높은 LR에서 명확한 발산 효과
        return 0.8 * Math.sin(x * 1.2) + 0.5 * Math.cos(x * 2.0) + 0.08 * (x - 3) * (x - 3) + 2;
    };

    const gradient = (x) => {
        const h = 0.001;
        return (lossFunc(x + h) - lossFunc(x - h)) / (2 * h);
    };

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // 함수 그래프
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(124, 92, 252, 0.6)';
        ctx.lineWidth = 2;
        for (let px = 0; px < W; px++) {
            const x = (px / W) * 8;
            const y = lossFunc(x);
            const sy = H - ((y - 0.5) / 4) * H;
            if (px === 0) ctx.moveTo(px, sy);
            else ctx.lineTo(px, sy);
        }
        ctx.stroke();

        // 함수 채우기
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = 'rgba(124, 92, 252, 0.06)';
        ctx.fill();

        // 궤적
        const trail = stateRef.current.trail;
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.lineWidth = 1.5;
            trail.forEach((p, i) => {
                const px = (p.x / 8) * W;
                const py = H - ((p.y - 0.5) / 4) * H;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.stroke();
        }

        // 현재 위치 (공)
        const { x } = stateRef.current;
        const y = lossFunc(x);
        const bx = (x / 8) * W;
        const by = H - ((y - 0.5) / 4) * H;

        // 글로우
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
        ctx.fill();

        // 공
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 기울기 화살표
        const grad = gradient(x);
        const arrowLen = Math.min(Math.abs(grad) * 40, 80);
        const arrowDir = grad > 0 ? -1 : 1;
        ctx.beginPath();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.moveTo(bx, by - 15);
        ctx.lineTo(bx + arrowDir * arrowLen, by - 15);
        ctx.stroke();
        // 화살표 머리
        ctx.beginPath();
        ctx.fillStyle = '#f43f5e';
        ctx.moveTo(bx + arrowDir * arrowLen, by - 10);
        ctx.lineTo(bx + arrowDir * arrowLen, by - 20);
        ctx.lineTo(bx + arrowDir * (arrowLen + 8), by - 15);
        ctx.fill();

        // Loss 텍스트
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Loss: ${y.toFixed(3)}`, bx, by - 25);
        ctx.fillText(`Step: ${stateRef.current.step}`, bx, by + 28);

        // 발산 경고
        if (y > 4.0) {
            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('💥 발산!', W / 2, 30);
        }
    }, []);

    const tick = useCallback(() => {
        const s = stateRef.current;
        const grad = gradient(s.x);

        if (showMomentum) {
            s.v = 0.9 * s.v - learningRate * grad;
            s.x += s.v;
        } else {
            s.x -= learningRate * grad;
        }

        s.trail.push({ x: s.x, y: lossFunc(s.x) });
        if (s.trail.length > 200) s.trail.shift();
        s.step++;

        draw();

        if (s.x < -2 || s.x > 10 || s.step > 300 || Math.abs(lossFunc(s.x)) > 50) {
            setIsRunning(false);
            return;
        }

        animRef.current = setTimeout(tick, 60);
    }, [learningRate, showMomentum, draw]);

    const start = () => {
        stateRef.current = { x: 1.5, v: 0, trail: [{ x: 1.5, y: lossFunc(1.5) }], step: 0 };
        setIsRunning(true);
    };

    const reset = () => {
        if (animRef.current) clearTimeout(animRef.current);
        stateRef.current = { x: 1.5, v: 0, trail: [], step: 0 };
        setIsRunning(false);
        draw();
    };

    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        if (isRunning) {
            animRef.current = setTimeout(tick, 60);
        }
        return () => {
            if (animRef.current) clearTimeout(animRef.current);
        };
    }, [isRunning, tick]);

    return (
        <div className={styles.demoWrapper}>
            <canvas
                ref={canvasRef}
                width={500}
                height={250}
                className={styles.demoCanvas}
            />
            <div className={styles.demoButtons}>
                <button
                    className={`btn-nova ${styles.demoBtn}`}
                    onClick={start}
                    disabled={isRunning}
                >
                    <span>▶️ 시작</span>
                </button>
                <button
                    className={`btn-nova ${styles.demoBtn}`}
                    onClick={reset}
                >
                    <span>🔄 리셋</span>
                </button>
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week5IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [lr, setLr] = useState(0.1);
    const step = STEPS[currentStep];

    const nextStep = () => {
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    };
    const prevStep = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };
    const goToLab = () => router.push('/week5');

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome':
                return (
                    <div className={styles.welcomeBox}>
                        {/* 브리지: 3주차 → 5주차 */}
                        <div className={styles.bridgeBox}>
                            <strong className={styles.bridgeStrong}>🔗 지난 시간 복습</strong><br/>
                            3주차에서 단어를 <strong>숫자 벡터(임베딩)</strong>로 변환하는 법을 배웠어요.
                            그런데 이 벡터의 값은 처음에 <strong>랜덤</strong>입니다.
                            AI는 어떻게 좋은 값을 찾아갈까요? 오늘 배울 <strong>경사하강법</strong>이 그 비밀이에요!
                        </div>
                        <p className={styles.text}>
                            GPT는 처음에 <strong className={styles.colorRed}>엉터리 답변</strong>을 합니다.<br />
                            그런데 어떻게 점점 <strong className={styles.colorGreen}>똑똑해질까요?</strong><br /><br />
                            비유하면 이래요:
                        </p>
                        <div className={styles.metaphorBox}>
                            <div className={styles.metaphorItem}>
                                <span className={styles.emoji25}>⛰️</span>
                                <p>울퉁불퉁한 산에서</p>
                            </div>
                            <span className={styles.arrowSep}>→</span>
                            <div className={styles.metaphorItem}>
                                <span className={styles.emoji25}>😎</span>
                                <p>눈을 감고</p>
                            </div>
                            <span className={styles.arrowSep}>→</span>
                            <div className={styles.metaphorItem}>
                                <span className={styles.emoji25}>⬇️</span>
                                <p>가장 낮은 곳을<br />찾아가기!</p>
                            </div>
                        </div>
                        <p className={`${styles.text} ${styles.textMt16}`}>
                            이 과정을 <strong className={styles.colorPurple}>경사하강법(Gradient Descent)</strong>이라 합니다.
                        </p>
                    </div>
                );

            case 'slope':
                return (
                    <div className={styles.dsContainer}>
                        <p className={styles.instruction}>
                            발밑의 <strong className={styles.colorRed}>기울기(빨간 화살표)</strong>가 방향을 알려줘요!<br />
                            ▶️ 시작을 눌러 공이 기울기를 따라 내려가는 모습을 확인하세요.
                        </p>
                        <GradientDescentDemo learningRate={0.1} showMomentum={false} />
                        <p className={`${styles.hint} ${styles.hintMt12}`}>
                            💡 빨간 화살표 = 기울기 방향. 공은 항상 기울기의 <strong>반대</strong> 방향으로 이동!
                        </p>
                    </div>
                );

            case 'lr':
                return (
                    <div className={styles.dsContainer}>
                        <p className={styles.instruction}>
                            🔧 학습률(보폭)을 바꿔가며 실험해보세요!
                        </p>
                        <div className={styles.sliderRow}>
                            <span className={styles.sliderLabel}>0.01</span>
                            <input
                                type="range"
                                className={`slider-cosmic ${styles.sliderInput}`}
                                min={0.01}
                                max={2.0}
                                step={0.01}
                                value={lr}
                                onChange={(e) => setLr(parseFloat(e.target.value))}
                            />
                            <span className={styles.sliderLabel}>2.00</span>
                        </div>
                        <div className={styles.lrDisplay}>
                            <span style={{ color: lr > 0.6 ? '#f43f5e' : lr < 0.05 ? '#3b82f6' : '#10b981' }}>
                                학습률 = {lr.toFixed(2)}
                            </span>
                            <span className={styles.lrFeedback}>
                                {lr > 1.0 ? '💥 발산 위험!' : lr > 0.6 ? '🤸 뛰어넘어!' : lr < 0.05 ? '🐌 느려...' : '✅ 적당!'}
                            </span>
                        </div>
                        <GradientDescentDemo learningRate={lr} showMomentum={false} />
                        <div className={styles.hintBox}>
                            <div className={styles.hintItem}>
                                <span className={styles.colorBlue}>🐌 너무 작으면</span>
                                <p>수렴은 하지만 엄청 느려요</p>
                            </div>
                            <div className={styles.hintItem}>
                                <span className={styles.colorGreen}>✅ 적당하면</span>
                                <p>빠르고 안정적으로 수렴!</p>
                            </div>
                            <div className={styles.hintItem}>
                                <span className={styles.colorRed}>🤸 너무 크면</span>
                                <p>왔다갔다 발산해 버려요!</p>
                            </div>
                        </div>
                    </div>
                );

            case 'momentum':
                return (
                    <div className={styles.dsContainer}>
                        <p className={styles.instruction}>
                            이번에는 <strong className={styles.colorYellow}>모멘텀(관성)</strong>이 켜져 있어요!<br />
                            공이 구덩이에 빠져도 관성으로 탈출할 수 있을까?
                        </p>
                        <GradientDescentDemo learningRate={0.1} showMomentum={true} />
                        <div className={styles.metaphorBox}>
                            <div className={styles.metaphorItem}>
                                <span className={styles.emoji2}>🏀</span>
                                <p>모멘텀 OFF<br /><span className={styles.momentumOff}>구덩이에 갇힘</span></p>
                            </div>
                            <span className={styles.arrowSep}>vs</span>
                            <div className={styles.metaphorItem}>
                                <span className={styles.emoji2}>🎳</span>
                                <p>모멘텀 ON<br /><span className={styles.momentumOn}>관성으로 탈출!</span></p>
                            </div>
                        </div>
                    </div>
                );

            case 'local':
                return (
                    <div className={styles.dsContainer}>
                        <p className={styles.instruction}>
                            ⚠️ 실제 손실 지형은 <strong>울퉁불퉁</strong>해서, 진짜 최저점이 아닌<br />
                            <strong className={styles.colorRed}>지역 최솟값(Local Minimum)</strong>에 빠질 수 있어요!
                        </p>
                        <div className={styles.metaphorBoxMt16}>
                            <div className={styles.localCard}>
                                <div className={styles.localIcon}>🕳️</div>
                                <div className={styles.localLabelRed}>지역 최솟값</div>
                                <p className={styles.localDesc}>
                                    "여기가 최저점 아닌데..."<br />
                                    작은 구덩이에 빠져 나오지 못함
                                </p>
                            </div>
                            <div className={styles.localCard}>
                                <div className={styles.localIcon}>⭐</div>
                                <div className={styles.localLabelYellow}>글로벌 미니멈</div>
                                <p className={styles.localDesc}>
                                    "진짜 최저점!"<br />
                                    우리가 찾고 싶은 곳
                                </p>
                            </div>
                        </div>
                        <p className={`${styles.hint} ${styles.hintMt16}`}>
                            💡 적절한 <strong>학습률</strong>과 <strong>모멘텀</strong>이 이 함정을 빠져나가는 열쇠입니다!
                        </p>
                    </div>
                );

            case 'race':
                return (
                    <div className={styles.raceContainer}>
                        <div className={`${styles.raceEmoji} animate-float`}>🏎️</div>
                        <p className={styles.text}>
                            이제 <strong>3D 손실 지형</strong> 위에서<br />
                            직접 학습률과 모멘텀을 설정하고<br />
                            <strong className={styles.colorYellow}>최저점까지 레이싱</strong>합니다!<br /><br />
                            <span className={styles.raceHint}>
                                학습률이 너무 크면? → 💥 공 이탈!<br />
                                너무 작으면? → 🐌 꼴찌...<br />
                                모멘텀이 적절하면? → 🏆 1등!
                            </span>
                        </p>
                        <button
                            className={`btn-nova ${styles.raceBtn}`}
                            onClick={goToLab}
                        >
                            <span>🏎️ 레이싱 참가하기!</span>
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
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div
                    className={styles.progressFill}
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
            </div>

            {/* 헤더 */}
            <div className={styles.header}>
                <span className={styles.weekBadge}>5주차</span>
                <div className={styles.headerEmoji}>{step.emoji}</div>
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
                    style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>← 이전</span>
                </button>
                <span className={styles.stepCount}>
                    {currentStep + 1} / {STEPS.length}
                </span>
                {currentStep < STEPS.length - 1 ? (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={nextStep}>
                        <span>다음 →</span>
                    </button>
                ) : (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}>
                        <span>🏎️ 실습 시작</span>
                    </button>
                )}
            </div>
        </div>
    );
}
