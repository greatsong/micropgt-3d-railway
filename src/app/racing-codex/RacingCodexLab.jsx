'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Breadcrumb from '@/components/layout/Breadcrumb';
import WebGLErrorBoundary from '@/components/layout/WebGLErrorBoundary';
import { connectSocket, disconnectSocket, getSocket, setupReconnectHandler } from '@/lib/socket';
import {
  advanceRaceBall,
  clampLearningRate,
  clampMomentum,
  createRaceBall,
  createRaceResult,
  getRandomizedStartPosition,
  inspectRaceBall,
  normalizeMapLevel,
  rankRaceResults,
} from '@/lib/raceEngine';
import { MAP_LEVELS } from '@/lib/lossFunction';
import { TEAM_COLORS, useRaceStore } from '@/stores/useRaceStore';
import { getOrCreateStableId, useClassStore } from '@/stores/useClassStore';
import { RACING_CODEX_ARC, RACING_PRESETS, getLevelGuide } from './courseData';
import styles from './page.module.css';

const GradientRaceScene = dynamic(
  () => import('@/components/3d/GradientRaceScene'),
  {
    ssr: false,
    loading: () => (
      <div className={styles.sceneLoading}>
        <div className={styles.sceneSpinner}>🏔️</div>
        <p>3D 레이싱 코스를 불러오는 중입니다.</p>
      </div>
    ),
  }
);

const SOLO_PLAYER_ID = 'solo-me';
const SOLO_BOT_ID = 'solo-bot';
const FIELD_LABELS = {
  teamName: '팀 이름',
  memberNames: '팀원',
  roomCode: '비밀 입장 코드',
};

const GP_STAGES = [
  { stage: 1, title: 'Stage 1', label: 'Learning Rate', emoji: '⛳' },
  { stage: 2, title: 'Stage 2', label: 'Overshooting', emoji: '🏔️' },
  { stage: 3, title: 'Stage 3', label: 'Momentum', emoji: '🌋' },
];

const STATUS_META = {
  waiting: { label: '대기', tone: 'neutral' },
  armed: { label: '전략 확정', tone: 'ready' },
  preparing: { label: '출발 위치 확인', tone: 'info' },
  racing: { label: '레이싱', tone: 'info' },
  converged: { label: '수렴 성공', tone: 'success' },
  local_minimum: { label: '로컬 미니마', tone: 'warning' },
  escaped: { label: '맵 이탈', tone: 'danger' },
};

const PHASE_META = {
  setup: { label: '설정 대기', copy: '학생이 전략을 정하고, 교사가 맵과 시작 시점을 잡는 단계입니다.' },
  preparing: { label: '출발 위치 확인', copy: '3D 화면에서 시작 위치를 확인하고 마지막 전략을 잡는 단계입니다.' },
  racing: { label: '실시간 레이싱', copy: '슬라이더 변화가 다음 tick부터 바로 경로에 반영됩니다.' },
  stageResult: { label: '스테이지 결과', copy: '방금 스테이지의 전략을 읽고 다음 라운드를 준비하는 단계입니다.' },
  finished: { label: '레이스 종료', copy: '수렴 여부와 시간, 손실을 함께 보며 전략을 회고합니다.' },
};

const MODE_META = {
  solo: { label: '셀프 연습', copy: '서버 없이도 혼자서 3D 레이싱을 반복하며 전략을 다듬을 수 있습니다.' },
  practice: { label: '연습 게임', copy: '순위보다 실험과 관찰에 집중하는 라운드입니다.' },
  competition: { label: '본 게임', copy: '연습에서 찾은 전략을 실제 경쟁에 적용하는 라운드입니다.' },
  gp: { label: 'Grand Prix', copy: '세 스테이지 전략을 종합해 최종 챔피언을 가리는 모드입니다.' },
};

const PREPARED_PHASES = new Set(['preparing', 'racing']);
const CUSTOM_PRESET_ID = 'custom';
const PRESET_EPSILON = 0.0001;

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return '-';
  return Number(value).toFixed(digits);
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

function matchesPreset(learningRate, momentum, preset) {
  return (
    Math.abs(learningRate - preset.learningRate) < PRESET_EPSILON
    && Math.abs(momentum - preset.momentum) < PRESET_EPSILON
  );
}

function getPresetIdForValues(learningRate, momentum) {
  const matchedPreset = RACING_PRESETS.find((preset) => matchesPreset(learningRate, momentum, preset));
  return matchedPreset?.id || CUSTOM_PRESET_ID;
}

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.waiting;
}

function buildFieldErrors(values, requiredFields) {
  const errors = {};

  requiredFields.forEach((field) => {
    if (!values[field]?.trim()) {
      errors[field] = `${FIELD_LABELS[field]}을(를) 입력해주세요.`;
    }
  });

  return errors;
}

function buildLiveTeamSnapshots({ teams, balls, results }) {
  const resultById = new Map(results.map((result) => [result.teamId, result]));

  return Object.values(teams)
    .map((team) => {
      const ball = balls[team.id];
      const result = resultById.get(team.id);
      const phaseStatus = result?.status
        || ball?.status
        || (team.paramsConfirmed ? 'armed' : 'waiting');

      return {
        id: team.id,
        teamName: team.name || '익명 팀',
        memberNames: team.memberNames || '',
        color: team.color || '#67e8f9',
        learningRate: team.learningRate,
        momentum: team.momentum,
        paramsConfirmed: Boolean(team.paramsConfirmed),
        currentLoss: ball?.loss,
        currentPosition: ball ? { x: ball.x, z: ball.z } : null,
        rank: result?.rank || null,
        resultTime: result?.time ?? null,
        status: phaseStatus,
      };
    })
    .sort((left, right) => {
      const leftRank = left.rank || Number.POSITIVE_INFINITY;
      const rightRank = right.rank || Number.POSITIVE_INFINITY;
      if (leftRank !== rightRank) return leftRank - rightRank;

      const toneWeight = {
        converged: 0,
        racing: 1,
        armed: 2,
        preparing: 3,
        waiting: 4,
        local_minimum: 5,
        escaped: 6,
      };

      const leftWeight = toneWeight[left.status] ?? 99;
      const rightWeight = toneWeight[right.status] ?? 99;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;

      const leftLoss = Number.isFinite(left.currentLoss) ? left.currentLoss : Number.POSITIVE_INFINITY;
      const rightLoss = Number.isFinite(right.currentLoss) ? right.currentLoss : Number.POSITIVE_INFINITY;
      return leftLoss - rightLoss;
    });
}

function createLocalAlert(teamName, outcome) {
  if (outcome.reason === 'invalid') {
    return `🚨 ${teamName}의 공이 수치적으로 폭주했습니다. 학습률이 너무 크지 않은지 보세요.`;
  }
  if (outcome.reason === 'boundary') {
    return `💨 ${teamName}의 공이 맵을 벗어났습니다. 오버슈팅이나 과한 관성을 의심해볼 수 있습니다.`;
  }
  if (outcome.status === 'local_minimum') {
    return `🏔️ ${teamName}이 로컬 미니마에서 멈췄습니다. 모멘텀을 더 줄지, 더 높일지 판단해보세요.`;
  }
  return `🏁 ${teamName}이 글로벌 최솟값에 수렴했습니다.`;
}

function InitialJoinState({
  fieldErrors,
  joinBusy,
  joinError,
  joinForm,
  onChange,
  onJoinMultiplayer,
  onStartSolo,
}) {
  return (
    <section className={styles.identityPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.eyebrow}>Entry Point</span>
        <h2>멀티플레이 입장과 셀프 연습을 같은 출발 카드에서 시작합니다.</h2>
        <p>
          비밀 입장 코드를 넣으면 실시간 레이스에 붙고, 코드 없이도 바로 혼자 3D 셀프 연습을 시작할 수 있습니다.
        </p>
      </div>

      <div className={styles.identityGrid}>
        {Object.keys(FIELD_LABELS).map((field) => (
          <label key={field} className={styles.field}>
            <span>{FIELD_LABELS[field]}</span>
            <input
              value={joinForm[field]}
              onChange={(event) => onChange(field, event.target.value)}
              placeholder={
                field === 'teamName'
                  ? '예: Alpha Rockets'
                  : field === 'memberNames'
                    ? '예: 20101 홍길동, 20102 김철수'
                    : '선생님이 알려준 코드'
              }
              className={fieldErrors[field] ? styles.fieldError : ''}
            />
            {fieldErrors[field] ? <small>{fieldErrors[field]}</small> : null}
          </label>
        ))}
      </div>

      <div className={styles.identityActions}>
        <button type="button" className={styles.primaryButton} onClick={onJoinMultiplayer} disabled={joinBusy}>
          {joinBusy ? '실시간 룸 접속 중...' : '멀티플레이 입장'}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onStartSolo}>
          roomCode 없이 셀프 연습
        </button>
        {joinError ? <p className={styles.errorText}>{joinError}</p> : null}
      </div>
    </section>
  );
}

function InlineStatusCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`${styles.inlineStatusCard} ${styles[`tone${tone}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

function TeamStatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span className={`${styles.statusBadge} ${styles[`tone${meta.tone}`]}`}>
      {meta.label}
    </span>
  );
}

function ResultsTable({ title, rows }) {
  return (
    <div className={styles.resultsBlock}>
      <div className={styles.resultsHeader}>
        <h3>{title}</h3>
        <p>순위뿐 아니라 `time`, `loss`, `lr`, `momentum`을 함께 읽어 전략을 설명해보세요.</p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>순위</th>
              <th>팀</th>
              <th>상태</th>
              <th>시간</th>
              <th>LR</th>
              <th>Momentum</th>
              <th>Loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${title}-${row.teamId}`}>
                <td>{row.rank || '-'}</td>
                <td>{row.teamName}</td>
                <td>{getStatusMeta(row.status).label}</td>
                <td>{formatTime(row.time)}</td>
                <td>{formatNumber(row.lr, 2)}</td>
                <td>{formatNumber(row.momentum, 2)}</td>
                <td>{formatNumber(row.finalLoss, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GpFinalTable({ rows }) {
  return (
    <div className={styles.resultsBlock}>
      <div className={styles.resultsHeader}>
        <h3>Grand Prix 종합 순위</h3>
        <p>한 번의 정답이 아니라 스테이지별 전략 조합이 어떤 차이를 냈는지 보세요.</p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>종합</th>
              <th>팀</th>
              <th>포인트</th>
              <th>Stage 1</th>
              <th>Stage 2</th>
              <th>Stage 3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`gp-${row.teamId}`}>
                <td>{row.gpRank}</td>
                <td>{row.teamName}</td>
                <td>{row.totalPoints}</td>
                <td>{row.stageRanks?.[0] || '-'}</td>
                <td>{row.stageRanks?.[1] || '-'}</td>
                <td>{row.stageRanks?.[2] || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RacingCodexLab() {
  const studentName = useClassStore((state) => state.studentName);
  const memberNames = useClassStore((state) => state.memberNames);
  const roomCode = useClassStore((state) => state.roomCode);
  const isConnected = useClassStore((state) => state.isConnected);
  const setStudentInfo = useClassStore((state) => state.setStudentInfo);
  const setConnected = useClassStore((state) => state.setConnected);
  const addNotification = useClassStore((state) => state.addNotification);

  const racePhase = useRaceStore((state) => state.racePhase);
  const setRacePhase = useRaceStore((state) => state.setRacePhase);
  const teams = useRaceStore((state) => state.teams);
  const setTeams = useRaceStore((state) => state.setTeams);
  const balls = useRaceStore((state) => state.balls);
  const updateBalls = useRaceStore((state) => state.updateBalls);
  const myTeamId = useRaceStore((state) => state.myTeamId);
  const setMyTeamId = useRaceStore((state) => state.setMyTeamId);
  const myLearningRate = useRaceStore((state) => state.myLearningRate);
  const setMyLearningRate = useRaceStore((state) => state.setMyLearningRate);
  const myMomentum = useRaceStore((state) => state.myMomentum);
  const setMyMomentum = useRaceStore((state) => state.setMyMomentum);
  const results = useRaceStore((state) => state.results);
  const setResults = useRaceStore((state) => state.setResults);
  const mapLevel = useRaceStore((state) => state.mapLevel);
  const setMapLevel = useRaceStore((state) => state.setMapLevel);
  const gpActive = useRaceStore((state) => state.gpActive);
  const setGpActive = useRaceStore((state) => state.setGpActive);
  const gpStage = useRaceStore((state) => state.gpStage);
  const setGpStage = useRaceStore((state) => state.setGpStage);
  const stageResults = useRaceStore((state) => state.stageResults);
  const addStageResult = useRaceStore((state) => state.addStageResult);
  const setStageResults = useRaceStore((state) => state.setStageResults);
  const gpFinalResults = useRaceStore((state) => state.gpFinalResults);
  const setGpFinalResults = useRaceStore((state) => state.setGpFinalResults);
  const gpCountdown = useRaceStore((state) => state.gpCountdown);
  const setGpCountdown = useRaceStore((state) => state.setGpCountdown);
  const racePaused = useRaceStore((state) => state.racePaused);
  const setRacePaused = useRaceStore((state) => state.setRacePaused);

  const [sessionMode, setSessionMode] = useState(() => (roomCode ? 'multiplayer' : 'solo'));
  const [raceMode, setRaceMode] = useState(() => (roomCode ? 'competition' : 'solo'));
  const [alerts, setAlerts] = useState([]);
  const [students, setStudents] = useState([]);
  const [joinForm, setJoinForm] = useState({
    teamName: studentName || '',
    memberNames: memberNames || '',
    roomCode: roomCode || '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showIdentityForm, setShowIdentityForm] = useState(() => !studentName);
  const [selectedPresetId, setSelectedPresetId] = useState(() => getPresetIdForValues(myLearningRate, myMomentum));
  const [isParamsConfirmed, setIsParamsConfirmed] = useState(false);

  const alertSequenceRef = useRef(0);
  const paramThrottleRef = useRef(null);
  const soloIntervalRef = useRef(null);

  const isSoloMode = sessionMode === 'solo';
  const normalizedMapLevel = normalizeMapLevel(mapLevel, 2);
  const currentMap = useMemo(
    () => MAP_LEVELS.find((entry) => entry.level === normalizedMapLevel) || MAP_LEVELS[1],
    [normalizedMapLevel]
  );
  const levelGuide = useMemo(() => getLevelGuide(normalizedMapLevel), [normalizedMapLevel]);
  const recommendedPresets = useMemo(
    () => RACING_PRESETS.filter((preset) => preset.fitLevels.includes(normalizedMapLevel)),
    [normalizedMapLevel]
  );
  const soloBenchmarkPreset = useMemo(
    () => recommendedPresets[0] || RACING_PRESETS[1] || RACING_PRESETS[0],
    [recommendedPresets]
  );

  const liveTeams = useMemo(
    () => buildLiveTeamSnapshots({ teams, balls, results }),
    [balls, results, teams]
  );
  const myBall = myTeamId ? balls[myTeamId] : null;
  const phaseMeta = PHASE_META[racePhase] || PHASE_META.setup;
  const modeMeta = isSoloMode
    ? MODE_META.solo
    : gpActive
      ? MODE_META.gp
      : MODE_META[raceMode] || MODE_META.competition;
  const teamCount = Object.keys(teams).length;
  const latestStageResults = gpActive && gpStage > 0 ? stageResults[gpStage - 1] || [] : [];
  const primaryResults = racePhase === 'stageResult' ? latestStageResults : results;
  const coachSummary = racePaused
    ? '교사가 레이스를 잠시 멈췄습니다. 현재 위치와 팀들의 경로를 다시 읽어보세요.'
    : isSoloMode
      ? '혼자 연습일수록 출발 위치, 손실 변화, AI 기준선과의 차이를 차분히 읽는 것이 중요합니다.'
      : phaseMeta.copy;

  const clearSoloInterval = useCallback(() => {
    if (soloIntervalRef.current) {
      window.clearInterval(soloIntervalRef.current);
      soloIntervalRef.current = null;
    }
  }, []);

  const resetRaceViewport = useCallback(() => {
    clearSoloInterval();
    setAlerts([]);
    setStudents([]);
    setTeams({});
    updateBalls({});
    setResults([]);
    setRacePhase('setup');
    setMyTeamId(null);
    setGpActive(false);
    setGpStage(0);
    setStageResults([[], [], []]);
    setGpFinalResults([]);
    setGpCountdown(0);
    setRacePaused(false);
    setIsParamsConfirmed(false);
    setRaceMode('competition');
  }, [
    clearSoloInterval,
    setGpActive,
    setGpCountdown,
    setGpFinalResults,
    setGpStage,
    setMyTeamId,
    setRacePaused,
    setRacePhase,
    setResults,
    setStageResults,
    setTeams,
    updateBalls,
  ]);

  useEffect(() => {
    setJoinForm({
      teamName: studentName || '',
      memberNames: memberNames || '',
      roomCode: roomCode || '',
    });
  }, [memberNames, roomCode, studentName]);

  useEffect(() => {
    setSelectedPresetId(getPresetIdForValues(myLearningRate, myMomentum));
  }, [myLearningRate, myMomentum]);

  useEffect(() => () => {
    clearSoloInterval();
  }, [clearSoloInterval]);

  const pushAlert = useCallback((message, extra = {}) => {
    alertSequenceRef.current += 1;
    setAlerts((previous) => [{ id: alertSequenceRef.current, message, ...extra }, ...previous].slice(0, 5));
    addNotification(message);
  }, [addNotification]);

  const emitJoin = useCallback((socket) => {
    if (!studentName || !roomCode) return;

    socket.emit('join_class', {
      studentName,
      memberNames: memberNames || '',
      roomCode,
      stableId: getOrCreateStableId(),
    });
  }, [memberNames, roomCode, studentName]);

  const prepareSoloPractice = useCallback((options = {}) => {
    const nextLevel = normalizeMapLevel(options.level ?? normalizedMapLevel, 2);
    const nextTeamName = options.teamName?.trim() || studentName || joinForm.teamName.trim() || 'Solo Driver';
    const nextMemberNames = options.memberNames?.trim() || memberNames || joinForm.memberNames.trim() || '';
    const nextLearningRate = clampLearningRate(options.learningRate ?? myLearningRate, 0.1);
    const nextMomentum = clampMomentum(options.momentum ?? myMomentum, 0.9);
    const myStart = getRandomizedStartPosition(nextLevel);
    const botStart = getRandomizedStartPosition(nextLevel);

    clearSoloInterval();
    disconnectSocket();
    setConnected(false);
    setSessionMode('solo');
    setShowIdentityForm(false);
    setJoinBusy(false);
    setJoinError('');
    setStudents([]);
    setMapLevel(nextLevel);
    setRaceMode('solo');
    setGpActive(false);
    setGpStage(0);
    setStageResults([[], [], []]);
    setGpFinalResults([]);
    setGpCountdown(0);
    setRacePaused(false);
    setResults([]);
    setRacePhase('preparing');
    setMyTeamId(SOLO_PLAYER_ID);
    setIsParamsConfirmed(true);
    setAlerts([]);

    setTeams({
      [SOLO_PLAYER_ID]: {
        id: SOLO_PLAYER_ID,
        name: nextTeamName,
        memberNames: nextMemberNames,
        color: TEAM_COLORS[0],
        learningRate: nextLearningRate,
        momentum: nextMomentum,
        paramsConfirmed: true,
      },
      [SOLO_BOT_ID]: {
        id: SOLO_BOT_ID,
        name: `Codex Bot (${soloBenchmarkPreset.label})`,
        memberNames: 'AI Benchmark',
        color: TEAM_COLORS[1],
        learningRate: soloBenchmarkPreset.learningRate,
        momentum: soloBenchmarkPreset.momentum,
        paramsConfirmed: true,
      },
    });

    updateBalls({
      [SOLO_PLAYER_ID]: createRaceBall({
        level: nextLevel,
        x: myStart.x,
        z: myStart.z,
        lr: nextLearningRate,
        momentum: nextMomentum,
        status: 'preparing',
      }),
      [SOLO_BOT_ID]: createRaceBall({
        level: nextLevel,
        x: botStart.x,
        z: botStart.z,
        lr: soloBenchmarkPreset.learningRate,
        momentum: soloBenchmarkPreset.momentum,
        status: 'preparing',
      }),
    });
  }, [
    clearSoloInterval,
    joinForm.memberNames,
    joinForm.teamName,
    memberNames,
    myLearningRate,
    myMomentum,
    normalizedMapLevel,
    setConnected,
    setGpActive,
    setGpCountdown,
    setGpFinalResults,
    setGpStage,
    setMapLevel,
    setMyTeamId,
    setRacePaused,
    setRacePhase,
    setResults,
    setStageResults,
    setTeams,
    soloBenchmarkPreset.label,
    soloBenchmarkPreset.learningRate,
    soloBenchmarkPreset.momentum,
    studentName,
    updateBalls,
  ]);

  const startSoloPractice = useCallback((options = {}) => {
    const nextLevel = normalizeMapLevel(options.level ?? normalizedMapLevel, 2);
    const playerBall = balls[SOLO_PLAYER_ID];
    const botBall = balls[SOLO_BOT_ID];
    const playerTeam = teams[SOLO_PLAYER_ID];
    const botTeam = teams[SOLO_BOT_ID];

    if (!playerBall || !botBall || !playerTeam || !botTeam || racePhase === 'setup') {
      prepareSoloPractice(options);
      return;
    }

    clearSoloInterval();
    setResults([]);
    setAlerts([]);
    setRacePhase('racing');
    setRaceMode('solo');
    setRacePaused(false);

    const localBalls = {
      [SOLO_PLAYER_ID]: createRaceBall({
        level: nextLevel,
        x: playerBall.x,
        z: playerBall.z,
        lr: clampLearningRate(myLearningRate, 0.1),
        momentum: clampMomentum(myMomentum, 0.9),
        status: 'racing',
      }),
      [SOLO_BOT_ID]: createRaceBall({
        level: nextLevel,
        x: botBall.x,
        z: botBall.z,
        lr: botTeam.learningRate,
        momentum: botTeam.momentum,
        status: 'racing',
      }),
    };

    updateBalls(localBalls);

    const startTime = Date.now();
    soloIntervalRef.current = window.setInterval(() => {
      let allDone = true;
      const finishedResults = {};

      for (const [teamId, ball] of Object.entries(localBalls)) {
        if (ball.status !== 'racing') {
          if (ball.finishResult) finishedResults[teamId] = ball.finishResult;
          continue;
        }

        allDone = false;
        advanceRaceBall(ball, nextLevel);
        const elapsed = Date.now() - startTime;
        const outcome = inspectRaceBall(ball, nextLevel, elapsed);

        if (!outcome) continue;

        ball.status = outcome.status;
        const currentTeam = teamId === SOLO_PLAYER_ID ? playerTeam : botTeam;
        const finishResult = createRaceResult({
          teamId,
          teamName: currentTeam.name,
          ball,
          level: nextLevel,
          timeMs: elapsed,
          status: outcome.status,
          lr: teamId === SOLO_PLAYER_ID ? clampLearningRate(myLearningRate, 0.1) : currentTeam.learningRate,
          momentum: teamId === SOLO_PLAYER_ID ? clampMomentum(myMomentum, 0.9) : currentTeam.momentum,
          distToGlobal: outcome.distToGlobal,
        });

        ball.finishResult = finishResult;
        finishedResults[teamId] = finishResult;
        pushAlert(createLocalAlert(currentTeam.name, outcome), { teamId });
      }

      updateBalls({ ...localBalls });

      const totalTeams = Object.keys(localBalls).length;
      const doneTeams = Object.values(localBalls).filter((ball) => ball.status !== 'racing').length;

      if (doneTeams >= totalTeams || allDone) {
        clearSoloInterval();
        const rankedResults = rankRaceResults(
          Object.values(localBalls)
            .map((ball) => ball.finishResult)
            .filter(Boolean)
        );
        setResults(rankedResults);
        setRacePhase('finished');
      }
    }, 33);
  }, [
    balls,
    clearSoloInterval,
    myLearningRate,
    myMomentum,
    normalizedMapLevel,
    prepareSoloPractice,
    pushAlert,
    racePhase,
    setRacePaused,
    setRacePhase,
    setResults,
    teams,
    updateBalls,
  ]);

  useEffect(() => {
    if (!isSoloMode || !teams[SOLO_PLAYER_ID]) return;

    const nextLearningRate = clampLearningRate(myLearningRate, 0.1);
    const nextMomentum = clampMomentum(myMomentum, 0.9);
    const soloTeam = teams[SOLO_PLAYER_ID];
    const soloBall = balls[SOLO_PLAYER_ID];

    if (soloTeam.learningRate !== nextLearningRate || soloTeam.momentum !== nextMomentum) {
      setTeams({
        ...teams,
        [SOLO_PLAYER_ID]: {
          ...soloTeam,
          learningRate: nextLearningRate,
          momentum: nextMomentum,
        },
      });
    }

    if (
      soloBall
      && PREPARED_PHASES.has(racePhase)
      && (soloBall.lr !== nextLearningRate || soloBall.momentum !== nextMomentum)
    ) {
      updateBalls({
        ...balls,
        [SOLO_PLAYER_ID]: {
          ...soloBall,
          lr: nextLearningRate,
          momentum: nextMomentum,
        },
      });
    }
  }, [
    balls,
    isSoloMode,
    myLearningRate,
    myMomentum,
    racePhase,
    setTeams,
    teams,
    updateBalls,
  ]);

  useEffect(() => {
    if (isSoloMode || !studentName || !roomCode) return undefined;

    const socket = getSocket();
    setupReconnectHandler(useClassStore.getState);
    if (!socket.connected) {
      setJoinBusy(true);
      connectSocket();
    }

    const handleConnect = () => {
      setConnected(true);
      emitJoin(socket);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleConnectError = () => {
      setConnected(false);
      setJoinBusy(false);
      setJoinError('서버 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
    };

    const handleRoomFull = (data) => {
      setJoinBusy(false);
      setJoinError(data?.message || '방 정원이 가득 찼습니다.');
    };

    const handleAuthError = (data) => {
      if (!data?.message) return;
      setJoinBusy(false);
      setJoinError(data.message);
    };

    const handleRoomState = (data) => {
      setJoinBusy(false);
      setJoinError('');
      setShowIdentityForm(false);
      setConnected(true);
      setStudents(data.students || []);
      setTeams(data.raceTeams || {});
      setRacePhase(data.racePhase || 'setup');
      updateBalls(data.raceBalls || {});
      setMapLevel(normalizeMapLevel(data.mapLevel, 2));
      setRaceMode(data.raceMode || 'competition');
      setResults(data.results || []);
      setGpActive(Boolean(data.gpActive));
      setGpStage(data.gpStage || 0);
      setStageResults(data.gpStageResults || [[], [], []]);
      setGpFinalResults(data.gpFinalResults || []);
      setGpCountdown(data.gpCountdown || 0);
      setRacePaused(false);

      const currentId = socket.id;
      const currentTeam = currentId ? data.raceTeams?.[currentId] : null;
      const currentBall = currentId ? data.raceBalls?.[currentId] : null;
      setMyTeamId(currentTeam || currentBall ? currentId : null);
      setIsParamsConfirmed(Boolean(currentTeam?.paramsConfirmed));
    };

    const handleRoomUpdate = (data) => {
      setStudents(data.students || []);
    };

    const handleStudentJoined = (data) => {
      if (!data?.student) return;
      setStudents((previous) => {
        const next = previous.filter((student) => student.id !== data.student.id);
        next.push(data.student);
        return next;
      });

      if (data.student.id !== socket.id) {
        addNotification(`🚀 ${data.student.studentName} 팀이 합류했습니다.`);
      }
    };

    const handleStudentLeft = (data) => {
      setStudents((previous) => previous.filter((student) => student.id !== data.studentId));

      if (data?.studentName) {
        addNotification(`💫 ${data.studentName} 팀이 퇴장했습니다.`);
      }
    };

    const handleTeamsUpdated = (data) => {
      setTeams(data.teams || {});
      const currentId = socket.id;
      const currentTeam = currentId ? data.teams?.[currentId] : null;
      setIsParamsConfirmed(Boolean(currentTeam?.paramsConfirmed));
      if (currentTeam) setMyTeamId(currentId);
    };

    const handleRacePrepare = (data) => {
      setRacePhase('preparing');
      setResults([]);
      setGpCountdown(0);
      updateBalls(data.balls || {});
      if (data.teams) setTeams(data.teams);
      if (data.mapLevel) setMapLevel(normalizeMapLevel(data.mapLevel, 2));
      const currentId = socket.id;
      const currentTeam = currentId ? data.teams?.[currentId] : null;
      if (currentTeam || data.balls?.[currentId]) setMyTeamId(currentId);
      setIsParamsConfirmed(Boolean(currentTeam?.paramsConfirmed));
    };

    const handleRaceStarted = (data) => {
      setRacePhase('racing');
      setResults([]);
      setGpCountdown(0);
      updateBalls(data.balls || {});
      if (data.teams) setTeams(data.teams);
      if (data.mapLevel) setMapLevel(normalizeMapLevel(data.mapLevel, 2));
      if (data.raceMode) setRaceMode(data.raceMode);
      setGpStage(data.gpStage || 0);
      setRacePaused(false);
      const currentId = socket.id;
      if (currentId && data.balls?.[currentId]) {
        setMyTeamId(currentId);
      }
      setIsParamsConfirmed(true);
    };

    const handleRaceTick = (data) => {
      updateBalls(data.balls || {});
    };

    const handleRaceAlert = (data) => {
      alertSequenceRef.current += 1;
      setAlerts((previous) => [{ id: alertSequenceRef.current, ...data }, ...previous].slice(0, 5));
      if (data?.message) addNotification(data.message);
    };

    const handleRaceFinished = (data) => {
      setRacePhase('finished');
      setResults(data.results || []);
      setGpCountdown(0);
      setRacePaused(false);
      if (!gpActive) setGpActive(false);
    };

    const handleRaceReset = (data) => {
      setRacePhase('setup');
      setResults([]);
      updateBalls({});
      setAlerts([]);
      setRaceMode('competition');
      setGpActive(false);
      setGpStage(0);
      setStageResults([[], [], []]);
      setGpFinalResults([]);
      setGpCountdown(0);
      setRacePaused(false);
      if (data?.teams) setTeams(data.teams);
      const currentId = socket.id;
      const currentTeam = currentId ? data?.teams?.[currentId] : null;
      setMyTeamId(currentTeam ? currentId : null);
      setIsParamsConfirmed(Boolean(currentTeam?.paramsConfirmed));
    };

    const handleGpStarted = (data) => {
      setGpActive(true);
      setGpStage(data.currentStage || 1);
      setStageResults([[], [], []]);
      setGpFinalResults([]);
      setGpCountdown(0);
      setResults([]);
      addNotification('🏁 Grand Prix가 시작되었습니다.');
    };

    const handleGpStageComplete = (data) => {
      setRacePhase('stageResult');
      addStageResult((data.stage || 1) - 1, data.results || []);
      setGpCountdown(0);
      setRacePaused(false);
    };

    const handleGpCountdown = (data) => {
      setGpCountdown(data.seconds || 0);
    };

    const handleGpFinalResults = (data) => {
      setRacePhase('finished');
      setGpActive(true);
      setStageResults(data.allStageResults || [[], [], []]);
      setGpFinalResults(data.finalResults || []);
      setGpCountdown(0);
      setRacePaused(false);
    };

    const handleMapSelected = (data) => {
      if (data?.level) setMapLevel(normalizeMapLevel(data.level, 2));
    };

    const handleRacePaused = (data) => {
      setRacePaused(Boolean(data.paused));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('room_full', handleRoomFull);
    socket.on('auth_error', handleAuthError);
    socket.on('room_state', handleRoomState);
    socket.on('room_update', handleRoomUpdate);
    socket.on('student_joined', handleStudentJoined);
    socket.on('student_left', handleStudentLeft);
    socket.on('map_selected', handleMapSelected);
    socket.on('race_teams_updated', handleTeamsUpdated);
    socket.on('race_prepare', handleRacePrepare);
    socket.on('race_started', handleRaceStarted);
    socket.on('race_tick', handleRaceTick);
    socket.on('race_alert', handleRaceAlert);
    socket.on('race_finished', handleRaceFinished);
    socket.on('race_reset', handleRaceReset);
    socket.on('gp_started', handleGpStarted);
    socket.on('gp_stage_complete', handleGpStageComplete);
    socket.on('gp_countdown', handleGpCountdown);
    socket.on('gp_final_results', handleGpFinalResults);
    socket.on('race_paused', handleRacePaused);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('room_full', handleRoomFull);
      socket.off('auth_error', handleAuthError);
      socket.off('room_state', handleRoomState);
      socket.off('room_update', handleRoomUpdate);
      socket.off('student_joined', handleStudentJoined);
      socket.off('student_left', handleStudentLeft);
      socket.off('map_selected', handleMapSelected);
      socket.off('race_teams_updated', handleTeamsUpdated);
      socket.off('race_prepare', handleRacePrepare);
      socket.off('race_started', handleRaceStarted);
      socket.off('race_tick', handleRaceTick);
      socket.off('race_alert', handleRaceAlert);
      socket.off('race_finished', handleRaceFinished);
      socket.off('race_reset', handleRaceReset);
      socket.off('gp_started', handleGpStarted);
      socket.off('gp_stage_complete', handleGpStageComplete);
      socket.off('gp_countdown', handleGpCountdown);
      socket.off('gp_final_results', handleGpFinalResults);
      socket.off('race_paused', handleRacePaused);
    };
  }, [
    addNotification,
    addStageResult,
    emitJoin,
    gpActive,
    isSoloMode,
    roomCode,
    setConnected,
    setGpActive,
    setGpCountdown,
    setGpFinalResults,
    setGpStage,
    setMapLevel,
    setMyTeamId,
    setRacePaused,
    setRacePhase,
    setResults,
    setStageResults,
    setTeams,
    studentName,
    updateBalls,
  ]);

  useEffect(() => {
    if (isSoloMode || !isConnected || !roomCode || !studentName || !myTeamId || !PREPARED_PHASES.has(racePhase)) {
      return undefined;
    }

    if (paramThrottleRef.current) clearTimeout(paramThrottleRef.current);
    paramThrottleRef.current = window.setTimeout(() => {
      const socket = getSocket();
      const myColor = teams[myTeamId]?.color || TEAM_COLORS[Math.max(teamCount - 1, 0) % TEAM_COLORS.length];

      if (socket?.connected) {
        socket.emit('set_race_params', {
          teamName: studentName,
          memberNames: memberNames || '',
          color: myColor,
          learningRate: clampLearningRate(myLearningRate, 0.1),
          momentum: clampMomentum(myMomentum, 0.9),
          mapLevel: normalizedMapLevel,
        });
      }
    }, 250);

    return () => {
      if (paramThrottleRef.current) clearTimeout(paramThrottleRef.current);
    };
  }, [
    isConnected,
    isSoloMode,
    memberNames,
    myLearningRate,
    myMomentum,
    myTeamId,
    normalizedMapLevel,
    racePhase,
    roomCode,
    studentName,
    teamCount,
    teams,
  ]);

  const handleFieldChange = useCallback((field, value) => {
    setJoinForm((previous) => ({
      ...previous,
      [field]: value,
    }));
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setJoinError('');
  }, []);

  const handleJoinSubmit = useCallback(() => {
    const nextValues = {
      teamName: joinForm.teamName.trim(),
      memberNames: joinForm.memberNames.trim(),
      roomCode: joinForm.roomCode.trim(),
    };
    const validationErrors = buildFieldErrors(nextValues, ['teamName', 'memberNames', 'roomCode']);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    clearSoloInterval();
    disconnectSocket();
    setConnected(false);
    setSessionMode('multiplayer');
    setJoinBusy(true);
    setJoinError('');
    setFieldErrors({});
    setStudentInfo(nextValues.teamName, nextValues.roomCode, nextValues.memberNames);
  }, [clearSoloInterval, joinForm, setConnected, setStudentInfo]);

  const handleStartSoloFromForm = useCallback(() => {
    const nextValues = {
      teamName: joinForm.teamName.trim(),
      memberNames: joinForm.memberNames.trim(),
      roomCode: joinForm.roomCode.trim(),
    };
    const validationErrors = buildFieldErrors(nextValues, ['teamName']);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setJoinError('');
    if (!studentName || studentName !== nextValues.teamName || memberNames !== nextValues.memberNames || roomCode !== nextValues.roomCode) {
      setStudentInfo(nextValues.teamName, nextValues.roomCode, nextValues.memberNames);
    }
    prepareSoloPractice({
      level: normalizedMapLevel,
      teamName: nextValues.teamName,
      memberNames: nextValues.memberNames,
      learningRate: myLearningRate,
      momentum: myMomentum,
    });
  }, [
    joinForm,
    memberNames,
    myLearningRate,
    myMomentum,
    normalizedMapLevel,
    prepareSoloPractice,
    roomCode,
    setStudentInfo,
    studentName,
  ]);

  const handleSwitchToSolo = useCallback(() => {
    const nextTeamName = joinForm.teamName.trim() || studentName || 'Solo Driver';
    const nextMemberNames = joinForm.memberNames.trim() || memberNames || '';
    prepareSoloPractice({
      level: normalizedMapLevel,
      teamName: nextTeamName,
      memberNames: nextMemberNames,
      learningRate: myLearningRate,
      momentum: myMomentum,
    });
  }, [
    joinForm.memberNames,
    joinForm.teamName,
    memberNames,
    myLearningRate,
    myMomentum,
    normalizedMapLevel,
    prepareSoloPractice,
    studentName,
  ]);

  const handleReturnToMultiplayer = useCallback(() => {
    resetRaceViewport();
    setSessionMode('multiplayer');
    disconnectSocket();
    setConnected(false);
    setShowIdentityForm(!studentName);
  }, [resetRaceViewport, setConnected, studentName]);

  const handleApplyPreset = useCallback((preset) => {
    setSelectedPresetId(preset.id);
    setMyLearningRate(preset.learningRate);
    setMyMomentum(preset.momentum);
  }, [setMyLearningRate, setMyMomentum]);

  const handleSubmitParams = useCallback(() => {
    if (isSoloMode) {
      startSoloPractice();
      return;
    }

    const socket = connectSocket();
    const teamId = socket.id || myTeamId || null;
    const existingColor = teamId ? teams[teamId]?.color : null;
    const colorIndex = teamCount % TEAM_COLORS.length;

    socket.emit('set_race_params', {
      teamName: studentName || joinForm.teamName || '익명',
      memberNames: memberNames || joinForm.memberNames || '',
      color: existingColor || TEAM_COLORS[colorIndex],
      learningRate: clampLearningRate(myLearningRate, 0.1),
      momentum: clampMomentum(myMomentum, 0.9),
      mapLevel: normalizedMapLevel,
    });

    if (teamId) setMyTeamId(teamId);
    setIsParamsConfirmed(true);
  }, [
    isSoloMode,
    joinForm.memberNames,
    joinForm.teamName,
    memberNames,
    myLearningRate,
    myMomentum,
    myTeamId,
    normalizedMapLevel,
    setMyTeamId,
    startSoloPractice,
    studentName,
    teamCount,
    teams,
  ]);

  const handleSelectMap = useCallback((level) => {
    const nextLevel = normalizeMapLevel(level, normalizedMapLevel);
    setMapLevel(nextLevel);

    if (isSoloMode) {
      prepareSoloPractice({
        level: nextLevel,
        teamName: studentName || joinForm.teamName,
        memberNames: memberNames || joinForm.memberNames,
        learningRate: myLearningRate,
        momentum: myMomentum,
      });
    }
  }, [
    isSoloMode,
    joinForm.memberNames,
    joinForm.teamName,
    memberNames,
    myLearningRate,
    myMomentum,
    normalizedMapLevel,
    prepareSoloPractice,
    setMapLevel,
    studentName,
  ]);

  const sliderSummary = isSoloMode
    ? racePhase === 'preparing'
      ? '출발 위치를 보고 바로 셀프 연습을 시작할 수 있습니다.'
      : racePhase === 'racing'
        ? '셀프 연습 중에도 슬라이더를 바꾸면 다음 라운드 전략에 반영됩니다.'
        : '맵을 고르고, 출발 위치를 다시 뽑고, 원하는 만큼 반복해보세요.'
    : racePhase === 'preparing'
      ? '출발 위치를 본 뒤 마지막으로 확정하세요.'
      : racePhase === 'racing'
        ? '지금 바꾸면 다음 tick부터 바로 전략이 반영됩니다.'
        : '레이스가 시작되기 전 미리 전략을 정리해둘 수 있습니다.';

  const connectionValue = isSoloMode
    ? '셀프 연습'
    : roomCode
      ? (isConnected ? '연결됨' : '연결 중')
      : '입장 필요';
  const connectionDetail = isSoloMode
    ? '서버 없이 로컬 3D 시뮬레이션'
    : roomCode || '아직 방 코드가 없습니다.';

  const quickModeText = isSoloMode
    ? `${studentName || joinForm.teamName || '학생'}의 셀프 연습 세션`
    : `${roomCode} 방에서 멀티플레이 레이스 참여 중`;
  const myStatus = myBall?.status || (isParamsConfirmed ? 'armed' : 'waiting');

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Breadcrumb
          items={[{ label: 'Week 5', href: '/week5' }]}
          current="Racing Codex"
        />

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.kicker}>3D Racing Studio</div>
            <h1 className={styles.title}>Racing Codex</h1>
            <p className={styles.lead}>
              기존 Week 5의 3D 멀티플레이 엔진을 유지하면서, 학생이 한 화면에서 맵 개념, 현재 레이스 상태,
              내 전략, 팀별 진행 상황, 혼자 연습 루프까지 모두 읽을 수 있는 새 기준 화면입니다.
            </p>

            <div className={styles.arcRow}>
              {RACING_CODEX_ARC.map((item) => (
                <article key={item.title} className={styles.arcCard}>
                  <strong>{item.title}</strong>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.heroStats}>
            <InlineStatusCard
              label="실시간 연결"
              value={connectionValue}
              detail={connectionDetail}
              tone={isSoloMode ? 'info' : isConnected ? 'success' : 'neutral'}
            />
            <InlineStatusCard
              label="현재 맵"
              value={`${currentMap.emoji} ${currentMap.name}`}
              detail={levelGuide.concept}
              tone="info"
            />
            <InlineStatusCard
              label="레이스 상태"
              value={phaseMeta.label}
              detail={modeMeta.label}
              tone={racePhase === 'racing' ? 'warning' : racePhase === 'finished' ? 'success' : 'neutral'}
            />
            <InlineStatusCard
              label="참여 현황"
              value={`${teamCount || (isSoloMode ? 2 : students.length)}팀`}
              detail={isSoloMode ? '내 공 + Codex Bot 기준선' : `학생 ${students.length}명 / 내 팀 ${studentName || '미지정'}`}
              tone="neutral"
            />
          </div>
        </section>

        {showIdentityForm ? (
          <InitialJoinState
            fieldErrors={fieldErrors}
            joinBusy={joinBusy}
            joinError={joinError}
            joinForm={joinForm}
            onChange={handleFieldChange}
            onJoinMultiplayer={handleJoinSubmit}
            onStartSolo={handleStartSoloFromForm}
          />
        ) : (
          <section className={styles.quickBar}>
            <div className={styles.quickBarText}>
              <strong>{studentName || joinForm.teamName || '학생'}</strong>
              <span>{quickModeText}</span>
              {joinError ? <small className={styles.quickError}>{joinError}</small> : null}
            </div>
            <div className={styles.quickActions}>
              {isSoloMode ? (
                <button type="button" className={styles.secondaryButton} onClick={handleReturnToMultiplayer}>
                  멀티플레이로 돌아가기
                </button>
              ) : (
                <button type="button" className={styles.secondaryButton} onClick={handleSwitchToSolo}>
                  셀프 연습 전환
                </button>
              )}
              <button type="button" className={styles.secondaryButton} onClick={() => setShowIdentityForm(true)}>
                팀 정보 수정
              </button>
              {!isSoloMode ? (
                <a href="/dashboard" className={styles.secondaryLink}>
                  관제탑 열기
                </a>
              ) : null}
            </div>
          </section>
        )}

        <section className={styles.arenaLayout}>
          <div className={styles.arenaColumn}>
            <div className={styles.stageFrame}>
              <WebGLErrorBoundary
                fallbackProps={{
                  weekTitle: 'Racing Codex',
                  conceptSummary: '손실 지형 위에서 학습률과 모멘텀을 실시간으로 읽는 3D 레이싱 화면입니다.',
                }}
              >
                <GradientRaceScene />
              </WebGLErrorBoundary>

              <div className={styles.overlayTop}>
                <div className={styles.overlayCluster}>
                  <span className={styles.overlayPill}>{phaseMeta.label}</span>
                  <span className={styles.overlayPill}>{modeMeta.label}</span>
                  <span className={styles.overlayPill}>{currentMap.emoji} Level {normalizedMapLevel}</span>
                </div>
                {gpCountdown > 0 ? (
                  <div className={styles.countdownBadge}>
                    다음 스테이지까지 {gpCountdown}s
                  </div>
                ) : null}
              </div>

              <div className={styles.overlayRight}>
                <div className={styles.overlayCard}>
                  <span className={styles.overlayLabel}>내 전략</span>
                  <strong>{studentName || joinForm.teamName || '미등록 팀'}</strong>
                  <div className={styles.metricRow}>
                    <span>LR {formatNumber(myLearningRate, 2)}</span>
                    <span>Momentum {formatNumber(myMomentum, 2)}</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span>{isParamsConfirmed ? '전략 준비 완료' : '아직 전략 미확정'}</span>
                    <TeamStatusBadge status={myStatus} />
                  </div>
                  {myBall ? (
                    <p className={styles.overlayHint}>
                      좌표 ({formatNumber(myBall.x, 1)}, {formatNumber(myBall.z, 1)}) / Loss {formatNumber(myBall.loss, 3)}
                    </p>
                  ) : (
                    <p className={styles.overlayHint}>
                      {isSoloMode ? '셀프 연습을 시작하면 내 공과 AI 기준선이 바로 배치됩니다.' : '선생님이 준비를 누르면 출발 위치가 표시됩니다.'}
                    </p>
                  )}
                </div>

                <div className={styles.overlayCard}>
                  <span className={styles.overlayLabel}>맵 해석 포인트</span>
                  <strong>{levelGuide.concept}</strong>
                  <p className={styles.overlayHint}>{levelGuide.coachingFocus}</p>
                </div>
              </div>

              <div className={styles.overlayBottom}>
                {liveTeams.slice(0, 4).map((team) => (
                  <article
                    key={team.id}
                    className={`${styles.rankingCard} ${team.id === myTeamId ? styles.rankingCardMine : ''}`}
                    style={{ '--team-color': team.color }}
                  >
                    <div className={styles.rankingTop}>
                      <strong>{team.rank ? `${team.rank}위` : 'LIVE'}</strong>
                      <TeamStatusBadge status={team.status} />
                    </div>
                    <span>{team.teamName}</span>
                    <small>
                      LR {formatNumber(team.learningRate, 2)} / M {formatNumber(team.momentum, 2)}
                    </small>
                    <small>
                      {Number.isFinite(team.currentLoss) ? `Loss ${formatNumber(team.currentLoss, 3)}` : '아직 코스 미배치'}
                    </small>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.briefingGrid}>
              <article className={styles.briefCard}>
                <span className={styles.briefLabel}>{isSoloMode ? 'Solo Cue' : 'Teacher Cue'}</span>
                <strong>{levelGuide.teacherCue}</strong>
                <p>{coachSummary}</p>
              </article>
              <article className={styles.briefCard}>
                <span className={styles.briefLabel}>Reflection</span>
                <strong>{levelGuide.reflectionPrompt}</strong>
                <p>{modeMeta.copy}</p>
              </article>
              <article className={styles.briefCard}>
                <span className={styles.briefLabel}>Recent Alerts</span>
                {alerts.length > 0 ? (
                  <div className={styles.alertList}>
                    {alerts.map((alert) => (
                      <p key={alert.id}>{alert.message}</p>
                    ))}
                  </div>
                ) : (
                  <p>{isSoloMode ? '출발 위치를 확인한 뒤 한 번 달려보면 로컬 미니마나 오버슈팅 메시지가 여기에 쌓입니다.' : '아직 경고가 없습니다. 팀별 경로 차이를 먼저 관찰해보세요.'}</p>
                )}
              </article>
            </div>

            {gpActive ? (
              <div className={styles.gpRibbon}>
                {GP_STAGES.map((stage) => {
                  const isDone = gpStage > stage.stage || (gpStage === stage.stage && racePhase === 'finished');
                  const isCurrent = gpStage === stage.stage && (racePhase === 'racing' || racePhase === 'stageResult');
                  return (
                    <article
                      key={stage.stage}
                      className={`${styles.gpStageCard} ${isCurrent ? styles.gpStageCurrent : ''} ${isDone ? styles.gpStageDone : ''}`}
                    >
                      <span>{stage.emoji}</span>
                      <strong>{stage.title}</strong>
                      <small>{stage.label}</small>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {primaryResults.length > 0 ? (
              <ResultsTable
                title={gpActive && racePhase === 'stageResult' ? `Stage ${gpStage} 결과` : isSoloMode ? '셀프 연습 결과' : '레이스 결과'}
                rows={primaryResults}
              />
            ) : null}

            {gpFinalResults.length > 0 ? <GpFinalTable rows={gpFinalResults} /> : null}
          </div>

          <aside className={styles.commandRail}>
            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <span className={styles.eyebrow}>Strategy HUD</span>
                <h2>{isSoloMode ? '혼자서도 전략을 반복 실험할 수 있습니다.' : '플레이 화면 옆에서 바로 전략을 조정합니다.'}</h2>
                <p>{sliderSummary}</p>
              </div>

              <div className={styles.mapSummary}>
                <div>
                  <span className={styles.mapBadge}>{currentMap.difficulty}</span>
                  <strong>{currentMap.emoji} {currentMap.name}</strong>
                </div>
                <p>{currentMap.description}</p>
              </div>

              {isSoloMode ? (
                <div className={styles.mapPicker}>
                  {MAP_LEVELS.map((level) => (
                    <button
                      key={level.level}
                      type="button"
                      className={`${styles.mapButton} ${normalizedMapLevel === level.level ? styles.mapButtonActive : ''}`}
                      onClick={() => handleSelectMap(level.level)}
                    >
                      <span>{level.emoji}</span>
                      <strong>Level {level.level}</strong>
                      <small>{level.name}</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className={styles.presetGrid}>
                {recommendedPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`${styles.presetButton} ${selectedPresetId === preset.id ? styles.presetActive : ''}`}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.summary}</span>
                  </button>
                ))}
              </div>

              <label className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Learning Rate</span>
                  <strong>{formatNumber(myLearningRate, 3)}</strong>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.6"
                  step="0.001"
                  value={myLearningRate}
                  onChange={(event) => setMyLearningRate(Number(event.target.value))}
                />
                <p>클수록 빠르지만, 최솟값을 지나치며 진동하거나 이탈할 수 있습니다.</p>
              </label>

              <label className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Momentum</span>
                  <strong>{formatNumber(myMomentum, 2)}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.99"
                  step="0.01"
                  value={myMomentum}
                  onChange={(event) => setMyMomentum(Number(event.target.value))}
                />
                <p>낮으면 안정적이고, 높으면 로컬 미니마 탈출과 빠른 관성을 만들 수 있습니다.</p>
              </label>

              {isSoloMode ? (
                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleSubmitParams}
                    disabled={racePhase === 'racing'}
                  >
                    {racePhase === 'preparing'
                      ? '셀프 연습 시작'
                      : racePhase === 'finished'
                        ? '같은 위치에서 다시 달리기'
                        : racePhase === 'racing'
                          ? '셀프 연습 진행 중'
                          : '셀프 연습 시작'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => prepareSoloPractice()}
                  >
                    출발 위치 다시 배치
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmitParams}
                  disabled={!studentName || !roomCode || joinBusy}
                >
                  {racePhase === 'preparing'
                    ? '출발 위치 확인 후 전략 확정'
                    : racePhase === 'racing'
                      ? '현재 전략 다시 전송'
                      : '전략 제출'}
                </button>
              )}
            </section>

            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <span className={styles.eyebrow}>Team Radar</span>
                <h2>{isSoloMode ? '내 전략과 Codex Bot 기준선 비교' : '모든 팀의 전략과 진행 상황'}</h2>
                <p>{isSoloMode ? '혼자 연습일 때도 AI 기준선과 비교해 내 조절이 어떤 차이를 냈는지 바로 볼 수 있습니다.' : '누가 빠른지보다 어떤 조합이 어떤 결과를 만들었는지 읽기 쉽게 정리했습니다.'}</p>
              </div>

              <div className={styles.teamRadarList}>
                {liveTeams.length > 0 ? (
                  liveTeams.map((team) => (
                    <article key={team.id} className={`${styles.teamCard} ${team.id === myTeamId ? styles.teamCardMine : ''}`}>
                      <div className={styles.teamTop}>
                        <div className={styles.teamIdentity}>
                          <span className={styles.teamSwatch} style={{ backgroundColor: team.color }} />
                          <div>
                            <strong>{team.teamName}</strong>
                            <small>{team.memberNames || '팀원 정보 없음'}</small>
                          </div>
                        </div>
                        <TeamStatusBadge status={team.status} />
                      </div>

                      <div className={styles.teamMetrics}>
                        <span>LR {formatNumber(team.learningRate, 2)}</span>
                        <span>M {formatNumber(team.momentum, 2)}</span>
                        <span>{Number.isFinite(team.currentLoss) ? `Loss ${formatNumber(team.currentLoss, 3)}` : 'Loss 대기'}</span>
                        <span>{team.rank ? `${team.rank}위 / ${formatTime(team.resultTime)}` : '진행 중'}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className={styles.emptyText}>아직 팀이 등록되지 않았습니다. 전략을 제출하거나 셀프 연습을 시작하면 여기에 표시됩니다.</p>
                )}
              </div>
            </section>

            <section className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <span className={styles.eyebrow}>{isSoloMode ? 'Solo Drill' : 'Room Roster'}</span>
                <h2>{isSoloMode ? '혼자 연습 추천 시나리오' : '현재 방에 들어온 학생들'}</h2>
                <p>{isSoloMode ? '다른 학생 없이도 바로 실험할 수 있는 흐름을 넣었습니다.' : '아직 전략을 안 낸 학생도 바로 확인할 수 있습니다.'}</p>
              </div>

              {isSoloMode ? (
                <div className={styles.rosterList}>
                  <div className={styles.rosterItem}>
                    <div>
                      <strong>1. 맵 선택</strong>
                      <small>로컬 미니마, 계곡 진동, 종합 전략 맵을 바꿔가며 차이를 봅니다.</small>
                    </div>
                  </div>
                  <div className={styles.rosterItem}>
                    <div>
                      <strong>2. 출발 위치 다시 배치</strong>
                      <small>같은 파라미터라도 출발 위치가 달라지면 경로가 달라지는 장면을 관찰합니다.</small>
                    </div>
                  </div>
                  <div className={styles.rosterItem}>
                    <div>
                      <strong>3. Codex Bot 비교</strong>
                      <small>{soloBenchmarkPreset.label} 기준선과 비교해 내 전략이 빠른지, 안정적인지 해석합니다.</small>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.rosterList}>
                  {students.length > 0 ? (
                    students.map((student) => {
                      const team = liveTeams.find((entry) => entry.id === student.id);
                      return (
                        <div key={student.id} className={styles.rosterItem}>
                          <div>
                            <strong>{student.studentName}</strong>
                            <small>{student.memberNames || '팀원 정보 없음'}</small>
                          </div>
                          <TeamStatusBadge status={team?.status || 'waiting'} />
                        </div>
                      );
                    })
                  ) : (
                    <p className={styles.emptyText}>아직 이 방에 학생이 없습니다.</p>
                  )}
                </div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
