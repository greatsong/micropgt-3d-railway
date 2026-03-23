/**
 * AI 모듈 — 말투 변환 + AI 응답 생성
 *
 * - 말투 변환: 항상 Claude Haiku (빠른 속도)
 * - AI 응답 생성: 교사가 선택한 모델 (claude / gpt / gemini / solar)
 */

import Anthropic from '@anthropic-ai/sdk'

// ── 말투 정의 ──────────────────────────────────────────────────────────────
const STYLE_PROMPTS = {
  자연스러운대화: {
    description: '자연스러운 대화',
    instruction: '고등학생끼리 편하게 대화하듯 자연스럽게 변환해줘. 반말이되 거칠지 않게, "~해", "~야", "~지", "~거든" 등 일상 구어체. 예: "치킨이 제일 맛있지 않아?"',
  },
  '임함체': {
    description: '-임/-함 체',
    instruction: '문장을 "-임", "-함", "-됨", "-있음" 등 명사형 종결어미로 끝내는 말투로 변환해줘. 짧고 건조하게. 예: "치킨 좋아함", "오늘 날씨 괜찮음", "그거 재밌었음"',
  },
  사극체: {
    description: '사극 말투',
    instruction: '조선시대 사극 드라마 인물처럼 말하는 투로 변환해줘. "~하옵니다", "~이로소이다", "~하였느니라", "~인 것이옵니다" 등을 사용. 예: "치킨이란 음식이 참으로 맛이 좋사옵니다"',
  },
  AI체: {
    description: 'AI체 (이모지 포함)',
    instruction: 'AI 챗봇처럼 정중하고 체계적이며 이모지를 적극 사용하는 말투로 변환해줘. "~입니다!", "~이에요! ✨", "~하는 것 같아요! 😊" 등을 사용하고, 문장 사이에 이모지를 자연스럽게 넣어줘. 예: "치킨은 정말 맛있는 음식이에요! 🍗✨ 저도 좋아합니다! 😊"',
  },
}

// ── Anthropic 클라이언트 초기화 (지연) ──────────────────────────────────
let anthropicClient = null
function getAnthropic() {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropicClient
}

// ── 말투 변환 (항상 Claude Haiku) ────────────────────────────────────────
/**
 * @param {string} text - 원본 텍스트
 * @param {string} style - 말투 이름 (급식체, 고양이체, ...)
 * @returns {Promise<string>} 변환된 텍스트
 */
export async function styleTransform(text, style) {
  const styleInfo = STYLE_PROMPTS[style]
  if (!styleInfo) return text

  try {
    const client = getAnthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `다음 텍스트를 ${styleInfo.description}로 변환해줘. 내용은 바꾸지 말고 말투만 바꿔줘. 변환된 텍스트만 출력해 (설명 없이).\n\n${styleInfo.instruction}\n\n원본: "${text}"`,
        },
      ],
    })
    return message.content[0]?.text?.trim() || text
  } catch (err) {
    console.error('[AI] 말투 변환 실패:', err.message)
    return text
  }
}

// ── AI 응답 생성 ──────────────────────────────────────────────────────────
/**
 * @param {string} question - 심판의 질문
 * @param {string} style - 말투 이름
 * @param {string} model - AI 모델 (claude / gpt / gemini / solar)
 * @returns {Promise<string>} 말투가 적용된 AI 답변
 */
export async function generateAIResponse(question, style, model = 'claude') {
  const systemPrompt = buildSystemPrompt(style)

  let rawAnswer
  try {
    switch (model) {
      case 'gpt':
        rawAnswer = await generateWithGPT(question, systemPrompt)
        break
      case 'gemini':
        rawAnswer = await generateWithGemini(question, systemPrompt)
        break
      case 'solar':
        rawAnswer = await generateWithSolar(question, systemPrompt)
        break
      case 'claude':
      default:
        rawAnswer = await generateWithClaude(question, systemPrompt)
        break
    }
  } catch (err) {
    console.error(`[AI] ${model} 응답 생성 실패:`, err.message)
    rawAnswer = null
  }

  // AI 응답 실패 시 기본 문구 (말투 적용)
  if (!rawAnswer) {
    return styleTransform('음... 잘 모르겠어', style)
  }

  return rawAnswer
}

// ── 시스템 프롬프트 빌더 ──────────────────────────────────────────────────
function buildSystemPrompt(style) {
  const styleInfo = STYLE_PROMPTS[style]
  const styleDesc = styleInfo ? styleInfo.description : style
  const styleInstr = styleInfo ? styleInfo.instruction : ''
  return `너는 튜링 테스트에 참여 중인 대화 상대야. 고등학생과 자연스럽게 대화하는 것처럼 답변해줘.

중요한 규칙:
1. 답변은 ${styleDesc}로 작성해. ${styleInstr}
2. 짧고 자연스럽게 답변해 (1~3문장).
3. 너무 완벽하거나 형식적이지 않게, 실제 학생처럼.
4. 질문에만 답하고, 설명이나 추가 질문은 하지 마.`
}

// ── Claude (Anthropic SDK) ────────────────────────────────────────────────
async function generateWithClaude(question, systemPrompt) {
  const client = getAnthropic()
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  })
  return message.content[0]?.text?.trim() || null
}

// ── GPT (OpenAI, fetch 직접 호출) ────────────────────────────────────────
async function generateWithGPT(question, systemPrompt) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY 없음')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`GPT API 오류: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

// ── Gemini (Google, fetch 직접 호출) ─────────────────────────────────────
async function generateWithGemini(question, systemPrompt) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY 없음')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 200 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API 오류: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
}

// ── Solar Pro 3 (Upstage, fetch 직접 호출) ───────────────────────────────
async function generateWithSolar(question, systemPrompt) {
  const apiKey = process.env.UPSTAGE_API_KEY
  if (!apiKey) throw new Error('UPSTAGE_API_KEY 없음')

  const response = await fetch('https://api.upstage.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'solar-pro3',
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Solar API 오류: ${response.status} ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

// ── 타임아웃 래퍼 ─────────────────────────────────────────────────────────
/**
 * AI 응답 생성에 타임아웃 적용
 * @param {string} question
 * @param {string} style
 * @param {string} model
 * @param {number} timeoutMs - 타임아웃 (밀리초)
 */
export async function generateAIResponseWithTimeout(question, style, model, timeoutMs = 25000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI 응답 타임아웃')), timeoutMs)
  )
  try {
    return await Promise.race([generateAIResponse(question, style, model), timeoutPromise])
  } catch (err) {
    console.warn(`[AI] 타임아웃/오류 (${model}):`, err.message)
    // 기본 문구 반환
    return styleTransform('음... 잘 모르겠어', style)
  }
}

export { STYLE_PROMPTS }
