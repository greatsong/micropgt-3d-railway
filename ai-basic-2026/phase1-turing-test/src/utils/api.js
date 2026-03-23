import { API_BASE } from '../config.js'

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.')
  }
  return data
}

export async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`)
  return readJson(response)
}

export async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readJson(response)
}
