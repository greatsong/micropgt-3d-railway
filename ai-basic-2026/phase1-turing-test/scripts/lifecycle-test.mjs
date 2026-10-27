// 수정 후 검증: 입장 코드 토큰 인증 + 생명주기 반복 + 중복 시작 거부 + 대화 중 결과 공개 정리 + 10세션 동시(4모델)
// 실행: 서버를 PORT=4999 TEACHER_PIN=000000 으로 띄운 뒤  node scripts/lifecycle-test.mjs ./node_modules
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(path.resolve(process.argv[2] || 'node_modules') + '/')
const { io } = require('socket.io-client')

const HOST = 'http://localhost:4999'
const OPTS = { path: '/turing-test/socket.io', transports: ['websocket'] }
const BASE = `${HOST}/turing-test/api`
const PIN = process.env.TEST_PIN || '000000'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const problems = []
const flag = (msg) => { problems.push(msg); log('!! ' + msg) }
let TOKEN = ''

async function api(method, path, body, headers = {}) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(TOKEN ? { 'x-teacher-token': TOKEN } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  const d = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data: d }
}
const apiPost = async (p, b) => { const r = await api('POST', p, b); if (!r.ok) throw new Error(`${p} ${r.status} ${r.data.error}`); return r.data }
const apiGet = async (p) => (await api('GET', p)).data

function connect() { return new Promise((resolve, reject) => { const s = io(HOST, OPTS); s.on('connect', () => resolve(s)); s.on('connect_error', reject) }) }
function once(socket, event, timeoutMs = 30000) {
  return new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs); socket.once(event, (p) => { clearTimeout(t); resolve(p) }) })
}
const QUESTIONS = ['좋아하는 음식이 뭐야?', '주말에 보통 뭐 해?', '요즘 뭐에 빠져 있어?', '좋아하는 계절은?']
const ANSWERS = ['떡볶이 좋아해', '집에서 쉬어', '게임이지', '가을이 좋아']

async function setupSession(code, nTeams) {
  const session = await apiPost('/session', { teacherCode: code })
  const teams = []
  for (let i = 1; i <= nTeams; i++) teams.push(await apiPost(`/session/${session.id}/team`, { name: `${i}조`, members: [`A${i}`, `B${i}`] }))
  const teacher = await connect()
  const sockets = []
  for (const t of teams) sockets.push(await connect())
  teacher.emit('teacher:join', { sessionId: session.id, token: TOKEN })
  sockets.forEach((s, i) => s.emit('team:join', { sessionId: session.id, teamId: teams[i].id }))
  const ctx = { session, teams, teacher, sockets, errors: [], ticks: 0, aiPreviews: 0, timeouts: 0, aiErrors: 0 }
  teacher.on('error', (e) => ctx.errors.push(e.message))
  teacher.on('ai:error', () => { ctx.aiErrors++ })
  teacher.on('timer:tick', () => { ctx.ticks++ })
  sockets.forEach((s, i) => {
    s.on('turn:question-received', () => { setTimeout(() => s.emit('respondent:send-answer', { sessionId: session.id, teamId: teams[i].id, message: ANSWERS[Math.floor(Math.random() * ANSWERS.length)] }), 300) })
    s.on('turn:ai-answer-preview', () => { ctx.aiPreviews++ })
    s.on('turn:answer-timeout', () => { ctx.timeouts++ })
  })
  await wait(200)
  return ctx
}
const emitT = (ctx, event, payload = {}) => ctx.teacher.emit(event, { sessionId: ctx.session.id, token: TOKEN, ...payload })

async function playRound(ctx, { turns = 2, responseDelay = 6, aiModel = 'claude', style = '자연스러운대화', expectRoundNum }) {
  const { session, teams, teacher, sockets } = ctx
  const startedP = once(teacher, 'round:started', 15000)
  emitT(ctx, 'round:start', { style, turns, chatTime: 90, responseDelay, voteTime: 30, pointValue: 1, aiModel, briefingTime: 0 })
  const started = await startedP
  if (expectRoundNum && started.roundNum !== expectRoundNum) flag(`[${session.teacher_code}] roundNum 기대 ${expectRoundNum}, 실제 ${started.roundNum}`)
  const judges = started.teams.filter((t) => t.role === 'judge')
  const voteP = once(teacher, 'vote:phase-started', turns * (responseDelay + 4) * 1000 + 20000)
  await Promise.all(judges.map(async (j) => {
    const idx = teams.findIndex((t) => t.id === j.id)
    const s = sockets[idx]
    for (let k = 0; k < turns; k++) {
      const deliveredP = once(s, 'turn:answer-delivered', (responseDelay + 15) * 1000)
      s.emit('judge:send-question', { sessionId: session.id, teamId: j.id, message: QUESTIONS[k % QUESTIONS.length] })
      const d = await deliveredP
      if (!d.styledAnswer) flag(`[${session.teacher_code}] 빈 답변 턴 ${d.turnNum}`)
    }
  }))
  await voteP
  for (const j of judges) {
    const idx = teams.findIndex((t) => t.id === j.id)
    sockets[idx].emit('vote:submit', { sessionId: session.id, teamId: j.id, votes: Array.from({ length: turns }, (_, k) => ({ turn: k + 1, verdict: Math.random() > 0.5 ? 'human' : 'ai' })) })
  }
  await wait(300)
  emitT(ctx, 'round:force-end-vote')
  await wait(200)
  const resultsP = once(teacher, 'round:results', 10000)
  emitT(ctx, 'round:reveal')
  return { started, results: await resultsP }
}
function closeSockets(ctx) { ctx.teacher.disconnect(); ctx.sockets.forEach((s) => s.disconnect()) }

async function authTests() {
  log('=== 0부: 인증 ===')
  let r = await api('POST', '/session', { teacherCode: 'NOAUTH' })
  if (r.status !== 401) flag(`토큰 없이 세션 생성이 거부되지 않음 (${r.status})`); else log('토큰 없는 세션 생성 → 401 확인')
  r = await api('POST', '/auth/teacher', { pin: 'wrong-pin' })
  if (r.status !== 401) flag(`잘못된 입장 코드가 거부되지 않음 (${r.status})`); else log('잘못된 입장 코드 → 401 확인')
  r = await api('POST', '/auth/teacher', { apiKeys: { anthropic: 'sk-ant-garbage' } })
  if (r.status !== 401) flag(`가짜 Anthropic 키가 통과됨 (${r.status})`); else log('가짜 API 키 → 401 확인')
  r = await api('POST', '/auth/teacher', { pin: PIN })
  if (!r.ok || !r.data.token) throw new Error('입장 코드 인증 실패: ' + JSON.stringify(r.data))
  TOKEN = r.data.token
  log(`입장 코드 인증 OK, aiStatus=${JSON.stringify(r.data.aiStatus)}`)
  r = await api('GET', '/dashboard/x/rounds', null, { 'x-teacher-token': 'bogus' })
  if (r.status !== 401) flag(`가짜 토큰으로 대시보드 접근 가능 (${r.status})`); else log('가짜 토큰 대시보드 → 401 확인')
  // 학생 입장(join)은 토큰 없이 가능해야 함
  const saved = TOKEN; TOKEN = ''
  r = await api('POST', '/session', { teacherCode: 'NOPE-XX', mode: 'join' })
  if (r.status !== 404) flag(`학생 join이 404가 아님 (${r.status}: ${r.data.error})`); else log('학생 join(없는 코드) → 404 확인 (토큰 불필요)')
  TOKEN = saved
}

async function lifecycle() {
  log('=== 1부: 생명주기 반복 ===')
  const code = 'LC-' + Date.now().toString(36).slice(-4).toUpperCase()
  let ctx = await setupSession(code, 3)
  const s1 = ctx.session.id
  // 소켓 이벤트 토큰 검사: 가짜 토큰으로 round:start → error
  const badP = once(ctx.teacher, 'error', 5000).catch(() => null)
  ctx.teacher.emit('round:start', { sessionId: s1, token: 'bogus', style: '자연스러운대화', turns: 2, chatTime: 60, responseDelay: 6, voteTime: 30, pointValue: 1, aiModel: 'claude', briefingTime: 0 })
  const bad = await badP
  if (!bad || !bad.message.includes('인증')) flag('가짜 토큰 round:start가 거부되지 않음'); else log(`가짜 토큰 소켓 이벤트 거부: "${bad.message}"`)

  const r1 = await playRound(ctx, { expectRoundNum: 1, aiModel: 'gemini' })
  log(`세션1 R1(gemini): ${r1.results.teamResults.map((t) => `${t.teamName} ${t.correct}/${t.total}`).join(', ')} / stats.aiFooledRate=${r1.results.stats.aiFooledRate} turingPassed=${r1.results.stats.turingPassed}`)
  if (r1.results.stats.aiFooledRate === undefined) flag('stats.aiFooledRate 누락')

  // 중복 시작 거부: 라운드 시작 직후 다시 start
  const startedP = once(ctx.teacher, 'round:started', 10000)
  emitT(ctx, 'round:start', { style: '사극체', turns: 2, chatTime: 60, responseDelay: 6, voteTime: 30, pointValue: 1, aiModel: 'solar', briefingTime: 0 })
  await startedP
  const dupP = once(ctx.teacher, 'error', 5000).catch(() => null)
  emitT(ctx, 'round:start', { style: '사극체', turns: 2, chatTime: 60, responseDelay: 6, voteTime: 30, pointValue: 1, aiModel: 'solar', briefingTime: 0 })
  const dup = await dupP
  if (!dup || !dup.message.includes('진행 중')) flag('진행 중 라운드에서 round:start 중복이 거부되지 않음'); else log(`중복 시작 거부: "${dup.message}"`)
  // 대화 중 결과 공개는 거부되어야 함 (투표 건너뜀 방지)
  const revErrP = once(ctx.teacher, 'error', 5000).catch(() => null)
  emitT(ctx, 'round:reveal')
  const revErr = await revErrP
  if (!revErr || !revErr.message.includes('투표 단계')) flag('대화 중 round:reveal이 거부되지 않음'); else log(`대화 중 reveal 거부: "${revErr.message}"`)
  // 대화 강제 종료 → 투표 강제 마감 → 결과 공개 → 정리(타이머 멈춤) 확인
  emitT(ctx, 'round:force-end-chat'); await wait(400)
  emitT(ctx, 'round:force-end-vote'); await wait(400)
  const resP = once(ctx.teacher, 'round:results', 10000)
  emitT(ctx, 'round:reveal')
  await resP
  const t0 = ctx.ticks; await wait(2500)
  if (ctx.ticks !== t0) flag(`조기 종료·공개 뒤에도 timer:tick ${ctx.ticks - t0}회`); else log('대화 강제 종료 → 투표 마감 → 공개 → 타이머 정리 확인')
  // 다음 라운드 정상 시작되는지
  const r3 = await playRound(ctx, { expectRoundNum: 3, aiModel: 'gpt' })
  log(`세션1 R3(gpt): ${r3.results.teamResults.map((t) => `${t.teamName} ${t.correct}/${t.total}`).join(', ')}`)
  const finalP = once(ctx.teacher, 'tournament:final', 10000)
  emitT(ctx, 'tournament:end')
  const fin = await finalP
  log(`토너먼트 종료: ${fin.finalStandings?.length}팀, overall.aiFooledRate=${fin.overallStats?.aiFooledRate}`)
  const t1 = ctx.ticks; await wait(2000)
  if (ctx.ticks !== t1) flag('tournament:end 뒤에도 tick 수신')
  closeSockets(ctx)

  ctx = await setupSession(code, 4)
  if (ctx.session.id === s1) flag('ended 뒤 같은 코드가 새 세션이 아님')
  const r4 = await playRound(ctx, { expectRoundNum: 1, aiModel: 'claude' })
  log(`세션2 R1(claude): ${r4.results.teamResults.map((t) => `${t.teamName} ${t.correct}/${t.total}`).join(', ')}`)
  const sp = once(ctx.teacher, 'round:started', 10000)
  emitT(ctx, 'round:start', { style: 'AI체', turns: 2, chatTime: 60, responseDelay: 6, voteTime: 30, pointValue: 1, aiModel: 'solar', briefingTime: 0 })
  await sp
  const closedP = once(ctx.sockets[0], 'session:closed', 5000)
  emitT(ctx, 'session:close')
  await closedP
  const t2 = ctx.ticks; await wait(2000)
  if (ctx.ticks !== t2) flag('session:close 뒤에도 tick 수신'); else log('라운드 도중 session:close → 정리 확인')
  closeSockets(ctx)
  ctx = await setupSession(code, 2)
  const r5 = await playRound(ctx, { expectRoundNum: 1, aiModel: 'solar' })
  log(`세션3 R1(solar): ${r5.results.teamResults.map((t) => `${t.teamName} ${t.correct}/${t.total}`).join(', ')}`)
  if (ctx.errors.length) flag(`세션3 error: ${ctx.errors.join(' | ')}`)
  closeSockets(ctx)
}

async function concurrent(n = 10) {
  log(`=== 2부: ${n}세션 동시 (4모델 순환) ===`)
  const models = ['claude', 'gpt', 'gemini', 'solar']
  const t0 = Date.now()
  const res = await Promise.all(Array.from({ length: n }, async (_, i) => {
    const code = `CC-${i + 1}-${Date.now().toString(36).slice(-3).toUpperCase()}`
    const ctx = await setupSession(code, 4)
    try {
      const r = await playRound(ctx, { expectRoundNum: 1, aiModel: models[i % 4], responseDelay: 8 })
      return { code, model: models[i % 4], ok: true, errors: ctx.errors, previews: ctx.aiPreviews, timeouts: ctx.timeouts, aiErrors: ctx.aiErrors, teams: r.results.teamResults.length }
    } catch (e) { return { code, model: models[i % 4], ok: false, errors: [e.message] } } finally { closeSockets(ctx) }
  }))
  for (const r of res) log(`${r.code.padEnd(12)} ${r.model.padEnd(6)} ${r.ok ? 'OK ' : 'FAIL'} 팀 ${r.teams ?? '-'} AI미리보기 ${r.previews ?? '-'} 타임아웃 ${r.timeouts ?? '-'} AI오류알림 ${r.aiErrors ?? '-'} ${r.errors?.length ? '오류: ' + r.errors.join('|') : ''}`)
  const fails = res.filter((r) => !r.ok || r.aiErrors > 0)
  if (fails.length) flag(`동시 세션 실패/AI 오류 ${fails.length}/${n}`)
  log(`2부 완료 ${(Date.now() - t0) / 1000}s`)
}

try { await authTests(); await lifecycle(); await concurrent(10) } catch (e) { flag('테스트 자체 실패: ' + e.message) }
log('=== 요약 ===')
if (!problems.length) log('문제 없음'); else problems.forEach((p) => log('- ' + p))
process.exit(problems.length ? 1 : 0)
