import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost } from '../../utils/api.js'
import { createSocket } from '../../utils/socket.js'
import { withBase } from '../../config.js'

const AUTH_KEY = 'turing_test_teacher_auth'
const SESSION_KEY = 'turing_test_teacher_session'

const styleOptions = ['자연스러운대화', '임함체', '사극체', 'AI체']
const aiModelOptions = [
  { value: 'claude', label: 'Claude' },
  { value: 'gpt', label: 'GPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'solar', label: 'Solar Pro 3' },
]

const defaultSettings = {
  style: '고양이체',
  aiModel: 'claude',
  turns: 8,
  chatTime: 300,
  responseDelay: 30,
  voteTime: 120,
  pointValue: 1,
}

export default function TeacherApp({ navigate }) {
  const [authed, setAuthed] = useState(() => {
    const timestamp = sessionStorage.getItem(AUTH_KEY)
    return timestamp && Date.now() - Number(timestamp) < 2 * 60 * 60 * 1000
  })
  const [pin, setPin] = useState('')
  const [teacherCode, setTeacherCode] = useState('AI-BASIC-2026')
  const [session, setSession] = useState(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [settings, setSettings] = useState(defaultSettings)
  const [rounds, setRounds] = useState([])
  const [roundDetail, setRoundDetail] = useState(null)
  const [currentRoundId, setCurrentRoundId] = useState(null)
  const [currentResults, setCurrentResults] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [selectedTurn, setSelectedTurn] = useState(null)
  const [finalResults, setFinalResults] = useState(null)
  const [timerInfo, setTimerInfo] = useState(null)
  const [voteProgress, setVoteProgress] = useState({})
  const [aiStatus, setAiStatus] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedLiveTurns, setSelectedLiveTurns] = useState(null)
  const [selectedTeamName, setSelectedTeamName] = useState('')
  const socketRef = useRef(null)
  const currentRoundIdRef = useRef(null)

  useEffect(() => {
    currentRoundIdRef.current = currentRoundId
  }, [currentRoundId])

  const joinUrl = session
    ? `${window.location.origin}${withBase(`/?session=${session.id}`)}`
    : `${window.location.origin}${withBase('/')}`

  const teamMeta = useMemo(() => {
    const pairs = new Map()
    if (roundDetail?.pairings) {
      for (const pairing of roundDetail.pairings) {
        pairs.set(pairing.team_a_id, {
          partner: pairing.team_b_id,
          observer: pairing.observer_team_id,
        })
        pairs.set(pairing.team_b_id, {
          partner: pairing.team_a_id,
          observer: pairing.observer_team_id,
        })
        if (pairing.observer_team_id) {
          pairs.set(pairing.observer_team_id, {
            partner: null,
            observerTarget: pairing.team_a_id,
          })
        }
      }
    }
    return pairs
  }, [roundDetail])

  const teamNameById = useMemo(
    () => new Map((session?.teams || []).map((team) => [team.id, team.name])),
    [session?.teams]
  )

  useEffect(() => {
    if (!session?.id) return
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!authed || !session?.id) return

    const socket = createSocket()
    socketRef.current = socket
    socket.emit('teacher:join', { sessionId: session.id })

    socket.on('team:registered', () => {
      void refreshSession(session.id)
    })

    socket.on('round:started', (payload) => {
      setCurrentRoundId(payload.roundId)
      setCurrentResults(null)
      setFinalResults(null)
      setRoundDetail(null)
      setVoteProgress({})
      setSelectedTurn(null)
      setSelectedLiveTurns(null)
      setSelectedTeamName('')
      setNotice(`라운드 ${payload.roundNum} 시작`)
      setTimeout(() => setNotice(''), 3000)
      void refreshRoundData(session.id, payload.roundId)
      void refreshRounds(session.id)
    })

    socket.on('turn:completed', (payload) => {
      if (currentRoundIdRef.current) {
        void refreshRoundData(session.id, currentRoundIdRef.current)
      }
      // 라이브 대화 보기 중이면 자동 갱신
      if (payload?.teamId && currentRoundIdRef.current) {
        socket.emit('teacher:get-live-turns', { sessionId: session.id, teamId: payload.teamId, roundId: currentRoundIdRef.current })
      }
    })

    socket.on('teacher:live-turns', ({ teamId, turns }) => {
      setSelectedLiveTurns(turns)
    })

    socket.on('vote:progress', (payload) => {
      setVoteProgress((prev) => ({ ...prev, [payload.teamId]: payload }))
    })

    socket.on('timer:tick', (payload) => {
      setTimerInfo(payload)
    })

    socket.on('vote:phase-started', () => {
      if (currentRoundIdRef.current) {
        void refreshRoundData(session.id, currentRoundIdRef.current)
      }
    })

    socket.on('vote:closed', () => {
      if (currentRoundIdRef.current) {
        void refreshRoundData(session.id, currentRoundIdRef.current)
      }
    })

    socket.on('round:results', (payload) => {
      setCurrentResults(payload)
      setCurrentRoundId(payload.roundId)
      setSelectedTeamId(payload.teamResults[0]?.teamId ?? null)
      setSelectedTurn(null)
      setVoteProgress({})
      setSelectedLiveTurns(null)
      setSelectedTeamName('')
      void refreshSession(session.id)
      void refreshRounds(session.id)
    })

    socket.on('tournament:final', (payload) => {
      setFinalResults(payload)
      setCurrentResults(null)
      setRoundDetail(null)
      setCurrentRoundId(null)
      setTimerInfo(null)
      void refreshSession(session.id)
      void refreshRounds(session.id)
    })

    return () => socket.disconnect()
  }, [authed, session?.id])

  useEffect(() => {
    if (!session?.id) return
    void refreshSession(session.id)
    void refreshRounds(session.id)
    void refreshAiStatus()
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return
    const interval = setInterval(() => {
      void refreshSession(session.id)
      void refreshRounds(session.id)
      if (currentRoundId && !currentResults && !finalResults) {
        void refreshRoundData(session.id, currentRoundId)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [session?.id, currentRoundId, currentResults, finalResults])

  async function refreshSession(sessionId) {
    const data = await apiGet(`/session/${sessionId}`)
    setSession(data)
  }

  async function refreshRounds(sessionId) {
    const data = await apiGet(`/dashboard/${sessionId}/rounds`)
    setRounds(data)
    if (!currentRoundId && data.length) {
      const latest = data[data.length - 1]
      if (latest.status !== 'done') {
        setCurrentRoundId(latest.id)
        void refreshRoundData(sessionId, latest.id)
      }
    }
  }

  async function refreshRoundData(sessionId, roundId) {
    const data = await apiGet(`/dashboard/${sessionId}/round/${roundId}`)
    setRoundDetail(data)
  }

  async function refreshAiStatus() {
    const data = await apiGet('/system/ai-status')
    setAiStatus(data)
  }

  async function handleAuth() {
    try {
      await apiPost('/auth/teacher', { pin })
      sessionStorage.setItem(AUTH_KEY, Date.now().toString())
      setAuthed(true)
      setError('')
    } catch (authError) {
      setError(authError.message)
    }
  }

  async function handleCreateSession() {
    try {
      const data = await apiPost('/session', { teacherCode })
      setSession(data)
      setError('')
    } catch (sessionError) {
      setError(sessionError.message)
    }
  }

  function startRound() {
    if (!socketRef.current || !session?.id) return
    setCurrentResults(null)
    setFinalResults(null)
    socketRef.current.emit('round:start', {
      sessionId: session.id,
      ...settings,
    })
  }

  function forceEndChat() {
    socketRef.current?.emit('round:force-end-chat', { sessionId: session.id })
  }

  function forceEndVote() {
    socketRef.current?.emit('round:force-end-vote', { sessionId: session.id })
  }

  function revealResults() {
    socketRef.current?.emit('round:reveal', { sessionId: session.id })
  }

  function endTournament() {
    socketRef.current?.emit('tournament:end', { sessionId: session.id })
  }

  function selectTeam(teamId) {
    setSelectedTeamId(teamId)
    setSelectedTurn(null)
    if (session?.id && currentRoundId) {
      socketRef.current?.emit('round:show-conversation', {
        sessionId: session.id,
        teamId,
        roundId: currentRoundId,
      })
    }
  }

  function selectTeamForLive(teamId, teamName) {
    setSelectedTeamName(teamName)
    setSelectedLiveTurns(null)
    if (currentRoundId) {
      socketRef.current?.emit('teacher:get-live-turns', { sessionId: session.id, teamId, roundId: currentRoundId })
    }
  }

  if (!authed) {
    return (
      <div className="page-shell center-shell">
        <div className="panel auth-panel">
          <p className="eyebrow">🔐 AUTH</p>
          <h1>AI를 찾아라!</h1>
          <p className="muted">교사용 PIN을 입력해 게임을 시작하세요.</p>
          <input
            className="field"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAuth()}
            placeholder="PIN 입력"
          />
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" onClick={handleAuth}>인증</button>
        </div>
      </div>
    )
  }

  if (!session?.id) {
    return (
      <div className="page-shell center-shell">
        <div className="panel auth-panel">
          <p className="eyebrow">NEW SESSION</p>
          <h1>수업 세션 만들기</h1>
          <p className="muted">동일한 수업 코드로 다시 열면 기존 활성 세션을 이어서 사용합니다.</p>
          <input
            className="field"
            value={teacherCode}
            onChange={(event) => setTeacherCode(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleCreateSession()}
            placeholder="예: AI-BASIC-2026"
          />
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" onClick={handleCreateSession}>세션 열기</button>
        </div>
      </div>
    )
  }

  const latestRound = rounds[rounds.length - 1]
  const selectedTeamResult = currentResults?.teamResults.find((team) => team.teamId === selectedTeamId) || currentResults?.teamResults[0]
  const selectedTurnDetail = selectedTeamResult?.turns.find((turn) => turn.turnNum === selectedTurn)
  const activeTeamCount = session.teams.length
  const observerCount = roundDetail?.pairings?.filter((pairing) => pairing.observer_team_id).length || 0
  const liveCompletedTurns = roundDetail?.teamProgress?.reduce((sum, team) => sum + team.completedTurns, 0) || 0

  return (
    <div className="page-shell teacher-shell">
      <header className="topbar">
        <div className="headline-block">
          <p className="eyebrow">🎮 DASHBOARD</p>
          <h1>AI를 찾아라!</h1>
          <p className="muted hero-copy">질문 → 위장 → 판별, 매 턴이 심리전!</p>
        </div>
        <div className="topbar-actions">
          <span className="badge badge-blue">🎮 실시간 운영</span>
          <button className="ghost-button" onClick={() => navigator.clipboard?.writeText(joinUrl)}>참가 링크 복사</button>
          <button className="ghost-button" onClick={() => navigate('/')}>학생 화면 보기</button>
        </div>
      </header>

      <div className="teacher-layout">
        <aside className="sidebar">
          <section className="panel">
            <p className="eyebrow">SESSION</p>
            <h2>{session.teacher_code}</h2>
            <p className="muted">세션 ID: <strong>{session.id}</strong></p>
            <p className="join-url">{joinUrl}</p>
            <div className="mini-callout">
              <span>QR 대신 링크만 복사해도 바로 참여할 수 있습니다.</span>
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">STATUS</p>
            <div className="metric-grid">
              <div className="metric-card">
                <span className="metric-label">참가 팀</span>
                <strong>{activeTeamCount}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">현재 라운드</span>
                <strong>{latestRound ? `${latestRound.round_number}R` : '-'}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">완료 턴</span>
                <strong>{liveCompletedTurns}</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">관찰 심판</span>
                <strong>{observerCount}</strong>
              </div>
            </div>
            <p className="status-line">상태: <strong>{roundDetail?.round?.status || latestRound?.status || session.status}</strong></p>
            {timerInfo && <p className="status-line">타이머: <strong>{timerInfo.phase}</strong> / {formatDuration(timerInfo.remaining)}</p>}
            {notice && <p className="notice-text">{notice}</p>}
          </section>

          <section className="panel">
            <p className="eyebrow">ROUND SETUP</p>
            <label className="field-label">말투</label>
            <select className="field" value={settings.style} onChange={(event) => setSettings((prev) => ({ ...prev, style: event.target.value }))}>
              {styleOptions.map((option) => <option key={option}>{option}</option>)}
            </select>

            <label className="field-label">AI 모델</label>
            <select className="field" value={settings.aiModel} onChange={(event) => setSettings((prev) => ({ ...prev, aiModel: event.target.value }))}>
              {aiModelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <label className="field-label">턴 수</label>
            <select className="field" value={settings.turns} onChange={(event) => setSettings((prev) => ({ ...prev, turns: Number(event.target.value) }))}>
              {[6, 8, 10].map((value) => <option key={value} value={value}>{value}턴</option>)}
            </select>

            <label className="field-label">대화 시간</label>
            <select className="field" value={settings.chatTime} onChange={(event) => setSettings((prev) => ({ ...prev, chatTime: Number(event.target.value) }))}>
              {[180, 300, 420, 600].map((value) => <option key={value} value={value}>{Math.round(value / 60)}분</option>)}
            </select>

            <label className="field-label">응답 딜레이</label>
            <select className="field" value={settings.responseDelay} onChange={(event) => setSettings((prev) => ({ ...prev, responseDelay: Number(event.target.value) }))}>
              {[20, 30, 40].map((value) => <option key={value} value={value}>{value}초</option>)}
            </select>

            <label className="field-label">투표 시간</label>
            <select className="field" value={settings.voteTime} onChange={(event) => setSettings((prev) => ({ ...prev, voteTime: Number(event.target.value) }))}>
              {[60, 120, 180].map((value) => <option key={value} value={value}>{Math.round(value / 60)}분</option>)}
            </select>

            <label className="field-label">정답 점수</label>
            <input
              className="field"
              type="number"
              min="1"
              value={settings.pointValue}
              onChange={(event) => setSettings((prev) => ({ ...prev, pointValue: Number(event.target.value) || 1 }))}
            />

            <button className="primary-button" onClick={startRound}>라운드 시작</button>
            <div className="stack-buttons">
              <button className="ghost-button" onClick={forceEndChat}>대화 강제 종료</button>
              <button className="ghost-button" onClick={forceEndVote}>투표 강제 마감</button>
              <button className="ghost-button" onClick={revealResults}>결과 공개</button>
              <button className="ghost-button danger" onClick={endTournament}>토너먼트 종료</button>
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">AI STATUS</p>
            <div className="status-pill-row">
              <span className={`status-pill ${aiStatus?.anthropic ? 'ok' : 'missing'}`}>Claude {aiStatus?.anthropic ? '준비' : '없음'}</span>
              <span className={`status-pill ${aiStatus?.openai ? 'ok' : 'missing'}`}>GPT {aiStatus?.openai ? '준비' : '없음'}</span>
              <span className={`status-pill ${aiStatus?.google ? 'ok' : 'missing'}`}>Gemini {aiStatus?.google ? '준비' : '없음'}</span>
              <span className={`status-pill ${aiStatus?.upstage ? 'ok' : 'missing'}`}>Solar {aiStatus?.upstage ? '준비' : '없음'}</span>
            </div>
            <p className="muted">준비 표시는 키 존재 여부 기준입니다.</p>
          </section>

          <section className="panel">
            <p className="eyebrow">HISTORY</p>
            <div className="history-list">
              {rounds.length ? rounds.map((round) => (
                <div key={round.id} className={`history-row ${currentRoundId === round.id ? 'selected' : ''}`}>
                  <div>
                    <strong>R{round.round_number}</strong>
                    <p className="muted">{round.style_name} · {displayModel(round.ai_model)}</p>
                  </div>
                  <span className="muted">{round.status}</span>
                </div>
              )) : <p className="muted">아직 시작한 라운드가 없습니다.</p>}
            </div>
          </section>
        </aside>

        <main className="content-grid">
          <section className="panel">
            <div className="section-header">
              <div>
                <p className="eyebrow">TEAMS</p>
                <h2>{session.teams.length}팀 참여 중</h2>
              </div>
              <span className="muted">홀수 팀이면 1팀은 관찰 전용 심판으로 배정됩니다.</span>
            </div>
            <div className="team-grid">
              {session.teams.map((team) => {
                const progress = roundDetail?.teamProgress?.find((item) => item.id === team.id)
                const relation = teamMeta.get(team.id)
                const voteInfo = voteProgress[team.id]
                const isLiveRound = roundDetail && !currentResults && !finalResults
                const totalTurns = roundDetail?.round?.total_turns ?? settings.turns
                const completedTurns = progress?.completedTurns ?? 0

                const handleCardClick = () => {
                  if (isLiveRound) {
                    selectTeamForLive(team.id, team.name)
                  } else {
                    selectTeam(team.id)
                  }
                }

                return (
                  <button key={team.id} className={`team-card ${selectedTeamId === team.id ? 'selected' : ''}`} onClick={handleCardClick}>
                    <div className="team-card-top" style={{ borderTop: `3px solid ${team.color}` }}>
                      <span className="team-dot" style={{ background: team.color }} />
                      <div>
                        <strong>{team.name}</strong>
                        <p className="muted">{team.members.join(' · ')}</p>
                      </div>
                    </div>
                    <p className="team-relation">
                      {relation?.observerTarget
                        ? `관찰 심판 → ${teamNameById.get(relation.observerTarget) || relation.observerTarget}`
                        : relation?.partner
                          ? `↔ ${teamNameById.get(relation.partner) || relation.partner}`
                          : '대기 중'}
                    </p>
                    {isLiveRound && roundDetail?.round?.status === 'chatting' && (
                      <p className="team-progress" style={{ letterSpacing: 2, fontSize: '0.85rem' }}>
                        {Array.from({ length: totalTurns }, (_, i) => i < completedTurns ? '●' : '○').join('')}
                      </p>
                    )}
                    {isLiveRound && roundDetail?.round?.status === 'voting' && (
                      <p className="team-progress">
                        {voteInfo ? `투표 완료 ${voteInfo.votedCount}/${voteInfo.totalTurns}` : '투표 대기'}
                      </p>
                    )}
                    {!isLiveRound && (
                      <p className="team-progress">
                        진행 턴 {completedTurns}/{totalTurns}
                      </p>
                    )}
                    {!isLiveRound && voteInfo && <p className="team-progress">투표 {voteInfo.votedCount}/{voteInfo.totalTurns}</p>}
                    <p className="team-progress score-line">누적 {team.total_score}점</p>
                  </button>
                )
              })}
            </div>
          </section>

          {roundDetail && !currentResults && !finalResults && (
            <section className="panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">🔴 LIVE</p>
                  <h2>R{roundDetail.round.round_number} · {roundDetail.round.style_name} · {displayModel(roundDetail.round.ai_model)}</h2>
                </div>
                <span className="muted">{formatDuration(roundDetail.round.chat_time)} / 응답 {roundDetail.round.response_delay}초</span>
              </div>
              <div className="conversation-list">
                {(roundDetail.teamProgress || []).map((team) => (
                  <div key={team.id} className="conversation-item">
                    <strong>{team.name}</strong>
                    <span className="muted">{team.completedTurns}/{roundDetail.round.total_turns}턴 완료</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {selectedLiveTurns && !currentResults && !finalResults && (
            <section className="panel">
              <p className="eyebrow">🔴 LIVE CHAT</p>
              <h2>{selectedTeamName}</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {selectedLiveTurns.length === 0 && (
                  <p className="muted">아직 대화가 시작되지 않았습니다.</p>
                )}
                {selectedLiveTurns.map((turn) => (
                  <div key={turn.turn_number} style={{
                    padding: '8px 12px', background: 'var(--surface2)',
                    borderRadius: 8, border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>턴 {turn.turn_number}</div>
                    <div><strong>Q:</strong> {turn.question_text || '—'}</div>
                    <div style={{ color: 'var(--muted)' }}><strong>A:</strong> {turn.styled_answer || '⏳ 대기 중'}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {currentResults && (
            <>
              <section className="panel">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">🎯 RESULTS</p>
                    <h2>R{currentResults.roundNum} · {currentResults.style} · {displayModel(currentResults.aiModel)}</h2>
                  </div>
                  <span className="muted">정답 1개당 {currentResults.pointValue}점</span>
                </div>
                <div className="result-table">
                  {currentResults.standings.map((team) => (
                    <button key={team.teamId} className={`result-row ${selectedTeamId === team.teamId ? 'selected' : ''}`} onClick={() => selectTeam(team.teamId)}>
                      <span>{team.rank}위</span>
                      <strong>{team.teamName}</strong>
                      <span className="score-pill">{team.totalScore}점</span>
                    </button>
                  ))}
                </div>
              </section>

              {selectedTeamResult && (
                <section className="panel">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">REVIEW</p>
                      <h2>{selectedTeamResult.teamName} 상세</h2>
                    </div>
                    <span className="muted">{selectedTeamResult.correct}/{selectedTeamResult.total} 정답</span>
                  </div>
                  <div className="turn-chip-row">
                    {selectedTeamResult.turns.map((turn) => (
                      <button
                        key={turn.turnNum}
                        className={`turn-chip ${selectedTurn === turn.turnNum ? 'selected' : ''} ${turn.isCorrect ? 'correct' : 'wrong'}`}
                        onClick={() => setSelectedTurn(turn.turnNum)}
                      >
                        턴 {turn.turnNum}
                      </button>
                    ))}
                  </div>
                  <div className="detail-box">
                    {selectedTurnDetail ? (
                      <>
                        <p><strong>질문</strong> {selectedTurnDetail.question}</p>
                        <p><strong>답변</strong> {selectedTurnDetail.styledAnswer}</p>
                        <p><strong>실제</strong> {selectedTurnDetail.respondentType === 'human' ? '사람' : 'AI'}</p>
                        <p><strong>투표</strong> {selectedTurnDetail.verdict === 'human' ? '사람' : selectedTurnDetail.verdict === 'ai' ? 'AI' : '미투표'}</p>
                      </>
                    ) : (
                      <p className="muted">토론할 턴을 선택하세요.</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {finalResults && (
            <section className="panel">
              <div className="section-header">
                <div>
                  <p className="eyebrow">🏆 FINAL</p>
                  <h2>공동 순위 적용</h2>
                </div>
              </div>
              <div className="result-table">
                {finalResults.finalStandings.map((team) => (
                  <div key={team.teamId} className="result-row static">
                    <span>{team.rank}위</span>
                    <strong>{team.teamName}</strong>
                    <span className="score-pill">{team.totalScore}점</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function formatDuration(totalSeconds = 0) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function displayModel(model) {
  const match = aiModelOptions.find((option) => option.value === model)
  return match?.label || model
}
