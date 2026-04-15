import { useState } from 'react'

const AUTH_KEY = 'turing_teacher_auth'
const API_KEYS_KEY = 'turing_api_keys'
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

export function getSavedApiKeys() {
  try {
    const raw = localStorage.getItem(API_KEYS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveApiKeys(keys) {
  localStorage.setItem(API_KEYS_KEY, JSON.stringify(keys))
}

export default function TeacherGate({ onAuth }) {
  const saved = getSavedApiKeys()
  const [anthropicKey, setAnthropicKey] = useState(saved.anthropic || '')
  const [openaiKey, setOpenaiKey] = useState(saved.openai || '')
  const [googleKey, setGoogleKey] = useState(saved.google || '')
  const [upstageKey, setUpstageKey] = useState(saved.upstage || '')
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!anthropicKey.trim()) {
      setError('Anthropic API 키는 필수입니다')
      return
    }
    setError('')
    setLoading(true)
    try {
      const apiKeys = {
        anthropic: anthropicKey.trim(),
        ...(openaiKey.trim() && { openai: openaiKey.trim() }),
        ...(googleKey.trim() && { google: googleKey.trim() }),
        ...(upstageKey.trim() && { upstage: upstageKey.trim() }),
      }
      const res = await fetch('/turing-test/api/auth/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        saveTeacherAuth()
        saveApiKeys(apiKeys)
        onAuth(apiKeys)
      } else {
        setError(data.error || '인증 실패')
      }
    } catch {
      setError('서버 연결 오류')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '2px solid var(--border)',
    background: 'var(--surface2, #1E293B)',
    color: 'var(--text)',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div className="gate-page">
      <div className="gate-card" style={{ maxWidth: '460px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧪</div>
        <h2 style={{ marginBottom: '6px' }}>교사 로그인</h2>
        <p className="text-muted" style={{ marginBottom: '24px' }}>
          AI API 키를 입력하여 수업을 시작하세요
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Anthropic (필수) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
              🔑 Anthropic API 키 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              style={inputStyle}
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              autoFocus
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94A3B8)', marginTop: '4px' }}>
              말투 변환 + Claude 모델에 사용됩니다 (필수)
            </p>
          </div>

          {/* 선택 키 토글 */}
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent, #6366F1)',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              padding: '4px 0',
              textAlign: 'left',
            }}
          >
            {showOptional ? '▼' : '▶'} 다른 AI 모델 키 (선택사항)
          </button>

          {showOptional && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'var(--surface2, #1E293B)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted, #94A3B8)', marginBottom: '4px' }}>
                  OpenAI API 키 (GPT)
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Google API 키 (Gemini)
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="AIza..."
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-muted, #94A3B8)', marginBottom: '4px' }}>
                  Upstage API 키 (Solar)
                </label>
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="up-..."
                  value={upstageKey}
                  onChange={(e) => setUpstageKey(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading || !anthropicKey.trim()}>
            {loading ? '확인 중...' : '입장'}
          </button>
        </form>
        <p className="text-muted mt-16" style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
          API 키는 브라우저에 저장되며, 서버 메모리에서만 사용됩니다.
          <br />서버에 영구 저장되지 않습니다.
        </p>
      </div>
    </div>
  )
}
