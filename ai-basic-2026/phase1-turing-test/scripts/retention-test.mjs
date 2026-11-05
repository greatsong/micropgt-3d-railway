// 보존 기간 삭제 시험. 메모리 DB만 쓴다. 실행: node scripts/retention-test.mjs ./node_modules
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { purgeExpiredSessions } from '../server/retention.js'
const require = createRequire(path.resolve(process.argv[2] || 'node_modules') + '/')
const Database = require('better-sqlite3')

const db = new Database(':memory:')
db.exec(fs.readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'))
db.pragma('foreign_keys = ON')
const seed = (id, age) => {
  db.prepare("INSERT INTO sessions (id, teacher_code, created_at) VALUES (?, ?, datetime('now', ?))").run(id, id, age)
  const team = db.prepare("INSERT INTO teams (session_id, name, members, color) VALUES (?, 't', '[]', '#000000')").run(id).lastInsertRowid
  db.prepare("INSERT INTO students (session_id, team_id, name) VALUES (?, ?, 's')").run(id, team)
  const round = db.prepare("INSERT INTO rounds (session_id, round_number, style_name, total_turns, chat_time, response_delay, vote_time) VALUES (?, 1, 's', 1, 1, 1, 1)").run(id).lastInsertRowid
  db.prepare('INSERT INTO pairings (round_id, team_a_id, team_b_id) VALUES (?, ?, ?)').run(round, team, team)
  db.prepare("INSERT INTO turns (round_id, team_id, turn_number, respondent_type) VALUES (?, ?, 1, 'ai')").run(round, team)
}
seed('old', '-10 days')
seed('new', '-2 hours')
let failed = 0
const check = (name, ok) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`); if (!ok) failed += 1 }
const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n
for (const value of [0, 0.5, -1, NaN]) check(`${value}일은 아무것도 지우지 않는다`, purgeExpiredSessions(db, value) === 0 && count('sessions') === 2)
check('7일은 오래된 세션만 지운다', purgeExpiredSessions(db, 7) === 1 && count('sessions') === 1)
for (const table of ['teams', 'students', 'rounds', 'pairings', 'turns']) check(`${table}도 함께 지워진다`, count(table) === 1)
process.exit(failed ? 1 : 0)
