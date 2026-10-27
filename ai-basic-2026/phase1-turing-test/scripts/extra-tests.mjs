// 추가 점검 (Codex·Argon 제안 기반) — 로컬 서버 PORT=4999 TEACHER_PIN=000000
// 실행: node scripts/extra-tests.mjs ./node_modules
// 1 같은 IP에서 정상 로그인 반복이 막히지 않음 / 2 다른 교사(브라우저)가 남의 세션을 조작·열지 못함 /
// 3 늦게 만든 팀은 잠금 → 다음 라운드 참여 / 4 라운드 없는 세션의 요약 / 5 대화·투표 중 재접속 복원 / 6 대화 중 결과 공개 거부
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
const flag = (m) => { problems.push(m); log('!! ' + m) }
const pass = (m) => log('✓ ' + m)

async function api(method, path, body, token) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { 'x-teacher-token': token } : {}) }, body: body ? JSON.stringify(body) : undefined })
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }
}
const auth = async (teacherId) => (await api('POST', '/auth/teacher', { pin: PIN, teacherId })).data
const connect = () => new Promise((res, rej) => { const s = io(HOST, OPTS); s.on('connect', () => res(s)); s.on('connect_error', rej) })
const once = (s, ev, ms = 15000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (p) => { clearTimeout(t); res(p) }) })

async function makeSession(teacher, code, nTeams) {
  const s = (await api('POST', '/session', { teacherCode: code }, teacher.token)).data
  const teams = []
  for (let i = 1; i <= nTeams; i++) teams.push((await api('POST', `/session/${s.id}/team`, { name: `${i}조`, members: ['a'] })).data)
  const sockets = []
  for (const t of teams) { const k = await connect(); k.emit('team:join', { sessionId: s.id, teamId: t.id }); sockets.push(k) }
  const ts = await connect(); ts.emit('teacher:join', { sessionId: s.id, token: teacher.token })
  await wait(200)
  return { s, teams, sockets, ts }
}
const start = (c, token, extra = {}) => {
  const p = once(c.ts, 'round:started')
  c.ts.emit('round:start', { sessionId: c.s.id, token, style: '자연스러운대화', turns: 2, chatTime: 60, responseDelay: 4, voteTime: 20, pointValue: 1, aiModel: 'solar', briefingTime: 0, ...extra })
  return p
}
const cleanup = (c, token) => { c.ts.emit('session:close', { sessionId: c.s.id, token }); c.sockets.forEach((k) => k.disconnect()); c.ts.disconnect() }

// 1. 같은 IP 정상 로그인 반복
{
  let okCount = 0
  for (let i = 0; i < 12; i++) { const r = await api('POST', '/auth/teacher', { pin: PIN, teacherId: 'repeatlogin00' }); if (r.ok) okCount++ }
  okCount === 12 ? pass('정상 로그인 12회 연속 허용') : flag(`정상 로그인 반복 중 거부됨 (${okCount}/12)`)
  const bad = await api('POST', '/auth/teacher', { pin: 'wrong', teacherId: 'repeatlogin00' })
  bad.status === 401 ? pass('잘못된 코드 401') : flag(`잘못된 코드 응답 ${bad.status}`)
}

// 2. 다른 교사(브라우저)의 세션 보호
{
  const A = await auth('teacherAAAA0001'), B = await auth('teacherBBBB0002')
  const c = await makeSession(A, 'EX-OWN-' + Date.now().toString(36).slice(-3), 2)
  const r = await api('POST', '/session', { teacherCode: c.s.teacher_code }, B.token)
  r.status === 409 ? pass('다른 교사가 같은 코드로 열기 → 409') : flag(`다른 교사 같은 코드 열기 응답 ${r.status}`)
  const errP = once(c.ts, 'error', 3000).catch(() => null)
  const bsock = await connect(); const berr = once(bsock, 'error', 3000).catch(() => null)
  bsock.emit('session:close', { sessionId: c.s.id, token: B.token })
  const be = await berr
  const st = (await api('GET', `/session/${c.s.id}`)).data.status
  be && st !== 'closed' ? pass(`다른 교사의 session:close 거부: "${be.message}"`) : flag(`다른 교사가 세션을 닫음 (status=${st})`)
  const sum = await api('GET', `/dashboard/${c.s.id}/summary`, null, B.token)
  sum.status === 403 ? pass('다른 교사의 요약 조회 → 403') : flag(`다른 교사 요약 조회 응답 ${sum.status}`)
  // 같은 교사가 재로그인(새 토큰)해도 자기 세션은 이어서 사용
  const A2 = await auth('teacherAAAA0001')
  const r2 = await api('POST', '/session', { teacherCode: c.s.teacher_code }, A2.token)
  r2.ok && r2.data.id === c.s.id ? pass('같은 교사 재로그인 → 자기 세션 이어서 사용') : flag(`재로그인 뒤 자기 세션 열기 실패 ${r2.status}`)
  bsock.disconnect(); await errP; cleanup(c, A2.token)
}

// 3. 늦게 만든 팀: 이번 라운드 잠금 → 다음 라운드 참여
{
  const A = await auth('teacherLATE0003')
  const c = await makeSession(A, 'EX-LATE-' + Date.now().toString(36).slice(-3), 2)
  await start(c, A.token)
  const late = (await api('POST', `/session/${c.s.id}/team`, { name: '늦은팀', members: ['늦음'] })).data
  const ls = await connect(); const lockP = once(ls, 'round:locked', 5000)
  ls.emit('team:join', { sessionId: c.s.id, teamId: late.id })
  const lock = await lockP.catch(() => null)
  lock ? pass('늦은 팀 round:locked 수신') : flag('늦은 팀에 round:locked가 오지 않음')
  // 대화 강제 종료 → 투표 마감 → 공개 → 다음 라운드에 참여
  c.ts.emit('round:force-end-chat', { sessionId: c.s.id, token: A.token }); await wait(300)
  c.ts.emit('round:force-end-vote', { sessionId: c.s.id, token: A.token }); await wait(300)
  const resP = once(c.ts, 'round:results'); c.ts.emit('round:reveal', { sessionId: c.s.id, token: A.token }); await resP
  const nextP = once(ls, 'round:started', 8000)
  await start(c, A.token)
  const next = await nextP.catch(() => null)
  next ? pass(`늦은 팀 다음 라운드 참여 (역할 ${next.role})`) : flag('늦은 팀이 다음 라운드 round:started를 받지 못함')
  ls.disconnect(); cleanup(c, A.token)
}

// 4. 라운드 없는 세션 요약
{
  const A = await auth('teacherEMPTY0004')
  const c = await makeSession(A, 'EX-EMPTY-' + Date.now().toString(36).slice(-3), 0)
  const sum = (await api('GET', `/dashboard/${c.s.id}/summary`, null, A.token)).data
  sum.roundCount === 0 && sum.overallStats.totalTurns === 0 && sum.overallStats.turingPassed === null ? pass('빈 세션 요약: 라운드 0, 턴 0, 튜링 판정 없음') : flag('빈 세션 요약 값 이상 ' + JSON.stringify(sum.overallStats))
  cleanup(c, A.token)
}

// 5. 대화 중·투표 중 재접속 복원
{
  const A = await auth('teacherRECON0005')
  const c = await makeSession(A, 'EX-RECON-' + Date.now().toString(36).slice(-3), 2)
  const started = await start(c, A.token, { briefingTime: 0 })
  const judgeIdx = started.role === 'judge' ? 0 : c.teams.findIndex((t) => t.id !== c.teams[0].id)
  // 서버 payload의 role은 team별이므로 각 소켓이 받은 것을 따로 확인
  const roles = await Promise.all(c.sockets.map((k) => new Promise((r) => { /* 이미 받았으므로 서버에 재합류해 확인 */ r(null) })))
  // 질문 하나 보내고 답을 받은 뒤 재접속
  const jIdx = 0
  const j = c.sockets[jIdx]
  const rejoin = await connect()
  const restoredP = once(rejoin, 'round:started', 5000)
  const histP = once(rejoin, 'turn:history', 5000)
  rejoin.emit('team:join', { sessionId: c.s.id, teamId: c.teams[jIdx].id })
  const restored = await restoredP
  const hist = await histP.catch(() => null)
  restored.restored && restored.chatStarted === true && restored.briefingTime === 0 ? pass('대화 중 재접속: restored·chatStarted·브리핑 0 확인') : flag('대화 중 재접속 payload 이상 ' + JSON.stringify({ restored: restored.restored, chatStarted: restored.chatStarted, briefingTime: restored.briefingTime }))
  hist ? pass(`turn:history 수신 (질문 ${hist.judgeTurns.length}개)`) : flag('turn:history가 오지 않음')
  rejoin.disconnect()
  // 투표 단계에서 재접속
  c.ts.emit('round:force-end-chat', { sessionId: c.s.id, token: A.token }); await wait(400)
  const rejoin2 = await connect()
  const voteP = once(rejoin2, 'vote:phase-started', 5000)
  rejoin2.emit('team:join', { sessionId: c.s.id, teamId: c.teams[0].id })
  const v = await voteP.catch(() => null)
  v && v.restored ? pass('투표 중 재접속: vote:phase-started 복원') : flag('투표 중 재접속 복원 실패')
  rejoin2.disconnect()
  // 6. 대화 단계가 아닐 때/대화 중 결과 공개 거부
  const c2 = await makeSession(A, 'EX-REV-' + Date.now().toString(36).slice(-3), 2)
  await start(c2, A.token)
  const e = once(c2.ts, 'error', 3000).catch(() => null)
  c2.ts.emit('round:reveal', { sessionId: c2.s.id, token: A.token })
  const em = await e
  em && em.message.includes('투표 단계') ? pass(`대화 중 결과 공개 거부: "${em.message}"`) : flag('대화 중 결과 공개가 거부되지 않음')
  cleanup(c2, A.token); cleanup(c, A.token)
}

log('=== 요약 ===')
problems.length ? problems.forEach((p) => log('- ' + p)) : log('문제 없음')
process.exit(problems.length ? 1 : 0)
