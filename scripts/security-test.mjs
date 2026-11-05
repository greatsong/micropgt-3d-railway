// GPT야 놀자 소켓 개인정보 회귀 시험 (Next 없이 소켓 서버만 띄운다). 실행: TEACHER_PASSWORD=test-pw node scripts/security-test.mjs
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as client } from 'socket.io-client';

process.env.TEACHER_PASSWORD ||= 'test-pw';
const { registerSocketHandlers } = await import('../backend/socketHandlers.js');

const logs = [];
const originalLog = console.log;
console.log = (...args) => { logs.push(args.join(' ')); };

const http = createServer();
const io = new Server(http);
registerSocketHandlers(io);
await new Promise((resolve) => http.listen(0, resolve));
const url = `http://localhost:${http.address().port}`;
const connect = () => new Promise((resolve) => { const s = client(url, { transports: ['websocket'] }); s.on('connect', () => resolve(s)); });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let failed = 0;
const check = (name, ok) => { originalLog(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed += 1; };

const NAME = '10101 김철수';
const teacher = await connect();
const teacherEvents = [];
teacher.onAny((event, payload) => teacherEvents.push([event, payload]));
teacher.emit('join_dashboard', { roomCode: 'ROOM1', password: 'test-pw' });
await wait(100);

const a = await connect();
a.emit('join_class', { studentName: '일조', memberNames: NAME, roomCode: 'ROOM1', stableId: 'stable-a' });
await wait(100);
const b = await connect();
const studentEvents = [];
b.onAny((event, payload) => studentEvents.push([event, payload]));
b.emit('join_class', { studentName: '이조', memberNames: '10102 이영희', roomCode: 'ROOM1', stableId: 'stable-b' });
await wait(100);
const c = await connect();
c.emit('join_class', { studentName: '삼조', memberNames: '10103 박민수', roomCode: 'ROOM1', stableId: 'stable-c' });
await wait(200);

const studentDump = JSON.stringify(studentEvents);
const teacherDump = JSON.stringify(teacherEvents);
check('학생은 다른 팀의 학번·이름을 받지 않는다', !studentDump.includes('김철수') && !studentDump.includes('박민수'));
check('학생은 재접속 식별자를 받지 않는다', !studentDump.includes('stable-a'));
check('교사는 학번·이름을 받는다', teacherDump.includes('김철수') && teacherDump.includes('박민수'));
check('로그에 학번·이름이 없다', !logs.some((line) => /김철수|이영희|일조|10101/.test(line)));

const attacker = await connect();
const errors = [];
attacker.on('auth_error', (payload) => errors.push(payload.message));
let granted = false;
attacker.on('room_state', () => { granted = true; });
for (let i = 0; i < 21; i += 1) attacker.emit('join_dashboard', { roomCode: 'ROOM1', password: `wrong${i}` });
await wait(200);
attacker.emit('join_dashboard', { roomCode: 'ROOM1', password: 'test-pw' });
await wait(200);
check('비밀번호 실패 제한 뒤에는 맞아도 막힌다', !granted && errors.at(-1)?.includes('너무 많습니다'));

for (const s of [teacher, a, b, c, attacker]) s.disconnect();
http.close();
io.close();
originalLog(failed ? `실패 ${failed}건` : '모두 통과');
process.exit(failed ? 1 : 0);
