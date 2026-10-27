/**
 * 교사 인증 토큰과 세션 소유권
 *
 * - 입장 코드(TEACHER_PIN) 또는 본인 API 키로 한 번 인증하면 토큰을 발급한다.
 * - 토큰은 서버 메모리에만 있고 12시간 뒤 만료된다. 서버 재시작 시 초기화된다.
 * - 교사용 REST(x-teacher-token 헤더)와 소켓 이벤트(payload.token)에서 검사한다.
 * - 같은 입장 코드를 여러 교사가 쓰므로, 브라우저가 만든 teacherId로 교사를 구분해 세션 소유권을 검사한다.
 *   재로그인(만료·재배포)해도 같은 브라우저면 같은 teacherId라 자기 세션을 이어서 쓸 수 있다.
 */
import crypto from 'crypto'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const tokens = new Map() // token -> { createdAt, mode: 'pin' | 'keys', teacherId }

// 입장 코드 실패 횟수 제한 (IP당 10분에 30회 실패). 성공은 세지 않는다 — 학교 공용망에서 교사 10명이 같은 IP를 쓴다
const pinFailures = new Map() // ip -> { count, windowStart }
const FAIL_WINDOW_MS = 10 * 60 * 1000
const FAIL_LIMIT = 30

// 세션 소유자 (메모리). sessionId -> teacherId. 재배포 뒤에는 비어 있고, 그때는 처음 손대는 교사가 가져간다
const sessionOwners = new Map()

/** 서버에 설정된 입장 코드. 프로덕션에서 미설정이면 null (입장 코드 로그인 비활성). */
export function getTeacherPin() {
  const pin = (process.env.TEACHER_PIN || '').trim()
  if (pin) return pin
  if (process.env.NODE_ENV === 'production') return null
  return '000000' // 로컬 개발 기본값
}

export function pinBlocked(ip) {
  const entry = pinFailures.get(ip)
  if (!entry) return false
  if (Date.now() - entry.windowStart > FAIL_WINDOW_MS) { pinFailures.delete(ip); return false }
  return entry.count >= FAIL_LIMIT
}

export function recordPinFailure(ip) {
  const now = Date.now()
  const entry = pinFailures.get(ip)
  if (!entry || now - entry.windowStart > FAIL_WINDOW_MS) pinFailures.set(ip, { count: 1, windowStart: now })
  else entry.count += 1
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
 * 세션 관리 권한 — 소유자가 없으면 이 교사가 가져가고, 같은 교사면 통과, 다른 교사면 거부
 */
export function canManageSession(sessionId, teacherId) {
  if (!sessionId || !teacherId) return false
  const owner = sessionOwners.get(sessionId)
  if (!owner) { sessionOwners.set(sessionId, teacherId); return true }
  return owner === teacherId
}

export function sessionOwner(sessionId) {
  return sessionOwners.get(sessionId) || null
}

export function releaseSessionOwner(sessionId) {
  sessionOwners.delete(sessionId)
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
    if (!canManageSession(req.params.sessionId, req.teacher.teacherId)) {
      return res.status(403).json({ error: '다른 선생님이 진행 중인 수업입니다.' })
    }
    next()
  })
}
