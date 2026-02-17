'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

const SCENARIOS = [
    {
        id: 'weather',
        prefix: "오늘 날씨가 정말",
        logits: { '좋다': 7.5, '춥다': 5.0, '덥다': 4.5, '흐리다': 3.0, '미쳤다': 1.0 }
    },
    {
        id: 'food',
        prefix: "배가 너무 고파서 밥을",
        logits: { '먹었다': 7.0, '시켰다': 5.5, '지었다': 4.0, '굶었다': 2.0, '던졌다': -1.0 }
    },
    {
        id: 'story',
        prefix: "옛날 옛적에 한 마을에",
        logits: { '할머니가': 7.0, '호랑이가': 6.0, '왕이': 5.5, '토끼가': 5.0, '사람들이': 4.0 }
    },
    {
        id: 'school',
        prefix: "학교에 가면 제일 먼저",
        logits: { '친구를': 6.5, '교실에': 5.0, '가방을': 4.0, '선생님께': 3.5, '운동장에': 3.0 }
    },
];

export default function PredictionLab() {
    const router = useRouter();
    const [scenarioId, setScenarioId] = useState('weather');
    const [temp, setTemp] = useState(1.0);
    const [generatedWord, setGeneratedWord] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);

    // Sampling options
    const [useTopK, setUseTopK] = useState(false);
    const [topK, setTopK] = useState(3);
    const [useTopP, setUseTopP] = useState(false);
    const [topP, setTopP] = useState(0.9);

    const [showDeepDive, setShowDeepDive] = useState(false);

    // Custom mode
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customPrefix, setCustomPrefix] = useState("나는 오늘");
    const [customEntries, setCustomEntries] = useState([
        { word: '학교에', logit: 6.0 },
        { word: '집에', logit: 5.0 },
        { word: '공원에', logit: 3.0 },
        { word: '달나라에', logit: -1.0 },
        { word: '바다에', logit: 2.5 },
    ]);

    const currentScenario = isCustomMode
        ? { id: 'custom', prefix: customPrefix, logits: Object.fromEntries(customEntries.map(e => [e.word, e.logit])) }
        : SCENARIOS.find(sc => sc.id === scenarioId);

    // Softmax with Temperature
    const rawProbabilities = useMemo(() => {
        const logits = currentScenario.logits;
        const keys = Object.keys(logits);

        const expValues = keys.map(k => Math.exp(logits[k] / temp));
        const sumExp = expValues.reduce((a, b) => a + b, 0);

        return keys.map((k, i) => ({
            word: k,
            prob: expValues[i] / sumExp,
            logit: logits[k]
        })).sort((a, b) => b.prob - a.prob);
    }, [currentScenario, temp]);

    // Apply Top-k / Top-p filtering
    const probabilities = useMemo(() => {
        let filtered = [...rawProbabilities];

        // Top-k: keep only top-k items
        if (useTopK) {
            filtered = filtered.slice(0, topK);
        }

        // Top-p: keep items until cumulative prob >= topP
        if (useTopP) {
            let cumProb = 0;
            const topPFiltered = [];
            for (const item of filtered) {
                topPFiltered.push(item);
                cumProb += item.prob;
                if (cumProb >= topP) break;
            }
            filtered = topPFiltered;
        }

        // Renormalize
        const sumProb = filtered.reduce((sum, item) => sum + item.prob, 0);
        return filtered.map(item => ({ ...item, filteredProb: item.prob / sumProb }));
    }, [rawProbabilities, useTopK, topK, useTopP, topP]);

    const handleSpin = () => {
        setIsSpinning(true);
        setGeneratedWord(null);

        const r = Math.random();
        let cum = 0;
        let selected = '';
        for (let item of probabilities) {
            cum += item.filteredProb;
            if (r <= cum) {
                selected = item.word;
                break;
            }
        }

        setTimeout(() => {
            setGeneratedWord(selected);
            setIsSpinning(false);
        }, 800);
    };

    const updateCustomEntry = useCallback((idx, field, value) => {
        setCustomEntries(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: field === 'logit' ? parseFloat(value) || 0 : value };
            return next;
        });
    }, []);

    const addCustomEntry = () => {
        if (customEntries.length < 8) {
            setCustomEntries(prev => [...prev, { word: '새단어', logit: 1.0 }]);
        }
    };

    const removeCustomEntry = (idx) => {
        if (customEntries.length > 2) {
            setCustomEntries(prev => prev.filter((_, i) => i !== idx));
        }
    };

    return (
        <div className={s.container}>
            {/* Header */}
            <Breadcrumb
                items={[{ label: '2주차 인트로', href: '/week2/intro' }]}
                current="다음 단어 예측기"
            />
            <div className={s.header}>
                <div className={s.headerTitle}>
                    <span className={s.headerIcon}>🎲</span>
                    <span className={s.headerText}>다음 단어 예측기 (Next Token Prediction)</span>
                </div>
            </div>

            <div className={s.content}>
                {/* Mode Toggle */}
                <div className={s.modeToggle}>
                    <button
                        className={s.modeBtn}
                        style={{
                            background: !isCustomMode ? 'var(--accent-nova)' : 'rgba(255,255,255,0.05)',
                            color: !isCustomMode ? '#fff' : 'var(--text-secondary)',
                        }}
                        onClick={() => setIsCustomMode(false)}
                    >
                        📋 시나리오 모드
                    </button>
                    <button
                        className={s.modeBtn}
                        style={{
                            background: isCustomMode ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                            color: isCustomMode ? '#000' : 'var(--text-secondary)',
                        }}
                        onClick={() => setIsCustomMode(true)}
                    >
                        ✏️ 자유 입력 모드
                    </button>
                </div>

                <div className={s.grid2}>
                    {/* 1. Context */}
                    <div className={s.card}>
                        <h3 className={s.label}>1. 문맥 선택 (Context)</h3>
                        {!isCustomMode ? (
                            <>
                                <div className={s.btnGroup}>
                                    {SCENARIOS.map(sc => (
                                        <button
                                            key={sc.id}
                                            className={s.scenarioBtn}
                                            style={{
                                                background: sc.id === scenarioId ? 'var(--accent-nova)' : 'rgba(255,255,255,0.05)',
                                                color: sc.id === scenarioId ? '#fff' : 'var(--text-secondary)',
                                            }}
                                            onClick={() => { setScenarioId(sc.id); setGeneratedWord(null); }}
                                        >
                                            {sc.id === 'weather' ? '☀️ 날씨' : sc.id === 'food' ? '🍕 음식' : sc.id === 'story' ? '📖 동화' : '🏫 학교'}
                                        </button>
                                    ))}
                                </div>
                                <div className={s.previewBox}>
                                    {currentScenario.prefix} <span className={s.blank}>
                                        {isSpinning ? '...' : generatedWord ? generatedWord : '_______'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={s.customInputGroup}>
                                    <label className={s.customLabel}>문맥 문장:</label>
                                    <input
                                        className={`input-cosmic ${s.customInputFull}`}
                                        value={customPrefix}
                                        onChange={(e) => setCustomPrefix(e.target.value)}
                                        placeholder="예: 나는 오늘"
                                    />
                                </div>
                                <div className={s.previewBox}>
                                    {customPrefix} <span className={s.blank}>
                                        {isSpinning ? '...' : generatedWord ? generatedWord : '_______'}
                                    </span>
                                </div>
                                <div className={s.customWordsSection}>
                                    <div className={s.customWordsHeader}>
                                        <label className={s.customLabel}>후보 단어 &amp; Logit 값:
                                            <span className={s.customWordsHelp}>AI 모델은 각 단어에 대해 &apos;다음에 나올 가능성&apos;을 점수(Logit)로 매깁니다. 아직 확률이 아닌 원점수라서, Softmax를 통해 확률로 변환해야 합니다.</span>
                                        </label>
                                        <button onClick={addCustomEntry} className={s.addBtn} disabled={customEntries.length >= 8}>+ 추가</button>
                                    </div>
                                    {customEntries.map((entry, idx) => (
                                        <div key={idx} className={s.customEntryRow}>
                                            <input
                                                className={`input-cosmic ${s.customWordInput}`}
                                                value={entry.word}
                                                onChange={(e) => updateCustomEntry(idx, 'word', e.target.value)}
                                                placeholder="단어"
                                            />
                                            <input
                                                className={`input-cosmic ${s.customLogitInput}`}
                                                type="number"
                                                value={entry.logit}
                                                onChange={(e) => updateCustomEntry(idx, 'logit', e.target.value)}
                                                step="0.5"
                                            />
                                            <button
                                                onClick={() => removeCustomEntry(idx)}
                                                className={s.removeBtn}
                                                disabled={customEntries.length <= 2}
                                            >×</button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* 2. Temperature + Sampling Controls */}
                    <div className={s.card}>
                        <h3 className={s.label}>2. 샘플링 설정</h3>
                        <div className={s.samplingPad}>
                            {/* Temperature */}
                            <div className={s.tempSection}>
                                <div className={s.tempHeader}>
                                    <span className={s.tempLabel}>Temperature</span>
                                    <span className={s.tempValue}>T = {temp.toFixed(1)}</span>
                                </div>
                                <input type="range" className={`slider-cosmic ${s.sliderFull}`} min="0.1" max="3.0" step="0.1" value={temp}
                                    onChange={(e) => setTemp(parseFloat(e.target.value))} />
                                <div className={s.sliderLabels}>
                                    <span>🎯 집중 (0.1)</span><span>🌊 분산 (3.0)</span>
                                </div>
                                <p className={s.tempDesc}>
                                    물리학에서 온도가 높으면 분자가 활발히 움직이듯, Temperature가 높으면 다양한 단어가 선택될 수 있고, 낮으면 가장 확실한 단어에 집중합니다.
                                </p>
                            </div>

                            {/* Formula */}
                            <div className={s.formulaBox}>
                                <code className={s.formulaCode}>P(wᵢ) = exp(zᵢ / T) / Σ exp(zⱼ / T)</code>
                                <span className={s.formulaSigma}>&nbsp;&nbsp;Σ(시그마) = &apos;모두 더한다&apos;는 수학 기호</span>
                                <div className={s.formulaExplain}>
                                    <strong>z</strong> = logit (모델이 각 단어에 매긴 &quot;원점수&quot;, 높을수록 유력한 후보)<br/>
                                    <strong>exp</strong> = 지수 함수 (exp(z) = z가 클수록 급격히 커지는 함수. 점수 차이를 확률 차이로 증폭)<br/>
                                    <strong>T</strong> = Temperature (나누면 점수 차이가 줄어들어 확률이 고르게 됨)
                                </div>
                            </div>

                            {/* Top-k */}
                            <div className={s.samplingOption}>
                                <label className={s.checkLabel}>
                                    <input type="checkbox" checked={useTopK} onChange={(e) => setUseTopK(e.target.checked)} />
                                    <span>Top-k 샘플링</span>
                                </label>
                                {useTopK && (
                                    <div className={s.sliderRow}>
                                        <span className={s.sliderRowLabel}>k =</span>
                                        <input type="range" className={`slider-cosmic ${s.flexOne}`} min="1" max={Object.keys(currentScenario.logits).length} step="1"
                                            value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} />
                                        <span className={s.topKValue}>{topK}</span>
                                    </div>
                                )}
                                <p className={s.samplingDesc}>
                                    확률 상위 k개 단어만 후보로 남김
                                </p>
                            </div>

                            {/* Top-p */}
                            <div className={s.samplingOption}>
                                <label className={s.checkLabel}>
                                    <input type="checkbox" checked={useTopP} onChange={(e) => setUseTopP(e.target.checked)} />
                                    <span>Top-p (Nucleus) 샘플링</span>
                                </label>
                                {useTopP && (
                                    <div className={s.sliderRow}>
                                        <span className={s.sliderRowLabel}>p =</span>
                                        <input type="range" className={`slider-cosmic ${s.flexOne}`} min="0.1" max="1.0" step="0.05"
                                            value={topP} onChange={(e) => setTopP(parseFloat(e.target.value))} />
                                        <span className={s.topPValue}>{topP.toFixed(2)}</span>
                                    </div>
                                )}
                                <p className={s.samplingDesc}>
                                    누적 확률이 p를 넘을 때까지의 단어만 후보로 남김<br/>
                                    (&quot;Nucleus&quot; = 핵심. 확률 분포의 핵심 부분만 남긴다는 뜻)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Probabilities Visualization */}
                <div className={s.card}>
                    <div className={s.probHeader}>
                        <h3 className={s.labelNoMargin}>3. 확률 분포 (Softmax → 필터링)
                            <span className={s.labelSubtext}>Softmax는 &apos;soft(부드러운) + max(최대값)&apos;의 합성어. 가장 큰 값 하나만 고르는 대신, 모든 값을 확률로 부드럽게 변환합니다.</span>
                        </h3>
                        <button className={`btn-nova ${s.spinBtnPad}`} onClick={handleSpin} disabled={isSpinning}>
                            {isSpinning ? '🎲 굴리는 중...' : '🎲 단어 생성하기!'}
                        </button>
                    </div>

                    <div className={s.barChart}>
                        {rawProbabilities.map((item) => {
                            const isFiltered = !probabilities.find(p => p.word === item.word);
                            const displayProb = isFiltered ? item.prob : (probabilities.find(p => p.word === item.word)?.filteredProb ?? item.prob);
                            return (
                                <div key={item.word} className={s.barRow} style={{ opacity: isFiltered ? 0.25 : 1 }}>
                                    <div className={s.barLabel}>
                                        {item.word}
                                        {isFiltered && <span className={s.filteredX}>✕</span>}
                                    </div>
                                    <div className={s.barTrack}>
                                        <div className={s.barFill} style={{
                                            width: `${displayProb * 100}%`,
                                            background: isFiltered ? 'rgba(255,255,255,0.1)' : (displayProb > 0.4 ? '#34d399' : 'rgba(52, 211, 153, 0.5)')
                                        }} />
                                        <span className={s.probText}>
                                            {isFiltered ? '제외' : `${(displayProb * 100).toFixed(1)}%`}
                                        </span>
                                    </div>
                                    <div className={s.logitValue}>
                                        z={item.logit.toFixed(1)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {(useTopK || useTopP) && (
                        <p className={s.filterNote}>
                            {useTopK && `Top-${topK}`}{useTopK && useTopP && ' + '}{useTopP && `Top-p(${topP.toFixed(2)})`} 적용 →
                            {' '}{probabilities.length}개 후보로 축소 후 재정규화(renormalize)
                        </p>
                    )}
                </div>

                {/* 4. Theory Section */}
                <div className={s.card}>
                    <h3 className={s.label}>🤖 언어 모델이 문장을 생성하는 방법</h3>
                    <div className={s.theoryContent}>
                        <p>
                            <strong>1. 자기회귀(Autoregressive) 생성</strong><br />
                            <span className={s.dimText}>&apos;자기회귀(Autoregressive)&apos;란 자기가 만든 결과를 다시 입력으로 사용한다는 뜻입니다. AI는 한 번에 전체 문장을 만들 수 없어서, 앞에 쓴 내용을 보면서 한 단어씩 생성합니다.</span><br />
                            GPT와 같은 언어 모델은 <strong>한 번에 하나의 토큰(단어)</strong>만 예측합니다.
                            예측한 토큰을 입력 뒤에 붙이고, 다시 다음 토큰을 예측하는 과정을 반복합니다.
                        </p>
                        <div className={s.autoregBox}>
                            <div className={s.arStep}><span className={s.dimText}>입력:</span> <code>나는 오늘</code></div>
                            <div className={s.arArrow}>↓ 예측</div>
                            <div className={s.arStep}><span className={s.dimText}>+1:</span> <code>나는 오늘 <strong className={s.greenHighlight}>학교에</strong></code></div>
                            <div className={s.arArrow}>↓ 예측</div>
                            <div className={s.arStep}><span className={s.dimText}>+2:</span> <code>나는 오늘 학교에 <strong className={s.greenHighlight}>갔다</strong></code></div>
                            <div className={s.arArrow}>↓ 예측</div>
                            <div className={s.arStep}><span className={s.dimText}>+3:</span> <code>나는 오늘 학교에 갔다 <strong className={s.redHighlight}>&lt;끝&gt;</strong></code></div>
                        </div>

                        <p>
                            <strong>2. Temperature(온도)</strong><br />
                            softmax 함수에 Temperature를 적용합니다: <code className={s.yellowCode}>P(wᵢ) = exp(zᵢ/T) / Σexp(zⱼ/T)</code><br />
                            T가 낮으면(→0) 가장 높은 logit에 집중, T가 높으면(→∞) 균등 분포에 가까워집니다.
                        </p>

                        <p>
                            <strong>3. Top-k 샘플링</strong><br />
                            확률이 높은 상위 k개의 토큰만 남기고 나머지는 제거합니다.
                            k가 작으면 안전하고 반복적, k가 크면 다양하지만 엉뚱한 단어가 나올 수 있습니다.
                        </p>

                        <p>
                            <strong>4. Top-p (Nucleus) 샘플링</strong><br />
                            누적 확률이 p를 넘을 때까지의 토큰만 남깁니다. 상황에 따라 후보 수가 유동적으로 변합니다.
                            예: 확실한 문맥이면 2~3개, 애매한 문맥이면 10개 이상.
                        </p>

                        <div className={s.comparisonTable}>
                            <div className={s.compRow}>
                                <div className={s.compCellHeader}>방법</div>
                                <div className={s.compCellHeader}>장점</div>
                                <div className={s.compCellHeader}>단점</div>
                            </div>
                            <div className={s.compRow}>
                                <div className={s.compCellGreen}>Greedy(탐욕적: 항상 가장 확률 높은 단어만 선택, T≈0)</div>
                                <div className={s.compCell}>가장 정확</div>
                                <div className={s.compCell}>반복적, 재미없음</div>
                            </div>
                            <div className={s.compRow}>
                                <div className={s.compCellBlue}>Top-k</div>
                                <div className={s.compCell}>단순하고 효과적</div>
                                <div className={s.compCell}>고정된 후보 수</div>
                            </div>
                            <div className={s.compRow}>
                                <div className={s.compCellPurple}>Top-p</div>
                                <div className={s.compCell}>유동적 후보 수</div>
                                <div className={s.compCell}>p 값 튜닝 필요</div>
                            </div>
                            <div className={s.compRow}>
                                <div className={s.compCellAmber}>T + Top-p</div>
                                <div className={s.compCell}>실전 표준 조합</div>
                                <div className={s.compCell}>파라미터 2개 조절</div>
                            </div>
                        </div>

                        <div className={s.tipBox}>
                            <strong>💡 실전 팁:</strong> ChatGPT, Claude 등 대부분의 LLM API는
                            <strong> Temperature + Top-p</strong>를 동시에 사용합니다.
                            일반적으로 T=0.7, Top-p=0.9가 좋은 시작점입니다.
                        </div>
                    </div>
                </div>

                {/* 한 걸음 더: exp와 Softmax */}
                <div className={s.deepDiveWrapper}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        className={s.deepDiveToggle}
                    >
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: 왜 하필 exp(지수 함수)를 쓸까?
                    </button>
                    {showDeepDive && (
                        <div className={s.deepDiveContent}>
                            <p className={s.deepDiveP}>
                                Softmax에서 <strong>exp</strong>를 쓰는 데에는 수학적인 이유가 있어요:
                            </p>
                            <p className={s.deepDivePSmall}>
                                <strong className={s.highlightYellow}>1. 음수 → 양수 변환</strong> —
                                logit(원점수)은 음수일 수 있지만, 확률은 반드시 0 이상이어야 해요.
                                exp 함수는 어떤 수를 넣어도 항상 양수를 돌려주기 때문에 이 조건을 자연스럽게 만족합니다.
                            </p>
                            <p className={s.deepDivePSmall}>
                                <strong className={s.highlightGreen}>2. 차이 증폭</strong> —
                                logit이 8과 5로 3 차이가 나면, exp(8) ≈ 2981 vs exp(5) ≈ 148로 약 <strong>20배</strong> 차이가 됩니다.
                                점수 차이가 조금만 나도 확률에서는 큰 차이로 나타나, &quot;확실한 답&quot;에 집중할 수 있어요.
                            </p>
                            <p>
                                <strong className={s.highlightRed}>3. 미분이 깔끔함</strong> —
                                exp의 미분은 자기 자신! (d/dx)eˣ = eˣ.
                                이 성질 덕분에 AI가 학습할 때(역전파, 5~7주차에서 배울 예정) 계산이 매우 효율적입니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* 네비게이션 */}
            <div className={s.navRow}>
                <button onClick={() => router.push('/week2/intro')} className={s.navBackBtn}>← 인트로로</button>
                <button className={`btn-nova ${s.navNextPad}`} onClick={() => router.push('/week3/intro')}>
                    <span>🎯 3주차: 원-핫 인코딩 →</span>
                </button>
            </div>
        </div>
    );
}
