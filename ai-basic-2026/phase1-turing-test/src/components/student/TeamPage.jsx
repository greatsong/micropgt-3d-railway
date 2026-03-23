import { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet } from '../../utils/api.js'
import { createSocket } from '../../utils/socket.js'
import ChatScreen from './ChatScreen.jsx'
import VotePanel from './VotePanel.jsx'
import ScoreBoard from './ScoreBoard.jsx'
import WaitingScreen from './WaitingScreen.jsx'

const ACCESS_KEY = 'turing_test_student_access'

export default function TeamPage({ navigate }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const storedAccess = useMemo(() => {
    const raw = localStorage.getItem(ACCESS_KEY)
    return raw ? JSON.parse(raw) : null
  }, [])

  const sessionId = params.get('session') || storedAccess?.sessionId
  const teamId = params.get('team') || storedAccess?.teamId

  const socketRef = useRef(null)
  const pendingQuestionsRef = useRef({})
  const [team, setTeam] = useState(null)
  const [phase, setPhase] = useState('waiting')
  const [roundInfo, setRoundInfo] = useState(null)
  const [remaining, setRemaining] = useState(null)

  // 심판 (질문하는 쪽) 상태
  const [judgeTurns, setJudgeTurns] = useState([])
  const [questionDraft, setQuestionDraft] = useState('')
  const [awaitingAnswer, setAwaitingAnswer] = useState(false)
  const [judgeNotice, setJudgeNotice] = useState('')

  // 응답 (답변하는 쪽) 상태
  const [incomingQuestion, setIncomingQuestion] = useState(null)
  const [previewAnswer, setPreviewAnswer] = useState(null)

  // 투표 + 결과 상태
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [roundResults, setRoundResults] = useState(null)
  const [finalResults, setFinalResults] = useState(null)

  // ── 초기 로드 ──
  useEffect(() => {
    if (!sessionId || !teamId) { navigate('/'); return }
    localStorage.setItem(ACCESS_KEY, JSON.stringify({ sessionId, teamId }))
    void apiGet(`/team/${teamId}`).then(setTeam).catch(() => navigate('/'))
  }, [sessionId, teamId])

  // ── 소켓 연결 + 이벤트 ──
  useEffect(() => {
    if (!sessionId || !teamId) return

    const socket = createSocket()
    socketRef.current = socket
    socket.emit('team:join', { sessionId, teamId: Number(teamId) })

    socket.on('round:started', (payload) => {
      setRoundInfo(payload)
      setPhase('chat')
      setRemaining(payload.chatTime)
      setJudgeTurns([])
      setQuestionDraft('')
      setAwaitingAnswer(false)
      setIncomingQuestion(null)
      setPreviewAnswer(null)
      setVoteSubmitted(false)
      setRoundResults(null)
      setFinalResults(null)
      setJudgeNotice('')
      pendingQuestionsRef.current = {}
    })

    socket.on('observer:question-seen', ({ turnNum, question }) => {
      pendingQuestionsRef.current[turnNum] = question
    })

    socket.on('timer:tick', ({ remaining: seconds }) => setRemaining(seconds))

    socket.on('turn:question-received', ({ turnNum, question }) => {
      setIncomingQuestion({ turnNum, question })
      setPreviewAnswer(null)
    })

    socket.on('turn:ai-answer-preview', ({ turnNum, aiAnswer }) => {
      setPreviewAnswer({ turnNum, aiAnswer })
      setIncomingQuestion(null)
    })

    socket.on('respondent:answer-accepted', () => {
      setIncomingQuestion(null)
      setJudgeNotice('응답 접수! 딜레이 후 전달됩니다.')
    })

    socket.on('turn:answer-delivered', ({ turnNum, styledAnswer }) => {
      setJudgeTurns((prev) => [
        ...prev,
        { turnNum, question: pendingQuestionsRef.current[turnNum] || `턴 ${turnNum}`, styledAnswer },
      ])
      setAwaitingAnswer(false)
      setQuestionDraft('')
      setJudgeNotice('')
      setPreviewAnswer(null)
    })

    socket.on('chat:ended', () => {
      setPhase('transition')
      setAwaitingAnswer(false)
      setIncomingQuestion(null)
      setPreviewAnswer(null)
    })

    socket.on('vote:phase-started', ({ conversations }) => {
      const teamConversations = conversations[teamId] || conversations[Number(teamId)] || []
      setJudgeTurns(teamConversations)
      setVoteSubmitted(false)
      setPhase('vote')
    })

    socket.on('vote:closed', () => {
      setPhase((prev) => (prev === 'result' ? prev : 'locked'))
    })

    socket.on('round:results', (payload) => {
      const mine = payload.teamResults.find((item) => item.teamId === Number(teamId))
      setRoundResults({ ...payload, mine })
      setPhase('result')
    })

    socket.on('tournament:final', (payload) => {
      setFinalResults(payload)
      setPhase('final')
    })

    return () => socket.disconnect()
  }, [sessionId, teamId])

  // ── 콜백 ──
  function sendQuestion(msg) {
    const nextTurn = judgeTurns.length + 1
    if (!msg || awaitingAnswer || roundInfo?.isSoloJudge) return
    pendingQuestionsRef.current[nextTurn] = msg
    setAwaitingAnswer(true)
    socketRef.current?.emit('judge:send-question', {
      sessionId, teamId: Number(teamId), message: msg,
    })
  }

  function submitAnswer(msg) {
    if (!msg) return
    socketRef.current?.emit('respondent:send-answer', {
      sessionId, teamId: Number(teamId), message: msg,
    })
  }

  function submitVotes(voteArray) {
    socketRef.current?.emit('vote:submit', { sessionId, teamId: Number(teamId), votes: voteArray })
    setVoteSubmitted(true)
  }

  // ── 로딩 ──
  if (!team) {
    return <WaitingScreen message="팀 정보를 불러오는 중..." sub="" />
  }

  // ── 대기 화면 (라운드 시작 전) ──
  if (phase === 'waiting') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{
          padding: '16px', background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: team.color }} />
          <span style={{ fontWeight: 700 }}>{team.name}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{team.members.join(' · ')}</span>
          <button
            onClick={() => navigate(`/?session=${sessionId}`)}
            style={{
              marginLeft: 'auto', padding: '6px 12px', borderRadius: 6,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit',
            }}
          >
            나가기
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <div style={{ fontSize: '3rem', animation: 'pulse 2s ease-in-out infinite' }}>🔍</div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem' }}>게임 대기 중</h2>
          <p style={{ color: 'var(--muted)', textAlign: 'center', maxWidth: 320 }}>
            교사가 라운드를 시작하면 자동으로 채팅이 시작됩니다
          </p>
          <div style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            fontSize: '0.85rem', color: 'var(--accent-hover)',
          }}>
            {team.name} 준비 완료!
          </div>
        </div>
      </div>
    )
  }

  // ── 채팅 페이즈 ──
  if (phase === 'chat') {
    return (
      <ChatScreen
        team={team}
        roundInfo={roundInfo}
        remaining={remaining}
        judgeTurns={judgeTurns}
        awaitingAnswer={awaitingAnswer}
        incomingQuestion={incomingQuestion}
        previewAnswer={previewAnswer}
        judgeNotice={judgeNotice}
        onSendQuestion={sendQuestion}
        onSubmitAnswer={submitAnswer}
      />
    )
  }

  // ── 전환 대기 ──
  if (phase === 'transition' || phase === 'locked') {
    return <WaitingScreen message={phase === 'transition' ? '🗳️ 투표 준비 중...' : '🔒 집계 중...'} sub="잠시 후 다음 단계로 넘어갑니다" />
  }

  // ── 투표 ──
  if (phase === 'vote') {
    return (
      <VotePanel
        conversations={judgeTurns}
        timer={{ remaining }}
        voteSubmitted={voteSubmitted}
        onSubmitVotes={submitVotes}
      />
    )
  }

  // ── 결과 / 최종 ──
  if (phase === 'result' || phase === 'final') {
    return (
      <ScoreBoard
        myTeam={team}
        results={phase === 'result' ? roundResults : null}
        finalResults={phase === 'final' ? finalResults : null}
      />
    )
  }

  return <WaitingScreen message="상태를 확인하는 중..." />
}
