import { useState, useRef, useEffect } from 'react'

function formatTime(sec) {
  if (typeof sec !== 'number' || sec < 0) return '-:--'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
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
  const chatEndRef = useRef(null)

  const role = roundInfo?.role || 'judge'
  const currentTurn = judgeTurns.length + 1
  const totalTurns = roundInfo?.totalTurns || roundInfo?.turns || 0
  const isUrgent = remaining <= 30 && remaining > 0

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [judgeTurns, respondTurns, awaitingAnswer, incomingQuestion, previewAnswer])

  useEffect(() => {
    setAnswerDraft('')
    setAnswerSent(false)
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
    const id = setInterval(tick, 200)
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
    onSubmitAnswer(answerDraft.trim())
    setAnswerSent(true)
  }

  // ── 공통 상단 바 ──
  const header = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'linear-gradient(180deg, #111827 0%, #0a0e17 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: role === 'judge' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: role === 'judge' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem',
        }}>{role === 'judge' ? '🔍' : '💬'}</div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>
            {role === 'judge' ? '심판 — 사람인지 AI인지 판별하세요'
              : role === 'respondent' ? '응답자 — 질문에 자연스럽게 답하세요'
              : '관찰자 — 대화를 지켜보세요'}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 10px', borderRadius: 12,
          background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 600 }}>R{roundInfo?.roundNum}</span>
          <span style={{ fontSize: '0.55rem', color: '#475569' }}>·</span>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{roundInfo?.style}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {role === 'judge' && <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{Math.min(currentTurn, totalTurns)}/{totalTurns}</div>}
          <div style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1rem',
            color: isUrgent ? '#ef4444' : '#e2e8f0',
            animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
          }}>{formatTime(remaining)}</div>
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════
  // ── 심판 UI ──
  // ═══════════════════════════════════════════════════════
  if (role === 'judge' || role === 'observer') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0e17' }}>
        {header}

        {/* 상태 배너 */}
        {awaitingAnswer && answerCountdown != null && (
          <div style={{
            padding: '8px 16px', background: 'rgba(99, 102, 241, 0.06)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
            fontSize: '0.78rem', color: '#818cf8', textAlign: 'center',
          }}>
            ⏳ 벽 너머의 상대가 답변하는 중... <span style={{ fontWeight: 700 }}>{answerCountdown}초</span>
          </div>
        )}

        {/* 채팅 영역 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {judgeTurns.length === 0 && !awaitingAnswer && (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: 'rgba(99, 102, 241, 0.08)', border: '2px dashed rgba(99, 102, 241, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', animation: 'pulse 3s ease-in-out infinite',
              }}>?</div>
              <p style={{ fontWeight: 600, marginBottom: 6, color: '#94a3b8', fontSize: '0.95rem' }}>
                {role === 'observer' ? '대화를 관찰하세요' : '벽 너머의 상대에게 질문하세요'}
              </p>
              {role === 'judge' && (
                <div style={{
                  margin: '12px auto 0', maxWidth: 300, padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.12)',
                  fontSize: '0.72rem', color: '#94a3b8', textAlign: 'left', lineHeight: 1.6,
                }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>⚠️ 질문 규칙</span>
                  <br />· 오늘 날씨, 선생님 이름 등 <span style={{ color: '#f87171' }}>AI가 알 수 없는 사실</span>을 묻지 마세요
                  <br />· 전문 지식 등 <span style={{ color: '#f87171' }}>친구가 답할 수 없는 내용</span>도 금지
                  <br />· 취미, 감정, 경험 등 누구나 답할 수 있는 질문을 하세요
                </div>
              )}
            </div>
          )}

          {judgeTurns.map((turn) => (
            <div key={`j-${turn.turnNum}`} style={{ marginBottom: 8 }}>
              <div style={{ textAlign: 'center', margin: '10px 0 6px', fontSize: '0.6rem', color: '#475569', letterSpacing: '0.05em' }}>
                ── 턴 {turn.turnNum} ──
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '78%', padding: '10px 14px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                  borderRadius: '18px 18px 4px 18px', fontSize: '0.88rem', lineHeight: 1.5,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                }}>{turn.question}</div>
              </div>
              {turn.styledAnswer && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', color: '#64748b',
                  }}>?</div>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    background: '#1e293b', color: '#e2e8f0',
                    borderRadius: '18px 18px 18px 4px', fontSize: '0.88rem', lineHeight: 1.5,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>{turn.styledAnswer}</div>
                </div>
              )}
            </div>
          ))}

          {awaitingAnswer && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 4 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: '#64748b',
              }}>?</div>
              <div style={{
                padding: '10px 16px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '18px 18px 18px 4px', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ display: 'flex', gap: 3 }}>
                  {[0,1,2].map(i => <span key={i} style={{ width:6,height:6,borderRadius:'50%',background:'#475569',animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  벽 너머에서 답변 중{answerCountdown != null && answerCountdown > 0 && <span style={{ color: '#818cf8', fontWeight: 600, marginLeft: 4 }}>{answerCountdown}초</span>}
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 질문 입력 */}
        {role === 'judge' && (
          <form onSubmit={handleSendQuestion} style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            background: '#111827', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <input type="text" value={message}
              onChange={(e) => { if (e.target.value.length <= 60) setMessage(e.target.value) }}
              placeholder={currentTurn > totalTurns ? '모든 턴 완료' : awaitingAnswer ? '답변 대기 중...' : '벽 너머의 상대에게 질문하세요...'}
              disabled={awaitingAnswer || currentTurn > totalTurns}
              style={{
                flex: 1, padding: '10px 16px', background: '#1e293b',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
                color: '#e2e8f0', outline: 'none', fontSize: '0.88rem', fontFamily: 'inherit',
              }} />
            <button type="submit"
              disabled={!message.trim() || awaitingAnswer || currentTurn > totalTurns}
              style={{
                padding: '10px 18px', borderRadius: 20, border: 'none',
                background: message.trim() && !awaitingAnswer ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#1e293b',
                color: message.trim() && !awaitingAnswer ? '#fff' : '#475569',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                boxShadow: message.trim() && !awaitingAnswer ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
              }}>질문</button>
          </form>
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // ── 응답자 UI ──
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0e17' }}>
      {header}

      {/* 대화 히스토리 (응답자가 본 대화) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* 빈 상태 — 질문 대기 */}
        {respondTurns.length === 0 && !incomingQuestion && !previewAnswer && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(34, 197, 94, 0.08)', border: '2px dashed rgba(34, 197, 94, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', animation: 'pulse 3s ease-in-out infinite',
            }}>💬</div>
            <p style={{ fontWeight: 600, marginBottom: 6, color: '#94a3b8', fontSize: '0.95rem' }}>
              상대의 질문을 기다리는 중
            </p>
            <p style={{ fontSize: '0.8rem', lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
              상대 팀이 질문을 보내면 여기에 표시됩니다.
              <br />자연스럽게 답변해서 들키지 마세요!
            </p>
          </div>
        )}

        {/* 완료된 턴들 */}
        {respondTurns.map((turn) => (
          <div key={`r-${turn.turnNum}`} style={{ marginBottom: 8 }}>
            <div style={{ textAlign: 'center', margin: '10px 0 6px', fontSize: '0.6rem', color: '#475569', letterSpacing: '0.05em' }}>
              ── 턴 {turn.turnNum} ──
            </div>
            {/* 상대 질문 (왼쪽) */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', color: '#818cf8',
              }}>🔍</div>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: '#1e293b', color: '#e2e8f0',
                borderRadius: '18px 18px 18px 4px', fontSize: '0.88rem', lineHeight: 1.5,
                border: '1px solid rgba(255,255,255,0.06)',
              }}>{turn.question}</div>
            </div>
            {/* 내/AI 답변 (오른쪽, 초록) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px',
                background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
                borderRadius: '18px 18px 4px 18px', fontSize: '0.88rem', lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(5,150,105,0.25)',
              }}>{turn.styledAnswer}</div>
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* ── 현재 질문 + 답변 입력 (하단 고정) ── */}
      {previewAnswer ? (
        /* AI 위장 모드 */
        <div style={{
          background: '#111827', borderTop: '2px solid #8b5cf6', padding: '14px 16px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6' }}>🎭 위장 모드</span>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>— AI가 대신 답변합니다. 들키지 않게!</span>
          </div>
          <div style={{
            padding: '10px 14px', background: '#1e293b', borderRadius: 10,
            border: '1px solid rgba(139,92,246,0.2)', marginBottom: 8,
            fontSize: '0.85rem', color: '#c4b5fd', lineHeight: 1.5,
          }}>{previewAnswer.aiAnswer}</div>
          <input type="text" value={fakeText}
            onChange={(e) => setFakeText(e.target.value)}
            placeholder="타이핑하는 척하세요..."
            style={{
              width: '100%', padding: '8px 14px', background: '#1e293b',
              border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10,
              color: '#64748b', outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit',
            }} />
        </div>
      ) : incomingQuestion ? (
        /* 사람 턴 — 직접 답변 */
        <div style={{
          background: '#111827', borderTop: '2px solid #22c55e', padding: '14px 16px',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#22c55e' }}>✍️ 답변 차례</span>
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>— 자연스럽게 답변하세요</span>
          </div>
          <div style={{
            padding: '10px 14px', background: '#1e293b', borderRadius: 10,
            border: '1px solid rgba(34,197,94,0.15)', marginBottom: 10,
            fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5,
          }}>"{incomingQuestion.question}"</div>
          {answerSent ? (
            <div style={{ textAlign: 'center', padding: 10, color: '#22c55e', fontWeight: 600, fontSize: '0.85rem' }}>
              ✅ 전송 완료! 말투 변환 후 전달됩니다
            </div>
          ) : (
            <form onSubmit={handleSendAnswer} style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={answerDraft}
                onChange={(e) => { if (e.target.value.length <= 60) setAnswerDraft(e.target.value) }}
                placeholder="답변을 입력하세요... (60자 이내)"
                autoFocus
                style={{
                  flex: 1, padding: '10px 14px', background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  color: '#e2e8f0', outline: 'none', fontSize: '0.88rem', fontFamily: 'inherit',
                }} />
              <button type="submit" disabled={!answerDraft.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 10, border: 'none',
                  background: answerDraft.trim() ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#1e293b',
                  color: answerDraft.trim() ? '#fff' : '#475569',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                  boxShadow: answerDraft.trim() ? '0 2px 8px rgba(34,197,94,0.3)' : 'none',
                }}>전송</button>
            </form>
          )}
        </div>
      ) : (
        /* 질문 대기 */
        <div style={{
          padding: '14px 16px', background: '#111827',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center', fontSize: '0.8rem', color: '#475569',
        }}>
          상대의 다음 질문을 기다리는 중...
        </div>
      )}
    </div>
  )
}
