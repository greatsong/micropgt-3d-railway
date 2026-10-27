// 배포 서버에서 N팀 라운드 점검 — 테스트 팀을 N개 맞춰 두고 소켓으로 참여. 라운드 시작·결과 공개는 교사가 누른다.
// 실행: node scripts/prod-round-test.mjs ./node_modules <sessionId> [팀 수=6]  (교사 화면에서 라운드 시작·투표 마감·결과 공개는 사람이 누른다)
import { createRequire } from 'module'
const require = createRequire(process.argv[2] + '/')
const { io } = require('socket.io-client')
const HOST = 'https://ai-turing-production.up.railway.app'
const BASE = `${HOST}/turing-test/api`
const OPTS = { path: '/turing-test/socket.io', transports: ['websocket'] }
const sessionId = process.argv[3]
const N = Number(process.argv[4] || 6)
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const QUESTIONS = ['좋아하는 음식이 뭐야?', '주말에 보통 뭐 해?', '요즘 뭐에 빠져 있어?', '좋아하는 계절은?', '최근에 본 영화 있어?', '아침에 몇 시에 일어나?', '싫어하는 과목 있어?', '제일 가고 싶은 여행지는?', '스트레스 받으면 뭐 해?', '요즘 듣는 노래 있어?']
const ANSWERS = ['떡볶이 좋아해', '집에서 쉬어', '게임이지', '가을이 좋아', '음 없어', '일곱 시쯤', '수학', '제주도', '잠 자', '뉴진스']

async function apiPost(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`${path} ${r.status} ${d.error}`)
  return d
}
function connect() { return new Promise((resolve, reject) => { const s = io(HOST, OPTS); s.on('connect', () => resolve(s)); s.on('connect_error', reject) }) }
function once(socket, event, timeoutMs) {
  return new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs); socket.once(event, (p) => { clearTimeout(t); resolve(p) }) })
}

const session = await (await fetch(`${BASE}/session/${sessionId}`)).json()
log(`세션 ${session.id} 코드 ${session.teacher_code} 상태 ${session.status} 기존 팀 ${session.teams.length}`)
const teams = [...session.teams]
for (let i = teams.length + 1; i <= N; i++) teams.push(await apiPost(`/session/${sessionId}/team`, { name: `테스트${i}조`, members: [`점검봇${i}A`, `점검봇${i}B`] }))
log(`팀 ${teams.length}개: ${teams.map((t) => `${t.name}(#${t.id})`).join(', ')}`)
const sockets = []
for (const t of teams) sockets.push(await connect())
sockets.forEach((s, i) => s.emit('team:join', { sessionId, teamId: teams[i].id }))

const stats = { previews: 0, timeouts: 0, delivered: [], errors: [] }
sockets.forEach((s, i) => {
  s.on('turn:question-received', ({ turnNum }) => {
    setTimeout(() => s.emit('respondent:send-answer', { sessionId, teamId: teams[i].id, message: ANSWERS[(turnNum - 1) % ANSWERS.length] }), 800)
  })
  s.on('turn:ai-answer-preview', () => { stats.previews++ })
  s.on('turn:answer-timeout', ({ turnNum }) => { stats.timeouts++; log(`  [${teams[i].name}] 턴${turnNum} 타임아웃(회피 문구)`) })
  s.on('error', (e) => { stats.errors.push(e.message); log(`  [${teams[i].name}] error: ${e.message}`) })
})

log(`교사 화면에서 "라운드 시작"을 눌러 주세요 (최대 15분 대기)...`)
const startedAll = await Promise.all(sockets.map((s) => once(s, 'round:started', 15 * 60 * 1000)))
const info = startedAll[0]
const totalTurns = info.totalTurns ?? info.turns ?? 8
log(`라운드 ${info.roundNum} 시작: 말투 ${info.style}, AI ${info.aiModel}, 턴 ${totalTurns}, 지연 ${info.responseDelay}s, 브리핑 ${info.briefingTime}s`)
const roles = startedAll.map((p, i) => `${teams[i].name}=${p.role}`)
log(`역할: ${roles.join(', ')}`)
if (info.briefingTime > 0) { log('브리핑 대기...'); await once(sockets[0], 'chat:started', (info.briefingTime + 15) * 1000) }

const judgeIdxs = startedAll.map((p, i) => (p.role === 'judge' ? i : -1)).filter((i) => i >= 0)
const voteP = once(sockets[judgeIdxs[0]], 'vote:phase-started', (totalTurns * (info.responseDelay + 25) + 180) * 1000)
await Promise.all(judgeIdxs.map(async (idx) => {
  const s = sockets[idx]
  for (let k = 0; k < totalTurns; k++) {
    const deliveredP = once(s, 'turn:answer-delivered', (info.responseDelay + 45) * 1000)
    const t0 = Date.now()
    s.emit('judge:send-question', { sessionId, teamId: teams[idx].id, message: QUESTIONS[(k + idx) % QUESTIONS.length] })
    const d = await deliveredP
    stats.delivered.push(Date.now() - t0)
    log(`  [${teams[idx].name}] 턴${d.turnNum} 답변 (${((Date.now() - t0) / 1000).toFixed(1)}s): ${d.styledAnswer}`)
  }
}))
log('모든 심판 팀 턴 완료 → 투표 단계 대기')
await voteP
for (const idx of judgeIdxs) {
  sockets[idx].emit('vote:submit', { sessionId, teamId: teams[idx].id, votes: Array.from({ length: totalTurns }, (_, k) => ({ turn: k + 1, verdict: (k + idx) % 2 ? 'human' : 'ai' })) })
}
log(`심판 ${judgeIdxs.length}팀 투표 제출. 교사 화면에서 "투표 강제 마감" 뒤 "결과 공개"를 눌러 주세요 (최대 15분 대기)...`)
const results = await once(sockets[judgeIdxs[0]], 'round:results', 15 * 60 * 1000)
log('=== 결과 ===')
for (const t of results.teamResults) log(`  ${t.teamName}: ${t.correct}/${t.total} 정답, +${t.earned}점, 누적 ${t.totalScore}${t.isSoloJudge ? ' (관찰자)' : ''}`)
log(`  학급 통계: 정답률 ${results.stats.accuracy}%, AI 식별 ${results.stats.aiAiRate}%, 사람 식별 ${results.stats.humanHumanRate}%, AI가 사람으로 판정된 비율 ${results.stats.aiFooledRate}% (튜링 통과: ${results.stats.turingPassed})`)
const avg = stats.delivered.length ? (stats.delivered.reduce((a, b) => a + b, 0) / stats.delivered.length / 1000).toFixed(1) : '-'
log(`  답변 전달 ${stats.delivered.length}건, 평균 ${avg}s, 최대 ${(Math.max(...stats.delivered) / 1000).toFixed(1)}s / AI 미리보기 ${stats.previews}, 타임아웃 ${stats.timeouts}, error ${stats.errors.length}`)
sockets.forEach((s) => s.disconnect())
process.exit(0)
