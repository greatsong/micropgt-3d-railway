// 교사 토큰 만료 시험. 서버를 TEACHER_TOKEN_TTL_MS=1500 TURING_DB_DIR=<임시폴더> PORT=4999 TEACHER_PIN=000000 으로 띄운 뒤
//   node scripts/security-test-expiry.mjs ./node_modules
import { createRequire } from 'module'
import path from 'path'
const require = createRequire(path.resolve(process.argv[2] || 'node_modules') + '/')
const { io } = require('socket.io-client')

const HOST = 'http://localhost:4999'
const BASE = `${HOST}/turing-test/api`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const post = async (p, body, headers = {}) => (await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })).json()

const teacher = await post('/auth/teacher', { pin: process.env.TEST_PIN || '000000', teacherId: 'expiryTeacher01' })
const session = await post('/session', { teacherCode: 'EXPIRY' }, { 'x-teacher-token': teacher.token })
const socket = await new Promise((resolve) => { const s = io(HOST, { path: '/turing-test/socket.io', transports: ['websocket'] }); s.on('connect', () => resolve(s)) })
const events = []
socket.onAny((event) => events.push(event))
socket.emit('teacher:join', { sessionId: session.id, token: teacher.token })
await wait(200)
const member = { 'x-join-token': session.joinToken }
await post(`/session/${session.id}/team`, { name: '만료 전', members: ['가'] }, member)
await wait(200)
const before = events.includes('team:registered')
await wait(1800)
events.length = 0
await post(`/session/${session.id}/team`, { name: '만료 뒤', members: ['나'] }, member)
await wait(300)
const after = events.includes('team:registered')
console.log(before ? 'ok   만료 전에는 교사 이벤트를 받는다' : 'FAIL 만료 전 이벤트 없음')
console.log(!after ? 'ok   만료 뒤에는 교사 이벤트를 받지 않는다' : 'FAIL 만료 뒤에도 수신')
socket.disconnect()
process.exit(before && !after ? 0 : 1)
