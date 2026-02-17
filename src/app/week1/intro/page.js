'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Week1Intro() {
    const router = useRouter();
    const [showDeepDiveSubword, setShowDeepDiveSubword] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <span className={styles.badge}>
                    1주차
                </span>

                <div className={styles.emoji}>🧩</div>

                <h1 className={styles.title}>
                    <span className="text-gradient">토큰화(Tokenization)</span>
                </h1>

                <p className={styles.subtitle}>AI가 글자를 읽는 법</p>

                {/* 브리지: AI 여정의 시작 */}
                <div className={styles.bridgeBox}>
                    <strong className={styles.bridgeLabel}>🚀 AI 여정의 시작</strong><br/>
                    ChatGPT, Gemini, Claude 같은 AI는 어떻게 우리의 말을 이해할까요?
                    이 수업에서는 15주에 걸쳐 AI의 내부를 하나씩 파헤쳐 봅니다.
                    그 <strong>첫 번째 단계</strong>가 바로 오늘 배울 <strong>토큰화</strong>입니다!
                </div>

                {/* 동기 부여: 왜 토큰화가 필요한가? */}
                <div className={styles.whyBox}>
                    <strong className={styles.whyLabel}>💡 왜 토큰화가 필요한가요?</strong><br/>
                    컴퓨터는 글자를 직접 이해할 수 없어요. 오직 <strong>숫자</strong>만 처리할 수 있죠.
                    그래서 우리가 쓰는 문장을 컴퓨터가 이해할 수 있는 작은 조각(<strong>토큰</strong>)으로 나누는 과정이 필요합니다.
                    이것이 바로 AI가 언어를 배우는 <strong>첫 번째 단계</strong>입니다!
                </div>

                <div className={styles.card}>
                    <div className={styles.objectivesHeader}>
                        <h3 className={styles.objectivesTitle}>학습 목표</h3>
                        <ul className={styles.objectivesList}>
                            <li>컴퓨터가 텍스트를 숫자로 변환하는 과정 이해</li>
                            <li>BPE(Byte Pair Encoding) 알고리즘의 원리 체험<br/>
                                <span className={styles.termDetail}>
                                    — 가장 자주 붙어 다니는 글자 쌍을 찾아서 하나로 합치는 방법
                                </span>
                            </li>
                            <li>토큰 단위와 비용(Cost)의 관계 파악</li>
                        </ul>
                    </div>
                    <p className={styles.ctaText}>
                        👇 아래 버튼을 눌러 직접 체험해보세요!<br />
                        텍스트를 입력하면 토큰으로 분해되는 과정을 볼 수 있습니다.
                    </p>
                </div>

                {/* 한 걸음 더: 서브워드 심화 */}
                <div className={styles.deepDiveContainer}>
                    <button
                        onClick={() => setShowDeepDiveSubword(!showDeepDiveSubword)}
                        className={styles.deepDiveButton}
                    >
                        {showDeepDiveSubword ? '▼' : '▶'} 한 걸음 더: 왜 단어 단위가 아니라 서브워드(subword)를 쓸까?
                    </button>
                    {showDeepDiveSubword && (
                        <div className={styles.deepDiveContent}>
                            <p>
                                토큰화 방법에는 크게 세 가지가 있어요:
                            </p>
                            <p>
                                <strong className={styles.strongWord}>1. 단어 단위</strong> —
                                &quot;인스타그램&quot;, &quot;챗지피티&quot;처럼 사전에 없는 신조어가 나오면 처리할 수 없어요.
                            </p>
                            <p>
                                <strong className={styles.strongChar}>2. 문자 단위</strong> —
                                한 글자씩 쪼개면 어떤 단어든 표현 가능하지만, &quot;학&quot;과 &quot;교&quot;를 따로 보면 &quot;학교&quot;라는 뜻을 잃어요.
                            </p>
                            <p>
                                <strong className={styles.strongSubword}>3. 서브워드 (BPE 등)</strong> —
                                두 방법의 장점을 합친 것! 자주 쓰이는 글자 조합은 하나로 묶고, 처음 보는 단어도 작은 조각들로 표현할 수 있어요.
                                GPT, BERT 등 거의 모든 최신 AI가 이 방식을 사용합니다.
                            </p>
                        </div>
                    )}
                </div>

                <button
                    className={`btn-nova ${styles.ctaButton}`}
                    onClick={() => router.push('/week1')}
                >
                    <span>🧪 토크나이저 실험실로 이동</span>
                </button>
            </div>
        </div>
    );
}
