'use client';

import { useState } from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';

const MODEL_PRESETS = [
    { name: 'GPT-2 Small', layers: 12, dModel: 768, heads: 12 },
    { name: 'GPT-2 Medium', layers: 24, dModel: 1024, heads: 16 },
    { name: 'GPT-2 Large', layers: 36, dModel: 1280, heads: 20 },
    { name: 'GPT-2 XL', layers: 48, dModel: 1600, heads: 25 },
    { name: 'GPT-3', layers: 96, dModel: 12288, heads: 96 },
];

function estimateParams(layers, dModel) {
    // 대략적 추정: 각 블록 = MHA(4*d^2) + FFN(8*d^2) + norms 등
    // MHA: Q,K,V,O 각 d*d → 4*d^2 + bias ≈ 4*d^2
    // FFN: d*4d + 4d*d = 8*d^2
    // 총 블록당 ≈ 12*d^2
    const perBlock = 12 * dModel * dModel;
    const embedding = 50257 * dModel; // vocab(어휘 크기: 모델이 아는 모든 토큰의 수) * dModel
    const posEmb = 2048 * dModel; // max_seq * dModel (GPT-2 기준)
    return layers * perBlock + embedding + posEmb;
}

function formatParams(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return n.toString();
}

export default function ArchitectureLab() {
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [numLayers, setNumLayers] = useState(12);
    const [dModel, setDModel] = useState(768);
    const [numHeads, setNumHeads] = useState(12);
    const [showDeepDive, setShowDeepDive] = useState(false);

    const headDim = Math.floor(dModel / numHeads);
    const seqLen = 512;

    const blocks = [
        {
            id: 'input',
            name: 'Input Embeddings',
            shape: '[Batch, Seq, Emb]',
            shapeExplain: 'Batch = 한 번에 처리하는 문장 수, Seq = 문장의 토큰 수, Emb = 각 토큰의 벡터 차원',
            inputShape: `[1, ${seqLen}, vocab]`,
            outputShape: `[1, ${seqLen}, ${dModel}]`,
            desc: '토큰이 벡터로 변환된 상태입니다. 위치 정보(Positional Encoding)가 더해져 있습니다.',
            paramDetail: `Token Embedding: 50,257 x ${dModel} = ${(50257 * dModel).toLocaleString()}\nPosition Embedding: 2,048 x ${dModel} = ${(2048 * dModel).toLocaleString()}`,
            color: '#94a3b8'
        },
        {
            id: 'mha',
            name: 'Multi-Head Attention',
            shape: `[1, ${numHeads}, ${seqLen}, ${headDim}]`,
            inputShape: `[1, ${seqLen}, ${dModel}]`,
            outputShape: `[1, ${seqLen}, ${dModel}]`,
            desc: '입력 문장 내의 단어들 간 관계를 계산합니다. "그것"이 무엇을 가리키는지 등을 파악합니다.',
            paramDetail: `Q, K, V 각각: ${dModel} x ${dModel} = ${(dModel * dModel).toLocaleString()}\n출력 투영(Output proj: Multi-Head 결과를 하나로 합치는 가중치): ${dModel} x ${dModel} = ${(dModel * dModel).toLocaleString()}\n합계: 4 x ${dModel}^2 = ${(4 * dModel * dModel).toLocaleString()} params`,
            color: '#f472b6'
        },
        {
            id: 'norm1',
            name: 'Add & Norm',
            shape: `[1, ${seqLen}, ${dModel}]`,
            inputShape: `[1, ${seqLen}, ${dModel}]`,
            outputShape: `[1, ${seqLen}, ${dModel}]`,
            desc: 'Residual Connection(입력 더하기)과 Layer Normalization(정규화)을 수행하여 학습을 안정화합니다. Residual Connection = 입력을 출력에 그대로 더해주는 지름길. 층이 아무리 깊어도 원래 정보가 보존됩니다.',
            paramDetail: `LayerNorm: gamma(${dModel}) + beta(${dModel}) = ${(2 * dModel).toLocaleString()} params\n차원 변화 없음 (shape 유지)`,
            color: '#fbbf24'
        },
        {
            id: 'ffn',
            name: 'Feed Forward (MLP: 다층 퍼셉트론, 가장 기본적인 신경망 구조)',
            shape: `[1, ${seqLen}, ${4 * dModel}]`,
            inputShape: `[1, ${seqLen}, ${dModel}]`,
            outputShape: `[1, ${seqLen}, ${dModel}]`,
            desc: '각 토큰별로 독립적으로 처리되는 신경망입니다. 지식과 추론 능력이 저장되는 곳으로 추정됩니다. 중간 차원이 4배인 이유: 넓게 펼쳤다 좁히면 더 풍부한 표현을 학습. 원 논문의 실험적 비율.',
            paramDetail: `Linear1: ${dModel} x ${4 * dModel} = ${(dModel * 4 * dModel).toLocaleString()}\nLinear2: ${4 * dModel} x ${dModel} = ${(4 * dModel * dModel).toLocaleString()}\n합계: 8 x ${dModel}^2 = ${(8 * dModel * dModel).toLocaleString()} params`,
            color: '#60a5fa'
        },
        {
            id: 'norm2',
            name: 'Add & Norm',
            shape: `[1, ${seqLen}, ${dModel}]`,
            inputShape: `[1, ${seqLen}, ${dModel}]`,
            outputShape: `[1, ${seqLen}, ${dModel}]`,
            desc: '두 번째 잔차 연결과 정규화입니다. 블록의 최종 출력을 만듭니다.',
            paramDetail: `LayerNorm: gamma(${dModel}) + beta(${dModel}) = ${(2 * dModel).toLocaleString()} params`,
            color: '#fbbf24'
        },
        {
            id: 'output',
            name: 'Output Latents',
            shape: `[1, ${seqLen}, ${dModel}]`,
            inputShape: `[1, ${seqLen}, ${dModel}]`,
            outputShape: `[1, ${seqLen}, vocab]`,
            desc: '다음 블록으로 전달되거나, 마지막 블록인 경우 단어 확률(Logits)로 변환됩니다.',
            paramDetail: `LM Head: ${dModel} x 50,257 = ${(dModel * 50257).toLocaleString()} params\n(보통 Embedding weight와 공유 — '단어→벡터'와 '벡터→단어' 변환이 같은 관계라서 파라미터 절약 가능)`,
            color: '#94a3b8'
        }
    ];

    const currentInfo = blocks.find(b => b.id === selectedBlock) || {
        name: 'GPT Transformer Block',
        desc: '블록의 각 부분을 클릭하여 상세 설명을 확인하세요.',
        shape: 'Interactive Mode'
    };

    const totalParams = estimateParams(numLayers, dModel);

    const blockYPositions = [50, 140, 230, 320, 410, 500];
    const shapePositions = [];
    for (let i = 0; i < blocks.length - 1; i++) {
        const midY = (blockYPositions[i] + blockYPositions[i + 1]) / 2;
        shapePositions.push({
            y: midY,
            shape: blocks[i].outputShape
        });
    }

    function handlePreset(preset) {
        setNumLayers(preset.layers);
        setDModel(preset.dModel);
        setNumHeads(preset.heads);
    }

    return (
        <div style={styles.container}>
            <Breadcrumb
                items={[{ label: '13주차 인트로', href: '/week13/intro' }]}
                current="GPT 아키텍처"
            />
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={{ fontSize: '1.5rem', marginRight: 8 }}>🏗️</span>
                    <span style={{ fontWeight: 700 }}>GPT 아키텍처 (Transformer Block)</span>
                </div>
            </div>

            <div style={styles.content}>
                {/* 1. Diagram (Left) */}
                <div style={styles.card}>
                    <h3 style={styles.label}>트랜스포머 블록 구조도</h3>
                    <div style={styles.diagramContainer}>
                        <svg width="300" height="620" viewBox="0 0 300 620" style={{ margin: '0 auto', overflow: 'visible' }}>
                            <defs>
                                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
                                </marker>
                            </defs>

                            {/* Flow Lines */}
                            <line x1="150" y1="50" x2="150" y2="550" stroke="#334155" strokeWidth="2" />

                            {/* Residual Connections */}
                            <path d="M150,90 C50,90 50,230 150,230" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
                            <path d="M150,270 C50,270 50,410 150,410" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />

                            {/* Input */}
                            <BlockNode y={50} data={blocks[0]} selected={selectedBlock === 'input'} onClick={setSelectedBlock} />

                            {/* Shape labels between blocks */}
                            {shapePositions.map((sp, i) => (
                                <text
                                    key={i}
                                    x="258"
                                    y={sp.y + 4}
                                    textAnchor="end"
                                    fill="#64748b"
                                    fontSize="8.5"
                                    fontFamily="monospace"
                                >
                                    {sp.shape}
                                </text>
                            ))}

                            {/* MHA */}
                            <BlockNode y={140} data={blocks[1]} selected={selectedBlock === 'mha'} onClick={setSelectedBlock} height={60} />

                            {/* Internal shape of MHA */}
                            <text x="255" y={145} textAnchor="end" fill="#f472b6" fontSize="7.5" fontFamily="monospace" opacity="0.7">
                                internal: [{numHeads}, {seqLen}, {headDim}]
                            </text>

                            {/* Norm 1 */}
                            <BlockNode y={230} data={blocks[2]} selected={selectedBlock === 'norm1'} onClick={setSelectedBlock} />

                            {/* FFN */}
                            <BlockNode y={320} data={blocks[3]} selected={selectedBlock === 'ffn'} onClick={setSelectedBlock} height={60} />

                            {/* Internal shape of FFN */}
                            <text x="255" y={325} textAnchor="end" fill="#60a5fa" fontSize="7.5" fontFamily="monospace" opacity="0.7">
                                hidden: [{seqLen}, {4 * dModel}]
                            </text>

                            {/* Norm 2 */}
                            <BlockNode y={410} data={blocks[4]} selected={selectedBlock === 'norm2'} onClick={setSelectedBlock} />

                            {/* Output */}
                            <BlockNode y={500} data={blocks[5]} selected={selectedBlock === 'output'} onClick={setSelectedBlock} />

                            {/* x N layers label */}
                            <rect x="220" y="125" width="80" height="310" rx="8" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="6 3" />
                            <text x="260" y="450" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontWeight="bold">
                                x {numLayers}
                            </text>
                        </svg>
                    </div>
                </div>

                {/* 2. Info Panel (Right) */}
                <div style={{ ...styles.card, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={styles.label}>상세 정보 (Details)</h3>

                    <div style={styles.infoBox}>
                        <h2 style={{ color: currentInfo.color || '#fff', marginBottom: 10 }}>{currentInfo.name}</h2>

                        <div style={styles.tag}>{currentInfo.shape}</div>
                        {currentInfo.shapeExplain && (
                            <div style={{ fontSize: '0.78rem', color: '#60a5fa', marginBottom: 12, lineHeight: 1.5, background: 'rgba(96,165,250,0.08)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(96,165,250,0.15)' }}>
                                {currentInfo.shapeExplain}
                            </div>
                        )}

                        <p style={{ lineHeight: 1.8, fontSize: '1.05rem', color: '#e2e8f0' }}>
                            {currentInfo.desc}
                        </p>

                        {/* 파라미터 수 계산 상세 */}
                        {selectedBlock && currentInfo.paramDetail && (
                            <div style={styles.paramBox}>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                                    파라미터(Parameter) 수 계산
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginBottom: 8, lineHeight: 1.5, background: 'rgba(251,191,36,0.08)', padding: '6px 10px', borderRadius: 6 }}>
                                    파라미터 = AI가 학습하는 모든 숫자(가중치와 편향). GPT-3는 1,750억 개의 파라미터를 가지고 있어요!
                                </div>
                                <pre style={styles.paramPre}>
                                    {currentInfo.paramDetail}
                                </pre>
                            </div>
                        )}

                        {/* Shape 흐름 표시 */}
                        {selectedBlock && currentInfo.inputShape && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={styles.shapeTag}>{currentInfo.inputShape}</span>
                                <span style={{ color: '#64748b', fontSize: '1.2rem' }}> → </span>
                                <span style={{ ...styles.shapeTag, border: `1px solid ${currentInfo.color || '#fff'}`, color: currentInfo.color || '#fff' }}>
                                    {currentInfo.outputShape}
                                </span>
                            </div>
                        )}

                        {!selectedBlock && (
                            <div style={{ marginTop: 30, padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                                <p>왼쪽 다이어그램에서 블록을 클릭해보세요!</p>
                            </div>
                        )}
                    </div>

                    {/* ── Model Size Slider ── */}
                    <div style={styles.sliderSection}>
                        <h3 style={styles.label}>모델 크기 비교 (N개 블록 쌓기)</h3>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                            {MODEL_PRESETS.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => handlePreset(p)}
                                    style={{
                                        ...styles.presetBtn,
                                        background: numLayers === p.layers && dModel === p.dModel
                                            ? 'var(--accent, #6366f1)'
                                            : 'rgba(255,255,255,0.08)',
                                        color: numLayers === p.layers && dModel === p.dModel
                                            ? '#fff'
                                            : '#94a3b8',
                                    }}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>
                                <span>블록 수 (Layers)</span>
                                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{numLayers}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="96"
                                value={numLayers}
                                onChange={e => setNumLayers(Number(e.target.value))}
                                style={styles.slider}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569' }}>
                                <span>1</span>
                                <span>96</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: 4 }}>
                                <span>은닉 크기(Hidden Size) (d_model)</span>
                                <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{dModel}</span>
                            </div>
                            <input
                                type="range"
                                min="128"
                                max="12288"
                                step="128"
                                value={dModel}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setDModel(val);
                                    // 헤드 수 자동 조정 (headDim이 64가 되도록)
                                    setNumHeads(Math.max(1, Math.floor(val / 64)));
                                }}
                                style={styles.slider}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#475569' }}>
                                <span>128</span>
                                <span>12,288</span>
                            </div>
                        </div>

                        <div style={styles.totalParamBox}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>추정 총 파라미터 수</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>
                                ~{formatParams(totalParams)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 4 }}>
                                ({totalParams.toLocaleString()} parameters)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                블록당: ~{formatParams(12 * dModel * dModel)} | Heads: {numHeads} | 헤드 차원(Head Dim): {headDim}
                            </div>
                        </div>
                    </div>

                    {/* ── Encoder-Decoder vs Decoder-only ── */}
                    <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={styles.label}>Encoder-Decoder vs Decoder-only</h3>
                        <div style={{ fontSize: '0.8rem', color: '#a78bfa', marginBottom: 10, lineHeight: 1.5, background: 'rgba(167,139,250,0.08)', padding: '8px 12px', borderRadius: 8 }}>
                            번역 모델처럼 입력(원문)과 출력(번역문)이 다른 경우 Encoder-Decoder를 사용. GPT는 Decoder만 사용하는 간단한 구조
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={styles.compareCard}>
                                <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: 6, fontSize: '0.9rem' }}>
                                    Encoder-Decoder
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                    T5, BART 등. 입력을 이해(Encoder)하고 출력을 생성(Decoder)하는 두 부분으로 나뉨.
                                    번역, 요약 등 입력→출력 변환 작업에 적합.
                                </p>
                            </div>
                            <div style={{ ...styles.compareCard, border: '1px solid rgba(244,114,182,0.3)' }}>
                                <div style={{ fontWeight: 700, color: '#f472b6', marginBottom: 6, fontSize: '0.9rem' }}>
                                    Decoder-only (GPT)
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                    GPT 시리즈. Decoder만 쌓아서 "다음 토큰 예측"에 집중.
                                    단순하지만 스케일링 시 가장 강력한 구조로 증명됨.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 한 걸음 더: 행렬 곱셈 */}
            <div
                onClick={() => setShowDeepDive(!showDeepDive)}
                style={{
                    marginTop: 20,
                    padding: '16px 20px',
                    background: 'rgba(124, 92, 252, 0.08)',
                    border: '1px solid rgba(124, 92, 252, 0.25)',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ color: 'rgba(124, 92, 252, 1)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: 행렬 곱셈이 AI에서 하는 역할
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(124, 92, 252, 0.7)', fontWeight: 600 }}>
                        {showDeepDive ? '접기' : '펼치기'}
                    </span>
                </div>
                {showDeepDive && (
                    <div style={{ marginTop: 14, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.8 }} onClick={e => e.stopPropagation()}>
                        <p style={{ marginBottom: 10 }}>
                            <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>행렬 곱셈</strong> = 많은 뉴런의 가중치 합을 <strong>한 번에</strong> 계산하는 방법입니다.
                        </p>
                        <p style={{ marginBottom: 10 }}>
                            GPU가 빠른 이유가 바로 행렬 곱셈을 <strong>병렬로 처리</strong>하기 때문입니다.
                            CPU는 계산을 하나씩 순서대로 하지만, GPU는 수천 개의 코어가 동시에 행렬 곱셈을 수행합니다.
                        </p>
                        <p style={{ marginBottom: 0 }}>
                            AI의 모든 핵심 연산(<strong>임베딩 조회</strong>, <strong>어텐션 계산</strong>, <strong>FFN</strong>)이 결국 행렬 곱셈입니다.
                            그래서 AI 발전의 역사는 곧 &quot;더 큰 행렬 곱셈을 더 빠르게&quot;의 역사이기도 합니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function BlockNode({ y, data, selected, onClick, height = 40 }) {
    return (
        <g
            transform={`translate(150, ${y})`}
            onClick={() => onClick(data.id)}
            style={{ cursor: 'pointer' }}
        >
            <rect
                x="-80"
                y={-height / 2}
                width="160"
                height={height}
                rx="8"
                fill={selected ? data.color : '#1e293b'}
                stroke={selected ? '#fff' : data.color}
                strokeWidth={selected ? 3 : 2}
                filter={selected ? 'url(#glow)' : ''}
                style={{ transition: 'all 0.3s' }}
            />
            <text
                x="0"
                y="5"
                textAnchor="middle"
                fill={selected ? '#000' : '#fff'}
                fontWeight="bold"
                fontSize="12"
                style={{ pointerEvents: 'none' }}
            >
                {data.name}
            </text>
        </g>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        padding: '20px',
        maxWidth: 1100,
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
        display: 'grid',
        gridTemplateColumns: '1fr 1.2fr',
        gap: 20,
    },
    card: {
        background: 'rgba(15, 10, 40, 0.6)',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: 500,
    },
    label: {
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: 16,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    diagramContainer: {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 20,
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBox: {
        padding: 20,
    },
    tag: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.1)',
        color: '#94a3b8',
        fontSize: '0.9rem',
        fontFamily: 'monospace',
        marginBottom: 20,
        border: '1px solid rgba(255,255,255,0.1)',
    },
    shapeTag: {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        color: '#64748b',
        fontSize: '0.8rem',
        fontFamily: 'monospace',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    paramBox: {
        marginTop: 14,
        padding: 12,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
    },
    paramPre: {
        margin: 0,
        fontSize: '0.78rem',
        color: '#cbd5e1',
        lineHeight: 1.6,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
    },
    sliderSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.1)',
    },
    presetBtn: {
        padding: '4px 10px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        fontSize: '0.75rem',
        fontWeight: 600,
        transition: 'all 0.2s',
    },
    slider: {
        width: '100%',
        accentColor: 'var(--accent, #6366f1)',
        cursor: 'pointer',
    },
    totalParamBox: {
        marginTop: 12,
        padding: 14,
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: 10,
        border: '1px solid rgba(99, 102, 241, 0.2)',
        textAlign: 'center',
    },
    compareCard: {
        padding: 12,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 10,
        border: '1px solid rgba(96,165,250,0.2)',
    },
};
