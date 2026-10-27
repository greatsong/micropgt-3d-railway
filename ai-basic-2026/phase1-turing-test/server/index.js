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
import { registerSocketHandlers, buildSessionSummary } from './socketHandlers.js'
import { sessionApiKeys } from './apiKeyStore.js'
import {
  issueTeacherToken, verifyTeacherToken, requireTeacher, requireSessionOwner, getTeacherPin,
  pinBlocked, recordPinFailure, clearPinFailures, normalizeTeacherId, canManageSession, sessionOwner,
} from './teacherAuth.js'

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

// Railway 등 프록시 뒤에서 req.ip가 실제 접속 IP가 되도록 (입장 코드 실패 횟수 제한용)
app.set('trust proxy', 1)

app.use(cors(corsOptions))
app.use(express.json())

// 서버가 (재)시작되면 메모리의 라운드 상태·타이머가 없으므로, DB에 진행 중으로 남은 라운드는 중단 처리한다
// (그대로 두면 교사 화면이 "진행 중"으로 판단해 다음 라운드를 시작하지 못한다)
const orphaned = db.prepare("UPDATE rounds SET status = 'closed' WHERE status IN ('chatting', 'voting', 'revealed')").run()
if (orphaned.changes > 0) console.log(`[boot] 진행 중이던 라운드 ${orphaned.changes}개를 중단 처리했습니다 (서버 재시작)`)

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

// ── 교사 인증 ─────────────────────────────────────────────────────────────
// 두 가지 입장 방식. 성공하면 토큰을 발급하고 교사용 REST·소켓에서 검사한다.
//  1) 입장 코드(TEACHER_PIN) — 연수·공용 키 운영용. AI 호출은 서버 환경변수 키를 쓴다.
//  2) 본인 Anthropic API 키 — 실제 수업용. 키 유효성을 Anthropic 모델 목록 호출로 확인한다.
const envAiStatus = () => ({
  anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  google: Boolean(process.env.GOOGLE_API_KEY),
  upstage: Boolean(process.env.UPSTAGE_API_KEY),
})

async function isValidAnthropicKey(key) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(8000),
    })
    return response.ok
  } catch {
    return false
  }
}

app.post(`${BASE_PATH}/api/auth/teacher`, async (req, res) => {
  const { pin, apiKeys } = req.body || {}
  const teacherId = normalizeTeacherId(req.body?.teacherId) // 브라우저가 만든 교사 식별자 (세션 소유권용)

  // 1) 입장 코드
  if (typeof pin === 'string' && pin.trim()) {
    const expected = getTeacherPin()
    if (!expected) {
      return res.status(503).json({ error: '입장 코드가 서버에 설정되지 않았습니다. 관리자에게 문의하세요.' })
    }
    if (pin.trim() !== expected) {
      // 실패만 센다 (같은 공용 IP의 정상 로그인이 막히지 않게)
      recordPinFailure(req.ip)
      if (pinBlocked(req.ip)) {
        return res.status(429).json({ error: '입장 코드 실패가 너무 많습니다. 10분 뒤 다시 시도하세요.' })
      }
      return res.status(401).json({ error: '입장 코드가 올바르지 않습니다' })
    }
    clearPinFailures(req.ip)
    return res.json({ ok: true, token: issueTeacherToken('pin', teacherId), teacherId, mode: 'pin', aiStatus: envAiStatus() })
  }

  // 2) 본인 API 키
  if (apiKeys && typeof apiKeys.anthropic === 'string' && apiKeys.anthropic.trim()) {
    if (!(await isValidAnthropicKey(apiKeys.anthropic.trim()))) {
      return res.status(401).json({ error: 'Anthropic API 키가 유효하지 않습니다' })
    }
    return res.json({ ok: true, token: issueTeacherToken('keys', teacherId), teacherId, mode: 'keys', aiStatus: envAiStatus() })
  }

  res.status(401).json({ error: '입장 코드 또는 Anthropic API 키가 필요합니다' })
})

// 세션에 API 키 연결 (본인 키 입장 시에만, 세션 소유자만)
app.post(`${BASE_PATH}/api/session/:sessionId/api-keys`, requireSessionOwner, (req, res) => {
  const { apiKeys } = req.body
  if (!apiKeys || !apiKeys.anthropic) {
    return res.status(400).json({ error: 'Anthropic API 키는 필수입니다' })
  }
  sessionApiKeys.set(req.params.sessionId, apiKeys)
  res.json({ ok: true })
})

// API 키 상태 확인 (키 값은 노출하지 않음)
app.get(`${BASE_PATH}/api/session/:sessionId/api-keys/status`, requireSessionOwner, (req, res) => {
  const keys = sessionApiKeys.get(req.params.sessionId) || {}
  res.json({
    anthropic: Boolean(keys.anthropic),
    openai: Boolean(keys.openai),
    google: Boolean(keys.google),
    upstage: Boolean(keys.upstage),
  })
})

// ── 세션 API ──────────────────────────────────────────────────────────────

// 세션 생성/조회 — mode='join' (학생) 시에는 새 세션을 만들지 않고 404 반환
app.post(`${BASE_PATH}/api/session`, (req, res) => {
  const rawCode = req.body?.teacherCode
  const mode = req.body?.mode || 'create'
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    return res.status(400).json({ error: '수업 코드 필요' })
  }
  const teacherCode = rawCode.trim().toUpperCase()

  // 세션 생성은 교사만 (학생 입장 mode='join'은 토큰 불필요)
  const teacher = mode !== 'join' ? verifyTeacherToken(req.get('x-teacher-token')) : null
  if (mode !== 'join' && !teacher) {
    return res.status(401).json({ error: '교사 인증이 필요합니다. 입장 코드로 다시 들어오세요.' })
  }

  // 기존 활성 세션 확인
  const existing = db
    .prepare("SELECT * FROM sessions WHERE teacher_code = ? AND (status = 'waiting' OR status = 'active') ORDER BY rowid DESC LIMIT 1")
    .get(teacherCode)

  if (existing) {
    // 교사가 만들 때: 같은 코드의 활성 세션이 다른 교사(브라우저) 것이면 거부 (겹친 코드로 한 세션에 합쳐지는 일 방지)
    // 소유자 기록은 서버 메모리라 재배포 뒤에는 비어 있고, 그때는 처음 여는 교사가 가져간다
    if (mode !== 'join' && !canManageSession(existing.id, teacher.teacherId)) {
      return res.status(409).json({ error: `'${teacherCode}'는 다른 선생님이 진행 중인 수업 코드입니다. 다른 코드를 입력하세요.` })
    }
    const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(existing.id)
    return res.json({ ...existing, teams: teams.map(parseTeam) })
  }

  // 학생 입장: 활성 세션이 없으면 빈 세션을 만들지 않고 안내
  if (mode === 'join') {
    return res.status(404).json({
      error: '입력한 수업 코드의 세션을 찾을 수 없어요. 선생님이 코드를 시작했는지, 코드가 정확한지 확인해 주세요.',
    })
  }

  // 교사 생성: 새 세션 생성
  const id = nanoid()
  db.prepare('INSERT INTO sessions (id, teacher_code) VALUES (?, ?)').run(id, teacherCode)
  canManageSession(id, teacher.teacherId) // 소유자 등록
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
app.get(`${BASE_PATH}/api/dashboard/:sessionId/rounds`, requireSessionOwner, (req, res) => {
  const rounds = db
    .prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number')
    .all(req.params.sessionId)
  res.json(rounds)
})

// 라운드 상세 (턴 진행 현황 포함)
app.get(`${BASE_PATH}/api/dashboard/:sessionId/round/:roundId`, requireSessionOwner, (req, res) => {
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
// 세션 요약 (수업 완전 종료 뒤 분석 화면용) — 라운드별 통계·팀 순위·전체 통계
app.get(`${BASE_PATH}/api/dashboard/:sessionId/summary`, requireSessionOwner, (req, res) => {
  const summary = buildSessionSummary(db, req.params.sessionId)
  if (!summary) return res.status(404).json({ error: '세션 없음' })
  res.json(summary)
})

// CSV 셀 이스케이프 — 쉼표·따옴표·줄바꿈 처리, 수식 시작 문자(=+-@)는 엑셀 수식 실행 방지
function csvCell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

app.get(`${BASE_PATH}/api/dashboard/:sessionId/export`, requireSessionOwner, (req, res) => {
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
      ].map(csvCell).join(','))
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
    teacherKeyMode: true,
    entryCodeMode: Boolean(getTeacherPin()), // 입장 코드 로그인 가능 여부 (코드 값은 노출하지 않음)
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
