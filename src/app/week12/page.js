'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

// ── 정규화 함수들 ──
function batchNorm(data) {
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length;
    return data.map(v => (v - mean) / (Math.sqrt(variance) + 1e-6));
}

function layerNorm(data) {
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + (v - mean) ** 2, 0) / data.length;
    return data.map(v => (v - mean) / (Math.sqrt(variance) + 1e-6));
}

function rmsNorm(data) {
    const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length) + 1e-6;
    return data.map(v => v / rms);
}

// ── 훈련 시뮬레이션 (간소화) ──
function simulateTraining(withNorm) {
    const steps = 30;
    const losses = [];
    let loss = 3.0;
    for (let i = 0; i < steps; i++) {
        if (withNorm) {
            loss *= (0.88 + Math.random() * 0.06);
            if (loss < 0.1) loss = 0.08 + Math.random() * 0.05;
        } else {
            if (i < 10) {
                loss *= (0.9 + Math.random() * 0.15);
            } else if (i < 18) {
                loss *= (0.95 + Math.random() * 0.2);
            } else {
                loss *= (1.0 + Math.random() * 0.3);
                if (loss > 10) loss = 8 + Math.random() * 5;
            }
        }
        losses.push(Math.min(loss, 15));
    }
    return losses;
}

// ── Norm 비교 데이터 ──
const NORM_COMPARISON = [
    {
        name: 'Batch Norm',
        formula: 'BN(x) = (x − μ_B) / √(σ²_B + ε)',
        desc: '미니배치(mini-batch: 전체 데이터를 한 번에 처리하면 메모리가 부족하므로, 작은 묶음으로 나눠서 학습) 내의 같은 채널(channel: 데이터의 각 특성. 이미지에서는 RGB 색상, NLP에서는 임베딩의 각 차원) 값들로 평균/분산 계산',
        pros: 'CNN(합성곱 신경망: 이미지 처리에 특화된 신경망)에서 매우 효과적, 정규화 효과',
        cons: '배치 크기 의존, 추론(추론 = 학습이 끝난 모델을 실제로 사용하는 단계) 시 별도 통계 필요',
        usedIn: 'ResNet, VGG 등 CNN',
        color: '#3b82f6',
    },
    {
        name: 'Layer Norm',
        formula: 'LN(x) = (x − μ_L) / √(σ²_L + ε)',
        desc: '하나의 샘플 내 모든 은닉값으로 평균/분산 계산',
        pros: '배치 크기 무관, 시퀀스 모델에 적합',
        cons: 'RMSNorm보다 약간 느림 (평균 계산 추가)',
        usedIn: 'GPT-2, GPT-3, BERT',
        color: '#8b5cf6',
    },
    {
        name: 'RMS Norm',
        formula: 'RMSNorm(x) = x / √(mean(x²) + ε)',
        desc: '평균을 빼지 않고, RMS(제곱평균제곱근)로만 나눔',
        pros: 'LayerNorm보다 빠름 (평균 계산 생략), 성능 동등',
        cons: '비교적 최신 기법, 일부 모델에서 불안정',
        usedIn: 'LLaMA, Gemma, Mistral',
        color: '#f59e0b',
    },
];

// ── 레이어 폭발/소실 시뮬레이션 ──
function simulateLayers(numLayers, withNorm) {
    const result = [];
    let value = 1.0;
    for (let i = 0; i < numLayers; i++) {
        const weight = 1.1 + Math.sin(i * 0.5) * 0.3;
        value *= weight;
        if (withNorm) {
            const rms = Math.abs(value) + 1e-6;
            value = value / rms;
        }
        result.push({ layer: i + 1, value: Math.min(Math.abs(value), 100) });
    }
    return result;
}

export default function Week12Page() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('rms');
    const [scale, setScale] = useState(1.0);
    const [data] = useState(() => Array.from({ length: 50 }, () => (Math.random() - 0.5) * 2));

    // 훈련 시뮬레이션
    const [isTraining, setIsTraining] = useState(false);
    const [trainStep, setTrainStep] = useState(0);
    const [lossWithNorm] = useState(() => simulateTraining(true));
    const [lossWithoutNorm] = useState(() => simulateTraining(false));

    // 레이어 폭발/소실
    const [numLayers, setNumLayers] = useState(10);

    // Norm 비교 선택
    const [selectedNorm, setSelectedNorm] = useState('rms');

    // ── 한 걸음 더 (Deep Dive) ──
    const [showDeepDive, setShowDeepDive] = useState(false);
    const [normInput] = useState(() => [2.5, -1.2, 0.8, 3.1, -0.5, 1.7, -2.8, 0.3]);

    // ── RMS 기본 계산 ──
    const scaledData = data.map(d => d * scale);
    const rms = Math.sqrt(scaledData.reduce((sum, v) => sum + v * v, 0) / scaledData.length) + 1e-6;
    const normalizedData = scaledData.map(d => d / rms);

    // ── Norm 비교 결과 ──
    const normResults = {
        batch: batchNorm(normInput),
        layer: layerNorm(normInput),
        rms: rmsNorm(normInput),
    };

    // ── 레이어 통과 시뮬레이션 ──
    const layersWithNorm = simulateLayers(numLayers, true);
    const layersWithoutNorm = simulateLayers(numLayers, false);

    // ── 훈련 애니메이션 ──
    useEffect(() => {
        if (!isTraining) return;
        if (trainStep >= 29) { setIsTraining(false); return; }
        const timer = setTimeout(() => setTrainStep(st => st + 1), 200);
        return () => clearTimeout(timer);
    }, [isTraining, trainStep]);

    const startTraining = useCallback(() => {
        setTrainStep(0);
        setIsTraining(true);
    }, []);

    const tabs = [
        { id: 'rms', label: 'RMS 정규화' },
        { id: 'compare', label: 'Norm 비교' },
        { id: 'training', label: '훈련 시뮬레이션' },
        { id: 'explosion', label: '값 폭발/소실' },
    ];

    return (
        <div className={s.container}>
            <Breadcrumb
                items={[{ label: '12주차 인트로', href: '/week12/intro' }]}
                current="정규화 실험실"
            />
            <div className={s.header}>
                <h1 className={s.title}>⚡ 12주차: 정규화 (Normalization)</h1>
            </div>
            <div className={s.introDesc}>신경망에서 데이터가 층을 지날 때마다 숫자 크기가 제멋대로 변합니다. 정규화는 이를 일정한 범위로 맞춰주는 기술입니다.</div>

            {/* ── 탭 네비게이션 ── */}
            <div className={s.tabBar}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${s.tabBtn} ${activeTab === tab.id ? s.tabBtnActive : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={s.content}>

                {/* ═══ 탭 1: RMS 정규화 기본 ═══ */}
                {activeTab === 'rms' && (
                    <>
                        <div className={s.controlPanel}>
                            <h2 className={s.panelTitle}>🎚️ 입력 데이터 크기 조절</h2>
                            <p className={s.desc}>
                                슬라이더를 올려 입력값의 <strong>분산(Variance)</strong>을 키워보세요!
                                값이 커져도 정규화 후에는 항상 일정한 범위로 돌아옵니다.
                            </p>
                            <div className={s.sliderRow}>
                                <span className={s.sliderLabel}>입력 배율: x{scale.toFixed(1)}</span>
                                <input
                                    type="range" min="0.1" max="10" step="0.1"
                                    value={scale} onChange={e => setScale(parseFloat(e.target.value))}
                                    className={`slider-cosmic ${s.sliderFull}`}
                                />
                            </div>
                            {scale > 5 && (
                                <div className={s.warningBox}>
                                    ⚠️ 입력값이 매우 큽니다! 정규화 없이는 학습이 불안정해질 수 있는 수준입니다.
                                </div>
                            )}
                        </div>

                        <div className={s.vizRow}>
                            <div className={s.vizCard}>
                                <h3 className={s.vizCardTitleRed}>🔴 정규화 전 (Raw)</h3>
                                <div className={s.scatterBox}>
                                    {scaledData.map((val, i) => (
                                        <div key={i} className={s.dot} style={{
                                            left: `${(i / 50) * 100}%`,
                                            top: '50%',
                                            transform: `translate(-50%, calc(-50% + ${-val * (scale > 3 ? 10 : 20)}px))`,
                                            background: '#f43f5e',
                                            opacity: 0.6
                                        }} />
                                    ))}
                                    <div className={s.axis} />
                                </div>
                                <p className={s.statLabel}>
                                    범위: {Math.min(...scaledData).toFixed(1)} ~ {Math.max(...scaledData).toFixed(1)}
                                </p>
                            </div>

                            <div className={s.arrowContainer}>
                                <span className={s.arrowEmoji}>➡️</span>
                                <div className={s.rmsValue}>RMS: {rms.toFixed(2)}</div>
                                <div className={s.opBadge}>÷ RMS</div>
                            </div>

                            <div className={s.vizCard}>
                                <h3 className={s.vizCardTitleGreen}>🟢 정규화 후 (RMSNorm)</h3>
                                <div className={s.scatterBox}>
                                    {normalizedData.map((val, i) => (
                                        <div key={i} className={s.dot} style={{
                                            left: `${(i / 50) * 100}%`,
                                            top: '50%',
                                            transform: `translate(-50%, calc(-50% + ${-val * 20}px))`,
                                            background: '#10b981',
                                            opacity: 0.8
                                        }} />
                                    ))}
                                    <div className={s.axis} />
                                </div>
                                <p className={s.statLabel}>안정 범위: ≈ -1.0 ~ 1.0</p>
                            </div>
                        </div>

                        <div className={s.formulaBox}>
                            <div className={s.formulaTitle}>📐 RMSNorm 공식</div>
                            <div className={s.formula}>
                                RMSNorm(x) = x / √( (1/n) Σ xᵢ² + ε )
                            </div>
                            <div className={s.formulaSub}>
                                Σ = 모두 더한다, n = 벡터의 원소 개수
                            </div>
                            <p className={s.formulaDesc}>
                                평균을 빼지 않고, 제곱 평균의 제곱근(RMS)으로만 나누어 정규화합니다.
                                LayerNorm보다 연산이 적어 LLaMA, Mistral 등 최신 LLM에서 사용합니다.
                            </p>
                            <div className={s.epsilonNote}>
                                <strong className={s.epsilonLabel}>ε(엡실론)</strong> = 아주 작은 수(예: 0.00001). 분모가 0이 되는 것을 막기 위한 안전장치입니다.
                            </div>
                        </div>
                    </>
                )}

                {/* ═══ 탭 2: Norm 종류 비교 ═══ */}
                {activeTab === 'compare' && (
                    <>
                        <div className={s.theoryCard}>
                            <h3 className={s.theoryTitle}>📊 정규화 기법 비교</h3>
                            <p className={s.desc}>
                                같은 입력 데이터에 3가지 정규화를 적용한 결과를 비교해보세요.
                                아래 버튼으로 각 방식을 선택하면 계산 과정과 결과가 표시됩니다.
                            </p>
                        </div>

                        {/* Norm 선택 버튼 */}
                        <div className={s.normBtnRow}>
                            {NORM_COMPARISON.map(n => (
                                <button
                                    key={n.name}
                                    onClick={() => setSelectedNorm(n.name === 'Batch Norm' ? 'batch' : n.name === 'Layer Norm' ? 'layer' : 'rms')}
                                    className={s.normBtn}
                                    style={{
                                        borderColor: n.color,
                                        background: (selectedNorm === 'batch' && n.name === 'Batch Norm') ||
                                            (selectedNorm === 'layer' && n.name === 'Layer Norm') ||
                                            (selectedNorm === 'rms' && n.name === 'RMS Norm')
                                            ? n.color + '30' : 'transparent',
                                        color: n.color,
                                    }}
                                >
                                    {n.name}
                                </button>
                            ))}
                        </div>

                        {/* 입력 데이터 */}
                        <div className={s.dataPanel}>
                            <div className={s.dataPanelTitle}>입력 벡터 x = </div>
                            <div className={s.dataValues}>
                                {normInput.map((v, i) => (
                                    <span key={i} className={s.dataChip}>{v.toFixed(1)}</span>
                                ))}
                            </div>
                        </div>

                        {/* 출력 비교 바 차트 */}
                        <div className={s.barChartPanel}>
                            <h3 className={s.barChartTitle}>
                                {selectedNorm === 'batch' ? 'Batch Norm' : selectedNorm === 'layer' ? 'Layer Norm' : 'RMS Norm'} 결과
                            </h3>
                            <div className={s.barChart}>
                                {normResults[selectedNorm].map((v, i) => {
                                    const barHeight = Math.abs(v) * 60;
                                    const isNeg = v < 0;
                                    const color = NORM_COMPARISON.find(n =>
                                        (selectedNorm === 'batch' && n.name === 'Batch Norm') ||
                                        (selectedNorm === 'layer' && n.name === 'Layer Norm') ||
                                        (selectedNorm === 'rms' && n.name === 'RMS Norm')
                                    )?.color || '#fff';
                                    return (
                                        <div key={i} className={s.barCol}>
                                            <div className={s.barTop} style={{
                                                height: isNeg ? 0 : barHeight,
                                                background: color,
                                            }} />
                                            <div className={s.barZeroLine} />
                                            <div className={s.barBottom} style={{
                                                height: isNeg ? barHeight : 0,
                                                background: color,
                                                opacity: 0.6,
                                            }} />
                                            <span className={s.barLabel}>{v.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 비교 테이블 */}
                        <div className={s.compTable}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th className={s.th}>특징</th>
                                        {NORM_COMPARISON.map(n => (
                                            <th key={n.name} className={s.th} style={{ color: n.color }}>{n.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={s.td}>공식</td>
                                        {NORM_COMPARISON.map(n => (
                                            <td key={n.name} className={`${s.td} ${s.tdFormula}`}>{n.formula}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={s.td}>계산 방식</td>
                                        {NORM_COMPARISON.map(n => (
                                            <td key={n.name} className={s.td}>{n.desc}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={s.td}>장점</td>
                                        {NORM_COMPARISON.map(n => (
                                            <td key={n.name} className={`${s.td} ${s.tdPros}`}>{n.pros}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={s.td}>단점</td>
                                        {NORM_COMPARISON.map(n => (
                                            <td key={n.name} className={`${s.td} ${s.tdCons}`}>{n.cons}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className={s.td}>사용 모델</td>
                                        {NORM_COMPARISON.map(n => (
                                            <td key={n.name} className={`${s.td} ${s.tdBold}`}>{n.usedIn}</td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className={s.infoBox}>
                            💡 <strong>핵심 차이:</strong> BatchNorm은 <em>배치 간 통계</em>, LayerNorm은 <em>샘플 내 통계</em>,
                            RMSNorm은 <em>평균 없이 RMS만</em> 사용합니다. Transformer 계열 모델은 LayerNorm/RMSNorm을 사용합니다.
                            <br /><span className={s.infoBoxSub}>Transformer가 LayerNorm을 쓰는 이유: 문장 길이가 다양하고, 배치 내 문장들이 서로 다른 맥락이므로 배치 단위 통계가 의미 없어 LayerNorm 사용</span>
                        </div>
                        <div className={s.channelNote}>
                            <strong className={s.channelLabel}>채널(channel)</strong> = 데이터의 각 특성(feature)을 의미합니다. 이미지에서는 RGB 색상, NLP에서는 임베딩의 각 차원이 채널입니다.
                        </div>
                    </>
                )}

                {/* ═══ 탭 3: 훈련 시뮬레이션 ═══ */}
                {activeTab === 'training' && (
                    <>
                        <div className={s.theoryCard}>
                            <h3 className={s.theoryTitle}>🏋️ 정규화 유무에 따른 훈련 비교</h3>
                            <p className={s.desc}>
                                같은 모델을 정규화 <strong>있이</strong> vs <strong>없이</strong> 훈련시키면 어떤 차이가 날까요?
                                &quot;훈련 시작&quot; 버튼을 눌러 비교해보세요!
                            </p>
                        </div>

                        <button onClick={startTraining} className={s.trainBtn}>
                            {isTraining ? '⏳ 훈련 중...' : '🚀 훈련 시작'}
                        </button>

                        <div className={s.trainChartRow}>
                            {/* 정규화 있는 훈련 */}
                            <div className={s.trainCard}>
                                <h3 className={s.trainCardTitleGreen}>✅ 정규화 적용</h3>
                                <div className={s.lossChart}>
                                    {lossWithNorm.slice(0, trainStep + 1).map((loss, i) => {
                                        const h = Math.min((loss / 3.5) * 100, 100);
                                        return (
                                            <div key={i} className={s.lossBarCol}>
                                                <div className={s.lossBar} style={{
                                                    height: `${h}%`,
                                                    background: loss < 0.5 ? '#10b981' : loss < 1.5 ? '#fbbf24' : '#f43f5e',
                                                }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className={s.trainStats}>
                                    <span>Step: {trainStep + 1}/30</span>
                                    <span className={s.trainStatsGreen}>
                                        Loss: {lossWithNorm[trainStep]?.toFixed(3) || '—'}
                                    </span>
                                </div>
                                <p className={s.trainDesc}>
                                    Loss가 안정적으로 감소 → 학습 성공!
                                </p>
                            </div>

                            {/* 정규화 없는 훈련 */}
                            <div className={s.trainCard}>
                                <h3 className={s.trainCardTitleRed}>❌ 정규화 미적용</h3>
                                <div className={s.lossChart}>
                                    {lossWithoutNorm.slice(0, trainStep + 1).map((loss, i) => {
                                        const h = Math.min((loss / 15) * 100, 100);
                                        return (
                                            <div key={i} className={s.lossBarCol}>
                                                <div className={s.lossBar} style={{
                                                    height: `${h}%`,
                                                    background: loss > 5 ? '#f43f5e' : loss > 2 ? '#fbbf24' : '#10b981',
                                                }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className={s.trainStats}>
                                    <span>Step: {trainStep + 1}/30</span>
                                    <span className={s.trainStatsRed}>
                                        Loss: {lossWithoutNorm[trainStep]?.toFixed(3) || '—'}
                                    </span>
                                </div>
                                <p className={s.trainDesc}>
                                    초반에는 괜찮다가 후반에 Loss가 폭발! 💥
                                </p>
                            </div>
                        </div>

                        {trainStep >= 25 && (
                            <div className={s.resultBox}>
                                <strong>📊 결과 분석:</strong> 정규화 없이는 약 20 스텝 이후 Loss가 급격히 상승합니다.
                                이는 깊은 신경망에서 중간 활성화 값의 크기가 제어되지 않아 그래디언트가 폭발하기 때문입니다.
                                정규화는 각 층의 출력을 일정한 범위로 유지하여 이 문제를 방지합니다.
                            </div>
                        )}
                    </>
                )}

                {/* ═══ 탭 4: 값 폭발/소실 ═══ */}
                {activeTab === 'explosion' && (
                    <>
                        <div className={s.theoryCard}>
                            <h3 className={s.theoryTitle}>💥 깊은 네트워크의 값 폭발/소실 문제</h3>
                            <div className={s.theoryContent}>
                                <p>
                                    신경망에서 데이터가 여러 층을 통과할 때, 각 층의 가중치가 곱해집니다.
                                    가중치가 <strong>1보다 크면</strong> 값이 기하급수적으로 <strong className={s.colorRed}>폭발(Exploding)</strong>하고,
                                    <strong>1보다 작으면</strong> 값이 <strong className={s.colorBlue}>소실(Vanishing)</strong>합니다.
                                </p>
                                <p>
                                    예: 가중치 1.1을 50번 곱하면 → 1.1⁵⁰ ≈ <strong>117</strong><br />
                                    가중치 0.9를 50번 곱하면 → 0.9⁵⁰ ≈ <strong>0.005</strong>
                                </p>
                            </div>
                        </div>

                        <div className={s.controlPanel}>
                            <div className={s.sliderRow}>
                                <span className={s.sliderLabel}>신경망 깊이 (레이어 수): {numLayers}개</span>
                                <input
                                    type="range" min="3" max="50" step="1"
                                    value={numLayers} onChange={e => setNumLayers(parseInt(e.target.value))}
                                    className={`slider-cosmic ${s.sliderFull}`}
                                />
                            </div>
                        </div>

                        <div className={s.trainChartRow}>
                            {/* 정규화 없음 */}
                            <div className={s.trainCard}>
                                <h3 className={s.trainCardTitleRed}>❌ 정규화 없음</h3>
                                <div className={s.layerChart}>
                                    {layersWithoutNorm.map((d, i) => {
                                        const h = Math.min((d.value / Math.max(...layersWithoutNorm.map(x => x.value))) * 100, 100);
                                        return (
                                            <div key={i} className={s.layerBarCol} title={`Layer ${d.layer}: ${d.value.toFixed(2)}`}>
                                                <div className={s.layerBar} style={{
                                                    height: `${h}%`,
                                                    background: d.value > 10 ? '#f43f5e' : d.value > 2 ? '#fbbf24' : '#3b82f6',
                                                }} />
                                                {i % Math.ceil(numLayers / 10) === 0 && (
                                                    <span className={s.layerLabel}>L{d.layer}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className={s.trainDesc}>
                                    {numLayers > 20
                                        ? '💥 값이 폭발하여 수치적으로 불안정합니다!'
                                        : '레이어가 깊어질수록 값이 점점 커집니다.'}
                                </p>
                            </div>

                            {/* 정규화 있음 */}
                            <div className={s.trainCard}>
                                <h3 className={s.trainCardTitleGreen}>✅ RMSNorm 적용</h3>
                                <div className={s.layerChart}>
                                    {layersWithNorm.map((d, i) => {
                                        const h = Math.min(d.value * 80, 100);
                                        return (
                                            <div key={i} className={s.layerBarCol} title={`Layer ${d.layer}: ${d.value.toFixed(2)}`}>
                                                <div className={s.layerBar} style={{
                                                    height: `${h}%`,
                                                    background: '#10b981',
                                                }} />
                                                {i % Math.ceil(numLayers / 10) === 0 && (
                                                    <span className={s.layerLabel}>L{d.layer}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className={s.trainDesc}>
                                    정규화 덕분에 모든 레이어에서 값이 ≈1.0으로 안정적!
                                </p>
                            </div>
                        </div>

                        {/* 실제 모델 깊이 비교 */}
                        <div className={s.modelCompare}>
                            <h3 className={s.modelCompareTitle}>🏗️ 실제 LLM의 레이어 수</h3>
                            <div className={s.modelRow}>
                                {[
                                    { name: 'GPT-2', layers: 12, color: '#3b82f6' },
                                    { name: 'GPT-3', layers: 96, color: '#8b5cf6' },
                                    { name: 'LLaMA-2 70B', layers: 80, color: '#f59e0b' },
                                    { name: 'GPT-4 (추정)', layers: 120, color: '#f43f5e' },
                                ].map(m => (
                                    <div key={m.name} className={s.modelItem}>
                                        <div className={s.modelBar}>
                                            <div className={s.modelBarFill} style={{
                                                height: `${(m.layers / 120) * 100}%`,
                                                background: m.color,
                                            }} />
                                        </div>
                                        <span style={{ color: m.color, fontWeight: 700, fontSize: '0.8rem' }}>{m.layers}층</span>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{m.name}</span>
                                    </div>
                                ))}
                            </div>
                            <p className={s.trainDesc}>
                                이렇게 깊은 네트워크에서 정규화 없이는 학습이 불가능합니다.
                                모든 현대 LLM은 각 Transformer 블록마다 정규화를 적용합니다.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* ── 한 걸음 더: 평균과 분산 ── */}
            <div className={s.deepDiveWrapper}>
                <button
                    onClick={() => setShowDeepDive(!showDeepDive)}
                    className={s.deepDiveBtn}
                >
                    <span>{"🔬 한 걸음 더: 평균과 분산이 왜 중요할까?"}</span>
                    <span style={{
                        transform: showDeepDive ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s',
                        fontSize: '1.2rem',
                    }}>
                        ▼
                    </span>
                </button>
                {showDeepDive && (
                    <div className={s.deepDiveContent}>
                        <div className={s.deepDiveColumn}>
                            <div className={s.deepDiveMeanVar}>
                                <strong className={s.deepDiveLabel}>평균(Mean)</strong> = 데이터의 중심점.
                                모든 값을 더하고 개수로 나눈 것.<br />
                                <strong className={s.deepDiveLabel}>분산(Variance)</strong> = 데이터가 평균으로부터 얼마나 퍼져 있는지를 나타내는 값.
                            </div>
                            <p>
                                정규화는 <strong>평균을 0, 분산을 1</strong>로 맞춰서 모든 뉴런이 비슷한 크기의 숫자로 작업하게 만듭니다.
                            </p>
                            <div className={s.deepDiveAnalogy}>
                                💡 <strong>비유:</strong> 키가 170cm인 반과 100cm인 반이 함께 체육을 하면 불공평하겠죠? 정규화하면 모든 반이 공정한 조건에서 경쟁할 수 있게 됩니다.
                                신경망에서도 마찬가지로, 각 층의 출력값 크기가 제각각이면 학습이 어려워집니다.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── 하단 네비게이션 ── */}
            <div className={s.navRow}>
                <button onClick={() => router.push('/week10')} className={s.navBtn}>← 10주차</button>
                <button onClick={() => router.push('/week13')} className={s.navBtn}>13주차 →</button>
            </div>
        </div>
    );
}
