import { createRound, getPartner, getRole, pairingsToRecords } from './matchmaking.js'
import { generateAIResponseWithTimeout, styleTransform } from './ai.js'
import { getTimer } from './timer.js'
import { buildSharedRankings } from './utils.js'
import { sessionApiKeys } from './apiKeyStore.js'

const activeRounds = new Map()

export function registerSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    socket.on('teacher:join', ({ sessionId }) => {
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
        socket.emit('round:started', buildRoundStartedPayload(roundState, teamId))
      }
    })

    socket.on('round:start', ({ sessionId, style, turns, chatTime, responseDelay, voteTime, pointValue, aiModel }) => {
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
      }

      for (const team of teams) {
        roundState.teamCurrentTurn[team.id] = 0
        roundState.teamAwaitingAnswer[team.id] = false
      }

      activeRounds.set(sessionId, roundState)

      const timer = getTimer(io, sessionId)
      timer.startChat(chatTime, () => endChatPhase(io, db, sessionId))

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
        io.to(`session:${sessionId}:team:${partner.id}:respondent`).emit('turn:question-received', {
          sourceTeamId: teamId,
          turnNum,
          question: message,
          deadline: questionSentAt + roundState.responseDelay * 1000,
        })

        const deliverHumanAnswer = async () => {
          let row = db.prepare('SELECT * FROM turns WHERE id = ?').get(sourceTurnId)
          let styledAnswer = row?.styled_answer

          if (!styledAnswer && row?.original_answer) {
            // 사람이 답변했으나 styleTransform이 아직 완료되지 않은 경우 — 여기서 직접 변환
            styledAnswer = await styleTransform(row.original_answer, roundState.style, roundState.apiKeys)
            db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, sourceTurnId)
            if (observerTurnId) {
              db.prepare('UPDATE turns SET styled_answer = ? WHERE id = ?').run(styledAnswer, observerTurnId)
            }
          } else if (!styledAnswer) {
            // 아예 답변이 없는 경우 (타임아웃)
            styledAnswer = await styleTransform('음... 잘 모르겠어', roundState.style, roundState.apiKeys)
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
        roundState.apiKeys
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
        const styledAnswer = aiAnswerText || await styleTransform('음... 잘 모르겠어', roundState.style, roundState.apiKeys)
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

      const styledAnswer = await styleTransform(message, roundState.style, roundState.apiKeys)
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

    socket.on('round:force-end-chat', ({ sessionId }) => {
      getTimer(io, sessionId).forceEnd()
      endChatPhase(io, db, sessionId)
    })

    socket.on('round:force-end-vote', ({ sessionId }) => {
      getTimer(io, sessionId).forceEnd()
      endVotePhase(io, db, sessionId)
    })

    socket.on('vote:submit', ({ sessionId, teamId, votes }) => {
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return

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

    socket.on('round:reveal', ({ sessionId }) => {
      const roundState = activeRounds.get(sessionId)
      if (!roundState) return
      revealResults(io, db, sessionId, roundState)
    })

    socket.on('round:show-conversation', ({ sessionId, teamId, roundId }) => {
      const targetRoundId = roundId || activeRounds.get(sessionId)?.roundId
      if (!targetRoundId) return
      const turns = db.prepare(
        'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
      ).all(targetRoundId, teamId)
      io.to(`session:${sessionId}:teacher`).emit('round:conversation-detail', { teamId, turns })
    })

    socket.on('teacher:get-live-turns', ({ sessionId, teamId, roundId }) => {
      const turns = db.prepare(`
        SELECT turn_number, question_text, styled_answer, respondent_type
        FROM turns
        WHERE round_id = ? AND team_id = ?
        ORDER BY turn_number
      `).all(roundId, teamId)
      socket.emit('teacher:live-turns', { teamId, turns })
    })

    socket.on('tournament:end', ({ sessionId }) => {
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
      activeRounds.delete(sessionId)
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

function endChatPhase(io, db, sessionId) {
  const roundState = activeRounds.get(sessionId)
  if (!roundState) return

  for (const cancelDelivery of roundState.deliveryCancels) {
    cancelDelivery()
  }
  roundState.deliveryCancels = []

  db.prepare("UPDATE rounds SET status = 'voting' WHERE id = ?").run(roundState.roundId)

  io.to(`session:${sessionId}`).emit('chat:ended', {
    reason: 'time',
    totalTurns: roundState.totalTurns,
  })

  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundState.roundId)
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(sessionId)
  const conversations = {}

  for (const team of teams) {
    const turns = db.prepare(
      'SELECT * FROM turns WHERE round_id = ? AND team_id = ? ORDER BY turn_number'
    ).all(roundState.roundId, team.id)

    conversations[team.id] = turns.map((turn) => ({
      turnNum: turn.turn_number,
      question: turn.question_text,
      styledAnswer: turn.styled_answer,
    }))
  }

  io.to(`session:${sessionId}`).emit('vote:phase-started', {
    roundId: roundState.roundId,
    voteTime: round.vote_time,
    conversations,
  })

  getTimer(io, sessionId).startVote(round.vote_time, () => endVotePhase(io, db, sessionId))
}

function endVotePhase(io, db, sessionId) {
  const roundState = activeRounds.get(sessionId)
  if (!roundState) return

  db.prepare("UPDATE rounds SET status = 'revealed' WHERE id = ?").run(roundState.roundId)
  io.to(`session:${sessionId}`).emit('vote:closed', {})
}

function revealResults(io, db, sessionId, roundState) {
  const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundState.roundId)
  const teams = db.prepare('SELECT * FROM teams WHERE session_id = ? ORDER BY id').all(sessionId)

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

  io.to(`session:${sessionId}`).emit('round:results', {
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

  activeRounds.delete(sessionId)
}

function checkAllTurnsComplete(io, db, sessionId, roundState) {
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
    pointValue: roundState.pointValue,
    role,
    partnerTeamId: getPartner(roundState.pairs, teamId)?.id ?? null,
    isSoloJudge,
    observerTargetTeamId: isSoloJudge ? roundState.observerTargetTeamId : null,
    currentTurnIndex: roundState.teamCurrentTurn[teamId] || 0,
  }
}

function calcStats(turns) {
  const totalTurns = turns.length
  if (!totalTurns) {
    return { totalCorrect: 0, totalTurns: 0, accuracy: 0, aiAiRate: 0, humanHumanRate: 0 }
  }

  const normalizedTurns = turns.map((turn) => ({
    respondentType: turn.respondent_type || turn.respondentType,
    verdict: turn.verdict,
    isCorrect: typeof turn.is_correct === 'number' ? Boolean(turn.is_correct) : Boolean(turn.isCorrect),
  }))

  const totalCorrect = normalizedTurns.filter((turn) => turn.isCorrect).length
  const aiTurns = normalizedTurns.filter((turn) => turn.respondentType === 'ai')
  const humanTurns = normalizedTurns.filter((turn) => turn.respondentType === 'human')

  return {
    totalCorrect,
    totalTurns,
    accuracy: Math.round((totalCorrect / totalTurns) * 100),
    aiAiRate: aiTurns.length ? Math.round((aiTurns.filter((turn) => turn.verdict === 'ai').length / aiTurns.length) * 100) : 0,
    humanHumanRate: humanTurns.length ? Math.round((humanTurns.filter((turn) => turn.verdict === 'human').length / humanTurns.length) * 100) : 0,
  }
}
