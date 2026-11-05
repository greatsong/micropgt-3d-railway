/**
 * 교사 인증 토큰과 세션 소유권
 *
 * - 입장 코드(TEACHER_PIN) 또는 본인 API 키로 한 번 인증하면 토큰을 발급한다.
 * - 토큰은 서버 메모리에만 있고 12시간 뒤 만료된다. 서버 재시작 시 초기화된다.
 * - 교사용 REST(x-teacher-token 헤더)와 소켓 이벤트(payload.token)에서 검사한다.
 * - 같은 입장 코드를 여러 교사가 쓰므로, 브라우저가 만든 teacherId로 교사를 구분해 세션 소유권을 검사한다.
 *   재로그인(만료·재배포)해도 같은 브라우저면 같은 teacherId라 자기 세션을 이어서 쓸 수 있다.
 * - 소유자는 sessions.owner_teacher_id에 저장한다. 메모리에만 두면 재배포·수업 종료 뒤 소유자가 비어
 *   유효한 Anthropic 키만 있으면 남의 수업 기록을 가져갈 수 있었다.
 */
import crypto from 'crypto'
import db from './db.js'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const tokens = new Map() // token -> { createdAt, mode: 'pin' | 'keys', teacherId }

// 입장 코드 실패 횟수 제한 (IP당 10분에 30회 실패). 성공은 세지 않는다 — 학교 공용망에서 교사 10명이 같은 IP를 쓴다
const pinFailures = new Map() // ip -> { count, windowStart }
const FAIL_WINDOW_MS = 10 * 60 * 1000
const FAIL_LIMIT = 30

/** 서버에 설정된 입장 코드. 프로덕션에서 미설정이면 null (입장 코드 로그인 비활성). */
export function getTeacherPin() {
  const pin = (process.env.TEACHER_PIN || '').trim()
  if (pin) return pin
  if (process.env.NODE_ENV === 'production') return null
  return '000000' // 로컬 개발 기본값
}

function isBlocked(store, ip, limit) {
  const entry = store.get(ip)
  if (!entry) return false
  if (Date.now() - entry.windowStart > FAIL_WINDOW_MS) { store.delete(ip); return false }
  return entry.count >= limit
}

function recordFailure(store, ip) {
  const now = Date.now()
  if (store.size > 5000) {
    for (const [key, value] of store) if (now - value.windowStart > FAIL_WINDOW_MS) store.delete(key)
  }
  const entry = store.get(ip)
  if (!entry || now - entry.windowStart > FAIL_WINDOW_MS) store.set(ip, { count: 1, windowStart: now })
  else entry.count += 1
}

export function pinBlocked(ip) {
  return isBlocked(pinFailures, ip, FAIL_LIMIT)
}

export function recordPinFailure(ip) {
  recordFailure(pinFailures, ip)
}

// 수업 코드 추측 제한 (IP당 10분에 60회 실패). 학교 공용 IP에서 학생들의 오타로 막히지 않게 교사 코드보다 넉넉하게 둔다
const codeFailures = new Map()
const CODE_FAIL_LIMIT = Number(process.env.JOIN_CODE_FAIL_LIMIT) || 60

export function joinCodeBlocked(ip) {
  return isBlocked(codeFailures, ip, CODE_FAIL_LIMIT)
}

export function recordJoinCodeFailure(ip) {
  recordFailure(codeFailures, ip)
}

export function clearPinFailures(ip) {
  pinFailures.delete(ip)
}

/** 브라우저가 보낸 teacherId를 검증하고, 없으면 새로 만든다 */
export function normalizeTeacherId(raw) {
  if (typeof raw === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(raw)) return raw
  return crypto.randomBytes(12).toString('hex')
}

export function issueTeacherToken(mode, teacherId) {
  // 만료 토큰 정리
  const now = Date.now()
  for (const [key, entry] of tokens) {
    if (now - entry.createdAt > TOKEN_TTL_MS) tokens.delete(key)
  }
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, { createdAt: now, mode, teacherId })
  return token
}

/** 유효하면 토큰 정보 { mode, teacherId }, 아니면 null */
export function verifyTeacherToken(token) {
  if (typeof token !== 'string' || !token) return null
  const entry = tokens.get(token)
  if (!entry) return null
  if (Date.now() - entry.createdAt > TOKEN_TTL_MS) {
    tokens.delete(token)
    return null
  }
  return entry
}

/**
 * 세션 관리 권한 — teacher는 verifyTeacherToken이 돌려준 { mode, teacherId }.
 * 소유자가 저장돼 있으면 같은 교사만 통과한다.
 * 이 기능 이전에 만든 진행 중 세션만 소유자가 비어 있다. 그때는 입장 코드 교사만 넘겨받는다
 * (본인 API 키 입장은 키만 유효하면 누구나 가능하므로 빈 세션을 가져갈 수 없다).
 * 없는 세션이나 이미 끝난 옛 세션은 거부한다.
 */
export function canManageSession(sessionId, teacher) {
  if (typeof sessionId !== 'string' || !sessionId || !teacher?.teacherId) return false
  const row = db.prepare('SELECT owner_teacher_id, status FROM sessions WHERE id = ?').get(sessionId)
  if (!row) return false
  if (row.owner_teacher_id) return row.owner_teacher_id === teacher.teacherId
  if (teacher.mode !== 'pin' || (row.status !== 'waiting' && row.status !== 'active')) return false
  db.prepare('UPDATE sessions SET owner_teacher_id = ? WHERE id = ? AND owner_teacher_id IS NULL').run(teacher.teacherId, sessionId)
  return true
}

/** Express 미들웨어 — 교사용 REST 보호 */
export function requireTeacher(req, res, next) {
  const entry = verifyTeacherToken(req.get('x-teacher-token'))
  if (!entry) {
    return res.status(401).json({ error: '교사 인증이 필요합니다. 입장 코드로 다시 들어오세요.' })
  }
  req.teacher = entry
  next()
}

/** Express 미들웨어 — 교사 인증 + :sessionId 소유권 검사 */
export function requireSessionOwner(req, res, next) {
  requireTeacher(req, res, () => {
    if (!canManageSession(req.params.sessionId, req.teacher)) {
      return res.status(403).json({ error: '다른 선생님이 진행 중인 수업입니다.' })
    }
    next()
  })
}
