import { useState } from 'react'

const AUTH_KEY = 'turing_teacher_auth'
const AUTH_TTL = 2 * 60 * 60 * 1000 // 2시간

export function checkTeacherAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY)
    if (!raw) return false
    const { ts } = JSON.parse(raw)
    return Date.now() - ts < AUTH_TTL
  } catch {
    return false
  }
}

export function saveTeacherAuth() {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify({ ts: Date.now() }))
}

export default function TeacherGate({ onAuth }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pin.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/turing-test/api/auth/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        saveTeacherAuth()
        onAuth()
      } else {
        setError(data.error || '인증 실패')
      }
    } catch {
      setError('서버 연결 오류')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gate-page">
      <div className="gate-card">
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧪</div>
        <h2 style={{ marginBottom: '6px' }}>교사 로그인</h2>
        <p className="text-muted" style={{ marginBottom: '28px' }}>
          교사 PIN을 입력하세요
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            placeholder="PIN 번호"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
            maxLength={10}
          />
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
            {loading ? '확인 중...' : '입장'}
          </button>
        </form>
        <p className="text-muted mt-16" style={{ fontSize: '0.8125rem' }}>
          기본 PIN: 000000
        </p>
      </div>
    </div>
  )
}
