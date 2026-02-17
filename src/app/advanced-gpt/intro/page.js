'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
    {
        id: 'overview',
        title: 'MicroGPT 해부학',
        emoji: '🧬',
        subtitle: '전체 구조를 한눈에!',
    },
    {
        id: 'token',
        title: '1. 토크나이저',
        emoji: '🔤',
        subtitle: '텍스트 ↔ 정수 변환',
    },
    {
        id: 'embed',
        title: '2. 임베딩 레이어',
        emoji: '🌌',
        subtitle: '단어를 벡터로 + 위치 정보',
    },
    {
        id: 'attention',
        title: '3. 멀티 헤드 어텐션',
        emoji: '✨',
        subtitle: 'Query, Key, Value의 춤',
    },
    {
        id: 'feedforward',
        title: '4. 피드 포워드',
        emoji: '🧠',
        subtitle: '생각을 정리하는 시간',
    },
    {
        id: 'block',
        title: '5. 트랜스포머 블록',
        emoji: '📦',
        subtitle: '어텐션 + 피드 포워드 + 잔차',
    },
    {
        id: 'gpt',
        title: '6. 전체 모델 (GPT)',
        emoji: '🤖',
        subtitle: '모든 것을 하나로 조립!',
    },
];

const CODE_SNIPPETS = {
    token: `class Tokenizer:
    def __init__(self):
        # 글자별로 고유 번호(ID) 매핑
        self.stoi = { ch:i for i,ch in enumerate(chars) }
        self.itos = { i:ch for i,ch in enumerate(chars) }

    def encode(self, text):
        # 텍스트 → 숫자 리스트
        return [self.stoi[c] for c in text]

    def decode(self, ids):
        # 숫자 리스트 → 텍스트
        return ''.join([self.itos[i] for i in ids])

# 실행 예시:
# encode("Hello") -> [33, 64, 71, 71, 74]`,

    embed: `class Embeddings(nn.Module):
    def __init__(self, vocab_size, n_embd):
        # 1. 토큰 임베딩 (단어의 의미)
        self.token_embedding = nn.Embedding(vocab_size, n_embd)
        # 2. 위치 임베딩 (단어의 순서)
        self.position_embedding = nn.Embedding(block_size, n_embd)

    def forward(self, idx):
        # idx: [Batch, Time] (단어 ID들)
        
        # 각 단어 ID를 벡터로 변환
        tok_emb = self.token_embedding(idx) 
        
        # 위치(0, 1, 2...)정보를 벡터로 변환
        pos_emb = self.position_embedding(torch.arange(T, device=device))
        
        # 두 벡터를 더해서 최종 입력 생성!
        return tok_emb + pos_emb`,

    attention: `class Head(nn.Module):
    def forward(self, x):
        # Q, K, V 생성 (Linear Layer)
        k = self.key(x)   # (B, T, C)
        q = self.query(x) # (B, T, C)
        v = self.value(x) # (B, T, C)

        # 1. 어텐션 스코어 계산 (친밀도)
        # (B, T, C) @ (B, C, T) -> (B, T, T)
        wei = q @ k.transpose(-2, -1) * C**-0.5
        
        # 2. 마스킹 (미래 정보 가리기)
        wei = wei.masked_fill(self.tril == 0, float('-inf'))
        
        # 3. 확률로 변환 (Softmax)
        wei = F.softmax(wei, dim=-1)

        # 4. 가중합 (Value 모으기)
        out = wei @ v 
        return out`,

    feedforward: `class FeedForward(nn.Module):
    def __init__(self, n_embd):
        self.net = nn.Sequential(
            # 차원을 4배로 뻥튀기 (생각의 확장)
            nn.Linear(n_embd, 4 * n_embd),
            
            # 활성화 함수 (ReLU/GELU) -> 비선형성
            nn.ReLU(),
            
            # 다시 원래 차원으로 압축
            nn.Linear(4 * n_embd, n_embd),
            
            # 드롭아웃 (과적합 방지)
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)`,

    block: `class Block(nn.Module):
    def __init__(self, n_embd, n_head):
        # 멀티 헤드 어텐션 (소통)
        self.sa = MultiHeadAttention(n_head, head_size)
        # 피드 포워드 (정리)
        self.ffwd = FeedForward(n_embd)
        # 정규화 (안정성)
        self.ln1 = nn.LayerNorm(n_embd)
        self.ln2 = nn.LayerNorm(n_embd)

    def forward(self, x):
        # 잔차 연결 (Residual Connection)
        # x + ... : 배운 것만 더한다!
        x = x + self.sa(self.ln1(x))
        x = x + self.ffwd(self.ln2(x))
        return x`,

    gpt: `class MicroGPT(nn.Module):
    def __init__(self):
        # 1. 임베딩
        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(vocab_size, n_embd),
            wpe = nn.Embedding(block_size, n_embd),
            # 2. 블록 쌓기 (깊은 신경망)
            h = nn.ModuleList([Block(n_embd, n_head) for _ in range(n_layer)]),
            # 3. 최종 정규화
            ln_f = nn.LayerNorm(n_embd),
        ))
        # 4. 언어 헤드 (다음 단어 예측)
        self.lm_head = nn.Linear(n_embd, vocab_size)

    def forward(self, idx):
        # ... (임베딩 + 블록 통과) ...
        x = self.transformer.ln_f(x)
        logits = self.lm_head(x)
        return logits`,
};

export default function AdvancedGPTPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const step = STEPS[currentStep];

    const nextStep = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    const prevStep = () => { if (currentStep > 0) setCurrentStep((s) => s - 1); };

    const renderContent = () => {
        if (step.id === 'overview') {
            return (
                <div style={ds.overviewContainer}>
                    <div style={{ fontSize: '5rem', marginBottom: 20 }} className="animate-float">🧬</div>
                    <p style={ds.text}>
                        지금까지 배운 <strong style={{ color: '#7c5cfc' }}>임베딩, 어텐션, 정규화</strong>가<br />
                        실제 코드에서는 어떻게 조립될까요?<br /><br />
                        OpenAI의 GPT 시리즈와 동일한 구조인<br />
                        <strong style={{ color: '#10b981' }}>Transformer Decoder</strong>의<br />
                        핵심 코드를 단계별로 살펴봅니다.
                    </p>
                    <div style={ds.diagramBox}>
                        <div style={ds.diagramLayer}>Output (Next Token)</div>
                        <div style={ds.arrow}>↑</div>
                        <div style={{ ...ds.diagramLayer, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}>
                            Softmax Classifier
                        </div>
                        <div style={ds.arrow}>↑</div>
                        <div style={{ ...ds.diagramLayer, height: 100, justifyContent: 'space-between', padding: 10, border: '2px dashed rgba(124, 92, 252, 0.4)' }}>
                            <div style={{ fontSize: '0.8rem', color: '#7c5cfc' }}>x N Blocks</div>
                            <div style={{ ...ds.diagramLayer, height: 30, fontSize: '0.8rem' }}>Feed Forward</div>
                            <div style={{ ...ds.diagramLayer, height: 30, fontSize: '0.8rem' }}>Multi-Head Attention</div>
                        </div>
                        <div style={ds.arrow}>↑</div>
                        <div style={{ ...ds.diagramLayer, background: 'rgba(251, 191, 36, 0.2)', border: '1px solid #fbbf24' }}>
                            Embedding + Positional Enc
                        </div>
                        <div style={ds.arrow}>↑</div>
                        <div style={ds.diagramLayer}>Input (Tokens)</div>
                    </div>
                </div>
            );
        }

        return (
            <div style={ds.codeContainer}>
                <div style={ds.explanationBox}>
                    <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: 12 }}>
                        {step.subtitle}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                        {getExplanation(step.id)}
                    </p>
                </div>
                <div style={ds.codeBox}>
                    <div style={ds.codeHeader}>Python (PyTorch)</div>
                    <pre style={ds.codeBlock}>
                        {CODE_SNIPPETS[step.id]}
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div style={pageStyles.container}>
            <div style={pageStyles.progressBar}>
                {STEPS.map((s, i) => (
                    <div
                        key={s.id}
                        style={{
                            ...pageStyles.progressDot,
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div style={{
                    ...pageStyles.progressFill,
                    width: `${(currentStep / (STEPS.length - 1)) * 100}%`,
                }} />
            </div>

            <div style={pageStyles.header}>
                <span style={pageStyles.weekBadge}>심화 과정</span>
                <div style={{ fontSize: '3rem' }}>{step.emoji}</div>
                <h1 style={pageStyles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
            </div>

            <div style={pageStyles.content}>{renderContent()}</div>

            <div style={pageStyles.navBar}>
                <button
                    className="btn-nova"
                    style={{ ...pageStyles.navBtn, opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>← 이전</span>
                </button>
                <span style={pageStyles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                <button className="btn-nova" style={pageStyles.navBtn} onClick={
                    currentStep < STEPS.length - 1 ? nextStep : () => router.push('/hub')
                }>
                    <span>{currentStep < STEPS.length - 1 ? '다음 →' : '완료 (허브로)'}</span>
                </button>
            </div>
        </div>
    );
}

function getExplanation(id) {
    switch (id) {
        case 'token': return "컴퓨터는 '사과'라는 글자를 모릅니다.\n그래서 미리 만들어둔 사전(Vocab)을 이용해\n모든 글자를 고유한 '번호'로 바꿉니다.\n\n이것이 LLM의 입구이자 출구입니다.";
        case 'embed': return "단어 번호(idx)를 입력받으면,\n해당 단어의 '의미 벡터'를 찾아옵니다.\n\n여기에 '위치 벡터(Position)'를 더해줘야\n'A가 B를 때렸다'와 'B가 A를 때렸다'를 구별할 수 있습니다.";
        case 'attention': return "GPT의 핵심 엔진입니다!\n\n1. Query(질문)와 Key(답변)를 곱해 관련성을 찾고\n2. Softmax로 확률(Attention Score)을 만든 뒤\n3. Value(정보)를 섞어서 가져옵니다.\n\nmasked_fill은 컨닝 방지(미래 단어 보지 않기)용입니다.";
        case 'feedforward': return "어텐션이 '단어들끼리 대화'하며 정보를 모았다면,\n피드 포워드는 각 단어가 혼자서 '생각을 정리'하는 시간입니다.\n\n차원을 잠시 늘렸다가(4배) 줄이면서,\n정보를 더 복잡하고 풍부하게 가공합니다.";
        case 'block': return "이제 '어텐션'과 '피드 포워드'를 하나의 블록으로 묶습니다.\n\n중요한 점은 '잔차 연결(Residual +)'입니다.\n기존 정보(x)를 잊지 않고, 새로 배운 것만 더해줍니다.\n이 덕분에 깊은 신경망도 학습이 잘 됩니다.";
        case 'gpt': return "마침내 완성입니다!\n\n임베딩 레이어를 지나,\n트랜스포머 블록을 N번 반복(보통 12~96층)하고,\n마지막에 '다음 단어'를 예측하는 헤드를 통과합니다.\n\n이것이 바로 ChatGPT의 실체입니다. 생각보다 간단하죠?";
        default: return "";
    }
}

const pageStyles = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', maxWidth: 680, margin: '0 auto' },
    progressBar: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, position: 'relative', width: '100%', maxWidth: 300, justifyContent: 'center' },
    progressDot: { width: 12, height: 12, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s', zIndex: 1 },
    progressFill: { position: 'absolute', left: 6, top: '50%', height: 3, background: 'var(--accent-nova)', borderRadius: 2, transform: 'translateY(-50%)', transition: 'width 0.3s', zIndex: 0 },
    header: { textAlign: 'center', marginBottom: 24 },
    weekBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255, 255, 255, 0.1)', color: '#fff', marginBottom: 12, letterSpacing: '0.05em' },
    title: { fontSize: '1.6rem', fontWeight: 800, marginTop: 8, marginBottom: 6 },
    content: { flex: 1, width: '100%', marginBottom: 24 },
    navBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 0', borderTop: '1px solid var(--border-subtle)' },
    navBtn: { padding: '10px 24px', fontSize: '0.9rem' },
    stepCount: { fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 },
};

const ds = {
    overviewContainer: { textAlign: 'center', padding: 20 },
    text: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.8 },
    diagramBox: { marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 300, margin: '32px auto 0' },
    diagramLayer: { width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'rgba(15, 10, 40, 0.5)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    arrow: { color: 'var(--text-dim)', fontSize: '1.2rem' },

    codeContainer: {},
    explanationBox: { padding: 20, borderRadius: 12, background: 'rgba(124, 92, 252, 0.1)', border: '1px solid rgba(124, 92, 252, 0.2)', marginBottom: 20 },
    codeBox: { borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-subtle)', background: '#1e1e1e' },
    codeHeader: { padding: '8px 16px', background: '#2d2d2d', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600, borderBottom: '1px solid #333' },
    codeBlock: { margin: 0, padding: 20, overflowX: 'auto', fontFamily: '"Fira Code", monospace', fontSize: '0.85rem', lineHeight: 1.6, color: '#e0e0e0' },
};
