export default function TeamGrid({ teams, phase, teamProgress, voteProgress, round, onTeamClick, selectedTeamId }) {
  function getTeamProgress(teamId) {
    return teamProgress?.find((t) => t.id === teamId || t.teamId === teamId)
  }
  function getVoteProgress(teamId) {
    return voteProgress?.find((t) => t.teamId === teamId)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.125rem' }}>
          {phase === 'waiting' ? '참여 팀' :
           phase === 'chatting' ? `🧪 R${round?.roundNum} · ${round?.style}(~) · ${round?.pointValue}점/정답` :
           phase === 'voting' || phase === 'voting-closed' ? `🗳️ 투표 중 — R${round?.roundNum}` :
           `📊 R${round?.roundNum} 결과`}
        </h2>
        <span className="badge badge-blue">{teams.length}팀</span>
      </div>

      {teams.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-muted)',
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📱</div>
          <p>학생들이 QR을 스캔하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="team-grid">
          {teams.map((team) => {
            const prog = getTeamProgress(team.id)
            const vote = getVoteProgress(team.id)
            const isSelected = selectedTeamId === team.id
            const completed = prog?.completedTurns ?? 0
            const total = round?.turns ?? 0

            return (
              <div
                key={team.id}
                className={`team-card${isSelected ? ' selected' : ''}`}
                onClick={() => onTeamClick?.(team)}
              >
                <div className="team-card-color-bar" style={{ background: team.color }} />
                <div className="team-card-name">
                  <span className="team-dot" style={{ background: team.color, marginRight: '6px' }} />
                  {team.name}
                </div>
                <div className="team-card-members">
                  {Array.isArray(team.members)
                    ? team.members.join(', ')
                    : team.members}
                </div>

                {/* 역할 배지 (라운드 진행 중) */}
                {phase === 'chatting' && team.role && (
                  <div style={{
                    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                    fontSize: '0.7rem', fontWeight: 700, marginBottom: 6,
                    background: team.role === 'judge' ? 'rgba(99,102,241,0.15)' : team.role === 'respondent' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: team.role === 'judge' ? '#818cf8' : team.role === 'respondent' ? '#4ade80' : '#f59e0b',
                  }}>
                    {team.role === 'judge' ? '🔍 심판' : team.role === 'respondent' ? '💬 응답자' : '👁️ 관찰'}
                  </div>
                )}

                {phase === 'chatting' && prog && (
                  <>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {Array.from({ length: total }).map((_, i) => (
                        <div
                          key={i}
                          className={`turn-dot${i < completed ? ' done' : ''}`}
                          style={{ width: '9px', height: '9px' }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {completed}/{total}턴
                    </div>
                  </>
                )}

                {(phase === 'voting' || phase === 'voting-closed') && vote && (
                  <>
                    <div className="progress-bar" style={{ marginBottom: '6px' }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(vote.votedCount / (round?.turns || 1)) * 100}%`,
                          background: vote.submitted ? 'var(--success)' : 'var(--accent)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: vote.submitted ? 'var(--success)' : 'var(--text-muted)', fontWeight: vote.submitted ? 700 : 400 }}>
                      {vote.submitted ? '📮 제출 완료' : `투표: ${vote.votedCount}/${round?.turns}`}
                    </div>
                  </>
                )}

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>누적</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.125rem' }}>
                    {team.total_score ?? 0}점
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {phase === 'chatting' && (
        <p className="text-muted mt-12" style={{ fontSize: '0.8125rem' }}>
          💡 팀 카드 클릭 시 실시간 대화를 볼 수 있습니다 (정답 여부는 결과 공개 전까지 숨김)
        </p>
      )}
    </div>
  )
}
