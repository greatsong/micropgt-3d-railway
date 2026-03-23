import { useState } from 'react'

export default function RoundResults({ results, onShowConversation, onNextRound }) {
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(null)

  if (!results) return null

  const { roundNum, style, aiModel, pointValue, teamResults, standings, stats } = results

  const selectedTeam = selectedTeamIdx !== null ? teamResults[selectedTeamIdx] : null

  return (
    <div>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '4px' }}>
          🎯 라운드 {roundNum} 결과
        </h2>
        <p className="text-muted">
          {style}말투 · {aiModel} · {pointValue}점/정답
        </p>
      </div>

      {/* 결과 테이블 */}
      <div className="card" style={{ marginBottom: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['팀', '정답', '오답', '미투표', '점수', '누적'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.875rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamResults?.map((t, i) => {
              const voted = t.turns?.filter((turn) => turn.verdict).length ?? 0
              const unvoted = (t.total || 0) - voted
              return (
                <tr
                  key={t.teamId}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setSelectedTeamIdx(i === selectedTeamIdx ? null : i)}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.teamColor }} />
                      <span style={{ fontWeight: 600 }}>{t.teamName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--success)', fontWeight: 700 }}>{t.correct}/{t.total}</td>
                  <td style={{ padding: '12px', color: 'var(--danger)' }}>{t.total - t.correct - unvoted}/{t.total}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{unvoted}/{t.total}</td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>+{t.earned}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--primary)' }}>{t.totalScore}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 통계 */}
      {stats && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>📊 라운드 통계</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              { label: '전체 정답률', value: `${stats.accuracy}%`, sub: `${stats.totalCorrect}/${stats.totalTurns}` },
              { label: 'AI를 AI로', value: `${stats.aiAiRate}%`, sub: 'AI 식별률' },
              { label: '사람을 사람으로', value: `${stats.humanHumanRate}%`, sub: '사람 식별률' },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 선택된 팀 대화 리뷰 */}
      {selectedTeam && (
        <div className="card" style={{ marginBottom: '20px', borderColor: selectedTeam.teamColor }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedTeam.teamColor }} />
            <h3>{selectedTeam.teamName} 대화 리뷰</h3>
            <span className="text-muted" style={{ marginLeft: 'auto' }}>
              {selectedTeam.correct}/{selectedTeam.total} 정답
            </span>
          </div>

          {/* 턴별 요약 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {selectedTeam.turns?.map((turn) => (
              <div
                key={turn.turnNum}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: turn.isCorrect ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: turn.isCorrect ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                턴{turn.turnNum} {turn.respondentType === 'human' ? '🧑' : '🤖'}
                {turn.isCorrect ? ' ✅' : ' ❌'}
              </div>
            ))}
          </div>

          {/* 턴별 대화 상세 */}
          {selectedTeam.turns?.map((turn) => (
            <div key={turn.turnNum} style={{
              borderRadius: '8px',
              border: `2px solid ${turn.isCorrect ? 'var(--success)' : 'var(--danger)'}`,
              padding: '12px',
              marginBottom: '8px',
              background: turn.isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.8125rem', marginBottom: '6px',
              }}>
                <span style={{ fontWeight: 700 }}>턴 {turn.turnNum}</span>
                <span>
                  실제: {turn.respondentType === 'human' ? '🧑 사람' : '🤖 AI'} |
                  투표: {turn.verdict ? (turn.verdict === 'human' ? '🧑 사람' : '🤖 AI') : '미투표'} →
                  {turn.isCorrect
                    ? <span style={{ color: 'var(--success)', fontWeight: 700 }}> ✅ 정답</span>
                    : <span style={{ color: 'var(--danger)', fontWeight: 700 }}> ❌ 오답</span>
                  }
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Q: </span>{turn.question}
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>A: </span>{turn.styledAnswer || '—'}
              </div>
            </div>
          ))}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => onShowConversation?.(selectedTeam.teamId)}
            style={{ marginTop: '8px' }}
          >
            🖥️ 프로젝터에 표시
          </button>
        </div>
      )}

      {/* 대화 상세 버튼 */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '12px' }}>대화 상세 보기</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {teamResults?.map((t) => (
            <button
              key={t.teamId}
              className="btn btn-outline btn-sm"
              style={{ borderColor: t.teamColor, color: t.teamColor }}
              onClick={() => onShowConversation?.(t.teamId)}
            >
              {t.teamName}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 순위 */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>현재 누적 순위</h3>
        <div className="rankings">
          {standings?.map((s, i) => (
            <div key={s.teamId} className="rank-row">
              <div className={`rank-num rank-${i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : ''}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.teamColor }} />
              <div style={{ flex: 1, fontWeight: 600 }}>{s.teamName}</div>
              <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.125rem' }}>{s.totalScore}점</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
