'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WeekIntroPage() {
    const router = useRouter();
    const [showDeepDive, setShowDeepDive] = useState(false);

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <span style={{
                    ...styles.badge,
                    background: '#8b5cf620',
                    color: '#8b5cf6'
                }}>
                    14주차
                </span>

                <div style={{ fontSize: '4rem', margin: '20px 0' }}>🐕</div>

                <h1 style={styles.title}>
                    <span className="text-gradient">AI 조련하기 (SFT & RLHF)</span>
                </h1>

                <p style={styles.subtitle}>똑똑한 비서 만들기</p>

                {/* 브리지: 13주차 → 14주차 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)',
                    marginBottom: 16, textAlign: 'left',
                    fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                    13주차에서 GPT의 아키텍처를 조립해봤어요. 하지만 이렇게 만든 모델은
                    &quot;다음 단어 예측&quot;만 잘할 뿐, 질문에 친절히 답하는 <strong>챗봇</strong>은 아니에요.
                    오늘은 이 &quot;똑똑하지만 예의 없는&quot; AI를 <strong>똑똑하고 예의 바른</strong> AI로 바꾸는 방법을 배웁니다!
                </div>

                {/* 동기 부여 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.15)',
                    marginBottom: 20, textAlign: 'left',
                    fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#34d399' }}>💡 왜 &quot;조련&quot;이 필요한가요?</strong><br/>
                    GPT-4를 처음 학습시키면 인터넷의 모든 텍스트를 배운 상태예요.
                    유용한 지식도 있지만, 거짓 정보나 유해한 내용도 포함되어 있죠.
                    SFT와 RLHF는 이 &quot;야생의 AI&quot;를 안전하고 도움이 되는 비서로 길들이는 과정입니다!
                </div>

                <div style={styles.card}>
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <h3 style={{ color: '#fff', marginBottom: 8 }}>학습 목표</h3>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
                            <li>Pre-trained Model이 Chatbot으로 진화하는 과정 이해<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — Pre-trained Model: 대량의 텍스트로 &quot;다음 단어 예측&quot;을 학습한 기본 모델
                                </span>
                            </li>
                            <li>SFT(Supervised Fine-Tuning): 모범 답안으로 미세 조정<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — 사람이 작성한 좋은 대화 예시를 보여주며 따라하게 하는 것
                                </span>
                            </li>
                            <li>RLHF: 인간의 피드백으로 강화학습<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — &quot;이 답변이 더 좋아!&quot;라고 사람이 평가하면, AI가 그 방향으로 학습
                                </span>
                            </li>
                        </ul>
                    </div>
                    <p style={{ lineHeight: 1.6, color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        👇 아래 버튼을 눌러 직접 체험해보세요!<br />
                        AI에게 좋은 답변과 나쁜 답변을 가르치는 과정을 시뮬레이션 해보세요!
                    </p>
                </div>

                {/* 한 걸음 더: RLHF 이후의 발전 */}
                <div style={{
                    marginTop: 16, borderRadius: 12,
                    border: '1px solid rgba(124, 92, 252, 0.2)', overflow: 'hidden', textAlign: 'left',
                }}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        style={{
                            width: '100%', padding: '12px 16px',
                            background: 'rgba(124, 92, 252, 0.08)', border: 'none',
                            color: '#a78bfa', fontSize: '0.9rem', fontWeight: 600,
                            cursor: 'pointer', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: RLHF 이후, AI Alignment는 어디까지 왔을까?
                    </button>
                    {showDeepDive && (
                        <div style={{
                            padding: 16, background: 'rgba(124, 92, 252, 0.04)',
                            fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                        }}>
                            <p style={{ marginBottom: 10 }}>
                                RLHF는 ChatGPT를 만든 핵심 기술이지만, 한계도 있어요:
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#f87171' }}>RLHF의 한계</strong> —
                                보상 모델(Reward Model)을 따로 학습시켜야 해서 비용이 크고,
                                보상 모델이 &quot;진짜 좋은 답&quot;이 아닌 &quot;높은 점수를 받는 답&quot;을 학습하는
                                <strong> 보상 해킹(Reward Hacking)</strong> 문제가 있어요.
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#10b981' }}>DPO (Direct Preference Optimization, 2023)</strong> —
                                보상 모델 없이, &quot;A 답변이 B보다 좋다&quot;는 선호 데이터만으로 직접 모델을 학습시키는 방법.
                                RLHF보다 훨씬 간단하고 안정적이어서 <strong>LLaMA 2, Zephyr</strong> 등에서 채택됐습니다.
                            </p>
                            <p>
                                <strong style={{ color: '#fbbf24' }}>Constitutional AI (Anthropic, 2022)</strong> —
                                AI에게 &quot;원칙(Constitution)&quot;을 주고, 스스로 자기 답변을 평가하고 수정하게 하는 방법.
                                사람의 평가 없이도 AI가 안전해질 수 있다는 아이디어예요.
                                이것이 <strong>Claude</strong>를 만든 Anthropic의 핵심 기술입니다!
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className="btn-nova"
                    style={{ marginTop: 30, padding: '12px 30px' }}
                    onClick={() => router.push('/week14')}
                >
                    <span>🐕 RLHF 트레이닝 센터로 이동</span>
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    content: {
        textAlign: 'center',
        maxWidth: 600,
    },
    badge: {
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: '0.9rem',
        fontWeight: 700,
        letterSpacing: '0.05em',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: 800,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: '1.2rem',
        color: 'var(--text-secondary)',
        marginBottom: 40,
    },
    card: {
        padding: 30,
        borderRadius: 20,
        background: 'rgba(15, 10, 40, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
};
