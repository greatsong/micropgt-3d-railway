import {
  createRaceBall,
  getRandomizedStartPosition,
  advanceRaceBall,
  inspectRaceBall,
  clampLearningRate,
  clampMomentum,
  normalizeMapLevel,
} from '@/lib/raceEngine';
import {
  GLOBAL_MINIMA,
  MAP_LEVELS,
  MAP_SIZES,
  gradientByLevel,
  lossFunctionByLevel,
} from '@/lib/lossFunction';

const VIEWBOX = { width: 560, height: 360, padding: 24 };

function createSeededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createSeed(level, learningRate, momentum) {
  return Math.round(level * 100000 + learningRate * 1000000 + momentum * 10000000);
}

function getMapMeta(level) {
  return MAP_LEVELS.find((item) => item.level === level) || MAP_LEVELS[0];
}

function buildSnapshot(ball, level, step, elapsedMs) {
  const gradient = gradientByLevel(ball.x, ball.z, level);

  return {
    step,
    elapsedMs,
    x: ball.x,
    y: ball.y,
    z: ball.z,
    vx: ball.vx,
    vz: ball.vz,
    loss: ball.loss,
    speed: Math.hypot(ball.vx, ball.vz),
    gradientMagnitude: Math.hypot(gradient.gx, gradient.gz),
    distToGoal: Math.hypot(ball.x - GLOBAL_MINIMA[level].x, ball.z - GLOBAL_MINIMA[level].z),
  };
}

function countDirectionSwitches(frames, key) {
  let switches = 0;
  let previousSign = 0;

  for (let index = 1; index < frames.length; index += 1) {
    const delta = frames[index][key] - frames[index - 1][key];
    const sign = Math.sign(Math.round(delta * 1000) / 1000);

    if (sign === 0) continue;
    if (previousSign !== 0 && sign !== previousSign) {
      switches += 1;
    }

    previousSign = sign;
  }

  return switches;
}

function measurePathLength(frames) {
  let total = 0;

  for (let index = 1; index < frames.length; index += 1) {
    total += Math.hypot(
      frames[index].x - frames[index - 1].x,
      frames[index].z - frames[index - 1].z
    );
  }

  return total;
}

function summarizeOutcome({ outcome, metrics, level, learningRate, momentum }) {
  const mapMeta = getMapMeta(level);

  if (outcome.status === 'converged') {
    const smoothEnough = metrics.oscillations <= 5;

    return {
      headline: '글로벌 최솟값에 안정적으로 도착했습니다.',
      verdict: smoothEnough ? '정확한 수렴' : '도착했지만 흔들림이 컸습니다.',
      lesson: smoothEnough
        ? `${mapMeta.name}에서 손실이 꾸준히 줄어드는 모습을 보여줍니다.`
        : `도착은 성공했지만 경로가 길어 실제 학습에서는 비효율이 생길 수 있습니다.`,
      nextMove: smoothEnough
        ? '학습률을 조금 올려도 안정성이 유지되는지 비교해 보세요.'
        : '학습률을 약간 낮추거나 모멘텀을 조금 줄여 더 매끄러운 경로를 만들어 보세요.',
      studentQuestion: '빠르게 도착한 것과 안정적으로 도착한 것 중 어떤 것이 더 좋은 학습일까요?',
      teacherLens: '학생이 성공만 보지 않고 경로의 진동과 속도까지 같이 읽어내는지 확인하세요.',
    };
  }

  if (outcome.status === 'escaped') {
    return {
      headline: '지형 밖으로 튀어나가며 발산했습니다.',
      verdict: '지나치게 공격적인 업데이트',
      lesson: `학습률 ${learningRate.toFixed(3)} 와 모멘텀 ${momentum.toFixed(2)} 조합이 ${mapMeta.name}의 곡면을 넘겨 버렸습니다.`,
      nextMove: '학습률을 먼저 낮추고, 그 다음 모멘텀을 조금씩 조절해 안정 구간을 찾으세요.',
      studentQuestion: '손실이 빠르게 줄던 순간이 있었는데도 왜 실패라고 말할 수 있을까요?',
      teacherLens: '학생이 큰 변화량을 진전으로 오해하지 않도록 오버슈팅 장면을 짚어 주세요.',
    };
  }

  return {
    headline: '얕은 골짜기에서 멈췄습니다.',
    verdict: '로컬 미니마 또는 조기 정지',
    lesson: `${mapMeta.name}에서는 속도보다 관성이 중요할 수 있습니다. 가장 가까운 정답이 전체 최적해와 다를 수 있음을 보여 줍니다.`,
    nextMove: '모멘텀을 조금 높이거나, 학습률을 살짝 키워 얕은 계곡을 넘어가 보세요.',
    studentQuestion: '멈췄다는 사실만으로 학습이 끝났다고 말할 수 있을까요?',
    teacherLens: '학생이 정답과 안정 상태를 혼동하지 않는지 확인하기 좋은 장면입니다.',
  };
}

function toColor(low, high, ratio) {
  const mix = low.map((channel, index) =>
    Math.round(channel + (high[index] - channel) * ratio)
  );

  return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
}

export function mapWorldToViewBox(point, level, width = VIEWBOX.width, height = VIEWBOX.height) {
  const size = MAP_SIZES[level] || 20;
  const half = size / 2;
  const drawWidth = width - VIEWBOX.padding * 2;
  const drawHeight = height - VIEWBOX.padding * 2;

  return {
    x: VIEWBOX.padding + ((point.x + half) / size) * drawWidth,
    y: height - VIEWBOX.padding - ((point.z + half) / size) * drawHeight,
  };
}

export function buildSurfaceHeatmap(level, columns = 18, rows = 12) {
  const normalizedLevel = normalizeMapLevel(level);
  const size = MAP_SIZES[normalizedLevel] || 20;
  const half = size / 2;
  const cellWidth = (VIEWBOX.width - VIEWBOX.padding * 2) / columns;
  const cellHeight = (VIEWBOX.height - VIEWBOX.padding * 2) / rows;
  const cells = [];

  let minLoss = Number.POSITIVE_INFINITY;
  let maxLoss = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = -half + ((column + 0.5) / columns) * size;
      const z = -half + ((row + 0.5) / rows) * size;
      const loss = lossFunctionByLevel(x, z, normalizedLevel);

      minLoss = Math.min(minLoss, loss);
      maxLoss = Math.max(maxLoss, loss);

      cells.push({ row, column, x, z, loss });
    }
  }

  const lowColor = [34, 211, 238];
  const highColor = [244, 114, 182];

  return cells.map((cell) => {
    const intensity = (cell.loss - minLoss) / (maxLoss - minLoss || 1);

    return {
      ...cell,
      fill: toColor(lowColor, highColor, intensity),
      opacity: 0.12 + intensity * 0.48,
      rectX: VIEWBOX.padding + cell.column * cellWidth,
      rectY: VIEWBOX.padding + cell.row * cellHeight,
      rectWidth: cellWidth,
      rectHeight: cellHeight,
    };
  });
}

export function simulateRaceJourney({
  level,
  learningRate,
  momentum,
  frameMs = 70,
  maxSteps = 360,
  spread = 0.7,
} = {}) {
  const normalizedLevel = normalizeMapLevel(level, 3);
  const stableLearningRate = clampLearningRate(learningRate, 0.12);
  const stableMomentum = clampMomentum(momentum, 0.62);
  const random = createSeededRandom(
    createSeed(normalizedLevel, stableLearningRate, stableMomentum)
  );
  const start = getRandomizedStartPosition(normalizedLevel, spread, random);
  const ball = createRaceBall({
    level: normalizedLevel,
    x: start.x,
    z: start.z,
    lr: stableLearningRate,
    momentum: stableMomentum,
    status: 'racing',
  });

  const frames = [buildSnapshot(ball, normalizedLevel, 0, 0)];
  let closestDistance = frames[0].distToGoal;
  let peakSpeed = frames[0].speed;
  let bestLoss = frames[0].loss;
  let outcome = null;

  for (let step = 1; step <= maxSteps; step += 1) {
    advanceRaceBall(ball, normalizedLevel);

    const snapshot = buildSnapshot(ball, normalizedLevel, step, step * frameMs);
    frames.push(snapshot);

    closestDistance = Math.min(closestDistance, snapshot.distToGoal);
    peakSpeed = Math.max(peakSpeed, snapshot.speed);
    bestLoss = Math.min(bestLoss, snapshot.loss);

    outcome = inspectRaceBall(ball, normalizedLevel, step * frameMs);
    if (outcome) {
      break;
    }
  }

  const finalOutcome =
    outcome ||
    inspectRaceBall(ball, normalizedLevel, Number.POSITIVE_INFINITY) || {
      status: 'local_minimum',
      reason: 'analysis',
      distToGlobal: Math.hypot(ball.x - GLOBAL_MINIMA[normalizedLevel].x, ball.z - GLOBAL_MINIMA[normalizedLevel].z),
    };

  const lastFrame = frames[frames.length - 1];
  const metrics = {
    steps: frames.length - 1,
    durationMs: lastFrame.elapsedMs,
    startLoss: frames[0].loss,
    finalLoss: lastFrame.loss,
    bestLoss,
    closestDistance,
    peakSpeed,
    pathLength: measurePathLength(frames),
    oscillations: countDirectionSwitches(frames, 'x') + countDirectionSwitches(frames, 'z'),
  };

  return {
    level: normalizedLevel,
    learningRate: stableLearningRate,
    momentum: stableMomentum,
    start,
    goal: GLOBAL_MINIMA[normalizedLevel],
    frames,
    outcome: finalOutcome,
    metrics,
    summary: summarizeOutcome({
      outcome: finalOutcome,
      metrics,
      level: normalizedLevel,
      learningRate: stableLearningRate,
      momentum: stableMomentum,
    }),
    map: getMapMeta(normalizedLevel),
  };
}
