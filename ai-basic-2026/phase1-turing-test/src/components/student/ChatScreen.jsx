import { useState, useRef, useEffect } from 'react'

function formatTime(sec) {
  if (typeof sec !== 'number' || sec < 0) return '-:--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const ANIMATIONS = `
@keyframes rotorSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes signalPulse {
  0%, 100% { opacity: 0.3; box-shadow: 0 0 4px rgba(212,165,116,0.1); }
  50% { opacity: 0.8; box-shadow: 0 0 12px rgba(212,165,116,0.3); }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes borderPulse {
  0%, 100% { border-color: rgba(212,165,116,0.1); }
  50% { border-color: rgba(212,165,116,0.3); }
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`

// ── 영화 "이미테이션 게임" 컬러 팔레트 ──
const C = {
  bg: '#080d08',
  surface: '#0f1a0f',
  card: '#162216',
  input: '#1a2a18',
  amber: '#d4a574',
  amberDim: 'rgba(212,165,116,0.12)',
  amberBorder: 'rgba(212,165,116,0.15)',
  amberGlow: 'rgba(212,165,116,0.08)',
  gold: '#b8860b',
  goldDeep: '#a0750a',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.1)',
  greenBorder: 'rgba(74,222,128,0.15)',
  emerald: '#059669',
  emeraldLight: '#10b981',
  purple: '#8b5cf6',
  purpleDim: 'rgba(139,92,246,0.12)',
  purpleBorder: 'rgba(139,92,246,0.15)',
  text: '#d4d4c8',
  textSec: '#9aaa8a',
  muted: '#5a6b4a',
  mutedLight: '#7a8b6a',
  danger: '#ef4444',
}

export default function ChatScreen({
  team,
  roundInfo,
  remaining,
  judgeTurns,
  respondTurns = [],
  awaitingAnswer,
  questionSentAt,
  incomingQuestion,
  previewAnswer,
  judgeNotice,
  onSendQuestion,
  onSubmitAnswer,
}) {
  const [message, setMessage] = useState('')
  const [answerDraft, setAnswerDraft] = useState('')
  const [fakeText, setFakeText] = useState('')
  const [answerSent, setAnswerSent] = useState(false)
  const [answerCountdown, setAnswerCountdown] = useState(null)
  const [sentAnswerText, setSentAnswerText] = useState('')
  const chatEndRef = useRef(null)

  const role = roundInfo?.role || 'judge'
  const currentTurn = judgeTurns.length + 1
  const totalTurns = roundInfo?.totalTurns || roundInfo?.turns || 0
  const isUrgent = remaining <= 30 && remaining > 0

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [judgeTurns, respondTurns, awaitingAnswer, incomingQuestion, previewAnswer, answerSent])

  useEffect(() => {
    setAnswerDraft('')
    setAnswerSent(false)
    setSentAnswerText('')
  }, [incomingQuestion?.turnNum])

  useEffect(() => {
    setFakeText('')
  }, [previewAnswer?.turnNum])

  useEffect(() => {
    // 역할별 deadline 계산
    // - 심판(judge)/관찰자: questionSentAt 기준으로 계산 (상대 답변 대기 중)
    // - 응답자(respondent): 서버가 내려준 incomingQuestion/previewAnswer의 deadline 사용
    let deadline = null
    if (role === 'respondent') {
      deadline = incomingQuestion?.deadline || previewAnswer?.deadline || null
    } else if (awaitingAnswer && questionSentAt && roundInfo?.responseDelay) {
      deadline = questionSentAt + roundInfo.responseDelay * 1000
    }

    if (!deadline) {
      setAnswerCountdown(null)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setAnswerCountdown(left)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [awaitingAnswer, questionSentAt, roundInfo?.responseDelay, role, incomingQuestion?.deadline, previewAnswer?.deadline])

  function handleSendQuestion(e) {
    e?.preventDefault()
    if (!message.trim() || awaitingAnswer) return
    onSendQuestion(message.trim())
    setMessage('')
  }

  function handleSendAnswer(e) {
    e?.preventDefault()
    if (!answerDraft.trim() || answerSent) return
    const text = answerDraft.trim()
    setSentAnswerText(text)
    setAnswerDraft('')
    onSubmitAnswer(text)
    setAnswerSent(true)
  }

  // ─── 헤더 ───
  const header = (
    <div style={{
      padding: '10px 16px',
      background: `linear-gradient(180deg, ${C.surface} 0%, ${C.bg} 100%)`,
      borderBottom: `1px solid ${role === 'respondent' ? C.greenBorder : C.amberBorder}`,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: C.amberDim,
            border: `1px solid ${C.amberBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem',
          }}>
            {role === 'judge' ? '🔐' : role === 'respondent' ? '📡' : '👓'}
          </div>
          <div>
            <div style={{
              fontSize: '0.7rem', fontWeight: 800, color: C.amber,
              letterSpacing: '0.08em', fontFamily: "'Courier New', monospace",
            }}>
              IMITATION GAME
            </div>
            <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 1 }}>
              {role === 'judge' ? '기계인가, 인간인가? 판별하세요'
                : role === 'respondent' ? '인간처럼 답하세요. 들키면 끝입니다'
                : '다른 팀의 교신을 감청 중'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '3px 8px', borderRadius: 4,
            background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
            fontSize: '0.58rem', color: C.mutedLight,
            fontFamily: "'Courier New', monospace",
          }}>R{roundInfo?.roundNum} · {roundInfo?.style}</div>
          {role === 'judge' && (
            <div style={{
              padding: '3px 8px', borderRadius: 4,
              background: C.amberDim,
              fontSize: '0.6rem', color: C.amber, fontWeight: 700,
              fontFamily: "'Courier New', monospace",
            }}>{Math.min(currentTurn, totalTurns)}/{totalTurns}</div>
          )}
          <div style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1.05rem',
            fontFamily: "'Courier New', monospace",
            color: isUrgent ? C.danger : C.text,
            animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
            textShadow: isUrgent ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
          }}>{formatTime(remaining)}</div>
        </div>
      </div>
    </div>
  )

  // ─── 교신 구분선 ───
  const transmissionDivider = (num) => (
    <div style={{
      textAlign: 'center', margin: '14px 0 6px',
      fontSize: '0.56rem', color: C.muted, letterSpacing: '0.12em', fontWeight: 700,
      fontFamily: "'Courier New', monospace",
    }}>
      ─── TRANSMISSION #{num} ───
    </div>
  )

  // ─── 에니그마 아바타 (미지의 상대) ───
  const enigmaAvatar = (
    <div style={{
      width: 26, height: 26, borderRadius: 4, flexShrink: 0,
      background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.7rem', color: C.muted,
      fontFamily: "'Courier New', monospace", fontWeight: 800,
    }}>?</div>
  )

  // ─── 교신 상대 아바타 ───
  const operatorAvatar = (
    <div style={{
      width: 26, height: 26, borderRadius: 4, flexShrink: 0,
      background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem', color: C.amber,
    }}>🔐</div>
  )

  // ─── 수신 대기 점 ───
  const signalDots = (
    <div style={{
      padding: '10px 16px', background: C.card,
      border: `1px solid ${C.amberBorder}`,
      borderRadius: '4px 12px 12px 4px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: C.amber,
          animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
    </div>
  )

  // ═══════════════════════════════════════════════
  // ── 판별관 (심판) / 관찰자 UI ──
  // ═══════════════════════════════════════════════
  if (role === 'judge' || role === 'observer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100vh', background: C.bg }}>
        <style>{ANIMATIONS}</style>
        {header}

        {/* 카운트다운 바 */}
        {awaitingAnswer && answerCountdown != null && (
          <div style={{ height: 2, background: C.amberGlow }}>
            <div style={{
              height: '100%',
              background: answerCountdown <= 3 ? C.danger : C.amber,
              width: `${((answerCountdown) / (roundInfo?.responseDelay || 15)) * 100}%`,
              transition: 'width 0.3s linear, background 0.3s',
            }} />
          </div>
        )}

        {/* 채팅 영역 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {/* 빈 상태 — 에니그마 컨셉 */}
          {judgeTurns.length === 0 && !awaitingAnswer && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: C.muted,
              animation: 'fadeInUp 0.5s ease',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 12, margin: '0 auto 16px',
                background: C.amberGlow, border: `2px solid ${C.amberBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
                animation: 'signalPulse 3s ease-in-out infinite',
              }}>◉</div>
              <p style={{
                fontWeight: 800, marginBottom: 4, color: C.amber,
                fontSize: '0.65rem', letterSpacing: '0.15em',
                fontFamily: "'Courier New', monospace",
              }}>
                CLASSIFIED
              </p>
              <p style={{ fontWeight: 700, marginBottom: 8, color: C.textSec, fontSize: '0.95rem' }}>
                {role === 'observer' ? '감청 채널 대기 중' : '통신 채널이 열렸습니다'}
              </p>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto', color: C.mutedLight }}>
                {role === 'judge'
                  ? '상대에게 메시지를 보내 정체를 밝히세요. 기계인가, 인간인가?'
                  : '다른 팀의 교신이 시작되면 여기에 표시됩니다.'}
              </p>
              {role === 'judge' && (
                <div style={{
                  margin: '16px auto 0', maxWidth: 300, padding: '10px 14px', borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.04)', border: `1px dashed rgba(239, 68, 68, 0.15)`,
                  fontSize: '0.7rem', color: C.textSec, textAlign: 'left', lineHeight: 1.6,
                }}>
                  <span style={{ color: '#f87171', fontWeight: 700, fontFamily: "'Courier New', monospace", fontSize: '0.65rem' }}>⚠ PROTOCOL</span>
                  <br />· AI가 답할 수 없는 사실 질문 <span style={{ color: '#f87171' }}>금지</span>
                  <br />· 친구가 답할 수 없는 전문 지식 <span style={{ color: '#f87171' }}>금지</span>
                  <br />· 취미, 감정, 경험 등 <span style={{ color: C.green }}>누구나 답할 수 있는 질문</span>
                </div>
              )}
            </div>
          )}

          {/* 교신 내역 */}
          {judgeTurns.map((turn) => (
            <div key={`j-${turn.turnNum}`} style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
              {transmissionDivider(turn.turnNum)}
              {/* 내 메시지 (오른쪽) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`,
                  color: '#fff', borderRadius: '12px 12px 4px 12px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  boxShadow: '0 2px 12px rgba(184,134,11,0.2)',
                }}>{turn.question}</div>
              </div>
              {/* 상대 응답 (왼쪽) */}
              {turn.styledAnswer ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {enigmaAvatar}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    background: C.card, color: C.text,
                    borderRadius: '4px 12px 12px 12px',
                    fontSize: '0.85rem', lineHeight: 1.5,
                    border: `1px solid ${C.amberBorder}`,
                  }}>{turn.styledAnswer}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {enigmaAvatar}
                  {signalDots}
                </div>
              )}
            </div>
          ))}

          {/* 수신 대기 카운트다운 */}
          {awaitingAnswer && answerCountdown != null && (
            <div style={{
              textAlign: 'center', padding: '6px', margin: '4px 0',
              fontSize: '0.7rem', color: C.mutedLight,
              fontFamily: "'Courier New', monospace",
            }}>
              RECEIVING · <span style={{
                fontWeight: 700,
                color: answerCountdown <= 3 ? C.danger : C.amber,
              }}>{answerCountdown}s</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* 메시지 입력 */}
        {role === 'judge' && (
          <form onSubmit={handleSendQuestion} style={{
            display: 'flex', gap: 8, padding: '10px 16px 14px',
            background: C.surface, borderTop: `1px solid ${C.amberBorder}`,
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input type="text" value={message}
                onChange={(e) => { if (e.target.value.length <= 60) setMessage(e.target.value) }}
                placeholder={currentTurn > totalTurns ? '모든 교신 완료' : awaitingAnswer ? '수신 대기 중...' : '메시지를 입력하세요...'}
                disabled={awaitingAnswer || currentTurn > totalTurns}
                style={{
                  width: '100%', padding: '10px 40px 10px 14px',
                  background: C.input, border: `1px solid ${C.amberBorder}`,
                  borderRadius: 8, color: C.text, outline: 'none',
                  fontSize: '0.85rem', fontFamily: 'inherit',
                }} />
              {message.length > 0 && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.6rem', color: message.length >= 55 ? C.danger : C.muted,
                  fontFamily: "'Courier New', monospace",
                }}>{message.length}/60</span>
              )}
            </div>
            <button type="submit"
              disabled={!message.trim() || awaitingAnswer || currentTurn > totalTurns}
              style={{
                width: 44, height: 44, borderRadius: 8, border: 'none',
                background: message.trim() && !awaitingAnswer ? `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})` : C.input,
                color: message.trim() && !awaitingAnswer ? '#fff' : C.muted,
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                boxShadow: message.trim() && !awaitingAnswer ? '0 2px 12px rgba(184,134,11,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>↑</button>
          </form>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // ── 송신자 (응답자) UI ──
  // ═══════════════════════════════════════════════
  const respondentDeadline = incomingQuestion?.deadline || previewAnswer?.deadline || null
  const showRespondentTimer = respondentDeadline != null && answerCountdown != null
  const totalDelay = roundInfo?.responseDelay || 15
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100vh', background: C.bg }}>
      <style>{ANIMATIONS}</style>
      {header}

      {/* 응답자용 카운트다운 바 (상단) */}
      {showRespondentTimer && (
        <div style={{ height: 2, background: C.greenDim }}>
          <div style={{
            height: '100%',
            background: answerCountdown <= 3 ? C.danger : C.emeraldLight,
            width: `${Math.min(100, (answerCountdown / totalDelay) * 100)}%`,
            transition: 'width 0.3s linear, background 0.3s',
          }} />
        </div>
      )}

      {/* 채팅 영역 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {/* 빈 상태 */}
        {respondTurns.length === 0 && !incomingQuestion && !previewAnswer && (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: C.muted,
            animation: 'fadeInUp 0.5s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 12, margin: '0 auto 16px',
              background: C.greenDim, border: `2px solid ${C.greenBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
              animation: 'signalPulse 3s ease-in-out infinite',
            }}>📡</div>
            <p style={{
              fontWeight: 800, marginBottom: 4, color: C.amber,
              fontSize: '0.65rem', letterSpacing: '0.15em',
              fontFamily: "'Courier New', monospace",
            }}>
              STANDBY
            </p>
            <p style={{ fontWeight: 700, marginBottom: 8, color: C.textSec, fontSize: '0.95rem' }}>
              교신 대기 중
            </p>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto', color: C.mutedLight }}>
              상대 팀이 메시지를 보내면 여기에 표시됩니다.
              <br />인간처럼 자연스럽게 답하세요!
            </p>
          </div>
        )}

        {/* 완료된 교신 */}
        {respondTurns.map((turn) => (
          <div key={`r-${turn.turnNum}`} style={{ marginBottom: 4 }}>
            {transmissionDivider(turn.turnNum)}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
              {operatorAvatar}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: C.card, color: C.text,
                borderRadius: '4px 12px 12px 12px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: `1px solid ${C.amberBorder}`,
              }}>{turn.question}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldLight})`,
                color: '#fff', borderRadius: '12px 12px 4px 12px',
                fontSize: '0.85rem', lineHeight: 1.5,
                boxShadow: '0 2px 12px rgba(5,150,105,0.2)',
              }}>{turn.styledAnswer}</div>
            </div>
          </div>
        ))}

        {/* 진행 중: 사람 턴 */}
        {incomingQuestion && (
          <div style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
            {transmissionDivider(incomingQuestion.turnNum)}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {operatorAvatar}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: C.card, color: C.text,
                borderRadius: '4px 12px 12px 12px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: `1px solid ${C.amberBorder}`,
                animation: 'borderPulse 2s ease-in-out infinite',
              }}>{incomingQuestion.question}</div>
            </div>

            {/* 응답 마감 카운트다운 */}
            {answerCountdown != null && !answerSent && (
              <div style={{
                textAlign: 'center', padding: '6px', margin: '4px 0',
                fontSize: '0.7rem',
                color: answerCountdown <= 3 ? C.danger : C.mutedLight,
                fontFamily: "'Courier New', monospace",
                animation: answerCountdown <= 3 ? 'pulse 1s ease-in-out infinite' : 'none',
              }}>
                ⏱ RESPONSE DEADLINE · <span style={{
                  fontWeight: 700,
                  color: answerCountdown <= 3 ? C.danger : C.green,
                }}>{answerCountdown}s</span>
              </div>
            )}
            {answerSent && sentAnswerText && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  background: `linear-gradient(135deg, rgba(5,150,105,0.5), rgba(4,120,87,0.5))`,
                  color: '#d1fae5', borderRadius: '12px 12px 4px 12px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  border: `1px solid ${C.greenBorder}`,
                }}>
                  {sentAnswerText}
                  <div style={{
                    fontSize: '0.58rem', color: '#6ee7b7', marginTop: 3, textAlign: 'right',
                    fontFamily: "'Courier New', monospace",
                  }}>
                    ✓ SENT · ENCODING...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 진행 중: AI 위장 */}
        {previewAnswer && (
          <div style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
            {transmissionDivider(previewAnswer.turnNum)}
            {previewAnswer.question && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                {operatorAvatar}
                <div style={{
                  maxWidth: '75%', padding: '10px 14px',
                  background: C.card, color: C.text,
                  borderRadius: '4px 12px 12px 12px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  border: `1px solid ${C.amberBorder}`,
                }}>{previewAnswer.question}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: C.purpleDim, color: '#c4b5fd',
                borderRadius: '12px 12px 4px 12px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: `1px solid ${C.purpleBorder}`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 3,
                }}>
                  <span style={{
                    fontSize: '0.58rem', color: '#a78bfa', fontWeight: 700,
                    fontFamily: "'Courier New', monospace",
                  }}>🤖 AUTO-RESPONSE</span>
                  {answerCountdown != null && (
                    <span style={{
                      fontSize: '0.58rem',
                      color: answerCountdown <= 3 ? C.danger : '#a78bfa',
                      fontWeight: 700,
                      fontFamily: "'Courier New', monospace",
                    }}>⏱ {answerCountdown}s</span>
                  )}
                </div>
                {previewAnswer.aiAnswer}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── 하단 입력 ── */}
      {previewAnswer ? (
        <div style={{
          background: C.surface, borderTop: `1px solid ${C.purpleBorder}`,
          padding: '10px 16px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: C.purpleDim, border: `1px solid ${C.purpleBorder}`,
              fontSize: '0.6rem', fontWeight: 700, color: '#a78bfa',
              fontFamily: "'Courier New', monospace",
            }}>DISGUISE MODE</span>
            <span style={{ fontSize: '0.6rem', color: C.muted }}>기계가 대신 응답합니다</span>
          </div>
          <input type="text" value={fakeText}
            onChange={(e) => setFakeText(e.target.value)}
            placeholder="타이핑하는 척하세요..."
            style={{
              width: '100%', padding: '10px 14px', background: C.input,
              border: `1px solid ${C.purpleBorder}`, borderRadius: 8,
              color: C.muted, outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
            }} />
        </div>
      ) : incomingQuestion && !answerSent ? (
        <form onSubmit={handleSendAnswer} style={{
          display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px 14px',
          background: C.surface, borderTop: `1px solid ${C.greenBorder}`,
        }}>
          {answerCountdown != null && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '0.62rem', fontFamily: "'Courier New', monospace",
              color: answerCountdown <= 3 ? C.danger : C.mutedLight,
            }}>
              <span>⏱ 답변 제한 시간</span>
              <span style={{
                fontWeight: 700,
                color: answerCountdown <= 3 ? C.danger : C.green,
                animation: answerCountdown <= 3 ? 'pulse 1s ease-in-out infinite' : 'none',
              }}>{answerCountdown}s</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input type="text" value={answerDraft}
              onChange={(e) => { if (e.target.value.length <= 60) setAnswerDraft(e.target.value) }}
              placeholder="자연스럽게 답변하세요... (60자 이내)"
              autoFocus
              style={{
                width: '100%', padding: '10px 40px 10px 14px', background: C.input,
                border: `1px solid ${C.greenBorder}`, borderRadius: 8,
                color: C.text, outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
              }} />
            {answerDraft.length > 0 && (
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.6rem', color: answerDraft.length >= 55 ? C.danger : C.muted,
                fontFamily: "'Courier New', monospace",
              }}>{answerDraft.length}/60</span>
            )}
          </div>
          <button type="submit" disabled={!answerDraft.trim()}
            style={{
              width: 44, height: 44, borderRadius: 8, border: 'none',
              background: answerDraft.trim() ? `linear-gradient(135deg, ${C.emeraldLight}, ${C.emerald})` : C.input,
              color: answerDraft.trim() ? '#fff' : C.muted,
              fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
              boxShadow: answerDraft.trim() ? '0 2px 12px rgba(16,185,129,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>↑</button>
          </div>
        </form>
      ) : answerSent ? (
        <div style={{
          padding: '12px 16px', background: C.surface,
          borderTop: `1px solid ${C.greenBorder}`,
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: '0.72rem', color: C.green, fontWeight: 700,
            fontFamily: "'Courier New', monospace",
          }}>
            ✓ TRANSMITTED
          </span>
          <span style={{ fontSize: '0.7rem', color: C.muted, marginLeft: 8 }}>
            말투 인코딩 후 전달됩니다
          </span>
        </div>
      ) : (
        <div style={{
          padding: '14px 16px', background: C.surface,
          borderTop: `1px solid rgba(255,255,255,0.03)`,
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: C.muted,
                  animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
            </span>
            <span style={{
              fontSize: '0.72rem', color: C.muted,
              fontFamily: "'Courier New', monospace",
            }}>
              AWAITING TRANSMISSION...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
