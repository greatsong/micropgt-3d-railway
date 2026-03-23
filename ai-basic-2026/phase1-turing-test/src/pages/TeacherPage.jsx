import { useState, useEffect, useRef, useCallback } from 'react'
import TeacherGate, { checkTeacherAuth } from '../components/teacher/TeacherGate.jsx'
import ClassSetup from '../components/teacher/ClassSetup.jsx'
import RoundController from '../components/teacher/RoundController.jsx'
import TeamGrid from '../components/teacher/TeamGrid.jsx'
import ConversationView from '../components/teacher/ConversationView.jsx'
import RoundResults from '../components/teacher/RoundResults.jsx'
import FinalResults from '../components/teacher/FinalResults.jsx'
import { connectSocket, disconnectSocket, formatTime } from '../utils/socket.js'

export default function TeacherPage() {
  const [authed, setAuthed] = useState(checkTeacherAuth)
  const [session, setSession] = useState(null)
  const [phase, setPhase] = useState('waiting') // waiting | chatting | voting | voting-closed | revealed | ended
  const [teams, setTeams] = useState([])
  const [round, setRound] = useState(null)
  const [teamProgress, setTeamProgress] = useState([])
  const [voteProgress, setVoteProgress] = useState([])
  const [results, setResults] = useState(null)
  const [finalResults, setFinalResults] = useState(null)
  const [timer, setTimer] = useState(null)
  const [roundNum, setRoundNum] = useState(1)
  const [completedRounds, setCompletedRounds] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [conversationTurns, setConversationTurns] = useState([])
  const [conversationRevealed, setConversationRevealed] = useState(false)

  const socketRef = useRef(null)

  // 세션 폴링: 팀 목록 갱신
  useEffect(() => {
    if (!session) return
    let timer
    async function poll() {
      try {
        const res = await fetch(`/turing-test/api/session/${session.id}`)
        const data = await res.json()
        if (data.teams) {
          setTeams(data.teams)
          // teamProgress 초기화
          setTeamProgress((prev) =>
            data.teams.map((t) => {
              const existing = prev.find((p) => p.id === t.id)
              return existing || { id: t.id, name: t.name, color: t.color, completedTurns: 0 }
            })
          )
        }
      } catch {}
    }
    poll()
    timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [session])

  // 소켓 연결
  useEffect(() => {
    if (!session) return

    const socket = connectSocket()
    socketRef.current = socket

    socket.emit('teacher:join', { sessionId: session.id })

    socket.on('round:started', (data) => {
      setPhase('chatting')
      setRound(data)
      setRoundNum(data.roundNum)
      setTeamProgress(
        (data.teams || teams).map((t) => ({
          id: t.id ?? t.teamId,
          name: t.name ?? t.teamName,
          color: t.color ?? t.teamColor,
          completedTurns: 0,
          partnerId: t.partnerId,
        }))
      )
      setVoteProgress([])
    })

    socket.on('turn:completed', ({ teamId, turnNum, phase: tPhase }) => {
      if (tPhase === 'answered') {
        setTeamProgress((prev) =>
          prev.map((t) =>
            t.id === teamId ? { ...t, completedTurns: Math.max(t.completedTurns, turnNum) } : t
          )
        )
      }
    })

    socket.on('vote:phase-started', ({ voteTime }) => {
      setPhase('voting')
      setTeamProgress((prev) =>
        prev.map((t) => ({ ...t }))
      )
      // voteProgress 초기화
      setVoteProgress(teams.map((t) => ({ teamId: t.id, teamName: t.name, votedCount: 0, submitted: false })))
    })

    socket.on('vote:progress', (data) => {
      setVoteProgress((prev) => {
        const exists = prev.find((p) => p.teamId === data.teamId)
        if (exists) {
          return prev.map((p) =>
            p.teamId === data.teamId ? { ...p, votedCount: data.votedCount, submitted: data.submitted } : p
          )
        }
        return [...prev, { teamId: data.teamId, votedCount: data.votedCount, submitted: data.submitted }]
      })
    })

    socket.on('vote:closed', () => {
      setPhase('voting-closed')
    })

    socket.on('round:results', (data) => {
      setPhase('revealed')
      setResults(data)
      // 팀 점수 업데이트
      if (data.teamResults) {
        setTeams((prev) =>
          prev.map((t) => {
            const r = data.teamResults.find((tr) => tr.teamId === t.id)
            return r ? { ...t, total_score: r.totalScore } : t
          })
        )
      }
      setCompletedRounds((prev) => [
        ...prev,
        { roundNum: data.roundNum, style: data.style, pointValue: data.pointValue },
      ])
      setRoundNum((n) => n + 1)
    })

    socket.on('round:conversation-detail', ({ teamId, turns }) => {
      const team = teams.find((t) => t.id === teamId)
      setSelectedTeam(team || { id: teamId, name: '팀', color: '#6366F1' })
      setConversationTurns(turns || [])
      setConversationRevealed(phase === 'revealed')
    })

    socket.on('tournament:final', (data) => {
      setPhase('ended')
      setFinalResults(data)
    })

    socket.on('timer:tick', ({ phase: timerPhase, remaining }) => {
      setTimer({ phase: timerPhase, remaining })
    })

    return () => {
      socket.off('round:started')
      socket.off('turn:completed')
      socket.off('vote:phase-started')
      socket.off('vote:progress')
      socket.off('vote:closed')
      socket.off('round:results')
      socket.off('round:conversation-detail')
      socket.off('tournament:final')
      socket.off('timer:tick')
    }
  }, [session, teams.length])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  function handleRoundStart(settings) {
    emit('round:start', { sessionId: session.id, ...settings })
  }

  function handleForceEndChat() {
    if (confirm('대화를 강제 종료하고 투표 단계로 넘어갑니까?'))
      emit('round:force-end-chat', { sessionId: session.id })
  }

  function handleForceEndVote() {
    if (confirm('투표를 강제 마감합니까?'))
      emit('round:force-end-vote', { sessionId: session.id })
  }

  function handleReveal() {
    emit('round:reveal', { sessionId: session.id })
  }

  function handleTournamentEnd() {
    if (confirm('토너먼트를 종료하고 최종 결과를 공개합니까?'))
      emit('tournament:end', { sessionId: session.id })
  }

  function handleShowConversation(teamId) {
    emit('round:show-conversation', { sessionId: session.id, teamId })
  }

  function handleNextRound() {
    setPhase('waiting')
    setResults(null)
    setTeamProgress(teams.map((t) => ({ id: t.id, name: t.name, color: t.color, completedTurns: 0 })))
    setVoteProgress([])
  }

  function handleTeamCardClick(team) {
    if (phase === 'chatting' || phase === 'revealed') {
      emit('round:show-conversation', { sessionId: session.id, teamId: team.id })
    }
  }

  // ── 인증 안 된 경우 ─────────────────────────────────
  if (!authed) {
    return <TeacherGate onAuth={() => setAuthed(true)} />
  }

  // ── 세션 미생성 ─────────────────────────────────────
  if (!session) {
    return <ClassSetup onSessionCreated={(s) => { setSession(s); connectSocket() }} />
  }

  // ── 토너먼트 종료 ─────────────────────────────────
  if (phase === 'ended') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ background: '#1E293B', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '1.125rem' }}>🧪 튜링 테스트</span>
          <span className="badge badge-green" style={{ marginLeft: 'auto' }}>수업 종료</span>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 20px' }}>
          <FinalResults results={finalResults} sessionId={session.id} />
        </div>
      </div>
    )
  }

  return (
    <div className="teacher-layout">
      {/* 사이드바 */}
      <div className="teacher-sidebar">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '2px' }}>🧪 튜링 테스트</div>
          <div style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>코드: {session.teacher_code}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <RoundController
            phase={phase}
            round={round}
            timer={timer}
            teamProgress={teamProgress}
            voteProgress={voteProgress}
            roundNum={roundNum}
            completedRounds={completedRounds}
            onRoundStart={handleRoundStart}
            onForceEndChat={handleForceEndChat}
            onForceEndVote={handleForceEndVote}
            onReveal={handleReveal}
            onTournamentEnd={handleTournamentEnd}
          />
        </div>

        {/* 하단 QR 링크 */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '4px' }}>학생 접속 링크</div>
          <div style={{ fontSize: '0.8125rem', color: '#E2E8F0', wordBreak: 'break-all' }}>
            {session.joinUrl || `/?code=${session.teacher_code}`}
          </div>
        </div>
      </div>

      {/* 메인 */}
      <div className="teacher-main">
        {/* 결과 공개 단계 */}
        {(phase === 'revealed' || phase === 'voting-closed') && results ? (
          <div>
            <RoundResults
              results={results}
              onShowConversation={handleShowConversation}
              onNextRound={handleNextRound}
            />
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleNextRound}>
                다음 라운드 설정 →
              </button>
            </div>
          </div>
        ) : (
          <TeamGrid
            teams={teams}
            phase={phase}
            teamProgress={teamProgress}
            voteProgress={voteProgress}
            round={round}
            onTeamClick={handleTeamCardClick}
            selectedTeamId={selectedTeam?.id}
          />
        )}
      </div>

      {/* 대화 상세 모달 */}
      {selectedTeam && (
        <ConversationView
          team={selectedTeam}
          turns={conversationTurns}
          revealed={conversationRevealed}
          onClose={() => { setSelectedTeam(null); setConversationTurns([]) }}
        />
      )}
    </div>
  )
}
