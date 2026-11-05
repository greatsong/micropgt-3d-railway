/**
 * 수업 기록 보존 기간 — TURING_RETENTION_DAYS를 설정했을 때만 동작한다 (기본은 삭제하지 않음).
 * 만든 지 N일이 지난 세션의 학생 이름·대화·점수를 상태와 관계없이 지운다.
 */
const DAY_MS = 24 * 60 * 60 * 1000

export function purgeExpiredSessions(db, days) {
  // 1일 미만은 받지 않는다. 0.5를 내림하면 "-0 days"가 되어 모든 세션이 지워진다
  if (!Number.isFinite(days) || days < 1) return 0
  const expired = db
    .prepare("SELECT id FROM sessions WHERE created_at < datetime('now', ?)")
    .all(`-${Math.floor(days)} days`)
  const purge = db.transaction((sessionId) => {
    const roundIds = db.prepare('SELECT id FROM rounds WHERE session_id = ?').all(sessionId).map((round) => round.id)
    for (const roundId of roundIds) {
      db.prepare('DELETE FROM turns WHERE round_id = ?').run(roundId)
      db.prepare('DELETE FROM pairings WHERE round_id = ?').run(roundId)
    }
    db.prepare('DELETE FROM rounds WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM students WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM teams WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
  })
  for (const { id } of expired) purge(id)
  return expired.length
}

export function startRetentionJob(db) {
  const days = Number(process.env.TURING_RETENTION_DAYS)
  if (!days) return
  const run = () => {
    try {
      const count = purgeExpiredSessions(db, days)
      if (count) console.log(`[retention] ${days}일이 지난 수업 ${count}개의 기록을 삭제했습니다`)
    } catch (err) {
      console.error('[retention] 삭제 실패:', err.message)
    }
  }
  run()
  setInterval(run, DAY_MS).unref()
}
