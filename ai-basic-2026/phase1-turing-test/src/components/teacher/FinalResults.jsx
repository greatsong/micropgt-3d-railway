export default function FinalResults({ results, sessionId }) {
  if (!results) return null

  const { finalStandings, allRoundResults, overallStats } = results

  function handleCSV() {
    window.open(`/turing-test/api/dashboard/${sessionId}/export`, '_blank')
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🏆</div>
        <h1>최종 결과</h1>
        <p className="text-muted mt-8">
          {finalStandings?.length}팀 · {allRoundResults?.length}라운드 종합
        </p>
      </div>

      {/* 상위 3위 강조 */}
      {finalStandings && finalStandings.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {finalStandings.slice(0, 3).map((t, i) => (
            <div key={t.teamId} style={{
              flex: '1 1 160px',
              background: ['rgba(251,191,36,0.15)', 'rgba(148,163,184,0.15)', 'rgba(205,127,50,0.15)'][i],
              border: [`2px solid var(--gold)`, `2px solid var(--muted)`, `2px solid #CD7F32`][i],
              borderRadius: '14px',
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '4px' }}>{medals[i]}</div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                marginBottom: '4px',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.teamColor }} />
                <span style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{t.teamName}</span>
              </div>
              {t.members && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {Array.isArray(t.members) ? t.members.join(', ') : t.members}
                </div>
              )}
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                {t.totalScore}점
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 전체 순위 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>전체 순위</h3>
        <div className="rankings">
          {finalStandings?.map((t, i) => (
            <div key={t.teamId} className="rank-row">
              <div style={{
                minWidth: '28px', textAlign: 'center',
                fontSize: i < 3 ? '1.25rem' : '1rem',
                fontWeight: 700,
                color: ['var(--gold)', 'var(--muted)', '#CD7F32'][i] || 'var(--text-muted)',
              }}>
                {i < 3 ? medals[i] : i + 1}
              </div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.teamColor }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{t.teamName}</span>
                {t.members && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginLeft: '8px' }}>
                    {Array.isArray(t.members) ? t.members.join(', ') : t.members}
                  </span>
                )}
                {t.roundResults && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {t.roundResults.map((r, j) => (
                      <span key={j} style={{ marginRight: '10px' }}>
                        R{r.roundNum}(×{r.pointValue}): {r.correct}/{r.total}={r.earned}점
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
                {t.totalScore}점
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 전체 통계 */}
      {overallStats && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>📊 전체 통계</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: '전체 정답률', value: `${overallStats.accuracy}%`, sub: `${overallStats.totalCorrect}/${overallStats.totalTurns}` },
              { label: 'AI 식별률', value: `${overallStats.aiAiRate}%`, sub: 'AI → AI' },
              { label: '사람 식별률', value: `${overallStats.humanHumanRate}%`, sub: '사람 → 사람' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--surface2)', borderRadius: '10px' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV 다운로드 */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleCSV}>
          📥 결과 CSV 다운로드
        </button>
      </div>
    </div>
  )
}
