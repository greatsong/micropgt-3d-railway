const rawBase = import.meta.env.BASE_URL || '/'

export const BASE_PATH = rawBase === '/' ? '' : rawBase.replace(/\/$/, '')
export const API_BASE = `${BASE_PATH}/api`
export const SOCKET_PATH = `${BASE_PATH}/socket.io`

export function withBase(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${normalized}`
}

export function stripBase(pathname) {
  if (!BASE_PATH) return pathname || '/'
  if (pathname.startsWith(BASE_PATH)) {
    const stripped = pathname.slice(BASE_PATH.length)
    return stripped || '/'
  }
  return pathname || '/'
}

/** /turing-test/team/123 → '123' */
export function getTeamIdFromPath() {
  const stripped = stripBase(window.location.pathname)
  const match = stripped.match(/^\/team\/([^/]+)/)
  return match ? match[1] : null
}
