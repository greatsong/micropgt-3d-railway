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
                    background: '#a78bfa20',
                    color: '#a78bfa'
                }}>
                    8주차
                </span>

                <div style={{ fontSize: '4rem', margin: '20px 0' }}>〰️</div>

                <h1 style={styles.title}>
                    <span className="text-gradient">시퀀스와 포지션 (RNN)</span>
                </h1>

                <p style={styles.subtitle}>순서를 기억하는 방법</p>

                {/* 브리지: 7주차 → 8주차 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)',
                    marginBottom: 16, textAlign: 'left',
                    fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                    7주차에서 역전파로 신경망이 학습하는 원리를 배웠어요.
                    하지만 지금까지의 신경망은 입력을 한 번에 처리하고 끝!
                    <strong> &quot;나는 오늘 학교에&quot;</strong>처럼 <strong>순서가 중요한 데이터</strong>는 어떻게 처리할까요?
                </div>

                {/* 동기 부여 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.15)',
                    marginBottom: 20, textAlign: 'left',
                    fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#34d399' }}>💡 왜 &quot;순서&quot;가 중요한가요?</strong><br/>
                    &quot;고양이가 쥐를 쫓았다&quot;와 &quot;쥐가 고양이를 쫓았다&quot;는 단어는 같지만 의미가 완전히 달라요!
                    언어를 이해하려면 <strong>단어의 순서(위치)</strong>를 알아야 합니다.
                    오늘은 이 순서를 기억하는 특별한 신경망, <strong>RNN</strong>을 만나볼 거예요.
                </div>

                <div style={styles.card}>
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <h3 style={{ color: '#fff', marginBottom: 8 }}>학습 목표</h3>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
                            <li>순차적 데이터(Sequence)를 처리하는 RNN의 원리 이해<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — RNN: 이전 출력을 다음 입력에 되먹임하여 &quot;기억&quot;을 만드는 신경망
                                </span>
                            </li>
                            <li>RNN의 한계와 LSTM의 등장 배경<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — 기울기 소실(Vanishing Gradient): 긴 문장에서 앞쪽 정보가 사라지는 문제<br/>
                                    — LSTM: 중요한 정보만 선택적으로 기억/삭제하는 &quot;게이트&quot; 구조
                                </span>
                            </li>
                            <li>트랜스포머의 포지션 인코딩(Positional Encoding) 개념<br/>
                                <span style={{ fontSize: '0.83rem', color: 'var(--text-dim)' }}>
                                    — 각 토큰에 &quot;몇 번째인지&quot; 위치 정보를 숫자로 더해주는 방법
                                </span>
                            </li>
                        </ul>
                    </div>
                    <p style={{ lineHeight: 1.6, color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        👇 아래 버튼을 눌러 직접 체험해보세요!<br />
                        문맥을 기억하며 글을 쓰는 RNN 모델을 만나보세요!
                    </p>
                </div>

                {/* 한 걸음 더: RNN에서 Transformer로 */}
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
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: RNN은 왜 Transformer에 밀렸을까?
                    </button>
                    {showDeepDive && (
                        <div style={{
                            padding: 16, background: 'rgba(124, 92, 252, 0.04)',
                            fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                        }}>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#f87171' }}>RNN의 치명적 단점: 순차 처리</strong> —
                                RNN은 토큰을 하나씩 차례대로 처리해야 해서, 긴 문장일수록 학습이 매우 느려요.
                                GPU의 병렬 처리 능력을 활용할 수 없습니다.
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#34d399' }}>Transformer의 혁신: 병렬 처리</strong> —
                                2017년 Google이 발표한 Transformer는 모든 토큰을 <strong>동시에</strong> 처리할 수 있어서
                                학습 속도가 비약적으로 빨라졌어요. 대신 순서 정보가 사라지기 때문에 &quot;포지션 인코딩&quot;이 필요해진 거죠.
                            </p>
                            <p>
                                <strong style={{ color: '#fbbf24' }}>10주차 미리보기</strong> —
                                Transformer의 핵심인 <strong>어텐션(Attention)</strong> 메커니즘은 10주차에서 자세히 배울 거예요!
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className="btn-nova"
                    style={{ marginTop: 30, padding: '12px 30px' }}
                    onClick={() => router.push('/week8')}
                >
                    <span>〰️ RNN 실험실로 이동</span>
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
