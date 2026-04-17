/**
 * 미션 브리핑 — 라운드 시작 시 역할별 임무 지령서
 * 기밀 서류 / 영화 이미테이션 게임 스타일
 */

const C = {
  bg: '#080d08',
  surface: '#0f1a0f',
  amber: '#d4a574',
  amberDim: 'rgba(212,165,116,0.12)',
  amberBorder: 'rgba(212,165,116,0.15)',
  amberGlow: 'rgba(212,165,116,0.08)',
  gold: '#b8860b',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.1)',
  greenBorder: 'rgba(74,222,128,0.15)',
  purple: '#8b5cf6',
  text: '#d4d4c8',
  textSec: '#9aaa8a',
  muted: '#5a6b4a',
  danger: '#ef4444',
}

const ROLE_DATA = {
  judge: {
    icon: '🔐',
    codename: 'INTERROGATOR',
    title: '당신은 심문관입니다',
    mission: '벽 너머 상대의 정체를 밝혀라',
    color: C.amber,
    borderColor: C.amberBorder,
    bgColor: C.amberDim,
    steps: [
      { num: '①', icon: '✍️', text: '질문을 입력해 상대에게 보내세요' },
      { num: '②', icon: '⏳', text: '몇 초 후 답변이 도착합니다' },
      { num: '③', icon: '🔄', text: '답변을 읽고 다시 새 질문을 보내세요' },
      { num: '④', icon: '🗳️', text: '모든 턴이 끝나면 매 턴 "사람/AI"를 투표!' },
    ],
    tip: '취미, 감정, 경험 등 누구나 답할 수 있는 질문이 좋아요',
    warning: 'AI가 답할 수 없는 사실 질문은 금지!',
  },
  respondent: {
    icon: '📡',
    codename: 'PLAYER',
    title: '당신은 플레이어입니다',
    mission: '인간처럼 답하라. 들키면 끝이다',
    color: C.green,
    borderColor: C.greenBorder,
    bgColor: C.greenDim,
    steps: [
      { num: '①', icon: '📨', text: '상대 팀의 질문이 도착합니다' },
      { num: '②', icon: '✍️', text: '자연스럽게 답변을 입력하세요' },
      { num: '③', icon: '🤖', text: 'AI가 대신 답하는 턴도 있어요 (가만히 기다리세요)' },
      { num: '④', icon: '🎭', text: '모든 답변은 같은 말투로 변환되어 전달됩니다' },
    ],
    tip: '너무 완벽하게 답하면 오히려 AI처럼 보여요!',
    warning: '짧고 자연스럽게, 학생답게!',
  },
  observer: {
    icon: '👓',
    codename: 'INTERCEPTOR',
    title: '당신은 감청관입니다',
    mission: '다른 팀의 교신을 감청하라',
    color: '#94a3b8',
    borderColor: 'rgba(148,163,184,0.15)',
    bgColor: 'rgba(148,163,184,0.08)',
    steps: [
      { num: '①', icon: '📡', text: '다른 팀의 대화가 실시간으로 표시됩니다' },
      { num: '②', icon: '👀', text: '질문과 답변을 주의 깊게 관찰하세요' },
      { num: '③', icon: '🗳️', text: '투표 시간에 매 턴 "사람/AI"를 판별합니다' },
    ],
    tip: '답변의 미묘한 차이에 주목하세요',
    warning: null,
  },
}

const ANIMATIONS = `
@keyframes briefingFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes briefingSlideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes stampSlam {
  0% { opacity: 0; transform: scale(3) rotate(-15deg); }
  60% { opacity: 1; transform: scale(0.9) rotate(-12deg); }
  100% { opacity: 1; transform: scale(1) rotate(-12deg); }
}
@keyframes lineReveal {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes scanline {
  0% { top: 0; }
  100% { top: 100%; }
}
@keyframes borderGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0.05); }
  50% { box-shadow: 0 0 40px rgba(212,165,116,0.15); }
}
@keyframes pulseBtn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212,165,116,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(212,165,116,0); }
}
`

export default function MissionBriefing({ role, style, roundNum, turns, onDismiss, briefingTime = 0, timerRemaining = null }) {
  const data = ROLE_DATA[role] || ROLE_DATA.judge
  // briefingTime > 0 이고 timerRemaining이 있으면 카운트다운 표시
  const showCountdown = briefingTime > 0 && typeof timerRemaining === 'number'

  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'briefingFadeIn 0.3s ease',
      cursor: 'pointer',
    }}>
      <style>{ANIMATIONS}</style>

      {/* 기밀 서류 카드 */}
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380, position: 'relative',
        maxHeight: 'calc(100dvh - 32px)',
        overflowY: 'auto',
        background: C.bg,
        border: `2px solid ${data.borderColor}`,
        borderRadius: 16,
        animation: 'briefingSlideUp 0.5s ease, borderGlow 3s ease-in-out infinite',
      }}>

        {/* 스캔라인 효과 */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          overflow: 'hidden', opacity: 0.03,
        }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: data.color,
            animation: 'scanline 4s linear infinite',
          }} />
        </div>

        {/* ── 헤더: 기밀 등급 ── */}
        <div style={{
          padding: '16px 20px 12px',
          background: `linear-gradient(180deg, ${data.bgColor} 0%, transparent 100%)`,
          borderBottom: `1px solid ${data.borderColor}`,
          textAlign: 'center', position: 'relative',
        }}>
          <div style={{
            fontSize: '0.55rem', fontWeight: 800, color: C.danger,
            letterSpacing: '0.2em', marginBottom: 4,
            fontFamily: "'Courier New', monospace",
          }}>
            ▲ CLASSIFIED — TOP SECRET ▲
          </div>
          <div style={{
            fontSize: '0.6rem', color: C.muted,
            fontFamily: "'Courier New', monospace",
          }}>
            ROUND {roundNum} · MISSION BRIEFING
          </div>
        </div>

        {/* ── 메인: 역할 아이콘 + 코드네임 ── */}
        <div style={{ padding: '20px 24px 0', textAlign: 'center', position: 'relative' }}>
          {/* 큰 아이콘 */}
          <div style={{
            width: 80, height: 80, borderRadius: 16, margin: '0 auto 12px',
            background: data.bgColor,
            border: `2px solid ${data.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem',
          }}>
            {data.icon}
          </div>

          {/* 코드네임 */}
          <div style={{
            fontSize: '0.65rem', fontWeight: 800, color: data.color,
            letterSpacing: '0.2em', marginBottom: 6,
            fontFamily: "'Courier New', monospace",
          }}>
            CODENAME: {data.codename}
          </div>

          {/* 타이틀 */}
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 900, color: C.text,
            margin: '0 0 6px', lineHeight: 1.3,
          }}>
            {data.title}
          </h1>

          {/* 미션 */}
          <div style={{
            fontSize: '0.85rem', color: data.color, fontWeight: 700,
            padding: '6px 14px', borderRadius: 8,
            background: data.bgColor, display: 'inline-block',
          }}>
            &ldquo;{data.mission}&rdquo;
          </div>

          {/* CLASSIFIED 스탬프 */}
          <div style={{
            position: 'absolute', top: 20, right: 16,
            fontSize: '0.7rem', fontWeight: 900, color: 'rgba(239,68,68,0.2)',
            border: '2px solid rgba(239,68,68,0.2)',
            borderRadius: 4, padding: '2px 6px',
            fontFamily: "'Courier New', monospace",
            animation: 'stampSlam 0.6s ease 0.3s both',
            transform: 'rotate(-12deg)',
          }}>
            CLASSIFIED
          </div>
        </div>

        {/* ── 작전 절차 ── */}
        <div style={{ padding: '16px 24px' }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 800, color: C.muted,
            letterSpacing: '0.15em', marginBottom: 10,
            fontFamily: "'Courier New', monospace",
          }}>
            OPERATION PROCEDURE
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.steps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                background: C.surface,
                border: `1px solid ${data.borderColor}`,
                animation: `lineReveal 0.4s ease ${0.5 + idx * 0.12}s both`,
              }}>
                <span style={{
                  fontSize: '1.2rem', width: 32, textAlign: 'center', flexShrink: 0,
                }}>{step.icon}</span>
                <div>
                  <span style={{
                    fontSize: '0.88rem', fontWeight: 700, color: C.text,
                    lineHeight: 1.4,
                  }}>{step.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 라운드 정보 + 팁 ── */}
        <div style={{ padding: '0 24px 16px' }}>
          {/* 라운드 메타 */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12,
          }}>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
              fontSize: '0.65rem', color: C.amber,
              fontFamily: "'Courier New', monospace", fontWeight: 700,
            }}>
              말투: {style}
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
              fontSize: '0.65rem', color: C.amber,
              fontFamily: "'Courier New', monospace", fontWeight: 700,
            }}>
              {turns}턴
            </div>
          </div>

          {/* 팁 */}
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(74,222,128,0.04)',
            border: '1px dashed rgba(74,222,128,0.15)',
            fontSize: '0.72rem', color: C.textSec, textAlign: 'center',
            lineHeight: 1.5,
          }}>
            💡 {data.tip}
          </div>

          {/* 경고 */}
          {data.warning && (
            <div style={{
              marginTop: 6, padding: '6px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.04)',
              border: '1px dashed rgba(239,68,68,0.15)',
              fontSize: '0.68rem', color: '#f87171', textAlign: 'center',
              fontWeight: 600,
            }}>
              ⚠️ {data.warning}
            </div>
          )}
        </div>

        {/* ── 시작 버튼 / 카운트다운 ── */}
        <div style={{ padding: '0 24px 20px' }}>
          {showCountdown && (
            <div style={{
              marginBottom: 10, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(74,222,128,0.06)',
              border: '1px dashed rgba(74,222,128,0.2)',
              textAlign: 'center',
              fontFamily: "'Courier New', monospace",
            }}>
              <div style={{ fontSize: '0.6rem', color: C.muted, letterSpacing: '0.1em', marginBottom: 3 }}>
                BRIEFING TIME — 대화 시간 소진 안 함
              </div>
              <div style={{
                fontSize: '1.3rem', fontWeight: 900,
                color: timerRemaining <= 3 ? C.danger : C.green,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timerRemaining}s
              </div>
              <div style={{ fontSize: '0.62rem', color: C.muted, marginTop: 2 }}>
                {timerRemaining > 0 ? '잠시 후 자동으로 대화가 시작됩니다' : '대화 시작!'}
              </div>
            </div>
          )}
          <button onClick={onDismiss} style={{
            width: '100%', padding: '14px 0',
            background: `linear-gradient(135deg, ${data.color}, ${data.color}dd)`,
            border: 'none', borderRadius: 10,
            color: '#000', fontWeight: 900, fontSize: '1rem',
            fontFamily: 'inherit', cursor: 'pointer',
            letterSpacing: '0.05em',
            animation: 'pulseBtn 2s ease-in-out infinite',
          }}>
            {showCountdown ? '닫기 (대기 중)' : '임무 수행 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}
