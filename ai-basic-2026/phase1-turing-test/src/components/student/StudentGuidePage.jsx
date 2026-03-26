/**
 * 학생용 비주얼 안내 페이지
 * 게임 진행 순서에 따라 각 화면을 CSS 목업으로 보여줌
 */

// ── 컬러 팔레트 (실제 게임과 동일) ──
const C = {
  bg: '#080d08',
  surface: '#0f1a0f',
  card: '#162216',
  amber: '#d4a574',
  amberDim: 'rgba(212,165,116,0.12)',
  amberBorder: 'rgba(212,165,116,0.15)',
  amberGlow: 'rgba(212,165,116,0.08)',
  gold: '#b8860b',
  green: '#4ade80',
  greenDim: 'rgba(74,222,128,0.1)',
  greenBorder: 'rgba(74,222,128,0.15)',
  emerald: '#059669',
  purple: '#8b5cf6',
  purpleDim: 'rgba(139,92,246,0.12)',
  purpleBorder: 'rgba(139,92,246,0.15)',
  text: '#d4d4c8',
  textSec: '#9aaa8a',
  muted: '#5a6b4a',
  danger: '#ef4444',
}

const ANIMS = `
@keyframes guideFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes guideGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(212,165,116,0.05); }
  50% { box-shadow: 0 0 40px rgba(212,165,116,0.15); }
}
@keyframes guidePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes guideDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
`

// ── 폰 프레임 ──
function PhoneFrame({ title, step, accent = C.amber, children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 320, margin: '0 auto',
      animation: 'guideFadeIn 0.5s ease',
    }}>
      {/* 단계 라벨 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `${accent}22`, border: `2px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.8rem', fontWeight: 900, color: accent,
        }}>{step}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: C.text }}>{title}</div>
      </div>

      {/* 폰 외곽 */}
      <div style={{
        borderRadius: 20, overflow: 'hidden',
        border: `2px solid ${accent}33`,
        background: C.bg,
        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${accent}11`,
      }}>
        {/* 노치 */}
        <div style={{
          height: 20, background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 60, height: 6, borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
          }} />
        </div>
        {/* 화면 내용 */}
        <div style={{ minHeight: 360 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── 설명 박스 ──
function Desc({ children, icon }) {
  return (
    <div style={{
      maxWidth: 320, margin: '12px auto 0', padding: '10px 14px', borderRadius: 10,
      background: 'rgba(212,165,116,0.04)', border: '1px solid rgba(212,165,116,0.1)',
      fontSize: '0.8rem', color: C.textSec, lineHeight: 1.6,
    }}>
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
      {children}
    </div>
  )
}

// ── 화살표 구분선 ──
function Arrow() {
  return (
    <div style={{
      textAlign: 'center', padding: '24px 0 8px',
      fontSize: '1.4rem', color: C.muted,
    }}>
      ↓
    </div>
  )
}

export default function StudentGuidePage({ navigate }) {
  return (
    <div style={{ minHeight: '100vh', background: '#060a06', color: C.text }}>
      <style>{ANIMS}</style>

      {/* ═══ 헤더 ═══ */}
      <header style={{
        padding: '24px 20px 20px',
        background: `linear-gradient(180deg, rgba(212,165,116,0.06) 0%, transparent 100%)`,
        borderBottom: `1px solid ${C.amberBorder}`,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
          }}>
            <button onClick={() => navigate('/')} style={{
              padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.amberBorder}`,
              background: 'transparent', color: C.textSec, fontSize: '0.72rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← 돌아가기</button>
            <div style={{
              padding: '3px 10px', borderRadius: 6,
              background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
              fontSize: '0.6rem', fontWeight: 700, color: C.amber,
              fontFamily: "'Courier New', monospace", letterSpacing: '0.1em',
            }}>📖 STUDENT GUIDE</div>
          </div>

          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px',
            background: C.amberDim, border: `2px solid ${C.amberBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
          }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: '0 0 6px' }}>
            이미테이션 게임 안내
          </h1>
          <p style={{ fontSize: '0.82rem', color: C.textSec, margin: 0 }}>
            게임 시작 전에 각 화면을 미리 확인하세요!
          </p>
        </div>
      </header>

      {/* ═══ 게임 흐름 개요 ═══ */}
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '24px 16px 0' }}>
        <div style={{
          padding: '14px 18px', borderRadius: 12,
          background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
          marginBottom: 8,
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 700, color: C.amber,
            letterSpacing: '0.1em', marginBottom: 8,
            fontFamily: "'Courier New', monospace",
          }}>GAME FLOW</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['①입장', '②대기', '③미션브리핑', '④채팅', '⑤투표', '⑥결과'].map((s) => (
              <span key={s} style={{
                padding: '3px 8px', borderRadius: 6,
                background: 'rgba(212,165,116,0.08)', border: `1px solid ${C.amberBorder}`,
                fontSize: '0.7rem', color: C.text, fontWeight: 600,
              }}>{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 화면별 안내 ═══ */}
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '24px 16px 60px' }}>

        {/* ── STEP 1: 입장 ── */}
        <PhoneFrame step="1" title="수업 코드 입력 & 팀 만들기">
          <div style={{ padding: 16 }}>
            {/* 헤더 모킹 */}
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: C.amber, letterSpacing: '0.1em', fontFamily: "'Courier New', monospace" }}>🔐 THE IMITATION GAME</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: C.text, margin: '4px 0' }}>이미테이션 게임</div>
              <div style={{ fontSize: '0.65rem', color: C.muted }}>기계인가, 인간인가?</div>
            </div>
            {/* 코드 입력 */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 12, border: `1px solid ${C.amberBorder}`, marginBottom: 12 }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 6 }}>ENTER GAME</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.text, marginBottom: 8 }}>수업 코드 입력</div>
              <div style={{
                padding: '8px 10px', borderRadius: 6, background: C.card,
                border: `1px solid ${C.amberBorder}`, fontSize: '0.75rem', color: C.muted,
              }}>AI-BASIC-2026</div>
              <div style={{
                marginTop: 8, padding: '8px 0', borderRadius: 6, textAlign: 'center',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                fontSize: '0.75rem', fontWeight: 700, color: '#fff',
              }}>입장하기</div>
            </div>
            {/* 팀 만들기 */}
            <div style={{ background: C.surface, borderRadius: 10, padding: 12, border: `1px solid ${C.amberBorder}` }}>
              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 6 }}>CREATE TEAM</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.text, marginBottom: 8 }}>우리 팀 만들기</div>
              {['팀 이름', '팀원 1 이름', '팀원 2 이름 (선택)'].map((ph, i) => (
                <div key={i} style={{
                  padding: '6px 10px', borderRadius: 6, background: C.card,
                  border: `1px solid ${C.amberBorder}`, fontSize: '0.7rem', color: C.muted,
                  marginBottom: 4,
                }}>{ph}</div>
              ))}
              <div style={{
                marginTop: 6, padding: '8px 0', borderRadius: 6, textAlign: 'center',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                fontSize: '0.75rem', fontWeight: 700, color: '#fff',
              }}>팀 만들고 입장! 🚀</div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="💡">선생님이 알려준 <strong style={{ color: C.amber }}>수업 코드</strong>를 입력하고, 팀 이름과 팀원 이름을 넣으면 바로 게임에 참가할 수 있어요!</Desc>

        <Arrow />

        {/* ── STEP 2: 대기 ── */}
        <PhoneFrame step="2" title="게임 대기">
          <div style={{ padding: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: C.surface, borderRadius: 8, border: `1px solid ${C.amberBorder}`,
              marginBottom: 20,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: C.text }}>AI 탐정단</span>
              <span style={{ fontSize: '0.65rem', color: C.muted }}>민수 · 지영</span>
            </div>
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: C.text, marginBottom: 6 }}>게임 대기 중</div>
              <div style={{ fontSize: '0.72rem', color: C.muted, lineHeight: 1.6 }}>
                교사가 라운드를 시작하면<br />자동으로 채팅이 시작됩니다
              </div>
              <div style={{
                display: 'inline-block', marginTop: 14, padding: '6px 14px', borderRadius: 8,
                background: C.surface, border: `1px solid ${C.amberBorder}`,
                fontSize: '0.75rem', color: C.amber,
              }}>AI 탐정단 준비 완료!</div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="⏳">팀 입장 후 선생님이 라운드를 시작할 때까지 기다립니다. 이 화면에서 다른 조작은 필요 없어요.</Desc>

        <Arrow />

        {/* ── STEP 3: 미션 브리핑 ── */}
        <PhoneFrame step="3" title="미션 브리핑 (역할 배정)" accent={C.amber}>
          <div style={{ background: 'rgba(0,0,0,0.92)', padding: 16, minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', background: C.bg,
              border: `2px solid ${C.amberBorder}`, borderRadius: 14,
              overflow: 'hidden',
            }}>
              {/* 헤더 */}
              <div style={{
                padding: '10px 14px 8px', textAlign: 'center',
                background: C.amberDim, borderBottom: `1px solid ${C.amberBorder}`,
              }}>
                <div style={{ fontSize: '0.45rem', fontWeight: 800, color: C.danger, letterSpacing: '0.2em', fontFamily: "'Courier New', monospace" }}>
                  ▲ CLASSIFIED — TOP SECRET ▲
                </div>
                <div style={{ fontSize: '0.5rem', color: C.muted, fontFamily: "'Courier New', monospace", marginTop: 2 }}>
                  ROUND 1 · MISSION BRIEFING
                </div>
              </div>
              {/* 역할 아이콘 */}
              <div style={{ padding: '14px 16px 0', textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, margin: '0 auto 8px',
                  background: C.amberDim, border: `2px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>🔐</div>
                <div style={{ fontSize: '0.5rem', fontWeight: 800, color: C.amber, letterSpacing: '0.15em', fontFamily: "'Courier New', monospace" }}>CODENAME: INTERROGATOR</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: C.text, margin: '4px 0' }}>당신은 심문관입니다</div>
                <div style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 6,
                  background: C.amberDim, fontSize: '0.7rem', color: C.amber, fontWeight: 700,
                }}>&ldquo;벽 너머 상대의 정체를 밝혀라&rdquo;</div>
              </div>
              {/* 절차 */}
              <div style={{ padding: '10px 16px' }}>
                <div style={{ fontSize: '0.48rem', fontWeight: 800, color: C.muted, letterSpacing: '0.12em', fontFamily: "'Courier New', monospace", marginBottom: 6 }}>OPERATION PROCEDURE</div>
                {[
                  { icon: '✍️', text: '질문을 입력해 상대에게 보내세요' },
                  { icon: '⏳', text: '몇 초 후 답변이 도착합니다' },
                  { icon: '🔄', text: '답변을 읽고 다시 새 질문을 보내세요' },
                  { icon: '🗳️', text: '모든 턴이 끝나면 사람/AI 투표!' },
                ].map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6, marginBottom: 3,
                    background: C.surface, border: `1px solid ${C.amberBorder}`,
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{step.icon}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: C.text }}>{step.text}</span>
                  </div>
                ))}
              </div>
              {/* 버튼 */}
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{
                  padding: '10px 0', textAlign: 'center', borderRadius: 8,
                  background: `linear-gradient(135deg, ${C.amber}, ${C.amber}dd)`,
                  fontWeight: 900, fontSize: '0.85rem', color: '#000',
                }}>임무 수행 시작</div>
              </div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="🎬">라운드가 시작되면 <strong style={{ color: C.amber }}>기밀 문서 스타일</strong>로 당신의 역할을 알려줍니다. 역할은 3가지: <strong style={{ color: C.amber }}>심문관</strong>(질문), <strong style={{ color: C.green }}>플레이어</strong>(응답), <strong style={{ color: '#94a3b8' }}>관찰자</strong>(감청). 읽고 나서 아무 곳이나 터치하면 게임 시작!</Desc>

        <Arrow />

        {/* ── STEP 4A: 심문관 채팅 ── */}
        <PhoneFrame step="4" title="채팅 — 심문관(질문하기)" accent={C.amber}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 360 }}>
            {/* 헤더 */}
            <div style={{
              padding: '8px 12px', background: C.surface,
              borderBottom: `1px solid ${C.amberBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, background: C.amberDim,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem',
                }}>🔐</div>
                <div>
                  <div style={{ fontSize: '0.55rem', fontWeight: 800, color: C.amber, fontFamily: "'Courier New', monospace" }}>IMITATION GAME</div>
                  <div style={{ fontSize: '0.48rem', color: C.muted }}>기계인가, 인간인가?</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.5rem', padding: '2px 6px', borderRadius: 3, background: C.amberGlow, border: `1px solid ${C.amberBorder}`, color: C.muted, fontFamily: "'Courier New', monospace" }}>R1 · 자연스러운대화</span>
                <span style={{ fontSize: '0.5rem', padding: '2px 6px', borderRadius: 3, background: C.amberDim, color: C.amber, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>2/8</span>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: C.text, fontFamily: "'Courier New', monospace" }}>3:42</span>
              </div>
            </div>

            {/* 채팅 내용 */}
            <div style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
              {/* 구분선 */}
              <div style={{ textAlign: 'center', fontSize: '0.45rem', color: C.muted, letterSpacing: '0.1em', fontFamily: "'Courier New', monospace", margin: '4px 0 6px' }}>
                ─── TRANSMISSION #1 ───
              </div>
              {/* 내 질문 (오른쪽) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 10px',
                  background: `linear-gradient(135deg, ${C.gold}, #a0750a)`,
                  color: '#fff', borderRadius: '10px 10px 3px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                }}>좋아하는 음식이 뭐야?</div>
              </div>
              {/* 상대 답변 (왼쪽) */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 3, background: C.amberGlow,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem', color: C.muted, fontWeight: 800,
                }}>?</div>
                <div style={{
                  maxWidth: '70%', padding: '8px 10px',
                  background: C.card, color: C.text,
                  borderRadius: '3px 10px 10px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                  border: `1px solid ${C.amberBorder}`,
                }}>음 나는 떡볶이? 매운 거 좋아해ㅋ</div>
              </div>

              {/* 구분선 2 */}
              <div style={{ textAlign: 'center', fontSize: '0.45rem', color: C.muted, letterSpacing: '0.1em', fontFamily: "'Courier New', monospace", margin: '10px 0 6px' }}>
                ─── TRANSMISSION #2 ───
              </div>
              {/* 새 질문 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 10px',
                  background: `linear-gradient(135deg, ${C.gold}, #a0750a)`,
                  color: '#fff', borderRadius: '10px 10px 3px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                }}>왜 좋아해?</div>
              </div>
              {/* 대기 점 */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 3, background: C.amberGlow,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.55rem', color: C.muted, fontWeight: 800,
                }}>?</div>
                <div style={{
                  padding: '8px 12px', background: C.card,
                  border: `1px solid ${C.amberBorder}`, borderRadius: '3px 10px 10px 3px',
                  display: 'flex', gap: 3,
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 4, height: 4, borderRadius: '50%', background: C.amber,
                      animation: `guideDot 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
              {/* 카운트다운 */}
              <div style={{
                textAlign: 'center', padding: '4px', fontSize: '0.55rem', color: C.textSec,
                fontFamily: "'Courier New', monospace", marginTop: 4,
              }}>
                RECEIVING · <span style={{ fontWeight: 700, color: C.amber }}>12s</span>
              </div>
            </div>

            {/* 입력창 */}
            <div style={{
              display: 'flex', gap: 6, padding: '8px 12px',
              background: C.surface, borderTop: `1px solid ${C.amberBorder}`,
            }}>
              <div style={{
                flex: 1, padding: '8px 10px', background: C.card,
                border: `1px solid ${C.amberBorder}`, borderRadius: 6,
                fontSize: '0.7rem', color: C.muted,
              }}>수신 대기 중...</div>
              <div style={{
                width: 36, height: 36, borderRadius: 6,
                background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.muted, fontSize: '0.9rem',
              }}>↑</div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="🔍">
          <strong style={{ color: C.amber }}>심문관</strong>은 상대에게 질문을 보내고 답변을 분석합니다.
          상대가 <strong>사람인지 AI인지</strong> 판별하는 것이 목표!
          <br /><br />
          <span style={{ color: '#f87171' }}>⚠ 주의:</span> AI가 답할 수 없는 사실 확인 질문(예: "3교시 뭐야?")은 금지! 취미, 감정, 경험 등 <strong>누구나 답할 수 있는 질문</strong>을 하세요.
        </Desc>

        <Arrow />

        {/* ── STEP 4B: 플레이어 채팅 ── */}
        <PhoneFrame step="4" title="채팅 — 플레이어(답변하기)" accent={C.green}>
          <div style={{ display: 'flex', flexDirection: 'column', height: 360 }}>
            {/* 헤더 */}
            <div style={{
              padding: '8px 12px', background: C.surface,
              borderBottom: `1px solid ${C.greenBorder}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, background: C.amberDim,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem',
                }}>📡</div>
                <div>
                  <div style={{ fontSize: '0.55rem', fontWeight: 800, color: C.amber, fontFamily: "'Courier New', monospace" }}>IMITATION GAME</div>
                  <div style={{ fontSize: '0.48rem', color: C.muted }}>인간처럼 답하세요</div>
                </div>
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: C.text, fontFamily: "'Courier New', monospace" }}>4:15</span>
            </div>

            {/* 채팅 내용 */}
            <div style={{ flex: 1, padding: '10px 12px' }}>
              {/* 사람 턴 — 질문 수신 */}
              <div style={{ textAlign: 'center', fontSize: '0.45rem', color: C.muted, letterSpacing: '0.1em', fontFamily: "'Courier New', monospace", margin: '4px 0 6px' }}>
                ─── TRANSMISSION #3 ───
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 3, background: C.amberGlow,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5rem', color: C.amber,
                }}>🔐</div>
                <div style={{
                  maxWidth: '70%', padding: '8px 10px',
                  background: C.card, color: C.text,
                  borderRadius: '3px 10px 10px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                  border: `1px solid ${C.amberBorder}`,
                }}>요즘 뭐에 빠져있어?</div>
              </div>

              {/* AI 턴 미리보기 */}
              <div style={{ textAlign: 'center', fontSize: '0.45rem', color: C.muted, letterSpacing: '0.1em', fontFamily: "'Courier New', monospace", margin: '14px 0 6px' }}>
                ─── TRANSMISSION #4 ───
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 3, background: C.amberGlow,
                  border: `1px solid ${C.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.5rem', color: C.amber,
                }}>🔐</div>
                <div style={{
                  maxWidth: '70%', padding: '8px 10px',
                  background: C.card, color: C.text,
                  borderRadius: '3px 10px 10px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                  border: `1px solid ${C.amberBorder}`,
                }}>주말에 주로 뭐 해?</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 10px',
                  background: C.purpleDim, color: '#c4b5fd',
                  borderRadius: '10px 10px 3px 10px',
                  fontSize: '0.75rem', lineHeight: 1.5,
                  border: `1px solid ${C.purpleBorder}`,
                }}>
                  <div style={{ fontSize: '0.48rem', color: '#a78bfa', marginBottom: 2, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>🤖 AUTO-RESPONSE</div>
                  집에서 쉬면서 유튜브 봐~
                </div>
              </div>
            </div>

            {/* 사람 턴 입력 */}
            <div style={{
              display: 'flex', gap: 6, padding: '8px 12px',
              background: C.surface, borderTop: `1px solid ${C.greenBorder}`,
            }}>
              <div style={{
                flex: 1, padding: '8px 10px', background: C.card,
                border: `1px solid ${C.greenBorder}`, borderRadius: 6,
                fontSize: '0.7rem', color: C.text,
              }}>요즘 넷플 보는 중ㅋㅋ</div>
              <div style={{
                width: 36, height: 36, borderRadius: 6,
                background: `linear-gradient(135deg, #10b981, ${C.emerald})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.9rem', fontWeight: 700,
              }}>↑</div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="🎭">
          <strong style={{ color: C.green }}>플레이어</strong>는 두 가지 상황이 번갈아 나옵니다:
          <br />• <strong style={{ color: C.green }}>사람 턴</strong>: 직접 답변을 입력 → <strong>자연스럽게!</strong>
          <br />• <strong style={{ color: C.purple }}>AI 턴</strong>: AI가 자동 응답 → <strong>가만히 기다리기</strong> (타이핑하는 척!)
          <br /><br />
          모든 답변은 <strong>같은 말투로 변환</strong>되어 전달되므로, 심문관은 문체로는 구별할 수 없어요.
        </Desc>

        <Arrow />

        {/* ── STEP 5: 투표 ── */}
        <PhoneFrame step="5" title="투표 — 사람 vs AI 판별" accent="#f59e0b">
          <div style={{ display: 'flex', flexDirection: 'column', height: 360 }}>
            {/* 헤더 */}
            <div style={{
              padding: '10px 14px', background: '#92400E',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>🗳️ 투표 시간!</div>
                <div style={{ fontSize: '0.55rem', color: '#fcd34d', marginTop: 1 }}>각 턴의 상대가 사람인지 AI인지 맞춰보세요</div>
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff', fontFamily: "'Courier New', monospace" }}>1:48</span>
            </div>

            {/* 투표 현황 */}
            <div style={{
              padding: '6px 14px', background: 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#fcd34d' }}>투표 현황: 3/8턴</span>
              <div style={{
                width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
              }}>
                <div style={{ height: '100%', width: '37.5%', borderRadius: 2, background: '#f59e0b' }} />
              </div>
            </div>

            {/* 투표 카드들 */}
            <div style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
              {/* 턴 1 - 선택됨 */}
              <div style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(34,197,94,0.04)', border: '2px solid rgba(34,197,94,0.3)',
              }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted, marginBottom: 4 }}>── 턴 1 ──</div>
                <div style={{ fontSize: '0.72rem', color: C.text, marginBottom: 2 }}>
                  <span style={{ color: C.muted }}>질문: </span><strong>좋아하는 음식이 뭐야?</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: C.text, marginBottom: 8 }}>
                  <span style={{ color: C.muted }}>답변: </span>음 나는 떡볶이? 매운 거 좋아해ㅋ
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, textAlign: 'center',
                    background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
                    fontSize: '0.8rem', fontWeight: 700, color: '#22c55e',
                  }}>🧑 사람</div>
                  <div style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, textAlign: 'center',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.8rem', color: C.muted,
                  }}>🤖 AI</div>
                </div>
              </div>
              {/* 턴 2 - 미선택 */}
              <div style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted, marginBottom: 4 }}>── 턴 2 ──</div>
                <div style={{ fontSize: '0.72rem', color: C.text, marginBottom: 2 }}>
                  <span style={{ color: C.muted }}>질문: </span><strong>왜 좋아해?</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: C.text, marginBottom: 8 }}>
                  <span style={{ color: C.muted }}>답변: </span>스트레스 받을 때 매운 거 먹으면 시원하잖아
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, textAlign: 'center',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.8rem', color: C.muted,
                  }}>🧑 사람</div>
                  <div style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, textAlign: 'center',
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.8rem', color: C.muted,
                  }}>🤖 AI</div>
                </div>
              </div>
            </div>

            {/* 제출 버튼 */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', background: C.surface }}>
              <div style={{
                padding: '10px 0', borderRadius: 8, textAlign: 'center',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                fontSize: '0.85rem', fontWeight: 800, color: '#000',
              }}>📮 최종 제출 (3/8턴)</div>
              <div style={{ fontSize: '0.55rem', color: C.muted, marginTop: 4, textAlign: 'center' }}>⚠️ 제출 후 수정 불가 · 미투표 턴은 0점</div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="🗳️">
          채팅이 끝나면 <strong style={{ color: '#f59e0b' }}>투표 시간</strong>! 각 턴의 답변을 다시 읽고 <strong>사람인지 AI인지</strong> 판별하세요.
          <br />맞추면 점수를 얻고, 틀리면 0점입니다. 미투표 턴도 0점이니 꼭 전부 투표하세요!
        </Desc>

        <Arrow />

        {/* ── STEP 6: 결과 ── */}
        <PhoneFrame step="6" title="결과 확인 & 순위" accent="#818cf8">
          <div style={{ display: 'flex', flexDirection: 'column', height: 360 }}>
            {/* 헤더 */}
            <div style={{ padding: '10px 14px', background: '#065f46' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>🎯 라운드 1 결과!</div>
              <div style={{ fontSize: '0.55rem', color: '#6ee7b7', marginTop: 1 }}>자연스러운대화 · 1점/정답</div>
            </div>

            <div style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
              {/* 내 결과 */}
              <div style={{
                padding: '10px 12px', borderRadius: 10, marginBottom: 10,
                background: 'rgba(99,102,241,0.04)', border: '2px solid rgba(99,102,241,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                  <strong style={{ fontSize: '0.8rem' }}>AI 탐정단</strong>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '0.85rem', color: '#818cf8' }}>이번: +5점</span>
                </div>
                {/* 턴별 결과 */}
                {[
                  { num: 1, verdict: 'human', actual: 'human', correct: true },
                  { num: 2, verdict: 'ai', actual: 'human', correct: false },
                ].map((t) => (
                  <div key={t.num} style={{
                    padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                    background: t.correct ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${t.correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 700 }}>턴 {t.num}</span>
                    <span>
                      투표: {t.verdict === 'human' ? '🧑' : '🤖'} |
                      실제: {t.actual === 'human' ? '🧑' : '🤖'} →
                      <strong style={{ color: t.correct ? '#22c55e' : '#ef4444' }}>
                        {t.correct ? ' ✅ +1점' : ' ❌'}
                      </strong>
                    </span>
                  </div>
                ))}
              </div>

              {/* 순위 */}
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.text, marginBottom: 6 }}>누적 순위</div>
                {[
                  { rank: '🥇', name: 'AI 탐정단', color: '#22c55e', score: 12, me: true },
                  { rank: '🥈', name: '튜링 팀', color: '#3b82f6', score: 10, me: false },
                  { rank: '🥉', name: '코드브레이커', color: '#f59e0b', score: 8, me: false },
                ].map((t) => (
                  <div key={t.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                    borderRadius: 6, marginBottom: 3,
                    background: t.me ? 'rgba(99,102,241,0.06)' : 'transparent',
                    border: t.me ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  }}>
                    <span style={{ fontSize: '0.9rem', minWidth: 22 }}>{t.rank}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color }} />
                    <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: t.me ? 700 : 400, color: C.text }}>{t.name}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: '#818cf8' }}>{t.score}점</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PhoneFrame>
        <Desc icon="🎯">라운드가 끝나면 <strong style={{ color: '#818cf8' }}>턴별 정오답</strong>과 <strong style={{ color: '#818cf8' }}>누적 순위</strong>가 공개됩니다. 여러 라운드를 진행한 뒤 토너먼트가 끝나면 <strong>최종 순위</strong>와 <strong>MVP</strong>도 확인할 수 있어요!</Desc>

        {/* ═══ 하단: 핵심 규칙 ═══ */}
        <div style={{
          marginTop: 40, padding: '20px 18px', borderRadius: 14,
          background: C.amberGlow, border: `1px solid ${C.amberBorder}`,
        }}>
          <div style={{
            fontSize: '0.6rem', fontWeight: 700, color: C.amber,
            letterSpacing: '0.12em', marginBottom: 10,
            fontFamily: "'Courier New', monospace",
          }}>⚡ KEY RULES</div>
          <div style={{ fontSize: '0.82rem', color: C.text, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 6 }}><strong style={{ color: C.amber }}>① 질문 규칙</strong> — AI가 답할 수 없는 사실 질문(예: "지금 몇 교시야?") 금지. 누구나 답할 수 있는 질문만!</div>
            <div style={{ marginBottom: 6 }}><strong style={{ color: C.green }}>② 답변 규칙</strong> — 짧고 자연스럽게! 너무 완벽한 답변은 오히려 AI처럼 보여요.</div>
            <div style={{ marginBottom: 6 }}><strong style={{ color: '#f59e0b' }}>③ 투표</strong> — 모든 턴에 반드시 투표! 미투표 = 0점입니다.</div>
            <div><strong style={{ color: '#818cf8' }}>④ 역할 순환</strong> — 매 라운드 역할이 바뀝니다. 이번에 심문관이면 다음엔 플레이어!</div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <button onClick={() => navigate('/')} style={{
            padding: '14px 40px', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${C.amber}, ${C.gold})`,
            fontSize: '1rem', fontWeight: 900, color: '#000',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            게임 참가하기 →
          </button>
        </div>
      </div>
    </div>
  )
}
