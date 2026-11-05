import { API_BASE } from '../config.js'

// 교사 토큰 — 입장 코드/API 키 인증 후 서버가 발급. 탭이 닫히면 사라진다 (sessionStorage)
const TOKEN_KEY = 'turing_test_teacher_token'
// 교사 식별자 — 이 브라우저가 만든 값. 같은 입장 코드를 쓰는 다른 교사와 내 세션을 구분하는 데 쓴다 (localStorage)
const TEACHER_ID_KEY = 'turing_test_teacher_id'

export function getTeacherToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export function setTeacherToken(token) {
  try { sessionStorage.setItem(TOKEN_KEY, token) } catch {}
}
export function clearTeacherToken() {
  try { sessionStorage.removeItem(TOKEN_KEY) } catch {}
}

export function getTeacherId() {
  try {
    let id = localStorage.getItem(TEACHER_ID_KEY)
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      const bytes = new Uint8Array(12)
      if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes)
      else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
      id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(TEACHER_ID_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

// 학생 입장 토큰 — 수업 코드를 확인하면 서버가 준다. 새로고침·재접속 뒤에도 이어지도록 localStorage에 둔다.
// 수업별로 저장한다. 칸이 하나면 같은 기기로 다른 수업에 들어갔을 때 앞 수업 화면이 튕긴다
const JOIN_TOKEN_KEY = 'turing_test_join_tokens'
const MAX_SAVED_TOKENS = 5

function readJoinTokens() {
  try {
    const value = JSON.parse(localStorage.getItem(JOIN_TOKEN_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeJoinTokens(entries) {
  try { localStorage.setItem(JOIN_TOKEN_KEY, JSON.stringify(entries)) } catch {}
}

export function getJoinToken(sessionId) {
  return readJoinTokens().find((entry) => entry.sessionId === sessionId)?.token || ''
}
export function setJoinToken(sessionId, token) {
  const others = readJoinTokens().filter((entry) => entry.sessionId !== sessionId)
  writeJoinTokens([{ sessionId, token }, ...others].slice(0, MAX_SAVED_TOKENS))
}
export function clearJoinToken(sessionId) {
  writeJoinTokens(readJoinTokens().filter((entry) => entry.sessionId !== sessionId))
}

function authHeaders(sessionId) {
  const token = getTeacherToken()
  const joinToken = sessionId ? getJoinToken(sessionId) : ''
  return {
    ...(token ? { 'x-teacher-token': token } : {}),
    ...(joinToken ? { 'x-join-token': joinToken } : {}),
  }
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && getTeacherToken()) {
      // 토큰 만료·서버 재시작: 저장된 토큰을 버리고 교사 화면이 로그인으로 돌아가게 알린다
      clearTeacherToken()
      window.dispatchEvent(new Event('teacher:auth-expired'))
    }
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }
  return data
}

/** sessionId를 주면 그 수업의 입장 토큰을 함께 보낸다 */
export async function apiGet(path, sessionId) {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders(sessionId) })
  return readJson(response)
}

export async function apiPost(path, body, sessionId) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(sessionId) },
    body: JSON.stringify(body),
  })
  return readJson(response)
}

/** 교사 토큰을 실어 파일을 내려받는다 (CSV 등) */
export async function apiDownload(path, filename) {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || '다운로드에 실패했습니다.')
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
