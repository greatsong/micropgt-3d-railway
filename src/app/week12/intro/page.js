'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Week12Intro() {
    const router = useRouter();
    const [showDeepDive, setShowDeepDive] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <span className={styles.badge}>
                    12주차
                </span>

                <div className={styles.emoji}>⚡</div>

                <h1 className={styles.title}>
                    <span className="text-gradient">폭발을 막아라! (RMSNorm)</span>
                </h1>

                <p className={styles.subtitle}>숫자가 너무 커지면 AI가 고장납니다</p>

                {/* 브리지: 10주차 → 12주차 */}
                <div className={styles.bridgeBox}>
                    <strong className={styles.bridgeLabel}>🔗 지난 시간 복습</strong><br/>
                    10주차에서 <strong>어텐션</strong>이 문맥을 이해하는 핵심임을 배웠어요.
                    하지만 Transformer 블록을 수십 개 쌓으면 숫자가 폭발하거나 사라지는 문제가 생깁니다.
                    오늘은 이 문제를 해결하는 <strong>정규화(Normalization)</strong>를 배워봐요!
                </div>

                {/* WHY 동기 부여 */}
                <div className={styles.whyBox}>
                    <strong className={styles.whyLabel}>💡 왜 &quot;정규화&quot;가 필요한가요?</strong><br/>
                    AI가 학습하면서 숫자를 계속 더하다 보면, 값이 <strong>무한대</strong>로 커지거나(<strong>기울기 폭발</strong>),
                    반대로 아주 작게 줄어들어 사라지는(<strong>기울기 소실</strong>) 문제가 발생해요.
                    비유하면, 전화 게임처럼 말이 전달될수록 원래 의미가 변하거나 사라지는 것과 비슷합니다!
                </div>

                <div className={styles.card}>
                    <div className={styles.objectivesHeader}>
                        <h3 className={styles.objectivesTitle}>학습 목표</h3>
                        <ul className={styles.objectivesList}>
                            <li>깊은 신경망에서 값이 폭발/소실하는 문제 이해<br/>
                                <span className={styles.termDetail}>
                                    — 기울기 폭발(Gradient Explosion): 역전파 시 값이 기하급수적으로 커지는 현상<br/>
                                    — 기울기 소실(Gradient Vanishing): 역전파 시 값이 0에 수렴하는 현상
                                </span>
                            </li>
                            <li>정규화(Normalization)로 값을 일정 범위로 유지하는 원리 파악<br/>
                                <span className={styles.termDetail}>
                                    — 학생들의 점수를 0~100점으로 환산하는 것과 비슷한 개념
                                </span>
                            </li>
                            <li>RMSNorm이 최신 LLM에서 사용되는 이유 실험<br/>
                                <span className={styles.termDetail}>
                                    — RMSNorm: 평균을 빼지 않고 크기(RMS)만 조절 → 계산이 빠르고 효과적
                                </span>
                            </li>
                        </ul>
                    </div>
                    <p className={styles.ctaText}>
                        👇 아래 버튼을 눌러 직접 체험해보세요!<br />
                        정규화 없이 훈련 vs 있이 훈련을 비교해보세요!
                    </p>
                </div>

                {/* 한 걸음 더: 정규화 종류 비교 */}
                <div className={styles.deepDiveContainer}>
                    <button
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        className={styles.deepDiveButton}
                    >
                        {showDeepDive ? '▼' : '▶'} 한 걸음 더: LayerNorm, BatchNorm, RMSNorm의 차이
                    </button>
                    {showDeepDive && (
                        <div className={styles.deepDiveContent}>
                            <p>
                                정규화에도 여러 종류가 있어요. 각각의 특징을 비교해볼까요?
                            </p>
                            <p>
                                <strong className={styles.normBatch}>1. BatchNorm (2015)</strong> —
                                미니배치(여러 데이터를 묶은 단위) 안에서 같은 뉴런의 출력을 정규화.
                                이미지 분류에서 큰 성공을 거뒀지만, <strong>배치 크기에 따라 성능이 달라지고</strong>,
                                언어 모델처럼 문장 길이가 다른 경우에는 적합하지 않아요.
                            </p>
                            <p>
                                <strong className={styles.normLayer}>2. LayerNorm (2016)</strong> —
                                하나의 데이터 내에서, 같은 층의 모든 뉴런 출력을 정규화.
                                배치 크기에 무관하게 작동하여 <strong>Transformer의 기본 정규화</strong>로 채택됐어요.
                                BERT, GPT-2, GPT-3가 이 방식을 사용합니다.
                            </p>
                            <p>
                                <strong className={styles.normRms}>3. RMSNorm (2019)</strong> —
                                LayerNorm에서 &quot;평균을 빼는 단계&quot;를 생략하고, <strong>RMS(제곱평균제곱근)만으로 크기를 조절</strong>.
                                계산이 더 빠르면서도 성능은 비슷해서 <strong>LLaMA, Mistral, Gemma</strong> 등 최신 LLM이 채택했습니다.
                                GPT 이후 세대의 모델들은 대부분 RMSNorm으로 전환하는 추세예요!
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className={`btn-nova ${styles.ctaButton}`}
                    onClick={() => router.push('/week12')}
                >
                    <span>⚡ 정규화 실험실로 이동</span>
                </button>
            </div>
        </div>
    );
}
