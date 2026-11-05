import dotenv from 'dotenv'
dotenv.config({ override: true })
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import { nanoid, createCodeSuffix, createJoinToken, maskName, safeEqual } from './utils.js'
import db from './db.js'
import { registerSocketHandlers, buildSessionSummary } from './socketHandlers.js'
import { sessionApiKeys } from './apiKeyStore.js'
import {
  issueTeacherToken, verifyTeacherToken, requireSessionOwner, getTeacherPin,
  pinBlocked, recordPinFailure, clearPinFailures, normalizeTeacherId, canManageSession, claimLegacySession,
  joinCodeBlocked, recordJoinCodeFailure,
} from './teacherAuth.js'
import { startRetentionJob } from './retention.js'

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
  // 앱은 API와 같은 주소에서 서빙되므로 CORS 허용이 필요 없다. 목록에 없는 사이트에는 허용 헤더를 주지 않는다
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin))
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

// 보존 기간(TURING_RETENTION_DAYS)을 설정했으면 지난 수업 기록을 지운다
startRetentionJob(db)

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
    // 차단 중에는 코드를 비교하지 않는다. 비교한 뒤 실패에만 429를 주면 맞는 코드는 계속 통과해 제한이 되지 않는다
    if (pinBlocked(req.ip)) {
      return res.status(429).json({ error: '입장 코드 실패가 너무 많습니다. 10분 뒤 다시 시도하세요.' })
    }
    if (!safeEqual(pin.trim(), expected)) {
      // 실패만 센다 (같은 공용 IP의 정상 로그인이 막히지 않게)
      recordPinFailure(req.ip)
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
  const { apiKeys } = req.body || {}
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

// ── 학생 입장 권한 ────────────────────────────────────────────────────────
// 학생은 로그인 없이 수업 코드로 들어온다. 코드를 확인하면 세션의 입장 토큰을 받고,
// 팀 조회·등록과 소켓 입장에서 이 토큰을 확인한다. 세션 id나 팀 번호만으로는 명단을 볼 수 없다.
const MAX_TEAMS_PER_SESSION = 60
const CODE_SUFFIX_LENGTH = 5
const MAX_MEMBERS_PER_TEAM = 6
const MAX_NAME_LENGTH = 30

function ensureJoinToken(session) {
  if (session.join_token) return session.join_token
  const token = createJoinToken()
  db.prepare('UPDATE sessions SET join_token = ? WHERE id = ? AND join_token IS NULL').run(token, session.id)
  return db.prepare('SELECT join_token FROM sessions WHERE id = ?').get(session.id).join_token
}

/** 'teacher'(이 세션의 소유 교사) · 'student'(입장 토큰 보유) · null */
function sessionViewer(req, session) {
  const teacher = verifyTeacherToken(req.get('x-teacher-token'))
  if (teacher && canManageSession(session.id, teacher)) return 'teacher'
  if (session.join_token && safeEqual(req.get('x-join-token') || '', session.join_token)) return 'student'
  return null
}

/** 학생에게는 팀원 이름을 가려서 보낸다. 실명은 소유 교사에게만 간다 */
function teamForViewer(team, viewer) {
  const parsed = parseTeam(team)
  return viewer === 'teacher' ? parsed : { ...parsed, members: parsed.members.map(maskName) }
}

function sessionForViewer(session, teams, viewer) {
  const { join_token: joinToken, owner_teacher_id: _owner, ...publicSession } = session
  return {
    ...publicSession,
    joinToken: viewer === 'teacher' || viewer === 'student' ? ensureJoinToken({ ...session, join_token: joinToken }) : undefined,
    teams: teams.map((team) => teamForViewer(team, viewer)),
  }
}

/** teacher 또는 student만 통과 — :sessionId의 세션을 req.session에 담는다 */
function requireSessionAccess(req, res, next) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: '세션 없음' })
  const viewer = sessionViewer(req, session)
  if (!viewer) return res.status(403).json({ error: '수업 코드로 다시 입장해 주세요.' })
  req.session = session
  req.viewer = viewer
  next()
}

function parseMembers(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MEMBERS_PER_TEAM) return null
  const members = value.map((member) => (typeof member === 'string' ? member.trim() : ''))
  return members.every((member) => member && member.length <= MAX_NAME_LENGTH) ? members : null
}

// ── 세션 API ──────────────────────────────────────────────────────────────

// 세션 생성/조회 — mode='join' (학생) 시에는 새 세션을 만들지 않고 404 반환
app.post(`${BASE_PATH}/api/session`, (req, res) => {
  const rawCode = req.body?.teacherCode
  const mode = req.body?.mode || 'create'
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    return res.status(400).json({ error: '수업 코드 필요' })
  }
  const teacherCode = rawCode.trim().toUpperCase()

  // 수업 코드 추측 제한 — 실패만 세고, 차단 중에는 코드를 확인하지 않는다
  if (mode === 'join' && joinCodeBlocked(req.ip)) {
    return res.status(429).json({ error: '코드 입력 실패가 너무 많습니다. 10분 뒤 다시 시도하세요.' })
  }

  // 세션 생성은 교사만 (학생 입장 mode='join'은 토큰 불필요)
  const teacher = mode !== 'join' ? verifyTeacherToken(req.get('x-teacher-token')) : null
  if (mode !== 'join' && !teacher) {
    return res.status(401).json({ error: '교사 인증이 필요합니다. 입장 코드로 다시 들어오세요.' })
  }

  // 기존 활성 세션 확인
  const found = db
    .prepare("SELECT * FROM sessions WHERE teacher_code = ? AND (status = 'waiting' OR status = 'active') ORDER BY rowid DESC LIMIT 1")
    .get(teacherCode)
  // 소유자가 빈 옛 세션은 코드가 낱말뿐이라 추측할 수 있다. 교사가 넘겨받기 전에는 학생 입장을 받지 않는다
  const existing = mode === 'join' && found && !found.owner_teacher_id ? null : found

  if (existing) {
    // 교사가 만들 때: 같은 코드의 활성 세션이 다른 교사(브라우저) 것이면 거부 (겹친 코드로 한 세션에 합쳐지는 일 방지)
    // 소유자가 비어 있는 옛 세션은 코드를 직접 입력한 입장 코드 교사만 넘겨받는다
    if (mode !== 'join' && !canManageSession(existing.id, teacher) && !claimLegacySession(existing, teacher)) {
      return res.status(409).json({ error: `'${teacherCode}'는 다른 선생님이 진행 중인 수업 코드입니다. 다른 코드를 입력하세요.` })
    }
    const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(existing.id)
    return res.json(sessionForViewer(existing, teams, mode === 'join' ? 'student' : 'teacher'))
  }

  // 학생 입장: 활성 세션이 없으면 빈 세션을 만들지 않고 안내
  if (mode === 'join') {
    recordJoinCodeFailure(req.ip)
    return res.status(404).json({
      error: '입력한 수업 코드의 세션을 찾을 수 없어요. 선생님이 코드를 시작했는지, 코드가 정확한지 확인해 주세요.',
    })
  }

  // 같은 교사가 낱말만 다시 입력하면 자기가 연 수업을 이어 간다
  // 길이까지 비교해 '낱말-임의 문자열'만 잡는다. 'WORD'를 입력했을 때 'WORD-OTHER-XXXXX'로 합쳐지면 안 된다
  const ownSession = db.prepare(`
    SELECT * FROM sessions
    WHERE owner_teacher_id = ? AND (status = 'waiting' OR status = 'active')
      AND substr(teacher_code, 1, ?) = ? AND length(teacher_code) = ?
    ORDER BY rowid DESC LIMIT 1
  `).get(teacher.teacherId, teacherCode.length + 1, `${teacherCode}-`, teacherCode.length + 1 + CODE_SUFFIX_LENGTH)
  if (ownSession) {
    const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(ownSession.id)
    return res.json(sessionForViewer(ownSession, teams, 'teacher'))
  }

  // 교사 생성: 새 세션 생성. 코드는 교사가 고른 낱말 뒤에 임의 문자열을 붙여 추측할 수 없게 한다
  const id = nanoid()
  const joinToken = createJoinToken()
  const classCode = `${teacherCode}-${createCodeSuffix(CODE_SUFFIX_LENGTH)}`
  db.prepare('INSERT INTO sessions (id, teacher_code, owner_teacher_id, join_token) VALUES (?, ?, ?, ?)')
    .run(id, classCode, teacher.teacherId, joinToken)
  res.json({ id, teacher_code: classCode, status: 'waiting', joinToken, teams: [] })
})

// 세션 조회 — 입장 권한이 없으면 상태만 알려 준다 (학생 화면이 수업 종료 여부를 확인하는 용도)
app.get(`${BASE_PATH}/api/session/:sessionId`, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: '세션 없음' })
  // 토큰을 보냈는데 만료됐으면 교사 화면이 다시 로그인하도록 401을 준다
  if (req.get('x-teacher-token') && !verifyTeacherToken(req.get('x-teacher-token'))) {
    return res.status(401).json({ error: '교사 인증이 필요합니다. 입장 코드로 다시 들어오세요.' })
  }
  const viewer = sessionViewer(req, session)
  if (!viewer) return res.json({ id: session.id, status: session.status })
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(session.id)
  res.json(sessionForViewer(session, teams, viewer))
})

// 팀 등록
app.post(`${BASE_PATH}/api/session/:sessionId/team`, requireSessionAccess, (req, res) => {
  const { color } = req.body || {}
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const members = parseMembers(req.body?.members)
  if (!name || name.length > MAX_NAME_LENGTH || !members) return res.status(400).json({ error: '팀명, 팀원 필요' })

  const session = req.session
  if (session.status !== 'waiting' && session.status !== 'active') {
    return res.status(410).json({ error: '이미 종료된 수업입니다.' })
  }
  const teamCount = db.prepare('SELECT COUNT(*) AS count FROM teams WHERE session_id = ?').get(session.id).count
  if (teamCount >= MAX_TEAMS_PER_SESSION) return res.status(409).json({ error: '팀 수가 너무 많습니다. 선생님께 알려 주세요.' })

  // 팀 색상 — 제공 안 되면 자동 배정
  const colors = ['#EF4444','#3B82F6','#22C55E','#EAB308','#A855F7','#F97316','#06B6D4','#EC4899']
  const usedColors = db.prepare('SELECT color FROM teams WHERE session_id = ?').all(session.id).map(t => t.color)
  const requestedColor = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : null
  const assignedColor = requestedColor || colors.find(c => !usedColors.includes(c)) || colors[0]

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

  // 실명이 든 알림은 교사 방에만 보낸다 (학생 화면은 이 이벤트를 쓰지 않는다)
  req.io.to(`session:${session.id}:teacher`).emit('team:registered', {
    team: parseTeam(team),
  })

  // 방금 입력한 본인 팀 정보는 그대로 돌려준다
  res.json(parseTeam(team))
})

// 팀 참가 — 팀 단위 참여 (개인 역할 없음)
app.post(`${BASE_PATH}/api/session/:sessionId/join`, requireSessionAccess, (req, res) => {
  const { teamId } = req.body || {}
  if (!teamId) return res.status(400).json({ error: '팀 ID 필요' })

  const team = db.prepare('SELECT * FROM teams WHERE id = ? AND session_id = ?')
    .get(Number(teamId), req.params.sessionId)
  if (!team) return res.status(404).json({ error: '팀 없음' })

  res.json({ teamId: Number(teamId) })
})

app.get(`${BASE_PATH}/api/session/:sessionId/teams`, requireSessionAccess, (req, res) => {
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(req.session.id)
  res.json(teams.map((team) => teamForViewer(team, req.viewer)))
})

// 팀 단건 조회 — 팀 번호는 1부터 차례로 붙으므로 그 팀이 속한 세션의 입장 권한을 확인한다.
// 권한이 없을 때도 팀이 있는지 드러나지 않도록 없는 팀과 같은 응답을 준다
app.get(`${BASE_PATH}/api/team/:teamId`, (req, res) => {
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.teamId)
  const session = team && db.prepare('SELECT * FROM sessions WHERE id = ?').get(team.session_id)
  const viewer = session && sessionViewer(req, session)
  if (!viewer) return res.status(404).json({ error: '팀 없음' })
  res.json(teamForViewer(team, viewer))
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
  // 라운드 번호는 전역이므로 이 세션의 라운드인지 확인한다 (다른 수업의 대화를 읽지 못하게)
  const round = db.prepare('SELECT * FROM rounds WHERE id = ? AND session_id = ?').get(req.params.roundId, req.params.sessionId)
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
