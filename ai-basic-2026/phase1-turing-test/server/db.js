import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 프로덕션: /data 볼륨, 개발: ./db
// TURING_DB_DIR을 주면 그 폴더를 쓴다 (시험이 운영·개발 DB를 건드리지 않게 하려는 용도)
const dbDir = process.env.TURING_DB_DIR || (fs.existsSync('/data') ? '/data' : join(__dirname, 'db'))
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

const db = new Database(join(dbDir, 'turing.db'))

// WAL 모드 + 외래 키 활성화
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 스키마 자동 적용
const schema = fs.readFileSync(join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

const pairingColumns = db.prepare("PRAGMA table_info('pairings')").all()
if (!pairingColumns.some((column) => column.name === 'observer_team_id')) {
  db.exec('ALTER TABLE pairings ADD COLUMN observer_team_id INTEGER REFERENCES teams(id)')
}

// 세션 소유자와 학생 입장 토큰 — 소유자를 메모리에만 두면 재배포 뒤 처음 손대는 교사가 남의 수업을 가져갔다
const sessionColumns = db.prepare("PRAGMA table_info('sessions')").all().map((column) => column.name)
if (!sessionColumns.includes('owner_teacher_id')) db.exec('ALTER TABLE sessions ADD COLUMN owner_teacher_id TEXT')
if (!sessionColumns.includes('join_token')) db.exec('ALTER TABLE sessions ADD COLUMN join_token TEXT')

console.log(`[DB] 초기화 완료: ${join(dbDir, 'turing.db')}`)

export default db
