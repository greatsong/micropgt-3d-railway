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
  const chatEndRef = useRef(null)

  const currentTurn = judgeTurns.length + 1
  const totalTurns = roundInfo?.totalTurns || roundInfo?.turns || 0
  const isUrgent = remaining <= 30 && remaining > 0
  const isSoloJudge = roundInfo?.isSoloJudge

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [judgeTurns, awaitingAnswer])

  // 새 질문이 오면 답변 초기화
  useEffect(() => {
    setAnswerDraft('')
    setAnswerSent(false)
  }, [incomingQuestion?.turnNum])

  useEffect(() => {
    setFakeText('')
  }, [previewAnswer?.turnNum])

  function handleSendQuestion(e) {
    e?.preventDefault()
    if (!message.trim() || awaitingAnswer || isSoloJudge) return
    onSendQuestion(message.trim())
    setMessage('')
  }

  function handleSendAnswer(e) {
    e?.preventDefault()
    if (!answerDraft.trim() || answerSent) return
    onSubmitAnswer(answerDraft.trim())
    setAnswerSent(true)
  }

  const showRespondOverlay = incomingQuestion || previewAnswer

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* ── 상단 바 (고정) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--judge)', textTransform: 'uppercase' }}>
            🔍 R{roundInfo?.roundNum}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>·</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{roundInfo?.style}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            턴 {Math.min(currentTurn, totalTurns)}/{totalTurns}
          </span>
          <span style={{
            fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.1rem',
            color: isUrgent ? 'var(--danger)' : 'var(--text)',
            animation: isUrgent ? 'pulse 1s ease-in-out infinite' : 'none',
          }}>
            {formatTime(remaining)}
          </span>
        </div>
      </div>

      {/* ── 솔로 심판 안내 ── */}
      {isSoloJudge && (
        <div style={{
          padding: '8px 16px', background: 'var(--vote-soft)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          fontSize: '0.8rem', color: 'var(--vote)', textAlign: 'center',
        }}>
          👁️ 이 라운드는 관찰 전용 심판입니다 — 다른 팀의 대화를 지켜보세요
        </div>
      )}

      {/* ── 채팅 히스토리 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {judgeTurns.length === 0 && respondTurns.length === 0 && !awaitingAnswer && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8, animation: 'bounceIn 0.6s ease-out' }}>🔍</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>상대에게 질문을 보내세요!</p>
            <p style={{ fontSize: '0.8rem' }}>
              {isSoloJudge
                ? '다른 팀의 대화가 여기에 표시됩니다'
                : '사람인지 AI인지 구별할 수 있는 질문을 던져보세요'}
            </p>
          </div>
        )}

        {/* 내가 질문한 대화 */}
        {judgeTurns.length > 0 && (
          <div style={{
            textAlign: 'center', margin: '4px 0', padding: '3px 10px',
            fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em',
          }}>
            🔍 내가 질문한 대화
          </div>
        )}

        {judgeTurns.map((turn) => (
          <div key={`j-${turn.turnNum}`}>
            <div style={{ textAlign: 'center', margin: '8px 0 4px', fontSize: '0.7rem', color: 'var(--muted)' }}>
              턴 {turn.turnNum}
            </div>

            {/* 내 질문 (오른쪽) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: '16px 16px 4px 16px',
                fontSize: '0.9rem', lineHeight: 1.5,
              }}>
                {turn.question}
              </div>
            </div>

            {/* 상대 답변 (왼쪽) */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px',
                background: 'var(--surface2)', color: 'var(--text)',
                borderRadius: '16px 16px 16px 4px',
                fontSize: '0.9rem', lineHeight: 1.5,
                border: '1px solid var(--border)',
              }}>
                {turn.styledAnswer || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>응답 없음</span>}
              </div>
            </div>
          </div>
        ))}

        {/* 상대가 질문한 대화 (응답자 뷰) */}
        {respondTurns.length > 0 && (
          <>
            <div style={{
              textAlign: 'center', margin: '12px 0 4px', padding: '3px 10px',
              fontSize: '0.65rem', color: 'var(--respond)', fontWeight: 700, letterSpacing: '0.08em',
            }}>
              💬 상대가 질문한 대화
            </div>
            {respondTurns.map((turn) => (
              <div key={`r-${turn.turnNum}`}>
                <div style={{ textAlign: 'center', margin: '8px 0 4px', fontSize: '0.7rem', color: 'var(--muted)' }}>
                  턴 {turn.turnNum}
                </div>

                {/* 상대 질문 (왼쪽) */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    background: 'var(--surface2)', color: 'var(--text)',
                    borderRadius: '16px 16px 16px 4px',
                    fontSize: '0.9rem', lineHeight: 1.5,
                    border: '1px solid var(--border)',
                  }}>
                    {turn.question}
                  </div>
                </div>

                {/* 내/AI 답변 (오른쪽, 녹색 계열) */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px',
                    background: 'var(--respond)', color: '#fff',
                    borderRadius: '16px 16px 4px 16px',
                    fontSize: '0.9rem', lineHeight: 1.5,
                  }}>
                    {turn.styledAnswer}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* 답변 대기 중 로딩 */}
        {awaitingAnswer && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
            <div style={{
              padding: '10px 18px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '16px 16px 16px 4px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>답변 기다리는 중...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── 알림 바 ── */}
      {judgeNotice && (
        <div style={{
          padding: '6px 16px', background: 'var(--success-soft)',
          borderTop: '1px solid rgba(34, 197, 94, 0.2)',
          fontSize: '0.78rem', color: 'var(--success)', textAlign: 'center',
        }}>
          {judgeNotice}
        </div>
      )}

      {/* ── 질문 입력 (고정 하단) ── */}
      {!isSoloJudge && (
        <form
          onSubmit={handleSendQuestion}
          style={{
            display: 'flex', gap: 8, padding: '10px 16px',
            background: 'var(--surface)', borderTop: '1px solid var(--border)',
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={awaitingAnswer ? '답변 대기 중...' : '질문을 입력하세요...'}
            disabled={awaitingAnswer || currentTurn > totalTurns}
            style={{
              flex: 1, padding: '10px 14px',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 20, color: 'var(--text)', outline: 'none',
              fontSize: '0.9rem', fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={!message.trim() || awaitingAnswer || currentTurn > totalTurns}
            style={{
              padding: '10px 16px', borderRadius: 20, border: 'none',
              background: message.trim() && !awaitingAnswer ? 'var(--accent)' : 'var(--surface2)',
              color: message.trim() && !awaitingAnswer ? '#fff' : 'var(--muted)',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
              transition: 'background 0.15s, transform 0.1s',
            }}
          >
            보내기 🔍
          </button>
        </form>
      )}

      {/* ── 응답 오버레이 (하단 슬라이드업) ── */}
      {showRespondOverlay && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)',
          borderTop: previewAnswer ? '2px solid var(--respond)' : '2px solid var(--judge)',
          padding: '14px 16px',
          animation: 'slideUp 0.3s ease-out',
          zIndex: 20,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
        }}>
          {previewAnswer ? (
            /* AI 턴 — 위장 모드 */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--respond)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  🎭 위장 모드
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>— AI가 대신 답변합니다</span>
              </div>
              <div style={{
                padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8,
                border: '1px solid var(--border)', marginBottom: 8,
                fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text)',
              }}>
                "{previewAnswer.aiAnswer}"
              </div>
              <input
                type="text"
                value={fakeText}
                onChange={(e) => setFakeText(e.target.value)}
                placeholder="자연스럽게 타이핑하는 척..."
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--surface2)', border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: 8, color: 'var(--muted)', outline: 'none',
                  fontSize: '0.85rem', fontFamily: 'inherit',
                }}
              />
            </>
          ) : incomingQuestion ? (
            /* 사람 턴 — 직접 답변 */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--judge)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ✍️ 답변 요청
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>— 턴 {incomingQuestion.turnNum}</span>
              </div>
              <div style={{
                padding: '6px 12px', background: 'var(--accent-soft)', borderRadius: 8,
                marginBottom: 8, fontSize: '0.85rem', color: 'var(--text)',
              }}>
                "{incomingQuestion.question}"
              </div>
              {answerSent ? (
                <div style={{ textAlign: 'center', padding: 8, color: 'var(--success)', fontWeight: 600 }}>
                  ✅ 답변 전송 완료! {roundInfo?.style}로 변환되어 전달됩니다
                </div>
              ) : (
                <form onSubmit={handleSendAnswer} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    placeholder="답변을 입력하세요..."
                    autoFocus
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', outline: 'none',
                      fontSize: '0.85rem', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!answerDraft.trim()}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: answerDraft.trim() ? 'var(--success)' : 'var(--surface2)',
                      color: answerDraft.trim() ? '#fff' : 'var(--muted)',
                      fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
                    }}
                  >
                    전송 ✅
                  </button>
                </form>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
