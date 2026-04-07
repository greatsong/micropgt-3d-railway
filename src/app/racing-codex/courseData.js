import { MAP_LEVELS } from '@/lib/lossFunction';

const LESSON_NOTES = {
  1: {
    concept: 'Learning Rate',
    learningGoal: '큰 학습률이 왜 빠르지만 위험할 수 있는지 체감합니다.',
    teacherCue: '학생이 속도와 안정성을 같은 개념으로 말하는지 확인합니다.',
    reflectionPrompt: '속도가 빠른데도 더 좋은 선택이 아닌 경우는 언제일까요?',
    coachingFocus: '출발선이 멀어 학습률 차이가 시간 차이로 바로 보입니다.',
  },
  2: {
    concept: 'Overshooting',
    learningGoal: '글로벌 최솟값 근처에서 왜 진동이 생기는지 설명할 수 있습니다.',
    teacherCue: '학생이 손실 감소와 위치 이동을 함께 읽는지 봅니다.',
    reflectionPrompt: '값이 계속 바뀌는데도 학습이 좋아지고 있다고 말할 수 있을까요?',
    coachingFocus: '너무 큰 학습률은 최솟값을 지나쳐 버리는 패턴을 만듭니다.',
  },
  3: {
    concept: 'Momentum',
    learningGoal: '모멘텀이 로컬 미니마를 탈출시키는 장면을 해석합니다.',
    teacherCue: '학생이 관성이라는 비유를 수학적 업데이트와 연결하는지 봅니다.',
    reflectionPrompt: '멈춰 보이는 지점이 진짜 정답인지 어떻게 구별할 수 있을까요?',
    coachingFocus: '모멘텀이 낮으면 안정적이지만 얕은 골짜기에서 멈추기 쉽습니다.',
  },
  4: {
    concept: 'Anisotropic Valley',
    learningGoal: '축마다 기울기가 다를 때 같은 학습률이 왜 다르게 느껴지는지 봅니다.',
    teacherCue: '학생이 x, z 방향을 따로 읽어내는지 관찰합니다.',
    reflectionPrompt: '어느 축에서는 빠르고 어느 축에서는 느린 이유를 말해보세요.',
    coachingFocus: '긴 계곡은 수렴 자체보다 흔들림 제어를 먼저 배우게 합니다.',
  },
  5: {
    concept: 'Strategy Mix',
    learningGoal: '학습률과 모멘텀을 동시에 조절하는 전략을 세웁니다.',
    teacherCue: '학생이 한 파라미터만 바꾸지 않고 조합으로 사고하는지 봅니다.',
    reflectionPrompt: '좋은 하이퍼파라미터는 정답일까요, 상황에 따른 전략일까요?',
    coachingFocus: '함정이 많은 맵에서는 빠른 속도보다 조절 능력이 더 중요합니다.',
  },
  6: {
    concept: 'Exploration',
    learningGoal: '비슷해 보이는 해들 사이에서 더 좋은 해를 찾는 탐색을 이해합니다.',
    teacherCue: '학생이 더 깊은 계곡과 더 빨리 찾은 계곡을 구분하는지 봅니다.',
    reflectionPrompt: '가까운 정답과 더 좋은 정답 중 무엇을 선택해야 할까요?',
    coachingFocus: '탐색과 착취의 균형을 짧은 레이스로 설명할 수 있습니다.',
  },
  7: {
    concept: 'Path Dependence',
    learningGoal: '같은 목표라도 경로가 달라지면 학습 경험이 달라짐을 관찰합니다.',
    teacherCue: '학생이 도착 결과만 보지 않고 이동 경로를 같이 읽는지 봅니다.',
    reflectionPrompt: '같은 최솟값에 도착해도 더 좋은 학습이었다고 말할 수 있는 경로가 있나요?',
    coachingFocus: '나선 계곡은 최종 점수보다 경로 해석이 중심이 됩니다.',
  },
  8: {
    concept: 'Stage Strategy',
    learningGoal: '한 번의 규칙으로 해결되지 않는 지형에서 단계별 전략을 세웁니다.',
    teacherCue: '학생이 평원, 절벽, 골짜기를 다른 국면으로 읽는지 봅니다.',
    reflectionPrompt: '한 전략이 전체 구간에서 계속 좋지 않은 이유는 무엇일까요?',
    coachingFocus: '실제 학습처럼 구간마다 조절이 필요하다는 메시지를 강조하기 좋습니다.',
  },
};

export const RACING_CODEX_ARC = [
  {
    title: 'Explain',
    copy: '각 맵이 어떤 딥러닝 개념을 가르치는지 먼저 설명합니다.',
  },
  {
    title: 'Tune',
    copy: '학습률과 모멘텀을 직접 조절하며 가설을 세웁니다.',
  },
  {
    title: 'Run',
    copy: '동일한 초기 조건에서 재현 가능한 시뮬레이션으로 결과를 확인합니다.',
  },
  {
    title: 'Reflect',
    copy: '교사용 질문과 학생용 회고 질문으로 개념을 정리합니다.',
  },
];

export const RACING_PRESETS = [
  {
    id: 'steady',
    label: '천천히 안정',
    learningRate: 0.04,
    momentum: 0.15,
    summary: '느리지만 흔들림이 적어 기초 설명용으로 좋습니다.',
    fitLevels: [1, 2, 4],
  },
  {
    id: 'balanced',
    label: '균형 전략',
    learningRate: 0.12,
    momentum: 0.62,
    summary: '대부분의 맵에서 결과가 읽기 쉬운 기본 전략입니다.',
    fitLevels: [2, 3, 4, 5, 6],
  },
  {
    id: 'escape',
    label: '탈출 시도',
    learningRate: 0.16,
    momentum: 0.82,
    summary: '로컬 미니마에서 빠져나오는 장면을 만들기 좋습니다.',
    fitLevels: [3, 5, 6, 7],
  },
  {
    id: 'aggressive',
    label: '공격적 실험',
    learningRate: 0.34,
    momentum: 0.88,
    summary: '오버슈팅과 발산을 의도적으로 보여줄 때 좋습니다.',
    fitLevels: [2, 4, 8],
  },
];

export const RACING_CODEX_LEVELS = MAP_LEVELS.map((level) => ({
  ...level,
  ...LESSON_NOTES[level.level],
}));

export function getLevelGuide(level) {
  return RACING_CODEX_LEVELS.find((item) => item.level === level) || RACING_CODEX_LEVELS[0];
}

export function getPresetById(id) {
  return RACING_PRESETS.find((preset) => preset.id === id) || RACING_PRESETS[0];
}
