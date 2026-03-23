import { useState } from 'react'
import { formatTime } from '../../utils/socket.js'

const STYLES = [
  { id: '급식체', label: '급식체 (~ㅋㅋ)' },
  { id: '고양이체', label: '고양이체 (~냥)' },
  { id: '뉴스체', label: '뉴스체 (~한다)' },
  { id: '아기체', label: '아기체 (~쥬)' },
  { id: '존댓말체', label: '존댓말체 (~입니다)' },
  { id: '장난체', label: '장난체 (~이지롱)' },
]

const AI_MODELS = [
  { id: 'claude', label: 'Claude' },
  { id: 'gpt', label: 'GPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'solar', label: 'Solar Pro' },
]

const TURNS_OPTIONS = [6, 8, 10]
const CHAT_TIME_OPTIONS = [{ v: 180, l: '3분' }, { v: 300, l: '5분' }, { v: 420, l: '7분' }, { v: 600, l: '10분' }]
const DELAY_OPTIONS = [{ v: 15, l: '15초' }, { v: 20, l: '20초' }, { v: 30, l: '30초' }]
const VOTE_TIME_OPTIONS = [{ v: 60, l: '1분' }, { v: 120, l: '2분' }, { v: 180, l: '3분' }]
const POINT_OPTIONS = [1, 2, 3]

export default function RoundController({
  phase, round, timer, teamProgress, voteProgress,
  roundNum, completedRounds,
  onRoundStart, onForceEndChat, onForceEndVote, onReveal, onTournamentEnd,
}) {
  const [style, setStyle] = useState('급식체')
  const [turns, setTurns] = useState(8)
  const [chatTime, setChatTime] = useState(300)
  const [responseDelay, setResponseDelay] = useState(20)
  const [voteTime, setVoteTime] = useState(120)
  const [pointValue, setPointValue] = useState(1)
  const [aiModel, setAiModel] = useState('claude')
  const [customPoint, setCustomPoint] = useState('')

  const remaining = timer?.remaining ?? 0
  const isUrgent = remaining <= 30 && remaining > 0

  function handleStart() {
    const pt = customPoint ? parseInt(customPoint) : pointValue
    onRoundStart({ style, turns, chatTime, responseDelay, voteTime, pointValue: pt, aiModel })
  }

  // ── 설정 단계 ──────────────────────────────────────
  if (phase === 'setup' || phase === 'waiting') {
    return (
      <div style={{ padding: '16px' }}>
        <div className="sidebar-section-title">⚙️ 라운드 {roundNum} 설정</div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">🎭 말투</div>
          <div className="option-group">
            {STYLES.map((s) => (
              <button
                key={s.id}
                className={`option-btn${style === s.id ? ' selected' : ''}`}
                onClick={() => setStyle(s.id)}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">🤖 AI 모델</div>
          <div className="option-group">
            {AI_MODELS.map((m) => (
              <button
                key={m.id}
                className={`option-btn${aiModel === m.id ? ' selected' : ''}`}
                onClick={() => setAiModel(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">💬 턴 수 (사람/AI 반반)</div>
          <div className="option-group">
            {TURNS_OPTIONS.map((t) => (
              <button
                key={t}
                className={`option-btn${turns === t ? ' selected' : ''}`}
                onClick={() => setTurns(t)}
              >
                {t}턴
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">⏱ 대화 시간</div>
          <div className="option-group">
            {CHAT_TIME_OPTIONS.map((o) => (
              <button
                key={o.v}
                className={`option-btn${chatTime === o.v ? ' selected' : ''}`}
                onClick={() => setChatTime(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">⏳ 응답 딜레이</div>
          <div className="option-group">
            {DELAY_OPTIONS.map((o) => (
              <button
                key={o.v}
                className={`option-btn${responseDelay === o.v ? ' selected' : ''}`}
                onClick={() => setResponseDelay(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label">⏱ 투표 시간</div>
          <div className="option-group">
            {VOTE_TIME_OPTIONS.map((o) => (
              <button
                key={o.v}
                className={`option-btn${voteTime === o.v ? ' selected' : ''}`}
                onClick={() => setVoteTime(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div className="sidebar-item-label">🏆 정답 점수</div>
          <div className="option-group">
            {POINT_OPTIONS.map((p) => (
              <button
                key={p}
                className={`option-btn${pointValue === p && !customPoint ? ' selected' : ''}`}
                onClick={() => { setPointValue(p); setCustomPoint('') }}
              >
                {p}점
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="10"
              placeholder="직접"
              value={customPoint}
              onChange={(e) => setCustomPoint(e.target.value)}
              style={{
                width: '52px', padding: '6px 8px', borderRadius: '6px',
                border: `2px solid ${customPoint ? 'var(--accent)' : 'var(--border)'}`,
                background: 'transparent', color: customPoint ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none',
              }}
            />
          </div>
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={handleStart}>
          🎮 라운드 {roundNum} 시작
        </button>

        {completedRounds?.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div className="sidebar-item-label" style={{ marginBottom: '8px' }}>완료 라운드</div>
            {completedRounds.map((r, i) => (
              <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--muted)', padding: '3px 0' }}>
                ✅ R{r.roundNum} {r.style} ×{r.pointValue}
              </div>
            ))}
            <button
              className="btn btn-danger btn-full btn-sm"
              style={{ marginTop: '12px' }}
              onClick={onTournamentEnd}
            >
              🏁 토너먼트 종료
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── 대화 진행 중 ─────────────────────────────────
  if (phase === 'chatting') {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--success)', fontWeight: 700 }}>●</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>R{round?.roundNum} · {round?.style}</span>
        </div>

        <div className="timer-display" style={{ marginBottom: '16px' }}>
          <div className={`time${isUrgent ? ' urgent' : ''}`} style={{ fontSize: '2rem' }}>
            {formatTime(remaining)}
          </div>
          <div className="label">대화 시간</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div className="sidebar-item-label" style={{ marginBottom: '8px' }}>진행 현황</div>
          {teamProgress?.map((t) => (
            <div key={t.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>
                  <span className="team-dot" style={{ background: t.color, marginRight: '6px' }} />
                  {t.name}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  {t.completedTurns}/{round?.turns}턴
                </span>
              </div>
              <div style={{ display: 'flex', gap: '3px' }}>
                {Array.from({ length: round?.turns || 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`turn-dot${i < t.completedTurns ? ' done' : ''}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          className="btn btn-danger btn-full"
          onClick={onForceEndChat}
        >
          ⏹ 대화 강제 종료
        </button>
      </div>
    )
  }

  // ── 투표 진행 중 ─────────────────────────────────
  if (phase === 'voting') {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>●</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>🗳️ 투표 중</span>
        </div>

        <div className="timer-display" style={{ marginBottom: '16px' }}>
          <div className={`time${isUrgent ? ' urgent' : ''}`} style={{ fontSize: '2rem' }}>
            {formatTime(remaining)}
          </div>
          <div className="label">투표 마감</div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          {voteProgress?.map((t) => (
            <div key={t.teamId} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text)', fontWeight: 600 }}>
                  {t.teamName}
                </span>
                <span style={{ fontSize: '0.8125rem', color: t.submitted ? 'var(--success)' : 'var(--muted)' }}>
                  {t.submitted ? '📮 제출' : `${t.votedCount}/${round?.turns}`}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${((t.votedCount || 0) / (round?.turns || 1)) * 100}%`,
                    background: t.submitted ? 'var(--success)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-danger btn-full" onClick={onForceEndVote}>
          ⏹ 투표 강제 마감
        </button>
      </div>
    )
  }

  // ── 투표 마감됨 (결과 공개 대기) ─────────────────
  if (phase === 'voting-closed' || phase === 'revealed') {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px', color: 'var(--text)' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>🔴 R{round?.roundNum} 마감</div>
        </div>

        {phase === 'voting-closed' && (
          <button className="btn btn-success btn-full btn-lg" onClick={onReveal} style={{ marginBottom: '12px' }}>
            🎯 결과 공개
          </button>
        )}

        <button
          className="btn btn-outline btn-full"
          style={{ marginBottom: '12px', borderColor: 'var(--border)', color: 'var(--muted)' }}
          onClick={() => {}}
        >
          다음 라운드 설정
        </button>

        <button
          className="btn btn-danger btn-full btn-sm"
          onClick={onTournamentEnd}
        >
          🏁 토너먼트 종료
        </button>
      </div>
    )
  }

  return null
}
