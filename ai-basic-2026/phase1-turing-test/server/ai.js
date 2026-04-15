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

// ── Anthropic 클라이언트 초기화 (API 키별 캐싱) ──────────────────────────
const anthropicClients = new Map()
function getAnthropic(apiKey) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY 없음')
  if (!anthropicClients.has(key)) {
    anthropicClients.set(key, new Anthropic({ apiKey: key }))
  }
  return anthropicClients.get(key)
}

// ── 말투 변환 (항상 Claude Haiku) ────────────────────────────────────────
/**
 * @param {string} text - 원본 텍스트
 * @param {string} style - 말투 이름 (자연스러운대화, 임함체, 사극체, AI체)
 * @returns {Promise<string>} 변환된 텍스트
 */
export async function styleTransform(text, style, apiKeys = {}) {
  const styleInfo = STYLE_PROMPTS[style]
  if (!styleInfo) return text

  // 입력 글자수 기준 max_tokens 산정 (짧은 입력 → 적은 토큰)
  const inputLen = text.length
  const maxTokens = Math.min(120, Math.max(30, Math.ceil(inputLen * 2.5)))

  try {
    const client = getAnthropic(apiKeys.anthropic)
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: `말투만 바꿔줘. 아래 규칙을 반드시 지켜.

규칙:
1. 원본의 의미와 길이를 최대한 유지해. 원본이 짧으면 결과도 짧아야 해.
2. 내용을 추가하거나 늘리지 마. 설명, 해석, 코멘트 절대 금지.
3. "답변이 짧다", "이해를 못했다" 같은 메타 코멘트 절대 금지.
4. 변환된 텍스트만 출력해. 따옴표로 감싸지 마.

말투: ${styleInfo.description}
${styleInfo.instruction}

원본: ${text}`,
        },
      ],
    })
    let result = message.content[0]?.text?.trim() || text
    // LLM이 따옴표로 감싸는 경우 제거 (사람/AI 판별 단서 방지)
    if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
      result = result.slice(1, -1)
    }
    // 안전장치: 변환 결과가 원본 대비 지나치게 길면 원본 그대로 반환
    // (잘라내면 메타 코멘트 조각이 남을 수 있으므로 원본 fallback)
    const maxLen = inputLen <= 5 ? Math.max(inputLen * 5, 20) : Math.max(inputLen * 3, 30)
    if (result.length > maxLen) {
      console.warn(`[AI] 말투 변환 길이 초과 (${inputLen}→${result.length}, 한도 ${maxLen}), 원본 반환`)
      return text
    }
    return result
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
export async function generateAIResponse(question, style, model = 'claude', apiKeys = {}) {
  const systemPrompt = buildSystemPrompt(style)

  let rawAnswer
  try {
    switch (model) {
      case 'gpt':
        rawAnswer = await generateWithGPT(question, systemPrompt, apiKeys.openai)
        break
      case 'gemini':
        rawAnswer = await generateWithGemini(question, systemPrompt, apiKeys.google)
        break
      case 'solar':
        rawAnswer = await generateWithSolar(question, systemPrompt, apiKeys.upstage)
        break
      case 'claude':
      default:
        rawAnswer = await generateWithClaude(question, systemPrompt, apiKeys.anthropic)
        break
    }
  } catch (err) {
    console.error(`[AI] ${model} 응답 생성 실패:`, err.message)
    rawAnswer = null
  }

  // AI 응답 실패 시 기본 문구 (말투 적용)
  if (!rawAnswer) {
    return styleTransform('음... 잘 모르겠어', style, apiKeys)
  }

  return rawAnswer
}

// ── 시스템 프롬프트 빌더 ──────────────────────────────────────────────────
function buildSystemPrompt(style) {
  const styleInfo = STYLE_PROMPTS[style]
  const styleDesc = styleInfo ? styleInfo.description : style
  const styleInstr = styleInfo ? styleInfo.instruction : ''
  const noEmoji = style !== 'AI체'
  return `너는 튜링 테스트에 참여 중인 대화 상대야. 고등학생과 자연스럽게 대화하는 것처럼 답변해줘.

중요한 규칙:
1. 답변은 ${styleDesc}로 작성해. ${styleInstr}
2. 반드시 1문장, 최대 2문장으로만 답변해. 50자 이내로 짧게.
3. 너무 완벽하거나 형식적이지 않게, 실제 학생처럼.
4. 질문에만 답하고, 설명이나 추가 질문은 하지 마.
${noEmoji ? '5. 이모지(😊🎉 등)를 절대 사용하지 마. 텍스트만.' : '5. 이모지를 자연스럽게 사용해.'}`
}

// ── Claude (Anthropic SDK) ────────────────────────────────────────────────
async function generateWithClaude(question, systemPrompt, apiKey) {
  const client = getAnthropic(apiKey)
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 80,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }],
  })
  return message.content[0]?.text?.trim() || null
}

// ── GPT (OpenAI, fetch 직접 호출) ────────────────────────────────────────
async function generateWithGPT(question, systemPrompt, providedKey) {
  const apiKey = providedKey || process.env.OPENAI_API_KEY
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
async function generateWithGemini(question, systemPrompt, providedKey) {
  const apiKey = providedKey || process.env.GOOGLE_API_KEY
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
async function generateWithSolar(question, systemPrompt, providedKey) {
  const apiKey = providedKey || process.env.UPSTAGE_API_KEY
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
export async function generateAIResponseWithTimeout(question, style, model, timeoutMs = 25000, apiKeys = {}) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI 응답 타임아웃')), timeoutMs)
  )
  try {
    return await Promise.race([generateAIResponse(question, style, model, apiKeys), timeoutPromise])
  } catch (err) {
    console.warn(`[AI] 타임아웃/오류 (${model}):`, err.message)
    // 기본 문구 반환
    return styleTransform('음... 잘 모르겠어', style, apiKeys)
  }
}

export { STYLE_PROMPTS }
