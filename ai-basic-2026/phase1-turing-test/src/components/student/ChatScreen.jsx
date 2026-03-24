import { useState, useRef, useEffect } from 'react'

function formatTime(sec) {
  if (typeof sec !== 'number' || sec < 0) return '-:--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const ANIMATIONS = `
@keyframes wallGlow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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
  0%, 100% { border-color: rgba(99, 102, 241, 0.15); }
  50% { border-color: rgba(99, 102, 241, 0.35); }
}
`

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

  // 응답 카운트다운 타이머
  useEffect(() => {
    if (!awaitingAnswer || !questionSentAt || !roundInfo?.responseDelay) {
      setAnswerCountdown(null)
      return
    }
    const deadline = questionSentAt + roundInfo.responseDelay * 1000
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setAnswerCountdown(left)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [awaitingAnswer, questionSentAt, roundInfo?.responseDelay])

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

  // ─── 공통 헤더 ───
  const header = (
    <div style={{
      padding: '10px 16px',
      background: 'linear-gradient(180deg, #0d1117 0%, #080b12 100%)',
      borderBottom: `1px solid ${role === 'respondent' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}`,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: role === 'judge' ? 'rgba(99, 102, 241, 0.1)' : role === 'respondent' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            border: `1px solid ${role === 'judge' ? 'rgba(99, 102, 241, 0.2)' : role === 'respondent' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem',
          }}>
            {role === 'judge' ? '🔍' : role === 'respondent' ? '🎭' : '👁️'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.01em' }}>
              {role === 'judge' ? '심문관' : role === 'respondent' ? '피심문자' : '관찰자'}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 1 }}>
              {role === 'judge' ? '벽 너머 상대의 정체를 밝히세요'
                : role === 'respondent' ? '자연스럽게 답해서 들키지 마세요'
                : '다른 팀의 심문을 관찰 중'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '3px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            fontSize: '0.6rem', color: '#475569',
          }}>R{roundInfo?.roundNum} · {roundInfo?.style}</div>
          {role === 'judge' && (
            <div style={{
              padding: '3px 8px', borderRadius: 6,
              background: 'rgba(99, 102, 241, 0.08)',
              fontSize: '0.6rem', color: '#818cf8', fontWeight: 600,
            }}>{Math.min(currentTurn, totalTurns)}/{totalTurns}</div>
          )}
          <div style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1.05rem',
            color: isUrgent ? '#ef4444' : '#e2e8f0',
            animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
            textShadow: isUrgent ? '0 0 10px rgba(239,68,68,0.4)' : 'none',
          }}>{formatTime(remaining)}</div>
        </div>
      </div>
    </div>
  )

  // ─── 턴 구분선 ───
  const turnDivider = (turnNum) => (
    <div style={{
      textAlign: 'center', margin: '14px 0 6px',
      fontSize: '0.58rem', color: '#334155', letterSpacing: '0.08em', fontWeight: 600,
    }}>
      ── 심문 {turnNum} ──
    </div>
  )

  // ─── 미스터리 아바타 (벽 너머) ───
  const mysteryAvatar = (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(99, 102, 241, 0.06)',
      border: '1px solid rgba(99, 102, 241, 0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.7rem', color: '#475569',
      boxShadow: '0 0 8px rgba(99, 102, 241, 0.08)',
    }}>?</div>
  )

  // ─── 심문관 아바타 ───
  const interrogatorAvatar = (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(99, 102, 241, 0.06)',
      border: '1px solid rgba(99, 102, 241, 0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.65rem', color: '#818cf8',
    }}>🔍</div>
  )

  // ─── 타이핑 점 ───
  const typingDots = (
    <div style={{
      padding: '10px 16px', background: '#111827',
      border: '1px solid rgba(99, 102, 241, 0.08)',
      borderRadius: '16px 16px 16px 4px',
      display: 'flex', alignItems: 'center', gap: 4,
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6366f1',
          animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
    </div>
  )

  // ═══════════════════════════════════════════════
  // ── 심판 / 관찰자 UI ──
  // ═══════════════════════════════════════════════
  if (role === 'judge' || role === 'observer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100vh', background: '#080b12' }}>
        <style>{ANIMATIONS}</style>
        {header}

        {/* 카운트다운 프로그레스 바 */}
        {awaitingAnswer && answerCountdown != null && (
          <div style={{ height: 3, background: 'rgba(99, 102, 241, 0.06)' }}>
            <div style={{
              height: '100%',
              background: answerCountdown <= 3 ? '#ef4444' : '#6366f1',
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
          {/* 빈 상태 */}
          {judgeTurns.length === 0 && !awaitingAnswer && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', color: '#475569',
              animation: 'fadeInUp 0.5s ease',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(99, 102, 241, 0.05)',
                border: '2px solid rgba(99, 102, 241, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem',
                animation: 'wallGlow 3s ease-in-out infinite',
                boxShadow: '0 0 40px rgba(99, 102, 241, 0.06)',
              }}>🔒</div>
              <p style={{ fontWeight: 700, marginBottom: 8, color: '#94a3b8', fontSize: '0.95rem' }}>
                {role === 'observer' ? '심문 관찰 대기 중' : '벽 너머에 누군가 있습니다'}
              </p>
              <p style={{ fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto', color: '#475569' }}>
                {role === 'judge'
                  ? '질문을 보내 상대의 정체를 알아내세요. 사람일까, AI일까?'
                  : '다른 팀의 대화가 시작되면 여기에 표시됩니다.'}
              </p>
              {role === 'judge' && (
                <div style={{
                  margin: '16px auto 0', maxWidth: 300, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.08)',
                  fontSize: '0.7rem', color: '#94a3b8', textAlign: 'left', lineHeight: 1.6,
                }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>⚠️ 심문 규칙</span>
                  <br />· 오늘 날씨, 선생님 이름 등 <span style={{ color: '#f87171' }}>AI가 답할 수 없는 사실</span> 금지
                  <br />· 전문 지식 등 <span style={{ color: '#f87171' }}>친구가 답할 수 없는 내용</span>도 금지
                  <br />· 취미, 감정, 경험 등 <span style={{ color: '#f87171' }}>누구나 답할 수 있는 질문</span>을 하세요
                </div>
              )}
            </div>
          )}

          {/* 대화 턴들 */}
          {judgeTurns.map((turn) => (
            <div key={`j-${turn.turnNum}`} style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
              {turnDivider(turn.turnNum)}
              {/* 내 질문 (오른쪽) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#fff', borderRadius: '16px 16px 4px 16px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  boxShadow: '0 2px 12px rgba(79,70,229,0.25)',
                }}>{turn.question}</div>
              </div>
              {/* 벽 너머 답변 (왼쪽) */}
              {turn.styledAnswer ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {mysteryAvatar}
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    background: '#111827', color: '#cbd5e1',
                    borderRadius: '16px 16px 16px 4px',
                    fontSize: '0.85rem', lineHeight: 1.5,
                    border: '1px solid rgba(99, 102, 241, 0.06)',
                  }}>{turn.styledAnswer}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  {mysteryAvatar}
                  {typingDots}
                </div>
              )}
            </div>
          ))}

          {/* 카운트다운 텍스트 */}
          {awaitingAnswer && answerCountdown != null && (
            <div style={{
              textAlign: 'center', padding: '6px', margin: '4px 0',
              fontSize: '0.72rem', color: '#818cf8',
            }}>
              벽 너머에서 응답 중 · <span style={{
                fontWeight: 700,
                color: answerCountdown <= 3 ? '#ef4444' : '#818cf8',
              }}>{answerCountdown}초</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* 질문 입력 */}
        {role === 'judge' && (
          <form onSubmit={handleSendQuestion} style={{
            display: 'flex', gap: 8, padding: '10px 16px 14px',
            background: '#0d1117', borderTop: '1px solid rgba(99, 102, 241, 0.06)',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input type="text" value={message}
                onChange={(e) => { if (e.target.value.length <= 60) setMessage(e.target.value) }}
                placeholder={currentTurn > totalTurns ? '모든 심문 완료' : awaitingAnswer ? '응답 대기 중...' : '벽 너머에 질문을 보내세요...'}
                disabled={awaitingAnswer || currentTurn > totalTurns}
                style={{
                  width: '100%', padding: '10px 40px 10px 14px',
                  background: '#151d2e', border: '1px solid rgba(99, 102, 241, 0.08)',
                  borderRadius: 16, color: '#e2e8f0', outline: 'none',
                  fontSize: '0.85rem', fontFamily: 'inherit',
                }} />
              {message.length > 0 && (
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: '0.6rem', color: message.length >= 55 ? '#f87171' : '#475569',
                }}>{message.length}/60</span>
              )}
            </div>
            <button type="submit"
              disabled={!message.trim() || awaitingAnswer || currentTurn > totalTurns}
              style={{
                width: 44, height: 44, borderRadius: 14, border: 'none',
                background: message.trim() && !awaitingAnswer ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#151d2e',
                color: message.trim() && !awaitingAnswer ? '#fff' : '#334155',
                fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
                boxShadow: message.trim() && !awaitingAnswer ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>↑</button>
          </form>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // ── 응답자 (피심문자) UI ──
  // ═══════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100vh', background: '#080b12' }}>
      <style>{ANIMATIONS}</style>
      {header}

      {/* 채팅 영역 — 전체 대화 맥락 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {/* 빈 상태 */}
        {respondTurns.length === 0 && !incomingQuestion && !previewAnswer && (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: '#475569',
            animation: 'fadeInUp 0.5s ease',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '2px solid rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem',
              animation: 'wallGlow 3s ease-in-out infinite',
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.06)',
            }}>🎭</div>
            <p style={{ fontWeight: 700, marginBottom: 8, color: '#94a3b8', fontSize: '0.95rem' }}>
              심문 대기 중
            </p>
            <p style={{ fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto', color: '#475569' }}>
              상대 팀이 질문을 보내면 여기에 표시됩니다.
              <br />자연스럽게 답변해서 들키지 마세요!
            </p>
          </div>
        )}

        {/* 완료된 턴들 */}
        {respondTurns.map((turn) => (
          <div key={`r-${turn.turnNum}`} style={{ marginBottom: 4 }}>
            {turnDivider(turn.turnNum)}
            {/* 심문관의 질문 (왼쪽) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
              {interrogatorAvatar}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: '#111827', color: '#cbd5e1',
                borderRadius: '16px 16px 16px 4px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: '1px solid rgba(99, 102, 241, 0.06)',
              }}>{turn.question}</div>
            </div>
            {/* 내/AI 답변 (오른쪽) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: 'linear-gradient(135deg, #059669, #047857)',
                color: '#fff', borderRadius: '16px 16px 4px 16px',
                fontSize: '0.85rem', lineHeight: 1.5,
                boxShadow: '0 2px 12px rgba(5,150,105,0.2)',
              }}>{turn.styledAnswer}</div>
            </div>
          </div>
        ))}

        {/* ── 진행 중인 턴: 사람 답변 차례 ── */}
        {incomingQuestion && (
          <div style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
            {turnDivider(incomingQuestion.turnNum)}
            {/* 심문관의 질문 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {interrogatorAvatar}
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: '#111827', color: '#e2e8f0',
                borderRadius: '16px 16px 16px 4px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: '1px solid rgba(99, 102, 241, 0.1)',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.04)',
                animation: 'borderPulse 2s ease-in-out infinite',
              }}>{incomingQuestion.question}</div>
            </div>
            {/* 보낸 답변 미리보기 */}
            {answerSent && sentAnswerText && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(5,150,105,0.5), rgba(4,120,87,0.5))',
                  color: '#d1fae5', borderRadius: '16px 16px 4px 16px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                }}>
                  {sentAnswerText}
                  <div style={{ fontSize: '0.6rem', color: '#6ee7b7', marginTop: 3, textAlign: 'right' }}>
                    ✓ 전송됨 · 말투 변환 중
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 진행 중인 턴: AI 위장 모드 ── */}
        {previewAnswer && (
          <div style={{ marginBottom: 4, animation: 'fadeInUp 0.3s ease' }}>
            {turnDivider(previewAnswer.turnNum)}
            {/* 심문관의 질문 */}
            {previewAnswer.question && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
                {interrogatorAvatar}
                <div style={{
                  maxWidth: '75%', padding: '10px 14px',
                  background: '#111827', color: '#e2e8f0',
                  borderRadius: '16px 16px 16px 4px',
                  fontSize: '0.85rem', lineHeight: 1.5,
                  border: '1px solid rgba(99, 102, 241, 0.1)',
                }}>{previewAnswer.question}</div>
              </div>
            )}
            {/* AI 대리 답변 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.15))',
                color: '#c4b5fd', borderRadius: '16px 16px 4px 16px',
                fontSize: '0.85rem', lineHeight: 1.5,
                border: '1px solid rgba(139, 92, 246, 0.15)',
              }}>
                <div style={{ fontSize: '0.6rem', color: '#a78bfa', marginBottom: 3, fontWeight: 700 }}>🤖 AI 대리 답변</div>
                {previewAnswer.aiAnswer}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── 하단 입력 영역 ── */}
      {previewAnswer ? (
        /* AI 위장 모드 — 타이핑하는 척 */
        <div style={{
          background: '#0d1117', borderTop: '1px solid rgba(139, 92, 246, 0.1)',
          padding: '10px 16px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 8,
              background: 'rgba(139, 92, 246, 0.08)',
              fontSize: '0.65rem', fontWeight: 700, color: '#a78bfa',
            }}>🎭 위장 모드</span>
            <span style={{ fontSize: '0.62rem', color: '#475569' }}>AI가 대신 답변합니다. 들키지 않게!</span>
          </div>
          <input type="text" value={fakeText}
            onChange={(e) => setFakeText(e.target.value)}
            placeholder="타이핑하는 척하세요..."
            style={{
              width: '100%', padding: '10px 14px', background: '#151d2e',
              border: '1px solid rgba(139, 92, 246, 0.08)', borderRadius: 12,
              color: '#64748b', outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
            }} />
        </div>
      ) : incomingQuestion && !answerSent ? (
        /* 사람 턴 — 답변 입력 */
        <form onSubmit={handleSendAnswer} style={{
          display: 'flex', gap: 8, padding: '10px 16px 14px',
          background: '#0d1117', borderTop: '1px solid rgba(16, 185, 129, 0.1)',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input type="text" value={answerDraft}
              onChange={(e) => { if (e.target.value.length <= 60) setAnswerDraft(e.target.value) }}
              placeholder="자연스럽게 답변하세요... (60자 이내)"
              autoFocus
              style={{
                width: '100%', padding: '10px 40px 10px 14px', background: '#151d2e',
                border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 16,
                color: '#e2e8f0', outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
              }} />
            {answerDraft.length > 0 && (
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.6rem', color: answerDraft.length >= 55 ? '#f87171' : '#475569',
              }}>{answerDraft.length}/60</span>
            )}
          </div>
          <button type="submit" disabled={!answerDraft.trim()}
            style={{
              width: 44, height: 44, borderRadius: 14, border: 'none',
              background: answerDraft.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#151d2e',
              color: answerDraft.trim() ? '#fff' : '#334155',
              fontWeight: 700, cursor: 'pointer', fontSize: '1rem',
              boxShadow: answerDraft.trim() ? '0 2px 12px rgba(16,185,129,0.3)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>↑</button>
        </form>
      ) : answerSent ? (
        /* 답변 전송 완료 */
        <div style={{
          padding: '12px 16px', background: '#0d1117',
          borderTop: '1px solid rgba(16, 185, 129, 0.06)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
            ✅ 답변 전송 완료
          </span>
          <span style={{ fontSize: '0.72rem', color: '#475569', marginLeft: 8 }}>
            말투 변환 후 전달됩니다
          </span>
        </div>
      ) : (
        /* 질문 대기 */
        <div style={{
          padding: '14px 16px', background: '#0d1117',
          borderTop: '1px solid rgba(255,255,255,0.03)',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#334155',
                  animation: `dotBounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#475569' }}>
              심문관의 다음 질문을 기다리는 중
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
