'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                지난 시간에 원-핫 인코딩의 두 가지 큰 문제를 발견했어요:
            </p>
            <div className={styles.problemCardListWrapper}>
                <div className={styles.problemCard}>
                    <div className={styles.problemCardIcon}>📏</div>
                    <strong className={styles.problemCardStrong}>모든 거리가 같다</strong>
                    <p className={styles.problemCardDesc}>
                        "고양이-강아지" 거리 = "고양이-자동차" 거리<br />
                        의미의 유사성을 표현할 수 없음
                    </p>
                </div>
                <div className={styles.problemCard}>
                    <div className={styles.problemCardIcon}>💾</div>
                    <strong className={styles.problemCardStrong}>차원이 너무 크다</strong>
                    <p className={styles.problemCardDesc}>
                        단어 10만 개 = 10만 차원 벡터<br />
                        99.999%가 0인 낭비
                    </p>
                </div>
            </div>
            <div className={styles.solutionBox}>
                <span className={styles.solutionIcon}>💡</span>
                <p className={styles.solutionText}>
                    해결책: <strong className={styles.solutionHighlight}>임베딩(Embedding)</strong><br />
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                🔍 두 단어를 골라 유사도를 비교해보세요!
            </p>

            <div className={styles.compareRow}>
                <div className={styles.compareBox}>
                    <span className={styles.compareLabel}>원-핫</span>
                    <code className={styles.compareCodeOnehot}>[1,0,0,0]</code>
                    <span className={styles.compareSubtext}>거리 항상 √2</span>
                </div>
                <div className={styles.compareArrow}>→</div>
                <div className={styles.compareBoxEmbedding}>
                    <span className={styles.compareLabel}>임베딩</span>
                    <code className={styles.compareCodeEmbedding}>[0.82, -0.31, 0.45]</code>
                    <span className={styles.compareSubtext}>의미를 담은 거리</span>
                </div>
            </div>

            <div className={styles.wordSelectRow}>
                <div>
                    <label className={styles.wordSelectLabel}>단어 A</label>
                    <div className={styles.wordSelectBtnGroup}>
                        {Object.keys(embeddings).map((w) => (
                            <button key={w} onClick={() => setWordA(w)}
                                className={`${styles.miniBtn} ${wordA === w ? styles.miniBtnActive : ''}`}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className={styles.wordSelectLabel}>단어 B</label>
                    <div className={styles.wordSelectBtnGroup}>
                        {Object.keys(embeddings).map((w) => (
                            <button key={w} onClick={() => setWordB(w)}
                                className={`${styles.miniBtn} ${wordB === w ? styles.miniBtnActive : ''}`}>
                                {w}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.embCompare}>
                <div className={styles.embCol}>
                    <span className={styles.embWord}>{wordA}</span>
                    <code className={styles.embVec}>[{embeddings[wordA].join(', ')}]</code>
                </div>
                <div className={styles.simCircle}>
                    <div className={styles.simValue} style={{
                        color: simPct > 80 ? '#10b981' : simPct > 50 ? '#fbbf24' : '#f43f5e',
                    }}>
                        {simPct}%
                    </div>
                    <span className={styles.simSubtext}>유사도</span>
                </div>
                <div className={styles.embCol}>
                    <span className={styles.embWord}>{wordB}</span>
                    <code className={styles.embVec}>[{embeddings[wordB].join(', ')}]</code>
                </div>
            </div>

            <p className={styles.simComment}>
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                👀 비슷한 의미를 가진 단어들이 자연스럽게 모여요!
            </p>
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className={styles.canvas}
            />
            <p className={styles.simComment}>
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
        <div className={styles.demoContainer}>
            <p className={styles.instruction}>
                실제 AI 모델들은 어떤 크기의 임베딩을 사용할까요?
            </p>
            <div className={styles.modelColGroup}>
                {models.map((m) => (
                    <div key={m.name} className={styles.modelRow}>
                        <div className={styles.modelNameCol}>
                            <span style={{ fontWeight: 700, color: m.color, fontSize: '0.9rem' }}>{m.name}</span>
                            <span className={styles.modelYear}>{m.year}</span>
                        </div>
                        <div className={styles.modelBarCol}>
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
                        <div className={styles.modelDesc}>{m.desc}</div>
                    </div>
                ))}
            </div>
            <div className={styles.funFact}>
                <strong>💡 핵심 포인트</strong><br />
                <span className={styles.funFactText}>
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
                    <div className={styles.galaxyDemoContainer}>
                        <div className={styles.galaxyIcon + ' animate-float'}>📐</div>
                        <p className={styles.welcomeText}>
                            지금까지 배운 것을 <strong>직접 체험</strong>할 시간!<br /><br />
                            먼저 <strong className={styles.galaxyHighlightPurple}>코사인 유사도</strong>를 2D → 3D → 300D로 실습하고,<br />
                            <strong className={styles.galaxyHighlightGreen}>실제 AI 임베딩</strong>으로 벡터 연산을 해본 뒤,<br />
                            <strong className={styles.galaxyHighlightYellow}>3D 은하수</strong>에서 단어 별을 만들어봐요!
                        </p>
                        <button className={`btn-nova ${styles.galaxyBtn}`} onClick={goToLab}>
                            <span>📐 코사인 유사도 실습 시작!</span>
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.progressBar}>
                {STEPS.map((s, i) => (
                    <div key={s.id} className={styles.progressDot} style={{
                        background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
                        transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                    }} onClick={() => setCurrentStep(i)} />
                ))}
                <div className={styles.progressFill} style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }} />
            </div>

            <div className={styles.header}>
                <span className={styles.weekBadge}>4주차</span>
                <div className={styles.stepEmoji}>{step.emoji}</div>
                <h1 className={styles.title}><span className="text-gradient">{step.title}</span></h1>
                <p className={styles.subtitle}>{step.subtitle}</p>
            </div>

            <div className={styles.content}>{renderStepContent()}</div>

            <div className={styles.navBar}>
                <button className={`btn-nova ${styles.navBtn}`} style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep} disabled={currentStep === 0}>
                    <span>← 이전</span>
                </button>
                <span className={styles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={nextStep}><span>다음 →</span></button>
                ) : (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}><span>🚀 실습 시작</span></button>
                )}
            </div>
        </div>
    );
}
