'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Week15Intro() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <span className={styles.badge}>
                    15주차
                </span>

                <div className={styles.emoji}>💻</div>

                <h1 className={styles.title}>
                    <span className="text-gradient">바이브 코딩 해커톤</span>
                </h1>

                <p className={styles.subtitle}>배운 것을 세상에 보여줄 시간입니다</p>

                {/* 브리지: 14주차 → 15주차 */}
                <div className={styles.bridgeBox}>
                    <strong className={styles.bridgeLabel}>🔗 여정을 돌아보면</strong><br/>
                    토큰화(1주차) → 확률 예측(2주차) → 임베딩(3-4주차) → 경사하강법(5주차)
                    → 뉴런(6주차) → 역전파(7주차) → RNN(8주차) → 어텐션(10주차)
                    → 정규화(12주차) → GPT 아키텍처(13주차) → RLHF(14주차)까지!
                    이제 이 모든 지식을 활용해 <strong>나만의 AI 프로젝트</strong>를 만들 시간입니다!
                </div>

                <div className={styles.card}>
                    <div className={styles.objectivesHeader}>
                        <h3 className={styles.objectivesTitle}>🎯 목표: MVP (Minimum Viable Product)</h3>
                        <p className={styles.description}>
                            정해진 기간 동안 <strong>작동하는 최소한의 기능</strong>을 가진
                            나만의 AI 서비스를 만들어보는 것이 목표입니다.
                        </p>

                        <h3 className={styles.objectivesTitle}>🤝 규칙</h3>
                        <ul className={styles.objectivesList}>
                            <li>오픈소스 라이브러리 사용 환영! (바퀴를 다시 발명하지 마세요)</li>
                            <li>모르는 건 AI에게 물어보세요 (Co-pilot 적극 활용)</li>
                            <li>실패해도 괜찮습니다 — 실패 과정이 가장 큰 배움입니다</li>
                        </ul>
                    </div>
                    <p className={styles.ctaText}>
                        👇 아래 버튼을 눌러 해커톤에 참가하세요!<br />
                        아이디어 생성기, 복습 체크리스트, 프롬프트 엔지니어링 실습이 준비되어 있습니다.
                    </p>
                </div>

                <button
                    className={`btn-nova ${styles.ctaButton}`}
                    onClick={() => router.push('/week15')}
                >
                    <span>🔥 해커톤 입장하기</span>
                </button>
            </div>
        </div>
    );
}
