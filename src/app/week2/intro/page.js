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
                    background: '#34d39920',
                    color: '#34d399'
                }}>
                    2주차
                </span>

                <div style={{ fontSize: '4rem', margin: '20px 0' }}>🎲</div>

                <h1 style={styles.title}>
                    <span className="text-gradient">확률과 언어 모델</span>
                </h1>

                <p style={styles.subtitle}>다음 단어 예측하기</p>

                {/* 브리지: 1주차 → 2주차 */}
                <div style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.15)',
                    marginBottom: 16,
                    textAlign: 'left',
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                    1주차에서 텍스트를 <strong>토큰</strong>이라는 작은 조각으로 나누는 법을 배웠어요.
                    이제 AI는 이 토큰들의 나열을 보고, <strong>&quot;다음에 어떤 토큰이 올까?&quot;</strong>를
                    확률로 예측합니다. 이것이 바로 ChatGPT의 핵심 원리예요!
                </div>

                {/* 동기 부여 */}
                <div style={{
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.15)',
                    marginBottom: 20,
                    textAlign: 'left',
                    fontSize: '0.88rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#34d399' }}>💡 왜 &quot;다음 단어 예측&quot;이 중요한가요?</strong><br/>
                    ChatGPT에게 질문하면, AI는 한 번에 전체 문장을 만드는 게 아니에요.
                    토큰 하나를 예측하고, 그 결과를 보고 또 다음 토큰을 예측하고... 이걸 반복해서 문장을 완성해요.
                    마치 <strong>자동완성</strong>을 계속 누르는 것과 같죠! 이 과정을 이해하면 AI가 왜 가끔 엉뚱한 답을 하는지도 알 수 있어요.
                </div>

                <div style={styles.card}>
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <h3 style={{ color: '#fff', marginBottom: 8 }}>학습 목표</h3>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
                            <li>언어 모델이 다음 단어를 예측하는 확률적 원리 이해</li>
                            <li>Softmax 함수와 확률 분포의 관계 파악<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — 여러 후보 단어에 대한 점수를 0~1 사이의 확률로 변환하는 함수
                                </span>
                            </li>
                            <li>Temperature와 Top-P가 창의성에 미치는 영향 실험<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — Temperature: AI의 &quot;창의성 다이얼&quot; (낮으면 안전한 답, 높으면 다양한 답)<br/>
                                    — Top-P: 상위 몇 %의 후보만 고려할지 정하는 필터
                                </span>
                            </li>
                        </ul>
                    </div>
                    <p style={{ lineHeight: 1.6, color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        👇 아래 버튼을 눌러 직접 체험해보세요!<br />
                        다음에 올 단어를 맞추는 슬롯머신 게임이 준비되었습니다!
                    </p>
                </div>

                {/* 한 걸음 더: 언어 모델의 종류 */}
                <div style={{
                    marginTop: 16,
                    borderRadius: 12,
                    border: '1px solid rgba(124, 92, 252, 0.2)',
                    overflow: 'hidden',
                    textAlign: 'left',
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
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: &quot;다음 단어 예측&quot;만으로 정말 대화가 가능할까?
                    </button>
                    {showDeepDive && (
                        <div style={{
                            padding: 16,
                            background: 'rgba(124, 92, 252, 0.04)',
                            fontSize: '0.88rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.7,
                        }}>
                            <p style={{ marginBottom: 10 }}>
                                놀랍게도, <strong>GPT 시리즈의 핵심은 정말로 &quot;다음 토큰 예측&quot;뿐</strong>이에요!
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#fbbf24' }}>자기회귀(Autoregressive) 모델</strong> —
                                GPT는 앞의 토큰들을 보고 다음 하나를 예측하는 과정을 반복합니다.
                                &quot;나는&quot; → &quot;오늘&quot; → &quot;학교에&quot; → &quot;갔다&quot; 이런 식으로 한 토큰씩 생성해요.
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#34d399' }}>왜 그게 가능할까?</strong> —
                                엄청나게 많은 텍스트(인터넷의 수십억 페이지)를 학습하면서,
                                &quot;이런 맥락 다음에는 이런 단어가 올 확률이 높다&quot;는 패턴을 배운 거예요.
                                마치 수만 권의 책을 읽은 사람이 문장을 자연스럽게 이어가는 것처럼요.
                            </p>
                            <p>
                                <strong style={{ color: '#f87171' }}>한계점</strong> —
                                하지만 이 방식은 &quot;진짜 이해&quot;가 아니라 &quot;패턴 매칭&quot;에 가깝기 때문에,
                                가끔 그럴듯하지만 틀린 답(할루시네이션)을 만들어내기도 합니다.
                                이 문제를 해결하는 방법은 14주차(RLHF)에서 배울 거예요!
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className="btn-nova"
                    style={{ marginTop: 30, padding: '12px 30px' }}
                    onClick={() => router.push('/week2')}
                >
                    <span>🎲 다음 단어 예측 실험실로 이동</span>
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
