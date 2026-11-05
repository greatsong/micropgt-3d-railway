// 소유자 저장 기능 이전에 만든 세션의 소유 교사를 운영자가 지정한다. 기록은 지우지 않는다.
// 교사 식별자는 그 교사 브라우저의 localStorage 'turing_test_teacher_id' 값이다.
//   node scripts/assign-session-owner.mjs --list
//   node scripts/assign-session-owner.mjs --session <세션 id> --teacher <교사 식별자>
// 출력에는 세션 id, 상태, 팀 수만 나온다. 수업 코드·학생 이름은 출력하지 않는다.
import db from '../server/db.js'

const args = process.argv.slice(2)
const value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

if (args.includes('--list')) {
  const rows = db.prepare(`
    SELECT s.id, s.status, s.created_at, COUNT(t.id) AS teams
    FROM sessions s LEFT JOIN teams t ON t.session_id = s.id
    WHERE s.owner_teacher_id IS NULL GROUP BY s.id ORDER BY s.created_at
  `).all()
  console.table(rows)
  process.exit(0)
}

const sessionId = value('--session')
const teacherId = value('--teacher')
if (!sessionId || !/^[A-Za-z0-9_-]{8,64}$/.test(teacherId || '')) {
  console.error('--session과 --teacher(영문·숫자 8~64자)를 지정하세요.')
  process.exit(1)
}
const result = db.prepare('UPDATE sessions SET owner_teacher_id = ? WHERE id = ? AND owner_teacher_id IS NULL').run(teacherId, sessionId)
console.log(result.changes === 1 ? '소유자를 지정했습니다.' : '대상이 없습니다. 세션 id를 확인하거나 이미 소유자가 있는 세션입니다.')
