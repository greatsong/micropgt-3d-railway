import { createRound, getPartner, getRole, pairingsToRecords } from './matchmaking.js'
import { generateAIResponseWithTimeout, styleTransform, pickFallbackPhrase, aiEvents } from './ai.js'
import { getTimer, timerStore } from './timer.js'
import { buildSharedRankings } from './utils.js'
import { sessionApiKeys } from './apiKeyStore.js'
import { verifyTeacherToken, canManageSession, releaseSessionOwner } from './teacherAuth.js'

const activeRounds = new Map()

/** 교사 전용 이벤트 — 토큰이 없거나 만료면 거부하고, 다른 교사의 세션이면 거부한다 */
function teacherOk(socket, token, sessionId) {
  const teacher = verifyTeacherToken(token)
  if (!teacher) {
    socket.emit('error', { message: '교사 인증이 만료되었습니다. 입장 코드로 다시 들어오세요.' })
    return false
  }
  if (sessionId && !canManageSession(sessionId, teacher.teacherId)) {
    socket.emit('error', { message: '다른 선생님이 진행 중인 수업입니다. 조작할 수 없습니다.' })
    return false
  }
  return true
}

/**
 * 라운드 상태 공통 정리 — 답변 전달 예약 취소, 타이머 종료, activeRounds 제거
 * reveal / session:close / tournament:end 모두 이 함수를 거친다 (이전 라운드 이벤트가 다음 라운드에 섞이지 않게)
 */
function cleanupRound(io, sessionId) {
  const roundState = activeRounds.get(sessionId)
  if (roundState) {
    for (const cancelDelivery of roundState.deliveryCancels) {
      try { cancelDelivery() } catch {}
    }
    roundState.deliveryCancels = []
    roundState.phase = 'done'
  }
  try { getTimer(io, sessionId).forceEnd() } catch {}
  activeRounds.delete(sessionId)
  return roundState
}

/** 세션이 완전히 끝났을 때 메모리 항목 제거 */
function releaseSession(sessionId) {
  timerStore.delete(sessionId)
  sessionApiKeys.delete(sessionId)
  releaseSessionOwner(sessionId)
}

/** 비동기 작업(말투 변환·AI 호출) 뒤에도 이 라운드가 아직 대화 단계인지 — 아니면 결과를 버린다 */
function stillChatting(sessionId, roundState) {
  return activeRounds.get(sessionId) === roundState && roundState.phase === 'chatting'
}

/**
 * 재접속·늦은 합류 복원 — 현재 단계에 맞는 화면 상태를 그 소켓에만 보낸다
 * (round:started만 다시 보내면 브리핑이 다시 뜨고 입력창이 잠긴 채 대화 내역이 비어 버린다)
 */
function restoreTeamState(io, db, socket, sessionId, roundState, teamId) {
  const payload = buildRoundStartedPayload(roundState, teamId)
  payload.restored = true
  payload.chatStarted = Boolean(roundState.chatStarted)
  payload.phase = roundState.phase
  if (roundState.chatStarted) payload.briefingTime = 0
  socket.emit('round:started', payload)

  const role = payload.role
  if (roundState.phase === 'chatting') {
    // 지금까지의 대화
    const asJudge = db.prepare(
      'SELECT turn_number, question_text, styled_answer FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(roundState.roundId, teamId)
    const asRespondent = db.prepare(
      "SELECT turn_number, question_text, styled_answer FROM turns WHERE round_id = ? AND respondent_team_id = ? AND styled_answer IS NOT NULL ORDER BY turn_number"
    ).all(roundState.roundId, teamId)
    socket.emit('turn:history', {
      judgeTurns: asJudge.map((t) => ({ turnNum: t.turn_number, question: t.question_text, styledAnswer: t.styled_answer })),
      respondTurns: asRespondent.map((t) => ({ turnNum: t.turn_number, question: t.question_text, styledAnswer: t.styled_answer })),
      awaitingAnswer: Boolean(roundState.teamAwaitingAnswer[teamId]),
    })
    // 답변자에게 아직 답하지 않은 질문이 와 있으면 다시 보여 준다
    const pending = roundState.pendingQuestions?.get(teamId)
    if (pending && (role === 'respondent' || role === 'player')) {
      socket.emit('turn:question-received', pending)
    }
  } else if (roundState.phase === 'voting') {
    const turns = db.prepare(
      'SELECT turn_number, question_text, styled_answer FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(roundState.roundId, teamId)
    const round = db.prepare('SELECT vote_time FROM rounds WHERE id = ?').get(roundState.roundId)
    socket.emit('vote:phase-started', {
      roundId: roundState.roundId,
      voteTime: round?.vote_time ?? 0,
      conversations: { [teamId]: turns.map((t) => ({ turnNum: t.turn_number, question: t.question_text, styledAnswer: t.styled_answer })) },
      restored: true,
      alreadyVoted: Boolean(roundState.voteData[teamId]),
    })
  } else if (roundState.phase === 'closed') {
    socket.emit('vote:closed', {})
  }
}

export function registerSocketHandlers(io, db) {
  // AI 호출 실패를 해당 세션의 교사 화면으로 전달 (콘솔에만 남지 않게)
  aiEvents.on('error', ({ sessionId, model, reason }) => {
    if (!sessionId) return
    io.to(`session:${sessionId}:teacher`).emit('ai:error', { model, reason, at: Date.now() })
  })

  io.on('connection', (socket) => {
    socket.on('teacher:join', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      socket.join(`session:${sessionId}`)
      socket.join(`session:${sessionId}:teacher`)
    })

    socket.on('team:join', ({ sessionId, teamId }) => {
      socket.join(`session:${sessionId}`)
      socket.join(`session:${sessionId}:team:${teamId}`)
      // 팀 단위 참여: 모든 팀원이 심판+응답 모두 보임
      socket.join(`session:${sessionId}:team:${teamId}:judge`)
      socket.join(`session:${sessionId}:team:${teamId}:respondent`)

      const roundState = activeRounds.get(sessionId)
      if (roundState) {
        const numericTeamId = Number(teamId)
        const isInPairs = roundState.pairs.some(([a, b]) => a.id === numericTeamId || b.id === numericTeamId)
        const isObserver = roundState.soloObserver?.id === numericTeamId
        if (isInPairs || isObserver) {
          // 라운드에 등록된 팀 — 재접속/늦은 합류: 현재 단계와 대화 내역까지 복원
          restoreTeamState(io, db, socket, sessionId, roundState, numericTeamId)
        } else {
          // 라운드 시작 후 새로 만들어진 팀 — 다음 라운드 대기 안내
          socket.emit('round:locked', {
            roundNum: roundState.roundNum,
            message: '이번 라운드는 이미 시작되었어요. 다음 라운드부터 자동으로 참여됩니다!',
          })
        }
      }
    })

    socket.on('round:start', ({ sessionId, style, turns, chatTime, responseDelay, voteTime, pointValue, aiModel, briefingTime, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      // 종료된 세션에서는 새 라운드를 시작할 수 없음
      const sessionRow = db.prepare('SELECT status FROM sessions WHERE id = ?').get(sessionId)
      if (!sessionRow) {
        socket.emit('error', { message: '세션을 찾을 수 없습니다.' })
        return
      }
      if (sessionRow.status === 'ended' || sessionRow.status === 'closed') {
        socket.emit('error', { message: '이 수업은 이미 종료되었습니다. 새 세션을 만들어 주세요.' })
        return
      }
      // 진행 중인 라운드가 있으면 중복 시작 금지 (버튼 두 번 누름·다른 탭 대비)
      if (activeRounds.has(sessionId)) {
        socket.emit('error', { message: '진행 중인 라운드가 있습니다. 결과 공개 뒤에 다음 라운드를 시작하세요.' })
        return
      }

      const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(sessionId)
      if (teams.length < 2) {
        socket.emit('error', { message: '팀이 2개 이상 있어야 라운드를 시작할 수 있습니다.' })
        return
      }

      const lastRound = db
        .prepare('SELECT round_number FROM rounds WHERE session_id = ? ORDER BY round_number DESC LIMIT 1')
        .get(sessionId)
      const roundNum = lastRound ? lastRound.round_number + 1 : 1

      const roundInsert = db.prepare(`
        INSERT INTO rounds (
          session_id, round_number, style_name, ai_model, point_value,
          total_turns, chat_time, response_delay, vote_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'chatting')
      `).run(
        sessionId,
        roundNum,
        style,
        aiModel || 'claude',
        pointValue ?? 1,
        turns,
        chatTime,
        responseDelay,
        voteTime
      )

      const roundId = Number(roundInsert.lastInsertRowid)

      // 이전 라운드 역할 조회 (역할 순환용)
      const previousRoles = {}
      if (roundNum > 1) {
        const prevRound = db.prepare(
          'SELECT id FROM rounds WHERE session_id = ? AND round_number = ?'
        ).get(sessionId, roundNum - 1)
        if (prevRound) {
          const prevPairings = db.prepare(
            'SELECT team_a_id, team_b_id, observer_team_id FROM pairings WHERE round_id = ?'
          ).all(prevRound.id)
          for (const p of prevPairings) {
            previousRoles[p.team_a_id] = 'judge'
            previousRoles[p.team_b_id] = 'respondent'
            if (p.observer_team_id) previousRoles[p.observer_team_id] = 'observer'
          }
        }
      }

      const { pairs, soloObserver, observerTargetTeamId, teamTurns } = createRound(teams, turns, previousRoles)

      const insertPairing = db.prepare(
        'INSERT INTO pairings (round_id, team_a_id, team_b_id, observer_team_id) VALUES (?, ?, ?, ?)'
      )
      for (const pairing of pairingsToRecords(pairs, soloObserver?.id ?? null, observerTargetTeamId)) {
        insertPairing.run(roundId, pairing.teamAId, pairing.teamBId, pairing.observerTeamId)
      }

      db.prepare("UPDATE sessions SET status = 'active' WHERE id = ?").run(sessionId)

      // 안내문 읽기 시간
      // - R1, R2는 교사 설정값 그대로 (역할을 한 번씩 새로 맡으므로 안내 필요)
      // - R3 이후는 0으로 자동 축소 (이미 양쪽 역할 경험 → 즉시 대화 시작)
      const requestedBriefing = Math.max(0, Number(briefingTime) || 0)
      const briefingSeconds = roundNum <= 2 ? requestedBriefing : 0

      // 이번 라운드 실제 참가 팀 ID 집합 (페어 + 관찰자) — vote/result 단계에서 잠긴 팀 제외 기준
      const participantTeamIds = new Set([
        ...pairs.flatMap(([a, b]) => [a.id, b.id]),
        ...(soloObserver ? [soloObserver.id] : []),
      ])

      const roundState = {
        roundId,
        roundNum,
        sessionId,
        style,
        aiModel: aiModel || 'claude',
        totalTurns: turns,
        chatTime,
        responseDelay,
        voteTime,
        pointValue: pointValue ?? 1,
        briefingTime: briefingSeconds,
        phase: 'chatting', // chatting → voting → closed → done
        pairs,
        soloObserver,
        observerTargetTeamId,
        teamTurns,
        teamCurrentTurn: {},
        teamAwaitingAnswer: {},
        voteData: {},
        mirroredTurnIds: new Map(),
        deliveryCancels: [],
        apiKeys: sessionApiKeys.get(sessionId) || {},
        participantTeamIds,
        pendingQuestions: new Map(), // 답변자 팀 ID -> 아직 답하지 않은 질문 (재접속 복원용)
      }

      for (const team of teams) {
        roundState.teamCurrentTurn[team.id] = 0
        roundState.teamAwaitingAnswer[team.id] = false
      }

      activeRounds.set(sessionId, roundState)

      const timer = getTimer(io, sessionId)

      // 브리핑 → (자동) → 채팅 순서로 진행
      // briefingSeconds가 0이면 브리핑 건너뛰고 바로 채팅 시작
      roundState.chatStarted = briefingSeconds <= 0
      const startChatPhase = () => {
        roundState.chatStarted = true
        io.to(`session:${sessionId}`).emit('chat:started', { roundId })
        timer.startChat(chatTime, () => endChatPhase(io, db, sessionId))
      }
      if (briefingSeconds > 0) {
        timer.startBriefing(briefingSeconds, startChatPhase)
      } else {
        startChatPhase()
      }

      for (const team of teams) {
        io.to(`session:${sessionId}:team:${team.id}`).emit('round:started', buildRoundStartedPayload(roundState, team.id))
      }

      io.to(`session:${sessionId}:teacher`).emit('round:started', {
        roundId,
        roundNum,
        style,
        aiModel: roundState.aiModel,
        turns,
        chatTime,
        responseDelay,
        voteTime,
        briefingTime: briefingSeconds,
        pointValue: roundState.pointValue,
        teams: teams.map((team) => ({
          id: team.id,
          name: team.name,
          color: team.color,
          role: soloObserver?.id === team.id ? 'observer' : (getRole(pairs, team.id) || 'judge'),
          isSoloJudge: soloObserver?.id === team.id,
        })),
      })
    })

    socket.on('judge:send-question', ({ sessionId, teamId, message }) => {
      try {
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return
      if (roundState.phase !== 'chatting') return
      // 브리핑 단계에서는 질문 전송 차단
      // 클라이언트가 낙관적으로 추가한 메시지를 롤백할 수 있도록 거부 이벤트를 돌려줌
      if (!roundState.chatStarted) {
        const nextTurnNum = (roundState.teamCurrentTurn?.[teamId] ?? 0) + 1
        socket.emit('judge:question-rejected', { turnNum: nextTurnNum, reason: 'briefing' })
        return
      }
      if (roundState.soloObserver?.id === teamId) return
      // 응답 팀은 질문 불가
      if (getRole(roundState.pairs, teamId) === 'respondent') return
      if (roundState.teamAwaitingAnswer[teamId]) return

      const turnIndex = roundState.teamCurrentTurn?.[teamId]
      if (turnIndex == null || turnIndex >= roundState.totalTurns) return

      const turnNum = turnIndex + 1
      const respondentType = roundState.teamTurns[teamId]?.[turnIndex]
      if (!respondentType) return
      const partner = getPartner(roundState.pairs, teamId)
      const questionSentAt = Date.now()

      const insertTurn = db.prepare(`
        INSERT INTO turns (
          round_id, team_id, turn_number, respondent_type, respondent_team_id, question_text
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      const sourceTurn = insertTurn.run(
        roundState.roundId,
        teamId,
        turnNum,
        respondentType,
        respondentType === 'human' ? partner?.id ?? null : null,
        message
      )
      const sourceTurnId = Number(sourceTurn.lastInsertRowid)

      let observerTurnId = null
      if (roundState.soloObserver && roundState.observerTargetTeamId === teamId) {
        const observerTurn = insertTurn.run(
          roundState.roundId,
          roundState.soloObserver.id,
          turnNum,
          respondentType,
          respondentType === 'human' ? partner?.id ?? null : null,
          message
        )
        observerTurnId = Number(observerTurn.lastInsertRowid)
        roundState.mirroredTurnIds.set(sourceTurnId, observerTurnId)
        io.to(`session:${sessionId}:team:${roundState.soloObserver.id}:judge`).emit('observer:question-seen', {
          turnNum,
          question: message,
          observedTeamId: teamId,
        })
      }

      roundState.teamAwaitingAnswer[teamId] = true

      io.to(`session:${sessionId}:teacher`).emit('turn:completed', {
        teamId,
        turnNum,
        totalTurns: roundState.totalTurns,
        phase: 'question',
      })

      if (respondentType === 'human' && partner) {
        const questionPayload = {
          sourceTeamId: teamId,
          turnNum,
          question: message,
          deadline: questionSentAt + roundState.responseDelay * 1000,
        }
        roundState.pendingQuestions.set(partner.id, questionPayload)
        io.to(`session:${sessionId}:team:${partner.id}:respondent`).emit('turn:question-received', questionPayload)

        const deliverHumanAnswer = async () => {
          roundState.pendingQuestions.delete(partner.id)
          let row = db.prepare('SELECT * FROM turns WHERE id = ?').get(sourceTurnId)
          let styledAnswer = row?.styled_answer

          if (!styledAnswer && row?.original_answer) {
            // 사람이 답변했으나 styleTransform이 아직 완료되지 않은 경우 — 여기서 직접 변환
            styledAnswer = await styleTransform(row.original_answer, roundState.style, roundState.apiKeys, { sessionId })
            if (!stillChatting(sessionId, roundState)) return // 변환 중에 라운드가 끝났으면 버린다
            db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, sourceTurnId)
            if (observerTurnId) {
              db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, observerTurnId)
            }
          } else if (!styledAnswer) {
            // 아예 답변이 없는 경우 (타임아웃) - 랜덤 회피 문구
            styledAnswer = await styleTransform(pickFallbackPhrase(), roundState.style, roundState.apiKeys, { sessionId })
            if (!stillChatting(sessionId, roundState)) return
            db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, sourceTurnId)
            if (observerTurnId) {
              db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, observerTurnId)
            }
            io.to(`session:${sessionId}:team:${teamId}:judge`).emit('turn:answer-timeout', {
              turnNum,
              defaultAnswer: styledAnswer,
            })
            if (observerTurnId) {
              io.to(`session:${sessionId}:team:${roundState.soloObserver.id}:judge`).emit('turn:answer-timeout', {
                turnNum,
                defaultAnswer: styledAnswer,
              })
            }
          }

          finalizeTurnDelivery(io, db, sessionId, roundState, {
            sourceTeamId: teamId,
            sourceTurnId,
            observerTurnId,
            turnNum,
            styledAnswer,
          })
        }

        const cancelDelivery = getTimer(io, sessionId).scheduleDelivery(questionSentAt, roundState.responseDelay, deliverHumanAnswer)
        roundState.deliveryCancels.push(cancelDelivery)
        return
      }

      let aiAnswerText = null
      let deliveryClosed = false

      generateAIResponseWithTimeout(
        message,
        roundState.style,
        roundState.aiModel,
        Math.max(4000, (roundState.responseDelay - 2) * 1000),
        roundState.apiKeys,
        { sessionId }
      ).then((answer) => {
        if (deliveryClosed) return
        aiAnswerText = answer
        if (partner) {
          io.to(`session:${sessionId}:team:${partner.id}:respondent`).emit('turn:ai-answer-preview', {
            turnNum,
            question: message,
            aiAnswer: answer,
            deadline: questionSentAt + roundState.responseDelay * 1000,
          })
        }
      }).catch(() => {
        if (!deliveryClosed) {
          aiAnswerText = null
        }
      })

      const deliverAiAnswer = async () => {
        deliveryClosed = true
        const styledAnswer = aiAnswerText || await styleTransform(pickFallbackPhrase(), roundState.style, roundState.apiKeys, { sessionId })
        if (!stillChatting(sessionId, roundState)) return // 변환 중에 라운드가 끝났으면 버린다
        db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, sourceTurnId)
        if (observerTurnId) {
          db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, observerTurnId)
        }

        finalizeTurnDelivery(io, db, sessionId, roundState, {
          sourceTeamId: teamId,
          sourceTurnId,
          observerTurnId,
          turnNum,
          styledAnswer,
        })
      }

      const cancelDelivery = getTimer(io, sessionId).scheduleDelivery(questionSentAt, roundState.responseDelay, deliverAiAnswer)
      roundState.deliveryCancels.push(cancelDelivery)
      } catch (err) { console.error('[judge:send-question]', err.message) }
    })

    socket.on('respondent:send-answer', async ({ sessionId, teamId, message }) => {
      try {
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return
      if (roundState.phase !== 'chatting') return
      // 브리핑 단계에서는 답변 전송 차단
      if (!roundState.chatStarted) return

      const sourceTeam = getPartner(roundState.pairs, teamId)
      if (!sourceTeam) return

      const currentTurn = roundState.teamCurrentTurn?.[sourceTeam.id]
      if (currentTurn == null) return
      const turnNum = currentTurn + 1
      const sourceTurn = db.prepare(`
        SELECT * FROM turns
        WHERE round_id = ? AND team_id = ? AND turn_number = ? AND respondent_type = 'human'
        ORDER BY id DESC LIMIT 1
      `).get(roundState.roundId, sourceTeam.id, turnNum)

      if (!sourceTurn || sourceTurn.styled_answer) return

      // 원본 먼저 즉시 저장 (delivery 타이머가 먼저 터져도 원본을 읽을 수 있게)
      db.prepare('UPDATE turns SET original_answer = ? WHERE id = ?')
        .run(message, sourceTurn.id)

      const styledAnswer = await styleTransform(message, roundState.style, roundState.apiKeys, { sessionId })
      if (!stillChatting(sessionId, roundState)) return // 변환 중에 라운드가 끝났으면 버린다
      db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?')
        .run(styledAnswer, sourceTurn.id)

      const observerTurnId = roundState.mirroredTurnIds.get(sourceTurn.id)
      if (observerTurnId) {
        db.prepare('UPDATE turns SET original_answer = ?, styled_answer = ? WHERE id = ?')
          .run(message, styledAnswer, observerTurnId)
      }

      socket.emit('respondent:answer-accepted', { turnNum })
      } catch (err) { console.error('[respondent:send-answer]', err.message) }
    })

    socket.on('round:force-end-chat', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const roundState = activeRounds.get(sessionId)
      if (!roundState || roundState.phase !== 'chatting') {
        socket.emit('error', { message: '대화 단계가 아니라 강제 종료할 것이 없습니다.' })
        return
      }
      getTimer(io, sessionId).forceEnd()
      endChatPhase(io, db, sessionId)
    })

    socket.on('round:force-end-vote', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const roundState = activeRounds.get(sessionId)
      if (!roundState || roundState.phase !== 'voting') {
        socket.emit('error', { message: '투표 단계가 아니라 마감할 것이 없습니다.' })
        return
      }
      getTimer(io, sessionId).forceEnd()
      endVotePhase(io, db, sessionId)
    })

    socket.on('vote:submit', ({ sessionId, teamId, votes }) => {
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return
      if (roundState.phase !== 'voting') return
      if (!Array.isArray(votes)) return

      roundState.voteData[teamId] = votes

      for (const vote of votes) {
        db.prepare('UPDATE turns SET verdict = ? WHERE round_id = ? AND team_id = ? AND turn_number = ?')
          .run(vote.verdict, roundState.roundId, teamId, vote.turn)
      }

      io.to(`session:${sessionId}:teacher`).emit('vote:progress', {
        teamId,
        votedCount: votes.length,
        totalTurns: roundState.totalTurns,
        submitted: true,
      })
    })

    socket.on('round:reveal', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return
      // 대화 중에 결과를 공개하면 투표를 건너뛰어 전원 0점이 된다 — 투표 단계(진행·마감)에서만 허용
      if (roundState.phase !== 'voting' && roundState.phase !== 'closed') {
        socket.emit('error', { message: '투표 단계에서만 결과를 공개할 수 있습니다. 먼저 "대화 강제 종료"를 누르세요.' })
        return
      }
      revealResults(io, db, sessionId, roundState)
    })

    socket.on('round:show-conversation', ({ sessionId, teamId, roundId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const targetRoundId = roundId || activeRounds.get(sessionId)?.roundId
      if (!targetRoundId) return
      const turns = db.prepare(
        'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
      ).all(targetRoundId, teamId)
      io.to(`session:${sessionId}:teacher`).emit('round:conversation-detail', { teamId, turns })
    })

    socket.on('teacher:get-live-turns', ({ sessionId, teamId, roundId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const turns = db.prepare(`
        SELECT turn_number, question_text, styled_answer, respondent_type
        FROM turns
        WHERE round_id = ? AND team_id = ?
        ORDER BY turn_number
      `).all(roundId, teamId)
      socket.emit('teacher:live-turns', { teamId, turns })
    })

    // 세션 완전 종료 — 라운드 진행 중이든, 대기 중이든, 결과 화면이든 언제든 호출 가능
    // tournament:end는 "토너먼트 최종 집계 후 종료"이지만, session:close는 "수업을 그냥 끝냄"
    socket.on('session:close', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      try {
        // 1~2. 타이머 종료 + 진행 중 라운드의 전달 예약 취소 + activeRounds 제거
        const roundState = cleanupRound(io, sessionId)
        if (roundState?.roundId) {
          // 진행 중이던 라운드 status도 정리 (결과 미집계 상태)
          db.prepare("UPDATE rounds SET status = 'closed' WHERE id = ? AND status != 'done'").run(roundState.roundId)
        }

        // 3. 세션 상태 업데이트 — 'closed'는 "강제 중단"이라 tournament:end의 'ended'와 구분됨
        //    'ended'는 정상 종료 (점수 집계 완료) / 'closed'는 중간 abort (점수 없음)
        db.prepare("UPDATE sessions SET status = 'closed' WHERE id = ?").run(sessionId)
        releaseSession(sessionId)

        // 4. 전체 세션(교사+학생)에 종료 이벤트 브로드캐스트
        io.to(`session:${sessionId}`).emit('session:closed', {
          sessionId,
          closedAt: Date.now(),
        })

        console.log(`[session:close] 세션 ${sessionId} 종료됨`)
      } catch (err) {
        console.error('[session:close] 오류:', err.message)
      }
    })

    socket.on('tournament:end', ({ sessionId, token }) => {
      if (!teacherOk(socket, token, sessionId)) return
      const rounds = db.prepare(
        'SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number'
      ).all(sessionId)
      const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(sessionId)

      // ── 라운드별 학급 전체 통계 ──
      const roundStats = rounds.map((round) => {
        const allRoundTurns = db.prepare('SELECT * FROM turns WHERE round_id = ?').all(round.id)
        const totalCorrect = allRoundTurns.filter((t) => t.is_correct).length
        const totalTurns = allRoundTurns.length
        return {
          roundNum: round.round_number,
          style: round.style_name,
          aiModel: round.ai_model,
          pointValue: round.point_value,
          totalCorrect,
          totalTurns,
          accuracy: totalTurns > 0 ? Math.round((totalCorrect / totalTurns) * 100) : 0,
        }
      })

      // ── 팀별 최종 성적 (팀별 정답률 포함) ──
      const finalStandings = teams.map((team) => {
        const members = JSON.parse(team.members || '[]')
        let totalCorrectAll = 0
        let totalTurnsAll = 0

        const roundResults = rounds.map((round) => {
          const turns = db.prepare('SELECT * FROM turns WHERE round_id = ? AND team_id = ?').all(round.id, team.id)
          const correct = turns.filter((turn) => turn.is_correct).length
          const earned = correct * round.point_value
          totalCorrectAll += correct
          totalTurnsAll += turns.length
          return {
            roundNum: round.round_number,
            style: round.style_name,
            aiModel: round.ai_model,
            pointValue: round.point_value,
            correct,
            total: turns.length,
            earned,
          }
        })

        return {
          teamId: team.id,
          teamName: team.name,
          teamColor: team.color,
          members,
          roundResults,
          totalScore: roundResults.reduce((sum, round) => sum + round.earned, 0),
          totalCorrect: totalCorrectAll,
          totalTurns: totalTurnsAll,
          accuracy: totalTurnsAll > 0 ? Math.round((totalCorrectAll / totalTurnsAll) * 100) : 0,
        }
      }).sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
        return a.teamName.localeCompare(b.teamName, 'ko')
      })

      const standings = buildSharedRankings(finalStandings, 'totalScore')

      // ── MVP: 정답률 1위 (동률 시 총점 높은 팀) ──
      const mvpTeam = [...finalStandings]
        .filter((t) => t.totalTurns > 0)
        .sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy
          return b.totalScore - a.totalScore
        })[0] || null

      const allTurns = db.prepare(`
        SELECT t.* FROM turns t
        JOIN rounds r ON r.id = t.round_id
        WHERE r.session_id = ?
      `).all(sessionId)

      io.to(`session:${sessionId}`).emit('tournament:final', {
        finalStandings: standings,
        allRoundResults: rounds,
        roundStats,
        mvpTeamId: mvpTeam?.teamId ?? null,
        overallStats: calcStats(allTurns),
      })

      db.prepare("UPDATE sessions SET status = 'ended' WHERE id = ?").run(sessionId)
      cleanupRound(io, sessionId)
      releaseSession(sessionId)
    })
  })
}

function finalizeTurnDelivery(io, db, sessionId, roundState, payload) {
  const { sourceTeamId, sourceTurnId, observerTurnId, turnNum, styledAnswer } = payload

  // 심판(질문자)에게 답변 전달
  io.to(`session:${sessionId}:team:${sourceTeamId}:judge`).emit('turn:answer-delivered', {
    turnNum,
    styledAnswer,
  })

  // 응답자(파트너)에게도 대화 내역 전달 — 맥락을 볼 수 있게
  const turn = db.prepare('SELECT question_text FROM turns WHERE id = ?').get(sourceTurnId)
  const partner = getPartner(roundState.pairs, sourceTeamId)
  if (partner) {
    io.to(`session:${sessionId}:team:${partner.id}`).emit('turn:respondent-view', {
      turnNum,
      question: turn?.question_text || '',
      styledAnswer,
    })
  }

  if (observerTurnId && roundState.soloObserver) {
    io.to(`session:${sessionId}:team:${roundState.soloObserver.id}:judge`).emit('turn:answer-delivered', {
      turnNum,
      styledAnswer,
    })
  }

  roundState.teamAwaitingAnswer[sourceTeamId] = false
  roundState.teamCurrentTurn[sourceTeamId] += 1
  io.to(`session:${sessionId}:teacher`).emit('turn:completed', {
    teamId: sourceTeamId,
    turnNum,
    totalTurns: roundState.totalTurns,
    phase: 'answered',
  })

  if (observerTurnId && roundState.soloObserver) {
    roundState.teamCurrentTurn[roundState.soloObserver.id] += 1
    io.to(`session:${sessionId}:teacher`).emit('turn:completed', {
      teamId: roundState.soloObserver.id,
      turnNum,
      totalTurns: roundState.totalTurns,
      phase: 'observed',
    })
  }

  roundState.mirroredTurnIds.delete(sourceTurnId)
  checkAllTurnsComplete(io, db, sessionId, roundState)
}

// 라운드 참가팀 + 교사에게만 emit (잠긴 팀 제외)
function emitToParticipants(io, sessionId, roundState, event, payload) {
  for (const teamId of roundState.participantTeamIds) {
    io.to(`session:${sessionId}:team:${teamId}`).emit(event, payload)
  }
  io.to(`session:${sessionId}:teacher`).emit(event, payload)
}

function endChatPhase(io, db, sessionId) {
  const roundState = activeRounds.get(sessionId)
  if (!roundState) return

  if (roundState.phase !== 'chatting') return // 이미 투표 단계로 넘어감 (타이머 만료와 강제 종료가 겹친 경우)
  for (const cancelDelivery of roundState.deliveryCancels) {
    try { cancelDelivery() } catch {}
  }
  roundState.deliveryCancels = []
  roundState.phase = 'voting'

  db.prepare("UPDATE rounds SET status = 'voting' WHERE id = ?").run(roundState.roundId)

  emitToParticipants(io, sessionId, roundState, 'chat:ended', {
    reason: 'time',
    totalTurns: roundState.totalTurns,
  })

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundState.roundId)
  const participantTeams = db.prepare(
    'SELECT * FROM teams WHERE session_id = ? ORDER BY id'
  ).all(sessionId).filter((team) => roundState.participantTeamIds.has(team.id))
  const conversations = {}

  for (const team of participantTeams) {
    const turns = db.prepare(
      'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(roundState.roundId, team.id)

    conversations[team.id] = turns.map((turn) => ({
      turnNum: turn.turn_number,
      question: turn.question_text,
      styledAnswer: turn.styled_answer,
    }))
  }

  emitToParticipants(io, sessionId, roundState, 'vote:phase-started', {
    roundId: roundState.roundId,
    voteTime: round.vote_time,
    conversations,
  })

  getTimer(io, sessionId).startVote(round.vote_time, () => endVotePhase(io, db, sessionId))
}

function endVotePhase(io, db, sessionId) {
  const roundState = activeRounds.get(sessionId)
  if (!roundState) return

  if (roundState.phase !== 'voting') return
  roundState.phase = 'closed'
  db.prepare("UPDATE rounds SET status = 'revealed' WHERE id = ?").run(roundState.roundId)
  emitToParticipants(io, sessionId, roundState, 'vote:closed', {})
}

function revealResults(io, db, sessionId, roundState) {
  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundState.roundId)
  // 이번 라운드에 실제 참가한 팀만 집계 (잠긴 팀 제외)
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id')
    .all(sessionId)
    .filter((team) => roundState.participantTeamIds.has(team.id))

  const teamResults = teams.map((team) => {
    const turns = db.prepare(
      'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(roundState.roundId, team.id)

    let correct = 0
    for (const turn of turns) {
      const isCorrect = Boolean(turn.verdict) && turn.verdict === turn.respondent_type
      db.prepare('UPDATE turns SET is_correct = ? WHERE id = ?').run(isCorrect ? 1 : 0, turn.id)
      if (isCorrect) correct += 1
    }

    const earned = correct * round.point_value
    db.prepare('UPDATE teams SET total_score = total_score + ? WHERE id = ?').run(earned, team.id)
    const updatedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(team.id)

    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      correct,
      total: turns.length,
      earned,
      totalScore: updatedTeam.total_score,
      isSoloJudge: roundState.soloObserver?.id === team.id,
      turns: turns.map((turn) => ({
        turnNum: turn.turn_number,
        question: turn.question_text,
        styledAnswer: turn.styled_answer,
        respondentType: turn.respondent_type,
        verdict: turn.verdict,
        isCorrect: Boolean(turn.verdict) && turn.verdict === turn.respondent_type,
      })),
    }
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.teamName.localeCompare(b.teamName, 'ko')
  })

  const standings = buildSharedRankings(teamResults, 'totalScore')

  db.prepare("UPDATE rounds SET status = 'done' WHERE id = ?").run(roundState.roundId)

  emitToParticipants(io, sessionId, roundState, 'round:results', {
    roundId: roundState.roundId,
    roundNum: roundState.roundNum,
    style: roundState.style,
    aiModel: roundState.aiModel,
    pointValue: round.point_value,
    teamResults,
    standings,
    stats: calcStats(teamResults.flatMap((team) => team.turns.map((turn) => ({
      respondentType: turn.respondentType,
      verdict: turn.verdict,
      isCorrect: turn.isCorrect,
    })))),
  })

  cleanupRound(io, sessionId)
}

function checkAllTurnsComplete(io, db, sessionId, roundState) {
  if (!stillChatting(sessionId, roundState)) return // 이미 끝난(또는 교체된) 라운드의 늦은 전달
  // 심판 팀만 턴 완료 체크 (응답 팀은 질문하지 않음)
  const judgeTeamIds = roundState.pairs.map(([judge]) => judge.id)
  const allComplete = judgeTeamIds.every((id) => (roundState.teamCurrentTurn[id] || 0) >= roundState.totalTurns)
  if (!allComplete) return
  getTimer(io, sessionId).forceEnd()
  endChatPhase(io, db, sessionId)
}

function buildRoundStartedPayload(roundState, teamId) {
  const isSoloJudge = roundState.soloObserver?.id === teamId
  const role = isSoloJudge ? 'observer' : (getRole(roundState.pairs, teamId) || 'judge')
  return {
    roundId: roundState.roundId,
    roundNum: roundState.roundNum,
    style: roundState.style,
    aiModel: roundState.aiModel,
    turns: roundState.totalTurns,
    chatTime: roundState.chatTime,
    responseDelay: roundState.responseDelay,
    voteTime: roundState.voteTime,
    briefingTime: roundState.briefingTime || 0,
    pointValue: roundState.pointValue,
    role,
    partnerTeamId: getPartner(roundState.pairs, teamId)?.id ?? null,
    isSoloJudge,
    observerTargetTeamId: isSoloJudge ? roundState.observerTargetTeamId : null,
    currentTurnIndex: roundState.teamCurrentTurn[teamId] || 0,
  }
}

/**
 * 세션 요약 — 라운드별 학급 통계, 팀 순위, 전체 통계(튜링 30% 기준 포함).
 * tournament:end가 보내는 내용과 같은 구조. 수업 완전 종료 뒤 분석 화면과 REST(/dashboard/:id/summary)에서 쓴다.
 */
export function buildSessionSummary(db, sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
  if (!session) return null
  const allRounds = db.prepare('SELECT * FROM rounds WHERE session_id = ? ORDER BY round_number').all(sessionId)
  // 성적·전체 통계는 결과 공개까지 끝난 라운드(done)만 센다. 중단된 라운드는 표에만 '중단'으로 남긴다
  const rounds = allRounds.filter((round) => round.status === 'done')
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(sessionId)

  const roundStats = allRounds.map((round) => {
    const allRoundTurns = db.prepare('SELECT * FROM turns WHERE round_id = ?').all(round.id)
    const stats = calcStats(allRoundTurns)
    return {
      roundId: round.id,
      roundNum: round.round_number,
      style: round.style_name,
      aiModel: round.ai_model,
      pointValue: round.point_value,
      status: round.status,
      totalCorrect: stats.totalCorrect,
      totalTurns: stats.totalTurns,
      accuracy: stats.accuracy,
      aiAiRate: stats.aiAiRate,
      humanHumanRate: stats.humanHumanRate,
      aiFooledRate: stats.aiFooledRate,
      turingPassed: stats.turingPassed,
    }
  })

  const finalStandings = teams.map((team) => {
    let totalCorrectAll = 0
    let totalTurnsAll = 0
    const roundResults = rounds.map((round) => {
      const turns = db.prepare('SELECT * FROM turns WHERE round_id = ? AND team_id = ?').all(round.id, team.id)
      const correct = turns.filter((turn) => turn.is_correct).length
      const earned = correct * round.point_value
      totalCorrectAll += correct
      totalTurnsAll += turns.length
      return { roundNum: round.round_number, style: round.style_name, aiModel: round.ai_model, pointValue: round.point_value, correct, total: turns.length, earned }
    })
    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      members: JSON.parse(team.members || '[]'),
      roundResults,
      totalScore: roundResults.reduce((sum, round) => sum + round.earned, 0),
      totalCorrect: totalCorrectAll,
      totalTurns: totalTurnsAll,
      accuracy: totalTurnsAll > 0 ? Math.round((totalCorrectAll / totalTurnsAll) * 100) : 0,
    }
  }).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.teamName.localeCompare(b.teamName, 'ko')
  })

  const allTurns = db.prepare(`
    SELECT t.* FROM turns t
    JOIN rounds r ON r.id = t.round_id
    WHERE r.session_id = ? AND r.status = 'done'
  `).all(sessionId)

  const mvpTeam = [...finalStandings]
    .filter((t) => t.totalTurns > 0)
    .sort((a, b) => (b.accuracy !== a.accuracy ? b.accuracy - a.accuracy : b.totalScore - a.totalScore))[0] || null

  return {
    sessionId,
    teacherCode: session.teacher_code,
    status: session.status,
    roundCount: rounds.length,
    abortedRoundCount: allRounds.length - rounds.length,
    teamCount: teams.length,
    roundStats,
    finalStandings: buildSharedRankings(finalStandings, 'totalScore'),
    mvpTeamId: mvpTeam?.teamId ?? null,
    overallStats: calcStats(allTurns),
  }
}

function calcStats(turns) {
  const totalTurns = turns.length
  if (!totalTurns) {
    return { totalCorrect: 0, totalTurns: 0, accuracy: 0, aiAiRate: 0, humanHumanRate: 0, aiVotedTurns: 0, aiFooledRate: null, turingPassed: null }
  }

  const normalizedTurns = turns.map((turn) => ({
    respondentType: turn.respondent_type || turn.respondentType,
    verdict: turn.verdict,
    isCorrect: typeof turn.is_correct === 'number' ? Boolean(turn.is_correct) : Boolean(turn.isCorrect),
  }))

  const totalCorrect = normalizedTurns.filter((turn) => turn.isCorrect).length
  const aiTurns = normalizedTurns.filter((turn) => turn.respondentType === 'ai')
  const humanTurns = normalizedTurns.filter((turn) => turn.respondentType === 'human')
  // 튜링의 기준: 심문관이 기계를 사람으로 잘못 판정한 비율 (투표한 AI 턴 기준). 30% 이상이면 "기계 통과"
  const aiVotedTurns = aiTurns.filter((turn) => turn.verdict === 'ai' || turn.verdict === 'human')
  const aiFooledRate = aiVotedTurns.length
    ? Math.round((aiVotedTurns.filter((turn) => turn.verdict === 'human').length / aiVotedTurns.length) * 100)
    : null

  return {
    totalCorrect,
    totalTurns,
    aiVotedTurns: aiVotedTurns.length,
    aiFooledRate,
    turingPassed: aiFooledRate !== null ? aiFooledRate >= 30 : null,
    accuracy: Math.round((totalCorrect / totalTurns) * 100),
    aiAiRate: aiTurns.length ? Math.round((aiTurns.filter((turn) => turn.verdict === 'ai').length / aiTurns.length) * 100) : 0,
    humanHumanRate: humanTurns.length ? Math.round((humanTurns.filter((turn) => turn.verdict === 'human').length / humanTurns.length) * 100) : 0,
  }
}
