import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost, apiDownload, getTeacherToken, setTeacherToken, clearTeacherToken, getTeacherId } from '../../utils/api.js'
import { createSocket } from '../../utils/socket.js'
import { withBase } from '../../config.js'
import TuringCriterion from '../TuringCriterion.jsx'

const SESSION_KEY = 'turing_test_teacher_session'
const API_KEYS_KEY = 'turing_test_api_keys'

const styleOptions = ['자연스러운대화', '임함체', '사극체', 'AI체']
const aiModelOptions = [
  { value: 'claude', label: 'Claude' },
  { value: 'gpt', label: 'GPT' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'solar', label: 'Solar Pro 4' },
]

/**
 * 교사마다 다른 기본 수업 코드 — 부르기 쉬운 영어 한 단어 (예: ai-leader). 칸에서 직접 고쳐도 된다.
 * 같은 코드를 다른 교사가 이미 쓰고 있으면 서버가 거부하므로 겹쳐도 한 세션에 합쳐지지 않는다.
 */
const CODE_WORDS = [
  'leader', 'apple', 'tiger', 'ocean', 'river', 'cloud', 'star', 'moon', 'sun', 'tree',
  'rabbit', 'whale', 'fox', 'eagle', 'panda', 'koala', 'lion', 'bear', 'wolf', 'deer',
  'piano', 'guitar', 'drum', 'violin', 'flute', 'rocket', 'planet', 'comet', 'galaxy', 'orbit',
  'mango', 'lemon', 'melon', 'grape', 'peach', 'berry', 'cherry', 'olive', 'honey', 'cocoa',
  'pixel', 'robot', 'logic', 'cipher', 'enigma', 'signal', 'radio', 'vector', 'matrix', 'turing',
  'river', 'forest', 'island', 'desert', 'canyon', 'valley', 'summit', 'harbor', 'bridge', 'tower',
]
function randomClassCode() {
  return `ai-${CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)]}`
}

const defaultSettings = {
  style: '자연스러운대화',
  aiModel: 'claude',
  turns: 8,
  chatTime: 300,
  responseDelay: 20, // 선택지(20·30·40초)에 있는 값이어야 화면과 실제 값이 같다
  voteTime: 120,
  pointValue: 1,
  briefingTime: 20, // 안내문 읽기 시간 (대화 시간과 별도)
}

export default function TeacherApp({ navigate }) {
  const [authed, setAuthed] = useState(() => Boolean(getTeacherToken()))
  const [pin, setPin] = useState('')
  const [entryMode, setEntryMode] = useState('pin') // 'pin' 입장 코드 | 'keys' 본인 API 키
  const [aiError, setAiError] = useState(null)
  const [anthropicKey, setAnthropicKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}').anthropic || '' } catch { return '' }
  })
  const [openaiKey, setOpenaiKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}').openai || '' } catch { return '' }
  })
  const [googleKey, setGoogleKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}').google || '' } catch { return '' }
  })
  const [upstageKey, setUpstageKey] = useState(() => {
    try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}').upstage || '' } catch { return '' }
  })
  const [showOptionalKeys, setShowOptionalKeys] = useState(false)
  const [savedApiKeys, setSavedApiKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem(API_KEYS_KEY) || '{}') } catch { return {} }
  })
  const [teacherCode, setTeacherCode] = useState(() => randomClassCode())
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
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [sessionClosed, setSessionClosed] = useState(false)
  const [closedSummary, setClosedSummary] = useState(null) // 수업 완전 종료 뒤 분석 결과
  const socketRef = useRef(null)
  const currentRoundIdRef = useRef(null)
  const aiErrorRef = useRef(null)
  const liveTeamIdRef = useRef(null) // 라이브 채팅으로 보고 있는 팀

  useEffect(() => {
    currentRoundIdRef.current = currentRoundId
  }, [currentRoundId])

  useEffect(() => {
    aiErrorRef.current = aiError
  }, [aiError])

  // 참가 링크는 세션 ID가 아니라 수업 코드로 만든다 — 같은 코드로 세션을 새로 열어도 링크가 유지된다
  const joinUrl = session
    ? `${window.location.origin}${withBase(`/?code=${encodeURIComponent(session.teacher_code)}`)}`
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

  // 아레나 매치 계산 (페어링 기반)
  const arenaMatches = useMemo(() => {
    if (!session?.teams?.length || !roundDetail?.pairings?.length) return { pairs: [], observers: [] }

    const pairs = []
    const observers = []
    const usedIds = new Set()

    for (const team of session.teams) {
      if (usedIds.has(team.id)) continue
      if (team.role === 'observer') {
        observers.push(team)
        usedIds.add(team.id)
        continue
      }
      const meta = teamMeta.get(team.id)
      if (meta?.partner) {
        const partner = session.teams.find((t) => t.id === meta.partner)
        if (partner && !usedIds.has(partner.id)) {
          const judge = team.role === 'judge' ? team : partner
          const respondent = team.role === 'judge' ? partner : team
          pairs.push({ judge, respondent })
          usedIds.add(team.id)
          usedIds.add(partner.id)
        }
      }
    }

    return { pairs, observers }
  }, [session?.teams, teamMeta, roundDetail?.pairings])

  // 새로고침 뒤에도 서버 공용 키 상태를 다시 읽는다 (입장 코드 모드의 AI 모델 목록이 비지 않게)
  useEffect(() => {
    if (!authed) return
    void refreshAiStatus().catch(() => {})
  }, [authed])

  // REST가 401을 돌려주면(토큰 만료·서버 재시작) 로그인 화면으로 돌아간다. 세션 정보는 남겨 두어 다시 들어오면 이어진다
  useEffect(() => {
    const onExpired = () => { setAuthed(false); setError('로그인이 풀렸습니다. 입장 코드를 다시 넣으면 수업이 이어집니다.') }
    window.addEventListener('teacher:auth-expired', onExpired)
    return () => window.removeEventListener('teacher:auth-expired', onExpired)
  }, [])

  useEffect(() => {
    if (!session?.id) return
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!authed || !session?.id) return

    const socket = createSocket()
    socketRef.current = socket
    const token = getTeacherToken()
    socket.emit('teacher:join', { sessionId: session.id, token })

    // 네트워크가 끊겼다 붙으면 교사 room에 다시 들어간다 (안 그러면 실시간 이벤트가 끊긴다)
    socket.on('connect', () => {
      socket.emit('teacher:join', { sessionId: session.id, token })
      void refreshSession(session.id)
    })

    // 서버가 거부한 요청(팀 부족, 중복 시작, 인증 만료 등)을 화면에 보여 준다
    socket.on('error', (payload) => {
      const message = payload?.message || '요청이 거부되었습니다.'
      setError(message)
      setTimeout(() => setError((prev) => (prev === message ? '' : prev)), 6000)
      if (message.includes('인증')) {
        clearTeacherToken()
        setAuthed(false)
      }
    })

    // AI 호출 실패 알림 (키 오류·한도 초과·타임아웃). 학생에게는 회피 문구가 나가므로 교사만 안다
    socket.on('ai:error', (payload) => {
      setAiError({ ...payload, count: (aiErrorRef.current?.count || 0) + 1 })
    })

    socket.on('team:registered', () => {
      void refreshSession(session.id)
    })

    socket.on('round:started', (payload) => {
      setCurrentRoundId(payload.roundId)
      setCurrentResults(null)
      setFinalResults(null)
      setRoundDetail(null)
      setAiError(null)
      liveTeamIdRef.current = null
      setVoteProgress({})
      setSelectedTurn(null)
      setSelectedLiveTurns(null)
      setSelectedTeamName('')
      setNotice(`라운드 ${payload.roundNum} 시작`)
      setTimeout(() => setNotice(''), 3000)
      // 팀 역할 정보 병합
      if (payload.teams) {
        setSession((prev) => prev ? {
          ...prev,
          teams: prev.teams.map((t) => {
            const roundTeam = payload.teams.find((rt) => rt.id === t.id)
            return roundTeam ? { ...t, role: roundTeam.role } : t
          })
        } : prev)
      }
      void refreshRoundData(session.id, payload.roundId)
      void refreshRounds(session.id)
    })

    socket.on('turn:completed', (payload) => {
      if (currentRoundIdRef.current) {
        void refreshRoundData(session.id, currentRoundIdRef.current)
      }
      // 라이브 대화 보기 중인 팀의 턴이면 자동 갱신 (다른 팀 턴에 화면이 바뀌거나 저절로 열리지 않게)
      if (payload?.teamId && currentRoundIdRef.current && liveTeamIdRef.current === payload.teamId) {
        socket.emit('teacher:get-live-turns', { sessionId: session.id, teamId: payload.teamId, roundId: currentRoundIdRef.current, token })
      }
    })

    socket.on('teacher:live-turns', ({ teamId, turns }) => {
      if (liveTeamIdRef.current !== teamId) return // 닫은 뒤 늦게 온 응답이나 다른 팀 응답은 무시
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

    socket.on('session:closed', () => {
      setSessionClosed(true)
      setCurrentRoundId(null)
      setRoundDetail(null)
      setTimerInfo(null)
      setNotice('')
      void refreshSession(session.id)
    })

    return () => socket.disconnect()
  }, [authed, session?.id])

  // 세션 상태가 'closed'면 sessionClosed 동기화 (새로고침 복구 시)
  // 'ended'는 토너먼트 정상 종료이므로 점수가 보여야 함 — sessionClosed 트리거하지 않음
  useEffect(() => {
    if (session?.status === 'closed') {
      setSessionClosed(true)
    }
  }, [session?.status])

  // 수업 완전 종료 뒤: 진행한 라운드의 분석 결과를 불러온다
  useEffect(() => {
    if (!sessionClosed || !session?.id) return
    let cancelled = false
    apiGet(`/dashboard/${session.id}/summary`)
      .then((data) => { if (!cancelled) setClosedSummary(data) })
      .catch(() => { if (!cancelled) setClosedSummary({ error: true }) })
    return () => { cancelled = true }
  }, [sessionClosed, session?.id])

  useEffect(() => {
    if (!session?.id) return
    void refreshSession(session.id)
    void refreshRounds(session.id)
    // 기존 세션 복원 시에도 API 키 연결
    if (savedApiKeys.anthropic) {
      apiPost(`/session/${session.id}/api-keys`, { apiKeys: savedApiKeys }).catch(() => {})
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return
    // 종료/중단된 세션은 주기 갱신 중단 (무한 polling 방지)
    if (sessionClosed || session?.status === 'ended' || session?.status === 'closed') return
    const interval = setInterval(() => {
      void refreshSession(session.id)
      void refreshRounds(session.id)
      if (currentRoundId && !currentResults && !finalResults) {
        void refreshRoundData(session.id, currentRoundId)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [session?.id, currentRoundId, currentResults, finalResults, sessionClosed, session?.status])

  async function refreshSession(sessionId) {
    const data = await apiGet(`/session/${sessionId}`)
    // 서버 세션 조회에는 라운드 역할(질문자/응답/관찰)이 없으므로, round:started로 받은 역할을 유지한다
    setSession((prev) => {
      if (!prev?.teams?.length) return data
      const roleById = new Map(prev.teams.map((team) => [team.id, team.role]))
      return { ...data, teams: (data.teams || []).map((team) => (roleById.has(team.id) ? { ...team, role: roleById.get(team.id) } : team)) }
    })
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
      if (entryMode === 'pin') {
        // 입장 코드 — 연수·공용 키 운영. AI 호출은 서버 공용 키를 쓴다
        if (!pin.trim()) {
          setError('입장 코드를 입력하세요')
          return
        }
        const data = await apiPost('/auth/teacher', { pin: pin.trim(), teacherId: getTeacherId() })
        setTeacherToken(data.token)
        if (data.aiStatus) setAiStatus((prev) => ({ ...(prev || {}), ...data.aiStatus }))
        // 이전에 저장해 둔 본인 키는 쓰지 않는다 (공용 키로 통일)
        localStorage.removeItem(API_KEYS_KEY)
        setSavedApiKeys({})
      } else {
        if (!anthropicKey.trim()) {
          setError('Anthropic API 키는 필수입니다')
          return
        }
        const apiKeys = {
          anthropic: anthropicKey.trim(),
          ...(openaiKey.trim() && { openai: openaiKey.trim() }),
          ...(googleKey.trim() && { google: googleKey.trim() }),
          ...(upstageKey.trim() && { upstage: upstageKey.trim() }),
        }
        const data = await apiPost('/auth/teacher', { apiKeys, teacherId: getTeacherId() })
        setTeacherToken(data.token)
        localStorage.setItem(API_KEYS_KEY, JSON.stringify(apiKeys))
        setSavedApiKeys(apiKeys)
      }
      setAuthed(true)
      setError('')
    } catch (authError) {
      setError(authError.message)
    }
  }

  async function downloadCsv() {
    if (!session?.id) return
    try {
      await apiDownload(`/dashboard/${session.id}/export`, `turing-test-${session.teacher_code}.csv`)
    } catch (downloadError) {
      setError(downloadError.message)
    }
  }

  async function handleCreateSession() {
    try {
      const data = await apiPost('/session', { teacherCode })
      setSession(data)
      setError('')
      // 세션에 API 키 연결
      if (savedApiKeys.anthropic) {
        try {
          await apiPost(`/session/${data.id}/api-keys`, { apiKeys: savedApiKeys })
        } catch (err) {
          console.error('API 키 등록 실패:', err)
        }
      }
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
      token: getTeacherToken(),
    })
  }

  function forceEndChat() {
    socketRef.current?.emit('round:force-end-chat', { sessionId: session.id, token: getTeacherToken() })
  }

  function forceEndVote() {
    socketRef.current?.emit('round:force-end-vote', { sessionId: session.id, token: getTeacherToken() })
  }

  function revealResults() {
    socketRef.current?.emit('round:reveal', { sessionId: session.id, token: getTeacherToken() })
  }

  function endTournament() {
    if (!window.confirm('모든 라운드를 마치고 최종 순위를 발표할까요?\n종료 뒤에는 이 세션에서 새 라운드를 시작할 수 없습니다.')) return
    socketRef.current?.emit('tournament:end', { sessionId: session.id, token: getTeacherToken() })
  }

  function closeSession() {
    if (!session?.id) return
    socketRef.current?.emit('session:close', { sessionId: session.id, token: getTeacherToken() })
    setShowCloseConfirm(false)
  }

  function startNewSession() {
    // 현재 종료된 세션 정리 후 새 세션 생성 화면으로
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setSessionClosed(false)
    setClosedSummary(null)
    setCurrentResults(null)
    setFinalResults(null)
    setRounds([])
    setRoundDetail(null)
    setCurrentRoundId(null)
  }

  function selectTeam(teamId) {
    setSelectedTeamId(teamId)
    setSelectedTurn(null)
    if (session?.id && currentRoundId) {
      socketRef.current?.emit('round:show-conversation', {
        sessionId: session.id,
        teamId,
        roundId: currentRoundId,
        token: getTeacherToken(),
      })
    }
  }

  function selectTeamForLive(teamId, teamName) {
    liveTeamIdRef.current = teamId
    setSelectedTeamName(teamName)
    setSelectedLiveTurns(null)
    if (currentRoundId) {
      socketRef.current?.emit('teacher:get-live-turns', { sessionId: session.id, teamId, roundId: currentRoundId, token: getTeacherToken() })
    }
  }

  if (!authed) {
    return (
      <div className="page-shell center-shell">
        <div className="panel auth-panel" style={{ maxWidth: 440 }}>
          <p className="eyebrow">🔐 AUTH</p>
          <h1>이미테이션 게임</h1>

          {entryMode === 'pin' ? (
            <>
              <p className="muted">입장 코드를 입력하면 바로 수업을 시작할 수 있습니다.</p>
              <label className="field-label">🔑 입장 코드</label>
              <input
                className="field"
                type="password"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleAuth()}
                placeholder="연수에서 안내받은 입장 코드"
                autoFocus
                autoComplete="off"
                style={{ fontFamily: "'Courier New', monospace", fontSize: '1rem', letterSpacing: '0.15em' }}
              />
              <p className="muted" style={{ fontSize: '0.72rem', marginTop: 2, marginBottom: 8 }}>AI 호출은 서버에 등록된 공용 키를 사용합니다. 따로 준비할 것이 없습니다.</p>
              {error && <p className="error-text">{error}</p>}
              <button className="primary-button" onClick={handleAuth} disabled={!pin.trim()}>입장</button>
              <button
                type="button"
                onClick={() => { setEntryMode('keys'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#d4a574', cursor: 'pointer', fontSize: '0.78rem', padding: '10px 0 0', width: '100%' }}
              >
                ▶ 내 API 키로 입장하기 (실제 수업용)
              </button>
            </>
          ) : (
            <>
          <p className="muted">본인의 AI API 키로 입장합니다.</p>

          <label className="field-label">🔑 Anthropic API 키 <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            className="field"
            type="password"
            value={anthropicKey}
            onChange={(event) => setAnthropicKey(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAuth()}
            placeholder="sk-ant-..."
            autoFocus
            style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem' }}
          />
          <p className="muted" style={{ fontSize: '0.72rem', marginTop: 2, marginBottom: 8 }}>말투 변환 + Claude 모델 (필수)</p>

          <button
            type="button"
            onClick={() => setShowOptionalKeys(!showOptionalKeys)}
            style={{
              background: 'none', border: 'none', color: '#d4a574', cursor: 'pointer',
              fontSize: '0.8rem', padding: '6px 0', textAlign: 'left', width: '100%',
            }}
          >
            {showOptionalKeys ? '▼' : '▶'} 다른 AI 모델 키 (선택사항)
          </button>

          {showOptionalKeys && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', background: 'rgba(212,165,116,0.04)', borderRadius: 8, border: '1px solid rgba(212,165,116,0.12)', marginBottom: 8 }}>
              <div>
                <label className="field-label" style={{ fontSize: '0.75rem' }}>OpenAI API 키 (GPT)</label>
                <input className="field" type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-..." style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem' }} />
              </div>
              <div>
                <label className="field-label" style={{ fontSize: '0.75rem' }}>Google API 키 (Gemini)</label>
                <input className="field" type="password" value={googleKey} onChange={(e) => setGoogleKey(e.target.value)} placeholder="AIza..." style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem' }} />
              </div>
              <div>
                <label className="field-label" style={{ fontSize: '0.75rem' }}>Upstage API 키 (Solar)</label>
                <input className="field" type="password" value={upstageKey} onChange={(e) => setUpstageKey(e.target.value)} placeholder="up-..." style={{ fontFamily: "'Courier New', monospace", fontSize: '0.85rem' }} />
              </div>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" onClick={handleAuth} disabled={!anthropicKey.trim()}>입장</button>
          <p className="muted" style={{ fontSize: '0.7rem', marginTop: 8, lineHeight: 1.4 }}>
            API 키는 브라우저에 저장되며, 서버 메모리에서만 사용됩니다. 서버에 영구 저장되지 않습니다.
          </p>
          <button
            type="button"
            onClick={() => { setEntryMode('pin'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#d4a574', cursor: 'pointer', fontSize: '0.78rem', padding: '10px 0 0', width: '100%' }}
          >
            ◀ 입장 코드로 돌아가기
          </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── 세션 종료 화면 (진행한 라운드의 분석 결과 포함) ──
  if (sessionClosed && session?.id) {
    const summary = closedSummary && !closedSummary.error ? closedSummary : null
    const playedRounds = summary?.roundStats?.filter((r) => r.totalTurns > 0) || []
    const medals = ['🥇', '🥈', '🥉']
    return (
      <div className="page-shell center-shell">
        <div className="panel auth-panel" style={{ maxWidth: 760, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🔒</div>
          <p className="eyebrow" style={{ color: '#f59e0b' }}>SESSION CLOSED</p>
          <h1 style={{ marginBottom: 6 }}>수업이 종료되었습니다</h1>
          <p className="muted" style={{ marginBottom: 16 }}>
            세션 <strong style={{ textTransform: 'lowercase' }}>{session.teacher_code}</strong>가 종료되었습니다. 학생들의 화면도 함께 종료 처리됩니다.
          </p>

          {closedSummary === null && <p className="muted">분석 결과를 불러오는 중...</p>}
          {closedSummary?.error && <p className="muted">분석 결과를 불러오지 못했습니다. 입장 코드로 다시 들어오면 볼 수 있습니다.</p>}

          {summary && playedRounds.length === 0 && (
            <p className="muted" style={{ marginBottom: 16 }}>진행한 라운드가 없어 분석할 결과가 없습니다.</p>
          )}

          {summary && playedRounds.length > 0 && (
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: '참가 팀', value: summary.teamCount },
                  { label: '진행 라운드', value: playedRounds.length },
                  { label: '전체 정답률', value: `${summary.overallStats.accuracy}%` },
                  { label: 'AI가 사람으로 판정된 비율', value: summary.overallStats.aiFooledRate === null ? '-' : `${summary.overallStats.aiFooledRate}%` },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: 'var(--surface2, #1e293b)', border: '1px solid var(--border, rgba(255,255,255,0.06))' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d4a574' }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <TuringCriterion stats={summary.overallStats} className="panel" title="전체 라운드" />

              <div className="panel" style={{ padding: '14px 16px' }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>라운드별 결과</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
                      <th style={{ padding: '4px 6px' }}>R</th><th style={{ padding: '4px 6px' }}>말투</th><th style={{ padding: '4px 6px' }}>AI</th>
                      <th style={{ padding: '4px 6px' }}>정답률</th><th style={{ padding: '4px 6px' }}>AI 식별</th><th style={{ padding: '4px 6px' }}>사람 식별</th><th style={{ padding: '4px 6px' }}>AI→사람 판정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playedRounds.map((r) => (
                      <tr key={r.roundNum} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '6px' }}><strong>{r.roundNum}</strong></td>
                        <td style={{ padding: '6px' }}>{r.style}</td>
                        <td style={{ padding: '6px' }}>{displayModel(r.aiModel)}</td>
                        <td style={{ padding: '6px' }}>{r.accuracy}% <span className="muted">({r.totalCorrect}/{r.totalTurns})</span></td>
                        <td style={{ padding: '6px' }}>{r.aiAiRate}%</td>
                        <td style={{ padding: '6px' }}>{r.humanHumanRate}%</td>
                        <td style={{ padding: '6px', color: r.turingPassed ? '#4ade80' : '#d4a574' }}>{r.aiFooledRate === null ? '-' : `${r.aiFooledRate}%`}{r.turingPassed ? ' 통과' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel" style={{ padding: '14px 16px' }}>
                <p className="eyebrow" style={{ marginBottom: 8 }}>팀 순위</p>
                {summary.finalStandings.map((team, i) => (
                  <div key={team.teamId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <span style={{ minWidth: 34, fontWeight: 800, color: team.rank <= 3 ? '#eab308' : '#64748b' }}>{team.rank <= 3 ? medals[team.rank - 1] : `${team.rank}위`}</span>
                    <span className="team-dot" style={{ background: team.teamColor }} />
                    <strong style={{ flex: 1 }}>{team.teamName}</strong>
                    {summary.mvpTeamId === team.teamId && <span style={{ fontSize: '0.7rem', color: '#eab308', fontWeight: 700 }}>⭐ MVP</span>}
                    <span className="muted" style={{ fontSize: '0.78rem' }}>{team.totalCorrect}/{team.totalTurns} 정답 · {team.accuracy}%</span>
                    <span className="score-pill">{team.totalScore}점</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            marginBottom: 16, fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.5, textAlign: 'left',
          }}>
            💡 같은 수업 코드로 새 세션을 만들면 새로운 참가 링크가 발급됩니다. 학생들은 다시 팀 등록을 해야 합니다.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {summary && playedRounds.length > 0 && <button className="ghost-button" onClick={downloadCsv}>📄 CSV 다운로드</button>}
            <button className="primary-button" style={{ width: 'auto' }} onClick={startNewSession}>새 수업 시작</button>
            <button className="ghost-button" onClick={() => navigate('/')}>메인으로</button>
          </div>
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
          <p className="muted">학생이 입력할 수업 코드입니다. 부르기 쉬운 말로 바꿔도 됩니다. 같은 코드로 다시 열면 기존 활성 세션을 이어서 사용합니다.</p>
          <input
            className="field"
            value={teacherCode}
            onChange={(event) => setTeacherCode(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleCreateSession()}
            placeholder="예: ai-leader"
            style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.05em' }}
          />
          <button className="ghost-button" type="button" onClick={() => setTeacherCode(randomClassCode())} style={{ marginBottom: 6 }}>다른 코드 뽑기</button>
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
  // 사용 가능한 AI: 교사가 넣은 키 또는 서버 공용 키 (입장 코드 모드)
  const keyAvailable = {
    anthropic: Boolean(savedApiKeys.anthropic || aiStatus?.anthropic),
    openai: Boolean(savedApiKeys.openai || aiStatus?.openai),
    google: Boolean(savedApiKeys.google || aiStatus?.google),
    upstage: Boolean(savedApiKeys.upstage || aiStatus?.upstage),
  }
  const liveStatus = roundDetail && !currentResults && !finalResults ? roundDetail.round?.status : null
  const roundInProgress = ['chatting', 'voting', 'revealed'].includes(liveStatus)
  const observerCount = roundDetail?.pairings?.filter((pairing) => pairing.observer_team_id).length || 0
  const liveCompletedTurns = roundDetail?.teamProgress?.reduce((sum, team) => sum + team.completedTurns, 0) || 0

  return (
    <div className="page-shell teacher-shell">
      <header className="topbar">
        <div className="headline-block">
          <p className="eyebrow" style={{ fontFamily: "'Courier New', monospace", letterSpacing: '0.12em' }}>🔐 COMMAND CENTER</p>
          <h1>이미테이션 게임</h1>
          <p className="muted hero-copy">기계인가, 인간인가? — The Imitation Game</p>
        </div>
        <div className="topbar-actions">
          <span className="badge badge-blue" style={{ fontFamily: "'Courier New', monospace" }}>🔐 LIVE OPS</span>
          <button className="ghost-button" onClick={() => navigator.clipboard?.writeText(joinUrl)}>참가 링크 복사</button>
          <button className="ghost-button" onClick={() => navigate('/guide')}>사용 안내</button>
          <a className="ghost-button" href={withBase('/tutorial/')} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>튜토리얼</a>
          <button className="ghost-button" onClick={() => navigate('/')}>학생 화면</button>
        </div>
      </header>

      <div className="teacher-layout">
        <aside className="sidebar">
          <section className="panel">
            <p className="eyebrow">SESSION</p>
            <h2 style={{ textTransform: 'lowercase' }}>{session.teacher_code}</h2>
            <p className="muted" style={{ fontSize: '0.72rem' }}>대소문자 구분 없이 입력해도 됩니다.</p>
            <p className="muted">세션 ID: <strong>{session.id}</strong></p>
            <p className="join-url">{joinUrl}</p>
            <div className="mini-callout">
              <span>위 링크를 학생에게 공유하세요.</span>
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
                <span className="metric-label">관찰자</span>
                <strong>{observerCount}</strong>
              </div>
            </div>
            <p className="status-line">상태: <strong>{roundDetail?.round?.status || latestRound?.status || session.status}</strong></p>
            {timerInfo && <p className="status-line">타이머: <strong>{timerInfo.phase}</strong> / {formatDuration(timerInfo.remaining)}</p>}
            {notice && <p className="notice-text">{notice}</p>}
            {error && <p className="error-text">{error}</p>}
            {aiError && (
              <div style={{
                marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: '0.75rem', lineHeight: 1.45,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5',
              }}>
                ⚠️ AI 호출 실패 {aiError.count}회 ({displayModel(aiError.model)}): {aiError.reason}
                <br />학생에게는 회피 문구가 나갑니다. 계속되면 다른 모델을 고르세요.
                <button type="button" onClick={() => setAiError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '0.72rem' }}>닫기</button>
              </div>
            )}
          </section>

          <section className="panel">
            <p className="eyebrow">ROUND SETUP</p>
            <label className="field-label">말투</label>
            <select className="field" value={settings.style} onChange={(event) => setSettings((prev) => ({ ...prev, style: event.target.value }))}>
              {styleOptions.map((option) => <option key={option}>{option}</option>)}
            </select>

            <label className="field-label">AI 모델</label>
            <select className="field" value={settings.aiModel} onChange={(event) => setSettings((prev) => ({ ...prev, aiModel: event.target.value }))}>
              {aiModelOptions.filter((option) => {
                if (option.value === 'claude') return keyAvailable.anthropic
                if (option.value === 'gpt') return keyAvailable.openai
                if (option.value === 'gemini') return keyAvailable.google
                if (option.value === 'solar') return keyAvailable.upstage
                return false
              }).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <label className="field-label">턴 수</label>
            <select className="field" value={settings.turns} onChange={(event) => setSettings((prev) => ({ ...prev, turns: Number(event.target.value) }))}>
              {[6, 8, 10].map((value) => <option key={value} value={value}>{value}턴</option>)}
            </select>

            <label className="field-label">안내문 읽기 시간 <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(대화 시간과 별도)</span></label>
            <select className="field" value={settings.briefingTime} onChange={(event) => setSettings((prev) => ({ ...prev, briefingTime: Number(event.target.value) }))}>
              <option value={0}>없음 (바로 시작)</option>
              <option value={10}>10초</option>
              <option value={15}>15초</option>
              <option value={20}>20초</option>
              <option value={30}>30초</option>
              <option value={45}>45초</option>
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

            <label className="field-label">정답 점수 {settings.pointValue === 0 && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, marginLeft: 4 }}>연습 라운드</span>}</label>
            <input
              className="field"
              type="number"
              min="0"
              value={settings.pointValue}
              onChange={(event) => setSettings((prev) => ({ ...prev, pointValue: Math.max(0, Number(event.target.value) || 0) }))}
            />

            <button
              className="primary-button"
              onClick={startRound}
              disabled={activeTeamCount < 2 || roundInProgress}
              title={activeTeamCount < 2 ? '팀이 2개 이상 등록되어야 시작할 수 있습니다' : roundInProgress ? '진행 중인 라운드가 끝나면 시작할 수 있습니다' : ''}
            >
              {activeTeamCount < 2 ? `라운드 시작 (팀 ${activeTeamCount}/2)` : roundInProgress ? '라운드 진행 중' : '라운드 시작'}
            </button>
            <div className="stack-buttons">
              {/* 지금 단계에 맞는 버튼만 켠다 (대화 중 결과 공개 → 투표 건너뜀 사고 방지) */}
              <button className="ghost-button" onClick={forceEndChat} disabled={liveStatus !== 'chatting'}>대화 강제 종료</button>
              <button className="ghost-button" onClick={forceEndVote} disabled={liveStatus !== 'voting'}>투표 강제 마감</button>
              <button
                className={liveStatus === 'voting' || liveStatus === 'revealed' ? 'primary-button' : 'ghost-button'}
                onClick={revealResults}
                disabled={liveStatus !== 'voting' && liveStatus !== 'revealed'}
                title={liveStatus === 'chatting' ? '먼저 대화를 끝내고(자동 또는 강제 종료) 투표가 진행된 뒤 공개할 수 있습니다' : ''}
              >
                {liveStatus === 'revealed' ? '결과 공개 (투표 마감됨)' : '결과 공개'}
              </button>
              <button className="ghost-button danger" onClick={endTournament} disabled={roundInProgress}>토너먼트 종료</button>
              <button
                className="ghost-button"
                onClick={() => setShowCloseConfirm(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  marginTop: 6,
                }}
              >
                🔒 수업 완전 종료
              </button>
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">AI STATUS</p>
            <div className="status-pill-row">
              <span className={`status-pill ${keyAvailable.anthropic ? 'ok' : 'missing'}`}>Claude {keyAvailable.anthropic ? '준비' : '없음'}</span>
              <span className={`status-pill ${keyAvailable.openai ? 'ok' : 'missing'}`}>GPT {keyAvailable.openai ? '준비' : '없음'}</span>
              <span className={`status-pill ${keyAvailable.google ? 'ok' : 'missing'}`}>Gemini {keyAvailable.google ? '준비' : '없음'}</span>
              <span className={`status-pill ${keyAvailable.upstage ? 'ok' : 'missing'}`}>Solar {keyAvailable.upstage ? '준비' : '없음'}</span>
            </div>
            <p className="muted">{savedApiKeys.anthropic ? '교사가 입력한 API 키 기준입니다.' : '서버 공용 키 기준입니다 (입장 코드 모드).'}</p>
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
          {/* ═══ 아레나 헤더 (라운드 진행 중) ═══ */}
          {roundDetail && !currentResults && !finalResults && (
            <div style={{
              gridColumn: '1 / -1', // 아레나 헤더는 한 줄 전체 (옆에 매치 카드가 붙어 빈 공간이 생기지 않게)
              padding: '20px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(212,165,116,0.06) 0%, rgba(74,222,128,0.04) 50%, rgba(212,165,116,0.06) 100%)',
              border: '1px solid rgba(212,165,116,0.12)',
              textAlign: 'center', marginBottom: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: roundDetail.round?.status === 'chatting' ? '#22c55e' : '#f59e0b',
                  boxShadow: roundDetail.round?.status === 'chatting' ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(245,158,11,0.5)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#d4a574', letterSpacing: '0.12em', fontFamily: "'Courier New', monospace" }}>
                  {roundDetail.round?.status === 'chatting' ? '◉ ARENA — TRANSMISSION ACTIVE' : '◉ ARENA — VOTING IN PROGRESS'}
                </span>
              </div>
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
                fontFamily: "'Courier New', monospace",
                color: timerInfo?.remaining <= 30 ? '#ef4444' : '#d4d4c8',
                textShadow: timerInfo?.remaining <= 30 ? '0 0 20px rgba(239,68,68,0.4)' : 'none',
                lineHeight: 1, marginBottom: 6,
              }}>
                {formatDuration(timerInfo?.remaining ?? 0)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#d4a574', fontWeight: 600 }}>
                R{roundDetail.round?.round_number} · {roundDetail.round?.style_name} · {displayModel(roundDetail.round?.ai_model)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                <div style={{ fontSize: '0.72rem', color: '#5a6b4a' }}>
                  <span style={{ fontWeight: 700, color: '#9aaa8a' }}>{arenaMatches.pairs.length}</span> 매치
                </div>
                <div style={{ fontSize: '0.72rem', color: '#5a6b4a' }}>
                  <span style={{ fontWeight: 700, color: '#9aaa8a' }}>{liveCompletedTurns}</span> 턴 완료
                </div>
                {arenaMatches.observers.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#5a6b4a' }}>
                    <span style={{ fontWeight: 700, color: '#9aaa8a' }}>{arenaMatches.observers.length}</span> 관찰자
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ 매치 카드 그리드 (라운드 진행 중) ═══ */}
          {/* 학생이 프로젝터를 통해 매칭을 알 수 없도록 팀 이름 익명 처리 */}
          {roundDetail && !currentResults && !finalResults && arenaMatches.pairs.length > 0 && (
            <section className="panel" style={{ padding: '16px 20px', gridColumn: '1 / -1' }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>MATCHES</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {arenaMatches.pairs.map((match, idx) => {
                  const judgeProgress = roundDetail?.teamProgress?.find((t) => t.id === match.judge.id)
                  const totalTurns = roundDetail?.round?.total_turns ?? settings.turns
                  const completed = judgeProgress?.completedTurns ?? 0
                  const pct = totalTurns > 0 ? Math.round((completed / totalTurns) * 100) : 0
                  const judgeVote = voteProgress[match.judge.id]
                  const respondentVote = voteProgress[match.respondent.id]
                  const isVoting = roundDetail?.round?.status === 'voting'

                  return (
                    <button key={idx} onClick={() => selectTeamForLive(match.judge.id, `매치 ${idx + 1}`)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '14px 16px', borderRadius: 10,
                        background: 'var(--surface2, #1e293b)', border: '1px solid var(--border, rgba(255,255,255,0.06))',
                        cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
                        transition: 'border-color 0.2s',
                      }}>
                      {/* 매치 헤더 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', letterSpacing: '0.08em' }}>MATCH {idx + 1}</span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{completed}/{totalTurns}턴</span>
                      </div>

                      {/* 팀 대결 표시 — 익명 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        {/* 질문자 */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: match.judge.color, flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }} />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>질문자</div>
                            <div style={{ fontSize: '0.6rem', color: '#818cf8' }}>🔍 INTERROGATOR</div>
                          </div>
                        </div>

                        {/* 벽 아이콘 */}
                        <div style={{
                          padding: '4px 8px', borderRadius: 6,
                          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.12)',
                          fontSize: '0.65rem', color: '#6366f1', fontWeight: 700, flexShrink: 0,
                        }}>벽</div>

                        {/* 답변자 */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', textAlign: 'right' }}>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>답변자</div>
                            <div style={{ fontSize: '0.6rem', color: '#34d399' }}>🎭 PLAYER</div>
                          </div>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: match.respondent.color, flexShrink: 0, border: '2px solid rgba(255,255,255,0.15)' }} />
                        </div>
                      </div>

                      {/* 프로그레스 바 */}
                      {!isVoting && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{
                            height: 4, borderRadius: 2,
                            background: 'rgba(99,102,241,0.1)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              background: pct >= 100 ? '#22c55e' : '#6366f1',
                              width: `${pct}%`,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      )}

                      {/* 투표 상태 — 익명 */}
                      {isVoting && (
                        <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem' }}>
                          <span style={{ color: judgeVote?.submitted ? '#22c55e' : '#64748b' }}>
                            질문자: {judgeVote?.submitted ? '✅ 제출' : `${judgeVote?.votedCount || 0}/${totalTurns}`}
                          </span>
                          <span style={{ color: respondentVote?.submitted ? '#22c55e' : '#64748b' }}>
                            답변자: 투표 없음
                          </span>
                        </div>
                      )}

                      {/* 진행률 텍스트 */}
                      <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 4, textAlign: 'center' }}>
                        {pct >= 100 ? '모든 교신 완료' : `${pct}% 진행`}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 관찰자 — 익명 */}
              {arenaMatches.observers.length > 0 && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.08)' }}>
                  {arenaMatches.observers.map((obs, idx) => {
                    const obsProgress = roundDetail?.teamProgress?.find((t) => t.id === obs.id)
                    return (
                      <div key={obs.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: obs.color }} />
                        <span style={{ fontWeight: 600, color: '#94a3b8' }}>👓 관찰자 {idx + 1}</span>
                        <span style={{ color: '#475569' }}>→ 매치 1 감청 중</span>
                        <span style={{ color: '#475569', marginLeft: 'auto' }}>{obsProgress?.completedTurns ?? 0}턴</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* ═══ 아레나 대기 (라운드 없을 때) ═══ */}
          {(!roundDetail || currentResults || finalResults) && !finalResults && !currentResults && (
            <>
              {/* 중앙 경기장 헤더 */}
              <div style={{
                padding: '32px 24px', borderRadius: 12, textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(212,165,116,0.05) 0%, rgba(74,222,128,0.03) 50%, rgba(212,165,116,0.05) 100%)',
                border: '1px solid rgba(212,165,116,0.1)',
                marginBottom: 4,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 12, margin: '0 auto 16px',
                  background: 'rgba(212,165,116,0.08)', border: '2px solid rgba(212,165,116,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem',
                }}>◉</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#d4a574', letterSpacing: '0.15em', marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
                  IMITATION GAME ARENA
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d4d4c8', margin: '0 0 8px' }}>
                  {session.teams.length === 0 ? '팀 입장 대기 중' : `${session.teams.length}팀 입장 완료`}
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  {session.teams.length < 2
                    ? '2팀 이상 입장하면 라운드를 시작할 수 있습니다'
                    : '사이드바에서 라운드 설정 후 시작하세요'}
                </p>
                {session.teams.length >= 2 && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                    padding: '6px 14px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                    fontSize: '0.72rem', color: '#34d399', fontWeight: 600,
                  }}>
                    ✅ {Math.floor(session.teams.length / 2)} 매치 편성 가능
                    {session.teams.length % 2 === 1 && ' · 1팀 관찰자'}
                  </div>
                )}
              </div>

              {/* 팀 카드 그리드 */}
              {session.teams.length > 0 && (
                <section className="panel" style={{ padding: '16px 20px' }}>
                  <p className="eyebrow" style={{ marginBottom: 12 }}>PARTICIPANTS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {session.teams.map((team) => (
                      <button key={team.id}
                        onClick={() => selectTeam(team.id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '12px 14px', borderRadius: 10,
                          background: selectedTeamId === team.id ? 'rgba(99,102,241,0.08)' : 'var(--surface2, #1e293b)',
                          border: selectedTeamId === team.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
                          borderTop: `3px solid ${team.color}`,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: team.color }} />
                          <strong style={{ fontSize: '0.88rem' }}>{team.name}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6 }}>
                          {team.members.join(' · ')}
                        </div>
                        <div style={{
                          fontSize: '0.7rem', fontWeight: 600,
                          color: team.total_score > 0 ? '#818cf8' : '#475569',
                        }}>
                          누적 {team.total_score}점
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ═══ 라이브 채팅 뷰어 ═══ */}
          {selectedLiveTurns && !currentResults && !finalResults && (
            <section className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="section-header">
                <div>
                  <p className="eyebrow">🔴 LIVE CHAT</p>
                  <h2>{selectedTeamName}</h2>
                </div>
                <button className="ghost-button" onClick={() => { liveTeamIdRef.current = null; setSelectedLiveTurns(null); setSelectedTeamName('') }} style={{ fontSize: '0.75rem' }}>닫기</button>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {selectedLiveTurns.length === 0 && (
                  <p className="muted">아직 대화가 시작되지 않았습니다.</p>
                )}
                {selectedLiveTurns.map((turn) => (
                  <div key={turn.turn_number} style={{
                    padding: '10px 14px', background: 'var(--surface2)',
                    borderRadius: 10, border: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>턴 {turn.turn_number}</span>
                      {turn.respondent_type && (
                        <span style={{
                          fontSize: '0.55rem', padding: '1px 6px', borderRadius: 4,
                          background: turn.respondent_type === 'human' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                          color: turn.respondent_type === 'human' ? '#22c55e' : '#818cf8',
                          fontWeight: 600,
                        }}>{turn.respondent_type === 'human' ? '사람' : 'AI'}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginBottom: 4 }}>
                      <span style={{ color: '#6366f1', fontWeight: 600 }}>Q</span> {turn.question_text || '—'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      <span style={{ color: '#818cf8', fontWeight: 600 }}>A</span> {turn.styled_answer || '⏳ 대기 중'}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ 결과 ═══ */}
          {currentResults && (
            <>
              <section className="panel">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">🎯 RESULTS</p>
                    <h2>R{currentResults.roundNum} · {currentResults.style} · {displayModel(currentResults.aiModel)}</h2>
                  </div>
                  <span className="muted">
                    {currentResults.pointValue > 0
                      ? `정답 1개당 ${currentResults.pointValue}점`
                      : '연습 라운드 (0점)'}
                  </span>
                </div>
                <div className="result-table">
                  {currentResults.standings.map((team) => (
                    <button key={team.teamId} className={`result-row ${selectedTeamId === team.teamId ? 'selected' : ''}`} onClick={() => selectTeam(team.teamId)}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, minWidth: 36, color: team.rank <= 3 ? '#eab308' : '#64748b' }}>{team.rank}위</span>
                      <strong>{team.teamName}</strong>
                      <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>{team.correct}/{team.total} 정답</span>
                      <span className="score-pill">{team.totalScore}점</span>
                    </button>
                  ))}
                </div>
              </section>

              <TuringCriterion stats={currentResults.stats} className="panel" title={`라운드 ${currentResults.roundNum} 학급 전체`} />

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
                        <p>
                          <strong>실제</strong>{' '}
                          <span style={{ color: selectedTurnDetail.respondentType === 'human' ? '#22c55e' : '#818cf8', fontWeight: 600 }}>
                            {selectedTurnDetail.respondentType === 'human' ? '🧑 사람' : '🤖 AI'}
                          </span>
                        </p>
                        <p>
                          <strong>투표</strong>{' '}
                          <span style={{ color: selectedTurnDetail.isCorrect ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                            {selectedTurnDetail.verdict === 'human' ? '사람' : selectedTurnDetail.verdict === 'ai' ? 'AI' : '미투표'}
                            {selectedTurnDetail.isCorrect ? ' ✅' : ' ❌'}
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="muted">토론할 턴을 선택하세요.</p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ═══ 최종 순위 + 통계 대시보드 ═══ */}
          {finalResults && (
            <>
              <section className="panel" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="muted" style={{ flex: 1, minWidth: 180 }}>토너먼트가 끝났습니다. 결과를 저장하거나 새 수업을 시작하세요.</span>
                <button className="ghost-button" onClick={downloadCsv}>📄 CSV 다운로드</button>
                <button className="primary-button" style={{ width: 'auto' }} onClick={startNewSession}>새 수업 시작</button>
              </section>
              <TuringCriterion stats={finalResults.overallStats} className="panel" title="전체 라운드" />
              <section className="panel">
                <div style={{
                  textAlign: 'center', padding: '20px 0 16px',
                  background: 'linear-gradient(135deg, rgba(234,179,8,0.06), rgba(239,68,68,0.04))',
                  borderRadius: 10, marginBottom: 12,
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🏆</div>
                  <p className="eyebrow" style={{ color: '#eab308' }}>FINAL STANDINGS</p>
                  <h2>최종 순위</h2>
                </div>
                <div className="result-table">
                  {finalResults.finalStandings.map((team, i) => (
                    <div key={team.teamId} className="result-row static" style={{
                      background: team.teamId === finalResults.mvpTeamId ? 'rgba(234,179,8,0.08)' : i === 0 ? 'rgba(234,179,8,0.04)' : 'transparent',
                      borderLeft: team.rank === 1 ? '3px solid #eab308' : 'none',
                    }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 900, minWidth: 40, color: team.rank === 1 ? '#eab308' : team.rank === 2 ? '#94a3b8' : team.rank === 3 ? '#cd7f32' : '#475569' }}>
                        {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : `${team.rank}위`}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '1rem' }}>
                          {team.teamName}
                          {team.teamId === finalResults.mvpTeamId && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#eab308', fontWeight: 700 }}>⭐ MVP</span>}
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                          정답률 {team.accuracy ?? 0}% · {team.totalCorrect ?? 0}/{team.totalTurns ?? 0}
                        </div>
                      </div>
                      <span className="score-pill" style={{ fontSize: '0.9rem' }}>{team.totalScore}점</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── 라운드별 학급 통계 ── */}
              {finalResults.roundStats?.length > 0 && (
                <section className="panel">
                  <p className="eyebrow">📊 ROUND STATS</p>
                  <h2 style={{ marginBottom: 14 }}>라운드별 학급 정답률</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {finalResults.roundStats.map((r) => (
                      <div key={r.roundNum} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 8,
                        background: 'var(--surface2, #1e293b)', border: '1px solid var(--border, rgba(255,255,255,0.06))',
                      }}>
                        <div style={{ minWidth: 40, fontWeight: 700, color: '#d4a574', fontSize: '0.85rem' }}>R{r.roundNum}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                            {r.style} · {displayModel(r.aiModel)}
                            {r.pointValue === 0 && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 600 }}>연습</span>}
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: 'rgba(99,102,241,0.1)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              background: r.accuracy >= 70 ? '#22c55e' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444',
                              width: `${r.accuracy}%`, transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                        <div style={{ minWidth: 50, textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: r.accuracy >= 70 ? '#22c55e' : r.accuracy >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {r.accuracy}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', minWidth: 40, textAlign: 'right' }}>
                          {r.totalCorrect}/{r.totalTurns}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── 전체 통계 ── */}
              {finalResults.overallStats && (
                <section className="panel">
                  <p className="eyebrow">📈 OVERALL</p>
                  <h2 style={{ marginBottom: 14 }}>전체 통계</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { label: '전체 정답률', value: `${finalResults.overallStats.accuracy}%`, color: '#818cf8' },
                      { label: 'AI 식별률', value: `${finalResults.overallStats.aiAiRate}%`, color: '#22c55e' },
                      { label: '사람 식별률', value: `${finalResults.overallStats.humanHumanRate}%`, color: '#f59e0b' },
                      { label: '전체 턴', value: `${finalResults.overallStats.totalCorrect}/${finalResults.overallStats.totalTurns}`, color: '#64748b' },
                    ].map((s) => (
                      <div key={s.label} style={{
                        textAlign: 'center', padding: '14px 10px', borderRadius: 10,
                        background: 'var(--surface2, #1e293b)', border: '1px solid var(--border, rgba(255,255,255,0.06))',
                      }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ═══ 수업 완전 종료 확인 모달 ═══ */}
      {showCloseConfirm && (
        <div
          onClick={() => setShowCloseConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 440, width: '100%',
              padding: '28px 24px', borderRadius: 14,
              background: '#1e293b', border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>⚠️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', marginBottom: 12 }}>
              수업을 완전히 종료할까요?
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, marginBottom: 6, textAlign: 'left' }}>
              종료하면 다음 동작이 일어납니다:
            </p>
            <ul style={{
              fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6,
              textAlign: 'left', margin: '0 0 20px', paddingLeft: 20,
            }}>
              <li>진행 중인 라운드/타이머가 즉시 중단됨</li>
              <li>학생 화면에도 "수업 종료됨"이 표시됨</li>
              <li>새로고침해도 자동으로 재개되지 않음</li>
              <li>새 세션은 "새 수업 시작" 버튼으로 시작</li>
            </ul>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ghost-button"
                style={{ flex: 1 }}
                onClick={() => setShowCloseConfirm(false)}
              >
                취소
              </button>
              <button
                className="primary-button"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  borderColor: '#7f1d1d',
                }}
                onClick={closeSession}
              >
                종료하기
              </button>
            </div>
          </div>
        </div>
      )}
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
