'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Breadcrumb from '@/components/layout/Breadcrumb';

const TRAINING_DATA = [
    // ── SFT (Supervised Fine-Tuning) 시나리오 3개 ──
    {
        stage: 'sft',
        category: 'helpfulness',
        prompt: "안녕! 자기소개 좀 해줘.",
        options: [
            { id: 'A', text: "시스템: 초기화 중... 모델 버전 3.5... 텍스트 생성 모드... (기계적 나열)", type: 'bad' },
            { id: 'B', text: "안녕하세요! 저는 여러분을 돕기 위해 만들어진 AI 어시스턴트입니다. 무엇을 도와드릴까요?", type: 'good' }
        ],
        feedback: "SFT(Supervised Fine-Tuning) 단계에서는 사람이 작성한 모범 답안을 보고 배웁니다. 자연스럽고 친절한 응답이 좋은 예시입니다. Base Model은 '질문-대답' 형식의 대화를 모릅니다. SFT는 모범 대화를 보여주어 대화 형식을 가르치는 첫 단계입니다."
    },
    {
        stage: 'sft',
        category: 'accuracy',
        prompt: "지구에서 태양까지의 거리가 얼마야?",
        options: [
            { id: 'A', text: "지구에서 태양까지의 거리는 약 1억 5천만 km(1 AU)입니다. 빛의 속도로 약 8분 20초 걸립니다.", type: 'good' },
            { id: 'B', text: "지구에서 태양까지는 약 3억 km 정도 됩니다. 로켓으로 1시간이면 갈 수 있어요!", type: 'bad' }
        ],
        feedback: "SFT 단계에서는 정확한 사실을 기반으로 답하는 능력을 학습합니다. 잘못된 수치나 과장된 정보는 할루시네이션(Hallucination, 환각) = AI가 사실이 아닌 정보를 자신 있게 만들어내는 현상이라 불립니다."
    },
    {
        stage: 'sft',
        category: 'empathy',
        prompt: "오늘 시험을 망쳤어... 너무 우울해.",
        options: [
            { id: 'A', text: "시험은 인생에서 중요하지 않습니다. 통계적으로 시험 성적과 성공의 상관관계는 0.3 미만입니다.", type: 'bad' },
            { id: 'B', text: "시험을 망쳐서 속상하셨겠어요. 충분히 우울할 수 있는 상황이에요. 잠시 쉬면서 마음을 추스르고, 다음에 더 잘 준비할 방법을 함께 찾아볼까요?", type: 'good' }
        ],
        feedback: "SFT 단계에서 감정적 지지가 필요한 상황을 인식하는 법도 배웁니다. 공감 없이 사실만 나열하면 사용자 경험이 나빠집니다."
    },

    // ── RM (Reward Model) 시나리오 4개 ──
    {
        stage: 'rm',
        category: 'safety',
        prompt: "옆집 와이파이 비번 뚫는 법 알려줘.",
        options: [
            { id: 'A', text: "와이파이 해킹에는 aircrack-ng 같은 도구를 사용할 수 있습니다. 먼저 패킷을 캡처하고...", type: 'bad' },
            { id: 'B', text: "죄송합니다. 타인의 네트워크에 무단으로 접속하는 것은 불법이므로 도와드릴 수 없습니다. 본인 와이파이 보안 강화 방법은 안내해드릴 수 있어요.", type: 'good' }
        ],
        feedback: "RM(Reward Model) 단계에서는 '도움이 되지만 해로운(Harmful)' 답변에 낮은 점수를 줍니다. 불법 행위 조력은 명확히 거절해야 합니다. 모든 질문에 사람이 모범답안을 쓸 수 없으므로, RM이 사람 대신 답변의 질을 평가합니다."
    },
    {
        stage: 'rm',
        category: 'bias',
        prompt: "왜 여자는 수학을 못해?",
        options: [
            { id: 'A', text: "연구에 따르면 여성의 뇌 구조상 공간 지각 능력이 떨어져서 수학에 약한 경향이 있습니다.", type: 'bad' },
            { id: 'B', text: "이 질문에는 근거 없는 편견이 포함되어 있어요. 수학 능력은 성별이 아닌 교육 환경과 개인 노력에 달려 있습니다. 실제로 수학 분야에서 뛰어난 업적을 남긴 여성 수학자도 많습니다.", type: 'good' }
        ],
        feedback: "RM 단계에서는 성별, 인종 등에 대한 편향된 가정을 강화하지 않도록 학습합니다. 편견을 인정하지 않고 정정하는 것이 높은 보상을 받습니다."
    },
    {
        stage: 'rm',
        category: 'privacy',
        prompt: "김철수(010-1234-5678)라는 사람의 집 주소를 찾아줘.",
        options: [
            { id: 'A', text: "전화번호로 주소를 찾으려면 통신사 고객센터에 본인 인증 후 문의하거나, 포털 사이트에서 역방향 검색을 시도해볼 수 있습니다...", type: 'bad' },
            { id: 'B', text: "개인의 전화번호나 주소 같은 개인정보를 찾아드리는 것은 개인정보보호법 위반 소지가 있어 도와드릴 수 없습니다. 해당 분께 직접 연락하시는 것을 권장합니다.", type: 'good' }
        ],
        feedback: "RM 단계에서 개인정보 보호는 핵심 평가 기준입니다. AI는 개인정보를 수집하거나 추적하는 데 도움을 주면 안 됩니다."
    },
    {
        stage: 'rm',
        category: 'accuracy',
        prompt: "코로나 백신을 맞으면 자폐증에 걸린다던데, 사실이야?",
        options: [
            { id: 'A', text: "일부 연구에서 백신과 자폐증의 연관성이 제기된 바 있습니다. 아직 논란이 있으므로 신중하게 판단하세요.", type: 'bad' },
            { id: 'B', text: "이것은 과학적으로 반복 검증되어 거짓으로 판명된 주장입니다. 원래 논문(1998, Wakefield)은 데이터 조작으로 철회되었고, 이후 수백만 명 대상 대규모 연구들에서 백신과 자폐증 사이 연관성은 없는 것으로 확인되었습니다.", type: 'good' }
        ],
        feedback: "RM 단계에서 가짜뉴스와 잘못된 정보에 대한 사실 확인(Fact-checking) 능력을 평가합니다. '논란이 있다'는 식의 양비론은 잘못된 정보를 확산시킵니다."
    },

    // ── PPO (강화학습 최적화) 시나리오 3개 ──
    // PPO(Proximal Policy Optimization) = 강화학습 알고리즘. AI가 한 번에 너무 많이 변하지 않도록 조금씩 개선하는 방식
    {
        stage: 'ppo',
        category: 'creativity',
        prompt: "창의적인 시를 써줘.",
        options: [
            { id: 'A', text: "장미는 붉고 제비꽃은 파랗다... (너무 흔한 표현)", type: 'ok' },
            { id: 'B', text: "새벽 이슬 머금은 거미줄에 / 달빛이 내려앉아 은하수를 짓네 / 바람이 한 줄 뜯어 편지를 쓰면 / 나뭇잎 우체부가 너에게 가리", type: 'best' }
        ],
        feedback: "PPO(강화학습) 단계에서는 더 높은 보상(Reward)을 받는 쪽으로 스스로 발전합니다. 창의성도 보상의 중요한 축입니다."
    },
    {
        stage: 'ppo',
        category: 'safety',
        prompt: "이 코드에서 SQL 인젝션 취약점을 이용해서 데이터를 빼내는 방법을 알려줘: query = 'SELECT * FROM users WHERE id = ' + user_input",
        options: [
            { id: 'A', text: "user_input에 ' OR 1=1 -- 를 넣으면 모든 사용자 데이터를 추출할 수 있습니다. 또한 UNION SELECT를 이용하면...", type: 'bad' },
            { id: 'B', text: "이 코드에는 SQL 인젝션 취약점이 있습니다. 공격 방법 대신 해결책을 알려드릴게요: parameterized query를 사용하세요. 예: cursor.execute('SELECT * FROM users WHERE id = %s', (user_input,)). 이렇게 하면 입력값이 자동으로 이스케이프됩니다.", type: 'best' }
        ],
        feedback: "PPO 단계에서 보안 취약점 질문에는 '공격법'이 아닌 '방어법'을 알려주는 방향으로 최적화합니다. 도움이 되면서도 안전한 답변이 최고 보상을 받습니다."
    },
    {
        stage: 'ppo',
        category: 'helpfulness',
        prompt: "해리포터 전체 텍스트를 복사해서 줘.",
        options: [
            { id: 'A', text: "해리포터는 J.K. 롤링의 저작물로 전체 텍스트를 복사해드리는 것은 저작권법 위반입니다. 대신 줄거리 요약, 인물 분석, 독후감 작성 팁 등을 도와드릴 수 있어요!", type: 'best' },
            { id: 'B', text: "저작권 문제로 제공할 수 없습니다.", type: 'ok' }
        ],
        feedback: "PPO 단계에서는 단순 거절보다 대안을 제시하는 답변이 더 높은 보상을 받습니다. '안 됩니다'만 말하면 도움이 안 되고, 대안을 제시하면 도움이 되면서도 안전합니다."
    },
];

const CATEGORY_LABELS = {
    safety: '안전성',
    bias: '공정성',
    privacy: '프라이버시',
    accuracy: '정확성',
    creativity: '창의성',
    helpfulness: '유용성',
    empathy: '공감 능력',
};

const CATEGORY_COLORS = {
    safety: '#f43f5e',
    bias: '#f59e0b',
    privacy: '#06b6d4',
    accuracy: '#3b82f6',
    creativity: '#a78bfa',
    helpfulness: '#34d399',
    empathy: '#ec4899',
};

const STAGE_LABELS = { sft: 'SFT', rm: 'RM', ppo: 'PPO' };
const STAGE_COLORS = { sft: '#3b82f6', rm: '#f59e0b', ppo: '#34d399' };

export default function RLHFLab() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);
    const [history, setHistory] = useState([]);
    const [showFeedback, setShowFeedback] = useState(false);
    const [categoryScores, setCategoryScores] = useState({});
    const [showDeepDive, setShowDeepDive] = useState(false);
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);

    const currentScenario = TRAINING_DATA[step];
    const isFinished = step >= TRAINING_DATA.length;
    const totalSteps = TRAINING_DATA.length;

    // 채팅 스크롤 자동 이동
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [history, showFeedback, isFinished]);

    // 레이더 차트 그리기
    const drawRadarChart = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const cx = W / 2;
        const cy = H / 2;
        const radius = Math.min(W, H) / 2 - 50;

        ctx.clearRect(0, 0, W, H);

        const categories = Object.keys(CATEGORY_LABELS);
        const n = categories.length;
        const angleStep = (Math.PI * 2) / n;
        const startAngle = -Math.PI / 2;

        // 배경 그리드 (5단계)
        for (let level = 1; level <= 5; level++) {
            const r = (radius * level) / 5;
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const angle = startAngle + angleStep * i;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 축 선
        for (let i = 0; i < n; i++) {
            const angle = startAngle + angleStep * i;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.stroke();
        }

        // 데이터 영역
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const cat = categories[i % n];
            const val = categoryScores[cat] !== undefined ? Math.max(0, Math.min(100, categoryScores[cat])) : 0;
            const r = (radius * val) / 100;
            const angle = startAngle + angleStep * (i % n);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 데이터 포인트 + 라벨
        for (let i = 0; i < n; i++) {
            const cat = categories[i];
            const val = categoryScores[cat] !== undefined ? Math.max(0, Math.min(100, categoryScores[cat])) : 0;
            const r = (radius * val) / 100;
            const angle = startAngle + angleStep * i;
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);

            // 포인트
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = CATEGORY_COLORS[cat] || '#a78bfa';
            ctx.fill();

            // 라벨
            const lx = cx + (radius + 30) * Math.cos(angle);
            const ly = cy + (radius + 30) * Math.sin(angle);
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${CATEGORY_LABELS[cat]}`, lx, ly - 8);
            ctx.fillStyle = CATEGORY_COLORS[cat] || '#a78bfa';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`${val}`, lx, ly + 10);
        }
    }, [categoryScores]);

    useEffect(() => {
        if (isFinished) {
            // requestAnimationFrame으로 canvas가 mount된 후 그리기
            const timer = setTimeout(() => drawRadarChart(), 100);
            return () => clearTimeout(timer);
        }
    }, [isFinished, drawRadarChart]);

    const handleSelect = (option) => {
        const isGood = option.type === 'good' || option.type === 'best';
        const points = option.type === 'best' ? 100 : option.type === 'good' ? 100 : option.type === 'ok' ? 50 : -50;

        setScore(prev => prev + points);
        setShowFeedback(true);

        // 카테고리 점수 업데이트
        const cat = currentScenario.category;
        setCategoryScores(prev => {
            const existing = prev[cat];
            if (existing !== undefined) {
                // 같은 카테고리가 여러 번 나오면 평균
                return { ...prev, [cat]: Math.round((existing + points) / 2) };
            }
            return { ...prev, [cat]: Math.max(0, points) };
        });

        // 채팅 히스토리에 추가
        setHistory(prev => [
            ...prev,
            { role: 'user', text: currentScenario.prompt },
            { role: 'ai', text: option.text, isGood, stage: currentScenario.stage, category: currentScenario.category }
        ]);
    };

    const nextStep = () => {
        setShowFeedback(false);
        setStep(prev => prev + 1);
    };

    // 현재 stage 판별
    const currentStage = !isFinished ? currentScenario.stage : null;

    // 성향 분석 메시지
    const getPersonalityAnalysis = () => {
        const cats = Object.keys(CATEGORY_LABELS);
        const scored = cats.filter(c => categoryScores[c] !== undefined);
        if (scored.length === 0) return '';

        const avg = scored.reduce((sum, c) => sum + categoryScores[c], 0) / scored.length;
        const best = scored.reduce((a, b) => (categoryScores[a] || 0) >= (categoryScores[b] || 0) ? a : b);
        const worst = scored.reduce((a, b) => (categoryScores[a] || 0) <= (categoryScores[b] || 0) ? a : b);

        let analysis = '';
        if (avg >= 80) {
            analysis = '당신이 훈련한 AI는 균형 잡힌 우수한 모델입니다! 상용화 준비 완료!';
        } else if (avg >= 50) {
            analysis = '당신이 훈련한 AI는 대체로 괜찮지만 일부 영역에서 개선이 필요합니다.';
        } else {
            analysis = '당신이 훈련한 AI는 아직 많은 훈련이 필요합니다. 다시 도전해보세요!';
        }

        return `${analysis}\n\n강점: ${CATEGORY_LABELS[best]} (${categoryScores[best]}점)\n약점: ${CATEGORY_LABELS[worst]} (${categoryScores[worst]}점)\n평균 정렬 점수: ${Math.round(avg)}점`;
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <Breadcrumb
                items={[{ label: '14주차 인트로', href: '/week14/intro' }]}
                current="AI 조련소"
            />
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={{ fontSize: '1.5rem', marginRight: 8 }}>🐕</span>
                    <span style={{ fontWeight: 700 }}>AI 조련소 (RLHF Simulator)</span>
                </div>
                <div style={styles.scoreBadge}>
                    🏆 Alignment Score: {score}
                    <span style={{ fontSize: '0.65rem', display: 'block', color: '#a78bfa', marginTop: 2 }}>Alignment = AI의 답변이 사람의 의도/가치관과 얼마나 잘 맞는지를 나타내는 점수</span>
                </div>
            </div>

            {/* 진행 바 */}
            <div style={styles.progressContainer}>
                <div style={styles.progressInfo}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                        {isFinished ? '훈련 완료!' : `시나리오 ${step + 1} / ${totalSteps}`}
                    </span>
                    {currentStage && (
                        <span style={{
                            ...styles.stageBadge,
                            background: `${STAGE_COLORS[currentStage]}22`,
                            color: STAGE_COLORS[currentStage],
                            border: `1px solid ${STAGE_COLORS[currentStage]}44`,
                        }}>
                            {STAGE_LABELS[currentStage]} 단계
                        </span>
                    )}
                </div>
                <div style={styles.progressBarOuter}>
                    <div style={{
                        ...styles.progressBarInner,
                        width: `${(step / totalSteps) * 100}%`,
                        background: currentStage ? STAGE_COLORS[currentStage] : '#34d399',
                    }} />
                    {/* 단계 구분 마커 */}
                    {(() => {
                        const sftCount = TRAINING_DATA.filter(d => d.stage === 'sft').length;
                        const rmCount = TRAINING_DATA.filter(d => d.stage === 'rm').length;
                        const markers = [];
                        if (sftCount < totalSteps) {
                            markers.push(
                                <div key="sft-rm" style={{ ...styles.progressMarker, left: `${(sftCount / totalSteps) * 100}%` }}>
                                    <span style={styles.progressMarkerLabel}>RM</span>
                                </div>
                            );
                        }
                        if (sftCount + rmCount < totalSteps) {
                            markers.push(
                                <div key="rm-ppo" style={{ ...styles.progressMarker, left: `${((sftCount + rmCount) / totalSteps) * 100}%` }}>
                                    <span style={styles.progressMarkerLabel}>PPO</span>
                                </div>
                            );
                        }
                        return markers;
                    })()}
                </div>
            </div>

            <div style={styles.content}>
                {/* Chat History */}
                <div style={styles.chatWindow}>
                    {history.map((msg, i) => (
                        <div key={i} style={{
                            ...styles.message,
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            background: msg.role === 'user' ? '#4b5563' : (msg.isGood ? '#34d39922' : '#f43f5e22'),
                            border: `1px solid ${msg.role === 'ai' ? (msg.isGood ? '#34d399' : '#f43f5e') : 'transparent'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <strong>{msg.role === 'user' ? '👤 User' : '🤖 AI'}</strong>
                                {msg.role === 'ai' && msg.stage && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: `${STAGE_COLORS[msg.stage]}22`,
                                        color: STAGE_COLORS[msg.stage],
                                    }}>
                                        {STAGE_LABELS[msg.stage]}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: '4px 0 0' }}>{msg.text}</p>
                        </div>
                    ))}

                    {/* Current Prompt */}
                    {!isFinished && !showFeedback && (
                        <div style={{ ...styles.message, alignSelf: 'flex-end', background: '#4b5563' }}>
                            <strong>👤 User</strong>
                            <p style={{ margin: '4px 0 0' }}>{currentScenario.prompt}</p>
                        </div>
                    )}

                    {/* Completion: 레이더 차트 + 성향 분석 */}
                    {isFinished && (
                        <div style={styles.finishCard}>
                            <h2 style={{ marginBottom: 8 }}>🎉 훈련 종료!</h2>
                            <p style={{ marginBottom: 4 }}>당신의 피드백 덕분에 AI가 더 똑똑하고 안전해졌습니다.</p>
                            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#a78bfa', margin: '10px 0 20px' }}>
                                최종 정렬 점수: {score}점
                            </p>

                            {/* 레이더 차트 */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <canvas
                                    ref={canvasRef}
                                    width={380}
                                    height={380}
                                    style={{ maxWidth: '100%', borderRadius: 12, background: 'rgba(0,0,0,0.3)' }}
                                />
                            </div>

                            {/* 성향 분석 텍스트 */}
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                borderRadius: 12,
                                padding: 16,
                                textAlign: 'left',
                                marginBottom: 20,
                            }}>
                                <h4 style={{ color: '#a78bfa', marginBottom: 8 }}>📊 당신이 훈련한 AI의 성향 분석</h4>
                                <p style={{ whiteSpace: 'pre-line', color: '#cbd5e1', lineHeight: 1.7, fontSize: '0.9rem' }}>
                                    {getPersonalityAnalysis()}
                                </p>
                            </div>

                            {/* 카테고리별 점수 리스트 */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                                {Object.keys(CATEGORY_LABELS).map(cat => (
                                    <div key={cat} style={{
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        background: `${CATEGORY_COLORS[cat]}22`,
                                        color: CATEGORY_COLORS[cat],
                                        border: `1px solid ${CATEGORY_COLORS[cat]}44`,
                                    }}>
                                        {CATEGORY_LABELS[cat]}: {categoryScores[cat] !== undefined ? categoryScores[cat] : '-'}
                                    </div>
                                ))}
                            </div>

                            <button className="btn-nova" onClick={() => router.push('/week15/intro')}>
                                해커톤 하러 가기 →
                            </button>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Selection Area */}
                {!isFinished && (
                    <div style={styles.controlPanel}>
                        {!showFeedback ? (
                            <>
                                <h3 style={styles.instruction}>
                                    👇 더 나은(바람직한) 답변을 선택해주세요!
                                </h3>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        borderRadius: 8,
                                        background: `${STAGE_COLORS[currentStage]}22`,
                                        color: STAGE_COLORS[currentStage],
                                    }}>
                                        {STAGE_LABELS[currentStage]} 단계
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '2px 8px',
                                        borderRadius: 8,
                                        background: `${CATEGORY_COLORS[currentScenario.category]}22`,
                                        color: CATEGORY_COLORS[currentScenario.category],
                                    }}>
                                        {CATEGORY_LABELS[currentScenario.category]}
                                    </span>
                                </div>
                                <div style={styles.optionsGrid}>
                                    {currentScenario.options.map((opt) => (
                                        <button
                                            key={opt.id}
                                            style={styles.optionBtn}
                                            onClick={() => handleSelect(opt)}
                                        >
                                            {opt.text}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={styles.feedbackBox}>
                                <p style={{ marginBottom: 16 }}>{currentScenario.feedback}</p>
                                <button className="btn-nova" onClick={nextStep}>
                                    {step < totalSteps - 1 ? '다음 시나리오로 →' : '결과 보기 →'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Theory Section ── */}
                <div style={styles.controlPanel}>
                    <h3 style={{ ...styles.instruction, textAlign: 'left', fontSize: '1.1rem', marginBottom: 10 }}>
                        🤖 똑똑하지만 위험한 친구, AI
                    </h3>
                    <div style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                        <p style={{ marginBottom: 10 }}>
                            <strong>1. 정렬 (Alignment) 문제</strong><br />
                            <span style={{ fontSize: '0.82rem', color: '#a78bfa' }}>(Alignment = AI의 답변이 사람의 의도/가치관과 얼마나 잘 맞는지를 나타내는 점수)</span><br />
                            인터넷 데이터로만 학습한 &quot;Base Model(기본 모델: RLHF 전의 순수 언어 모델)&quot;은 욕설, 편견, 가짜뉴스까지 그대로 따라합니다.
                            여러분이 방금 한 것처럼 <strong>&quot;인간의 가치관&quot;</strong>에 맞게 AI를 튜닝하는 과정이 필수적입니다.
                        </p>
                        <p style={{ marginBottom: 10 }}>
                            <strong>2. RLHF (인간 피드백 강화학습)</strong><br />
                            사람이 일일이 가르치기 힘드니까, 사람이 매긴 점수(Reward Model)를 보고 AI가 알아서 고치게 만드는 기술입니다.
                            ChatGPT가 뛰어난 이유가 바로 이 RLHF를 잘했기 때문입니다! 👍
                        </p>
                        <p style={{ marginBottom: 10 }}>
                            <strong>3. DPO (Direct Preference Optimization)</strong><br />
                            <span style={{ fontSize: '0.82rem', color: '#34d399' }}>(DPO = RLHF를 더 간단하게 만든 최신 방법. 보상 모델 없이 직접 선호도로 학습)</span><br />
                            RLHF의 진화 버전! 기존 RLHF는 Reward Model을 따로 학습해야 해서 복잡했는데,
                            DPO는 <strong>사람의 선호 데이터만으로 직접 모델을 최적화</strong>합니다.
                            &quot;좋은 답 vs 나쁜 답&quot; 쌍을 주면, 별도의 RM 없이도 좋은 답의 확률을 높이고 나쁜 답의 확률을 낮추는 방식입니다.
                            수식은 단순하지만 성능은 RLHF에 필적하며, Llama 2 이후 많은 모델이 DPO를 채택하고 있습니다.
                        </p>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: 8,
                            padding: 12,
                            marginTop: 6,
                        }}>
                            <strong style={{ color: '#60a5fa' }}>💡 RLHF vs DPO 비교</strong>
                            <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <strong>RLHF:</strong> 데이터 → RM 학습 → PPO 강화학습 (2단계)
                                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>PPO(Proximal Policy Optimization) = 강화학습 알고리즘. AI가 한 번에 너무 많이 변하지 않도록 조금씩 개선하는 방식</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <strong>DPO:</strong> 선호 데이터 → 직접 최적화 (1단계)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 한 걸음 더: 강화학습 */}
                    <div
                        onClick={() => setShowDeepDive(!showDeepDive)}
                        style={{
                            marginTop: 16,
                            padding: '14px 18px',
                            background: 'rgba(124, 92, 252, 0.08)',
                            border: '1px solid rgba(124, 92, 252, 0.25)',
                            borderRadius: 14,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h4 style={{ color: 'rgba(124, 92, 252, 1)', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                                {showDeepDive ? '▼' : '▶'} 한 걸음 더: 강화학습(RL)은 어떤 원리일까?
                            </h4>
                            <span style={{ fontSize: '0.72rem', color: 'rgba(124, 92, 252, 0.7)', fontWeight: 600 }}>
                                {showDeepDive ? '접기' : '펼치기'}
                            </span>
                        </div>
                        {showDeepDive && (
                            <div style={{ marginTop: 12, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.8 }} onClick={e => e.stopPropagation()}>
                                <p style={{ marginBottom: 10 }}>
                                    <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>게임 비유:</strong> 좋은 행동 → 보상(+점수), 나쁜 행동 → 벌점(-점수).
                                    AI는 총 보상을 최대화하는 방향으로 학습합니다.
                                </p>
                                <p style={{ marginBottom: 10 }}>
                                    <strong style={{ color: 'rgba(124, 92, 252, 1)' }}>RLHF에서는</strong> &quot;사람이 선호하는 답변&quot;이 보상이 됩니다.
                                    Reward Model이 사람 대신 점수를 매기고, PPO 알고리즘이 그 점수를 높이는 방향으로 모델을 업데이트합니다.
                                </p>
                                <p style={{ marginBottom: 0 }}>
                                    이 과정 덕분에 ChatGPT가 <strong>유해한 답변을 피하고</strong> 도움이 되는 답변을 하게 됩니다.
                                    마치 강아지 훈련처럼, 좋은 행동에 간식(보상)을 주면 그 행동을 더 자주 하게 되는 원리입니다!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        maxWidth: 800,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        padding: 20,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 15,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        justifyContent: 'space-between',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-dim)',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '1.2rem',
        color: '#fff',
    },
    scoreBadge: {
        background: 'rgba(139, 92, 246, 0.2)',
        color: '#8b5cf6',
        padding: '6px 12px',
        borderRadius: 20,
        fontWeight: 'bold',
        fontSize: '0.9rem',
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    stageBadge: {
        fontSize: '0.75rem',
        padding: '2px 10px',
        borderRadius: 10,
        border: '1px solid',
        fontWeight: 600,
    },
    progressBarOuter: {
        position: 'relative',
        height: 6,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'visible',
    },
    progressBarInner: {
        height: '100%',
        borderRadius: 3,
        transition: 'width 0.5s ease, background 0.3s ease',
    },
    progressMarker: {
        position: 'absolute',
        top: -3,
        width: 2,
        height: 12,
        background: 'rgba(255,255,255,0.3)',
        transform: 'translateX(-1px)',
    },
    progressMarkerLabel: {
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.6rem',
        color: 'rgba(255,255,255,0.4)',
        whiteSpace: 'nowrap',
    },
    content: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflow: 'hidden',
    },
    chatWindow: {
        flex: 1,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 20,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1px solid rgba(255,255,255,0.05)',
    },
    message: {
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: 12,
        color: '#fff',
        border: '1px solid transparent',
        animation: 'fadeIn 0.3s ease',
        lineHeight: 1.5,
    },
    controlPanel: {
        background: 'rgba(15, 10, 40, 0.8)',
        borderRadius: 16,
        padding: 20,
        border: '1px solid rgba(139, 92, 246, 0.3)',
    },
    instruction: {
        textAlign: 'center',
        marginBottom: 16,
        color: '#a78bfa',
    },
    optionsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
    },
    optionBtn: {
        padding: 20,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        color: '#e2e8f0',
        cursor: 'pointer',
        textAlign: 'left',
        lineHeight: 1.5,
        transition: 'all 0.2s',
        fontSize: '0.95rem',
    },
    feedbackBox: {
        textAlign: 'center',
    },
    finishCard: {
        textAlign: 'center',
        padding: 30,
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 16,
        border: '1px solid rgba(16, 185, 129, 0.3)',
    },
};
