'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

/* ── Activation Graph (Canvas) ── */
function ActivationGraph({ activation, z, y }) {
    const canvasRef = useRef(null);

    const activationFn = useCallback((x) => {
        switch (activation) {
            case 'sigmoid': return 1 / (1 + Math.exp(-x));
            case 'relu': return Math.max(0, x);
            case 'tanh': return Math.tanh(x);
            case 'step': return x >= 0 ? 1 : 0;
            default: return 0;
        }
    }, [activation]);

    // y-axis range per function
    const getYRange = useCallback(() => {
        switch (activation) {
            case 'sigmoid': return { min: -0.2, max: 1.2 };
            case 'relu': return { min: -1, max: 6 };
            case 'tanh': return { min: -1.3, max: 1.3 };
            case 'step': return { min: -0.3, max: 1.3 };
            default: return { min: -1, max: 1 };
        }
    }, [activation]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const W = canvas.clientWidth;
        const H = canvas.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const pad = { top: 20, right: 20, bottom: 30, left: 40 };
        const plotW = W - pad.left - pad.right;
        const plotH = H - pad.top - pad.bottom;

        const xMin = -6, xMax = 6;
        const { min: yMin, max: yMax } = getYRange();

        const toCanvasX = (v) => pad.left + ((v - xMin) / (xMax - xMin)) * plotW;
        const toCanvasY = (v) => pad.top + ((yMax - v) / (yMax - yMin)) * plotH;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let x = -6; x <= 6; x += 2) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(x), pad.top);
            ctx.lineTo(toCanvasX(x), pad.top + plotH);
            ctx.stroke();
        }
        const yStep = activation === 'relu' ? 1 : 0.5;
        for (let yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
            ctx.beginPath();
            ctx.moveTo(pad.left, toCanvasY(yv));
            ctx.lineTo(pad.left + plotW, toCanvasY(yv));
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        // x-axis (y=0)
        if (yMin <= 0 && yMax >= 0) {
            ctx.beginPath();
            ctx.moveTo(pad.left, toCanvasY(0));
            ctx.lineTo(pad.left + plotW, toCanvasY(0));
            ctx.stroke();
        }
        // y-axis (x=0)
        ctx.beginPath();
        ctx.moveTo(toCanvasX(0), pad.top);
        ctx.lineTo(toCanvasX(0), pad.top + plotH);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        for (let x = -6; x <= 6; x += 2) {
            ctx.fillText(x, toCanvasX(x), pad.top + plotH + 15);
        }
        ctx.textAlign = 'right';
        for (let yv = Math.ceil(yMin / yStep) * yStep; yv <= yMax; yv += yStep) {
            ctx.fillText(yv.toFixed(1), pad.left - 5, toCanvasY(yv) + 3);
        }

        // Draw curve
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 300;
        for (let i = 0; i <= steps; i++) {
            const xv = xMin + (xMax - xMin) * (i / steps);
            const yv = activationFn(xv);
            const cx = toCanvasX(xv);
            const cy = toCanvasY(yv);
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        }
        ctx.stroke();

        // Vertical dashed line at z
        const clampedZ = Math.max(xMin, Math.min(xMax, z));
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(248,113,113,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(clampedZ), pad.top);
        ctx.lineTo(toCanvasX(clampedZ), pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current point (z, y)
        const ptX = toCanvasX(clampedZ);
        const ptY = toCanvasY(activationFn(clampedZ));
        // Glow
        ctx.beginPath();
        ctx.arc(ptX, ptY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(248,113,113,0.25)';
        ctx.fill();
        // Dot
        ctx.beginPath();
        ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f87171';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label near dot
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        const labelX = ptX + 10;
        const labelY = ptY - 10;
        ctx.fillText(`z=${z.toFixed(2)}`, labelX, labelY);
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`y=${y.toFixed(4)}`, labelX, labelY + 14);

    }, [activation, z, y, activationFn, getYRange]);

    return (
        <div className={s.graphContainer}>
            <h3 className={s.label}>활성화 함수 그래프 ({activation.toUpperCase()})</h3>
            <canvas
                ref={canvasRef}
                className={s.canvas}
            />
            <div className={s.graphLegend}>
                <span className={s.legendBlue}>--- {activation}(z) 곡선</span>
                <span className={s.legendRed}>● 현재 값 (z={z.toFixed(2)}, y={y.toFixed(4)})</span>
            </div>
        </div>
    );
}

/* ── Main Component ── */
export default function NeuronLab() {
    const router = useRouter();

    // Inputs (x)
    const [inputs, setInputs] = useState({ x1: 0.5, x2: -0.2 });

    // Weights (w) & Bias (b)
    const [weights, setWeights] = useState({ w1: 1.0, w2: -1.0 });
    const [bias, setBias] = useState(0.0);

    // Activation Function
    const [activation, setActivation] = useState('sigmoid'); // sigmoid, relu, tanh, step
    const [showDeepDive, setShowDeepDive] = useState(false);

    // Calculation
    const z = useMemo(() => {
        return (inputs.x1 * weights.w1) + (inputs.x2 * weights.w2) + bias;
    }, [inputs, weights, bias]);

    const y = useMemo(() => {
        switch (activation) {
            case 'sigmoid': return 1 / (1 + Math.exp(-z));
            case 'relu': return Math.max(0, z);
            case 'tanh': return Math.tanh(z);
            case 'step': return z >= 0 ? 1 : 0;
            default: return 0;
        }
    }, [z, activation]);

    // Helpers for styles
    const getStrokeWidth = (w) => Math.max(1, Math.abs(w) * 3);
    const getStrokeColor = (w) => w > 0 ? '#60a5fa' : w < 0 ? '#f87171' : '#94a3b8';

    return (
        <div className={s.container}>
            <Breadcrumb
                items={[{ label: '6주차 인트로', href: '/week6/intro' }]}
                current="인공 뉴런 연구실"
            />
            <div className={s.header}>
                <div className={s.headerTitle}>
                    <span className={s.headerEmoji}>🧠</span>
                    <span className={s.headerText}>인공 뉴런 연구실 (Neuron Lab)</span>
                </div>
            </div>

            <div className={s.content}>
                {/* 1. Visualization (Left) */}
                <div className={s.card}>
                    <h3 className={s.label}>뉴런 시각화 (Neuron Visualization)</h3>
                    <div className={s.diagramContainer}>
                        <svg width="100%" height="400" viewBox="0 0 600 400" className={s.svgOverflowVisible}>
                            {/* Synapses (Lines) */}
                            {/* x1 to Neuron */}
                            <line x1="100" y1="100" x2="350" y2="200"
                                stroke={getStrokeColor(weights.w1)}
                                strokeWidth={getStrokeWidth(weights.w1)}
                                strokeLinecap="round"
                            />
                            {/* x2 to Neuron */}
                            <line x1="100" y1="300" x2="350" y2="200"
                                stroke={getStrokeColor(weights.w2)}
                                strokeWidth={getStrokeWidth(weights.w2)}
                                strokeLinecap="round"
                            />

                            {/* Input Nodes */}
                            {/* x1 */}
                            <g transform="translate(100, 100)">
                                <circle r="30" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2" />
                                <text x="0" y="-8" textAnchor="middle" fill="#94a3b8" fontSize="11">Input x₁</text>
                                <text x="0" y="8" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="12">
                                    {inputs.x1.toFixed(1)}
                                </text>
                                <text x="100" y="30" textAnchor="middle" fill={getStrokeColor(weights.w1)} fontSize="11" fontWeight="bold">
                                    w₁={weights.w1.toFixed(1)}
                                </text>
                            </g>

                            {/* x2 */}
                            <g transform="translate(100, 300)">
                                <circle r="30" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2" />
                                <text x="0" y="-8" textAnchor="middle" fill="#94a3b8" fontSize="11">Input x₂</text>
                                <text x="0" y="8" textAnchor="middle" fill="#fff" fontWeight="bold" fontSize="12">
                                    {inputs.x2.toFixed(1)}
                                </text>
                                <text x="100" y="-20" textAnchor="middle" fill={getStrokeColor(weights.w2)} fontSize="11" fontWeight="bold">
                                    w₂={weights.w2.toFixed(1)}
                                </text>
                            </g>

                            {/* Neuron Node (Summation + Bias) */}
                            <g transform="translate(350, 200)">
                                <circle r="50" fill="#0f172a" stroke="#60a5fa" strokeWidth="4" />
                                <text x="0" y="-15" textAnchor="middle" fill="#94a3b8" fontSize="11">Neuron</text>
                                <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="14">∑</text>
                                <text x="0" y="25" textAnchor="middle" fill="#60a5fa" fontSize="11">b={bias.toFixed(1)}</text>
                            </g>

                            {/* Output Connection */}
                            <line x1="400" y1="200" x2="500" y2="200" stroke="#fff" strokeWidth="4" />

                            {/* Output Node (Activation) */}
                            <g transform="translate(530, 200)">
                                <rect x="-40" y="-30" width="80" height="60" rx="10" fill={y > 0.5 ? '#22c55e' : '#334155'} />
                                <text x="0" y="-45" textAnchor="middle" fill="#94a3b8" fontSize="12">Output y</text>
                                <text x="0" y="5" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="bold">
                                    {y.toFixed(3)}
                                </text>
                                <text x="0" y="45" textAnchor="middle" fill="#94a3b8" fontSize="12">
                                    {activation.toUpperCase()}
                                </text>
                            </g>
                        </svg>

                        <div className={s.formulaBox}>
                            <p>
                                <span className={s.colorSlate}>z</span> =
                                (<span className={s.colorWhite}>{inputs.x1}</span> × <span style={{ color: getStrokeColor(weights.w1) }}>{weights.w1}</span>) +
                                (<span className={s.colorWhite}>{inputs.x2}</span> × <span style={{ color: getStrokeColor(weights.w2) }}>{weights.w2}</span>) +
                                <span className={s.colorBlue}> {bias} </span>
                                = <strong>{z.toFixed(2)}</strong>
                            </p>
                            <p className={s.formulaSecondLine}>
                                <span className={s.colorGreen}>y</span> = {activation}({z.toFixed(2)}) = <strong>{y.toFixed(4)}</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Activation Graph (Canvas) */}
                <div className={s.card}>
                    <ActivationGraph activation={activation} z={z} y={y} />
                </div>

                {/* 3. Controls */}
                <div className={s.controlsGrid}>
                    {/* Inputs */}
                    <div className={s.card}>
                        <h3 className={s.label}>1. 입력값 (Inputs)</h3>
                        <ControlRow label="x₁" value={inputs.x1} min={-1} max={1} step={0.1} color="#fff"
                            onChange={v => setInputs({ ...inputs, x1: v })} />
                        <ControlRow label="x₂" value={inputs.x2} min={-1} max={1} step={0.1} color="#fff"
                            onChange={v => setInputs({ ...inputs, x2: v })} />
                    </div>

                    {/* Weights */}
                    <div className={s.card}>
                        <h3 className={s.label}>2. 가중치 (Weights)</h3>
                        <p className={s.controlHint}>가중치 = 각 입력의 중요도. 값이 클수록 해당 입력이 결과에 더 큰 영향을 줍니다.</p>
                        <ControlRow label="w₁" value={weights.w1} min={-3} max={3} step={0.1} color={getStrokeColor(weights.w1)}
                            onChange={v => setWeights({ ...weights, w1: v })} />
                        <ControlRow label="w₂" value={weights.w2} min={-3} max={3} step={0.1} color={getStrokeColor(weights.w2)}
                            onChange={v => setWeights({ ...weights, w2: v })} />
                    </div>

                    {/* Bias & Activation */}
                    <div className={s.card}>
                        <h3 className={s.label}>3. 편향 및 활성화 함수</h3>
                        <p className={s.controlHint}>편향(Bias) = 기본값 조정. 입력이 모두 0이어도 뉴런이 활성화될 수 있게 해주는 값입니다.</p>
                        <ControlRow label="Bias (b)" value={bias} min={-3} max={3} step={0.1} color="#60a5fa"
                            onChange={v => setBias(v)} />

                        <div className={s.activationWrap}>
                            <label className={s.labelBlock}>활성화 함수 (Activation)</label>
                            <p className={s.activationHint}>
                                왜 활성화 함수가 필요할까? 없으면 아무리 층을 쌓아도 결국 하나의 직선(선형 변환)과 같아서, 복잡한 패턴을 학습할 수 없습니다.
                            </p>
                            <div className={s.btnGroup}>
                                {['sigmoid', 'relu', 'tanh', 'step'].map(fn => (
                                    <button
                                        key={fn}
                                        className={s.actBtn}
                                        style={{
                                            background: activation === fn ? '#60a5fa' : 'rgba(255,255,255,0.1)',
                                            color: activation === fn ? '#000' : '#fff'
                                        }}
                                        onClick={() => setActivation(fn)}
                                    >
                                        {fn}
                                    </button>
                                ))}
                            </div>
                            <p className={s.explain}>
                                {activation === 'sigmoid' && 'Sigmoid: 0~1로 압축하는 S자 곡선. 확률 표현에 적합합니다.'}
                                {activation === 'relu' && 'ReLU: 0보다 작으면 0, 크면 그대로 (가장 많이 사용). 심층 신경망의 기본 활성화 함수입니다.'}
                                {activation === 'tanh' && 'Tanh: -1~1로 압축. 0을 중심으로 대칭이라 학습이 안정적입니다.'}
                                {activation === 'step' && 'Step: 0보다 크면 1, 작으면 0. 가장 단순한 활성화 (Perceptron).'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 4. Theory Section */}
                <div className={s.card}>
                    <h3 className={s.label}>🤖 이것이 모이면 지능이 됩니다</h3>
                    <div className={s.theoryBody}>
                        <p className={s.theoryParagraph}>
                            <strong>1. 수천억 개의 뉴런 (Parameters)</strong><br />
                            여러분이 지금 만든 이 단순한 뉴런 하나가
                            GPT-4 같은 모델에는 <strong>수천억 개</strong>나 들어있습니다.
                            단순한 덧셈/곱셈도 엄청나게 많이 모이면 &quot;추론&quot;을 할 수 있게 됩니다! 🧠
                        </p>
                        <p className={s.theoryParagraph}>
                            <strong>2. 비선형성의 마법 (ReLU)</strong><br />
                            단순히 더하기만 하면 아무리 층을 쌓아도 선형(Linear) 모델에 불과합니다.
                            중간에 <strong>ReLU</strong> 같은 비선형 함수를 섞어줘야 복잡한 문제를 풀 수 있습니다.
                        </p>
                    </div>
                </div>

                {/* 5. Why Non-linear? XOR Problem */}
                <div className={s.card}>
                    <h3 className={s.label}>❓ 왜 비선형 활성화 함수가 필요한가?</h3>
                    <div className={s.xorBody}>
                        <p className={s.xorIntro}>
                            <strong className={s.colorRed}>문제: XOR은 선형으로 풀 수 없습니다</strong>
                        </p>
                        <div className={s.xorTable}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th className={s.th}>x₁</th>
                                        <th className={s.th}>x₂</th>
                                        <th className={s.th}>AND</th>
                                        <th className={s.th}>OR</th>
                                        <th className={s.thRed}>XOR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td className={s.td}>0</td><td className={s.td}>0</td><td className={s.td}>0</td><td className={s.td}>0</td><td className={s.tdRed}>0</td></tr>
                                    <tr><td className={s.td}>0</td><td className={s.td}>1</td><td className={s.td}>0</td><td className={s.td}>1</td><td className={s.tdRed}>1</td></tr>
                                    <tr><td className={s.td}>1</td><td className={s.td}>0</td><td className={s.td}>0</td><td className={s.td}>1</td><td className={s.tdRed}>1</td></tr>
                                    <tr><td className={s.td}>1</td><td className={s.td}>1</td><td className={s.td}>1</td><td className={s.td}>1</td><td className={s.tdRed}>0</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <p className={s.xorExplain}>
                            AND와 OR는 직선 하나로 0과 1을 나눌 수 있습니다.
                            하지만 <strong className={s.colorRed}>XOR</strong>은 직선 하나로는 절대 분리할 수 없습니다!
                        </p>
                        <div className={s.xorVisual}>
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                {/* grid background */}
                                <rect width="160" height="160" fill="rgba(0,0,0,0.3)" rx="8" />
                                {/* axes */}
                                <line x1="30" y1="130" x2="150" y2="130" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                <line x1="30" y1="130" x2="30" y2="10" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                                <text x="145" y="145" fill="#94a3b8" fontSize="10">x₁</text>
                                <text x="10" y="15" fill="#94a3b8" fontSize="10">x₂</text>
                                {/* (0,0)=0 */}
                                <circle cx="50" cy="110" r="8" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                                <text x="50" y="114" textAnchor="middle" fill="#94a3b8" fontSize="9">0</text>
                                {/* (1,0)=1 */}
                                <circle cx="120" cy="110" r="8" fill="#22c55e" stroke="#22c55e" strokeWidth="1.5" />
                                <text x="120" y="114" textAnchor="middle" fill="#fff" fontSize="9">1</text>
                                {/* (0,1)=1 */}
                                <circle cx="50" cy="40" r="8" fill="#22c55e" stroke="#22c55e" strokeWidth="1.5" />
                                <text x="50" y="44" textAnchor="middle" fill="#fff" fontSize="9">1</text>
                                {/* (1,1)=0 */}
                                <circle cx="120" cy="40" r="8" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
                                <text x="120" y="44" textAnchor="middle" fill="#94a3b8" fontSize="9">0</text>
                                {/* impossible line */}
                                <line x1="20" y1="75" x2="150" y2="75" stroke="#f87171" strokeWidth="1.5" strokeDasharray="4,4" />
                                <text x="85" y="155" textAnchor="middle" fill="#f87171" fontSize="9">직선 하나로는 불가!</text>
                            </svg>
                        </div>
                        <p className={s.xorSolution}>
                            <strong className={s.colorBlue}>해결: 비선형 활성화 + 은닉층(Hidden Layer)</strong><br />
                            비선형 활성화 함수를 가진 뉴런을 여러 층으로 쌓으면,
                            공간을 &quot;구부려서&quot; XOR도 분류할 수 있게 됩니다.
                        </p>
                        <div className={s.keyInsight}>
                            선형 함수를 아무리 합성해도 결과는 선형입니다: f(g(x)) = ax + b.<br />
                            비선형 함수가 있어야 곡선, 영역 분할 등 복잡한 패턴을 학습할 수 있습니다.
                        </div>
                    </div>
                </div>

                {/* 6. Biological vs Artificial Neuron */}
                <div className={s.card}>
                    <h3 className={s.label}>🔬 생물학적 뉴런 vs 인공 뉴런</h3>
                    <div className={s.comparisonGrid}>
                        {/* Biological Neuron */}
                        <div className={s.comparisonCard}>
                            <div className={s.comparisonHeader}>
                                <span className={s.comparisonEmoji}>🧬</span>
                                <strong className={s.colorGreen}>생물학적 뉴런</strong>
                            </div>
                            <div className={s.comparisonBody}>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>입력</span>
                                    <span className={s.comparisonValue}>수상돌기 (Dendrites)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>가중치</span>
                                    <span className={s.comparisonValue}>시냅스 강도 (Synapse Strength)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>합산</span>
                                    <span className={s.comparisonValue}>세포체 (Cell Body / Soma)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>활성화</span>
                                    <span className={s.comparisonValue}>역치 전위 (Threshold Potential)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>출력</span>
                                    <span className={s.comparisonValue}>축삭돌기 (Axon)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>신호</span>
                                    <span className={s.comparisonValue}>전기 화학적 신호</span>
                                </div>
                            </div>
                        </div>

                        {/* Artificial Neuron */}
                        <div className={s.comparisonCard}>
                            <div className={s.comparisonHeader}>
                                <span className={s.comparisonEmoji}>🤖</span>
                                <strong className={s.colorBlue}>인공 뉴런</strong>
                            </div>
                            <div className={s.comparisonBody}>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>입력</span>
                                    <span className={s.comparisonValue}>입력값 x₁, x₂, ... (숫자)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>가중치</span>
                                    <span className={s.comparisonValue}>가중치 w₁, w₂, ... (학습)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>합산</span>
                                    <span className={s.comparisonValue}>가중합 z = &Sigma;(x&middot;w) + b</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>활성화</span>
                                    <span className={s.comparisonValue}>활성화 함수 (Sigmoid, ReLU...)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>출력</span>
                                    <span className={s.comparisonValue}>출력값 y (다음 층으로 전달)</span>
                                </div>
                                <div className={s.comparisonRow}>
                                    <span className={s.comparisonLabel}>신호</span>
                                    <span className={s.comparisonValue}>부동소수점 숫자 (float)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={s.comparisonNote}>
                        <p>
                            <strong>핵심 차이:</strong> 생물학적 뉴런은 &quot;발화(fire)&quot;하거나 안 하거나의 이진 방식에 가깝지만,
                            인공 뉴런은 <strong>연속적인 숫자</strong>를 출력합니다.
                            인공 뉴런의 Step 함수가 생물학적 뉴런의 역치 발화와 가장 유사합니다.
                        </p>
                        <p className={s.comparisonNoteSecond}>
                            <strong>공통점:</strong> 둘 다 여러 입력을 받아 하나의 출력을 만들며,
                            <strong> 연결 강도(가중치)</strong>를 조절하여 학습합니다.
                        </p>
                    </div>
                </div>

                {/* 한 걸음 더: XOR과 비선형성 */}
                <div className={s.deepDiveWrap}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        className={s.deepDiveToggle}
                    >
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: 뉴런 하나로 풀 수 없는 문제 (XOR)
                    </button>
                    {showDeepDive && (
                        <div className={s.deepDiveContent}>
                            <p className={s.deepDiveParagraph}>
                                <strong className={s.colorYellow}>XOR 문제</strong> —
                                입력이 (0,1) 또는 (1,0)이면 1, (0,0)이나 (1,1)이면 0을 출력해야 해요.
                                이건 하나의 직선으로는 절대 나눌 수 없습니다!
                            </p>
                            <p className={s.deepDiveParagraph}>
                                <strong className={s.colorTeal}>해결책: 층을 쌓기</strong> —
                                뉴런 하나로는 불가능하지만, 뉴런을 여러 층으로 쌓으면(다층 퍼셉트론) 곡선 경계를 만들어 XOR을 풀 수 있어요.
                                이것이 바로 &quot;딥러닝&quot;의 시작점입니다!
                            </p>
                            <p>
                                <strong className={s.colorRed}>핵심 포인트</strong> —
                                활성화 함수가 없으면 층을 아무리 쌓아도 직선밖에 못 그려요.
                                비선형 활성화 함수 + 다층 구조 = 어떤 복잡한 패턴도 학습 가능!
                                다음 주차(7주차)에서 역전파로 이 다층 신경망을 학습시키는 법을 배웁니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 네비게이션 */}
            <div className={s.navRow}>
                <button onClick={() => router.push('/week6/intro')} className={s.navBack}>← 인트로로</button>
                <button className={`btn-nova ${s.navForward}`} onClick={() => router.push('/week7/intro')}>
                    <span>🔄 7주차: 역전파 훈련소 →</span>
                </button>
            </div>
        </div>
    );
}

function ControlRow({ label, value, min, max, step, color, onChange }) {
    return (
        <div className={s.controlRow}>
            <div className={s.controlRowHeader}>
                <span className={s.controlRowLabel} style={{ color }}>{label}</span>
                <span className={s.controlRowValue}>{value.toFixed(1)}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={s.controlRowInput}
                style={{ accentColor: color }}
            />
        </div>
    );
}
