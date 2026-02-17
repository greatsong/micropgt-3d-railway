'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── 스텝 데이터 ──
const STEPS = [
    {
        id: 'recap',
        title: '원-핫의 한계, 기억나나요?',
        emoji: '🔙',
        subtitle: '지난 시간에 발견한 문제를 해결해봐요',
    },
    {
        id: 'embedding',
        title: '임베딩: 밀집 벡터',
        emoji: '✨',
        subtitle: '의미를 담은 짧은 숫자 목록',
    },
    {
        id: 'similarity',
        title: '비슷한 단어는 가까이!',
        emoji: '🧲',
        subtitle: '"강아지"와 "고양이"는 가깝고, "자동차"는 멀리',
    },
    {
        id: 'realworld',
        title: '실제 LLM에서의 임베딩',
        emoji: '🤖',
        subtitle: 'GPT, BERT는 어떻게 사용할까?',
    },
    {
        id: 'galaxy',
        title: '3D 임베딩 은하수',
        emoji: '🌌',
        subtitle: '이제 직접 단어 별을 만들어 보자!',
    },
];

// ── 원-핫 한계 리캡 ──
function RecapDemo() {
    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                지난 시간에 원-핫 인코딩의 두 가지 큰 문제를 발견했어요:
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={demoStyles.problemCard}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>📏</div>
                    <strong style={{ color: '#f43f5e' }}>모든 거리가 같다</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 6 }}>
                        "고양이-강아지" 거리 = "고양이-자동차" 거리<br />
                        의미의 유사성을 표현할 수 없음
                    </p>
                </div>
                <div style={demoStyles.problemCard}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>💾</div>
                    <strong style={{ color: '#f43f5e' }}>차원이 너무 크다</strong>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 6 }}>
                        단어 10만 개 = 10만 차원 벡터<br />
                        99.999%가 0인 낭비
                    </p>
                </div>
            </div>
            <div style={demoStyles.solutionBox}>
                <span style={{ fontSize: '1.5rem' }}>💡</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    해결책: <strong style={{ color: '#7c5cfc' }}>임베딩(Embedding)</strong><br />
                    의미를 담은 <strong>짧은</strong> 숫자 벡터로 바꾸자!
                </p>
            </div>
        </div>
    );
}

// ── 임베딩 비교 데모 ──
function EmbeddingDemo() {
    const embeddings = {
        '고양이': [0.90, -0.30, 0.30],
        '강아지': [0.70, -0.10, 0.60],
        '자동차': [-0.50, 0.70, 0.10],
        '비행기': [-0.30, 0.80, 0.30],
    };

    const [wordA, setWordA] = useState('고양이');
    const [wordB, setWordB] = useState('강아지');

    const cosineSim = (a, b) => {
        const va = embeddings[a];
        const vb = embeddings[b];
        const dot = va.reduce((s, v, i) => s + v * vb[i], 0);
        const magA = Math.sqrt(va.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(vb.reduce((s, v) => s + v * v, 0));
        return dot / (magA * magB);
    };

    const sim = cosineSim(wordA, wordB);
    const simPct = Math.round(sim * 100);

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                🔍 두 단어를 골라 유사도를 비교해보세요!
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
                <div style={demoStyles.compareBox}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>원-핫</span>
                    <code style={{ fontSize: '0.7rem', color: '#f43f5e' }}>[1,0,0,0]</code>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>거리 항상 √2</span>
                </div>
                <div style={{ fontSize: '1.5rem', alignSelf: 'center' }}>→</div>
                <div style={{ ...demoStyles.compareBox, border: '1px solid rgba(124, 92, 252, 0.3)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>임베딩</span>
                    <code style={{ fontSize: '0.7rem', color: '#10b981' }}>[0.82, -0.31, 0.45]</code>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>의미를 담은 거리</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>단어 A</label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {Object.keys(embeddings).map((w) => (
                            <button key={w} onClick={() => setWordA(w)}
                                style={{ ...demoStyles.miniBtn, ...(wordA === w ? demoStyles.miniBtnActive : {}) }}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>단어 B</label>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {Object.keys(embeddings).map((w) => (
                            <button key={w} onClick={() => setWordB(w)}
                                style={{ ...demoStyles.miniBtn, ...(wordB === w ? demoStyles.miniBtnActive : {}) }}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div style={demoStyles.embCompare}>
                <div style={demoStyles.embCol}>
                    <span style={demoStyles.embWord}>{wordA}</span>
                    <code style={demoStyles.embVec}>[{embeddings[wordA].join(', ')}]</code>
                </div>
                <div style={demoStyles.simCircle}>
                    <div style={{
                        ...demoStyles.simValue,
                        color: simPct > 80 ? '#10b981' : simPct > 50 ? '#fbbf24' : '#f43f5e',
                    }}>
                        {simPct}%
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>유사도</span>
                </div>
                <div style={demoStyles.embCol}>
                    <span style={demoStyles.embWord}>{wordB}</span>
                    <code style={demoStyles.embVec}>[{embeddings[wordB].join(', ')}]</code>
                </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 10 }}>
                {simPct > 80
                    ? '🧲 아주 비슷한 의미! → 가까운 거리에 놓여요'
                    : simPct > 0
                        ? '📏 다소 다른 의미 → 적당히 떨어져 있어요'
                        : '🔀 완전 다른 의미! → 먼 거리에 놓여요'}
            </p>
        </div>
    );
}

// ── 유사도 2D 시각화 ──
function SimilarityDemo() {
    const canvasRef = useRef(null);
    const words = [
        { text: '고양이', x: 0.7, y: 0.35, color: '#f43f5e' },
        { text: '강아지', x: 0.75, y: 0.3, color: '#f97316' },
        { text: '금붕어', x: 0.65, y: 0.25, color: '#f59e0b' },
        { text: '자동차', x: 0.25, y: 0.7, color: '#3b82f6' },
        { text: '비행기', x: 0.3, y: 0.75, color: '#6366f1' },
        { text: '자전거', x: 0.2, y: 0.65, color: '#8b5cf6' },
        { text: '피자', x: 0.5, y: 0.8, color: '#10b981' },
        { text: '햄버거', x: 0.55, y: 0.85, color: '#14b8a6' },
    ];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(124, 92, 252, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            ctx.beginPath(); ctx.moveTo((i / 10) * w, 0); ctx.lineTo((i / 10) * w, h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, (i / 10) * h); ctx.lineTo(w, (i / 10) * h); ctx.stroke();
        }

        const groups = [
            { cx: 0.7, cy: 0.3, r: 0.12, label: '🐾 동물', color: 'rgba(244, 63, 94, 0.08)' },
            { cx: 0.25, cy: 0.7, r: 0.1, label: '🚗 탈것', color: 'rgba(59, 130, 246, 0.08)' },
            { cx: 0.525, cy: 0.825, r: 0.07, label: '🍕 음식', color: 'rgba(16, 185, 129, 0.08)' },
        ];

        groups.forEach((g) => {
            ctx.beginPath();
            ctx.arc(g.cx * w, g.cy * h, g.r * w, 0, Math.PI * 2);
            ctx.fillStyle = g.color;
            ctx.fill();
            ctx.strokeStyle = g.color.replace('0.08', '0.2');
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(g.label, g.cx * w, (g.cy - g.r - 0.02) * h);
        });

        words.forEach((word) => {
            ctx.beginPath();
            ctx.arc(word.x * w, word.y * h, 6, 0, Math.PI * 2);
            ctx.fillStyle = word.color;
            ctx.fill();
            ctx.shadowColor = word.color;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(word.text, word.x * w, word.y * h - 12);
        });
    }, []);

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                👀 비슷한 의미를 가진 단어들이 자연스럽게 모여요!
            </p>
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                style={{ width: '100%', maxWidth: 400, height: 'auto', borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', margin: '0 auto', display: 'block' }}
            />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 10 }}>
                이걸 <strong>3D로 확장</strong>하면? → 바로 <strong>임베딩 은하수</strong>! 🌌
            </p>
        </div>
    );
}

// ── 실제 LLM 임베딩 설명 ──
function RealWorldDemo() {
    const models = [
        { name: 'Word2Vec', year: '2013', dim: 300, desc: '최초의 대중적 임베딩. "King - Man + Woman = Queen"', color: '#94a3b8' },
        { name: 'GloVe', year: '2014', dim: 300, desc: '전체 코퍼스의 통계를 활용한 임베딩', color: '#60a5fa' },
        { name: 'BERT', year: '2018', dim: 768, desc: '문맥에 따라 벡터가 달라지는 임베딩', color: '#10b981' },
        { name: 'GPT-3', year: '2020', dim: 12288, desc: '12,288차원! 초거대 임베딩', color: '#a78bfa' },
        { name: 'GPT-4', year: '2023', dim: '?', desc: '비공개이지만 더 클 것으로 추정', color: '#f43f5e' },
    ];

    return (
        <div style={demoStyles.container}>
            <p style={demoStyles.instruction}>
                실제 AI 모델들은 어떤 크기의 임베딩을 사용할까요?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {models.map((m) => (
                    <div key={m.name} style={demoStyles.modelRow}>
                        <div style={{ minWidth: 80 }}>
                            <span style={{ fontWeight: 700, color: m.color, fontSize: '0.9rem' }}>{m.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: 6 }}>{m.year}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                height: 20, borderRadius: 4,
                                background: `${m.color}20`,
                                border: `1px solid ${m.color}40`,
                                width: typeof m.dim === 'number' ? `${Math.min(100, (m.dim / 12288) * 100)}%` : '100%',
                                display: 'flex', alignItems: 'center', paddingLeft: 8,
                                minWidth: 60,
                            }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.color }}>
                                    {typeof m.dim === 'number' ? `${m.dim.toLocaleString()}차원` : '?차원'}
                                </span>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', maxWidth: 200 }}>{m.desc}</div>
                    </div>
                ))}
            </div>
            <div style={demoStyles.funFact}>
                <strong>💡 핵심 포인트</strong><br />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    원-핫은 단어 수만큼 차원이 필요하지만 (10만+),<br />
                    임베딩은 고정된 작은 차원 (300~12,288)으로 의미를 표현합니다!
                </span>
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function Week4IntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };
    const goToLab = () => router.push('/week4/practice');

    const renderStepContent = () => {
        switch (step.id) {
            case 'recap': return <RecapDemo />;
            case 'embedding': return <EmbeddingDemo />;
            case 'similarity': return <SimilarityDemo />;
            case 'realworld': return <RealWorldDemo />;
            case 'galaxy':
                return (
                    <div style={{ ...demoStyles.container, textAlign: 'center' }}>
                        <div style={{ fontSize: '5rem', marginBottom: 16 }} className="animate-float">📐</div>
                        <p style={demoStyles.welcomeText}>
                            지금까지 배운 것을 <strong>직접 체험</strong>할 시간!<br /><br />
                            먼저 <strong style={{ color: '#7c5cfc' }}>코사인 유사도</strong>를 2D → 3D → 300D로 실습하고,<br />
                            <strong style={{ color: '#10b981' }}>실제 AI 임베딩</strong>으로 벡터 연산을 해본 뒤,<br />
                            <strong style={{ color: '#fbbf24' }}>3D 은하수</strong>에서 단어 별을 만들어봐요!
                        </p>
                        <button className="btn-nova" style={{ marginTop: 24, padding: '14px 40px', fontSize: '1.1rem' }} onClick={goToLab}>
                            <span>📐 코사인 유사도 실습 시작!</span>
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.progressBar}>
                {STEPS.map((s, i) => (
                    <div key={s.id} style={{
                        ...pageStyles.progressDot,
                        background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                    }} onClick={() => setCurrentStep(i)} />
                ))}
                <div style={{ ...pageStyles.progressFill, width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>

            <div style={pageStyles.header}>
                <span style={pageStyles.weekBadge}>4주차</span>
                <div style={{ fontSize: '3rem' }}>{step.emoji}</div>
                <h1 style={pageStyles.title}><span className="text-gradient">{step.title}</span></h1>
                <p style={pageStyles.subtitle}>{step.subtitle}</p>
            </div>

            <div style={pageStyles.content}>{renderStepContent()}</div>

            <div style={pageStyles.navBar}>
                <button className="btn-nova" style={{ ...pageStyles.navBtn, opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep} disabled={currentStep === 0}>
                    <span>← 이전</span>
                </button>
                <span style={pageStyles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={nextStep}><span>다음 →</span></button>
                ) : (
                    <button className="btn-nova" style={pageStyles.navBtn} onClick={goToLab}><span>🚀 실습 시작</span></button>
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
    weekBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(124, 92, 252, 0.15)', color: '#7c5cfc', marginBottom: 12, letterSpacing: '0.05em' },
    title: { fontSize: '1.6rem', fontWeight: 800, marginTop: 8, marginBottom: 6 },
    subtitle: { fontSize: '0.95rem', color: 'var(--text-secondary)' },
    content: { flex: 1, width: '100%', marginBottom: 24 },
    navBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' },
    navBtn: { padding: '10px 24px', fontSize: '0.9rem' },
    stepCount: { fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 },
};

const demoStyles = {
    container: { padding: 20 },
    instruction: { fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' },
    welcomeText: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 },
    problemCard: {
        flex: 1, minWidth: 200, padding: 20, borderRadius: 12,
        background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.15)',
        textAlign: 'center',
    },
    solutionBox: {
        marginTop: 20, padding: 16, borderRadius: 12,
        background: 'rgba(124, 92, 252, 0.08)', border: '1px solid rgba(124, 92, 252, 0.2)',
        display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center',
    },
    compareBox: {
        padding: 12, borderRadius: 10, textAlign: 'center',
        border: '1px solid rgba(244, 63, 94, 0.2)', background: 'rgba(15, 10, 40, 0.6)',
        display: 'flex', flexDirection: 'column', gap: 4,
    },
    embCompare: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
    embCol: { textAlign: 'center', padding: 16, borderRadius: 12, background: 'rgba(15, 10, 40, 0.6)', border: '1px solid rgba(124, 92, 252, 0.12)', minWidth: 120 },
    embWord: { fontSize: '1rem', fontWeight: 700, display: 'block', marginBottom: 6 },
    embVec: { fontSize: '0.75rem', color: 'var(--text-dim)' },
    simCircle: { width: 80, height: 80, borderRadius: '50%', background: 'rgba(124, 92, 252, 0.1)', border: '2px solid rgba(124, 92, 252, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    simValue: { fontSize: '1.3rem', fontWeight: 800 },
    miniBtn: { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(124, 92, 252, 0.15)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s' },
    miniBtnActive: { background: 'var(--accent-nova)', color: '#fff', border: '1px solid var(--accent-nova)' },
    modelRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(15, 10, 40, 0.4)' },
    funFact: { marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(124, 92, 252, 0.06)', border: '1px solid rgba(124, 92, 252, 0.15)', textAlign: 'center', lineHeight: 1.7 },
};
