'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
    {
        id: 'welcome',
        title: '신경망은 어떻게 배울까?',
        emoji: '🧠',
        subtitle: '틀려야 배운다! 오류에서 배우는 AI',
    },
    {
        id: 'forward',
        title: '순전파: 앞으로!',
        emoji: '➡️',
        subtitle: '입력 → 가중치 × 입력 → 출력',
    },
    {
        id: 'error',
        title: '오차 계산',
        emoji: '❌',
        subtitle: '정답과 예측의 차이 = 오차!',
    },
    {
        id: 'backward',
        title: '역전파: 거슬러!',
        emoji: '🔄',
        subtitle: '오차를 거슬러 올라가며 가중치를 수정',
    },
    {
        id: 'adjust',
        title: '가중치 조절 체험',
        emoji: '🎛️',
        subtitle: '직접 가중치를 조절해 오차를 줄여보자!',
    },
    {
        id: 'lab',
        title: '역전파 탐험!',
        emoji: '🔬',
        subtitle: '이제 직접 신경망을 훈련시켜 보자!',
    },
];

// ── 간단한 2층 신경망 시각화 ──
function NeuralNetDemo({ weights, onWeightChange, showBackward, showError }) {
    const canvasRef = useRef(null);

    const sigmoid = (x) => 1 / (1 + Math.exp(-x));

    // 네트워크 계산
    const input = [1.0, 0.5];
    const target = 0.8;
    const h1 = sigmoid(input[0] * weights[0] + input[1] * weights[1]);
    const h2 = sigmoid(input[0] * weights[2] + input[1] * weights[3]);
    const output = sigmoid(h1 * weights[4] + h2 * weights[5]);
    const error = Math.abs(target - output);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        // 노드 위치
        const nodes = {
            i1: { x: 60, y: 100 },
            i2: { x: 60, y: 220 },
            h1: { x: 240, y: 80 },
            h2: { x: 240, y: 240 },
            o: { x: 420, y: 160 },
        };

        // 연결선 그리기
        const connections = [
            { from: 'i1', to: 'h1', w: weights[0], idx: 0 },
            { from: 'i2', to: 'h1', w: weights[1], idx: 1 },
            { from: 'i1', to: 'h2', w: weights[2], idx: 2 },
            { from: 'i2', to: 'h2', w: weights[3], idx: 3 },
            { from: 'h1', to: 'o', w: weights[4], idx: 4 },
            { from: 'h2', to: 'o', w: weights[5], idx: 5 },
        ];

        connections.forEach((conn) => {
            const from = nodes[conn.from];
            const to = nodes[conn.to];
            const thickness = Math.abs(conn.w) * 3 + 0.5;
            const alpha = Math.min(Math.abs(conn.w) * 0.6 + 0.1, 0.8);

            // 순전파 방향
            ctx.beginPath();
            ctx.strokeStyle = showBackward
                ? `rgba(244, 63, 94, ${alpha})`
                : `rgba(124, 92, 252, ${alpha})`;
            ctx.lineWidth = thickness;
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();

            // 역전파 화살표
            if (showBackward) {
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                const angle = Math.atan2(from.y - to.y, from.x - to.x);
                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.fillStyle = '#f43f5e';
                ctx.moveTo(8, 0);
                ctx.lineTo(-4, -5);
                ctx.lineTo(-4, 5);
                ctx.fill();
                ctx.restore();
            }

            // 가중치 라벨
            const lx = (from.x + to.x) / 2;
            const ly = (from.y + to.y) / 2 - 8;
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`w${conn.idx + 1}=${conn.w.toFixed(2)}`, lx, ly);
        });

        // 노드 그리기
        const drawNode = (key, label, value, color) => {
            const n = nodes[key];
            // 글로우
            ctx.beginPath();
            ctx.arc(n.x, n.y, 28, 0, Math.PI * 2);
            ctx.fillStyle = color.replace(')', ', 0.15)').replace('rgb', 'rgba');
            ctx.fill();
            // 원
            ctx.beginPath();
            ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 10, 40, 0.8)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            // 라벨
            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, n.x, n.y - 4);
            // 값
            ctx.fillStyle = color;
            ctx.font = '10px monospace';
            ctx.fillText(value, n.x, n.y + 10);
        };

        drawNode('i1', 'X₁', input[0].toFixed(1), 'rgb(59, 130, 246)');
        drawNode('i2', 'X₂', input[1].toFixed(1), 'rgb(59, 130, 246)');
        drawNode('h1', 'H₁', h1.toFixed(2), 'rgb(124, 92, 252)');
        drawNode('h2', 'H₂', h2.toFixed(2), 'rgb(124, 92, 252)');
        drawNode('o', 'Y', output.toFixed(3), error < 0.05 ? 'rgb(16, 185, 129)' : 'rgb(251, 191, 36)');

        // 정답 표시
        if (showError) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`정답: ${target}`, nodes.o.x, nodes.o.y + 42);
            ctx.fillStyle = error < 0.05 ? '#10b981' : '#f43f5e';
            ctx.fillText(`오차: ${error.toFixed(4)}`, nodes.o.x, nodes.o.y + 58);
        }

        // 레이어 라벨
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('입력층', 60, 280);
        ctx.fillText('은닉층', 240, 280);
        ctx.fillText('출력층', 420, 280);

    }, [weights, showBackward, showError, h1, h2, output, error]);

    return (
        <div style={{ textAlign: 'center' }}>
            <canvas
                ref={canvasRef}
                width={480}
                height={300}
                style={{
                    width: '100%',
                    maxWidth: 480,
                    height: 'auto',
                    borderRadius: 12,
                    background: 'rgba(15, 10, 40, 0.6)',
                    border: '1px solid rgba(124, 92, 252, 0.15)',
                }}
            />
            {showError && (
                <div style={{
                    marginTop: 8,
                    padding: '6px 16px',
                    display: 'inline-block',
                    borderRadius: 20,
                    background: error < 0.05 ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                    color: error < 0.05 ? '#10b981' : '#f43f5e',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                }}>
                    {error < 0.05 ? '🎉 거의 정답!' : error < 0.2 ? '🔥 조금만 더!' : '📐 오차가 아직 크네요'}
                </div>
            )}
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week7IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [weights, setWeights] = useState([0.5, -0.3, 0.8, 0.2, 0.6, -0.4]);
    const step = STEPS[currentStep];

    const nextStep = () => {
        setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    };
    const prevStep = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };
    const goToLab = () => router.push('/week7');

    const updateWeight = (idx, val) => {
        setWeights((prev) => {
            const next = [...prev];
            next[idx] = parseFloat(val);
            return next;
        });
    };

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome':
                return (
                    <div style={ds.welcomeBox}>
                        {/* 브리지: 6주차 → 7주차 */}
                        <div style={{
                            padding: '12px 16px', borderRadius: 10,
                            background: 'rgba(251, 191, 36, 0.08)',
                            border: '1px solid rgba(251, 191, 36, 0.15)',
                            marginBottom: 16, fontSize: '0.85rem',
                            color: 'var(--text-secondary)', lineHeight: 1.6, textAlign: 'left',
                        }}>
                            <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                            6주차에서 <strong>뉴런</strong>이 입력에 가중치를 곱하고 활성화 함수를 통해 출력을 만드는 걸 배웠어요.
                            그런데 이 가중치를 어떻게 &quot;좋은 값&quot;으로 바꿀까요?
                            바로 오류를 거슬러 추적하는 <strong>역전파(Backpropagation)</strong>가 그 답입니다!
                        </div>
                        <p style={ds.text}>
                            사람이 시험에서 <strong style={{ color: '#f43f5e' }}>틀린 문제</strong>를 보고 배우듯,<br />
                            AI도 <strong style={{ color: '#10b981' }}>틀려야 배웁니다!</strong><br /><br />
                            이 과정이 궁금하지 않나요?
                        </p>
                        <div style={ds.metaphorBox}>
                            <div style={ds.metaphorItem}>
                                <span style={{ fontSize: '2.5rem' }}>📝</span>
                                <p>시험(예측)</p>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: 'var(--text-dim)' }}>→</span>
                            <div style={ds.metaphorItem}>
                                <span style={{ fontSize: '2.5rem' }}>❌</span>
                                <p>오답(오차)</p>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: 'var(--text-dim)' }}>→</span>
                            <div style={ds.metaphorItem}>
                                <span style={{ fontSize: '2.5rem' }}>📖</span>
                                <p>오답노트<br />(가중치 수정)</p>
                            </div>
                        </div>
                        <p style={{ ...ds.text, marginTop: 16, fontSize: '0.85rem' }}>
                            이 과정을 <strong style={{ color: '#7c5cfc' }}>역전파(Backpropagation)</strong>라 합니다!
                        </p>
                    </div>
                );

            case 'forward':
                return (
                    <div style={ds.container}>
                        <p style={ds.instruction}>
                            순전파: 입력이 <strong style={{ color: '#3b82f6' }}>앞으로</strong> 흘러가며 출력을 만드는 과정!<br />
                            보라색 선의 굵기 = 가중치의 크기
                        </p>
                        <NeuralNetDemo weights={weights} showBackward={false} showError={false} />
                        <p style={ds.hint}>
                            💡 X₁=1.0, X₂=0.5 가 가중치를 통해 H₁, H₂ → Y 로 전달됩니다
                        </p>
                    </div>
                );

            case 'error':
                return (
                    <div style={ds.container}>
                        <p style={ds.instruction}>
                            출력(Y)과 <strong style={{ color: '#10b981' }}>정답(0.8)</strong>의 차이 = <strong style={{ color: '#f43f5e' }}>오차!</strong>
                        </p>
                        <NeuralNetDemo weights={weights} showBackward={false} showError={true} />
                        <div style={{ ...ds.metaphorBox, marginTop: 16 }}>
                            <div style={ds.metaphorItem}>
                                <span style={{ fontSize: '1.5rem' }}>🎯</span>
                                <p>정답: <strong>0.8</strong></p>
                            </div>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>−</span>
                            <div style={ds.metaphorItem}>
                                <span style={{ fontSize: '1.5rem' }}>🤖</span>
                                <p>예측: <strong>{(1 / (1 + Math.exp(-(
                                    (1 / (1 + Math.exp(-(1.0 * weights[0] + 0.5 * weights[1])))) * weights[4] +
                                    (1 / (1 + Math.exp(-(1.0 * weights[2] + 0.5 * weights[3])))) * weights[5]
                                )))).toFixed(3)}</strong></p>
                            </div>
                            <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>=</span>
                            <div style={{ ...ds.metaphorItem, border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                                <span style={{ fontSize: '1.5rem' }}>📏</span>
                                <p style={{ color: '#f43f5e' }}><strong>오차!</strong></p>
                            </div>
                        </div>
                    </div>
                );

            case 'backward':
                return (
                    <div style={ds.container}>
                        <p style={ds.instruction}>
                            역전파: 오차를 <strong style={{ color: '#f43f5e' }}>뒤로 거슬러</strong> 각 가중치에 전달!<br />
                            빨간 화살표 = 오차 신호의 역방향 흐름
                        </p>
                        <NeuralNetDemo weights={weights} showBackward={true} showError={true} />
                        <div style={{ ...ds.hintBox, marginTop: 16 }}>
                            <div style={ds.hintItem}>
                                <span style={{ color: '#7c5cfc' }}>➡️ 순전파</span>
                                <p>입력 → 출력</p>
                            </div>
                            <div style={ds.hintItem}>
                                <span style={{ color: '#f43f5e' }}>🔄 역전파</span>
                                <p>오차 → 가중치 수정</p>
                            </div>
                        </div>
                        <p style={{ ...ds.hint, marginTop: 12 }}>
                            💡 오차가 큰 연결일수록 가중치가 더 많이 바뀝니다!
                        </p>
                    </div>
                );

            case 'adjust':
                return (
                    <div style={ds.container}>
                        <p style={ds.instruction}>
                            🎛️ <strong>직접</strong> 6개 가중치를 조절해서 오차를 <strong style={{ color: '#10b981' }}>0.05 이하</strong>로 만들어보세요!
                        </p>
                        <NeuralNetDemo weights={weights} onWeightChange={updateWeight} showBackward={false} showError={true} />
                        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {weights.map((w, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', width: 28 }}>w{i + 1}</span>
                                    <input
                                        type="range"
                                        className="slider-cosmic"
                                        min={-3}
                                        max={3}
                                        step={0.05}
                                        value={w}
                                        onChange={(e) => updateWeight(i, e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', width: 36, textAlign: 'right', fontFamily: 'monospace' }}>
                                        {w.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p style={{ ...ds.hint, marginTop: 12 }}>
                            💡 실제 AI는 이 조절을 <strong>수천~수백만 번</strong> 자동으로 합니다!
                        </p>
                    </div>
                );

            case 'lab':
                return (
                    <div style={{ ...ds.container, textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: 16 }} className="animate-float">🔬</div>
                        <p style={ds.text}>
                            이제 <strong>더 큰 신경망</strong>에서<br />
                            역전파 과정을 <strong style={{ color: '#fbbf24' }}>단계별로 시각화</strong>하고<br />
                            <strong>학습 루프</strong>를 직접 돌려봅니다!
                        </p>
                        <button
                            className="btn-nova"
                            style={{ marginTop: 24, padding: '14px 40px', fontSize: '1.1rem' }}
                            onClick={goToLab}
                        >
                            <span>🔬 역전파 탐험 시작!</span>
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.progressBar}>
                {STEPS.map((s, i) => (
                    <div
                        key={s.id}
                        style={{
                            ...pageStyles.progressDot,
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
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

            <div style={pageStyles.header}>
                <span style={pageStyles.weekBadge}>7주차</span>
                <div style={{ fontSize: '3rem' }}>{step.emoji}</div>
                <h1 style={pageStyles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
                <p style={pageStyles.subtitle}>{step.subtitle}</p>
            </div>

            <div style={pageStyles.content}>{renderStepContent()}</div>

            <div style={pageStyles.navBar}>
                <button
                    className="btn-nova"
                    style={{ ...pageStyles.navBtn, opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>← 이전</span>
                </button>
                <span style={pageStyles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={nextStep}>
                        <span>다음 →</span>
                    </button>
                ) : (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={goToLab}>
                        <span>🔬 실습 시작</span>
                    </button>
                )}
            </div>
        </div>
    );
}

const pageStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', maxWidth: 680, margin: '0 auto' },
    progressBar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, position: 'relative', width: '100%', maxWidth: 300, justifyContent: 'center' },
    progressDot: { width: 12, height: 12, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s', zIndex: 1 },
    progressFill: { position: 'absolute', left: 6, top: '50%', height: 3, background: 'var(--accent-nova)', borderRadius: 2, transform: 'translateY(-50%)', transition: 'width 0.3s', zIndex: 0 },
    header: { textAlign: 'center', marginBottom: 24 },
    weekBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: 12, letterSpacing: '0.05em' },
    title: { fontSize: '1.6rem', fontWeight: 800, marginTop: 8, marginBottom: 6 },
    subtitle: { fontSize: '0.95rem', color: 'var(--text-secondary)' },
    content: { flex: 1, width: '100%', marginBottom: 24 },
    navBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' },
    navBtn: { padding: '10px 24px', fontSize: '0.9rem' },
    stepCount: { fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 },
};

const ds = {
    container: { padding: 20 },
    welcomeBox: { textAlign: 'center', padding: 20 },
    text: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 },
    instruction: { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center', lineHeight: 1.6 },
    hint: { fontSize: '0.82rem', color: 'var(--text-dim)', textAlign: 'center' },
    metaphorBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap' },
    metaphorItem: { textAlign: 'center', padding: 12, borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', border: '1px solid rgba(124, 92, 252, 0.12)', minWidth: 90, fontSize: '0.82rem', color: 'var(--text-secondary)' },
    hintBox: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
    hintItem: { textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(15, 10, 40, 0.5)', border: '1px solid rgba(124, 92, 252, 0.1)', fontSize: '0.78rem', color: 'var(--text-dim)', flex: 1, minWidth: 120 },
};
