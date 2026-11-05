// 개인정보 보호 회귀 시험. 서버를 TURING_DB_DIR=<임시폴더> PORT=4999 TEACHER_PIN=000000 으로 띄운 뒤
//   node scripts/security-test.mjs ./node_modules
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(path.resolve(process.argv[2] || 'node_modules') + '/')
const { io } = require('socket.io-client')

const HOST = process.env.TEST_HOST || 'http://localhost:4999'
const BASE = `${HOST}/turing-test/api`
const OPTS = { path: '/turing-test/socket.io', transports: ['websocket'] }
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let failed = 0
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed += 1 }

async function api(method, p, body, headers = {}) {
  const r = await fetch(BASE + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => ({})), headers: r.headers }
}
const connect = () => new Promise((resolve) => { const s = io(HOST, OPTS); s.on('connect', () => resolve(s)) })
const teacherLogin = async (teacherId) => (await api('POST', '/auth/teacher', { pin: process.env.TEST_PIN || '000000', teacherId })).data

const A = await teacherLogin('teacherAAAA1234')
const B = await teacherLogin('teacherBBBB1234')
const code = `SEC${Date.now().toString(36).slice(-5)}`.toUpperCase()
const created = (await api('POST', '/session', { teacherCode: code }, { 'x-teacher-token': A.token })).data
check('교사 세션 생성 시 입장 토큰 포함', Boolean(created.joinToken))

check('수업 코드에 임의 문자열이 붙는다', new RegExp(`^${code}-[A-Z2-9]{5}$`).test(created.teacher_code))
const again = (await api('POST', '/session', { teacherCode: code }, { 'x-teacher-token': A.token })).data
check('같은 교사가 낱말을 다시 입력하면 자기 수업을 이어 간다', again.id === created.id)
check('낱말만으로는 학생이 입장하지 못한다', (await api('POST', '/session', { teacherCode: code, mode: 'join' })).status === 404)
const join = (await api('POST', '/session', { teacherCode: created.teacher_code, mode: 'join' })).data
check('학생은 코드로 입장 토큰을 받는다', join.joinToken === created.joinToken)
check('세션 응답에 소유자 값 없음', !('owner_teacher_id' in join) && !('join_token' in join))

const student = { 'x-join-token': join.joinToken }
const t1 = (await api('POST', `/session/${join.id}/team`, { name: '일조', members: ['김철수', '이영희'] }, student)).data
const t2 = (await api('POST', `/session/${join.id}/team`, { name: '이조', members: ['박민수'] }, student)).data
check('팀 등록 가능', Boolean(t1.id && t2.id))
check('토큰 없는 팀 등록 거부', (await api('POST', `/session/${join.id}/team`, { name: 'x', members: ['y'] })).status === 403)
check('이름 형식 검증', (await api('POST', `/session/${join.id}/team`, { name: 'x', members: 'y' }, student)).status === 400)

const anonTeam = await api('GET', `/team/${t1.id}`)
check('토큰 없이 팀 조회 불가(404)', anonTeam.status === 404 && !anonTeam.data.members)
const anonSession = await api('GET', `/session/${join.id}`)
check('토큰 없이 세션 조회 시 상태만', anonSession.status === 200 && !anonSession.data.teams && !anonSession.data.teacher_code)
check('토큰 없이 팀 목록 불가', (await api('GET', `/session/${join.id}/teams`)).status === 403)

const studentTeam = await api('GET', `/team/${t1.id}`, null, student)
check('학생 응답은 이름을 가린다', studentTeam.status === 200 && studentTeam.data.members[0] === '김○○')
const teacherTeam = await api('GET', `/team/${t1.id}`, null, { 'x-teacher-token': A.token })
check('소유 교사는 실명을 본다', teacherTeam.data.members?.[0] === '김철수')
const otherTeacher = await api('GET', `/team/${t1.id}`, null, { 'x-teacher-token': B.token })
check('다른 교사는 팀을 못 본다', otherTeacher.status === 404)
check('다른 교사는 대시보드를 못 본다', (await api('GET', `/dashboard/${join.id}/rounds`, null, { 'x-teacher-token': B.token })).status === 403)
check('없는 세션 대시보드 거부', (await api('GET', '/dashboard/nosuchsession/rounds', null, { 'x-teacher-token': B.token })).status === 403)

// 소켓: 교사 방 주입과 토큰 없는 입장
const spy = await connect()
const spied = []
spy.onAny((event) => spied.push(event))
spy.emit('team:join', { sessionId: `${join.id}:teacher`, teamId: t1.id, joinToken: join.joinToken })
spy.emit('team:join', { sessionId: join.id, teamId: t1.id })
const teacherSock = await connect()
teacherSock.emit('teacher:join', { sessionId: join.id, token: A.token })
const s1 = await connect()
const s2 = await connect()
s1.emit('team:join', { sessionId: join.id, teamId: t1.id, joinToken: join.joinToken })
s2.emit('team:join', { sessionId: join.id, teamId: t2.id, joinToken: join.joinToken })
await wait(300)
teacherSock.emit('round:start', { sessionId: join.id, style: '뉴스체', turns: 1, chatTime: 20, responseDelay: 5, voteTime: 10, pointValue: 1, aiModel: 'claude', briefingTime: 0, token: A.token })
await wait(500)
check('토큰 없는 소켓은 수업 이벤트를 받지 못한다', spied.length > 0 && spied.every((event) => event === 'team:join:error'))

const received = []
s2.on('turn:question-received', (p) => received.push(p))
s1.on('turn:question-received', (p) => received.push(p))
s2.emit('judge:send-question', { sessionId: join.id, teamId: t1.id, message: '남의 팀 이름으로 보낸 질문' })
await wait(300)
const rounds = (await api('GET', `/dashboard/${join.id}/rounds`, null, { 'x-teacher-token': A.token })).data
const detail = (await api('GET', `/dashboard/${join.id}/round/${rounds[0].id}`, null, { 'x-teacher-token': A.token })).data
const spoofed = detail.teamProgress.flatMap((team) => team.turns).some((turn) => turn.question_text?.includes('남의 팀 이름'))
check('다른 팀 이름으로 질문 불가', !spoofed)

// 다른 수업의 라운드 번호로 대화 읽기
const code2 = `${code}X`.slice(-8)
const other = (await api('POST', '/session', { teacherCode: code2 }, { 'x-teacher-token': B.token })).data
check('라운드가 다른 세션이면 404', (await api('GET', `/dashboard/${other.id}/round/${rounds[0].id}`, null, { 'x-teacher-token': B.token })).status === 404)

// 다른 교사는 낱말이 같아도 새 수업을 받고, 전체 코드로는 거부된다
check('다른 교사는 전체 코드로 남의 수업을 열지 못한다', (await api('POST', '/session', { teacherCode: created.teacher_code }, { 'x-teacher-token': B.token })).status === 409)
const sameWord = (await api('POST', '/session', { teacherCode: code }, { 'x-teacher-token': B.token })).data
check('같은 낱말을 고른 다른 교사는 별도 수업을 받는다', sameWord.id && sameWord.id !== created.id)

// CORS
const cors = await fetch(`${BASE}/health`, { headers: { Origin: 'https://evil.example' } })
check('외부 사이트에 CORS 허용 헤더 없음', !cors.headers.get('access-control-allow-origin'))

// 소유자가 비어 있는 옛 세션 (TEST_DB=<turing.db 임시 경로>일 때만)
if (process.env.TEST_DB) {
  const Database = require('better-sqlite3')
  const raw = new Database(process.env.TEST_DB)
  raw.prepare("INSERT INTO sessions (id, teacher_code, status) VALUES ('legacyActive1', 'OLD-ACTIVE', 'active'), ('legacyEnded01', 'OLD-ENDED', 'ended')").run()
  raw.close()
  const asA = { 'x-teacher-token': A.token }
  const asB = { 'x-teacher-token': B.token }
  check('옛 세션을 세션 id만으로 가져가지 못한다', (await api('GET', '/dashboard/legacyActive1/rounds', null, asB)).status === 403)
  check('옛 세션 소켓 입장 거부 뒤에도 소유자 없음 유지', (await api('GET', '/dashboard/legacyActive1/rounds', null, asA)).status === 403)
  check('코드를 직접 입력한 입장 코드 교사가 넘겨받는다', (await api('POST', '/session', { teacherCode: 'OLD-ACTIVE' }, asA)).data.id === 'legacyActive1')
  check('넘겨받은 뒤 다른 교사는 409', (await api('POST', '/session', { teacherCode: 'OLD-ACTIVE' }, asB)).status === 409)
  check('넘겨받은 교사는 대시보드를 본다', (await api('GET', '/dashboard/legacyActive1/rounds', null, asA)).status === 200)
  check('끝난 옛 세션은 자동으로 넘어가지 않는다', (await api('GET', '/dashboard/legacyEnded01/summary', null, asA)).status === 403)
  const check2 = new Database(process.env.TEST_DB, { readonly: true })
  check('끝난 옛 세션의 기록은 남아 있다', Boolean(check2.prepare("SELECT 1 FROM sessions WHERE id = 'legacyEnded01'").get()))
  check2.close()
}

// 입장 코드 제한: 차단 뒤에는 맞는 코드도 통과하지 않는다
if (process.env.TEST_RATE_LIMIT === '1') {
  for (let i = 0; i < 31; i++) await api('POST', '/auth/teacher', { pin: `wrong${i}` })
  check('차단 뒤 맞는 코드도 429', (await api('POST', '/auth/teacher', { pin: process.env.TEST_PIN || '000000' })).status === 429)
  let status = 0
  for (let i = 0; i < 31; i++) status = (await api('POST', '/session', { teacherCode: `NOPE${i}`, mode: 'join' })).status
  check('수업 코드 추측 제한', status === 429)
}

for (const s of [spy, teacherSock, s1, s2]) s.disconnect()
console.log(failed ? `실패 ${failed}건` : '모두 통과')
process.exit(failed ? 1 : 0)
