import { API_BASE } from '../config.js'

// 교사 토큰 — 입장 코드/API 키 인증 후 서버가 발급. 탭이 닫히면 사라진다 (sessionStorage)
const TOKEN_KEY = 'turing_test_teacher_token'

export function getTeacherToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
export function setTeacherToken(token) {
  try { sessionStorage.setItem(TOKEN_KEY, token) } catch {}
}
export function clearTeacherToken() {
  try { sessionStorage.removeItem(TOKEN_KEY) } catch {}
}

function authHeaders() {
  const token = getTeacherToken()
  return token ? { 'x-teacher-token': token } : {}
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }
  return data
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() })
  return readJson(response)
}

export async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
