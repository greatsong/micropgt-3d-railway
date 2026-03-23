export default function WaitingScreen({ message, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="student-header">
        <div className="title">⏳ 결과 대기 중</div>
      </div>
      <div className="waiting-screen">
        <div className="waiting-spinner" />
        <h3>{message || '교사가 결과를 공개할 때까지 기다려 주세요'}</h3>
        <p className="text-muted">{sub || '잠시 후 결과가 공개됩니다...'}</p>
      </div>
    </div>
  )
}
