import { rooms, getRoomState, isTeacher, broadcastRoomUpdate } from './roomManager.js';
import { getWordPosition } from './gameLogic.js';
import {
  clampLearningRate,
  clampMomentum,
  createRaceBall,
  createRaceResult,
  getRandomizedStartPosition,
  inspectRaceBall,
  normalizeMapLevel,
  rankRaceResults,
  advanceRaceBall,
} from '../src/lib/raceEngine.js';

const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD;
if (!TEACHER_PASSWORD) console.warn('⚠️ TEACHER_PASSWORD 환경변수가 설정되지 않았습니다. 교사 인증이 작동하지 않습니다.');

const MAX_STUDENTS_PER_ROOM = 50;

function sanitize(str, maxLen = 50) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>&"']/g, '').trim().slice(0, maxLen);
}

// Fix 5: 좌표값 유효성 검사 헬퍼
function isValidCoord(v) {
  return typeof v === 'number' && isFinite(v) && Math.abs(v) < 1000;
}

function safeHandler(name, handler) {
  return (...args) => {
    try { handler(...args); }
    catch (err) { console.error(`[${name}] Socket handler error:`, err); }
  };
}

function serializeRoomState(room, roomCode) {
  return {
    students: Array.from(room.students.values()),
    roomCode,
    raceTeams: room.raceTeams || {},
    racePhase: room.racePhase || 'setup',
    raceBalls: room.raceBalls || {},
    mapLevel: normalizeMapLevel(room.mapLevel, 2),
    raceMode: room.raceMode || 'competition',
    results: room.raceResults || [],
    gpActive: !!room.gpActive,
    gpStage: room.gpStage || 0,
    gpStageResults: room.gpStageResults || [[], [], []],
    gpFinalResults: room.gpFinalResults || [],
    gpCountdown: room.gpCountdown || 0,
  };
}

function pruneDisconnectedRaceEntries(room) {
  if (!room.raceTeams) room.raceTeams = {};
  if (!room.raceBalls) room.raceBalls = {};
  if (!room.raceFinished) room.raceFinished = {};

  const activeStudentIds = new Set(room.students.keys());
  let changed = false;

  for (const teamId of Object.keys(room.raceTeams)) {
    const memberId = room.raceTeams[teamId]?.memberId || teamId;
    if (activeStudentIds.has(memberId)) continue;

    delete room.raceTeams[teamId];
    delete room.raceBalls[teamId];
    delete room.raceFinished[teamId];
    changed = true;
  }

  return changed;
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`✨ 연결: ${socket.id}`);
    let currentRoom = null;
    let studentInfo = null;

    // ▸ 학생 입장
    socket.on('join_class', safeHandler('join_class', (payload) => {
      const studentName = sanitize(payload.studentName, 20);
      const memberNames = sanitize(payload.memberNames || '', 100);
      const roomCode = sanitize(payload.roomCode, 10);
      const stableId = sanitize(payload.stableId || '', 50);
      if (!studentName || !roomCode) return;

      // 방 인원 제한 체크
      const existingRoom = getRoomState(roomCode);
      if (existingRoom.students.size >= MAX_STUDENTS_PER_ROOM) {
        socket.emit('room_full', {
          message: `방이 가득 찼습니다. 최대 ${MAX_STUDENTS_PER_ROOM}명까지 입장할 수 있습니다.`,
          maxCapacity: MAX_STUDENTS_PER_ROOM,
        });
        console.log(`🚫 ${studentName} → 방 [${roomCode}] 입장 거부 (정원 초과: ${existingRoom.students.size}/${MAX_STUDENTS_PER_ROOM})`);
        return;
      }

      currentRoom = roomCode;
      studentInfo = {
        id: socket.id,
        studentName,
        memberNames,
        stableId,
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
      // Fix 2: 이미 입장한 소켓이면 student_joined 브로드캐스트 생략 (재연결 복구는 유지)
      const alreadyInRoom = room.students.has(socket.id);
      room.students.set(socket.id, studentInfo);

      console.log(`🚀 팀 [${studentName}] (${memberNames}) → 방 [${roomCode}] 입장 (${room.students.size}팀)${alreadyInRoom ? ' [재입장]' : ''}`);

      if (!alreadyInRoom) {
        io.to(roomCode).emit('student_joined', {
          student: studentInfo,
          totalCount: room.students.size,
        });
        broadcastRoomUpdate(io, roomCode);
      }

      // 재접속 시 보존된 레이스 팀 데이터 복구 (stableId 우선, 없으면 studentName 폴백)
      const recoveryKey = stableId || studentName;
      if (room.disconnectedTeams?.[recoveryKey]) {
        const saved = room.disconnectedTeams[recoveryKey];
        const newId = socket.id;
        room.raceTeams = room.raceTeams || {};
        room.raceTeams[newId] = { ...saved.team, id: newId, memberId: newId };
        if (saved.ball) {
          room.raceBalls = room.raceBalls || {};
          room.raceBalls[newId] = { ...saved.ball };
        }
        if (saved.finished) {
          room.raceFinished = room.raceFinished || {};
          room.raceFinished[newId] = { ...saved.finished, teamId: newId };
        }
        delete room.disconnectedTeams[recoveryKey];
        console.log(`🔄 ${studentName} 레이스 데이터 복구 완료 (${saved.oldSocketId} → ${newId})`);

        io.to(roomCode).emit('race_teams_updated', { teams: room.raceTeams });
        if (room.racePhase === 'racing' || room.racePhase === 'preparing') {
          io.to(roomCode).emit('race_tick', { balls: room.raceBalls });
        }
      }

      // room_state는 항상 발행 — 페이지 이동/재연결 복구용
      socket.emit('room_state', serializeRoomState(room, roomCode));
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

      socket.emit('room_state', serializeRoomState(room, roomCode));
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

      // Fix 5: 좌표값 검증 (NaN/Infinity/문자열 차단)
      const pos = payload.position;
      if (!pos || !isValidCoord(pos.x) || !isValidCoord(pos.y) || !isValidCoord(pos.z)) return;
      student.position = { x: pos.x, y: pos.y, z: pos.z };

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
      // Fix 6: attentionWeights 크기 제한 (최대 20×20) — 대용량 payload 차단
      if (payload.attentionWeights !== undefined) {
        const w = payload.attentionWeights;
        if (
          Array.isArray(w) && w.length <= 20 &&
          w.every(row =>
            Array.isArray(row) && row.length <= 20 &&
            row.every(v => typeof v === 'number' && isFinite(v))
          )
        ) {
          student.attentionWeights = w;
        }
      }
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

      const teamId = socket.id;
      const existingTeam = room.raceTeams[teamId] || {};
      const learningRate = clampLearningRate(payload.learningRate, existingTeam.learningRate || 0.1);
      const momentum = clampMomentum(payload.momentum, existingTeam.momentum || 0.9);
      const mapLevel = normalizeMapLevel(payload.mapLevel, room.mapLevel || existingTeam.mapLevel || 2);
      room.raceTeams[teamId] = {
        id: teamId,
        name: sanitize(payload.teamName, 24) || existingTeam.name || studentInfo?.studentName || 'Team',
        memberNames: existingTeam.memberNames || studentInfo?.memberNames || '',
        color: payload.color || existingTeam.color || `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
        learningRate,
        momentum,
        mapLevel,
        memberId: socket.id,
        paramsConfirmed: true,
      };

      console.log(`🏎️ 팀 [${room.raceTeams[teamId].name}] 파라미터: lr=${learningRate}, m=${momentum}`);

      io.to(currentRoom).emit('race_teams_updated', {
        teams: room.raceTeams,
      });

      // 레이스 진행 중이거나 준비 중이면 해당 팀 공의 파라미터도 즉시 업데이트 (실시간 조절 반영)
      if (room.raceBalls && room.raceBalls[teamId] &&
          (room.raceBalls[teamId].status === 'racing' || room.raceBalls[teamId].status === 'preparing')) {
        room.raceBalls[teamId].lr = learningRate;
        room.raceBalls[teamId].momentum = momentum;
      }
    }));

    // ── 단일 스테이지 레이스 시작 (내부 헬퍼) ──
    function startStageRace(roomCode, mapLevel) {
      const room = rooms.get(roomCode);
      if (!room) return;

      pruneDisconnectedRaceEntries(room);
      if (!room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      const normalizedLevel = normalizeMapLevel(mapLevel, room.mapLevel || 2);
      room.mapLevel = normalizedLevel;
      room.raceFinished = {};
      room.raceResults = [];
      room.gpCountdown = 0;

      const preservePositions = room.racePhase === 'preparing' && room.raceBalls && Object.keys(room.raceBalls).length > 0;
      const nextBalls = {};
      for (const [teamId, team] of Object.entries(room.raceTeams)) {
        const previousBall = preservePositions ? room.raceBalls?.[teamId] : null;
        const position = previousBall
          ? { x: previousBall.x, z: previousBall.z }
          : getRandomizedStartPosition(normalizedLevel);
        nextBalls[teamId] = createRaceBall({
          level: normalizedLevel,
          x: position.x,
          z: position.z,
          lr: team.learningRate,
          momentum: team.momentum,
          status: 'racing',
        });
      }
      room.raceBalls = nextBalls;

      room.racePhase = 'racing';
      room.racePaused = false;
      room.raceStartTime = Date.now();

      io.to(roomCode).emit('race_started', {
        balls: room.raceBalls,
        teams: room.raceTeams,
        startTime: room.raceStartTime,
        mapLevel: normalizedLevel,
        gpStage: room.gpStage || 0,
        raceMode: room.raceMode || 'competition',
      });

      console.log(`🏁 스테이지 ${room.gpStage || '?'} 시작! 방 [${roomCode}] 맵레벨=${normalizedLevel} — ${Object.keys(room.raceTeams).length}팀`);

      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      // Fix 1: let intervalId 클로저로 선언 → r이 null이어도 clearInterval 보장
      let intervalId;
      intervalId = setInterval(() => {
        const r = rooms.get(roomCode);
        if (!r || r.racePhase !== 'racing') {
          clearInterval(intervalId);
          if (r) r.raceInterval = null;
          return;
        }
        // 일시정지 중이면 tick 건너뜀
        if (r.racePaused) return;

        let allDone = true;

        for (const [teamId, ball] of Object.entries(r.raceBalls)) {
          if (ball.status !== 'racing') continue;
          allDone = false;

          // 팀 파라미터 참조 (결과에 포함)
          const teamData = r.raceTeams[teamId];
          const elapsed = Date.now() - r.raceStartTime;
          advanceRaceBall(ball, r.mapLevel);

          const teamLR = clampLearningRate(teamData?.learningRate, ball.lr);
          const teamMom = clampMomentum(teamData?.momentum, ball.momentum);
          const outcome = inspectRaceBall(ball, r.mapLevel, elapsed);
          if (!outcome) continue;

          ball.status = outcome.status;
          r.raceFinished[teamId] = createRaceResult({
            teamId,
            teamName: teamData?.name || teamId,
            ball,
            level: r.mapLevel,
            timeMs: elapsed,
            status: outcome.status,
            lr: teamLR,
            momentum: teamMom,
            finalLoss: outcome.reason === 'invalid' ? Number.NaN : ball.loss,
            distToGlobal: outcome.distToGlobal,
          });

          if (outcome.reason === 'invalid') {
            io.to(roomCode).emit('race_alert', {
              teamId,
              teamName: teamData?.name,
              message: `🚨 공이 날아가 버렸어요! 무엇이 너무 커졌을까요? (팀: ${teamData?.name})`,
            });
          } else if (outcome.reason === 'boundary') {
            io.to(roomCode).emit('race_alert', {
              teamId,
              teamName: teamData?.name,
              message: `💨 공이 맵을 벗어났어요! 어떤 파라미터를 조절하면 좋을까요? (팀: ${teamData?.name})`,
            });
          } else if (outcome.reason === 'timeout' && outcome.status === 'local_minimum') {
            io.to(roomCode).emit('race_alert', {
              teamId,
              teamName: teamData?.name,
              message: `⏱️ 시간 초과! 공이 최솟값에 도달하지 못했어요. (팀: ${teamData?.name})`,
            });
          } else if (outcome.reason === 'stopped' && outcome.status === 'local_minimum') {
            io.to(roomCode).emit('race_alert', {
              teamId,
              teamName: teamData?.name,
              message: `🏔️ 공이 멈췄어요. 정말 최솟값에 도달했을까요? (팀: ${teamData?.name})`,
            });
          }
        }

        io.to(roomCode).emit('race_tick', { balls: r.raceBalls });

        const totalTeams = Object.keys(r.raceBalls).length;
        const finishedTeams = Object.keys(r.raceFinished).length;
        if (finishedTeams >= totalTeams || allDone) {
          clearInterval(r.raceInterval);
          r.raceInterval = null;

          const results = rankRaceResults(Object.values(r.raceFinished));
          r.raceResults = results;

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
              points: res.status === 'converged' ? Math.max(0, totalT - res.rank + 1) : 0,
              rank: res.rank,
              finalLoss: res.finalLoss,
              cumulativeLoss: res.cumulativeLoss,
              status: res.status,
              lr: res.lr,
              momentum: res.momentum,
              distToGlobal: res.distToGlobal,
              time: res.time,
            }));
            r.gpStageResults[stageIdx] = stagePoints;

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
              r.gpCountdown = countdown;
              io.to(roomCode).emit('gp_countdown', { seconds: countdown, nextStage: r.gpStage + 1 });

              // Fix 4: 카운트다운 인터벌을 room에 저장 → reset_race에서 취소 가능
              if (r.countdownInterval) { clearInterval(r.countdownInterval); r.countdownInterval = null; }
              r.countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                  r.gpCountdown = countdown;
                  io.to(roomCode).emit('gp_countdown', { seconds: countdown, nextStage: r.gpStage + 1 });
                } else {
                  const rm = rooms.get(roomCode);
                  if (rm?.countdownInterval) { clearInterval(rm.countdownInterval); rm.countdownInterval = null; }
                  if (!rm || !rm.gpActive) return;
                  rm.gpCountdown = 0;
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
                for (const res of stageRes) {
                  if (!combined[res.teamId]) {
                    combined[res.teamId] = { teamId: res.teamId, teamName: res.teamName, totalPoints: 0, stageRanks: [0, 0, 0] };
                  }
                  const pts = res.points || 0;
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
      room.raceInterval = intervalId;
    }

    // 교사: 일반 레이스 시작 (단일 맵)
    // payload.mode: 'practice' (연습) | 'competition' (본 게임, 기본값)
    // payload.level: 맵 레벨 (1~3, 기본값: 팀 설정 or 2)
    socket.on('start_race', safeHandler('start_race', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3
      if (!room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      room.gpActive = false;
      room.gpStage = 0;
      room.gpStageResults = [[], [], []];
      room.gpFinalResults = [];
      room.gpCountdown = 0;
      const mode = payload?.mode || 'competition';
      const level = normalizeMapLevel(payload?.level, Object.values(room.raceTeams)[0]?.mapLevel || room.mapLevel || 2);
      room.raceMode = mode;
      console.log(`🏁 레이스 모드: ${mode} (Level ${level}) 방 [${currentRoom}]`);
      startStageRace(currentRoom, level);
    }));

    // 교사: Grand Prix 시작 (3스테이지 순차)
    socket.on('start_gp', safeHandler('start_gp', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3
      if (!room.raceTeams || Object.keys(room.raceTeams).length === 0) return;

      room.gpActive = true;
      room.gpStage = 1;
      room.gpStageResults = [[], [], []];
      room.gpFinalResults = [];
      room.gpCountdown = 0;

      io.to(currentRoom).emit('gp_started', { totalStages: 3, currentStage: 1 });
      console.log(`🏎️🏎️🏎️ Grand Prix 시작! 방 [${currentRoom}] — ${Object.keys(room.raceTeams).length}팀`);

      startStageRace(currentRoom, 1); // 스테이지 1 = Level 1 (초급)
    }));

    // 교사: 맵 선택 브로드캐스트 — 학생이 파라미터 세팅 전 맵 확인용
    socket.on('teacher_set_map', safeHandler('teacher_set_map', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return;
      // 레이스 진행 중에는 맵 변경 불가
      if (room.racePhase === 'racing') {
        socket.emit('auth_error', { message: '레이스 중에는 맵을 변경할 수 없습니다.' });
        return;
      }
      const level = normalizeMapLevel(payload?.level, room.mapLevel || 2);
      room.mapLevel = level;
      io.to(currentRoom).emit('map_selected', { level });
      console.log(`🗺️ 교사가 맵 선택: Level ${level} 방 [${currentRoom}]`);
    }));

    // 교사: 레이스 준비 (공 랜덤 배치, preparing 단계)
    socket.on('prepare_race', safeHandler('prepare_race', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return;
      // 방에 학생이 한 명도 없으면 준비 불가
      if (!room.students || room.students.size === 0) return;

      pruneDisconnectedRaceEntries(room);

      const level = normalizeMapLevel(payload?.level, room.mapLevel || 2);
      room.mapLevel = level;
      room.racePhase = 'preparing';
      room.raceBalls = {};
      room.raceFinished = {};
      room.raceResults = [];
      room.gpCountdown = 0;
      if (!room.raceTeams) room.raceTeams = {};

      // 방에 있는 모든 학생을 raceTeams에 자동 등록 (params 미제출 학생 포함)
      for (const [socketId, student] of room.students.entries()) {
        if (!room.raceTeams[socketId]) {
          room.raceTeams[socketId] = {
            id: socketId,
            name: student.studentName || '익명',
            memberNames: student.memberNames || '',
            color: `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`,
            learningRate: 0.1,
            momentum: 0.9,
            mapLevel: level,
            memberId: socketId,
          };
        }
      }

      for (const [teamId, team] of Object.entries(room.raceTeams)) {
        const position = getRandomizedStartPosition(level);
        room.raceTeams[teamId].mapLevel = level;
        room.raceBalls[teamId] = createRaceBall({
          level,
          x: position.x,
          z: position.z,
          lr: team.learningRate || 0.1,
          momentum: team.momentum || 0.9,
          status: 'preparing',
        });
      }

      io.to(currentRoom).emit('race_prepare', {
        balls: room.raceBalls,
        teams: room.raceTeams,
        mapLevel: level,
      });
      console.log(`🎯 레이스 준비! 방 [${currentRoom}] 맵레벨=${level} — ${Object.keys(room.raceTeams).length}팀 위치 배치 완료`);
    }));

    // 레이스 정지 — 교사만 가능 (멀티플레이), 솔로는 클라이언트에서 자체 처리
    socket.on('stop_race', safeHandler('stop_race', () => {
      if (!currentRoom) return;
      const room = rooms.get(currentRoom);
      if (!room || room.racePhase !== 'racing') return;
      // 멀티플레이 레이스는 교사만 정지 가능
      if (!isTeacher(socket.id, currentRoom)) {
        socket.emit('auth_error', { message: '레이스 정지는 교사만 가능합니다.' });
        return;
      }
      room.raceFinished = room.raceFinished || {};
      for (const [teamId, ball] of Object.entries(room.raceBalls)) {
        if (ball.status === 'racing') {
          const outcome = inspectRaceBall(ball, room.mapLevel, Number.POSITIVE_INFINITY) || {
            status: 'local_minimum',
            distToGlobal: 0,
          };
          const dist = outcome.distToGlobal;
          ball.status = dist < 0.8 ? 'converged' : 'local_minimum';
          const td = room.raceTeams[teamId];
          room.raceFinished[teamId] = createRaceResult({
            teamId,
            teamName: td?.name || teamId,
            ball,
            level: room.mapLevel,
            timeMs: Date.now() - room.raceStartTime,
            status: ball.status,
            lr: td?.learningRate || ball.lr,
            momentum: td?.momentum || ball.momentum,
            distToGlobal: dist,
          });
        }
      }
      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      room.racePhase = 'finished';
      room.raceResults = rankRaceResults(Object.values(room.raceFinished));
      io.to(currentRoom).emit('race_finished', { results: room.raceResults });
    }));

    // 교사: 같은 맵 다시 도전 (retry_same_level) — 맵 유지, 공 초기화
    socket.on('retry_same_level', safeHandler('retry_same_level', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return;

      // 진행 중인 레이스/카운트다운 정리
      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      if (room.countdownInterval) { clearInterval(room.countdownInterval); room.countdownInterval = null; }

      pruneDisconnectedRaceEntries(room);

      const level = normalizeMapLevel(room.mapLevel, 2);
      room.racePhase = 'preparing';
      room.raceFinished = {};
      room.raceBalls = {};
      room.raceResults = [];
      room.gpCountdown = 0;

      // 기존 팀 유지, 공 위치 리셋
      for (const [teamId, team] of Object.entries(room.raceTeams || {})) {
        const position = getRandomizedStartPosition(level);
        room.raceTeams[teamId].mapLevel = level;
        room.raceBalls[teamId] = createRaceBall({
          level,
          x: position.x,
          z: position.z,
          lr: team.learningRate || 0.1,
          momentum: team.momentum || 0.9,
          status: 'preparing',
        });
      }

      io.to(currentRoom).emit('race_prepare', {
        balls: room.raceBalls,
        teams: room.raceTeams,
        mapLevel: level,
      });
      console.log(`🔁 같은 맵 재도전! 방 [${currentRoom}] 맵레벨=${level}`);
    }));

    // 교사: 레이스 리셋
    socket.on('reset_race', safeHandler('reset_race', () => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3
      if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
      // Fix 4: 카운트다운 인터벌도 취소
      if (room.countdownInterval) { clearInterval(room.countdownInterval); room.countdownInterval = null; }
      room.racePhase = 'setup';
      room.raceBalls = {};
      room.raceFinished = {};
      room.raceResults = [];
      room.raceMode = 'competition';
      room.gpActive = false;
      room.gpStage = 0;
      room.gpStageResults = [[], [], []];
      room.gpFinalResults = [];
      room.gpCountdown = 0;
      io.to(currentRoom).emit('race_reset', { teams: room.raceTeams });
      console.log(`🔄 레이스 리셋! 방 [${currentRoom}]`);
    }));

    // ═══════════════════════════════════════════════
    // ▸ 교사 퀴즈 브로드캐스트 시스템
    // ═══════════════════════════════════════════════

    // 교사: 퀴즈 전송
    socket.on('send_quiz', safeHandler('send_quiz', (payload) => {
      if (!currentRoom) return;
      const room = getRoomState(currentRoom);
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3

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
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3
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
      if (!isTeacher(socket.id, currentRoom)) return; // Fix 3
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
      const room = getRoomState(currentRoom);

      // PAUSE/RESUME: 레이스 인터벌 실제 중지/재개
      if (payload.command === 'PAUSE' && room.racePhase === 'racing') {
        if (room.raceInterval) {
          clearInterval(room.raceInterval);
          room.raceInterval = null;
        }
        room.racePaused = true;
        console.log(`⏸️ 레이스 일시정지! 방 [${currentRoom}]`);
        io.to(currentRoom).emit('race_paused', { paused: true });
      } else if (payload.command === 'RESUME' && room.racePaused) {
        room.racePaused = false;
        console.log(`▶️ 레이스 재개! 방 [${currentRoom}]`);
        io.to(currentRoom).emit('race_paused', { paused: false });
        // 레이스 tick 인터벌 재시작
        if (!room.raceInterval && room.racePhase === 'racing') {
          room.raceInterval = setInterval(() => {
            let allDone = true;
            for (const [teamId, ball] of Object.entries(room.raceBalls)) {
              if (ball.status !== 'racing') continue;
              allDone = false;
              advanceRaceBall(ball, room.mapLevel);
              const elapsed = Date.now() - room.raceStartTime;
              const outcome = inspectRaceBall(ball, room.mapLevel, elapsed);
              if (outcome) {
                ball.status = outcome.status;
                const td = room.raceTeams[teamId];
                room.raceFinished[teamId] = createRaceResult({
                  teamId, teamName: td?.name || teamId, ball, level: room.mapLevel,
                  timeMs: elapsed, status: outcome.status,
                  lr: td?.learningRate || ball.lr, momentum: td?.momentum || ball.momentum,
                  distToGlobal: outcome.distToGlobal,
                });
                io.to(currentRoom).emit('race_alert', {
                  teamId, teamName: td?.name || teamId,
                  status: outcome.status, loss: ball.loss,
                  message: outcome.status === 'converged'
                    ? `🏆 ${td?.name || teamId} 수렴!`
                    : `⚠️ ${td?.name || teamId} ${outcome.status}`,
                });
              }
            }
            io.to(currentRoom).emit('race_tick', { balls: room.raceBalls });
            if (allDone) {
              clearInterval(room.raceInterval);
              room.raceInterval = null;
              room.racePhase = 'finished';
              room.raceResults = rankRaceResults(Object.values(room.raceFinished));
              io.to(currentRoom).emit('race_finished', { results: room.raceResults });
            }
          }, 150);
        }
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
          const raceInProgress = room.racePhase === 'racing' || room.racePhase === 'preparing';

          // 레이스 진행 중이면 팀/공 데이터를 보존하여 재접속 시 복귀 가능하게 함
          if (raceInProgress && room.raceTeams?.[socket.id]) {
            if (!room.disconnectedTeams) room.disconnectedTeams = {};
            const recoveryKey = student.stableId || student.studentName;
            room.disconnectedTeams[recoveryKey] = {
              oldSocketId: socket.id,
              team: { ...room.raceTeams[socket.id] },
              ball: room.raceBalls?.[socket.id] ? { ...room.raceBalls[socket.id] } : null,
              finished: room.raceFinished?.[socket.id] || null,
              disconnectedAt: Date.now(),
            };
          }

          console.log(`💫 ${student.studentName} 퇴장 (방 [${currentRoom}])${raceInProgress ? ' [레이스 데이터 보존]' : ''}`);
          room.students.delete(socket.id);
          const raceStateChanged = pruneDisconnectedRaceEntries(room);

          io.to(currentRoom).emit('student_left', {
            studentId: socket.id,
            studentName: student.studentName,
            totalCount: room.students.size,
          });

          broadcastRoomUpdate(io, currentRoom);

          if (raceStateChanged) {
            io.to(currentRoom).emit('race_teams_updated', {
              teams: room.raceTeams,
            });

            if (room.racePhase === 'preparing') {
              io.to(currentRoom).emit('race_prepare', {
                balls: room.raceBalls,
                teams: room.raceTeams,
                mapLevel: normalizeMapLevel(room.mapLevel, 2),
              });
            } else if (room.racePhase === 'racing') {
              io.to(currentRoom).emit('race_tick', { balls: room.raceBalls });
            }
          }
        }

        if (room.teacherId === socket.id) {
          console.log(`🎓 교사 퇴장 (방 [${currentRoom}])`);
          room.teacherId = null;
          if (room.raceInterval) {
            clearInterval(room.raceInterval);
            room.raceInterval = null;
          }
          if (room.countdownInterval) {
            clearInterval(room.countdownInterval);
            room.countdownInterval = null;
          }
          room.gpCountdown = 0;
        }

        if (room.students.size === 0 && !room.teacherId) {
          // 방 삭제 전 남은 소켓에 알림 (클라이언트 localStorage 정리용)
          io.to(currentRoom).emit('room_deleted', { roomCode: currentRoom });
          if (room.raceInterval) { clearInterval(room.raceInterval); room.raceInterval = null; }
          if (room.countdownInterval) { clearInterval(room.countdownInterval); room.countdownInterval = null; }
          rooms.delete(currentRoom);
          console.log(`🗑️ 빈 방 삭제: [${currentRoom}]`);
        }
      }
      console.log(`🌙 연결 해제: ${socket.id}`);
    }));
  });
}
