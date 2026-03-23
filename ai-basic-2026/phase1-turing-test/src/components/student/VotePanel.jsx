import { useState } from 'react'
import { formatTime } from '../../utils/socket.js'

export default function VotePanel({ conversations, timer, voteSubmitted, onSubmitVotes }) {
  const [votes, setVotes] = useState({}) // { [turnNum]: 'human' | 'ai' }
  const [submitted, setSubmitted] = useState(false)

  const remaining = timer?.remaining ?? 0
  const isUrgent = remaining <= 30 && remaining > 0
  const votedCount = Object.keys(votes).length
  const total = conversations.length

  function handleVote(turnNum, verdict) {
    if (submitted || voteSubmitted) return
    setVotes((prev) => ({ ...prev, [turnNum]: verdict }))
  }

  function handleSubmit() {
    if (submitted || voteSubmitted) return
    if (!confirm('투표를 제출합니까? 제출 후 수정할 수 없습니다.')) return
    const voteArray = Object.entries(votes).map(([turn, verdict]) => ({
      turn: Number(turn),
      verdict,
    }))
    onSubmitVotes(voteArray)
    setSubmitted(true)
  }

  const isSubmitted = submitted || voteSubmitted

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* 헤더 */}
      <div className="student-header" style={{ background: '#92400E' }}>
        <div>
          <div className="title">🗳️ 투표 시간!</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '2px' }}>
            각 턴의 상대가 사람인지 AI인지 맞춰보세요
          </div>
        </div>
        <div className={`timer-sm${isUrgent ? ' urgent' : ''}`}>
          {formatTime(remaining)}
        </div>
      </div>

      {/* 투표 현황 */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gold)' }}>
          투표 현황: {votedCount}/{total}턴 완료
        </span>
        <div style={{
          width: '120px', height: '6px', borderRadius: '3px',
          background: 'var(--border)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: 'var(--vote)',
            width: `${(votedCount / Math.max(total, 1)) * 100}%`,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* 투표 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {conversations.length === 0 ? (
          <div className="waiting-screen">
            <p className="text-muted">대화 내역을 불러오는 중...</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const selected = votes[conv.turnNum]
            return (
              <div
                key={conv.turnNum}
                className={`vote-turn${selected === 'human' ? ' selected-human' : selected === 'ai' ? ' selected-ai' : ''}`}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>
                  ── 턴 {conv.turnNum} ──
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>질문: </span>
                  <span style={{ fontWeight: 600 }}>{conv.question}</span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>답변: </span>
                  <span>{conv.styledAnswer || '—'}</span>
                </div>
                <div className="vote-options">
                  <button
                    className={`vote-btn human${selected === 'human' ? ' selected' : ''}`}
                    onClick={() => handleVote(conv.turnNum, 'human')}
                    disabled={isSubmitted}
                  >
                    🧑 사람
                  </button>
                  <button
                    className={`vote-btn ai${selected === 'ai' ? ' selected' : ''}`}
                    onClick={() => handleVote(conv.turnNum, 'ai')}
                    disabled={isSubmitted}
                  >
                    🤖 AI
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        {isSubmitted ? (
          <div style={{
            background: 'var(--success-soft)', borderRadius: '10px', padding: '14px',
            textAlign: 'center', border: '2px solid rgba(34, 197, 94, 0.3)',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1.0625rem' }}>
              📮 투표 제출 완료!
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '4px' }}>
              교사가 결과를 공개할 때까지 기다려 주세요
            </div>
          </div>
        ) : (
          <>
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleSubmit}
              disabled={votedCount === 0}
            >
              📮 최종 제출 ({votedCount}/{total}턴)
            </button>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                ⚠️ 제출 후 수정 불가
              </p>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                ⚠️ 미투표 턴은 0점 처리
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
