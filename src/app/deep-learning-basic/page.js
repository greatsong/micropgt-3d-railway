'use client';

import { useRouter } from 'next/navigation';
import s from './page.module.css';

const SECTIONS = [
  {
    title: '활성화 함수 실험실',
    question: 'XOR도 못 풀던 퍼셉트론은 복잡한 문제를 어떻게 풀었는가?',
    desc: '공간의 휘어짐과 기울기 소실을 직접 체험',
    url: 'https://activation-lab.vercel.app',
    color: '#e63946',
    emoji: '🧠',
  },
  {
    title: '평가 지표 실험실',
    question: '잘 학습됐는지 측정할 수 있나?',
    desc: 'Confusion Matrix, Precision/Recall, MSE vs MAE, Cross-Entropy',
    url: 'https://eval-lab-site.vercel.app',
    color: '#2979ff',
    emoji: '📊',
  },
  {
    title: '경사하강법 레이싱',
    question: '수십억 개의 파라미터는 어떻게 자동으로 업데이트되나?',
    desc: '8개 맵에서 학습률과 모멘텀을 조절하며 최적화 레이싱',
    url: 'https://gradient-descent-race-production.up.railway.app',
    color: '#f43f5e',
    emoji: '🏎️',
  },
  {
    title: 'LLM 실험실',
    question: '숫자만 아는 기계가 텍스트를 어떻게 이해하나?',
    desc: '토큰화 → 임베딩 → 어텐션 → 다음 단어 예측',
    url: 'https://llm-lab-site.vercel.app',
    color: '#7c5cfc',
    emoji: '💬',
  },
];


export default function DeepLearningBasicPage() {
  const router = useRouter();

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.headerBadge}>AI 기초</div>
        <h1 className={s.title}>딥러닝 기초반</h1>
        <p className={s.subtitle}>
          인공지능의 역사는 <strong>문제해결</strong>의 역사이고, <strong>아이디어</strong>의 역사이고, <strong>알고리즘</strong>의 역사이다.
        </p>
        <p className={s.desc}>
          학습이란 입력 공간을 출력에 맞게 적절히 변환하는 함수를 찾는 것이다.<br/>
          그 함수의 모양을 결정하는 것이 가중치이므로, 학습이란 결국 <strong>최적의 가중치 조합을 찾는 과정</strong>이다.
        </p>
      </div>

      <div className={s.grid}>
        {SECTIONS.map((sec, i) => {
          const isExternal = sec.url.startsWith('http');
          return (
            <a
              key={i}
              href={sec.url}
              target={isExternal ? '_blank' : '_self'}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className={s.card}
              style={{ borderTopColor: sec.color, textDecoration: 'none' }}
            >
              <div className={s.cardHeader}>
                <span className={s.cardEmoji}>{sec.emoji}</span>
                <div>
                  <h2 className={s.cardTitle}>{sec.title}</h2>
                  <p className={s.cardQuestion} style={{ color: sec.color }}>{sec.question}</p>
                </div>
              </div>
              <p className={s.cardDesc}>{sec.desc}</p>
              <div className={s.cardCta} style={{ color: sec.color }}>
                시작하기 →
              </div>
            </a>
          );
        })}
      </div>

      <div className={s.footer}>
        <button className={s.backBtn} onClick={() => router.push('/hub')}>
          ← 미션 센터로 돌아가기
        </button>
      </div>
    </div>
  );
}
