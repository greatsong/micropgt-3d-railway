'use client';

import { useState, useMemo, useCallback } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';

// ─── BPE 알고리즘 핵심 함수들 ───

/**
 * 코퍼스(문장 배열)를 문자 단위로 분리하여 초기 상태를 만든다.
 * 각 단어는 공백으로 구분된 문자 배열 + 끝을 나타내는 </w>로 표현.
 */
function initCorpus(sentences) {
    const wordFreq = {};
    sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/).filter(Boolean);
        words.forEach(w => {
            // 문자 단위로 쪼개고, 단어 끝에 </w> 추가
            const chars = w.split('').join(' ') + ' </w>';
            wordFreq[chars] = (wordFreq[chars] || 0) + 1;
        });
    });
    return wordFreq;
}

/**
 * 현재 코퍼스에서 모든 바이그램(연속 2개 토큰 쌍)의 빈도를 센다.
 */
function getBigramFreqs(wordFreq) {
    const bigramFreq = {};
    for (const [word, freq] of Object.entries(wordFreq)) {
        const symbols = word.split(' ');
        for (let i = 0; i < symbols.length - 1; i++) {
            const pair = symbols[i] + ' ' + symbols[i + 1];
            bigramFreq[pair] = (bigramFreq[pair] || 0) + freq;
        }
    }
    return bigramFreq;
}

/**
 * 가장 빈도 높은 바이그램을 찾아 병합한다.
 */
function mergeBigram(wordFreq, bestPair) {
    const [a, b] = bestPair.split(' ');
    const newWordFreq = {};
    // 정규식에서 특수문자 이스케이프
    const escaped = bestPair.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    const pattern = new RegExp(escaped, 'g');

    for (const [word, freq] of Object.entries(wordFreq)) {
        const newWord = word.replace(pattern, a + b);
        newWordFreq[newWord] = freq;
    }
    return newWordFreq;
}

/**
 * 현재 코퍼스에서 고유 토큰(vocab) 목록을 추출한다.
 */
function getVocab(wordFreq) {
    const vocab = new Set();
    for (const word of Object.keys(wordFreq)) {
        word.split(' ').forEach(sym => vocab.add(sym));
    }
    return [...vocab].sort();
}

// ─── 예시 코퍼스 프리셋 ───

const PRESETS = {
    english: {
        label: 'English',
        sentences: [
            'low low low low low',
            'lower lower lower',
            'newest newest newest newest',
            'widest widest',
        ],
        description: '"low", "lower", "newest", "widest" -- 접미사 공유 패턴',
    },
    korean: {
        label: '한국어',
        sentences: [
            '안녕 안녕 안녕 안녕',
            '안녕하세요 안녕하세요 안녕하세요',
            '하세요 하세요',
            '세요 세요 세요',
        ],
        description: '"안녕", "안녕하세요", "하세요", "세요" -- 한국어 음절 병합',
    },
    mixed: {
        label: 'Mixed',
        sentences: [
            'token token token token',
            'tokenize tokenize tokenize',
            'tokenizer tokenizer',
        ],
        description: '"token", "tokenize", "tokenizer" -- 어근 공유 패턴',
    },
};

// ─── 메인 컴포넌트 ───

export default function TokenizerLab() {
    const [inputText, setInputText] = useState("Artificial Intelligence is fascinating!");

    // BPE 시뮬레이션 상태
    const [bpePreset, setBpePreset] = useState('english');
    const [bpeHistory, setBpeHistory] = useState(null);  // { steps: [...], currentStep: 0 }
    const [showDeepDive, setShowDeepDive] = useState(false);

    // ─── 기존 휴리스틱 토크나이저 (유지) ───
    const tokens = useMemo(() => {
        if (!inputText) return [];

        let words = inputText.split(/(\s+|[.,!?;])/).filter(Boolean);
        let detailedTokens = [];

        const suffixes = ['ing', 'ed', 'ly', 'tion', 'ment', 'nes', 's', 'al', 'ive', 'ic', 'est', 'er'];
        const prefixes = ['un', 're', 'im', 'in', 'dis', 'pre', 'anti', 'super', 'micro'];

        words.forEach(word => {
            if (/^[\s.,!?;]+$/.test(word)) {
                detailedTokens.push(word);
                return;
            }

            let current = word;
            let subwords = [];

            for (let pre of prefixes) {
                if (current.toLowerCase().startsWith(pre) && current.length > pre.length + 2) {
                    subwords.push(current.slice(0, pre.length));
                    current = current.slice(pre.length);
                    break;
                }
            }

            let suffixFound = null;
            for (let suf of suffixes) {
                if (current.toLowerCase().endsWith(suf) && current.length > suf.length + 2) {
                    suffixFound = suf;
                    break;
                }
            }

            if (suffixFound) {
                let stem = current.slice(0, -suffixFound.length);
                if (stem) subwords.push(stem);
                subwords.push(suffixFound);
            } else {
                if (current) subwords.push(current);
            }

            if (subwords.length === 0) detailedTokens.push(word);
            else detailedTokens.push(...subwords);
        });

        return detailedTokens.map((t, i) => ({
            id: i,
            text: t,
            color: getTokenColor(t),
            type: /^\s+$/.test(t) ? 'space' : 'token'
        }));
    }, [inputText]);

    // ─── BPE 시뮬레이션 로직 ───

    const initBpe = useCallback(() => {
        const preset = PRESETS[bpePreset];
        const initialCorpus = initCorpus(preset.sentences);
        const bigramFreqs = getBigramFreqs(initialCorpus);
        const vocab = getVocab(initialCorpus);

        const steps = [{
            corpus: initialCorpus,
            bigramFreqs,
            vocab,
            mergedPair: null,
            mergeIndex: 0,
        }];

        setBpeHistory({ steps, currentStep: 0 });
    }, [bpePreset]);

    const nextMerge = useCallback(() => {
        if (!bpeHistory) return;
        const { steps, currentStep } = bpeHistory;
        const current = steps[currentStep];

        const bigramFreqs = current.bigramFreqs;
        if (Object.keys(bigramFreqs).length === 0) return;

        // 가장 빈도 높은 바이그램 찾기
        let bestPair = null;
        let bestFreq = 0;
        for (const [pair, freq] of Object.entries(bigramFreqs)) {
            if (freq > bestFreq) {
                bestPair = pair;
                bestFreq = freq;
            }
        }
        if (!bestPair) return;

        const newCorpus = mergeBigram(current.corpus, bestPair);
        const newBigramFreqs = getBigramFreqs(newCorpus);
        const newVocab = getVocab(newCorpus);

        const newStep = {
            corpus: newCorpus,
            bigramFreqs: newBigramFreqs,
            vocab: newVocab,
            mergedPair: bestPair,
            mergedFreq: bestFreq,
            mergeIndex: currentStep + 1,
        };

        const newSteps = [...steps, newStep];
        setBpeHistory({ steps: newSteps, currentStep: currentStep + 1 });
    }, [bpeHistory]);

    const goToStep = useCallback((idx) => {
        if (!bpeHistory) return;
        setBpeHistory(prev => ({ ...prev, currentStep: idx }));
    }, [bpeHistory]);

    const currentBpeStep = bpeHistory ? bpeHistory.steps[bpeHistory.currentStep] : null;

    // 바이그램을 빈도순으로 정렬 (상위 10개)
    const sortedBigrams = useMemo(() => {
        if (!currentBpeStep) return [];
        return Object.entries(currentBpeStep.bigramFreqs)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    }, [currentBpeStep]);

    // 병합 히스토리 (현재 단계까지의 병합 기록)
    const mergeLog = useMemo(() => {
        if (!bpeHistory) return [];
        return bpeHistory.steps
            .filter(s => s.mergedPair)
            .slice(0, bpeHistory.currentStep);
    }, [bpeHistory]);

    return (
        <div style={styles.container}>
            {/* 네비게이션 헤더 */}
            <Breadcrumb
                items={[{ label: '1주차 인트로', href: '/week1/intro' }]}
                current="토크나이저 실험실"
            />
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={{ fontSize: '1.5rem', marginRight: 8 }}>🧩</span>
                    <span style={{ fontWeight: 700 }}>토크나이저 실험실</span>
                </div>
            </div>

            <div style={styles.content}>
                {/* ── 섹션 1: 기존 토크나이저 ── */}
                <div style={styles.card}>
                    <h3 style={styles.label}>텍스트 입력 (Prompt: AI에게 주는 질문이나 명령)</h3>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        style={styles.textarea}
                        placeholder="여기에 영어나 한글을 입력해보세요..."
                        rows={4}
                    />
                    <div style={styles.helper}>
                        💡 컴퓨터는 이 문장을 이해하지 못합니다. 먼저 '토큰'으로 잘게 쪼개야 하죠!
                    </div>
                </div>

                {/* 화살표 */}
                <div style={styles.arrowArea}>
                    <div style={styles.arrowLine}></div>
                    <div style={styles.tokenCount}>
                        {tokens.filter(t => t.type !== 'space').length} Tokens
                    </div>
                </div>

                {/* 결과 영역 */}
                <div style={styles.card}>
                    <h3 style={styles.label}>토큰화 결과 (Tokenization)</h3>
                    <div style={styles.tokenContainer}>
                        {tokens.map((token) => (
                            <span
                                key={token.id}
                                style={{
                                    ...styles.token,
                                    background: token.type === 'space' ? 'transparent' : token.color,
                                    border: token.type === 'space' ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)',
                                    minWidth: token.type === 'space' ? 8 : 'auto',
                                }}
                                title={`ID: ${getStringHash(token.text)}`}
                            >
                                {token.type === 'space' ? ' ' : token.text}
                                <span style={styles.tokenId}>{getStringHash(token.text)}</span>
                            </span>
                        ))}
                    </div>
                    <p style={styles.explanation}>
                        각 색깔 블록 하나가 <strong>1개의 토큰</strong>입니다.<br />
                        &quot;fascinating&quot; 같은 단어가 &quot;fascinat&quot; + &quot;ing&quot;으로 나뉘는 것을 관찰해보세요!
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
                        각 토큰 아래 숫자는 Token ID입니다. AI는 글자 대신 이 숫자를 사용합니다.
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════════
                    섹션 2: BPE 시뮬레이션 (신규)
                ══════════════════════════════════════════════════════ */}
                <div style={{ ...styles.card, marginTop: 28, border: '1px solid var(--border-active)' }}>
                    <h3 style={{ ...styles.label, color: 'var(--accent-star-cyan)' }}>
                        🔬 BPE (Byte Pair Encoding) 시뮬레이션
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — 자주 나란히 붙는 두 조각(Pair)을 하나로 합치는 알고리즘. 원래 데이터 압축 기법에서 유래</span>
                    </h3>
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(251, 191, 36, 0.06)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                        marginBottom: 12,
                        fontSize: '0.82rem',
                        color: 'var(--text-dim)',
                        lineHeight: 1.6,
                    }}>
                        왜 BPE가 필요할까요? 단어 단위로 쪼개면 처음 보는 단어(신조어, 외래어)를 처리할 수 없고, 글자 단위로 쪼개면 문장이 너무 길어집니다. BPE는 이 두 문제를 동시에 해결하기 위해 만들어진 알고리즘입니다.
                    </div>
                    <p style={styles.bpeDescription}>
                        실제 BPE 알고리즘이 동작하는 과정을 단계별로 관찰해보세요.
                        문자 단위에서 시작하여, 가장 자주 등장하는 <strong style={{ color: 'var(--accent-star-cyan)' }}>바이그램</strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}> (나란히 붙어 있는 두 토큰 쌍, 예: &quot;l&quot;+&quot;o&quot; → &quot;lo&quot;)</span>을
                        반복적으로 병합합니다.
                    </p>
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.15)',
                        marginBottom: 16,
                        fontSize: '0.82rem',
                        color: 'var(--text-dim)',
                        lineHeight: 1.6,
                    }}>
                        💡 시뮬레이션에서 보이는 <code style={{ color: 'var(--accent-laser-gold)' }}>&lt;/w&gt;</code>는
                        &quot;<strong>단어의 끝</strong>&quot;을 표시하는 특수 기호예요.
                        예를 들어 <code>l o w &lt;/w&gt;</code>는 &quot;low라는 단어가 여기서 끝남&quot;을 뜻합니다.
                        이 기호 덕분에 &quot;low&quot;(낮은)와 &quot;lower&quot;(더 낮은)를 구분할 수 있어요!
                    </div>

                    {/* 프리셋 선택 */}
                    <div style={styles.presetRow}>
                        {Object.entries(PRESETS).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => { setBpePreset(key); setBpeHistory(null); }}
                                style={{
                                    ...styles.presetBtn,
                                    ...(bpePreset === key ? styles.presetBtnActive : {}),
                                }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <p style={styles.presetDesc}>{PRESETS[bpePreset].description}</p>

                    {/* 코퍼스 미리보기 */}
                    <div style={styles.corpusPreview}>
                        <div style={styles.corpusLabel}>코퍼스 (Corpus, AI가 학습에 사용하는 텍스트 모음):</div>
                        {PRESETS[bpePreset].sentences.map((s, i) => (
                            <code key={i} style={styles.corpusLine}>{s}</code>
                        ))}
                    </div>

                    {/* 시작/리셋 버튼 */}
                    <div style={styles.bpeBtnRow}>
                        <button onClick={initBpe} className="btn-nova" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                            <span>{bpeHistory ? '리셋' : '시뮬레이션 시작'}</span>
                        </button>
                        {bpeHistory && (
                            <button
                                onClick={nextMerge}
                                className="btn-nova"
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '0.9rem',
                                    background: 'linear-gradient(135deg, var(--accent-star-cyan), var(--accent-nova))',
                                }}
                                disabled={sortedBigrams.length === 0}
                            >
                                <span>다음 병합 →</span>
                            </button>
                        )}
                    </div>

                    {/* BPE 결과 표시 영역 */}
                    {bpeHistory && currentBpeStep && (
                        <div style={styles.bpeResult}>
                            {/* 스텝 네비게이션 */}
                            <div style={styles.stepNav}>
                                {bpeHistory.steps.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToStep(idx)}
                                        style={{
                                            ...styles.stepDot,
                                            background: idx === bpeHistory.currentStep
                                                ? 'var(--accent-star-cyan)'
                                                : idx <= bpeHistory.currentStep
                                                    ? 'var(--accent-nova)'
                                                    : 'rgba(255,255,255,0.1)',
                                        }}
                                        title={idx === 0 ? '초기 상태' : `병합 #${idx}`}
                                    >
                                        {idx}
                                    </button>
                                ))}
                                <span style={styles.stepLabel}>
                                    Step {bpeHistory.currentStep} / {bpeHistory.steps.length - 1}
                                </span>
                            </div>

                            {/* 이번 단계에서 병합된 쌍 */}
                            {currentBpeStep.mergedPair && (
                                <div style={styles.mergedInfo}>
                                    병합 #{currentBpeStep.mergeIndex}:&nbsp;
                                    <code style={styles.mergedPairCode}>
                                        {currentBpeStep.mergedPair}
                                    </code>
                                    &nbsp;→&nbsp;
                                    <code style={styles.mergedResultCode}>
                                        {currentBpeStep.mergedPair.replace(' ', '')}
                                    </code>
                                    &nbsp;(빈도: {currentBpeStep.mergedFreq})
                                </div>
                            )}

                            {/* 2단 레이아웃: 왼쪽 코퍼스 상태, 오른쪽 바이그램 빈도 */}
                            <div style={styles.bpeTwoCol}>
                                {/* 현재 코퍼스 상태 */}
                                <div style={styles.bpeCol}>
                                    <div style={styles.bpeColTitle}>현재 코퍼스 상태</div>
                                    <div style={styles.corpusState}>
                                        {Object.entries(currentBpeStep.corpus).map(([word, freq], i) => (
                                            <div key={i} style={styles.corpusEntry}>
                                                <span style={styles.corpusFreq}>x{freq}</span>
                                                <div style={styles.corpusTokens}>
                                                    {word.split(' ').map((sym, j) => (
                                                        <span
                                                            key={j}
                                                            style={{
                                                                ...styles.bpeToken,
                                                                background: getTokenColor(sym),
                                                            }}
                                                        >
                                                            {sym}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* 바이그램 빈도 Top 10 */}
                                <div style={styles.bpeCol}>
                                    <div style={styles.bpeColTitle}>바이그램 빈도 Top 10</div>
                                    {sortedBigrams.length > 0 ? (
                                        <table style={styles.bigramTable}>
                                            <thead>
                                                <tr>
                                                    <th style={styles.thCell}>순위</th>
                                                    <th style={styles.thCell}>바이그램</th>
                                                    <th style={styles.thCell}>빈도</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedBigrams.map(([pair, freq], idx) => (
                                                    <tr key={idx} style={idx === 0 ? styles.topRow : {}}>
                                                        <td style={styles.tdCell}>{idx + 1}</td>
                                                        <td style={styles.tdCell}>
                                                            <code style={styles.bigramCode}>{pair}</code>
                                                        </td>
                                                        <td style={{ ...styles.tdCell, fontWeight: 700 }}>{freq}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                            더 이상 병합할 바이그램이 없습니다!
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Vocab */}
                            <div style={styles.vocabSection}>
                                <div style={styles.bpeColTitle}>
                                    현재 Vocabulary ({currentBpeStep.vocab.length}개)
                                </div>
                                <div style={styles.vocabList}>
                                    {currentBpeStep.vocab.map((v, i) => (
                                        <span key={i} style={styles.vocabItem}>{v}</span>
                                    ))}
                                </div>
                            </div>

                            {/* 병합 히스토리 */}
                            {mergeLog.length > 0 && (
                                <div style={styles.mergeLogSection}>
                                    <div style={styles.bpeColTitle}>병합 히스토리</div>
                                    <div style={styles.mergeLogList}>
                                        {mergeLog.map((step, i) => (
                                            <div key={i} style={styles.mergeLogEntry}>
                                                <span style={styles.mergeLogIdx}>#{step.mergeIndex}</span>
                                                <code>{step.mergedPair}</code>
                                                <span style={{ color: 'var(--text-dim)' }}>→</span>
                                                <code style={{ color: 'var(--accent-star-cyan)' }}>
                                                    {step.mergedPair.replace(' ', '')}
                                                </code>
                                                <span style={styles.mergeLogFreq}>({step.mergedFreq})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════════
                    섹션 3: Theory -- 왜 BPE인가?
                ══════════════════════════════════════════════════════ */}
                <div style={styles.card}>
                    <h3 style={styles.label}>📐 왜 BPE(Byte Pair Encoding)인가?</h3>
                    <div style={styles.theoryContent}>
                        <p>
                            토크나이저를 설계할 때 세 가지 전략이 있습니다. 각각의 장단점을 비교해 보겠습니다.
                        </p>

                        {/* 비교표 */}
                        <table style={styles.comparisonTable}>
                            <thead>
                                <tr>
                                    <th style={styles.compTh}></th>
                                    <th style={styles.compTh}>단어 단위<br />(Word-level)</th>
                                    <th style={styles.compTh}>문자 단위<br />(Character-level)</th>
                                    <th style={{ ...styles.compTh, color: 'var(--accent-star-cyan)' }}>
                                        서브워드(BPE)<br />(Subword-level)
                                        <br /><span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>서브워드(Subword)란 단어와 글자의 중간 크기 조각. 예: &apos;tokenizer&apos; → &apos;token&apos; + &apos;izer&apos;</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={styles.compTd}>Vocab 크기</td>
                                    <td style={styles.compTd}>매우 큼 (100K+)</td>
                                    <td style={styles.compTd}>매우 작음 (~256)</td>
                                    <td style={{ ...styles.compTd, color: 'var(--accent-star-cyan)' }}>적당함 (~50K)</td>
                                </tr>
                                <tr>
                                    <td style={styles.compTd}>
                                        OOV 처리
                                        <br/><span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                            (Out Of Vocabulary:<br/>사전에 없는 단어)
                                        </span>
                                    </td>
                                    <td style={styles.compTd}>불가능 (UNK: Unknown, 모르는 단어 표시 토큰)</td>
                                    <td style={styles.compTd}>완벽</td>
                                    <td style={{ ...styles.compTd, color: 'var(--accent-star-cyan)' }}>거의 완벽</td>
                                </tr>
                                <tr>
                                    <td style={styles.compTd}>시퀀스 길이</td>
                                    <td style={styles.compTd}>짧음</td>
                                    <td style={styles.compTd}>매우 김</td>
                                    <td style={{ ...styles.compTd, color: 'var(--accent-star-cyan)' }}>적당함</td>
                                </tr>
                                <tr>
                                    <td style={styles.compTd}>의미 보존</td>
                                    <td style={styles.compTd}>좋음</td>
                                    <td style={styles.compTd}>나쁨</td>
                                    <td style={{ ...styles.compTd, color: 'var(--accent-star-cyan)' }}>좋음</td>
                                </tr>
                                <tr>
                                    <td style={styles.compTd}>신조어 대응</td>
                                    <td style={styles.compTd}>불가능</td>
                                    <td style={styles.compTd}>가능</td>
                                    <td style={{ ...styles.compTd, color: 'var(--accent-star-cyan)' }}>가능</td>
                                </tr>
                            </tbody>
                        </table>

                        <p>
                            <strong>BPE는 단어 단위와 문자 단위의 장점을 결합</strong>합니다.
                            자주 나오는 문자열은 하나의 토큰으로 묶어 시퀀스를 짧게 유지하면서,
                            처음 보는 단어도 서브워드 조합으로 표현할 수 있습니다.
                        </p>

                        <div style={styles.highlightBox}>
                            <strong>GPT-2/3의 토크나이저</strong>는 BPE 기반이며,
                            vocab size = <strong style={{ color: 'var(--accent-laser-gold)' }}>50,257</strong>개의 토큰을 사용합니다.
                            이 중 256개는 기본 바이트, 1개는 특수 토큰(&lt;|endoftext|&gt;),
                            나머지 50,000개가 BPE 병합으로 만들어진 서브워드입니다.
                        </div>
                    </div>
                </div>

                {/* ── 한 걸음 더: 토큰과 비용 ── */}
                <div style={{
                    borderRadius: 12,
                    border: '1px solid rgba(124, 92, 252, 0.2)',
                    overflow: 'hidden',
                    marginBottom: 20,
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
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: 토큰 수가 왜 중요할까? (비용과 성능)
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
                                토큰 수는 AI의 <strong>비용</strong>과 <strong>성능</strong> 두 가지에 직접 영향을 줍니다:
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#fbbf24' }}>1. 비용 (Cost)</strong> —
                                ChatGPT 같은 API는 토큰 수에 따라 요금을 매겨요.
                                같은 의미의 문장이라도 토큰이 많으면 비용이 올라갑니다.
                                한글 &quot;안녕하세요&quot;는 영어 &quot;Hello&quot;보다 더 많은 토큰으로 쪼개져서, 같은 내용이라도 한국어가 비용이 더 높을 수 있어요.
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#34d399' }}>2. 컨텍스트 윈도우 (Context Window)</strong> —
                                LLM이 한 번에 &quot;기억&quot;할 수 있는 토큰 수에는 한계가 있어요.
                                GPT-4는 약 128K 토큰, Claude는 약 200K 토큰까지 처리 가능합니다.
                                토큰이 효율적으로 쪼개질수록 같은 윈도우 안에 더 많은 내용을 담을 수 있죠.
                            </p>
                            <p>
                                <strong style={{ color: '#f87171' }}>3. 실제 규모</strong> —
                                GPT-2는 50,257개, GPT-4는 약 100,000개의 토큰 사전(Vocabulary)을 사용합니다.
                                사전이 클수록 자주 쓰는 표현을 하나의 토큰으로 묶어 효율적이지만,
                                그만큼 모델이 학습해야 할 양도 늘어나는 트레이드오프가 있어요.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Theory Section (기존 유지) ── */}
                <div style={styles.card}>
                    <h3 style={styles.label}>🤖 LLM은 텍스트를 어떻게 이해하나요?</h3>
                    <div style={styles.theoryContent}>
                        <p>
                            <strong>1. AI는 글자가 아닌 숫자(Token ID)를 봅니다.</strong><br />
                            우리가 &quot;Hello, AI!&quot;라고 입력하면, Transformer 모델은 이를 <code>[15496, 11, 9552, 0]</code> 같은 숫자 배열로 인식합니다.
                            컴퓨터에게는 모든 것이 숫자(행렬) 연산이기 때문입니다.
                        </p>
                        <p>
                            <strong>2. 토큰 비용과 컨텍스트(Context Window)</strong><br />
                            LLM의 성능은 한 번에 처리할 수 있는 토큰의 수(Context Window)에 달려있습니다.
                            한글은 영어보다 토큰으로 쪼개질 때 개수가 더 많이 나와서, 같은 의미라도 처리 비용이 더 높을 수 있습니다! 💸
                        </p>
                        <p>
                            <strong>3. 한국어와 BPE</strong><br />
                            한국어는 음절 하나가 초성+중성+종성으로 구성되어, 영어보다 고유한 문자 수가 훨씬 많습니다.
                            BPE는 자주 등장하는 음절 조합(&quot;하세요&quot;, &quot;습니다&quot; 등)을 하나의 토큰으로 병합하여
                            한국어도 효율적으로 처리할 수 있게 됩니다.
                            위의 BPE 시뮬레이션에서 &quot;한국어&quot; 프리셋을 선택하여 직접 확인해보세요!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── 유틸 함수 ───

function getTokenColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c + '80';
}

function getStringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 50000);
}

// ─── 스타일 ───

const styles = {
    container: {
        minHeight: '100vh',
        padding: '20px',
        maxWidth: 800,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 30,
        paddingBottom: 20,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-dim)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        marginRight: 20,
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '1.2rem',
        color: '#fff',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
    },
    card: {
        background: 'rgba(15, 10, 40, 0.6)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(124, 92, 252, 0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        marginBottom: 20,
    },
    label: {
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        marginBottom: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    textarea: {
        width: '100%',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 16,
        color: '#fff',
        fontSize: '1.1rem',
        lineHeight: 1.6,
        resize: 'vertical',
        outline: 'none',
        fontFamily: 'monospace',
    },
    helper: {
        fontSize: '0.85rem',
        color: 'var(--text-dim)',
        marginTop: 10,
    },
    arrowArea: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '20px 0',
        position: 'relative',
    },
    arrowLine: {
        width: 2,
        height: 40,
        background: 'rgba(255,255,255,0.1)',
    },
    tokenCount: {
        position: 'absolute',
        background: '#7c5cfc',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: '0.8rem',
        fontWeight: 700,
        color: '#fff',
    },
    tokenContainer: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        minHeight: 100,
        alignContent: 'flex-start',
    },
    token: {
        padding: '6px 10px',
        borderRadius: 6,
        fontSize: '1rem',
        color: '#fff',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        transition: 'transform 0.2s',
        cursor: 'default',
        position: 'relative',
    },
    tokenId: {
        fontSize: '0.6rem',
        opacity: 0.6,
        marginTop: 2,
    },
    explanation: {
        marginTop: 20,
        fontSize: '0.9rem',
        color: 'var(--text-secondary)',
        textAlign: 'center',
        lineHeight: 1.6,
        background: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 8,
    },
    theoryContent: {
        color: '#cbd5e1',
        fontSize: '0.95rem',
        lineHeight: 1.7,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },

    // ── BPE 시뮬레이션 스타일 ──
    bpeDescription: {
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        marginBottom: 16,
    },
    presetRow: {
        display: 'flex',
        gap: 8,
        marginBottom: 8,
    },
    presetBtn: {
        padding: '8px 18px',
        borderRadius: 20,
        border: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.3)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        transition: 'all 0.2s',
    },
    presetBtnActive: {
        background: 'var(--accent-nova)',
        color: '#fff',
        border: '1px solid var(--accent-nova)',
    },
    presetDesc: {
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        marginBottom: 12,
        fontStyle: 'italic',
    },
    corpusPreview: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    corpusLabel: {
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: 600,
    },
    corpusLine: {
        fontSize: '0.85rem',
        color: 'var(--accent-pulsar)',
        fontFamily: 'monospace',
    },
    bpeBtnRow: {
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    bpeResult: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    stepNav: {
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    stepDot: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: '0.7rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    stepLabel: {
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        marginLeft: 8,
    },
    mergedInfo: {
        background: 'rgba(34, 211, 238, 0.1)',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        borderRadius: 8,
        padding: '10px 16px',
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    mergedPairCode: {
        background: 'rgba(244, 114, 182, 0.2)',
        padding: '2px 8px',
        borderRadius: 4,
        color: 'var(--accent-nebula-pink)',
        fontFamily: 'monospace',
        fontWeight: 700,
    },
    mergedResultCode: {
        background: 'rgba(34, 211, 238, 0.2)',
        padding: '2px 8px',
        borderRadius: 4,
        color: 'var(--accent-star-cyan)',
        fontFamily: 'monospace',
        fontWeight: 700,
    },
    bpeTwoCol: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
    },
    bpeCol: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 12,
    },
    bpeColTitle: {
        fontSize: '0.8rem',
        color: 'var(--accent-pulsar)',
        fontWeight: 700,
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: '0.04em',
    },
    corpusState: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        maxHeight: 240,
        overflowY: 'auto',
    },
    corpusEntry: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    },
    corpusFreq: {
        fontSize: '0.75rem',
        color: 'var(--accent-laser-gold)',
        fontWeight: 700,
        minWidth: 24,
    },
    corpusTokens: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
    },
    bpeToken: {
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: '0.8rem',
        color: '#fff',
        fontFamily: 'monospace',
        border: '1px solid rgba(255,255,255,0.15)',
    },
    bigramTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.8rem',
    },
    thCell: {
        textAlign: 'left',
        padding: '4px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        color: 'var(--text-dim)',
        fontWeight: 600,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
    },
    tdCell: {
        padding: '4px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        color: 'var(--text-secondary)',
    },
    topRow: {
        background: 'rgba(34, 211, 238, 0.08)',
    },
    bigramCode: {
        fontFamily: 'monospace',
        color: 'var(--accent-pulsar)',
    },
    vocabSection: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 12,
    },
    vocabList: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
    },
    vocabItem: {
        padding: '2px 8px',
        borderRadius: 4,
        background: 'rgba(124, 92, 252, 0.15)',
        border: '1px solid rgba(124, 92, 252, 0.25)',
        fontSize: '0.75rem',
        color: 'var(--accent-pulsar)',
        fontFamily: 'monospace',
    },
    mergeLogSection: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: 12,
    },
    mergeLogList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    mergeLogEntry: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        color: 'var(--text-secondary)',
    },
    mergeLogIdx: {
        color: 'var(--accent-laser-gold)',
        fontWeight: 700,
        minWidth: 24,
    },
    mergeLogFreq: {
        color: 'var(--text-dim)',
        fontSize: '0.75rem',
    },

    // ── 비교표 스타일 ──
    comparisonTable: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem',
        margin: '8px 0',
    },
    compTh: {
        textAlign: 'center',
        padding: '10px 8px',
        borderBottom: '2px solid rgba(124, 92, 252, 0.3)',
        color: 'var(--text-primary)',
        fontWeight: 700,
        fontSize: '0.8rem',
        lineHeight: 1.4,
    },
    compTd: {
        textAlign: 'center',
        padding: '8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--text-secondary)',
        fontSize: '0.8rem',
        lineHeight: 1.4,
    },
    highlightBox: {
        background: 'rgba(251, 191, 36, 0.08)',
        border: '1px solid rgba(251, 191, 36, 0.25)',
        borderRadius: 8,
        padding: 14,
        fontSize: '0.9rem',
        color: 'var(--text-primary)',
        lineHeight: 1.6,
    },
};
