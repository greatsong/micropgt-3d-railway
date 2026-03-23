export default function ScoreBoard({ myTeam, results, finalResults }) {
  // 최종 결과 화면
  if (finalResults) {
    const { finalStandings, overallStats } = finalResults
    const myStanding = finalStandings?.find((s) => s.teamId === myTeam?.id)
    const myRank = finalStandings?.findIndex((s) => s.teamId === myTeam?.id) ?? -1
    const medals = ['🥇', '🥈', '🥉']

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="student-header" style={{ background: '#6d28d9' }}>
          <div className="title">🏆 최종 결과</div>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {myStanding && (
            <div className="card" style={{ textAlign: 'center', borderColor: myTeam?.color, animation: 'bounceIn 0.6s ease-out' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '6px' }}>
                {myRank < 3 ? medals[myRank] : `${myRank + 1}위`}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myTeam?.color }} />
                <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{myTeam?.name}</span>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-hover)' }}>
                {myStanding.totalScore}점
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: '14px' }}>전체 순위</h3>
            <div className="rankings">
              {finalStandings?.map((s, i) => (
                <div
                  key={s.teamId}
                  className="rank-row"
                  style={{
                    background: s.teamId === myTeam?.id ? 'var(--accent-soft)' : 'var(--surface)',
                    border: s.teamId === myTeam?.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: '28px', textAlign: 'center', fontSize: '1.125rem', fontWeight: 700 }}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.teamColor }} />
                  <div style={{ flex: 1, fontWeight: s.teamId === myTeam?.id ? 700 : 400 }}>{s.teamName}</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>{s.totalScore}점</div>
                </div>
              ))}
            </div>
          </div>

          {overallStats && (
            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>📊 전체 통계</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: '전체 정답률', value: `${overallStats.accuracy}%` },
                  { label: 'AI 식별률', value: `${overallStats.aiAiRate}%` },
                  { label: '사람 식별률', value: `${overallStats.humanHumanRate}%` },
                  { label: '전체 턴', value: `${overallStats.totalCorrect}/${overallStats.totalTurns}` },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--accent-hover)' }}>{s.value}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 라운드 결과 화면
  if (!results) return null

  const { roundNum, style, aiModel, pointValue, teamResults, standings } = results
  const myResult = teamResults?.find((t) => t.teamId === myTeam?.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="student-header" style={{ background: '#065f46' }}>
        <div className="title">🎯 라운드 {roundNum} 결과!</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--mint)' }}>{style} · {pointValue}점/정답</div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 내 팀 결과 */}
        {myResult && (
          <div className="card" style={{ borderColor: myTeam?.color, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myTeam?.color }} />
              <h3>{myTeam?.name}</h3>
              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent-hover)' }}>
                이번: +{myResult.earned}점 | 누적: {myResult.totalScore}점
              </span>
            </div>

            {myResult.turns?.map((turn) => (
              <div key={turn.turnNum} style={{
                borderRadius: '8px', border: `2px solid ${turn.isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                padding: '10px 12px', marginBottom: '8px',
                background: turn.isCorrect ? 'var(--success-soft)' : 'var(--danger-soft)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>턴 {turn.turnNum}</span>
                  <span style={{ fontSize: '0.875rem' }}>
                    투표: {turn.verdict === 'human' ? '🧑 사람' : turn.verdict === 'ai' ? '🤖 AI' : '미투표'} |
                    실제: {turn.respondentType === 'human' ? '🧑 사람' : '🤖 AI'} →
                    <strong style={{ color: turn.isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                      {turn.isCorrect ? ' ✅ +' + pointValue + '점' : ' ❌'}
                    </strong>
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--muted)' }}>답변: </span>{turn.styledAnswer || '—'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 누적 순위 */}
        <div className="card">
          <h3 style={{ marginBottom: '12px' }}>누적 순위</h3>
          <div className="rankings">
            {standings?.map((s, i) => (
              <div
                key={s.teamId}
                className="rank-row"
                style={{
                  background: s.teamId === myTeam?.id ? 'var(--accent-soft)' : 'var(--surface)',
                  border: s.teamId === myTeam?.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                <div style={{ minWidth: '28px', textAlign: 'center', fontWeight: 700 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </div>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.teamColor }} />
                <div style={{ flex: 1, fontWeight: s.teamId === myTeam?.id ? 700 : 400 }}>{s.teamName}</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>{s.totalScore}점</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
