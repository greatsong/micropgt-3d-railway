'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function RNNPELab() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('rnn');

    return (
        <div style={styles.container}>
            <Breadcrumb
                items={[{ label: '8주차 인트로', href: '/week8/intro' }]}
                current="시퀀스와 포지션"
            />
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={{ fontSize: '1.5rem', marginRight: 8 }}>〰️</span>
                    <span style={{ fontWeight: 700 }}>시퀀스와 포지션 실험실</span>
                </div>
            </div>

            <div style={styles.tabs}>
                {[
                    { id: 'rnn', label: '🧠 RNN 기억력' },
                    { id: 'lstm', label: '🔒 LSTM 게이트' },
                    { id: 'pe', label: '📍 포지셔널 인코딩' },
                    { id: 'compare', label: '⚔️ RNN vs Transformer' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        style={{ ...styles.tabBtn, ...(activeTab === tab.id ? styles.activeTab : {}) }}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                {activeTab === 'rnn' && <RNNVisualizer />}
                {activeTab === 'lstm' && <LSTMVisualizer />}
                {activeTab === 'pe' && <PEVisualizer />}
                {activeTab === 'compare' && <CompareSection />}
            </div>

            {/* 네비게이션 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 30, paddingBottom: 40 }}>
                <button onClick={() => router.push('/week8/intro')} style={{
                    padding: '10px 24px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem',
                }}>← 인트로로</button>
                <button className="btn-nova" onClick={() => router.push('/week10/intro')} style={{ padding: '10px 24px' }}>
                    <span>👁️ 10주차: 어텐션 →</span>
                </button>
            </div>
        </div>
    );
}

// ── RNN Visualizer ──
function RNNVisualizer() {
    const [sequence, setSequence] = useState([]);
    const [hiddenState, setHiddenState] = useState([]);

    const addInput = (char) => {
        if (sequence.length >= 8) return;
        const newSeq = [...sequence, char];
        const states = newSeq.map((c, idx) => ({
            char: c,
            strength: Math.pow(0.6, newSeq.length - 1 - idx),
        }));
        setHiddenState(states);
        setSequence(newSeq);
    };

    const reset = () => { setSequence([]); setHiddenState([]); };

    return (
        <div style={styles.card}>
            <h3 style={styles.label}>RNN 기억력 시뮬레이션</h3>
            <p style={styles.desc}>
                RNN은 새로운 정보가 들어올 때마다 과거의 기억이 희미해집니다.
                이를 <strong>기울기 소실 (Vanishing Gradient) 문제</strong>라고 합니다.
                기울기(gradient) 신호가 여러 층을 거치면서 거의 0에 가까워져,
                앞쪽 레이어가 학습을 할 수 없게 되는 현상입니다.
            </p>

            <div style={styles.controlPanel}>
                <div style={{ display: 'flex', gap: 10 }}>
                    {['A', 'B', 'C', 'D'].map(char => (
                        <button key={char} onClick={() => addInput(char)} style={styles.inputBtn} disabled={sequence.length >= 8}>
                            + {char}
                        </button>
                    ))}
                </div>
                <button onClick={reset} style={styles.resetBtn}>Reset</button>
            </div>

            <div style={styles.vizArea}>
                <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={styles.labelSmall}>입력 순서 (Time Steps)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>RNN은 단어를 하나씩 순서대로 읽으므로, 각 입력을 '시간 단계(Time Step)'라 부릅니다</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {sequence.map((char, i) => (
                                <div key={i} style={styles.seqBox}>{char}</div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div style={styles.labelSmall}>현재 RNN의 기억 상태 (Hidden State)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 6 }}>외부에서 직접 보이지 않고 RNN 내부에서만 유지되므로 '숨은 상태'라 부릅니다</div>
                        <div style={{ display: 'flex', gap: 10, minHeight: 60, alignItems: 'flex-end' }}>
                            {hiddenState.map((item, i) => (
                                <div key={i} style={{
                                    ...styles.memoryBox,
                                    opacity: Math.max(0.1, item.strength),
                                    transform: `scale(${0.8 + item.strength * 0.2})`,
                                    background: item.strength > 0.1 ? '#a78bfa' : '#4b5563',
                                }}>
                                    {item.char}
                                    <div style={{ fontSize: '0.6rem', marginTop: 2 }}>{(item.strength * 100).toFixed(0)}%</div>
                                </div>
                            ))}
                            {hiddenState.length === 0 && <span style={{ color: 'var(--text-dim)' }}>비어 있음</span>}
                        </div>
                    </div>
                </div>
            </div>
            <p style={styles.explanation}>
                투명도가 낮을수록(흐릴수록) 모델이 해당 정보를 잊어버리고 있다는 뜻입니다.
                LSTM 탭에서 이 문제의 해결책을 확인하세요!
            </p>
        </div>
    );
}

// ── LSTM Gate Visualizer ──
function LSTMVisualizer() {
    const [step, setStep] = useState(0);
    const [inputChar, setInputChar] = useState('X');
    const [cellState, setCellState] = useState(0.5);
    const [forgetGate, setForgetGate] = useState(0.8);
    const [inputGate, setInputGate] = useState(0.6);
    const [outputGate, setOutputGate] = useState(0.7);

    const candidateValue = 0.9; // ~tanh output
    const newCellState = cellState * forgetGate + inputGate * candidateValue;
    const hiddenOutput = outputGate * Math.tanh(newCellState);

    const gates = [
        {
            name: 'Forget Gate (잊기 게이트)',
            symbol: 'f',
            color: '#f43f5e',
            value: forgetGate,
            setter: setForgetGate,
            desc: '이전 기억 중 얼마나 지울지 결정',
            formula: 'f = σ(W_f · [h_{t-1}, x_t] + b_f)',
        },
        {
            name: 'Input Gate (입력 게이트)',
            symbol: 'i',
            color: '#10b981',
            value: inputGate,
            setter: setInputGate,
            desc: '새 정보를 얼마나 저장할지 결정',
            formula: 'i = σ(W_i · [h_{t-1}, x_t] + b_i)',
        },
        {
            name: 'Output Gate (출력 게이트)',
            symbol: 'o',
            color: '#3b82f6',
            value: outputGate,
            setter: setOutputGate,
            desc: '셀 상태 중 얼마나 출력할지 결정',
            formula: 'o = σ(W_o · [h_{t-1}, x_t] + b_o)',
        },
    ];

    return (
        <div style={styles.card}>
            <h3 style={styles.label}>LSTM (Long Short-Term Memory)</h3>
            <p style={styles.desc}>
                LSTM은 <strong>3개의 게이트</strong>로 기억을 정교하게 관리합니다.
                각 게이트의 슬라이더를 조절하며 셀 상태가 어떻게 변하는지 관찰하세요!
            </p>

            {/* 수식 기호 설명 */}
            <div style={{
                marginBottom: 20, padding: 14, borderRadius: 10,
                background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.15)',
                fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.8,
            }}>
                <strong>📐 수식 기호 읽는 법:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, listStyleType: 'disc' }}>
                    <li><strong style={{ color: '#fbbf24' }}>σ (시그마)</strong> = sigmoid 함수, 0~1 사이 값을 출력하는 <em>&quot;게이트를 열고 닫는 역할&quot;</em></li>
                    <li><strong style={{ color: '#fbbf24' }}>⊙</strong> = 원소별 곱셈 (각 숫자를 같은 위치끼리 곱함, element-wise multiplication)</li>
                    <li><strong style={{ color: '#fbbf24' }}>tanh</strong> = -1~1 사이로 압축하는 활성화 함수 (새 정보의 후보값을 만들 때 사용)</li>
                    <li><strong style={{ color: '#fbbf24' }}>W, h, x, b</strong> = W = 가중치(학습되는 숫자들), h{'{t-1}'} = 이전 기억, x_t = 현재 입력, b = 편향</li>
                </ul>
            </div>

            {/* 게이트 슬라이더 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {gates.map(g => (
                    <div key={g.symbol} style={{
                        padding: 14, borderRadius: 10,
                        background: `${g.color}08`, border: `1px solid ${g.color}30`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: g.color }}>{g.name}</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: g.color }}>{g.value.toFixed(2)}</span>
                        </div>
                        <input type="range" className="slider-cosmic" min={0} max={1} step={0.05}
                            value={g.value} onChange={(e) => g.setter(parseFloat(e.target.value))} style={{ width: '100%' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
                            <span>{g.desc}</span>
                            <code style={{ color: g.color, fontSize: '0.68rem' }}>{g.formula}</code>
                        </div>
                    </div>
                ))}
            </div>

            {/* LSTM 다이어그램 */}
            <div style={styles.vizArea}>
                <div style={{ width: '100%', textAlign: 'center' }}>
                    {/* 셀 상태 흐름 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={lstmStyles.stateBox}>
                            <div style={lstmStyles.stateLabel}>이전 셀 상태</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{cellState.toFixed(2)}</div>
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '1.5rem' }}>→</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                            <div style={{ ...lstmStyles.gateChip, background: '#f43f5e22', border: '1px solid #f43f5e44' }}>
                                × f={forgetGate.toFixed(2)}
                            </div>
                            <div style={{ color: 'var(--text-dim)' }}>+</div>
                            <div style={{ ...lstmStyles.gateChip, background: '#10b98122', border: '1px solid #10b98144' }}>
                                + i·C̃ = {(inputGate * candidateValue).toFixed(2)}
                            </div>
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '1.5rem' }}>→</div>
                        <div style={lstmStyles.stateBox}>
                            <div style={lstmStyles.stateLabel}>새 셀 상태</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{newCellState.toFixed(2)}</div>
                        </div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '1.5rem' }}>→</div>
                        <div style={lstmStyles.stateBox}>
                            <div style={lstmStyles.stateLabel}>출력 h_t</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{hiddenOutput.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* 이전 셀 상태 조절 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>이전 셀 상태:</span>
                        <input type="range" className="slider-cosmic" min={0} max={2} step={0.1}
                            value={cellState} onChange={(e) => setCellState(parseFloat(e.target.value))} style={{ width: 200 }} />
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>{cellState.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: 16, padding: 14, borderRadius: 10,
                background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)',
                fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6,
            }}>
                <strong>💡 핵심 포인트:</strong> Forget Gate가 1에 가까우면 이전 기억을 보존하고,
                0에 가까우면 잊어버립니다. 이 메커니즘 덕분에 LSTM은 긴 시퀀스에서도
                중요한 정보를 장기간 기억할 수 있습니다!
            </div>
        </div>
    );
}

// ── PE Visualizer with Heatmap ──
function PEVisualizer() {
    const [pos, setPos] = useState(0);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showDeepDive, setShowDeepDive] = useState(false);
    const d_model = 16;

    const getVector = (position) => {
        const vec = [];
        for (let i = 0; i < d_model; i++) {
            const angle = position / Math.pow(10000, (2 * Math.floor(i / 2)) / d_model);
            vec.push(i % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
        }
        return vec;
    };

    const vector = getVector(pos);

    // 히트맵: 여러 위치를 동시에 비교
    const heatmapPositions = Array.from({ length: 16 }, (_, i) => i);
    const heatmapData = useMemo(() =>
        heatmapPositions.map(p => getVector(p)),
        []
    );

    const getHeatColor = (v) => {
        if (v >= 0) return `rgba(167, 139, 250, ${v * 0.8 + 0.1})`;
        return `rgba(244, 63, 94, ${Math.abs(v) * 0.8 + 0.1})`;
    };

    return (
        <div style={styles.card}>
            <h3 style={styles.label}>Positional Encoding</h3>
            <p style={styles.desc}>
                Transformer는 모든 토큰을 동시에 처리하므로 순서 정보가 없어요.
                {' '}<strong>&apos;나는 너를 좋아해&apos;</strong>와 <strong>&apos;너는 나를 좋아해&apos;</strong>를
                구분하려면 각 토큰의 위치를 알려줘야 합니다.
                그래서 각 위치(Position)마다 고유한 <strong>&quot;주소(Encoding)&quot;</strong>를 더해주는 것이
                바로 Positional Encoding입니다.
            </p>

            {/* 뷰 모드 토글 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => setShowHeatmap(false)} style={{
                    ...styles.tabBtn, padding: '8px 16px', fontSize: '0.82rem',
                    ...(!showHeatmap ? styles.activeTab : {}),
                }}>
                    📊 단일 위치 뷰
                </button>
                <button onClick={() => setShowHeatmap(true)} style={{
                    ...styles.tabBtn, padding: '8px 16px', fontSize: '0.82rem',
                    ...(showHeatmap ? styles.activeTab : {}),
                }}>
                    🗺️ 히트맵 뷰
                </button>
            </div>

            {!showHeatmap ? (
                <>
                    <div style={styles.controlPanel}>
                        <label style={{ color: '#fff', marginRight: 10 }}>Position: {pos}</label>
                        <input type="range" min="0" max="50" value={pos}
                            onChange={(e) => setPos(parseInt(e.target.value))}
                            className="slider-cosmic" style={{ flex: 1 }} />
                    </div>
                    <div style={styles.vizArea}>
                        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '10px 0' }}>
                            {vector.map((val, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                                    <div style={{
                                        width: 20, height: 40, borderRadius: 4, marginBottom: 4,
                                        backgroundColor: val > 0 ? `rgba(167,139,250,${val})` : `rgba(244,63,94,${Math.abs(val)})`,
                                    }} />
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{i}</span>
                                    <span style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>{val.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div style={styles.vizArea}>
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 8, textAlign: 'center' }}>
                            행: 위치(position 0~15) / 열: 차원(dimension 0~15)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* 차원 헤더 */}
                            <div style={{ display: 'flex', gap: 2, marginLeft: 30 }}>
                                {Array.from({ length: d_model }, (_, i) => (
                                    <div key={i} style={{
                                        width: 28, textAlign: 'center',
                                        fontSize: '0.55rem', color: 'var(--text-dim)',
                                    }}>d{i}</div>
                                ))}
                            </div>
                            {/* 데이터 행 */}
                            {heatmapData.map((row, pi) => (
                                <div key={pi} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <div style={{
                                        width: 28, fontSize: '0.65rem',
                                        color: pi === pos ? '#fbbf24' : 'var(--text-dim)',
                                        fontWeight: pi === pos ? 700 : 400, textAlign: 'right', paddingRight: 4,
                                    }}>p{pi}</div>
                                    {row.map((val, di) => (
                                        <div key={di} style={{
                                            width: 28, height: 18, borderRadius: 2,
                                            background: getHeatColor(val),
                                            border: pi === pos ? '1px solid #fbbf24' : '1px solid transparent',
                                        }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 10 }}>
                            <span style={{ fontSize: '0.7rem', color: '#a78bfa' }}>■ 양수 (sin/cos &gt; 0)</span>
                            <span style={{ fontSize: '0.7rem', color: '#f43f5e' }}>■ 음수 (sin/cos &lt; 0)</span>
                        </div>
                    </div>
                </div>
            )}

            <p style={styles.explanation}>
                {showHeatmap
                    ? '각 위치마다 고유한 패턴이 만들어집니다. 저주파(왼쪽)는 천천히, 고주파(오른쪽)는 빠르게 변합니다.'
                    : '보라색은 양수(+), 붉은색은 음수(-). 위치를 움직이면 패턴이 물결치듯 변합니다!'}
            </p>

            {/* ── 한 걸음 더: 왜 sin/cos 함수를 쓸까? ── */}
            <div style={{
                borderRadius: 12,
                border: '1px solid rgba(124, 92, 252, 0.2)',
                overflow: 'hidden',
                marginTop: 20,
            }}>
                <button
                    onClick={() => setShowDeepDive(!showDeepDive)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(124, 92, 252, 0.08)',
                        border: 'none',
                        color: '#a78bfa',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    {showDeepDive ? '▼' : '▶'} 한 걸음 더: 왜 sin/cos 함수를 쓸까?
                </button>
                {showDeepDive && (
                    <div style={{
                        padding: 16,
                        background: 'rgba(124, 92, 252, 0.04)',
                        fontSize: '0.88rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.7,
                        textAlign: 'left',
                    }}>
                        <p style={{ marginBottom: 10 }}>
                            Positional Encoding에 sin/cos 함수를 사용하는 데는 명확한 이유가 있습니다:
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 20, listStyleType: 'disc' }}>
                            <li style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#a78bfa' }}>무한한 문장 길이 대응</strong> — sin/cos는 주기적(periodic)이라 아무리 긴 문장도 처리 가능합니다. 학습 때 본 적 없는 길이의 문장이 와도 위치를 표현할 수 있어요.
                            </li>
                            <li style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#a78bfa' }}>고유한 위치 표현</strong> — 서로 다른 주파수(frequency)를 사용해 각 위치를 고유하게 표현합니다. 마치 시계의 초침·분침·시침이 조합되어 매 순간 고유한 시각을 나타내는 것과 같아요.
                            </li>
                            <li>
                                <strong style={{ color: '#a78bfa' }}>학습 불필요 (고정값)</strong> — 학습 없이도 수학 공식으로 위치를 표현할 수 있어 효율적입니다. 모델의 파라미터 수를 늘리지 않으면서도 위치 정보를 제공합니다.
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── RNN vs Transformer 비교 ──
function CompareSection() {
    const [sentenceLen, setSentenceLen] = useState(5);

    const rnnMemory = Array.from({ length: sentenceLen }, (_, i) =>
        Math.pow(0.6, sentenceLen - 1 - i)
    );
    const transformerMemory = Array.from({ length: sentenceLen }, () => 1.0 / sentenceLen);

    return (
        <div style={styles.card}>
            <h3 style={styles.label}>RNN vs Transformer: 직접 비교</h3>
            <p style={styles.desc}>
                같은 길이의 문장을 처리할 때, RNN과 Transformer가 각 단어에 얼마나 &quot;주목&quot;하는지 비교해보세요.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>문장 길이:</span>
                <input type="range" className="slider-cosmic" min={3} max={12} step={1}
                    value={sentenceLen} onChange={(e) => setSentenceLen(parseInt(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa' }}>{sentenceLen}단어</span>
            </div>

            {/* RNN 기억 막대 */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f43f5e', marginBottom: 8 }}>
                    🧠 RNN — 마지막 단어에서 본 기억도
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                    {rnnMemory.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '100%', height: `${m * 80}px`, borderRadius: '4px 4px 0 0',
                                background: `rgba(244,63,94,${0.2 + m * 0.8})`,
                                transition: 'height 0.3s',
                            }} />
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 2 }}>w{i + 1}</span>
                            <span style={{ fontSize: '0.55rem', color: '#f43f5e' }}>{(m * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
                {sentenceLen >= 8 && (
                    <p style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6 }}>
                        ⚠️ 앞쪽 단어(w1, w2)의 기억이 거의 사라졌습니다!
                    </p>
                )}
            </div>

            {/* Transformer 기억 막대 */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', marginBottom: 8 }}>
                    ⚡ Transformer — 마지막 단어에서 본 기억도 (Self-Attention)
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 80 }}>
                    {transformerMemory.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '100%', height: `${m * sentenceLen * 80 / sentenceLen}px`,
                                borderRadius: '4px 4px 0 0',
                                background: `rgba(16,185,129,0.6)`,
                                minHeight: 10,
                            }} />
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: 2 }}>w{i + 1}</span>
                            <span style={{ fontSize: '0.55rem', color: '#10b981' }}>{(m * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: 6 }}>
                    모든 단어에 균등하게 접근 가능! (실제로는 Attention이 중요도에 따라 가중치 부여)
                </p>
            </div>

            {/* 비교표 */}
            <div style={{
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid rgba(167,139,250,0.2)', fontSize: '0.82rem',
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', background: 'rgba(167,139,250,0.08)' }}>
                    <div style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>특성</div>
                    <div style={{ padding: '8px 12px', fontWeight: 700, color: '#f43f5e' }}>RNN/LSTM</div>
                    <div style={{ padding: '8px 12px', fontWeight: 700, color: '#10b981' }}>Transformer</div>
                </div>
                {[
                    ['처리 방식', '순차 (하나씩)', '병렬 (한 번에)'],
                    ['속도', '느림 ❌', '빠름 ✅'],
                    ['긴 문장 처리', '어려움 (기억 소실)', '쉬움 (Attention)'],
                    ['학습 난이도', '쉬움', '데이터 많이 필요'],
                    ['대표 모델', 'LSTM, GRU(Gated Recurrent Unit: LSTM을 단순화한 모델, 게이트 2개)', 'GPT, BERT, LLaMA'],
                ].map(([feat, rnn, trans], i) => (
                    <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{feat}</div>
                        <div style={{ padding: '8px 12px', color: 'var(--text-dim)' }}>{rnn}</div>
                        <div style={{ padding: '8px 12px', color: 'var(--text-dim)' }}>{trans}</div>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: 16, padding: 14, borderRadius: 10,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6,
            }}>
                <strong>💡 결론:</strong> RNN의 &quot;순차 처리 + 기억 소실&quot; 한계를 극복하기 위해
                Transformer가 등장했고, 이것이 GPT/ChatGPT 혁명의 출발점입니다!
                대신 Transformer는 Position 정보를 직접 주입해야 합니다 (Positional Encoding).
                <br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Transformer는 Attention으로 모든 위치를 동시에 참조하므로 순서대로 처리할 필요가 없습니다</span>
            </div>
        </div>
    );
}

const lstmStyles = {
    stateBox: {
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(15,10,40,0.8)', border: '1px solid rgba(124,92,252,0.2)',
        textAlign: 'center', minWidth: 90,
    },
    stateLabel: {
        fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 4,
    },
    gateChip: {
        padding: '4px 12px', borderRadius: 6, border: '1px solid',
        fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)',
    },
};

const styles = {
    container: {
        minHeight: '100vh', padding: '20px', maxWidth: 900,
        margin: '0 auto', display: 'flex', flexDirection: 'column',
    },
    header: {
        display: 'flex', alignItems: 'center', marginBottom: 20,
        paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    backBtn: {
        background: 'none', border: 'none', color: 'var(--text-dim)',
        cursor: 'pointer', fontSize: '0.9rem', marginRight: 20,
    },
    headerTitle: {
        display: 'flex', alignItems: 'center', fontSize: '1.2rem', color: '#fff',
    },
    tabs: {
        display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
    },
    tabBtn: {
        flex: 1, minWidth: 120, padding: '10px', borderRadius: 8,
        background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
        fontWeight: 600, fontSize: '0.82rem',
    },
    activeTab: {
        background: 'rgba(167,139,250,0.2)', color: '#a78bfa',
        border: '1px solid rgba(167,139,250,0.3)',
    },
    content: {
        display: 'flex', flexDirection: 'column', gap: 20,
    },
    card: {
        background: 'rgba(15,10,40,0.6)', borderRadius: 16, padding: 24,
        border: '1px solid rgba(167,139,250,0.2)',
    },
    label: {
        fontSize: '1.1rem', color: '#fff', marginBottom: 8,
    },
    labelSmall: {
        fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8,
        textTransform: 'uppercase',
    },
    desc: {
        fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6,
    },
    controlPanel: {
        background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8,
        marginBottom: 20, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
    },
    inputBtn: {
        padding: '8px 16px', borderRadius: 6, background: '#a78bfa',
        color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer',
    },
    resetBtn: {
        padding: '8px 16px', borderRadius: 6, background: 'rgba(255,255,255,0.1)',
        color: '#fff', border: 'none', cursor: 'pointer',
    },
    vizArea: {
        minHeight: 150, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20,
    },
    seqBox: {
        width: 40, height: 40, background: 'rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, color: '#fff', fontWeight: 'bold',
    },
    memoryBox: {
        width: 50, height: 50, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', borderRadius: 8,
        color: '#000', fontWeight: 'bold', transition: 'all 0.3s', fontSize: '1rem',
    },
    explanation: {
        marginTop: 16, fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.6,
    },
};
