import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function ClassSetup({ onSessionCreated }) {
  const [teacherCode, setTeacherCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [qrUrl, setQrUrl] = useState('')
  const [networkIp, setNetworkIp] = useState('localhost')
  const inputRef = useRef(null)

  useEffect(() => {
    fetch('/turing-test/api/network/ip')
      .then((r) => r.json())
      .then((d) => setNetworkIp(d.ip))
      .catch(() => {})
    inputRef.current?.focus()
  }, [])

  async function generateQR(code) {
    const port = window.location.port || ''
    const portStr = port ? `:${port}` : ''
    const url = `http://${networkIp}${portStr}/turing-test/?code=${code}`
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 })
      setQrUrl(dataUrl)
      return url
    } catch {
      return url
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    const code = teacherCode.trim().toUpperCase()
    if (!code) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/turing-test/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherCode: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '세션 생성 실패')
      setSession(data)
      const joinUrl = await generateQR(code)
      onSessionCreated({ ...data, joinUrl })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    const port = window.location.port || ''
    const portStr = port ? `:${port}` : ''
    const joinUrl = `http://${networkIp}${portStr}/turing-test/?code=${session.teacher_code}`
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
          <h2 style={{ marginBottom: '4px' }}>수업 코드: <span style={{ color: 'var(--primary)' }}>{session.teacher_code}</span></h2>
          <p className="text-muted mb-16">학생들이 QR을 스캔하거나 코드를 입력하여 접속합니다</p>

          {qrUrl && (
            <div className="qr-container" style={{ margin: '0 auto 20px', maxWidth: '280px' }}>
              <img src={qrUrl} alt="QR 코드" width={240} height={240} />
              <p className="qr-url">{joinUrl}</p>
            </div>
          )}

          <div style={{
            background: 'var(--surface2)',
            borderRadius: '8px',
            padding: '14px 20px',
            margin: '0 0 20px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>학생 접속 URL</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', wordBreak: 'break-all' }}>{joinUrl}</div>
          </div>

          <div className="badge badge-green" style={{ marginBottom: '20px' }}>
            {session.teams?.length || 0}팀 참여 중
          </div>

          <button className="btn btn-primary btn-lg btn-full" onClick={() => onSessionCreated({ ...session, joinUrl })}>
            수업 대시보드 열기 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '40px 36px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '12px' }}>🧪</div>
        <h2 style={{ textAlign: 'center', marginBottom: '6px' }}>튜링 테스트 수업</h2>
        <p className="text-muted" style={{ textAlign: 'center', marginBottom: '28px' }}>
          수업 코드를 설정하세요
        </p>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="label">수업 코드 (영문+숫자 4~8자)</label>
            <input
              ref={inputRef}
              className="input"
              type="text"
              placeholder="예: AI2026"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value.toUpperCase().slice(0, 8))}
              maxLength={8}
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading || !teacherCode.trim()}>
            {loading ? '생성 중...' : '세션 시작'}
          </button>
        </form>
      </div>
    </div>
  )
}
