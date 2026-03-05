import { rooms, getRoomState, isTeacher, broadcastRoomUpdate } from './roomManager.js';
import { getWordPosition, lossFunction, gradient, lossFunctionByLevel, gradientByLevel } from './gameLogic.js';

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
if (!TEACHER_PASSWORD) console.warn('⚠️ TEACHER_PASSWORD 환경변수가 설정되지 않았습니다. 교사 인증이 작동하지 않습니다.');

const MAX_STUDENTS_PER_ROOM = 50;

function sanitize(str, maxLen = 50) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, '').trim().slice(0, maxLen);
}

function safeHandler(name, handler) {
  return (...args) => {
    try { handler(...args); }
    catch (err) { console.error(`[${name}] Socket handler error:`, err); }
  };
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✨ 연결: ${socket.id}`);
    let currentRoom = null;
    let studentInfo = null;

    // ▸ 학생 입장
    socket.on('join_class', safeHandler('join_class', (payload) => {
      const studentName = sanitize(payload.studentName, 20);
      const schoolCode = sanitize(payload.schoolCode, 10);
      const roomCode = sanitize(payload.roomCode, 10);
      if (!studentName || !roomCode) return;

      // 방 인원 제한 체크
      const existingRoom = getRoomState(roomCode);
      if (existingRoom.students.size >= MAX_STUDENTS_PER_ROOM) {
        socket.emit('room_full', {
          message: `방이 가득 찼습니다. 최대 ${MAX_STUDENTS_PER_ROOM}명까지 입장할 수 있습니다.`,
          maxCapacity: MAX_STUDENTS_PER_ROOM,
        });
        console.log(`🚫 ${studentName}(${schoolCode}) → 방 [${roomCode}] 입장 거부 (정원 초과: ${existingRoom.students.size}/${MAX_STUDENTS_PER_ROOM})`);
        return;
      }

      currentRoom = roomCode;
      studentInfo = {
        id: socket.id,
        studentName,
        schoolCode,
        roomCode,
        joinedAt: Date.now(),
        word: null,
        position: { x: 0, y: 0, z: 0 },
        color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
        role: null,
        sliderValue_Q: 0,
        sliderValue_K: 0,
      };

      socket.join(roomCode);
      const room = getRoomState(roomCode);
      room.students.set(socket.id, studentInfo);

      console.log(`🚀 ${studentName}(${schoolCode}) → 방 [${roomCode}] 입장 (${room.students.size}명)`);

      io.to(roomCode).emit('student_joined', {
        student: studentInfo,
        totalCount: room.students.size,
      });

      // 레이스 상태도 포함하여 재연결 시 복구 가능하게 함
      socket.emit('room_state', {
        students: Array.from(room.students.values()),
        roomCode,
        raceTeams: room.raceTeams || {},
        racePhase: room.racePhase || 'waiting',
        raceBalls: room.raceBalls || {},
        mapLevel: room.mapLevel || 2,
      });

      broadcastRoomUpdate(io, roomCode);
    }));

    // ▸ 교사 관제탑 입장 (비밀번호 인증)
    socket.on('join_dashboard', safeHandler('join_dashboard', (payload) => {
      const { roomCode, password } = payload;

      if (!TEACHER_PASSWORD || !password || password !== TEACHER_PASSWORD) {
        socket.emit('auth_error', { message: '교사 비밀번호가 올바르지 않습니다.' });
        return;
      }

      currentRoom = roomCode;
      socket.join(roomCode);
      const room = getRoomState(roomCode);
      room.teacherId = socket.id;

      console.log(`🎓 교사 관제탑 연결 → 방 [${roomCode}]`);

      socket.emit('room_state', {
        students: Array.from(room.students.values()),
        roomCode,
        raceTeams: room.raceTeams || {},
        racePhase: room.racePhase || 'waiting',
        raceBalls: room.raceBalls || {},
        mapLevel: room.mapLevel || 2,
      });
    }));

    // ▸ 3D 은하수: 단어 등록
    socket.on('register_word', safeHandler('register_word', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      const student = room.students.get(socket.id);
      if (!student) return;

      const word = sanitize(payload.word, 50);
      if (!word) return;
      student.word = word;
      student.position = getWordPosition(word);

      io.to(currentRoom).emit('word_registered', {
        studentId: socket.id,
        studentName: student.studentName,
        word: student.word,
        position: student.position,
        color: student.color,
      });
    }));

    // ▸ 3D 은하수: 좌표 이동
    socket.on('update_word_position', safeHandler('update_word_position', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      const student = room.students.get(socket.id);
      if (!student) return;

      student.position = payload.position;

      socket.to(currentRoom).emit('word_moved', {
        studentId: socket.id,
        studentName: student.studentName,
        word: student.word,
        position: student.position,
        color: student.color,
      });
    }));

    // ▸ 어텐션 게임: 슬라이더 업데이트
    socket.on('update_attention_slider', safeHandler('update_attention_slider', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      const student = room.students.get(socket.id);
      if (!student) return;

      student.role = payload.role ?? student.role;
      student.sliderValue_Q = payload.sliderValue_Q ?? student.sliderValue_Q;
      student.sliderValue_K = payload.sliderValue_K ?? student.sliderValue_K;
      student.attentionWeights = payload.attentionWeights ?? student.attentionWeights;
      student.selectedWord = payload.selectedWord ?? student.selectedWord;
      student.sentenceName = payload.sentenceName ?? student.sentenceName;
      student.headCount = payload.headCount ?? student.headCount;

      io.to(currentRoom).emit('attention_updated', {
        studentId: socket.id,
        studentName: student.studentName,
        role: student.role,
        sliderValue_Q: student.sliderValue_Q,
        sliderValue_K: student.sliderValue_K,
        attentionWeights: student.attentionWeights,
        selectedWord: student.selectedWord,
        sentenceName: student.sentenceName,
        headCount: student.headCount,
      });
    }));

    // ═══════════════════════════════════════════════
    // ▸ 경사하강법 레이싱 시스템
    // ═══════════════════════════════════════════════

    // 팀 파라미터 등록
    socket.on('set_race_params', safeHandler('set_race_params', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!room.raceTeams) room.raceTeams = {};

      const teamId = payload.teamId || socket.id;
      room.raceTeams[teamId] = {
        id: teamId,
        name: payload.teamName || studentInfo?.studentName || 'Team',
        color: payload.color || `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
        learningRate: Math.max(0.001, Math.min(2.0, payload.learningRate || 0.1)),
        momentum: Math.max(0, Math.min(0.99, payload.momentum || 0.9)),
        mapLevel: payload.mapLevel || 2, // 레이스 맵 레벨 (1=초급, 2=중급, 3=고급)
        memberId: socket.id,
      };

      console.log(`🏎️ 팀 [${room.raceTeams[teamId].name}] 파라미터: lr=${payload.learningRate}, m=${payload.momentum}`);

      io.to(currentRoom).emit('race_teams_updated', {
        teams: room.raceTeams,
      });
    }));

    // ── 단일 스테이지 레이스 시작 (내부 헬퍼) ──
    function startStageRace(roomCode, mapLevel) {
      const room = rooms.get(roomCode);
      if (!room || !room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      const angle = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 2;
      const centerX = Math.cos(angle) * radius;
      const centerZ = Math.sin(angle) * radius;

      room.mapLevel = mapLevel;
      room.raceBalls = {};
      room.raceFinished = {};

      for (const [teamId, team] of Object.entries(room.raceTeams)) {
        room.raceBalls[teamId] = {
          x: centerX + (Math.random() - 0.5) * 1.0,
          z: centerZ + (Math.random() - 0.5) * 1.0,
          y: 0, vx: 0, vz: 0,
          trail: [], status: 'racing', loss: 0,
          lr: team.learningRate, momentum: team.momentum,
        };
        room.raceBalls[teamId].y = lossFunctionByLevel(room.raceBalls[teamId].x, room.raceBalls[teamId].z, mapLevel);
        room.raceBalls[teamId].loss = room.raceBalls[teamId].y;
      }

      room.racePhase = 'racing';
      room.raceStartTime = Date.now();

      io.to(roomCode).emit('race_started', {
        balls: room.raceBalls,
        startTime: room.raceStartTime,
        mapLevel,
        gpStage: room.gpStage || 0,
      });

      console.log(`🏁 스테이지 ${room.gpStage || '?'} 시작! 방 [${roomCode}] 맵레벨=${mapLevel} — ${Object.keys(room.raceTeams).length}팀`);

      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      room.raceInterval = setInterval(() => {
        const r = rooms.get(roomCode);
        if (!r || r.racePhase !== 'racing') {
          clearInterval(r?.raceInterval);
          return;
        }

        let allDone = true;

        for (const [teamId, ball] of Object.entries(r.raceBalls)) {
          if (ball.status !== 'racing') continue;
          allDone = false;

          const grad = gradientByLevel(ball.x, ball.z, r.mapLevel);
          ball.vx = ball.momentum * ball.vx - ball.lr * grad.gx;
          ball.vz = ball.momentum * ball.vz - ball.lr * grad.gz;
          ball.vx = Math.max(-10, Math.min(10, ball.vx));
          ball.vz = Math.max(-10, Math.min(10, ball.vz));

          ball.x += ball.vx;
          ball.z += ball.vz;
          ball.y = lossFunctionByLevel(ball.x, ball.z, r.mapLevel);
          ball.loss = ball.y;

          if (!isFinite(ball.x) || !isFinite(ball.z) || !isFinite(ball.y)) {
            ball.status = 'escaped';
            r.raceFinished[teamId] = { teamId, teamName: r.raceTeams[teamId]?.name, finalLoss: NaN, status: 'escaped', time: Date.now() - r.raceStartTime };
            io.to(roomCode).emit('race_alert', { teamId, teamName: r.raceTeams[teamId]?.name, message: '🚨 공 이탈! 수치 오류(NaN) 발생!' });
            continue;
          }

          if (isFinite(ball.x) && isFinite(ball.y) && isFinite(ball.z)) {
            ball.trail.push({ x: ball.x, y: ball.y, z: ball.z });
          }
          if (ball.trail.length > 200) ball.trail.shift();

          if (Math.abs(ball.x) > 12 || Math.abs(ball.z) > 12 || ball.y > 10) {
            ball.status = 'escaped';
            r.raceFinished[teamId] = { teamId, teamName: r.raceTeams[teamId]?.name, finalLoss: ball.loss, status: 'escaped', time: Date.now() - r.raceStartTime };
            io.to(roomCode).emit('race_alert', { teamId, teamName: r.raceTeams[teamId]?.name, message: '🚨 공 이탈! 학습률이 너무 큽니다!' });
          }

          const speed = Math.sqrt(ball.vx * ball.vx + ball.vz * ball.vz);
          if (speed < 0.001 && ball.trail.length > 30) {
            ball.status = 'converged';
            r.raceFinished[teamId] = { teamId, teamName: r.raceTeams[teamId]?.name, finalLoss: ball.loss, status: 'converged', time: Date.now() - r.raceStartTime };
          }
        }

        io.to(roomCode).emit('race_tick', { balls: r.raceBalls });

        const totalTeams = Object.keys(r.raceBalls).length;
        const finishedTeams = Object.keys(r.raceFinished).length;
        if (finishedTeams >= totalTeams || allDone) {
          clearInterval(r.raceInterval);
          r.raceInterval = null;

          const results = Object.values(r.raceFinished)
            .sort((a, b) => {
              if (a.status === 'escaped' && b.status !== 'escaped') return 1;
              if (b.status === 'escaped' && a.status !== 'escaped') return -1;
              return a.finalLoss - b.finalLoss;
            })
            .map((res, i) => ({ ...res, rank: i + 1 }));

          // GP 모드인 경우 스테이지별 처리
          if (r.gpActive && r.gpStage >= 1 && r.gpStage <= 3) {
            const stageIdx = r.gpStage - 1; // 0,1,2
            if (!r.gpStageResults) r.gpStageResults = [[], [], []];
            r.gpStageResults[stageIdx] = results;

            // 포인트 계산
            const totalT = Object.keys(r.raceTeams).length;
            const stagePoints = results.map(res => ({
              teamId: res.teamId,
              teamName: res.teamName,
              points: res.status === 'escaped' ? 0 : Math.max(0, totalT - res.rank + 1),
              rank: res.rank,
              finalLoss: res.finalLoss,
              status: res.status,
            }));

            io.to(roomCode).emit('gp_stage_complete', {
              stage: r.gpStage,
              results: stagePoints,
              allStageResults: r.gpStageResults,
            });

            console.log(`🏆 GP 스테이지 ${r.gpStage}/3 종료! 방 [${roomCode}]`);

            if (r.gpStage < 3) {
              // 다음 스테이지로 자동 전환 (5초 카운트다운)
              r.racePhase = 'stageResult';
              let countdown = 5;
              io.to(roomCode).emit('gp_countdown', { seconds: countdown, nextStage: r.gpStage + 1 });

              const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                  io.to(roomCode).emit('gp_countdown', { seconds: countdown, nextStage: r.gpStage + 1 });
                } else {
                  clearInterval(countdownInterval);
                  const rm = rooms.get(roomCode);
                  if (!rm || !rm.gpActive) return;
                  rm.gpStage++;
                  startStageRace(roomCode, rm.gpStage); // level 1,2,3 = stage 1,2,3
                }
              }, 1000);
            } else {
              // 3스테이지 모두 종료 — 종합 결과 계산
              r.racePhase = 'finished';
              const combined = {};
              for (let si = 0; si < 3; si++) {
                const stageRes = r.gpStageResults[si] || [];
                const t = Object.keys(r.raceTeams).length;
                for (const res of stageRes) {
                  if (!combined[res.teamId]) {
                    combined[res.teamId] = { teamId: res.teamId, teamName: res.teamName, totalPoints: 0, stageRanks: [0, 0, 0] };
                  }
                  const pts = res.status === 'escaped' ? 0 : Math.max(0, t - res.rank + 1);
                  combined[res.teamId].totalPoints += pts;
                  combined[res.teamId].stageRanks[si] = res.rank;
                }
              }

              const gpFinal = Object.values(combined)
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((r, i) => ({ ...r, gpRank: i + 1 }));

              r.gpFinalResults = gpFinal;

              io.to(roomCode).emit('gp_final_results', {
                finalResults: gpFinal,
                allStageResults: r.gpStageResults,
              });

              console.log(`🏆🏆🏆 Grand Prix 종료! 방 [${roomCode}]`, gpFinal);
            }
          } else {
            // 일반 레이스 모드 (GP 아님)
            r.racePhase = 'finished';
            io.to(roomCode).emit('race_finished', { results });
            console.log(`🏆 레이스 종료! 방 [${roomCode}]`, results);
          }
        }
      }, 33);
    }

    // 교사: 일반 레이스 시작 (단일 맵)
    socket.on('start_race', safeHandler('start_race', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;
      if (!room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      room.gpActive = false;
      room.gpStage = 0;
      const firstTeam = Object.values(room.raceTeams)[0];
      const mapLevel = firstTeam?.mapLevel || 2;
      startStageRace(currentRoom, mapLevel);
    }));

    // 교사: Grand Prix 시작 (3스테이지 순차)
    socket.on('start_gp', safeHandler('start_gp', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;
      if (!room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      room.gpActive = true;
      room.gpStage = 1;
      room.gpStageResults = [[], [], []];
      room.gpFinalResults = [];

      io.to(currentRoom).emit('gp_started', { totalStages: 3, currentStage: 1 });
      console.log(`🏎️🏎️🏎️ Grand Prix 시작! 방 [${currentRoom}] — ${Object.keys(room.raceTeams).length}팀`);

      startStageRace(currentRoom, 1); // 스테이지 1 = Level 1 (초급)
    }));

    // 교사: 레이스 리셋
    socket.on('reset_race', safeHandler('reset_race', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;
      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      room.racePhase = 'setup';
      room.raceBalls = {};
      room.raceFinished = {};
      room.gpActive = false;
      room.gpStage = 0;
      room.gpStageResults = [[], [], []];
      room.gpFinalResults = [];
      io.to(currentRoom).emit('race_reset');
      console.log(`🔄 레이스 리셋! 방 [${currentRoom}]`);
    }));

    // ═══════════════════════════════════════════════
    // ▸ 교사 퀴즈 브로드캐스트 시스템
    // ═══════════════════════════════════════════════

    // 교사: 퀴즈 전송
    socket.on('send_quiz', safeHandler('send_quiz', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;

      const quiz = {
        id: `quiz_${Date.now()}`,
        question: payload.question,
        type: payload.type || 'ox',
        options: payload.options || [],
        correctAnswer: payload.correctAnswer,
        timeLimit: payload.timeLimit || 15,
        createdAt: Date.now(),
      };

      room.activeQuiz = quiz;
      room.quizAnswers = {};

      io.to(currentRoom).emit('quiz_broadcast', quiz);
      console.log(`📝 퀴즈 전송! 방 [${currentRoom}] — "${quiz.question}"`);
    }));

    // 학생: 퀴즈 답변 제출
    socket.on('submit_quiz_answer', safeHandler('submit_quiz_answer', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!room.activeQuiz) return;
      const student = room.students.get(socket.id);
      if (!student) return;

      const answer = {
        studentId: socket.id,
        studentName: student.studentName,
        answer: payload.answer,
        timestamp: Date.now(),
        responseTime: Date.now() - room.activeQuiz.createdAt,
      };

      room.quizAnswers[socket.id] = answer;

      if (room.teacherId) {
        io.to(room.teacherId).emit('quiz_answer_received', {
          ...answer,
          totalAnswered: Object.keys(room.quizAnswers).length,
          totalStudents: room.students.size,
        });
      }

      console.log(`✅ ${student.studentName} 퀴즈 답변: ${payload.answer}`);
    }));

    // 교사: 퀴즈 결과 공개
    socket.on('reveal_quiz_results', safeHandler('reveal_quiz_results', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;
      if (!room.activeQuiz) return;

      const answers = Object.values(room.quizAnswers);
      const correct = room.activeQuiz.correctAnswer;

      const tally = {};
      answers.forEach(a => {
        tally[a.answer] = (tally[a.answer] || 0) + 1;
      });

      const correctCount = answers.filter(a => a.answer === correct).length;

      const fastestCorrect = answers
        .filter(a => a.answer === correct)
        .sort((a, b) => a.responseTime - b.responseTime)[0];

      const results = {
        quizId: room.activeQuiz.id,
        question: room.activeQuiz.question,
        correctAnswer: correct,
        tally,
        totalAnswered: answers.length,
        totalStudents: room.students.size,
        correctCount,
        correctRate: answers.length > 0 ? (correctCount / answers.length * 100).toFixed(1) : '0',
        fastest: fastestCorrect ? {
          studentName: fastestCorrect.studentName,
          responseTime: fastestCorrect.responseTime,
        } : null,
      };

      io.to(currentRoom).emit('quiz_results', results);
      room.activeQuiz = null;
      room.quizAnswers = {};

      console.log(`📊 퀴즈 결과 공개! 정답률 ${results.correctRate}%`);
    }));

    // 교사: 퀴즈 취소
    socket.on('cancel_quiz', safeHandler('cancel_quiz', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (room.teacherId && !isTeacher(socket.id, currentRoom)) return;
      room.activeQuiz = null;
      room.quizAnswers = {};
      io.to(currentRoom).emit('quiz_cancelled');
      console.log(`❌ 퀴즈 취소! 방 [${currentRoom}]`);
    }));

    // ▸ 교사 명령
    socket.on('teacher_command', safeHandler('teacher_command', (payload) => {
      if (!currentRoom) return;
      if (!isTeacher(socket.id, currentRoom)) {
        socket.emit('auth_error', { message: '교사 권한이 필요합니다.' });
        return;
      }
      console.log(`🎓 교사 명령: ${payload.command}`);
      io.to(currentRoom).emit('teacher_command', payload);
    }));

    // ▸ 연결 해제
    socket.on('disconnect', safeHandler('disconnect', () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (!room) return;

        const student = room.students.get(socket.id);

        if (student) {
          console.log(`💫 ${student.studentName} 퇴장 (방 [${currentRoom}])`);
          room.students.delete(socket.id);

          io.to(currentRoom).emit('student_left', {
            studentId: socket.id,
            studentName: student.studentName,
            totalCount: room.students.size,
          });

          broadcastRoomUpdate(io, currentRoom);
        }

        if (room.teacherId === socket.id) {
          console.log(`🎓 교사 퇴장 (방 [${currentRoom}])`);
          room.teacherId = null;
          if (room.raceInterval) {
            clearInterval(room.raceInterval);
            room.raceInterval = null;
          }
        }

        if (room.students.size === 0 && !room.teacherId) {
          // 방 삭제 전 남은 소켓에 알림 (클라이언트 localStorage 정리용)
          io.to(currentRoom).emit('room_deleted', { roomCode: currentRoom });
          if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
          rooms.delete(currentRoom);
          console.log(`🗑️ 빈 방 삭제: [${currentRoom}]`);
        }
      }
      console.log(`🌙 연결 해제: ${socket.id}`);
    }));
  });
}
