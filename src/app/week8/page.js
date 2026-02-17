'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

export default function RNNPELab() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('rnn');

    return (
        <div className={s.container}>
            <Breadcrumb
                items={[{ label: '8주차 인트로', href: '/week8/intro' }]}
                current="시퀀스와 포지션"
            />
            <div className={s.header}>
                <div className={s.headerTitle}>
                    <span className={s.headerIcon}>〰️</span>
                    <span className={s.headerText}>시퀀스와 포지션 실험실</span>
                </div>
            </div>

            <div className={s.tabs}>
                {[
                    { id: 'rnn', label: '🧠 RNN 기억력' },
                    { id: 'lstm', label: '🔒 LSTM 게이트' },
                    { id: 'pe', label: '📍 포지셔널 인코딩' },
                    { id: 'compare', label: '⚔️ RNN vs Transformer' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`${s.tabBtn} ${activeTab === tab.id ? s.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={s.content}>
                {activeTab === 'rnn' && <RNNVisualizer />}
                {activeTab === 'lstm' && <LSTMVisualizer />}
                {activeTab === 'pe' && <PEVisualizer />}
                {activeTab === 'compare' && <CompareSection />}
            </div>

            {/* 네비게이션 */}
            <div className={s.navRow}>
                <button onClick={() => router.push('/week8/intro')} className={s.navBackBtn}>← 인트로로</button>
                <button className={`btn-nova ${s.navNextBtn}`} onClick={() => router.push('/week10/intro')}>
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
        <div className={s.card}>
            <h3 className={s.label}>RNN 기억력 시뮬레이션</h3>
            <p className={s.desc}>
                RNN은 새로운 정보가 들어올 때마다 과거의 기억이 희미해집니다.
                이를 <strong>기울기 소실 (Vanishing Gradient) 문제</strong>라고 합니다.
                기울기(gradient) 신호가 여러 층을 거치면서 거의 0에 가까워져,
                앞쪽 레이어가 학습을 할 수 없게 되는 현상입니다.
            </p>

            <div className={s.controlPanel}>
                <div className={s.flexGap10}>
                    {['A', 'B', 'C', 'D'].map(char => (
                        <button key={char} onClick={() => addInput(char)} className={s.inputBtn} disabled={sequence.length >= 8}>
                            + {char}
                        </button>
                    ))}
                </div>
                <button onClick={reset} className={s.resetBtn}>Reset</button>
            </div>

            <div className={s.vizArea}>
                <div className={s.fullWidth}>
                    <div className={s.mb20}>
                        <div className={s.labelSmall}>입력 순서 (Time Steps)</div>
                        <div className={s.hintText}>RNN은 단어를 하나씩 순서대로 읽으므로, 각 입력을 '시간 단계(Time Step)'라 부릅니다</div>
                        <div className={s.flexGap10}>
                            {sequence.map((char, i) => (
                                <div key={i} className={s.seqBox}>{char}</div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className={s.labelSmall}>현재 RNN의 기억 상태 (Hidden State)</div>
                        <div className={s.hintText}>외부에서 직접 보이지 않고 RNN 내부에서만 유지되므로 '숨은 상태'라 부릅니다</div>
                        <div className={s.flexGap10End}>
                            {hiddenState.map((item, i) => (
                                <div key={i} className={s.memoryBox} style={{
                                    opacity: Math.max(0.1, item.strength),
                                    transform: `scale(${0.8 + item.strength * 0.2})`,
                                    background: item.strength > 0.1 ? '#a78bfa' : '#4b5563',
                                }}>
                                    {item.char}
                                    <div className={s.memoryPercent}>{(item.strength * 100).toFixed(0)}%</div>
                                </div>
                            ))}
                            {hiddenState.length === 0 && <span className={s.emptyText}>비어 있음</span>}
                        </div>
                    </div>
                </div>
            </div>
            <p className={s.explanation}>
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
        <div className={s.card}>
            <h3 className={s.label}>LSTM (Long Short-Term Memory)</h3>
            <p className={s.desc}>
                LSTM은 <strong>3개의 게이트</strong>로 기억을 정교하게 관리합니다.
                각 게이트의 슬라이더를 조절하며 셀 상태가 어떻게 변하는지 관찰하세요!
            </p>

            {/* 수식 기호 설명 */}
            <div className={s.formulaBox}>
                <strong>📐 수식 기호 읽는 법:</strong>
                <ul className={s.formulaList}>
                    <li><strong className={s.symbolHighlight}>σ (시그마)</strong> = sigmoid 함수, 0~1 사이 값을 출력하는 <em>&quot;게이트를 열고 닫는 역할&quot;</em></li>
                    <li><strong className={s.symbolHighlight}>⊙</strong> = 원소별 곱셈 (각 숫자를 같은 위치끼리 곱함, element-wise multiplication)</li>
                    <li><strong className={s.symbolHighlight}>tanh</strong> = -1~1 사이로 압축하는 활성화 함수 (새 정보의 후보값을 만들 때 사용)</li>
                    <li><strong className={s.symbolHighlight}>W, h, x, b</strong> = W = 가중치(학습되는 숫자들), h{'{t-1}'} = 이전 기억, x_t = 현재 입력, b = 편향</li>
                </ul>
            </div>

            {/* 게이트 슬라이더 */}
            <div className={s.gateSliders}>
                {gates.map(g => (
                    <div key={g.symbol} className={s.gateSliderBox} style={{
                        background: `${g.color}08`, border: `1px solid ${g.color}30`,
                    }}>
                        <div className={s.gateSliderRow}>
                            <span className={s.gateSliderName} style={{ color: g.color }}>{g.name}</span>
                            <span className={s.gateSliderValue} style={{ color: g.color }}>{g.value.toFixed(2)}</span>
                        </div>
                        <input type="range" className={`slider-cosmic ${s.sliderFull}`} min={0} max={1} step={0.05}
                            value={g.value} onChange={(e) => g.setter(parseFloat(e.target.value))} />
                        <div className={s.gateSliderFooter}>
                            <span>{g.desc}</span>
                            <code className={s.gateFormula} style={{ color: g.color }}>{g.formula}</code>
                        </div>
                    </div>
                ))}
            </div>

            {/* LSTM 다이어그램 */}
            <div className={s.vizArea}>
                <div className={s.fullWidthCenter}>
                    {/* 셀 상태 흐름 */}
                    <div className={s.cellStateFlow}>
                        <div className={s.stateBox}>
                            <div className={s.stateLabel}>이전 셀 상태</div>
                            <div className={s.stateValYellow}>{cellState.toFixed(2)}</div>
                        </div>
                        <div className={s.arrowText}>→</div>
                        <div className={s.gateColumn}>
                            <div className={s.forgetGateChip}>
                                × f={forgetGate.toFixed(2)}
                            </div>
                            <div className={s.plusText}>+</div>
                            <div className={s.inputGateChip}>
                                + i·C̃ = {(inputGate * candidateValue).toFixed(2)}
                            </div>
                        </div>
                        <div className={s.arrowText}>→</div>
                        <div className={s.stateBox}>
                            <div className={s.stateLabel}>새 셀 상태</div>
                            <div className={s.stateValGreen}>{newCellState.toFixed(2)}</div>
                        </div>
                        <div className={s.arrowText}>→</div>
                        <div className={s.stateBox}>
                            <div className={s.stateLabel}>출력 h_t</div>
                            <div className={s.stateValBlue}>{hiddenOutput.toFixed(2)}</div>
                        </div>
                    </div>

                    {/* 이전 셀 상태 조절 */}
                    <div className={s.cellSliderRow}>
                        <span className={s.cellSliderLabel}>이전 셀 상태:</span>
                        <input type="range" className={`slider-cosmic ${s.cellSliderWidth}`} min={0} max={2} step={0.1}
                            value={cellState} onChange={(e) => setCellState(parseFloat(e.target.value))} />
                        <span className={s.cellSliderVal}>{cellState.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <div className={s.keyPointBox}>
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
        <div className={s.card}>
            <h3 className={s.label}>Positional Encoding</h3>
            <p className={s.desc}>
                Transformer는 모든 토큰을 동시에 처리하므로 순서 정보가 없어요.
                {' '}<strong>&apos;나는 너를 좋아해&apos;</strong>와 <strong>&apos;너는 나를 좋아해&apos;</strong>를
                구분하려면 각 토큰의 위치를 알려줘야 합니다.
                그래서 각 위치(Position)마다 고유한 <strong>&quot;주소(Encoding)&quot;</strong>를 더해주는 것이
                바로 Positional Encoding입니다.
            </p>

            {/* 뷰 모드 토글 */}
            <div className={s.viewToggle}>
                <button onClick={() => setShowHeatmap(false)}
                    className={`${s.tabBtnSmall} ${!showHeatmap ? s.activeTab : ''}`}>
                    📊 단일 위치 뷰
                </button>
                <button onClick={() => setShowHeatmap(true)}
                    className={`${s.tabBtnSmall} ${showHeatmap ? s.activeTab : ''}`}>
                    🗺️ 히트맵 뷰
                </button>
            </div>

            {!showHeatmap ? (
                <>
                    <div className={s.controlPanel}>
                        <label className={s.peLabel}>Position: {pos}</label>
                        <input type="range" min="0" max="50" value={pos}
                            onChange={(e) => setPos(parseInt(e.target.value))}
                            className={`slider-cosmic ${s.sliderFlex1}`} />
                    </div>
                    <div className={s.vizArea}>
                        <div className={s.peVectorRow}>
                            {vector.map((val, i) => (
                                <div key={i} className={s.peVectorCol}>
                                    <div className={s.peVectorBar} style={{
                                        backgroundColor: val > 0 ? `rgba(167,139,250,${val})` : `rgba(244,63,94,${Math.abs(val)})`,
                                    }} />
                                    <span className={s.dimLabel}>{i}</span>
                                    <span className={s.valLabel}>{val.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className={s.vizArea}>
                    <div className={s.heatmapWrap}>
                        <div className={s.heatmapCaption}>
                            행: 위치(position 0~15) / 열: 차원(dimension 0~15)
                        </div>
                        <div className={s.heatmapGrid}>
                            {/* 차원 헤더 */}
                            <div className={s.heatmapHeaderRow}>
                                {Array.from({ length: d_model }, (_, i) => (
                                    <div key={i} className={s.heatmapHeaderCell}>d{i}</div>
                                ))}
                            </div>
                            {/* 데이터 행 */}
                            {heatmapData.map((row, pi) => (
                                <div key={pi} className={s.heatmapRow}>
                                    <div className={s.heatmapRowLabel} style={{
                                        color: pi === pos ? '#fbbf24' : 'var(--text-dim)',
                                        fontWeight: pi === pos ? 700 : 400,
                                    }}>p{pi}</div>
                                    {row.map((val, di) => (
                                        <div key={di} className={s.heatmapCell} style={{
                                            background: getHeatColor(val),
                                            border: pi === pos ? '1px solid #fbbf24' : '1px solid transparent',
                                        }} />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className={s.heatmapLegend}>
                            <span className={s.legendPositive}>■ 양수 (sin/cos &gt; 0)</span>
                            <span className={s.legendNegative}>■ 음수 (sin/cos &lt; 0)</span>
                        </div>
                    </div>
                </div>
            )}

            <p className={s.explanation}>
                {showHeatmap
                    ? '각 위치마다 고유한 패턴이 만들어집니다. 저주파(왼쪽)는 천천히, 고주파(오른쪽)는 빠르게 변합니다.'
                    : '보라색은 양수(+), 붉은색은 음수(-). 위치를 움직이면 패턴이 물결치듯 변합니다!'}
            </p>

            {/* ── 한 걸음 더: 왜 sin/cos 함수를 쓸까? ── */}
            <div className={s.deepDiveWrap}>
                <button
                    onClick={() => setShowDeepDive(!showDeepDive)}
                    className={s.deepDiveToggle}
                >
                    {showDeepDive ? '▼' : '▶'} 한 걸음 더: 왜 sin/cos 함수를 쓸까?
                </button>
                {showDeepDive && (
                    <div className={s.deepDiveContent}>
                        <p className={s.deepDiveP}>
                            Positional Encoding에 sin/cos 함수를 사용하는 데는 명확한 이유가 있습니다:
                        </p>
                        <ul className={s.deepDiveList}>
                            <li className={s.deepDiveLi}>
                                <strong className={s.deepDiveHighlight}>무한한 문장 길이 대응</strong> — sin/cos는 주기적(periodic)이라 아무리 긴 문장도 처리 가능합니다. 학습 때 본 적 없는 길이의 문장이 와도 위치를 표현할 수 있어요.
                            </li>
                            <li className={s.deepDiveLi}>
                                <strong className={s.deepDiveHighlight}>고유한 위치 표현</strong> — 서로 다른 주파수(frequency)를 사용해 각 위치를 고유하게 표현합니다. 마치 시계의 초침·분침·시침이 조합되어 매 순간 고유한 시각을 나타내는 것과 같아요.
                            </li>
                            <li>
                                <strong className={s.deepDiveHighlight}>학습 불필요 (고정값)</strong> — 학습 없이도 수학 공식으로 위치를 표현할 수 있어 효율적입니다. 모델의 파라미터 수를 늘리지 않으면서도 위치 정보를 제공합니다.
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
        <div className={s.card}>
            <h3 className={s.label}>RNN vs Transformer: 직접 비교</h3>
            <p className={s.desc}>
                같은 길이의 문장을 처리할 때, RNN과 Transformer가 각 단어에 얼마나 &quot;주목&quot;하는지 비교해보세요.
            </p>

            <div className={s.sentenceLenRow}>
                <span className={s.sentenceLenLabel}>문장 길이:</span>
                <input type="range" className={`slider-cosmic ${s.sliderFlex1}`} min={3} max={12} step={1}
                    value={sentenceLen} onChange={(e) => setSentenceLen(parseInt(e.target.value))} />
                <span className={s.sentenceLenValue}>{sentenceLen}단어</span>
            </div>

            {/* RNN 기억 막대 */}
            <div className={s.compareBlock}>
                <div className={s.rnnTitle}>
                    🧠 RNN — 마지막 단어에서 본 기억도
                </div>
                <div className={s.barRow}>
                    {rnnMemory.map((m, i) => (
                        <div key={i} className={s.barCol}>
                            <div className={s.rnnBarRound} style={{
                                height: `${m * 80}px`,
                                background: `rgba(244,63,94,${0.2 + m * 0.8})`,
                            }} />
                            <span className={s.barColLabel}>w{i + 1}</span>
                            <span className={s.rnnBarPercent}>{(m * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
                {sentenceLen >= 8 && (
                    <p className={s.rnnWarning}>
                        ⚠️ 앞쪽 단어(w1, w2)의 기억이 거의 사라졌습니다!
                    </p>
                )}
            </div>

            {/* Transformer 기억 막대 */}
            <div className={s.compareBlock}>
                <div className={s.transformerTitle}>
                    ⚡ Transformer — 마지막 단어에서 본 기억도 (Self-Attention)
                </div>
                <div className={s.barRow}>
                    {transformerMemory.map((m, i) => (
                        <div key={i} className={s.barCol}>
                            <div className={s.transformerBar} style={{
                                height: `${m * sentenceLen * 80 / sentenceLen}px`,
                            }} />
                            <span className={s.barColLabel}>w{i + 1}</span>
                            <span className={s.transformerBarPercent}>{(m * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
                <p className={s.transformerNote}>
                    모든 단어에 균등하게 접근 가능! (실제로는 Attention이 중요도에 따라 가중치 부여)
                </p>
            </div>

            {/* 비교표 */}
            <div className={s.compareTable}>
                <div className={s.compareHeaderRow}>
                    <div className={s.compareHeaderCell}>특성</div>
                    <div className={s.compareHeaderRnn}>RNN/LSTM</div>
                    <div className={s.compareHeaderTrans}>Transformer</div>
                </div>
                {[
                    ['처리 방식', '순차 (하나씩)', '병렬 (한 번에)'],
                    ['속도', '느림 ❌', '빠름 ✅'],
                    ['긴 문장 처리', '어려움 (기억 소실)', '쉬움 (Attention)'],
                    ['학습 난이도', '쉬움', '데이터 많이 필요'],
                    ['대표 모델', 'LSTM, GRU(Gated Recurrent Unit: LSTM을 단순화한 모델, 게이트 2개)', 'GPT, BERT, LLaMA'],
                ].map(([feat, rnn, trans], i) => (
                    <div key={i} className={s.compareDataRow}>
                        <div className={s.compareFeatureCell}>{feat}</div>
                        <div className={s.compareValueCell}>{rnn}</div>
                        <div className={s.compareValueCell}>{trans}</div>
                    </div>
                ))}
            </div>

            <div className={s.conclusionBox}>
                <strong>💡 결론:</strong> RNN의 &quot;순차 처리 + 기억 소실&quot; 한계를 극복하기 위해
                Transformer가 등장했고, 이것이 GPT/ChatGPT 혁명의 출발점입니다!
                대신 Transformer는 Position 정보를 직접 주입해야 합니다 (Positional Encoding).
                <br /><span className={s.conclusionFootnote}>Transformer는 Attention으로 모든 위치를 동시에 참조하므로 순서대로 처리할 필요가 없습니다</span>
            </div>
        </div>
    );
}
