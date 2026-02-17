'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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
                <div className={styles.overviewContainer}>
                    <div className={`${styles.emoji} animate-float`}>🧬</div>
                    <p className={styles.text}>
                        지금까지 배운 <strong className={styles.highlightPurple}>임베딩, 어텐션, 정규화</strong>가<br />
                        실제 코드에서는 어떻게 조립될까요?<br /><br />
                        OpenAI의 GPT 시리즈와 동일한 구조인<br />
                        <strong className={styles.highlightGreen}>Transformer Decoder</strong>의<br />
                        핵심 코드를 단계별로 살펴봅니다.
                    </p>
                    <div className={styles.diagramBox}>
                        <div className={styles.diagramLayer}>Output (Next Token)</div>
                        <div className={styles.arrow}>↑</div>
                        <div className={styles.diagramLayerGreen}>
                            Softmax Classifier
                        </div>
                        <div className={styles.arrow}>↑</div>
                        <div className={styles.diagramLayerBlocks}>
                            <div className={styles.blocksLabel}>x N Blocks</div>
                            <div className={styles.diagramLayerSmall}>Feed Forward</div>
                            <div className={styles.diagramLayerSmall}>Multi-Head Attention</div>
                        </div>
                        <div className={styles.arrow}>↑</div>
                        <div className={styles.diagramLayerYellow}>
                            Embedding + Positional Enc
                        </div>
                        <div className={styles.arrow}>↑</div>
                        <div className={styles.diagramLayer}>Input (Tokens)</div>
                    </div>
                </div>
            );
        }

        return (
            <div>
                <div className={styles.explanationBox}>
                    <h3 className={styles.explanationTitle}>
                        {step.subtitle}
                    </h3>
                    <p className={styles.explanationText}>
                        {getExplanation(step.id)}
                    </p>
                </div>
                <div className={styles.codeBox}>
                    <div className={styles.codeHeader}>Python (PyTorch)</div>
                    <pre className={styles.codeBlock}>
                        {CODE_SNIPPETS[step.id]}
                    </pre>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.progressBar}>
                {STEPS.map((s, i) => (
                    <div
                        key={s.id}
                        className={styles.progressDot}
                        style={{
                            background: i <= currentStep ? 'var(--accent-nova)' : 'rgba(124, 92, 252, 0.15)',
                            transform: i === currentStep ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={() => setCurrentStep(i)}
                    />
                ))}
                <div
                    className={styles.progressFill}
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
            </div>

            <div className={styles.header}>
                <span className={styles.weekBadge}>심화 과정</span>
                <div className={styles.stepEmoji}>{step.emoji}</div>
                <h1 className={styles.title}>
                    <span className="text-gradient">{step.title}</span>
                </h1>
            </div>

            <div className={styles.content}>{renderContent()}</div>

            <div className={styles.navBar}>
                <button
                    className="btn-nova"
                    style={{ opacity: currentStep === 0 ? 0.3 : 1 }}
                    onClick={prevStep}
                    disabled={currentStep === 0}
                >
                    <span>← 이전</span>
                </button>
                <span className={styles.stepCount}>{currentStep + 1} / {STEPS.length}</span>
                <button className={`btn-nova ${styles.navBtn}`} onClick={
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
