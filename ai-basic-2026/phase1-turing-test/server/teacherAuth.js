/**
 * 교사 인증 토큰
 *
 * - 입장 코드(TEACHER_PIN) 또는 본인 API 키로 한 번 인증하면 토큰을 발급한다.
 * - 토큰은 서버 메모리에만 있고 12시간 뒤 만료된다. 서버 재시작 시 초기화된다.
 * - 교사용 REST(x-teacher-token 헤더)와 소켓 이벤트(payload.token)에서 검사한다.
 */
import crypto from 'crypto'

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000
const tokens = new Map() // token -> { createdAt, mode: 'pin' | 'keys' }

// 입장 코드 시도 제한 (IP당 10분에 10회)
const pinAttempts = new Map() // ip -> { count, windowStart }
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000
const ATTEMPT_LIMIT = 10

/** 서버에 설정된 입장 코드. 프로덕션에서 미설정이면 null (입장 코드 로그인 비활성). */
export function getTeacherPin() {
  const pin = (process.env.TEACHER_PIN || '').trim()
  if (pin) return pin
  if (process.env.NODE_ENV === 'production') return null
  return '000000' // 로컬 개발 기본값
}

export function checkPinAttempt(ip) {
  const now = Date.now()
  const entry = pinAttempts.get(ip)
  if (!entry || now - entry.windowStart > ATTEMPT_WINDOW_MS) {
    pinAttempts.set(ip, { count: 1, windowStart: now })
    return true
  }
  entry.count += 1
  return entry.count <= ATTEMPT_LIMIT
}

export function issueTeacherToken(mode) {
  // 만료 토큰 정리
  const now = Date.now()
  for (const [key, entry] of tokens) {
    if (now - entry.createdAt > TOKEN_TTL_MS) tokens.delete(key)
  }
  const token = crypto.randomBytes(24).toString('hex')
  tokens.set(token, { createdAt: now, mode })
  return token
}

/** 유효하면 토큰 정보, 아니면 null */
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

/** Express 미들웨어 — 교사용 REST 보호 */
export function requireTeacher(req, res, next) {
  const entry = verifyTeacherToken(req.get('x-teacher-token'))
  if (!entry) {
    return res.status(401).json({ error: '교사 인증이 필요합니다. 입장 코드로 다시 들어오세요.' })
  }
  req.teacher = entry
  next()
}
