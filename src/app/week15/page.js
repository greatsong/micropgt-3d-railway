'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

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
        <div style={styles.container}>
            <Breadcrumb
                items={[{ label: '15주차 인트로', href: '/week15/intro' }]}
                current="바이브 코딩 해커톤"
            />
            <div style={styles.header}>
                <h1 style={styles.title}>💻 15주차: 바이브 코딩 해커톤</h1>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>바이브 코딩(Vibe Coding) = AI에게 '이런 느낌으로 만들어줘'라고 설명하며 함께 코딩하는 방식</div>
            </div>

            {/* 탭 */}
            <div style={styles.tabBar}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tabBtn,
                            ...(activeTab === tab.id ? styles.tabBtnActive : {}),
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>

                {/* ═══ 탭 1: 아이디어 생성기 ═══ */}
                {activeTab === 'ideas' && (
                    <>
                        <div style={styles.hero}>
                            <h2 style={styles.heroTitle}>프로젝트 아이디어 생성기</h2>
                            <p style={styles.heroDesc}>
                                버튼을 눌러 랜덤 조합으로 프로젝트 아이디어를 받아보세요!
                                마음에 드는 아이디어가 나올 때까지 돌려보세요.
                            </p>
                            <button onClick={handleGenerate} style={styles.generateBtn}>
                                🎲 아이디어 뽑기!
                            </button>
                        </div>

                        {idea && (
                            <div style={styles.ideaCard}>
                                <h3 style={styles.ideaTitle}>💡 당신의 프로젝트 아이디어</h3>
                                <div style={styles.ideaGrid}>
                                    <div style={styles.ideaChip}>
                                        <span style={styles.ideaLabel}>분야</span>
                                        <span style={styles.ideaValue}>{idea.domain}</span>
                                    </div>
                                    <div style={styles.ideaChip}>
                                        <span style={styles.ideaLabel}>기술</span>
                                        <span style={styles.ideaValue}>{idea.technique}</span>
                                    </div>
                                    <div style={styles.ideaChip}>
                                        <span style={styles.ideaLabel}>대상</span>
                                        <span style={styles.ideaValue}>{idea.target}</span>
                                    </div>
                                    <div style={styles.ideaChip}>
                                        <span style={styles.ideaLabel}>특징</span>
                                        <span style={styles.ideaValue}>{idea.twist}</span>
                                    </div>
                                </div>
                                <div style={styles.ideaSummary}>
                                    <strong>{idea.target}</strong>을 위한,{' '}
                                    <strong>{idea.twist}</strong>{' '}
                                    <strong>{idea.domain} {idea.technique}</strong>
                                </div>
                            </div>
                        )}

                        <div style={styles.exampleGrid}>
                            {[
                                { emoji: '🤖', title: '나만의 챗봇', desc: '특정 캐릭터 페르소나 챗봇' },
                                { emoji: '📝', title: '자동 요약기', desc: '긴 글을 3줄로 요약' },
                                { emoji: '😊', title: '감정 분석기', desc: '일기에서 감정 분석 & 음악 추천' },
                                { emoji: '🎵', title: 'AI 작사가', desc: '키워드로 가사 생성' },
                                { emoji: '🌍', title: '여행 플래너', desc: 'AI가 일정 추천' },
                                { emoji: '🍳', title: '레시피 생성기', desc: '냉장고 재료로 요리 추천' },
                            ].map(ex => (
                                <div key={ex.title} style={styles.exampleItem}>
                                    <span style={{ fontSize: '1.5rem' }}>{ex.emoji}</span>
                                    <strong style={{ color: '#f1f5f9', fontSize: '0.85rem' }}>{ex.title}</strong>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{ex.desc}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ═══ 탭 2: 복습 체크리스트 ═══ */}
                {activeTab === 'review' && (
                    <>
                        <div style={styles.reviewHeader}>
                            <h2 style={styles.sectionTitle}>📋 배운 내용 복습 체크리스트</h2>
                            <p style={styles.heroDesc}>
                                해커톤 전에 지금까지 배운 핵심 개념을 점검해보세요!
                            </p>
                            <div style={styles.reviewProgress}>
                                <span>{checkedCount} / {REVIEW_ITEMS.length} 확인 완료</span>
                                <div style={styles.reviewTrack}>
                                    <div style={{
                                        ...styles.reviewFill,
                                        width: `${(checkedCount / REVIEW_ITEMS.length) * 100}%`,
                                    }} />
                                </div>
                            </div>
                        </div>

                        <div style={styles.reviewList}>
                            {REVIEW_ITEMS.map(item => (
                                <div
                                    key={item.week}
                                    style={{
                                        ...styles.reviewItem,
                                        border: checkedItems[item.week]
                                            ? '1px solid rgba(16, 185, 129, 0.3)'
                                            : '1px solid rgba(255,255,255,0.08)',
                                        background: checkedItems[item.week]
                                            ? 'rgba(16, 185, 129, 0.05)'
                                            : 'rgba(15, 10, 40, 0.3)',
                                    }}
                                    onClick={() => toggleCheck(item.week)}
                                >
                                    <div style={styles.reviewCheck}>
                                        {checkedItems[item.week] ? '✅' : '⬜'}
                                    </div>
                                    <div style={styles.reviewContent}>
                                        <div style={styles.reviewWeek}>Week {item.week}: {item.title}</div>
                                        <div style={styles.reviewKey}>{item.key}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {checkedCount === REVIEW_ITEMS.length && (
                            <div style={styles.completeBox}>
                                🎉 모든 개념을 마스터했습니다! 해커톤 준비 완료!
                            </div>
                        )}
                    </>
                )}

                {/* ═══ 탭 3: 프롬프트 실습 ═══ */}
                {activeTab === 'prompt' && (
                    <>
                        <div style={styles.promptHeader}>
                            <h2 style={styles.sectionTitle}>✍️ 프롬프트 엔지니어링 실습</h2>
                            <p style={styles.heroDesc}>
                                좋은 프롬프트를 작성하는 것은 AI를 잘 활용하는 핵심 기술입니다.
                                아래 과제를 풀어보세요!
                            </p>
                            <div style={styles.challengeNav}>
                                {PROMPT_CHALLENGES.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setCurrentChallenge(i); setShowExample(false); setUserPrompt(''); }}
                                        style={{
                                            ...styles.challengeBtn,
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

                        <div style={styles.challengeCard}>
                            <h3 style={{ color: '#ec4899', marginBottom: 8 }}>
                                과제 {currentChallenge + 1}
                            </h3>
                            <p style={styles.challengeTask}>
                                {PROMPT_CHALLENGES[currentChallenge].task}
                            </p>
                            <p style={styles.challengeHint}>
                                💡 힌트: {PROMPT_CHALLENGES[currentChallenge].hint}
                            </p>

                            <textarea
                                value={userPrompt}
                                onChange={e => setUserPrompt(e.target.value)}
                                placeholder="여기에 프롬프트를 작성해보세요..."
                                style={styles.promptInput}
                                rows={5}
                            />

                            <button
                                onClick={() => setShowExample(!showExample)}
                                style={styles.showExampleBtn}
                            >
                                {showExample ? '예시 숨기기' : '📖 모범 답안 보기'}
                            </button>

                            {showExample && (
                                <div style={styles.exampleBox}>
                                    <div style={styles.exampleLabel}>모범 답안:</div>
                                    <pre style={styles.examplePre}>
                                        {PROMPT_CHALLENGES[currentChallenge].example}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div style={styles.promptTips}>
                            <h3 style={{ color: '#fbbf24', marginBottom: 10 }}>🔑 좋은 프롬프트의 4원칙</h3>
                            <div style={styles.tipGrid}>
                                {[
                                    { label: 'Role', desc: '역할 부여 ("당신은 전문 편집자입니다")' },
                                    { label: 'Task', desc: '명확한 작업 지시 ("다음 글을 요약하세요")' },
                                    { label: 'Format', desc: '출력 형식 지정 ("3줄 이내, 불릿 포인트로")' },
                                    { label: 'Context', desc: '맥락/제약 조건 ("초등학생이 이해할 수준으로")' },
                                ].map(tip => (
                                    <div key={tip.label} style={styles.tipItem}>
                                        <span style={styles.tipLabel}>{tip.label}</span>
                                        <span style={styles.tipDesc}>{tip.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 한 걸음 더: 프롬프트 엔지니어링 고급 기법 */}
                        <div
                            onClick={() => setShowDeepDive(!showDeepDive)}
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(124, 92, 252, 0.08)',
                                border: '1px solid rgba(124, 92, 252, 0.25)',
                                borderRadius: 14,
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ color: 'rgba(124, 92, 252, 1)', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                                    {showDeepDive ? '▼' : '▶'} 한 걸음 더: 프롬프트 엔지니어링 고급 기법
                                </h3>
                                <span style={{ fontSize: '0.75rem', color: 'rgba(124, 92, 252, 0.7)', fontWeight: 600 }}>
                                    {showDeepDive ? '접기' : '펼치기'}
                                </span>
                            </div>
                            {showDeepDive && (
                                <div style={{ marginTop: 14, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.8 }} onClick={e => e.stopPropagation()}>
                                    <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(124, 92, 252, 0.06)', borderRadius: 8, border: '1px solid rgba(124, 92, 252, 0.12)' }}>
                                        <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>Self-Consistency</strong>
                                        <p style={{ margin: '4px 0 0' }}>같은 질문을 여러 번 풀게 하고 <strong>다수결</strong>로 답을 결정하는 방법. 한 번의 답변보다 훨씬 정확도가 높아집니다.</p>
                                    </div>
                                    <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(124, 92, 252, 0.06)', borderRadius: 8, border: '1px solid rgba(124, 92, 252, 0.12)' }}>
                                        <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>Tree-of-Thought</strong>
                                        <p style={{ margin: '4px 0 0' }}>여러 풀이 경로를 탐색한 후 <strong>최적의 경로를 선택</strong>하는 방법. 복잡한 추론 문제에서 특히 효과적입니다.</p>
                                    </div>
                                    <div style={{ padding: '10px 14px', background: 'rgba(124, 92, 252, 0.06)', borderRadius: 8, border: '1px solid rgba(124, 92, 252, 0.12)' }}>
                                        <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>RAG (Retrieval-Augmented Generation)</strong>
                                        <p style={{ margin: '4px 0 0' }}>외부 문서를 검색해서 답변의 근거로 사용하는 기술. <strong>할루시네이션을 줄이는 핵심 기술</strong>로, AI가 모르는 최신 정보도 정확하게 답변할 수 있게 해줍니다.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ═══ 탭 4: 해커톤 팁 ═══ */}
                {activeTab === 'tips' && (
                    <>
                        <div style={styles.hero}>
                            <h2 style={styles.heroTitle}>&quot;나만의 AI 앱을 만들어보세요!&quot;</h2>
                            <p style={styles.heroDesc}>
                                지금까지 배운 토큰화, 확률 모델, 프롬프트 엔지니어링 지식을 총동원하여
                                세상을 놀라게 할 창의적인 프로젝트를 시작할 시간입니다.
                            </p>
                        </div>

                        <div style={styles.twoCol}>
                            <div style={styles.tipCard}>
                                <h3>🛠️ 추천 도구 — 기술 스택(Tech Stack: 프로젝트에 사용하는 기술 조합)</h3>
                                <ul style={styles.list}>
                                    <li><strong>Frontend(화면)</strong>: React (Next.js) + Vercel 배포</li>
                                    <li><strong>Backend(서버)</strong>: Python (FastAPI) or Vercel Serverless<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Serverless = 서버 관리 없이 코드만 올리면 자동 실행되는 방식</span></li>
                                    <li><strong>AI Model</strong>: OpenAI GPT API / Google Gemini API / Claude API<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>API = 다른 서비스의 기능을 내 프로그램에서 사용할 수 있게 해주는 접점</span></li>
                                    <li><strong>Database(데이터 저장)</strong>: Supabase (무료 Firebase 대안)</li>
                                    <li><strong>Coding AI</strong>: Claude Code, Cursor, GitHub Copilot</li>
                                </ul>
                            </div>

                            <div style={styles.tipCard}>
                                <h3>📅 3주 해커톤 타임라인</h3>
                                <ul style={styles.list}>
                                    <li><strong>1주차</strong>: 아이디어 확정 + 기술 스택 선정 + 프로토타입(Prototype: 핵심 기능만 담은 초기 시제품)</li>
                                    <li><strong>2주차</strong>: 핵심 기능 개발 + 프롬프트 튜닝</li>
                                    <li><strong>3주차</strong>: UI 다듬기 + 발표 준비 + 배포</li>
                                </ul>
                            </div>
                        </div>

                        <div style={styles.successCard}>
                            <h3>🚀 해커톤 성공 꿀팁</h3>
                            <div style={styles.tipNumbered}>
                                {[
                                    { num: 1, text: '"완벽한 것보다 완성된 것이 낫다" (Done is better than perfect)' },
                                    { num: 2, text: '거창한 기능보다 핵심 기능 하나에 집중하세요.' },
                                    { num: 3, text: '친구들과 함께라면 더 멀리 갈 수 있습니다. (팀 빌딩 추천!)' },
                                    { num: 4, text: 'AI 코딩 도구를 적극 활용하세요. 바이브 코딩의 핵심!' },
                                    { num: 5, text: '바이브(Vibe)를 잃지 마세요. 즐기면서 코딩하는 것이 가장 중요합니다! 🎵' },
                                ].map(tip => (
                                    <div key={tip.num} style={styles.numberedItem}>
                                        <span style={styles.numCircle}>{tip.num}</span>
                                        <span style={styles.numText}>{tip.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 네비게이션 */}
            <div style={styles.navRow}>
                <button onClick={() => router.push('/week14')} style={styles.navBtn}>← 14주차</button>
                <button onClick={() => router.push('/hub')} style={styles.navBtn}>🚀 허브로</button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        maxWidth: 1100,
        margin: '0 auto',
        minHeight: '100vh',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '1rem',
        marginRight: 20,
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 800,
        background: 'linear-gradient(to right, #ec4899, #f43f5e)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontFamily: 'var(--font-heading)',
    },
    // ── 탭 ──
    tabBar: {
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    tabBtn: {
        padding: '10px 16px',
        background: 'rgba(30, 25, 60, 0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        transition: 'all 0.2s',
    },
    tabBtnActive: {
        background: 'rgba(236, 72, 153, 0.2)',
        border: '1px solid #ec4899',
        color: '#ec4899',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    // ── 히어로 ──
    hero: {
        textAlign: 'center',
        padding: '40px 20px',
        background: 'radial-gradient(circle at center, rgba(236, 72, 153, 0.08) 0%, transparent 70%)',
        borderRadius: 20,
        border: '1px solid rgba(236, 72, 153, 0.15)',
    },
    heroTitle: {
        fontSize: '1.8rem',
        fontWeight: 900,
        color: '#fff',
        marginBottom: 16,
        fontFamily: 'var(--font-heading)',
    },
    heroDesc: {
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        lineHeight: 1.6,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'var(--font-heading)',
    },
    // ── 아이디어 생성기 ──
    generateBtn: {
        padding: '14px 36px',
        background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
        border: 'none',
        borderRadius: 14,
        color: '#fff',
        fontWeight: 700,
        fontSize: '1.1rem',
        cursor: 'pointer',
        transition: 'transform 0.2s',
    },
    ideaCard: {
        background: 'rgba(236, 72, 153, 0.08)',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
    },
    ideaTitle: { color: '#ec4899', fontWeight: 700, marginBottom: 16 },
    ideaGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 16,
    },
    ideaChip: {
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    ideaLabel: { fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 },
    ideaValue: { fontSize: '1rem', color: '#f1f5f9', fontWeight: 700 },
    ideaSummary: {
        fontSize: '1.1rem',
        color: '#fbbf24',
        fontWeight: 600,
        padding: '12px 16px',
        background: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 10,
        lineHeight: 1.6,
    },
    exampleGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10,
    },
    exampleItem: {
        background: 'rgba(30, 25, 60, 0.5)',
        borderRadius: 12,
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        border: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center',
    },
    // ── 복습 체크리스트 ──
    reviewHeader: { textAlign: 'center', marginBottom: 8 },
    reviewProgress: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'center',
        fontSize: '0.85rem',
        color: '#fbbf24',
        fontWeight: 600,
    },
    reviewTrack: {
        width: '60%',
        height: 6,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    reviewFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #ec4899, #10b981)',
        borderRadius: 3,
        transition: 'width 0.3s',
    },
    reviewList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    reviewItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 12,
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    reviewCheck: { fontSize: '1.2rem', flexShrink: 0 },
    reviewContent: { flex: 1 },
    reviewWeek: { color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem', marginBottom: 2 },
    reviewKey: { color: '#94a3b8', fontSize: '0.82rem' },
    completeBox: {
        textAlign: 'center',
        padding: 16,
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 12,
        color: '#10b981',
        fontWeight: 700,
        fontSize: '1rem',
    },
    // ── 프롬프트 실습 ──
    promptHeader: { textAlign: 'center' },
    challengeNav: {
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    challengeBtn: {
        padding: '8px 16px',
        border: '1px solid',
        borderRadius: 8,
        color: '#ec4899',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        background: 'transparent',
    },
    challengeCard: {
        background: 'rgba(15, 10, 40, 0.5)',
        border: '1px solid rgba(236, 72, 153, 0.2)',
        borderRadius: 16,
        padding: 24,
    },
    challengeTask: {
        color: '#f1f5f9',
        fontSize: '1.05rem',
        fontWeight: 600,
        marginBottom: 8,
        lineHeight: 1.5,
    },
    challengeHint: {
        color: '#fbbf24',
        fontSize: '0.85rem',
        marginBottom: 16,
    },
    promptInput: {
        width: '100%',
        padding: '14px 16px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        color: '#f1f5f9',
        fontSize: '0.9rem',
        fontFamily: 'monospace',
        resize: 'vertical',
        outline: 'none',
        marginBottom: 12,
    },
    showExampleBtn: {
        padding: '10px 20px',
        background: 'rgba(236, 72, 153, 0.15)',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        borderRadius: 8,
        color: '#ec4899',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
    },
    exampleBox: {
        marginTop: 12,
        padding: 16,
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: 10,
    },
    exampleLabel: { color: '#10b981', fontWeight: 700, marginBottom: 8, fontSize: '0.85rem' },
    examplePre: {
        color: '#cbd5e1',
        fontSize: '0.85rem',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        margin: 0,
    },
    promptTips: {
        background: 'rgba(251, 191, 36, 0.08)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        borderRadius: 14,
        padding: 20,
    },
    tipGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
    },
    tipItem: {
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
    },
    tipLabel: { color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' },
    tipDesc: { color: '#94a3b8', fontSize: '0.8rem' },
    // ── 해커톤 팁 ──
    twoCol: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
    },
    tipCard: {
        background: 'rgba(30, 25, 60, 0.5)',
        padding: 24,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)',
    },
    list: {
        marginTop: 14,
        paddingLeft: 20,
        color: '#94a3b8',
        lineHeight: 2,
    },
    successCard: {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.5))',
        padding: 24,
        borderRadius: 16,
        border: '1px solid rgba(16, 185, 129, 0.2)',
    },
    tipNumbered: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginTop: 12,
    },
    numberedItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
    },
    numCircle: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.85rem',
        flexShrink: 0,
    },
    numText: { color: '#a7f3d0', fontSize: '0.9rem', lineHeight: 1.5 },
    // ── 네비게이션 ──
    navRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 30,
        paddingBottom: 30,
    },
    navBtn: {
        padding: '10px 24px',
        background: 'rgba(30, 25, 60, 0.5)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: 600,
    },
};
