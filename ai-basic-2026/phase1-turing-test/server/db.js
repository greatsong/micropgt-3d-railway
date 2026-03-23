import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 프로덕션: /data 볼륨, 개발: ./db
const dbDir = fs.existsSync('/data') ? '/data' : join(__dirname, 'db')
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

console.log(`[DB] 초기화 완료: ${join(dbDir, 'turing.db')}`)

export default db
