import { useState } from 'react'

const TABS = [
  { id: 'overview', label: '게임 소개' },
  { id: 'teacher', label: '교사 안내' },
  { id: 'student', label: '학생 안내' },
  { id: 'tips', label: '수업 운영 팁' },
  { id: 'trouble', label: '문제 해결' },
]

export default function GuidePage({ navigate }) {
  const [tab, setTab] = useState('overview')

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      {/* 헤더 */}
      <header style={{
        padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.1em' }}>📖 GUIDE</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/')} style={linkBtnStyle}>학생 화면</button>
              <button onClick={() => navigate('/teacher')} style={linkBtnStyle}>교사 화면</button>
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, lineHeight: 1.3 }}>
            이미테이션 게임 사용 안내
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 4 }}>
            고등학교 인공지능 기초 · 튜링 테스트 체험 수업
          </p>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#0f172a', position: 'sticky', top: 0, zIndex: 10,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 0, padding: '0 16px' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              color: tab === t.id ? '#818cf8' : '#64748b',
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: tab === t.id ? '2px solid #6366f1' : '2px solid transparent',
              whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>
      </nav>

      {/* 콘텐츠 */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'teacher' && <TeacherTab />}
        {tab === 'student' && <StudentTab />}
        {tab === 'tips' && <TipsTab />}
        {tab === 'trouble' && <TroubleTab />}
      </main>
    </div>
  )
}

// ═══ 스타일 헬퍼 ═══
const linkBtnStyle = {
  padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent', color: '#94a3b8', fontSize: '0.72rem',
  cursor: 'pointer', fontFamily: 'inherit',
}

const cardStyle = {
  padding: '16px 20px', borderRadius: 12,
  background: '#1e293b', border: '1px solid rgba(255,255,255,0.06)',
  marginBottom: 16,
}

const headingStyle = { fontSize: '1.1rem', fontWeight: 800, margin: '0 0 12px', color: '#e2e8f0' }
const subHeadingStyle = { fontSize: '0.92rem', fontWeight: 700, margin: '16px 0 8px', color: '#cbd5e1' }
const paraStyle = { fontSize: '0.82rem', lineHeight: 1.7, color: '#94a3b8', margin: '0 0 10px' }
const labelStyle = { fontSize: '0.65rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 8 }

function Badge({ color, children }) {
  const colors = {
    indigo: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', text: '#818cf8' },
    green: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#34d399' },
    purple: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', text: '#a78bfa' },
    amber: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.25)', text: '#fbbf24' },
    red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#f87171' },
    gray: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', text: '#94a3b8' },
  }
  const c = colors[color] || colors.gray
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 6,
      background: c.bg, border: `1px solid ${c.border}`,
      fontSize: '0.7rem', fontWeight: 700, color: c.text,
    }}>{children}</span>
  )
}

function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.08)',
                whiteSpace: 'nowrap', fontSize: '0.72rem',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '8px 12px', color: '#cbd5e1',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FlowStep({ num, icon, title, desc }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 800, color: '#818cf8',
      }}>{num}</div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{icon} {title}</div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// 탭 1: 게임 소개
// ═══════════════════════════════════════════════
function OverviewTab() {
  return (
    <>
      <div style={cardStyle}>
        <p style={labelStyle}>CONCEPT</p>
        <h2 style={headingStyle}>벽 너머 심문 — 튜링 테스트 팀 대결</h2>
        <p style={paraStyle}>
          1950년 앨런 튜링이 제안한 "이미테이션 게임"을 교실에서 체험합니다.
          심문관은 벽 너머의 상대에게 질문을 보내 사람인지 AI인지 판별하고,
          피심문자는 자연스럽게 답변해서 들키지 않아야 합니다.
        </p>
        <p style={paraStyle}>
          모든 답변은 <strong style={{ color: '#818cf8' }}>같은 말투</strong>로 변환되어 전달되므로,
          말투만으로는 사람과 AI를 구분할 수 없습니다!
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Badge color="indigo">🔍 추리 게임</Badge>
          <Badge color="green">⚔️ 팀 대결</Badge>
          <Badge color="purple">🎭 위장 전략</Badge>
          <Badge color="amber">🗳️ 투표 심리전</Badge>
        </div>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>CORE RULES</p>
        <h2 style={headingStyle}>핵심 규칙</h2>
        <Table
          headers={['항목', '내용']}
          rows={[
            ['참여 단위', '팀 (2~3명)'],
            ['최소 팀 수', '2팀 이상'],
            ['홀수 팀', '1팀은 관찰자 (다른 팀 관전 + 투표)'],
            ['질문/답변 길이', '각 60자 이내'],
            ['매 턴 상대', '사람 또는 AI (랜덤 배정, 반반)'],
            ['채점', '사람/AI 정확히 맞추면 점수 획득'],
          ]}
        />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>GAME FLOW</p>
        <h2 style={headingStyle}>전체 흐름</h2>
        <FlowStep num="1" icon="📋" title="팀 등록" desc="교사가 세션을 만들고, 학생들이 팀을 등록합니다." />
        <FlowStep num="2" icon="⚙️" title="라운드 설정" desc="교사가 말투, AI 모델, 턴 수, 시간 등을 설정합니다." />
        <FlowStep num="3" icon="🎲" title="매칭 & 역할 배정" desc="자동으로 팀 페어링 + 심문관/피심문자 역할이 배정됩니다." />
        <FlowStep num="4" icon="💬" title="심문 채팅" desc="심문관이 질문 → 피심문자(사람 또는 AI)가 답변. 같은 말투로 변환됩니다." />
        <FlowStep num="5" icon="🗳️" title="투표" desc="각 턴의 상대가 사람이었는지 AI였는지 투표합니다." />
        <FlowStep num="6" icon="🎯" title="결과 공개" desc="정답 공개 + 점수 계산. 다음 라운드 또는 최종 순위 발표!" />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>SPEECH STYLES</p>
        <h2 style={headingStyle}>말투 4종</h2>
        <p style={paraStyle}>
          라운드마다 다른 말투를 선택할 수 있습니다. 사람과 AI 모두 같은 말투로 변환되어 전달됩니다.
        </p>
        <Table
          headers={['말투', '설명', '예시']}
          rows={[
            ['자연스러운대화', '고등학생 일상 대화체', '"치킨이 제일 맛있지 않아?"'],
            ['임함체', '-임/-함 종결어미', '"치킨 좋아함"'],
            ['사극체', '조선시대 사극 말투', '"치킨이란 음식이 참으로 맛이 좋사옵니다"'],
            ['AI체', 'AI 챗봇 + 이모지', '"치킨은 정말 맛있어요! 🍗✨"'],
          ]}
        />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>AI MODELS</p>
        <h2 style={headingStyle}>AI 모델 4종</h2>
        <Table
          headers={['모델', '제공사', '특징']}
          rows={[
            ['Claude', 'Anthropic', '자연스러운 한국어, 안정적'],
            ['GPT', 'OpenAI', '다양한 답변 스타일'],
            ['Gemini', 'Google', '빠른 응답'],
            ['Solar Pro 3', 'Upstage', '한국어 특화'],
          ]}
        />
        <p style={paraStyle}>교사가 라운드마다 다른 AI를 선택하면, 학생들이 AI별 차이를 체감할 수 있습니다.</p>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// 탭 2: 교사 안내
// ═══════════════════════════════════════════════
function TeacherTab() {
  return (
    <>
      <div style={cardStyle}>
        <p style={labelStyle}>SETUP</p>
        <h2 style={headingStyle}>초기 설정</h2>
        <FlowStep num="1" icon="🔐" title="교사 PIN 입력" desc="기본 PIN: 000000. /teacher 경로로 접속합니다." />
        <FlowStep num="2" icon="📝" title="수업 코드 입력" desc="예: AI-BASIC-2026. 같은 코드로 재접속하면 기존 세션을 이어서 사용합니다." />
        <FlowStep num="3" icon="📋" title="참가 링크 공유" desc="대시보드의 '참가 링크 복사' 버튼으로 학생에게 공유합니다." />
        <FlowStep num="4" icon="⏳" title="팀 등록 대기" desc="학생들이 팀을 만들면 대시보드에 실시간으로 표시됩니다." />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>DASHBOARD LAYOUT</p>
        <h2 style={headingStyle}>대시보드 구성</h2>
        <div style={{
          padding: '16px', background: '#0f172a', borderRadius: 8,
          border: '1px solid rgba(99,102,241,0.1)',
          fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8',
          lineHeight: 1.8, whiteSpace: 'pre', overflowX: 'auto',
        }}>
{`┌─────────────────────────────────────────────┐
│  🎮 DASHBOARD                               │
├──────────┬──────────────────────────────────┤
│ 사이드바  │  메인 영역 (아레나)              │
│          │                                  │
│ SESSION  │  ⚔️ ARENA (대형 타이머 + 통계)   │
│ STATUS   │  MATCHES (매치 카드 - 페어링)     │
│ ROUND    │  LIVE CHAT (실시간 대화 보기)     │
│ SETUP    │  RESULTS (결과 + 턴별 리뷰)      │
│ AI STATUS│  FINAL (최종 순위 🏆)            │
│ HISTORY  │                                  │
└──────────┴──────────────────────────────────┘`}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>ROUND SETTINGS</p>
        <h2 style={headingStyle}>라운드 설정 항목</h2>
        <Table
          headers={['설정', '옵션', '권장']}
          rows={[
            ['말투', '자연스러운대화, 임함체, 사극체, AI체', '1R: 자연스러운대화'],
            ['AI 모델', 'Claude, GPT, Gemini, Solar', 'Claude 또는 GPT'],
            ['턴 수', '6, 8, 10', '8턴'],
            ['대화 시간', '3분, 5분, 7분, 10분', '5분'],
            ['응답 딜레이', '20초, 30초, 40초', '20초'],
            ['투표 시간', '1분, 2분, 3분', '2분'],
            ['정답 점수', '1~10점', '1점 (후반에 높이기)'],
          ]}
        />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>CONTROLS</p>
        <h2 style={headingStyle}>교사 조작 버튼</h2>
        <Table
          headers={['버튼', '기능', '언제 사용']}
          rows={[
            ['🎮 라운드 시작', '새 라운드 시작', '팀 2개 이상 등록 후'],
            ['⏹ 대화 강제 종료', '채팅 즉시 마감', '모든 팀 턴 완료 시'],
            ['⏹ 투표 강제 마감', '투표 즉시 마감', '모든 팀 투표 완료 시'],
            ['🎯 결과 공개', '정답 + 점수 공개', '투표 마감 후'],
            ['🏁 토너먼트 종료', '최종 순위 발표', '모든 라운드 완료 후'],
          ]}
        />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>ARENA VIEW</p>
        <h2 style={headingStyle}>아레나 — 매치 카드</h2>
        <p style={paraStyle}>
          라운드가 시작되면 메인 영역에 <strong style={{ color: '#818cf8' }}>매치 카드</strong>가 표시됩니다.
          각 카드는 심문관과 피심문자의 대결을 보여줍니다.
        </p>
        <div style={{
          padding: '14px 16px', background: '#0f172a', borderRadius: 8,
          border: '1px solid rgba(99,102,241,0.1)',
          fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8',
          lineHeight: 1.8, whiteSpace: 'pre', overflowX: 'auto',
        }}>
{`┌─────────────────────────────────────┐
│ MATCH 1                    3/8턴   │
│                                     │
│ 🔍 알파팀  ←── 벽 ──→  🎭 베타팀   │
│   심문관                 피심문자   │
│                                     │
│ ▓▓▓▓▓░░░░░░░ 37%                   │
│ 누적 3점              누적 5점      │
└─────────────────────────────────────┘`}
        </div>
        <p style={{ ...paraStyle, marginTop: 12 }}>매치 카드를 클릭하면 해당 팀의 <strong style={{ color: '#818cf8' }}>실시간 대화</strong>를 확인할 수 있습니다.</p>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// 탭 3: 학생 안내
// ═══════════════════════════════════════════════
function StudentTab() {
  return (
    <>
      <div style={cardStyle}>
        <p style={labelStyle}>JOIN</p>
        <h2 style={headingStyle}>입장하기</h2>
        <FlowStep num="1" icon="🔗" title="링크 접속" desc="교사가 공유한 링크 클릭 또는 기본 URL에서 수업 코드 입력" />
        <FlowStep num="2" icon="👥" title="팀 만들기" desc="팀 이름 + 팀원 이름 입력 → '팀 만들고 입장!' 클릭" />
        <FlowStep num="3" icon="⏳" title="대기" desc="'게임 대기 중' 화면에서 교사의 라운드 시작을 기다립니다" />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>🔍 INTERROGATOR</p>
        <h2 style={headingStyle}>심문관 역할</h2>
        <p style={paraStyle}>
          벽 너머의 상대에게 질문을 보내 <strong style={{ color: '#818cf8' }}>사람인지 AI인지</strong> 판별하세요.
        </p>
        <div style={{ ...subHeadingStyle }}>조작법</div>
        <FlowStep num="1" icon="✏️" title="질문 입력" desc="하단 입력창에 60자 이내로 질문을 입력합니다." />
        <FlowStep num="2" icon="↑" title="전송" desc="↑ 버튼 또는 Enter. 질문이 즉시 채팅에 표시됩니다." />
        <FlowStep num="3" icon="⏳" title="응답 대기" desc="카운트다운 + 프로그레스 바가 표시됩니다." />
        <FlowStep num="4" icon="💬" title="답변 확인" desc="'?' 아바타와 함께 답변이 도착합니다." />

        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f87171', marginBottom: 6 }}>⚠️ 질문 규칙</div>
          <ul style={{ ...paraStyle, paddingLeft: 18, margin: 0 }}>
            <li>오늘 날씨, 선생님 이름 등 <strong style={{ color: '#f87171' }}>AI가 답할 수 없는 사실</strong> 금지</li>
            <li>전문 지식 등 <strong style={{ color: '#f87171' }}>친구가 답할 수 없는 내용</strong>도 금지</li>
            <li>취미, 감정, 경험 등 <strong style={{ color: '#34d399' }}>누구나 답할 수 있는 질문</strong>을 하세요</li>
          </ul>
        </div>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>🎭 SUBJECT</p>
        <h2 style={headingStyle}>피심문자 역할</h2>
        <p style={paraStyle}>
          질문에 자연스럽게 답변해서 <strong style={{ color: '#34d399' }}>사람임을 증명</strong>하세요. 들키면 상대 팀 점수!
        </p>

        <div style={subHeadingStyle}>사람 턴 (직접 답변)</div>
        <p style={paraStyle}>
          심문관의 질문이 채팅에 표시되면 하단 입력창에 60자 이내로 답변합니다.
          답변은 <strong style={{ color: '#818cf8' }}>말투 변환</strong> 후 심문관에게 전달됩니다.
        </p>

        <div style={subHeadingStyle}>AI 턴 (위장 모드 🎭)</div>
        <p style={paraStyle}>
          AI가 대신 답변합니다. 채팅에 AI 답변 미리보기가 표시되고,
          하단에 <strong style={{ color: '#a78bfa' }}>"타이핑하는 척하세요"</strong> 입력란이 나옵니다.
          실제로 전송되지는 않지만, 상대에게 자연스럽게 보이기 위해 타이핑하는 척하세요!
        </p>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>👁️ OBSERVER</p>
        <h2 style={headingStyle}>관찰자 역할</h2>
        <p style={paraStyle}>
          홀수 팀일 때 1팀이 관찰자로 배정됩니다.
          다른 팀의 대화를 실시간으로 관전하며, 투표에도 참여할 수 있습니다.
        </p>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>🗳️ VOTE</p>
        <h2 style={headingStyle}>투표하기</h2>
        <FlowStep num="1" icon="📋" title="대화 확인" desc="각 턴의 질문과 답변을 다시 확인합니다." />
        <FlowStep num="2" icon="🧑🤖" title="사람/AI 선택" desc="각 턴에 대해 '🧑 사람' 또는 '🤖 AI' 버튼을 누릅니다." />
        <FlowStep num="3" icon="📮" title="최종 제출" desc="'최종 제출' 버튼을 누릅니다. 제출 후 수정 불가!" />
        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.1)' }}>
          <p style={{ ...paraStyle, margin: 0, fontSize: '0.75rem' }}>
            <strong style={{ color: '#fbbf24' }}>주의:</strong> 미투표 턴은 0점 처리됩니다. 모든 턴에 투표하세요!
          </p>
        </div>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>🎯 RESULTS</p>
        <h2 style={headingStyle}>결과 확인</h2>
        <p style={paraStyle}>
          교사가 결과를 공개하면 각 턴의 정답(실제 사람/AI)이 공개됩니다.
          맞춘 턴은 ✅ + 점수, 틀린 턴은 ❌. 누적 순위가 🥇🥈🥉으로 표시됩니다.
        </p>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// 탭 4: 수업 운영 팁
// ═══════════════════════════════════════════════
function TipsTab() {
  return (
    <>
      <div style={cardStyle}>
        <p style={labelStyle}>LESSON PLAN</p>
        <h2 style={headingStyle}>권장 수업 구성 (50분)</h2>
        <Table
          headers={['시간', '활동', '비고']}
          rows={[
            ['0~5분', '튜링 테스트 개념 설명', '앨런 튜링, 이미테이션 게임 소개'],
            ['5~10분', '앱 접속 + 팀 등록', '링크 공유, 2인 1팀 권장'],
            ['10~25분', '라운드 1 (쉬운 말투)', '자연스러운대화 + Claude, 8턴, 5분'],
            ['25~40분', '라운드 2 (어려운 말투)', '사극체 + GPT, 8턴, 5분'],
            ['40~50분', '결과 토론 + 정리', '어떤 질문이 효과적이었나?'],
          ]}
        />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>ROUND STRATEGY</p>
        <h2 style={headingStyle}>라운드 설계 전략</h2>
        <FlowStep num="1" icon="🟢" title="라운드 1: 워밍업" desc="자연스러운대화 + 1점. 규칙 익히기." />
        <FlowStep num="2" icon="🟡" title="라운드 2: 본격 도전" desc="임함체 또는 사극체 + 2점. 말투 변환 효과 체감." />
        <FlowStep num="3" icon="🔴" title="라운드 3: 역전 기회" desc="AI체 + 3점. 높은 배점으로 역전 드라마!" />
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>GOOD QUESTIONS</p>
        <h2 style={headingStyle}>효과적인 질문 예시</h2>
        <Table
          headers={['질문', '왜 좋은가']}
          rows={[
            ['"요즘 빠진 취미가 있어?"', '개인 경험 + 감정 요구'],
            ['"학교 급식 중에 뭐가 제일 싫어?"', '구체적 선호도'],
            ['"친구랑 싸웠을 때 어떤 기분이야?"', '감정 묘사 능력'],
            ['"갑자기 100만원 생기면 뭐 할래?"', '가치관 + 상상력'],
            ['"어제 꿈 꿨어? 무슨 꿈?"', '즉흥적 개인 경험'],
          ]}
        />

        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: 4 }}>나쁜 질문 예시</div>
          <Table
            headers={['질문', '왜 안 되는가']}
            rows={[
              ['"오늘 날씨 어때?"', 'AI가 답할 수 없음 (외부 정보)'],
              ['"양자역학이 뭐야?"', '친구도 답하기 어려움'],
              ['"너 AI야?"', '직접 물어보면 안 됨'],
            ]}
          />
        </div>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>DISCUSSION</p>
        <h2 style={headingStyle}>토론 포인트</h2>
        <ul style={{ ...paraStyle, paddingLeft: 18, lineHeight: 2.2 }}>
          <li>어떤 질문이 사람/AI 구분에 가장 효과적이었나?</li>
          <li>AI가 어떤 답변에서 티가 났는가?</li>
          <li>말투 변환이 판별을 얼마나 어렵게 했는가?</li>
          <li>AI 기술이 더 발전하면 구분이 가능할까?</li>
          <li>튜링 테스트를 통과한 AI는 "생각한다"고 할 수 있을까?</li>
        </ul>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════
// 탭 5: 문제 해결
// ═══════════════════════════════════════════════
function TroubleTab() {
  return (
    <>
      <div style={cardStyle}>
        <p style={labelStyle}>CONNECTIVITY</p>
        <h2 style={headingStyle}>접속 문제</h2>
        <div style={subHeadingStyle}>DNS 문제 (Railway URL 접속 불가)</div>
        <p style={paraStyle}>
          한국 ISP DNS가 Railway URL을 차단할 수 있습니다.
        </p>
        <FlowStep num="1" icon="⚙️" title="Mac 설정 열기" desc="시스템 설정 → 네트워크 → Wi-Fi → 세부사항" />
        <FlowStep num="2" icon="🌐" title="DNS 변경" desc="DNS 탭 → + 버튼 → 8.8.8.8 (Google DNS) 추가" />
        <FlowStep num="3" icon="🌐" title="보조 DNS" desc="1.1.1.1 (Cloudflare DNS)도 추가" />
        <FlowStep num="4" icon="✅" title="적용" desc="확인 버튼 → 브라우저 재시작" />

        <div style={{ ...subHeadingStyle, marginTop: 16 }}>학생이 접속이 안 될 때</div>
        <ul style={{ ...paraStyle, paddingLeft: 18, lineHeight: 2.0 }}>
          <li>참가 링크가 올바른지 확인</li>
          <li>같은 Wi-Fi 네트워크에 있는지 확인</li>
          <li>브라우저 캐시 삭제 후 재접속</li>
          <li>다른 브라우저(Chrome, Safari) 시도</li>
        </ul>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>GAME ISSUES</p>
        <h2 style={headingStyle}>게임 진행 문제</h2>

        <div style={subHeadingStyle}>라운드가 시작되지 않을 때</div>
        <p style={paraStyle}>팀이 2개 이상 등록되어 있어야 합니다. 이전 라운드가 완전히 끝나지 않았을 수 있으니 "결과 공개" 버튼을 클릭해 보세요.</p>

        <div style={subHeadingStyle}>AI 응답이 없거나 느릴 때</div>
        <p style={paraStyle}>
          대시보드 사이드바의 <strong style={{ color: '#818cf8' }}>AI STATUS</strong>를 확인하세요.
          "준비"가 아닌 모델은 API 키가 없는 것입니다. 다른 모델로 변경하거나, 응답 딜레이를 30초로 늘려 보세요.
        </p>

        <div style={subHeadingStyle}>학생 화면이 멈췄을 때</div>
        <p style={paraStyle}>페이지 새로고침(F5)하세요. 라운드 진행 중이면 자동으로 현재 상태를 복구합니다.</p>

        <div style={subHeadingStyle}>투표 화면에 대화가 안 보일 때</div>
        <p style={paraStyle}>대화 시간 내에 턴이 하나도 완료되지 않은 경우입니다. 교사가 "대화 강제 종료"로 넘어가면 현재까지 완료된 턴만 투표 가능합니다.</p>
      </div>

      <div style={cardStyle}>
        <p style={labelStyle}>TECH INFO</p>
        <h2 style={headingStyle}>기술 정보</h2>
        <Table
          headers={['항목', '내용']}
          rows={[
            ['프론트엔드', 'React 18 + Vite'],
            ['백엔드', 'Express + Socket.IO'],
            ['데이터베이스', 'SQLite (better-sqlite3)'],
            ['AI 말투 변환', 'Claude Haiku (빠른 속도)'],
            ['AI 응답 생성', '교사 선택 모델'],
            ['실시간 통신', 'WebSocket (Socket.IO)'],
            ['배포', 'Railway (Docker)'],
          ]}
        />
      </div>
    </>
  )
}
