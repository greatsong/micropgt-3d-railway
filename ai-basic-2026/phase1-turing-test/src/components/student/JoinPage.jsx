import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../utils/api.js'
import { withBase } from '../../config.js'

const ACCESS_KEY = 'turing_test_student_access'

export default function JoinPage({ navigate }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  // ?session=UUID 또는 ?code=TEACHERCODE 모두 지원
  const [sessionInput, setSessionInput] = useState(
    params.get('session') || params.get('code') || ''
  )
  const [session, setSession] = useState(null)
  const [teamName, setTeamName] = useState('')
  const [member1, setMember1] = useState('')
  const [member2, setMember2] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.get('code')) {
      void loadSessionByCode(params.get('code'))
    } else if (params.get('session')) {
      void loadSession(params.get('session'))
    }
  }, [])

  async function loadSessionByCode(code) {
    try {
      const data = await apiPost('/session', { teacherCode: code.toUpperCase() })
      setSession(data)
      setError('')
    } catch (err) {
      setSession(null)
      setError(err.message)
    }
  }

  async function loadSession(sessionId) {
    try {
      const data = await apiGet(`/session/${sessionId}`)
      setSession(data)
      setError('')
    } catch (loadError) {
      setSession(null)
      setError(loadError.message)
    }
  }

  function goToTeam(teamId) {
    const access = { sessionId: session.id, teamId }
    localStorage.setItem(ACCESS_KEY, JSON.stringify(access))
    window.history.replaceState({}, '', withBase(`/?session=${session.id}`))
    navigate(`/team?session=${session.id}&team=${teamId}`)
  }

  async function createTeam() {
    if (!session?.id) return
    if (!teamName.trim() || !member1.trim()) {
      setError('팀 이름과 팀원 1 이름을 입력하세요.')
      return
    }

    const members = [member1.trim()]
    if (member2.trim()) members.push(member2.trim())

    try {
      const team = await apiPost(`/session/${session.id}/team`, {
        name: teamName.trim(),
        members,
      })
      goToTeam(team.id)
    } catch (teamError) {
      setError(teamError.message)
    }
  }

  async function joinTeam(teamId) {
    if (!session?.id || !teamId) return
    try {
      await apiPost(`/session/${session.id}/join`, { teamId })
      goToTeam(teamId)
    } catch (joinError) {
      setError(joinError.message)
    }
  }

  return (
    <div className="page-shell student-shell">
      <header className="hero">
        <div className="headline-block">
          <p className="eyebrow">🎮 IMITATION GAME</p>
          <h1>이미테이션 게임</h1>
          <p className="muted hero-copy">같은 말투로 대답하는 상대방... 진짜 사람일까, AI일까? 팀끼리 추리 대결!</p>
        </div>
        <div className="hero-actions">
          <span className="badge badge-yellow">🕵️ 추리 게임</span>
          <span className="badge badge-green">⚔️ 팀 대결</span>
          <button className="ghost-button" onClick={() => navigate('/guide')}>사용 안내</button>
          <button className="ghost-button" onClick={() => navigate('/teacher')}>교사 화면</button>
        </div>
      </header>

      <div className="student-grid">
        <section className="panel" style={{ animation: 'slideUp 0.4s ease-out' }}>
          <p className="eyebrow">ENTER GAME</p>
          <h2>수업 코드 입력</h2>
          <p className="muted">선생님이 알려준 코드를 넣으면 바로 입장!</p>
          <input
            className="field"
            value={sessionInput}
            onChange={(event) => setSessionInput(event.target.value)}
            placeholder="수업 코드 입력 (예: AI2026)"
            onKeyDown={(e) => e.key === 'Enter' && loadSessionByCode(sessionInput)}
          />
          <button className="primary-button" onClick={() => loadSessionByCode(sessionInput)}>입장하기</button>
          {session && (
            <div className="detail-box" style={{ marginTop: 10, animation: 'fadeIn 0.3s ease-out' }}>
              <p><strong>수업 코드</strong> {session.teacher_code}</p>
              <p><strong>현재 상태</strong> {session.status}</p>
              <p><strong>참가 팀</strong> {session.teams.length}팀</p>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
        </section>

        <section className="panel" style={{ animation: 'slideUp 0.4s ease-out 0.1s both' }}>
          <p className="eyebrow">HOW TO PLAY</p>
          <h2>게임 규칙</h2>
          <div className="detail-box compact-box">
            <p><strong>🔍 질문을 던져라</strong> 상대에게 질문해서 정체를 파악하세요</p>
            <p><strong>🎭 정체를 숨겨라</strong> 우리 팀이 답변할 때는 들키지 않게!</p>
            <p><strong>🗳️ 투표로 승부</strong> 매 턴 사람/AI 투표, 정답이면 점수!</p>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>라운드마다 상대 팀이 바뀝니다. 최종 점수가 가장 높은 팀이 승리!</p>
        </section>
      </div>

      {session && (
        <div className="student-grid" style={{ animation: 'slideUp 0.4s ease-out' }}>
          <section className="panel">
            <p className="eyebrow">CREATE TEAM</p>
            <h2>우리 팀 만들기</h2>
            <input className="field" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="팀 이름" />
            <input className="field" value={member1} onChange={(event) => setMember1(event.target.value)} placeholder="팀원 1 이름" style={{ marginTop: 6 }} />
            <input className="field" value={member2} onChange={(event) => setMember2(event.target.value)} placeholder="팀원 2 이름 (선택)" style={{ marginTop: 6 }} />
            <button className="primary-button" onClick={createTeam}>팀 만들고 입장! 🚀</button>
          </section>

          <section className="panel">
            <p className="eyebrow">JOIN TEAM</p>
            <h2>기존 팀에 합류</h2>
            <div className="team-list">
              {session.teams.map((team) => (
                <button
                  key={team.id}
                  className={`team-list-row ${selectedTeamId === team.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <span className="team-dot" style={{ background: team.color }} />
                  <div>
                    <strong>{team.name}</strong>
                    <p className="muted">{team.members.join(' · ')}</p>
                  </div>
                </button>
              ))}
            </div>
            <button className="ghost-button" disabled={!selectedTeamId} onClick={() => joinTeam(selectedTeamId)} style={{ marginTop: 10 }}>
              선택한 팀으로 입장
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
