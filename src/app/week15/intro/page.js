'use client';

import { useRouter } from 'next/navigation';

export default function Week15Intro() {
    const router = useRouter();

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <span style={{
                    ...styles.badge,
                    background: '#ec489920',
                    color: '#ec4899'
                }}>
                    15주차
                </span>

                <div style={{ fontSize: '4rem', margin: '20px 0' }}>💻</div>

                <h1 style={styles.title}>
                    <span className="text-gradient">바이브 코딩 해커톤</span>
                </h1>

                <p style={styles.subtitle}>배운 것을 세상에 보여줄 시간입니다</p>

                {/* 브리지: 14주차 → 15주차 */}
                <div style={{
                    padding: '14px 18px', borderRadius: 12,
                    background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.15)',
                    marginBottom: 20, textAlign: 'left',
                    fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                }}>
                    <strong style={{ color: '#fbbf24' }}>🔗 여정을 돌아보면</strong><br/>
                    토큰화(1주차) → 확률 예측(2주차) → 임베딩(3-4주차) → 경사하강법(5주차)
                    → 뉴런(6주차) → 역전파(7주차) → RNN(8주차) → 어텐션(10주차)
                    → 정규화(12주차) → GPT 아키텍처(13주차) → RLHF(14주차)까지!
                    이제 이 모든 지식을 활용해 <strong>나만의 AI 프로젝트</strong>를 만들 시간입니다!
                </div>

                <div style={styles.card}>
                    <div style={{ textAlign: 'left', marginBottom: 16 }}>
                        <h3 style={{ color: '#fff', marginBottom: 8 }}>🎯 목표: MVP (Minimum Viable Product)</h3>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                            정해진 기간 동안 <strong>작동하는 최소한의 기능</strong>을 가진
                            나만의 AI 서비스를 만들어보는 것이 목표입니다.
                        </p>

                        <h3 style={{ color: '#fff', marginBottom: 8 }}>🤝 규칙</h3>
                        <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
                            <li>오픈소스 라이브러리 사용 환영! (바퀴를 다시 발명하지 마세요)</li>
                            <li>모르는 건 AI에게 물어보세요 (Co-pilot 적극 활용)</li>
                            <li>실패해도 괜찮습니다 — 실패 과정이 가장 큰 배움입니다</li>
                        </ul>
                    </div>
                    <p style={{ lineHeight: 1.6, color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                        👇 아래 버튼을 눌러 해커톤에 참가하세요!<br />
                        아이디어 생성기, 복습 체크리스트, 프롬프트 엔지니어링 실습이 준비되어 있습니다.
                    </p>
                </div>

                <button
                    className="btn-nova"
                    style={{ marginTop: 30, padding: '12px 30px' }}
                    onClick={() => router.push('/week15')}
                >
                    <span>🔥 해커톤 입장하기</span>
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
