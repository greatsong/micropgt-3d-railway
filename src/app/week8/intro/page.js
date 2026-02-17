'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const STEPS = [
    {
        id: 'welcome',
        title: '순서가 중요해!',
        emoji: '🔀',
        subtitle: '단어 순서가 바뀌면 의미도 바뀐다',
    },
    {
        id: 'rnn',
        title: 'RNN: 순서대로 읽기',
        emoji: '➡️',
        subtitle: '한 단어씩 읽으며 기억을 이어가는 신경망',
    },
    {
        id: 'memory',
        title: '기억력의 한계',
        emoji: '😵',
        subtitle: '문장이 길어지면 앞의 내용을 까먹어요',
    },
    {
        id: 'lstm',
        title: 'LSTM: 똑똑한 기억장치',
        emoji: '🔐',
        subtitle: '게이트로 중요한 정보만 기억!',
    },
    {
        id: 'transformer',
        title: 'Transformer의 등장',
        emoji: '⚡',
        subtitle: 'RNN의 한계를 뛰어넘은 혁신',
    },
    {
        id: 'lab',
        title: 'RNN 실험실로!',
        emoji: '〰️',
        subtitle: '직접 RNN이 문맥을 기억하는 과정을 체험하자!',
    },
];

// ── Step 1: 단어 순서 뒤바꾸기 데모 ──
function WordOrderDemo() {
    const [flipped, setFlipped] = useState(false);

    const examples = [
        { original: ['고양이가', '쥐를', '쫓았다'], meaning: '고양이 → 쥐 🐱➡️🐭' },
        { original: ['쥐가', '고양이를', '쫓았다'], meaning: '쥐 → 고양이 🐭➡️🐱' },
    ];

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                같은 단어인데, <strong>순서만 바꿔도</strong> 의미가 완전히 달라져요!
            </p>

            <div className={styles.wordOrderExamples}>
                {examples.map((ex, i) => (
                    <div key={i} className={styles.wordOrderCard} style={{
                        background: i === 0
                            ? 'rgba(96, 165, 250, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                        border: `1px solid ${i === 0 ? 'rgba(96, 165, 250, 0.25)' : 'rgba(248, 113, 113, 0.25)'}`,
                    }}>
                        <div className={styles.wordOrderWordRow}>
                            {(flipped ? [...ex.original].reverse() : ex.original).map((word, j) => (
                                <span key={j} className={styles.wordOrderWord}>
                                    {word}
                                </span>
                            ))}
                        </div>
                        <div className={styles.wordOrderMeaning}>
                            {ex.meaning}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setFlipped(!flipped)}
                className={styles.flipButton}
            >
                {flipped ? '🔄 원래 순서로' : '🔀 단어 순서 뒤집기'}
            </button>

            <div className={`${styles.dsBridgeBox} ${styles.mt20}`}>
                <strong className={styles.bridgeBoxLink}>🔗 지난 시간 복습</strong><br/>
                7주차에서 역전파로 신경망이 학습하는 원리를 배웠어요.
                하지만 지금까지의 신경망은 입력을 한 번에 처리하고 끝!
                <strong> 순서가 중요한 데이터</strong>는 어떻게 처리할까요?
            </div>
        </div>
    );
}

// ── Step 2: RNN 순차 처리 애니메이션 ──
function RNNDemo() {
    const [activeIdx, setActiveIdx] = useState(-1);
    const [isRunning, setIsRunning] = useState(false);
    const [hiddenStates, setHiddenStates] = useState([]);
    const tokens = ['나는', '오늘', '학교에', '갔다'];
    const timerRef = useRef(null);

    const runAnimation = () => {
        setIsRunning(true);
        setActiveIdx(-1);
        setHiddenStates([]);
        let i = 0;
        timerRef.current = setInterval(() => {
            if (i < tokens.length) {
                setActiveIdx(i);
                setHiddenStates(prev => [...prev, `h${i}`]);
                i++;
            } else {
                clearInterval(timerRef.current);
                setIsRunning(false);
            }
        }, 800);
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                RNN은 단어를 <strong>하나씩 순서대로</strong> 읽으며, 이전 정보를 &quot;숨겨진 상태(hidden state)&quot;로 전달합니다.
            </p>

            <div className={styles.rnnTokenRow}>
                {tokens.map((token, i) => (
                    <div key={i} className={styles.rnnTokenPair}>
                        <div
                            className={styles.rnnToken}
                            style={{
                                background: i <= activeIdx
                                    ? 'rgba(167, 139, 250, 0.3)' : 'rgba(15, 10, 40, 0.5)',
                                border: `2px solid ${i === activeIdx ? '#a78bfa' : 'rgba(167, 139, 250, 0.15)'}`,
                                color: i <= activeIdx ? '#fff' : 'var(--text-dim)',
                                transform: i === activeIdx ? 'scale(1.1)' : 'scale(1)',
                            }}
                        >
                            {token}
                        </div>
                        {i < tokens.length - 1 && (
                            <span
                                className={styles.rnnArrow}
                                style={{
                                    color: i < activeIdx ? '#a78bfa' : 'var(--text-dim)',
                                }}
                            >→</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Hidden State 표시 */}
            <div className={styles.hiddenStateBox}>
                <div className={styles.hiddenStateLabel}>
                    숨겨진 상태 (Hidden State):
                </div>
                <div className={styles.hiddenStateList}>
                    {hiddenStates.map((h, i) => (
                        <div
                            key={i}
                            className={styles.hiddenStateItem}
                            style={{
                                background: `rgba(167, 139, 250, ${0.15 + i * 0.1})`,
                            }}
                        >
                            {h} ← &quot;{tokens.slice(0, i + 1).join(' ')}&quot;
                        </div>
                    ))}
                    {hiddenStates.length === 0 && (
                        <span className={styles.hiddenStatePlaceholder}>
                            ▶ 실행 버튼을 눌러보세요!
                        </span>
                    )}
                </div>
            </div>

            <button
                onClick={runAnimation}
                disabled={isRunning}
                className={styles.rnnRunButton}
                style={{
                    background: isRunning ? 'rgba(100,100,100,0.2)' : 'rgba(167, 139, 250, 0.15)',
                    cursor: isRunning ? 'default' : 'pointer',
                    opacity: isRunning ? 0.5 : 1,
                }}
            >
                {isRunning ? '처리 중...' : '▶ RNN 실행하기'}
            </button>

            <div className={`${styles.dsHintBox} ${styles.mt16}`}>
                <div className={styles.dsHintItem}>
                    <strong>핵심</strong><br/>
                    이전 출력(h)을 다음 입력에 되먹임 → &quot;기억&quot;
                </div>
                <div className={styles.dsHintItem}>
                    <strong>용어</strong><br/>
                    Hidden State = 지금까지 읽은 문맥 요약
                </div>
            </div>
        </div>
    );
}

// ── Step 3: 기억력 감쇠 데모 ──
function MemoryDemo() {
    const canvasRef = useRef(null);
    const [sentenceLen, setSentenceLen] = useState(5);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        ctx.clearRect(0, 0, W, H);

        const barW = Math.min(40, (W - 60) / sentenceLen - 4);
        const startX = (W - (barW + 4) * sentenceLen) / 2;

        // 각 위치에서의 기억 강도 (지수 감소)
        for (let i = 0; i < sentenceLen; i++) {
            const distFromEnd = sentenceLen - 1 - i;
            const memory = Math.exp(-distFromEnd * 0.35);
            const barH = memory * (H - 60);

            const r = Math.round(167 + (248 - 167) * (1 - memory));
            const g = Math.round(139 + (113 - 139) * (1 - memory));
            const b = Math.round(250 + (113 - 250) * (1 - memory));

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + memory * 0.6})`;
            ctx.beginPath();
            ctx.roundRect(startX + i * (barW + 4), H - 30 - barH, barW, barH, 4);
            ctx.fill();

            // 단어 번호
            ctx.fillStyle = memory < 0.3 ? 'rgba(248,113,113,0.8)' : 'var(--text-dim)';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`w${i + 1}`, startX + i * (barW + 4) + barW / 2, H - 12);
        }

        // Y축 레이블
        ctx.fillStyle = 'var(--text-dim)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('기억 강도', W - 10, 18);

        // 경고 구간
        if (sentenceLen >= 8) {
            ctx.fillStyle = 'rgba(248, 113, 113, 0.15)';
            ctx.fillRect(startX, H - 30 - (H - 60) * 0.2, barW * 3 + 8, (H - 60) * 0.2);
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠ 기억 소실!', startX + barW * 1.5 + 4, H - 30 - (H - 60) * 0.1 + 4);
        }
    }, [sentenceLen]);

    useEffect(() => { draw(); }, [draw]);

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                문장이 길어질수록, RNN은 <strong>앞쪽 단어를 점점 잊어버려요</strong>.<br/>
                이것이 바로 <strong className={styles.gradientWarning}>기울기 소실(Vanishing Gradient)</strong> 문제입니다!
            </p>

            <canvas
                ref={canvasRef}
                width={480}
                height={200}
                className={styles.memoryCanvas}
            />

            <div className={styles.memorySliderRow}>
                <span className={styles.memorySliderLabel}>문장 길이:</span>
                <input
                    type="range" min={3} max={15} value={sentenceLen}
                    onChange={e => setSentenceLen(Number(e.target.value))}
                    className={styles.memorySlider}
                />
                <span className={styles.memorySliderValue}>
                    {sentenceLen}단어
                </span>
            </div>

            <div
                className={styles.memoryStatusBox}
                style={{
                    background: sentenceLen >= 8
                        ? 'rgba(248, 113, 113, 0.08)' : 'rgba(52, 211, 153, 0.08)',
                    border: `1px solid ${sentenceLen >= 8
                        ? 'rgba(248, 113, 113, 0.2)' : 'rgba(52, 211, 153, 0.2)'}`,
                }}
            >
                {sentenceLen < 8
                    ? '✅ 짧은 문장은 RNN도 잘 기억해요!'
                    : `⚠️ ${sentenceLen}단어 문장: 앞쪽 ${Math.max(1, sentenceLen - 5)}개 단어의 기억이 매우 약해졌어요!`
                }
            </div>
        </div>
    );
}

// ── Step 4: LSTM 게이트 인터랙티브 ──
function LSTMDemo() {
    const [activeGate, setActiveGate] = useState(null);

    const gates = [
        {
            id: 'forget',
            name: '🚪 망각 게이트',
            nameEn: 'Forget Gate',
            color: '#f87171',
            desc: '불필요한 정보를 버립니다',
            detail: '"어제 비가 왔다. 오늘은 맑다." → "어제 비" 정보를 잊고 "오늘 맑다"에 집중!',
            emoji: '🗑️',
        },
        {
            id: 'input',
            name: '📥 입력 게이트',
            nameEn: 'Input Gate',
            color: '#34d399',
            desc: '새로운 중요 정보를 저장합니다',
            detail: '새로 들어온 단어 중 "중요한 정보"만 골라서 기억 셀에 저장!',
            emoji: '💾',
        },
        {
            id: 'output',
            name: '📤 출력 게이트',
            nameEn: 'Output Gate',
            color: '#60a5fa',
            desc: '기억에서 필요한 부분만 출력합니다',
            detail: '기억 셀에 저장된 내용 중 "지금 필요한 것"만 꺼내서 다음 단계로 전달!',
            emoji: '🎯',
        },
    ];

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                LSTM은 3개의 <strong>&quot;게이트(문)&quot;</strong>로 기억을 관리해요.<br/>
                각 게이트를 클릭해서 역할을 알아보세요!
            </p>

            <div className={styles.gateButtonRow}>
                {gates.map(gate => (
                    <button
                        key={gate.id}
                        onClick={() => setActiveGate(activeGate === gate.id ? null : gate.id)}
                        className={styles.gateButton}
                        style={{
                            background: activeGate === gate.id
                                ? `${gate.color}20` : 'rgba(15, 10, 40, 0.5)',
                            border: `2px solid ${activeGate === gate.id ? gate.color : 'rgba(255,255,255,0.08)'}`,
                            color: activeGate === gate.id ? gate.color : 'var(--text-secondary)',
                            transform: activeGate === gate.id ? 'scale(1.05)' : 'scale(1)',
                        }}
                    >
                        <div className={styles.gateEmoji}>{gate.emoji}</div>
                        <div className={styles.gateName}>{gate.name}</div>
                        <div className={styles.gateDesc}>{gate.desc}</div>
                    </button>
                ))}
            </div>

            {activeGate && (
                <div
                    className={styles.gateDetailBox}
                    style={{
                        background: `${gates.find(g => g.id === activeGate).color}08`,
                        border: `1px solid ${gates.find(g => g.id === activeGate).color}30`,
                    }}
                >
                    <div className={styles.gateDetailText}>
                        <strong style={{ color: gates.find(g => g.id === activeGate).color }}>
                            {gates.find(g => g.id === activeGate).nameEn}
                        </strong><br/>
                        {gates.find(g => g.id === activeGate).detail}
                    </div>
                </div>
            )}

            {!activeGate && (
                <div className={styles.gateEmptyBox}>
                    <span className={styles.gateEmptyText}>
                        👆 게이트를 클릭해보세요!
                    </span>
                </div>
            )}

            <div className={`${styles.dsHintBox} ${styles.mt16}`}>
                <div className={styles.dsHintItem}>
                    <strong>비유</strong><br/>
                    LSTM = 잠금장치가 달린 서랍장
                </div>
                <div className={styles.dsHintItem}>
                    <strong>효과</strong><br/>
                    긴 문장도 핵심 정보를 기억!
                </div>
            </div>
        </div>
    );
}

// ── Step 5: RNN vs Transformer 비교 ──
function TransformerDemo() {
    const [mode, setMode] = useState('rnn'); // 'rnn' or 'transformer'
    const tokens = ['The', 'cat', 'sat', 'on', 'the', 'mat'];

    return (
        <div className={styles.dsContainer}>
            <p className={styles.dsInstruction}>
                RNN과 Transformer, 무엇이 다를까요?<br/>
                모드를 전환해서 비교해보세요!
            </p>

            <div className={styles.modeToggleRow}>
                {['rnn', 'transformer'].map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={styles.modeToggleBtn}
                        style={{
                            background: mode === m
                                ? (m === 'rnn' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)')
                                : 'rgba(15,10,40,0.4)',
                            border: `1px solid ${mode === m
                                ? (m === 'rnn' ? 'rgba(167,139,250,0.4)' : 'rgba(96,165,250,0.4)')
                                : 'rgba(255,255,255,0.08)'}`,
                            color: mode === m
                                ? (m === 'rnn' ? '#a78bfa' : '#60a5fa')
                                : 'var(--text-dim)',
                        }}
                    >
                        {m === 'rnn' ? '〰️ RNN' : '⚡ Transformer'}
                    </button>
                ))}
            </div>

            {/* 처리 방식 시각화 */}
            <div
                className={styles.processingBox}
                style={{
                    border: `1px solid ${mode === 'rnn' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)'}`,
                }}
            >
                <div className={styles.processingLabel}>
                    {mode === 'rnn' ? '순차 처리 (하나씩)' : '병렬 처리 (한꺼번에!)'}
                </div>
                <div
                    className={styles.processingTokenRow}
                    style={{ gap: mode === 'rnn' ? 4 : 8 }}
                >
                    {tokens.map((token, i) => (
                        <div key={i} className={styles.processingTokenPair}>
                            <div
                                className={styles.processingToken}
                                style={{
                                    background: mode === 'rnn'
                                        ? `rgba(167,139,250,${0.1 + i * 0.05})`
                                        : 'rgba(96,165,250,0.2)',
                                    border: `1px solid ${mode === 'rnn'
                                        ? 'rgba(167,139,250,0.3)' : 'rgba(96,165,250,0.3)'}`,
                                }}
                            >
                                {token}
                            </div>
                            {mode === 'rnn' && i < tokens.length - 1 && (
                                <span className={styles.rnnArrowSmall}>→</span>
                            )}
                        </div>
                    ))}
                </div>

                {mode === 'transformer' && (
                    <div className={styles.attentionNote}>
                        ↕️ 모든 토큰이 서로를 동시에 참조! (Self-Attention)
                    </div>
                )}
            </div>

            {/* 비교 테이블 */}
            <div className={styles.comparisonRow}>
                <div
                    className={styles.comparisonCard}
                    style={{
                        background: mode === 'rnn' ? 'rgba(167,139,250,0.08)' : 'rgba(15,10,40,0.3)',
                        border: `1px solid ${mode === 'rnn' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                >
                    <div className={styles.comparisonTitleRnn}>
                        〰️ RNN
                    </div>
                    <ul className={styles.comparisonList}>
                        <li>순차 처리 (느림)</li>
                        <li>긴 문장 → 기억 소실</li>
                        <li>구조가 단순</li>
                    </ul>
                </div>
                <div
                    className={styles.comparisonCard}
                    style={{
                        background: mode === 'transformer' ? 'rgba(96,165,250,0.08)' : 'rgba(15,10,40,0.3)',
                        border: `1px solid ${mode === 'transformer' ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}
                >
                    <div className={styles.comparisonTitleTransformer}>
                        ⚡ Transformer
                    </div>
                    <ul className={styles.comparisonList}>
                        <li>병렬 처리 (빠름!)</li>
                        <li>어텐션으로 먼 정보도 참조</li>
                        <li>포지션 인코딩 필요</li>
                    </ul>
                </div>
            </div>

            <div className={styles.previewBanner}>
                💡 <strong className={styles.previewHighlight}>10주차 미리보기:</strong> Transformer의 핵심 &quot;어텐션(Attention)&quot;을 자세히 배워요!
            </div>
        </div>
    );
}

// ── 메인 페이지 ──
export default function WeekIntroPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);

    const step = STEPS[currentStep];
    const nextStep = () => setCurrentStep(p => Math.min(p + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep(p => Math.max(p - 1, 0));
    const goToLab = () => router.push('/week8');

    const renderStepContent = () => {
        switch (step.id) {
            case 'welcome': return <WordOrderDemo />;
            case 'rnn': return <RNNDemo />;
            case 'memory': return <MemoryDemo />;
            case 'lstm': return <LSTMDemo />;
            case 'transformer': return <TransformerDemo />;
            case 'lab':
                return (
                    <div className={styles.labContainer}>
                        <div className={`${styles.labEmoji} animate-float`}>〰️</div>
                        <p className={styles.dsText}>
                            이제 <strong>RNN이 문맥을 기억하며</strong><br />
                            <strong className={styles.labHighlight}>텍스트를 생성하는 과정</strong>을<br />
                            직접 체험해봅니다!
                        </p>
                        <button
                            className={`btn-nova ${styles.labButton}`}
                            onClick={goToLab}
                        >
                            <span>〰️ RNN 실험실로 출발!</span>
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
                    <div
                        key={s.id}
                        className={styles.progressDot}
                        style={{
                            background: i <= currentStep ? '#a78bfa' : 'rgba(167, 139, 250, 0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div
                    className={styles.progressFill}
                    style={{
                        width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                    }}
                />
            </div>

            <div className={styles.header}>
                <span className={styles.weekBadge}>8주차</span>
                <div className={styles.emojiLarge}>{step.emoji}</div>
                <h1 className={styles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
                <p className={styles.subtitle}>{step.subtitle}</p>
            </div>

            <div className={styles.content}>{renderStepContent()}</div>

            <div className={styles.navBar}>
                <button
                    className={`btn-nova ${styles.navBtn}`}
                    style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>← 이전</span>
                </button>
                <span className={styles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                {currentStep < STEPS.length - 1 ? (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={nextStep}>
                        <span>다음 →</span>
                    </button>
                ) : (
                    <button className={`btn-nova ${styles.navBtn}`} onClick={goToLab}>
                        <span>〰️ 실습 시작</span>
                    </button>
                )}
            </div>
        </div>
    );
}
