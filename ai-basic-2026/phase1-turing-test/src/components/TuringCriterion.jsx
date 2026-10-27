/**
 * 튜링의 30% 기준 카드
 * 1950년 논문 "Computing Machinery and Intelligence"에서 튜링은 평범한 심문관이 5분 대화 뒤
 * 30% 이상 기계를 사람으로 잘못 판정하면 기계가 모방 게임을 "통과"한다고 볼 만하다고 썼다.
 * 서버 calcStats의 aiFooledRate(AI 턴 중 사람으로 판정된 비율)를 그대로 보여 준다.
 */
export default function TuringCriterion({ stats, className = 'card', title = '튜링의 기준' }) {
  if (!stats || stats.aiFooledRate === null || stats.aiFooledRate === undefined) return null
  const rate = stats.aiFooledRate
  const passed = rate >= 30
  const accent = passed ? '#4ade80' : '#d4a574'

  return (
    <div
      className={className}
      style={{
        borderColor: passed ? 'rgba(74,222,128,0.35)' : 'rgba(212,165,116,0.3)',
        background: passed ? 'rgba(74,222,128,0.05)' : 'rgba(212,165,116,0.05)',
      }}
    >
      <p style={{ fontFamily: "'Courier New', monospace", letterSpacing: '0.12em', fontSize: '0.68rem', color: accent, margin: 0 }}>
        TURING'S CRITERION · 1950
      </p>
      <h3 style={{ margin: '6px 0 4px', color: accent }}>
        {passed ? '🤖 기계가 모방 게임을 통과했습니다' : '🧑 심문관이 기계를 가려냈습니다'}
      </h3>
      <p style={{ margin: '0 0 6px', fontSize: '0.95rem' }}>
        {title}: AI가 사람으로 판정된 비율 <strong style={{ color: accent, fontSize: '1.15rem' }}>{rate}%</strong>
        <span style={{ opacity: 0.6, fontSize: '0.8rem' }}> (투표된 AI 턴 {stats.aiVotedTurns ?? 0}개 기준, 기준선 30%)</span>
      </p>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${Math.min(100, rate)}%`, height: '100%', background: accent, transition: 'width 0.6s' }} />
        <div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.6)' }} />
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.7, lineHeight: 1.5 }}>
        앨런 튜링은 1950년 논문에서 심문관이 5분 대화 뒤 30% 이상 속으면 기계가 "생각한다"고 볼 만하다고 썼습니다.
      </p>
    </div>
  )
}
