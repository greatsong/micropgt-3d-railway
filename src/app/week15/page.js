'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';
import s from './page.module.css';

// ── 프로젝트 아이디어 생성기 데이터 ──
const DOMAINS = ['교육', '건강', '음악', '환경', '게임', '요리', '여행', '패션', '뉴스', '운동'];
const TECHNIQUES = ['챗봇', '요약기', '생성기', '분류기', '추천 시스템', '번역기', '분석기', '코치'];
const TARGETS = ['초등학생', '대학생', '직장인', '어르신', '반려동물 주인', '운동선수', '작가', '개발자'];
const TWISTS = [
    '유머를 곁들인', '이모지로 대화하는', '게임처럼 레벨업하는',
    '다국어를 지원하는', 'SNS와 연동되는', '음성으로 작동하는',
    '일기장과 연결된', '실시간 협업 가능한',
];

function generateIdea() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    return {
        domain: pick(DOMAINS),
        technique: pick(TECHNIQUES),
        target: pick(TARGETS),
        twist: pick(TWISTS),
    };
}

// ── 복습 체크리스트 ──
const REVIEW_ITEMS = [
    { week: '1', title: '토큰화 (BPE)', key: 'BPE(Byte Pair Encoding) 병합 과정을 설명할 수 있다' },
    { week: '2', title: '다음 토큰 예측', key: 'Temperature와 Top-k/Top-p의 차이를 안다' },
    { week: '3', title: '원-핫 인코딩', key: '원-핫 벡터의 한계(차원 폭발, 거리 동일)를 설명할 수 있다' },
    { week: '4', title: '임베딩', key: '코사인 유사도로 단어 간 거리를 측정할 수 있다' },
    { week: '5', title: '경사하강법', key: 'Learning Rate가 너무 크면 발산함을 이해한다' },
    { week: '6', title: '뉴런과 활성화 함수', key: 'ReLU, Sigmoid 등 활성화 함수의 역할을 안다' },
    { week: '7', title: '역전파', key: '체인룰로 그래디언트가 역방향 전파됨을 안다' },
    { week: '8', title: 'RNN & PE', key: 'RNN의 한계와 Positional Encoding의 필요성을 안다' },
    { week: '10-11', title: '어텐션', key: 'Q, K, V의 역할과 Self-Attention을 설명할 수 있다' },
    { week: '12', title: '정규화', key: 'RMSNorm이 왜 필요한지, 값 폭발 문제를 안다' },
    { week: '13', title: 'GPT 아키텍처', key: 'Decoder-only 구조와 각 블록의 역할을 안다' },
    { week: '14', title: 'RLHF', key: 'SFT → RM → PPO 과정을 설명할 수 있다' },
];

// ── 프롬프트 엔지니어링 예제 ──
const PROMPT_CHALLENGES = [
    {
        task: '다음 문장을 3줄로 요약하는 프롬프트를 작성하세요',
        hint: '역할(Role), 형식(Format), 제약(Constraint)을 포함하세요',
        example: '당신은 뉴스 에디터입니다. 다음 기사를 3줄 이내로 요약해주세요. 핵심 사실만 포함하고 의견은 제외합니다.',
    },
    {
        task: '감정 분석 AI에게 줄 프롬프트를 작성하세요',
        hint: 'Few-shot(예시를 몇 개 보여주면서 AI에게 패턴을 알려주는 기법. 0개=Zero-shot, 1개=One-shot) 예시를 포함하면 정확도가 올라갑니다',
        example: '다음 텍스트의 감정을 분석해주세요.\n예시:\n- "오늘 날씨가 너무 좋다!" → 긍정\n- "시험 망했다..." → 부정\n\n분석할 텍스트: "{입력}"',
    },
    {
        task: '코드 리뷰를 해주는 프롬프트를 작성하세요',
        hint: 'Chain-of-Thought(CoT: 단계별로 생각하라고 요청하면 AI가 더 정확한 답을 내놓는 기법. "단계별로 풀어보세요"라고 추가하면 됨)를 유도하세요',
        example: '당신은 시니어 개발자입니다. 다음 코드를 리뷰해주세요.\n1. 먼저 코드의 목적을 파악하세요\n2. 버그가 있다면 지적하세요\n3. 개선 방안을 제안하세요\n4. 전체 평가를 1-10점으로 매겨주세요',
    },
    {
        task: 'AI가 특정 인물처럼 대화하게 하는 프롬프트를 작성하세요',
        hint: 'System prompt(AI에게 역할과 규칙을 미리 알려주는 숨겨진 지시문. "당신은 친절한 수학 선생님입니다"처럼 AI의 성격을 정함)로 페르소나를 설정하세요',
        example: 'You are Socrates, the ancient Greek philosopher. Respond to all questions using the Socratic method — answer with thought-provoking questions rather than direct answers. Speak in a wise but friendly tone.',
    },
];

export default function Week15Page() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('ideas');
    const [idea, setIdea] = useState(null);
    const [checkedItems, setCheckedItems] = useState({});
    const [currentChallenge, setCurrentChallenge] = useState(0);
    const [showExample, setShowExample] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');
    const [showDeepDive, setShowDeepDive] = useState(false);

    const handleGenerate = useCallback(() => {
        setIdea(generateIdea());
    }, []);

    const toggleCheck = useCallback((week) => {
        setCheckedItems(prev => ({ ...prev, [week]: !prev[week] }));
    }, []);

    const checkedCount = Object.values(checkedItems).filter(Boolean).length;

    const tabs = [
        { id: 'ideas', label: '💡 아이디어 생성기' },
        { id: 'review', label: '📋 복습 체크리스트' },
        { id: 'prompt', label: '✍️ 프롬프트 실습' },
        { id: 'tips', label: '🚀 해커톤 팁' },
    ];

    return (
        <div className={s.container}>
            <Breadcrumb
                items={[{ label: '15주차 인트로', href: '/week15/intro' }]}
                current="바이브 코딩 해커톤"
            />
            <div className={s.header}>
                <h1 className={s.title}>💻 15주차: 바이브 코딩 해커톤</h1>
                <div className={s.vibeCodingNote}>바이브 코딩(Vibe Coding) = AI에게 '이런 느낌으로 만들어줘'라고 설명하며 함께 코딩하는 방식</div>
            </div>

            {/* 탭 */}
            <div className={s.tabBar}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${s.tabBtn} ${activeTab === tab.id ? s.tabBtnActive : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={s.content}>

                {/* === Tab 1: Idea Generator === */}
                {activeTab === 'ideas' && (
                    <>
                        <div className={s.hero}>
                            <h2 className={s.heroTitle}>프로젝트 아이디어 생성기</h2>
                            <p className={s.heroDesc}>
                                버튼을 눌러 랜덤 조합으로 프로젝트 아이디어를 받아보세요!
                                마음에 드는 아이디어가 나올 때까지 돌려보세요.
                            </p>
                            <button onClick={handleGenerate} className={s.generateBtn}>
                                🎲 아이디어 뽑기!
                            </button>
                        </div>

                        {idea && (
                            <div className={s.ideaCard}>
                                <h3 className={s.ideaTitle}>💡 당신의 프로젝트 아이디어</h3>
                                <div className={s.ideaGrid}>
                                    <div className={s.ideaChip}>
                                        <span className={s.ideaLabel}>분야</span>
                                        <span className={s.ideaValue}>{idea.domain}</span>
                                    </div>
                                    <div className={s.ideaChip}>
                                        <span className={s.ideaLabel}>기술</span>
                                        <span className={s.ideaValue}>{idea.technique}</span>
                                    </div>
                                    <div className={s.ideaChip}>
                                        <span className={s.ideaLabel}>대상</span>
                                        <span className={s.ideaValue}>{idea.target}</span>
                                    </div>
                                    <div className={s.ideaChip}>
                                        <span className={s.ideaLabel}>특징</span>
                                        <span className={s.ideaValue}>{idea.twist}</span>
                                    </div>
                                </div>
                                <div className={s.ideaSummary}>
                                    <strong>{idea.target}</strong>을 위한,{' '}
                                    <strong>{idea.twist}</strong>{' '}
                                    <strong>{idea.domain} {idea.technique}</strong>
                                </div>
                            </div>
                        )}

                        <div className={s.exampleGrid}>
                            {[
                                { emoji: '🤖', title: '나만의 챗봇', desc: '특정 캐릭터 페르소나 챗봇' },
                                { emoji: '📝', title: '자동 요약기', desc: '긴 글을 3줄로 요약' },
                                { emoji: '😊', title: '감정 분석기', desc: '일기에서 감정 분석 & 음악 추천' },
                                { emoji: '🎵', title: 'AI 작사가', desc: '키워드로 가사 생성' },
                                { emoji: '🌍', title: '여행 플래너', desc: 'AI가 일정 추천' },
                                { emoji: '🍳', title: '레시피 생성기', desc: '냉장고 재료로 요리 추천' },
                            ].map(ex => (
                                <div key={ex.title} className={s.exampleItem}>
                                    <span className={s.exampleEmoji}>{ex.emoji}</span>
                                    <strong className={s.exampleTitle}>{ex.title}</strong>
                                    <span className={s.exampleDesc}>{ex.desc}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* === Tab 2: Review Checklist === */}
                {activeTab === 'review' && (
                    <>
                        <div className={s.reviewHeader}>
                            <h2 className={s.sectionTitle}>📋 배운 내용 복습 체크리스트</h2>
                            <p className={s.heroDesc}>
                                해커톤 전에 지금까지 배운 핵심 개념을 점검해보세요!
                            </p>
                            <div className={s.reviewProgress}>
                                <span>{checkedCount} / {REVIEW_ITEMS.length} 확인 완료</span>
                                <div className={s.reviewTrack}>
                                    <div
                                        className={s.reviewFill}
                                        style={{ width: `${(checkedCount / REVIEW_ITEMS.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={s.reviewList}>
                            {REVIEW_ITEMS.map(item => (
                                <div
                                    key={item.week}
                                    className={s.reviewItem}
                                    style={{
                                        border: checkedItems[item.week]
                                            ? '1px solid rgba(16, 185, 129, 0.3)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        background: checkedItems[item.week]
                                            ? 'rgba(16, 185, 129, 0.05)'
                                            : 'rgba(15, 10, 40, 0.3)',
                                    }}
                                    onClick={() => toggleCheck(item.week)}
                                >
                                    <div className={s.reviewCheck}>
                                        {checkedItems[item.week] ? '✅' : '⬜'}
                                    </div>
                                    <div className={s.reviewContent}>
                                        <div className={s.reviewWeek}>Week {item.week}: {item.title}</div>
                                        <div className={s.reviewKey}>{item.key}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {checkedCount === REVIEW_ITEMS.length && (
                            <div className={s.completeBox}>
                                🎉 모든 개념을 마스터했습니다! 해커톤 준비 완료!
                            </div>
                        )}
                    </>
                )}

                {/* === Tab 3: Prompt Practice === */}
                {activeTab === 'prompt' && (
                    <>
                        <div className={s.promptHeader}>
                            <h2 className={s.sectionTitle}>✍️ 프롬프트 엔지니어링 실습</h2>
                            <p className={s.heroDesc}>
                                좋은 프롬프트를 작성하는 것은 AI를 잘 활용하는 핵심 기술입니다.
                                아래 과제를 풀어보세요!
                            </p>
                            <div className={s.challengeNav}>
                                {PROMPT_CHALLENGES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setCurrentChallenge(i); setShowExample(false); setUserPrompt(''); }}
                                        className={s.challengeBtn}
                                        style={{
                                            background: currentChallenge === i
                                                ? 'rgba(236, 72, 153, 0.2)'
                                                : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${currentChallenge === i
                                                ? '#ec4899'
                                                : 'rgba(255,255,255,0.1)'}`,
                                        }}
                                    >
                                        과제 {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={s.challengeCard}>
                            <h3 className={s.challengeHeading}>
                                과제 {currentChallenge + 1}
                            </h3>
                            <p className={s.challengeTask}>
                                {PROMPT_CHALLENGES[currentChallenge].task}
                            </p>
                            <p className={s.challengeHint}>
                                💡 힌트: {PROMPT_CHALLENGES[currentChallenge].hint}
                            </p>

                            <textarea
                                value={userPrompt}
                                onChange={e => setUserPrompt(e.target.value)}
                                placeholder="여기에 프롬프트를 작성해보세요..."
                                className={s.promptInput}
                                rows={5}
                            />

                            <button
                                onClick={() => setShowExample(!showExample)}
                                className={s.showExampleBtn}
                            >
                                {showExample ? '예시 숨기기' : '📖 모범 답안 보기'}
                            </button>

                            {showExample && (
                                <div className={s.exampleBox}>
                                    <div className={s.exampleLabel}>모범 답안:</div>
                                    <pre className={s.examplePre}>
                                        {PROMPT_CHALLENGES[currentChallenge].example}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className={s.promptTips}>
                            <h3 className={s.promptTipsTitle}>🔑 좋은 프롬프트의 4원칙</h3>
                            <div className={s.tipGrid}>
                                {[
                                    { label: 'Role', desc: '역할 부여 ("당신은 전문 편집자입니다")' },
                                    { label: 'Task', desc: '명확한 작업 지시 ("다음 글을 요약하세요")' },
                                    { label: 'Format', desc: '출력 형식 지정 ("3줄 이내, 불릿 포인트로")' },
                                    { label: 'Context', desc: '맥락/제약 조건 ("초등학생이 이해할 수준으로")' },
                                ].map(tip => (
                                    <div key={tip.label} className={s.tipItem}>
                                        <span className={s.tipLabel}>{tip.label}</span>
                                        <span className={s.tipDesc}>{tip.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 한 걸음 더: 프롬프트 엔지니어링 고급 기법 */}
                        <div
                            onClick={() => setShowDeepDive(!showDeepDive)}
                            className={s.deepDive}
                        >
                            <div className={s.deepDiveHeader}>
                                <h3 className={s.deepDiveTitle}>
                                    {showDeepDive ? '▼' : '▶'} 한 걸음 더: 프롬프트 엔지니어링 고급 기법
                                </h3>
                                <span className={s.deepDiveToggle}>
                                    {showDeepDive ? '접기' : '펼치기'}
                                </span>
                            </div>
                            {showDeepDive && (
                                <div className={s.deepDiveContent} onClick={e => e.stopPropagation()}>
                                    <div className={s.deepDiveCard}>
                                        <strong className={s.deepDiveHighlight}>Self-Consistency</strong>
                                        <p className={s.deepDiveCardText}>같은 질문을 여러 번 풀게 하고 <strong>다수결</strong>로 답을 결정하는 방법. 한 번의 답변보다 훨씬 정확도가 높아집니다.</p>
                                    </div>
                                    <div className={s.deepDiveCard}>
                                        <strong className={s.deepDiveHighlight}>Tree-of-Thought</strong>
                                        <p className={s.deepDiveCardText}>여러 풀이 경로를 탐색한 후 <strong>최적의 경로를 선택</strong>하는 방법. 복잡한 추론 문제에서 특히 효과적입니다.</p>
                                    </div>
                                    <div className={s.deepDiveCardLast}>
                                        <strong className={s.deepDiveHighlight}>RAG (Retrieval-Augmented Generation)</strong>
                                        <p className={s.deepDiveCardText}>외부 문서를 검색해서 답변의 근거로 사용하는 기술. <strong>할루시네이션을 줄이는 핵심 기술</strong>로, AI가 모르는 최신 정보도 정확하게 답변할 수 있게 해줍니다.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* === Tab 4: Hackathon Tips === */}
                {activeTab === 'tips' && (
                    <>
                        <div className={s.hero}>
                            <h2 className={s.heroTitle}>&quot;나만의 AI 앱을 만들어보세요!&quot;</h2>
                            <p className={s.heroDesc}>
                                지금까지 배운 토큰화, 확률 모델, 프롬프트 엔지니어링 지식을 총동원하여
                                세상을 놀라게 할 창의적인 프로젝트를 시작할 시간입니다.
                            </p>
                        </div>

                        <div className={s.twoCol}>
                            <div className={s.tipCard}>
                                <h3>🛠️ 추천 도구 — 기술 스택(Tech Stack: 프로젝트에 사용하는 기술 조합)</h3>
                                <ul className={s.list}>
                                    <li><strong>Frontend(화면)</strong>: React (Next.js) + Vercel 배포</li>
                                    <li><strong>Backend(서버)</strong>: Python (FastAPI) or Vercel Serverless<br /><span className={s.serverlessNote}>Serverless = 서버 관리 없이 코드만 올리면 자동 실행되는 방식</span></li>
                                    <li><strong>AI Model</strong>: OpenAI GPT API / Google Gemini API / Claude API<br /><span className={s.serverlessNote}>API = 다른 서비스의 기능을 내 프로그램에서 사용할 수 있게 해주는 접점</span></li>
                                    <li><strong>Database(데이터 저장)</strong>: Supabase (무료 Firebase 대안)</li>
                                    <li><strong>Coding AI</strong>: Claude Code, Cursor, GitHub Copilot</li>
                                </ul>
                            </div>

                            <div className={s.tipCard}>
                                <h3>📅 3주 해커톤 타임라인</h3>
                                <ul className={s.list}>
                                    <li><strong>1주차</strong>: 아이디어 확정 + 기술 스택 선정 + 프로토타입(Prototype: 핵심 기능만 담은 초기 시제품)</li>
                                    <li><strong>2주차</strong>: 핵심 기능 개발 + 프롬프트 튜닝</li>
                                    <li><strong>3주차</strong>: UI 다듬기 + 발표 준비 + 배포</li>
                                </ul>
                            </div>
                        </div>

                        <div className={s.successCard}>
                            <h3>🚀 해커톤 성공 꿀팁</h3>
                            <div className={s.tipNumbered}>
                                {[
                                    { num: 1, text: '"완벽한 것보다 완성된 것이 낫다" (Done is better than perfect)' },
                                    { num: 2, text: '거창한 기능보다 핵심 기능 하나에 집중하세요.' },
                                    { num: 3, text: '친구들과 함께라면 더 멀리 갈 수 있습니다. (팀 빌딩 추천!)' },
                                    { num: 4, text: 'AI 코딩 도구를 적극 활용하세요. 바이브 코딩의 핵심!' },
                                    { num: 5, text: '바이브(Vibe)를 잃지 마세요. 즐기면서 코딩하는 것이 가장 중요합니다! 🎵' },
                                ].map(tip => (
                                    <div key={tip.num} className={s.numberedItem}>
                                        <span className={s.numCircle}>{tip.num}</span>
                                        <span className={s.numText}>{tip.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 네비게이션 */}
            <div className={s.navRow}>
                <button onClick={() => router.push('/week14')} className={s.navBtn}>← 14주차</button>
                <button onClick={() => router.push('/hub')} className={s.navBtn}>🚀 허브로</button>
            </div>
        </div>
    );
}
