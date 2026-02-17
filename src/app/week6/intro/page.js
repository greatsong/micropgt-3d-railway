'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function WeekIntroPage() {
    const router = useRouter();
    const [showDeepDive, setShowDeepDive] = useState(false);

    return (
        <div style={styles.container}>
            <div style={styles.maxWidthWrapper}>
                <div style={styles.header}>
                    <div style={styles.badge}>6주차: 신경망 기초</div>
                    <h1 style={styles.title}>
                        <span style={{ fontSize: '3rem', marginRight: 15 }}>🕸️</span>
                        <span className="text-gradient">뉴런과 시냅스</span>
                    </h1>
                    <p style={styles.subtitle}>
                        뇌의 작동 원리를 모방하여 인공지능을 만드는 첫 걸음입니다.
                    </p>
                </div>

                {/* 브리지: 5주차 → 6주차 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)',
                    marginBottom: 20, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#fbbf24' }}>🔗 지난 시간 복습</strong><br/>
                    5주차에서 <strong>경사하강법</strong>으로 최적의 값을 찾는 방법을 배웠어요.
                    그런데 &quot;무엇의&quot; 최적값을 찾는 걸까요? 바로 오늘 배울 <strong>뉴런의 가중치(w)</strong>입니다!
                    뉴런은 AI의 가장 작은 계산 단위로, 이걸 연결하면 신경망이 됩니다.
                </div>

                <div style={styles.contentGrid}>
                    {/* 카드 1: 생물학적 뉴런 vs 인공 뉴런 */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>🧠 생물학적 뉴런 vs 인공 뉴런</h2>
                        <div style={styles.comparison}>
                            <div style={styles.compareItem}>
                                <h3>생물학적 뉴런 (Biological)</h3>
                                <ul>
                                    <li><strong>수상돌기 (Dendrites)</strong>: 신호 수신</li>
                                    <li><strong>세포체 (Soma)</strong>: 신호 통합</li>
                                    <li><strong>축색돌기 (Axon)</strong>: 신호 전송</li>
                                    <li><strong>시냅스 (Synapse)</strong>: 연결 강도 조절</li>
                                </ul>
                            </div>
                            <div style={styles.arrow}>➡️ 모방 ➡️</div>
                            <div style={styles.compareItem}>
                                <h3>인공 뉴런 (Artificial)</h3>
                                <ul>
                                    <li><strong>입력 (Inputs, x)</strong>: 데이터 수신</li>
                                    <li><strong>가중치 합 (Weighted Sum)</strong>: Σ(wx) + b</li>
                                    <li><strong>활성화 함수 (Activation)</strong>: 신호 결정</li>
                                    <li><strong>가중치 (Weights, w)</strong>: 중요도 조절</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 카드 2: 핵심 수식 */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>📐 핵심 공식</h2>
                        <div style={styles.formulaBox}>
                            y = Activation( \sum (w_i \cdot x_i) + b )
                        </div>
                        <ul style={styles.list}>
                            <li><strong>w (가중치, Weight)</strong>: 입력 신호의 중요도를 결정합니다. (예: &quot;비가 오면 우산을 쓴다&quot;에서 &apos;비&apos;의 중요도)</li>
                            <li><strong>b (편향, Bias)</strong>: 뉴런이 얼마나 쉽게 활성화될지 결정하는 기준선입니다. &quot;기본 성향&quot;이라고 생각하면 돼요.</li>
                            <li><strong>Activation (활성화 함수)</strong>: 계산된 값을 최종 출력으로 변환합니다. (예: 0~1 사이 확률로 변환)</li>
                        </ul>
                    </div>

                    {/* 카드 3: 활성화 함수 종류 */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>📈 주요 활성화 함수</h2>
                        <div style={styles.grid3}>
                            <div style={styles.miniCard}>
                                <h3>Sigmoid</h3>
                                <p>출력을 0~1로 압축. 확률 표현에 적합하지만, <strong>기울기 소실</strong>(값이 극단에 가면 기울기가 거의 0이 되어 학습이 멈추는 현상) 문제가 있음.</p>
                            </div>
                            <div style={styles.miniCard}>
                                <h3>ReLU</h3>
                                <p>음수는 0, 양수는 그대로. 학습 속도가 빠르고 심층 신경망의 표준.</p>
                            </div>
                            <div style={styles.miniCard}>
                                <h3>Step</h3>
                                <p>임계값을 넘으면 1, 아니면 0. 초기 퍼셉트론에서 사용됨.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 한 걸음 더: 왜 활성화 함수가 필요한가? */}
                <div style={{
                    marginTop: 20, borderRadius: 12,
                    border: '1px solid rgba(124, 92, 252, 0.2)', overflow: 'hidden',
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
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: 활성화 함수가 없으면 어떻게 될까?
                    </button>
                    {showDeepDive && (
                        <div style={{
                            padding: 16, background: 'rgba(124, 92, 252, 0.04)',
                            fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                        }}>
                            <p style={{ marginBottom: 8 }}>
                                활성화 함수 없이 가중치 합만 계산하면, 아무리 층을 많이 쌓아도
                                결국 <strong style={{ color: '#f87171' }}>하나의 선형 함수(y = ax + b)</strong>와 같아져요.
                            </p>
                            <p style={{ marginBottom: 8 }}>
                                <strong style={{ color: '#fbbf24' }}>비선형성(Non-linearity)</strong>이 없으면
                                직선으로만 데이터를 나눌 수 있어서, &quot;고양이 vs 강아지&quot; 같은 복잡한 구분이 불가능합니다.
                            </p>
                            <p>
                                <strong style={{ color: '#34d399' }}>활성화 함수는 신경망에 &quot;곡선&quot;을 만들어 주는 핵심</strong>이에요.
                                ReLU 하나만 추가해도 신경망은 엄청나게 복잡한 패턴을 학습할 수 있게 됩니다!
                                실험실에서 Step, Sigmoid, ReLU를 직접 비교해보세요.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className="btn-nova"
                    style={{ marginTop: 40, width: '100%', padding: '20px', fontSize: '1.2rem' }}
                    onClick={() => router.push('/week6')}
                >
                    🧪 뉴런 실험실로 이동하기 (Lab)
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    maxWidthWrapper: {
        maxWidth: 1000,
        width: '100%',
    },
    header: {
        textAlign: 'center',
        marginBottom: 50,
    },
    badge: {
        display: 'inline-block',
        padding: '6px 16px',
        borderRadius: 20,
        fontSize: '0.9rem',
        fontWeight: 700,
        background: 'rgba(96, 165, 250, 0.2)',
        color: '#60a5fa',
        marginBottom: 15,
        border: '1px solid rgba(96, 165, 250, 0.3)',
    },
    title: {
        fontSize: '3rem',
        fontWeight: 800,
        marginBottom: 15,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitle: {
        fontSize: '1.2rem',
        color: 'var(--text-secondary)',
    },
    contentGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: 25,
    },
    card: {
        background: 'rgba(15, 10, 40, 0.6)',
        borderRadius: 20,
        padding: 30,
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    cardTitle: {
        fontSize: '1.5rem',
        marginBottom: 20,
        color: '#fff',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: 10,
    },
    comparison: {
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        flexWrap: 'wrap',
    },
    compareItem: {
        flex: 1,
        background: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 12,
        minWidth: 280,
    },
    arrow: {
        fontSize: '1.5rem',
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    list: {
        paddingLeft: 20,
        lineHeight: 1.8,
        color: '#cbd5e1',
    },
    formulaBox: {
        background: '#1e293b',
        padding: 20,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: '1.5rem',
        fontFamily: 'monospace',
        marginBottom: 20,
        border: '1px solid #334155',
        color: '#60a5fa',
    },
    grid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
    },
    miniCard: {
        background: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 10,
    }
};
