export default function ScoreBoard({ myTeam, results, finalResults }) {
  // 최종 결과 화면
  if (finalResults) {
    const { finalStandings, overallStats, roundStats, mvpTeamId } = finalResults
    const myStanding = finalStandings?.find((s) => s.teamId === myTeam?.id)
    const myRank = finalStandings?.findIndex((s) => s.teamId === myTeam?.id) ?? -1
    const medals = ['🥇', '🥈', '🥉']
    const isMvp = mvpTeamId === myTeam?.id

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="student-header" style={{ background: '#6d28d9' }}>
          <div className="title">🏆 최종 결과</div>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* ── 내 팀 카드 ── */}
          {myStanding && (
            <div className="card" style={{ textAlign: 'center', borderColor: myTeam?.color, animation: 'bounceIn 0.6s ease-out' }}>
              {isMvp && (
                <div style={{
                  display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))',
                  border: '1px solid rgba(234,179,8,0.3)',
                  fontSize: '0.75rem', fontWeight: 800, color: '#eab308',
                  marginBottom: 8,
                }}>
                  ⭐ MVP — 최고 정답률!
                </div>
              )}
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
              <div style={{
                display: 'inline-block', marginTop: 6, padding: '4px 14px', borderRadius: 8,
                background: 'var(--surface2)', fontSize: '0.85rem', color: 'var(--muted)',
              }}>
                정답률 <strong style={{ color: 'var(--accent-hover)' }}>{myStanding.accuracy ?? 0}%</strong>
                <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                {myStanding.totalCorrect ?? 0}/{myStanding.totalTurns ?? 0}
              </div>
            </div>
          )}

          {/* ── 내 라운드별 성적 ── */}
          {myStanding?.roundResults?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>📋 라운드별 성적</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {myStanding.roundResults.map((r) => {
                  const acc = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0
                  return (
                    <div key={r.roundNum} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: 32, color: 'var(--accent-hover)' }}>R{r.roundNum}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--muted)', minWidth: 60 }}>{r.style}</span>
                      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(99,102,241,0.1)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: acc >= 70 ? '#22c55e' : acc >= 40 ? '#f59e0b' : '#ef4444',
                          width: `${acc}%`,
                        }} />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', minWidth: 36, textAlign: 'right', color: acc >= 70 ? '#22c55e' : acc >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {acc}%
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted)', minWidth: 28, textAlign: 'right' }}>
                        {r.correct}/{r.total}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', minWidth: 40, textAlign: 'right', color: 'var(--accent-hover)' }}>
                        +{r.earned}점
                      </span>
                      {r.pointValue === 0 && (
                        <span style={{
                          padding: '1px 6px', borderRadius: 4,
                          background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                          fontSize: '0.6rem', fontWeight: 700,
                        }}>연습</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 전체 순위 ── */}
          <div className="card">
            <h3 style={{ marginBottom: '14px' }}>전체 순위</h3>
            <div className="rankings">
              {finalStandings?.map((s, i) => (
                <div
                  key={s.teamId}
                  className="rank-row"
                  style={{
                    background: s.teamId === myTeam?.id ? 'var(--accent-soft)' : s.teamId === mvpTeamId ? 'rgba(234,179,8,0.04)' : 'var(--surface)',
                    border: s.teamId === myTeam?.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ minWidth: '28px', textAlign: 'center', fontSize: '1.125rem', fontWeight: 700 }}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.teamColor }} />
                  <div style={{ flex: 1, fontWeight: s.teamId === myTeam?.id ? 700 : 400 }}>
                    {s.teamName}
                    {s.teamId === mvpTeamId && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>⭐</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginRight: 6 }}>{s.accuracy ?? 0}%</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-hover)' }}>{s.totalScore}점</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 라운드별 학급 통계 ── */}
          {roundStats?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>📊 라운드별 학급 정답률</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {roundStats.map((r) => (
                  <div key={r.roundNum} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '6px 10px', borderRadius: 6,
                    background: 'var(--surface)',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', minWidth: 28, color: 'var(--accent-hover)' }}>R{r.roundNum}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', minWidth: 50 }}>{r.style}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(99,102,241,0.1)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: r.accuracy >= 70 ? '#22c55e' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444',
                        width: `${r.accuracy}%`,
                      }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', minWidth: 36, textAlign: 'right', color: r.accuracy >= 70 ? '#22c55e' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444' }}>
                      {r.accuracy}%
                    </span>
                    {r.pointValue === 0 && (
                      <span style={{
                        padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                        fontSize: '0.55rem', fontWeight: 700,
                      }}>연습</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 전체 통계 ── */}
          {overallStats && (
            <div className="card">
              <h3 style={{ marginBottom: '12px' }}>📈 전체 통계</h3>
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
        <div style={{ fontSize: '0.8125rem', color: 'var(--mint)' }}>
          {style}
          {pointValue > 0
            ? ` · ${pointValue}점/정답`
            : ' · 연습 라운드'}
        </div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* 내 팀 결과 */}
        {myResult && (
          <div className="card" style={{ borderColor: myTeam?.color, animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: myTeam?.color }} />
              <h3>{myTeam?.name}</h3>
              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent-hover)' }}>
                {pointValue > 0
                  ? `이번: +${myResult.earned}점 | 누적: ${myResult.totalScore}점`
                  : `${myResult.correct}/${myResult.total} 정답 | 누적: ${myResult.totalScore}점`}
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
                      {turn.isCorrect
                        ? pointValue > 0 ? ` ✅ +${pointValue}점` : ' ✅ 정답'
                        : ' ❌'}
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
