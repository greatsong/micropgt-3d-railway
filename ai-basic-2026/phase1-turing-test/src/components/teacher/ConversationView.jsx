export default function ConversationView({ team, turns, revealed, onClose }) {
  if (!team) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 100, padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '16px', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}>
          <div style={{
            width: '14px', height: '14px', borderRadius: '50%',
            background: team.color, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{team.name} 대화 내역</div>
            {team.partnerName && (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                파트너: {team.partnerName}
              </div>
            )}
          </div>
          {turns?.length > 0 && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {turns.length}턴
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ 닫기</button>
        </div>

        {/* 대화 내용 */}
        <div style={{ overflowY: 'auto', padding: '20px', flex: 1 }}>
          {!turns || turns.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              아직 대화 내역이 없습니다
            </div>
          ) : (
            turns.map((turn) => {
              const tNum = turn.turn_number ?? turn.turnNum
              const question = turn.question_text ?? turn.question
              const answer = turn.styled_answer ?? turn.styledAnswer
              const respondentType = turn.respondent_type ?? turn.respondentType
              const verdict = turn.verdict
              const isCorrect = turn.is_correct ?? turn.isCorrect

              return (
                <div key={tNum} style={{
                  borderRadius: '10px',
                  border: revealed
                    ? (isCorrect ? '2px solid var(--success)' : verdict ? '2px solid var(--danger)' : '1px solid var(--border)')
                    : '1px solid var(--border)',
                  padding: '14px',
                  marginBottom: '12px',
                  background: revealed && isCorrect ? 'rgba(34,197,94,0.1)' : revealed && verdict ? 'rgba(239,68,68,0.1)' : 'var(--surface2)',
                }}>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
                    marginBottom: '8px', display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span>── 턴 {tNum} ──</span>
                    {revealed && respondentType && (
                      <span style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                        실제: {respondentType === 'human' ? '🧑 사람' : '🤖 AI'}
                        {verdict && ` | 투표: ${verdict === 'human' ? '🧑 사람' : '🤖 AI'}`}
                        {verdict && (isCorrect ? ' ✅' : ' ❌')}
                      </span>
                    )}
                  </div>
                  <div style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>질문: </span>
                    <span style={{ fontWeight: 600 }}>{question || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>답변: </span>
                    {answer
                      ? <span>{answer}</span>
                      : <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}>⏳ 응답 대기 중...</span>
                    }
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
