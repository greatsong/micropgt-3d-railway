'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

// ── 탭 구성 ──
const TABS = [
    { id: 'builder', label: '🔢 벡터 만들기', title: '원-핫 벡터 만들기' },
    { id: 'distance', label: '📏 거리 비교', title: '유클리드 거리 비교' },
    { id: 'memory', label: '💾 메모리 계산', title: '메모리 사용량' },
    { id: 'compare', label: '⚡ 인코딩 비교', title: '인코딩 방식 비교' },
];

// ── Tab 1: 원-핫 벡터 만들기 ──
function VectorBuilder() {
    const [words, setWords] = useState(['고양이', '강아지', '자동차', '비행기', '피자']);
    const [newWord, setNewWord] = useState('');
    const [selected, setSelected] = useState(0);

    const addWord = () => {
        const w = newWord.trim();
        if (!w || words.includes(w)) return;
        setWords((prev) => [...prev, w]);
        setNewWord('');
    };

    const removeWord = (idx) => {
        if (words.length <= 2) return;
        setWords((prev) => prev.filter((_, i) => i !== idx));
        if (selected >= idx && selected > 0) setSelected(selected - 1);
    };

    return (
        <div className={s.tabContent}>
            <p className={s.desc}>
                단어를 추가/삭제하며 원-핫 벡터가 어떻게 변하는지 관찰하세요!
                <span className={s.whySpan}>&apos;원-핫(One-Hot)&apos;이란 &apos;하나만 켜져 있다&apos;는 뜻입니다. 벡터에서 딱 하나의 위치만 1(켜짐)이고, 나머지는 모두 0(꺼짐)이에요.</span>
            </p>

            <div className={s.addRow}>
                <input className={`input-cosmic ${s.addInput}`} placeholder="새 단어 입력..." value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addWord()}
                    maxLength={8} />
                <button className={`btn-nova ${s.addBtn}`} onClick={addWord} disabled={!newWord.trim()}>
                    <span>+ 추가</span>
                </button>
            </div>

            <div className={s.wordGrid}>
                {words.map((w, i) => (
                    <div key={i} className={`${s.wordChip} ${selected === i ? s.wordChipActive : ''}`}
                        onClick={() => setSelected(i)}>
                        <span>{w}</span>
                        {words.length > 2 && (
                            <button onClick={(e) => { e.stopPropagation(); removeWord(i); }}
                                className={s.removeBtn}>×</button>
                        )}
                    </div>
                ))}
            </div>

            <div className={s.vectorPanel}>
                <div className={s.vectorHeader}>
                    <span className={s.vectorHeaderWord}>&quot;{words[selected]}&quot;</span>
                    <span className={s.vectorHeaderDim}>
                        의 원-핫 벡터 ({words.length}차원)
                        <span className={s.vectorHeaderDimNote}>벡터(Vector) = 숫자를 나열한 목록. [0, 1, 0]은 3차원 벡터예요.</span>
                    </span>
                </div>
                <div className={s.vectorGrid}>
                    {words.map((w, i) => (
                        <div key={i} className={s.vectorCell}>
                            <div className={s.cellValue} style={{
                                background: i === selected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(107, 114, 128, 0.1)',
                                borderColor: i === selected ? '#f59e0b' : 'rgba(107, 114, 128, 0.2)',
                                color: i === selected ? '#fbbf24' : '#6b7280',
                                fontWeight: i === selected ? 800 : 400,
                                transform: i === selected ? 'scale(1.15)' : 'scale(1)',
                            }}>
                                {i === selected ? '1' : '0'}
                            </div>
                            <span className={s.cellLabel}>{w}</span>
                        </div>
                    ))}
                </div>
                <div className={s.statsRow}>
                    <div className={s.statBox}>
                        <span className={s.statLabel}>차원 수 <span className={s.statLabelNote}>(차원 = 벡터에 들어 있는 숫자의 개수. 단어가 5개면 5차원 벡터가 필요)</span></span>
                        <span className={s.statValue} style={{ color: words.length > 10 ? '#f43f5e' : '#10b981' }}>
                            {words.length}
                        </span>
                    </div>
                    <div className={s.statBox}>
                        <span className={s.statLabel}>0의 비율</span>
                        <span className={s.statValue}>
                            {((1 - 1 / words.length) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className={s.statBox}>
                        <span className={s.statLabel}>1의 개수</span>
                        <span className={`${s.statValue} ${s.statValueGold}`}>1</span>
                    </div>
                </div>
            </div>

            <div className={s.tipBox}>
                💡 단어를 계속 추가해보세요! 벡터 차원이 커지면서 0이 많아지는 <strong>희소 벡터(Sparse Vector)</strong>가 됩니다. 0이 대부분인 벡터는 메모리를 낭비하고, AI가 단어 사이의 관계를 학습하기 어렵게 만듭니다.
            </div>
        </div>
    );
}

// ── Tab 2: 거리 비교 ──
function DistanceComparison() {
    const words = ['고양이', '강아지', '자동차', '비행기', '피자', '햄버거', '사과'];
    const [wordA, setWordA] = useState(0);
    const [wordB, setWordB] = useState(1);

    const semanticGroups = { '고양이': 0, '강아지': 0, '자동차': 1, '비행기': 1, '피자': 2, '햄버거': 2, '사과': 2 };
    const sameGroup = semanticGroups[words[wordA]] === semanticGroups[words[wordB]];

    return (
        <div className={s.tabContent}>
            <p className={s.desc}>
                두 단어를 선택하면 원-핫 벡터 간 <strong>유클리드 거리</strong>를 계산합니다.
                <span className={s.whySpan}>유클리드 거리(Euclidean Distance)는 두 점 사이의 직선 거리입니다. 자로 두 점 사이를 재는 것과 같아요.</span>
            </p>

            <div className={s.distSelectRow}>
                <div className={s.distSelectCol}>
                    <label className={`label-cosmic ${s.distSelectLabel}`}>단어 A</label>
                    <div className={s.wordSelectGrid}>
                        {words.map((w, i) => (
                            <button key={i} onClick={() => setWordA(i)}
                                className={`${s.selectBtn} ${wordA === i ? s.selectBtnActiveA : ''}`}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={s.distSelectCol}>
                    <label className={`label-cosmic ${s.distSelectLabel}`}>단어 B</label>
                    <div className={s.wordSelectGrid}>
                        {words.map((w, i) => (
                            <button key={i} onClick={() => setWordB(i)}
                                className={`${s.selectBtn} ${wordB === i ? s.selectBtnActiveB : ''}`}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={s.distanceResult}>
                <div className={s.distPair}>
                    <span className={s.distPairWordA}>{words[wordA]}</span>
                    <span className={s.distPairArrow}>↔</span>
                    <span className={s.distPairWordB}>{words[wordB]}</span>
                </div>
                <div className={s.distValue}>
                    <span className={s.distValueLabel}>유클리드 거리</span>
                    <span className={s.distValueNumber}>
                        {wordA === wordB ? '0' : '√2 ≈ 1.414'}
                    </span>
                    {wordA !== wordB && (
                        <span className={s.distValueNote}>
                            원-핫 벡터에서 서로 다른 두 단어의 거리는 항상 √2입니다. 1이 있는 위치가 서로 다르기 때문이에요.
                        </span>
                    )}
                </div>
                {wordA !== wordB && (
                    <div className={s.distFullWidth}>
                        <div className={sameGroup ? s.distGroupBoxSame : s.distGroupBoxDiff}>
                            <span className={sameGroup ? s.distGroupTitleSame : s.distGroupTitleDiff}>
                                {sameGroup ? '🧲 상식적으로 비슷한 단어인데...' : '🔀 상식적으로 다른 단어인데...'}
                            </span>
                            <p className={s.distGroupDesc}>
                                원-핫에서는 거리가 <strong>항상 √2</strong>로 동일! 의미의 유사성을 전혀 반영하지 못합니다.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className={s.distTable}>
                <label className={`label-cosmic ${s.distTableLabel}`}>📊 전체 거리 행렬</label>
                <div className={s.distTableScroll}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th className={s.th}></th>
                                {words.map((w) => <th key={w} className={s.th}>{w}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {words.map((w1, i) => (
                                <tr key={w1}>
                                    <td className={s.tdHeader}>{w1}</td>
                                    {words.map((_, j) => (
                                        <td key={j} className={`${s.td} ${i === j ? s.tdSame : s.tdDiff}`}>
                                            {i === j ? '0' : '√2'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className={s.distTableFooter}>
                    대각선(자기 자신) 빼고 전부 √2 — <strong>이것이 원-핫의 한계!</strong>
                </p>
            </div>
        </div>
    );
}

// ── Tab 3: 메모리 계산 ──
function MemoryCalculator() {
    const [vocabSize, setVocabSize] = useState(100);
    const [sentenceLen, setSentenceLen] = useState(10);

    const oneHotBytes = vocabSize * 4;
    const sentenceBytes = oneHotBytes * sentenceLen;
    const embDim = Math.min(768, Math.max(32, Math.round(Math.sqrt(vocabSize) * 2)));
    const embBytes = embDim * 4;
    const embSentenceBytes = embBytes * sentenceLen;
    const savings = sentenceBytes > 0 ? ((1 - embSentenceBytes / sentenceBytes) * 100) : 0;

    const formatBytes = (b) => {
        if (b < 1024) return `${b} B`;
        if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
        return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    };

    const realModels = [
        { name: 'GPT-2', vocab: 50257, emb: 768 },
        { name: 'GPT-3', vocab: 50257, emb: 12288 },
        { name: 'LLaMA-2', vocab: 32000, emb: 4096 },
        { name: 'GPT-4', vocab: 100000, emb: '?' },
    ];

    return (
        <div className={s.tabContent}>
            <p className={s.desc}>
                슬라이더로 단어장 크기를 조절하고 메모리 사용량을 비교해보세요!
            </p>
            <div className={s.sliderGroup}>
                <div className={s.sliderRow}>
                    <span className={s.sliderLabel}>단어장 크기</span>
                    <input type="range" className={`slider-cosmic ${s.sliderInput}`} min={10} max={100000} step={10}
                        value={vocabSize} onChange={(e) => setVocabSize(parseInt(e.target.value))} />
                    <span className={s.sliderVal}>{vocabSize.toLocaleString()}</span>
                </div>
                <div className={s.sliderRow}>
                    <span className={s.sliderLabel}>문장 길이</span>
                    <input type="range" className={`slider-cosmic ${s.sliderInput}`} min={1} max={100} step={1}
                        value={sentenceLen} onChange={(e) => setSentenceLen(parseInt(e.target.value))} />
                    <span className={s.sliderVal}>{sentenceLen}토큰</span>
                </div>
            </div>
            <div className={s.memCardsRow}>
                <div className={`${s.memCard} ${s.memCardRed}`}>
                    <span className={s.memCardLabel}>원-핫 인코딩</span>
                    <span className={s.memCardValueRed}>{formatBytes(sentenceBytes)}</span>
                    <span className={s.memCardSub}>{vocabSize.toLocaleString()}차원 × {sentenceLen}토큰</span>
                </div>
                <div className={`${s.memCard} ${s.memCardGreen}`}>
                    <span className={s.memCardLabel}>임베딩 (참고)</span>
                    <span className={s.memCardValueGreen}>{formatBytes(embSentenceBytes)}</span>
                    <span className={s.memCardSub}>{embDim}차원 × {sentenceLen}토큰</span>
                </div>
                <div className={`${s.memCard} ${s.memCardPurple}`}>
                    <span className={s.memCardLabel}>절감률</span>
                    <span className={s.memCardValuePurple}>{savings.toFixed(1)}%</span>
                    <span className={s.memCardSub}>메모리 절약</span>
                </div>
            </div>
            <div className={`glass-card ${s.realModelsPadding}`}>
                <label className={`label-cosmic ${s.realModelsLabel}`}>🤖 실제 모델의 원-핫 vs 임베딩</label>
                <div className={s.realModelsCol}>
                    {realModels.map((m) => (
                        <div key={m.name} className={s.modelRow}>
                            <span className={s.modelName}>{m.name}</span>
                            <div className={s.modelDetail}>
                                <span className={s.modelOneHot}>원-핫: {formatBytes(m.vocab * 4)}</span>
                                <span className={s.modelArrow}>→</span>
                                <span className={s.modelEmb}>임베딩: {typeof m.emb === 'number' ? formatBytes(m.emb * 4) : '?'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Tab 4: 인코딩 방식 비교 ──
function EncodingComparison() {
    const words = ['고양이', '강아지', '자동차', '비행기', '피자'];
    const methods = [
        { name: '인덱스 인코딩', emoji: '#️⃣', description: '인덱스(Index) = 순서 번호. 고양이=0, 강아지=1처럼 단어에 번호를 매기기', vectors: words.map((_, i) => String(i)), pros: ['매우 간단', '메모리 효율적 (숫자 1개)'], cons: ['크기 관계가 생겨버림 (고양이 < 강아지?)', '연산 불가능 (3 - 1 = 자동차?)'], color: '#94a3b8' },
        { name: '원-핫 인코딩', emoji: '1️⃣', description: '단어마다 하나의 위치만 1', vectors: words.map((_, i) => `[${words.map((__, j) => j === i ? '1' : '0').join(',')}]`), pros: ['크기 관계 없음 (동등)', '간단하고 명확'], cons: ['차원이 단어 수만큼 커짐', '모든 거리가 동일 (의미 무시)'], color: '#f59e0b' },
        { name: '임베딩 (4주차!)', emoji: '✨', description: '의미를 담은 밀집 벡터', vectors: ['[0.90, -0.30, 0.30]', '[0.70, -0.10, 0.60]', '[-0.50, 0.70, 0.10]', '[-0.30, 0.80, 0.30]', '[0.33, 0.71, 0.22]'], pros: ['의미적 유사성 반영', '고정된 작은 차원 (효율적)'], cons: ['학습이 필요함 (데이터 필요)', '해석이 어려울 수 있음'], color: '#7c5cfc' },
    ];
    const [activeMethod, setActiveMethod] = useState(1);

    return (
        <div className={s.tabContent}>
            <p className={s.desc}>세 가지 인코딩 방식을 비교해보세요. 각각의 장단점이 있습니다!</p>
            <div className={s.methodBtnRow}>
                {methods.map((m, i) => (
                    <button key={i} onClick={() => setActiveMethod(i)} className={s.methodBtn} style={{
                        border: activeMethod === i ? `2px solid ${m.color}` : undefined,
                        background: activeMethod === i ? `${m.color}15` : undefined,
                        color: activeMethod === i ? m.color : undefined,
                    }}>{m.emoji} {m.name}</button>
                ))}
            </div>
            <div className={`glass-card ${s.encCardPadding}`}>
                <p className={s.encMethodDesc}>{methods[activeMethod].description}</p>
                <div className={s.encVectorCol}>
                    {words.map((w, i) => (
                        <div key={i} className={s.encVectorRow}>
                            <span className={s.encWordLabel}>{w}</span>
                            <span className={s.encArrow}>→</span>
                            <code className={s.encCode} style={{ color: methods[activeMethod].color }}>{methods[activeMethod].vectors[i]}</code>
                        </div>
                    ))}
                </div>
            </div>
            <div className={s.prosConsRow}>
                <div className={s.prosBox}>
                    <span className={s.prosTitle}>장점</span>
                    <ul className={s.prosConsList}>
                        {methods[activeMethod].pros.map((p, i) => (<li key={i} className={s.prosConsItem}>{p}</li>))}
                    </ul>
                </div>
                <div className={s.consBox}>
                    <span className={s.consTitle}>단점</span>
                    <ul className={s.prosConsList}>
                        {methods[activeMethod].cons.map((c, i) => (<li key={i} className={s.prosConsItem}>{c}</li>))}
                    </ul>
                </div>
            </div>
            <div className={s.tipBox}>
                💡 원-핫 인코딩은 간단하지만 한계가 명확합니다. 다음 주차에서 이 문제를 해결하는 <strong className={s.embHighlight}>임베딩</strong>을 배워요!
            </div>
        </div>
    );
}

// ── 메인 ──
export default function Week3Page() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('builder');

    const handleComplete = () => {
        if (typeof window !== 'undefined') {
            try {
                const progress = JSON.parse(localStorage.getItem('microgpt-progress') || '{}');
                progress['3'] = true;
                localStorage.setItem('microgpt-progress', JSON.stringify(progress));
                window.dispatchEvent(new Event('microgpt-progress-update'));
            } catch {}
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'builder': return <VectorBuilder />;
            case 'distance': return <DistanceComparison />;
            case 'memory': return <MemoryCalculator />;
            case 'compare': return <EncodingComparison />;
            default: return null;
        }
    };

    return (
        <div className={s.pageContainer}>
            <Breadcrumb
                items={[{ label: '3주차 인트로', href: '/week3/intro' }]}
                current="원-핫 인코딩 실험실"
            />
            <div className={s.header}>
                <div>
                    <h2 className={s.weekTitle}>3주차</h2>
                    <h1 className={s.moduleTitle}><span className="text-gradient">원-핫 인코딩 실험실</span></h1>
                    <p className={s.headerDesc}>원-핫 벡터를 직접 만들고, 한계를 체험해보세요! 🔢</p>
                </div>
            </div>

            <div className={s.tabBar}>
                {TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`${s.tabBtn} ${activeTab === tab.id ? s.tabBtnActive : ''}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={s.contentArea}>{renderTab()}</div>

            <div className={`glass-card ${s.theoryCard}`}>
                <label className="label-cosmic">🤖 원-핫 인코딩이 실제로 쓰이는 곳</label>
                <div className={s.theoryBody}>
                    <p className={s.theoryParagraph}>
                        <strong>1. 분류 문제의 출력층</strong><br />
                        &quot;이 사진은 고양이/강아지/자동차 중 뭐야?&quot; → 정답 레이블을 원-핫으로 표현합니다.<br />
                        [1, 0, 0] = 고양이, [0, 1, 0] = 강아지
                    </p>
                    <p className={s.theoryParagraph}>
                        <strong>2. 임베딩 레이어의 입력</strong><br />
                        실제 GPT에서 원-핫 벡터는 임베딩 행렬과 곱해져서 밀집 벡터로 변환됩니다!<br />
                        <code className={s.theoryCode}>원-핫 × 임베딩 행렬 = 임베딩 벡터</code>
                    </p>
                    <p>
                        <strong>3. 4주차 미리보기</strong><br />
                        다음 주에는 이 원-핫의 한계를 해결하는 <strong className={s.embHighlight}>임베딩</strong>을 배웁니다!
                        단어의 의미를 담은 3D 은하수를 직접 체험해보세요. 🌌
                    </p>
                </div>
            </div>

            <div className={s.footer}>
                <button className={`btn-nova ${s.footerBtn}`} onClick={() => { handleComplete(); router.push('/week4/intro'); }}>
                    <span>🌌 다음: 임베딩 은하수 →</span>
                </button>
            </div>
        </div>
    );
}
