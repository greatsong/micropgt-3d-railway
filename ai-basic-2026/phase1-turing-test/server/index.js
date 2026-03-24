import dotenv from 'dotenv'
dotenv.config({ override: true })
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import { nanoid } from './utils.js'
import db from './db.js'
import { registerSocketHandlers } from './socketHandlers.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── 서브패스 설정 ──────────────────────────────────────────────────────────
const BASE_PATH = process.env.APP_BASE_PATH || '/turing-test'

// ── CORS 설정 ──────────────────────────────────────────────────────────────
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
]
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : DEFAULT_ORIGINS

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // 프로덕션: 같은 도메인 서빙이므로 origin 없는 요청 허용
      callback(null, true)
    }
  },
  credentials: true,
}

// ── 앱 설정 ───────────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)

// Socket.io — 서브패스 적용
const io = new Server(httpServer, {
  path: `${BASE_PATH}/socket.io`,
  cors: corsOptions,
})

app.use(cors(corsOptions))
app.use(express.json())

// db와 io를 라우터에서 사용할 수 있도록 주입
app.use((req, res, next) => {
  req.db = db
  req.io = io
  next()
})

// ── 헬스체크 ──────────────────────────────────────────────────────────────
app.get(`${BASE_PATH}/api/health`, (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// ── 교사 PIN 인증 ─────────────────────────────────────────────────────────
const TEACHER_PIN = process.env.TEACHER_PIN || '000000'

app.post(`${BASE_PATH}/api/auth/teacher`, (req, res) => {
  const { pin } = req.body
  if (pin === TEACHER_PIN) {
    res.json({ ok: true })
  } else {
    res.status(401).json({ error: '인증 코드가 올바르지 않습니다' })
  }
})

// ── 세션 API ──────────────────────────────────────────────────────────────

// 세션 생성
app.post(`${BASE_PATH}/api/session`, (req, res) => {
  const { teacherCode } = req.body
  if (!teacherCode) return res.status(400).json({ error: '수업 코드 필요' })

  // 기존 활성 세션 확인
  const existing = db
    .prepare("SELECT * FROM sessions WHERE teacher_code = ? AND (status = 'waiting' OR status = 'active')")
    .get(teacherCode)

  if (existing) {
    const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(existing.id)
    return res.json({ ...existing, teams: teams.map(parseTeam) })
  }

  const id = nanoid()
  db.prepare('INSERT INTO sessions (id, teacher_code) VALUES (?, ?)').run(id, teacherCode)
  res.json({ id, teacher_code: teacherCode, status: 'waiting', teams: [] })
})

// 세션 조회
app.get(`${BASE_PATH}/api/session/:sessionId`, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: '세션 없음' })
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(session.id)
  res.json({ ...session, teams: teams.map(parseTeam) })
})

// 팀 등록
app.post(`${BASE_PATH}/api/session/:sessionId/team`, (req, res) => {
  const { name, members, color } = req.body
  if (!name || !members) return res.status(400).json({ error: '팀명, 팀원 필요' })

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: '세션 없음' })

  // 팀 색상 — 제공 안 되면 자동 배정
  const colors = ['#EF4444','#3B82F6','#22C55E','#EAB308','#A855F7','#F97316','#06B6D4','#EC4899']
  const usedColors = db.prepare('SELECT color FROM teams WHERE session_id = ?').all(session.id).map(t => t.color)
  const assignedColor = color || colors.find(c => !usedColors.includes(c)) || colors[0]

  const result = db.prepare(
    'INSERT INTO teams (session_id, name, members, color) VALUES (?, ?, ?, ?)'
  ).run(session.id, name, JSON.stringify(members), assignedColor)

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(result.lastInsertRowid)
  // 팀원 등록 — 역할은 팀 단위이므로 개인 역할 없음
  members.forEach((member) => {
    db.prepare(`
      INSERT INTO students (session_id, team_id, name, role)
      VALUES (?, ?, ?, ?)
    `).run(session.id, team.id, member, 'member')
  })

  req.io.to(`session:${session.id}`).emit('team:registered', {
    team: parseTeam(team),
  })

  res.json(parseTeam(team))
})

// 팀 참가 — 팀 단위 참여 (개인 역할 없음)
app.post(`${BASE_PATH}/api/session/:sessionId/join`, (req, res) => {
  const { teamId } = req.body
  if (!teamId) return res.status(400).json({ error: '팀 ID 필요' })

  const team = db.prepare('SELECT * FROM teams WHERE id = ? AND session_id = ?')
    .get(Number(teamId), req.params.sessionId)
  if (!team) return res.status(404).json({ error: '팀 없음' })

  res.json({ teamId: Number(teamId) })
})

app.get(`${BASE_PATH}/api/session/:sessionId/teams`, (req, res) => {
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(req.params.sessionId)
  res.json(teams.map(parseTeam))
})

// 팀 단건 조회
app.get(`${BASE_PATH}/api/team/:teamId`, (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.teamId)
  if (!team) return res.status(404).json({ error: '팀 없음' })
  res.json(parseTeam(team))
})

// ── 대시보드 API ──────────────────────────────────────────────────────────

// 라운드 목록 조회
app.get(`${BASE_PATH}/api/dashboard/:sessionId/rounds`, (req, res) => {
  const rounds = db
    .prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number')
    .all(req.params.sessionId)
  res.json(rounds)
})

// 라운드 상세 (턴 진행 현황 포함)
app.get(`${BASE_PATH}/api/dashboard/:sessionId/round/:roundId`, (req, res) => {
  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(req.params.roundId)
  if (!round) return res.status(404).json({ error: '라운드 없음' })

  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(req.params.sessionId)
  const pairings = db.prepare('SELECT * FROM pairings WHERE round_id = ?').all(round.id)

  const teamProgress = teams.map(team => {
    const turns = db.prepare(
      'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(round.id, team.id)
    return {
      ...parseTeam(team),
      turns,
      completedTurns: turns.filter(t => t.styled_answer).length,
    }
  })

  res.json({ round, pairings, teamProgress })
})

// CSV 다운로드
app.get(`${BASE_PATH}/api/dashboard/:sessionId/export`, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: '세션 없음' })

  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(session.id).map(parseTeam)
  const rounds = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number').all(session.id)

  const rows = ['팀명,팀원,라운드,말투,AI모델,정답턴,전체턴,점수,누적점수']

  for (const team of teams) {
    let cumulative = 0
    for (const round of rounds) {
      const turns = db.prepare(
        'SELECT * FROM turns WHERE round_id = ? AND team_id = ?'
      ).all(round.id, team.id)
      const correct = turns.filter(t => t.is_correct).length
      const earned = correct * round.point_value
      cumulative += earned
      rows.push([
        team.name,
        team.members.join('/'),
        round.round_number,
        round.style_name,
        round.ai_model,
        correct,
        turns.length,
        earned,
        cumulative,
      ].join(','))
    }
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="turing-test-${session.id}.csv"`)
  res.send('\uFEFF' + rows.join('\n')) // BOM 추가 (Excel 한글 깨짐 방지)
})

// ── 네트워크 IP (학생 접속 QR용) ─────────────────────────────────────────
app.get(`${BASE_PATH}/api/network/ip`, async (req, res) => {
  const { networkInterfaces } = await import('os')
  const nets = networkInterfaces()
  let ip = 'localhost'
  for (const iface of Object.values(nets)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address
        break
      }
    }
  }
  res.json({ ip })
})

app.get(`${BASE_PATH}/api/system/ai-status`, (req, res) => {
  res.json({
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_API_KEY),
    upstage: Boolean(process.env.UPSTAGE_API_KEY),
    appBasePath: BASE_PATH,
  })
})

// ── Socket.io 이벤트 등록 ─────────────────────────────────────────────────
registerSocketHandlers(io, db)

// ── 프로덕션: dist/ 서빙 + SPA fallback ─────────────────────────────────
const distDir = join(__dirname, '..', 'dist')
if (fs.existsSync(distDir)) {
  // 서브패스 기준으로 정적 파일 서빙
  app.use(BASE_PATH, express.static(distDir))
  // SPA fallback — 서브패스 하위의 API 아닌 경로는 index.html로
  app.get(new RegExp(`^${BASE_PATH}(?!/api).*`), (req, res) => {
    res.sendFile(join(distDir, 'index.html'))
  })
  console.log('📦 프로덕션 모드: dist/ 서빙 중')
}

// ── 서버 시작 ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, '0.0.0.0', () => {
  const isProd = fs.existsSync(distDir)
  console.log(`\n🚀 튜링 테스트 서버`)
  if (isProd) {
    console.log(`   앱      → http://localhost:${PORT}${BASE_PATH}/`)
  } else {
    console.log(`   Express  → http://localhost:${PORT}`)
    console.log(`   React    → http://localhost:3000${BASE_PATH}/`)
  }
  console.log(`   API      → http://localhost:${PORT}${BASE_PATH}/api/`)
  console.log(`   Socket   → ${BASE_PATH}/socket.io\n`)
})

// ── 유틸 함수 ─────────────────────────────────────────────────────────────
function parseTeam(team) {
  return {
    ...team,
    members: typeof team.members === 'string' ? JSON.parse(team.members) : team.members,
  }
}

export { db, io }
