import { io } from 'socket.io-client'
import { SOCKET_PATH } from '../config.js'

/** 새 소켓 인스턴스 생성 */
export function createSocket() {
  return io(window.location.origin, {
    path: SOCKET_PATH,
    autoConnect: true,
    transports: ['websocket', 'polling'],
  })
}

/** 교사 페이지용 싱글톤 */
let _socket = null

export function getSocket() {
  if (!_socket) _socket = createSocket()
  return _socket
}

export function connectSocket() {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect()
    _socket = null
  }
}

/** 초 → "MM:SS" */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
