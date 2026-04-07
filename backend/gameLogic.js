// ── 임베딩 사전 좌표 (카테고리별 군집) ──
export const WORD_CLUSTERS = {
  동물: { center: { x: -4, y: 3, z: -2 }, words: ['고양이', '강아지', '사자', '호랑이', '토끼', '새', '물고기', '코끼리', 'cat', 'dog', 'lion', 'tiger', 'rabbit', 'bird', 'fish', 'elephant'] },
  음식: { center: { x: 4, y: -2, z: 3 }, words: ['사과', '바나나', '피자', '치킨', '밥', '김치', '라면', 'apple', 'banana', 'pizza', 'chicken', 'rice', 'food', 'bread'] },
  감정: { center: { x: 0, y: 4, z: 4 }, words: ['행복', '슬픔', '기쁨', '분노', '사랑', '두려움', 'happy', 'sad', 'joy', 'anger', 'love', 'fear', 'hope'] },
  자연: { center: { x: -3, y: -3, z: -4 }, words: ['하늘', '바다', '산', '꽃', '나무', '비', '눈', '태양', 'sky', 'sea', 'mountain', 'flower', 'tree', 'rain', 'sun'] },
  기술: { center: { x: 3, y: 3, z: -3 }, words: ['컴퓨터', '인공지능', 'AI', 'GPT', '로봇', '코딩', '데이터', 'computer', 'robot', 'coding', 'data', 'program'] },
  학교: { center: { x: -4, y: -1, z: 4 }, words: ['학교', '학생', '선생님', '공부', '시험', '교실', '숙제', 'school', 'student', 'teacher', 'study', 'exam'] },
};

export function getWordPosition(word) {
  const lowerWord = word.toLowerCase();
  for (const [, cluster] of Object.entries(WORD_CLUSTERS)) {
    if (cluster.words.some(w => lowerWord.includes(w.toLowerCase()) || w.toLowerCase().includes(lowerWord))) {
      return {
        x: cluster.center.x + (Math.random() - 0.5) * 2,
        y: cluster.center.y + (Math.random() - 0.5) * 2,
        z: cluster.center.z + (Math.random() - 0.5) * 2,
      };
    }
  }
  return {
    x: (Math.random() - 0.5) * 10,
    y: (Math.random() - 0.5) * 10,
    z: (Math.random() - 0.5) * 10,
  };
}

// ── 손실 함수 (Level 2에서 사용) ──
export function lossFunction(x, z) {
  const bowl = 0.03 * (x * x + z * z);
  const globalMin = -3.0 * Math.exp(-(x * x + (z - 2) * (z - 2)) / 1.5);
  const localMin1 = -1.2 * Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
  const localMin2 = -1.5 * Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
  const noise = 0.15 * Math.sin(x) * Math.cos(z);
  return bowl + globalMin + localMin1 + localMin2 + noise + 3.5;
}

export function gradient(x, z) {
  let gx = 0.06 * x;
  let gz = 0.06 * z;
  const expGlobal = Math.exp(-(x * x + (z - 2) * (z - 2)) / 1.5);
  gx += (2 * 3.0 / 1.5) * x * expGlobal;
  gz += (2 * 3.0 / 1.5) * (z - 2) * expGlobal;
  const expL1 = Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
  gx += (2 * 1.2 / 2) * (x + 3) * expL1;
  gz += (2 * 1.2 / 2) * (z + 2) * expL1;
  const expL2 = Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
  gx += (2 * 1.5 / 2) * (x - 3) * expL2;
  gz += (2 * 1.5 / 2) * (z + 2) * expL2;
  gx += 0.15 * Math.cos(x) * Math.cos(z);
  gz += 0.15 * Math.sin(x) * -Math.sin(z);
  return { gx, gz };
}

// ── 8단계 레이스 맵 메타데이터 ──
export const MAP_LEVELS = [
  { level: 1, name: '입문: 학습률의 의미', emoji: '⛳', description: '큰 학습률 = 빠른 하강! 최적 LR을 찾아보세요.', difficulty: '입문' },
  { level: 2, name: '초급: 학습률 조절', emoji: '🏔️', description: 'LR이 너무 크면 진동! 적절한 범위를 찾아보세요.', difficulty: '초급' },
  { level: 3, name: '중급: 로컬 미니마 탈출', emoji: '🌋', description: '모멘텀 없이는 함정에 빠집니다! 모멘텀의 힘을 경험하세요.', difficulty: '중급' },
  { level: 4, name: '고급: 계곡 진동', emoji: '🌊', description: 'x방향은 급경사, z방향은 완경사. 진동을 잡아보세요!', difficulty: '고급' },
  { level: 5, name: '마스터: 종합 전략', emoji: '🎯', description: 'LR과 모멘텀 모두 정밀 조절이 필요한 최종 도전!', difficulty: '마스터' },
  { level: 6, name: '중급: 쌍봉 계곡', emoji: '⚖️', description: '같은 깊이의 두 계곡! 어느 쪽이 진짜 최솟값일까요?', difficulty: '중급' },
  { level: 7, name: '고급: 나선 계곡', emoji: '🌀', description: '나선형 계곡을 따라가세요! 경로 의존성을 체험합니다.', difficulty: '고급' },
  { level: 8, name: '마스터: 절벽과 평원', emoji: '🏜️', description: '평원에서 절벽으로! 롤러코스터 지형의 다단계 전략 도전!', difficulty: '마스터' },
];

// ── Level 1: 입문 — "학습률의 의미" ──
// 글로벌 최솟값: (0,0) / 로컬 함정: (-5,-5) — 멀리 있어서 쉽게 피할 수 있음
function lossLevel1(x, z) {
  const bowl = 0.05 * (x * x + z * z);
  const localTrap = -0.4 * Math.exp(-((x + 5) * (x + 5) + (z + 5) * (z + 5)) / 2.0);
  return bowl + localTrap + 0.4;
}

function gradientLevel1(x, z) {
  let gx = 0.1 * x;
  let gz = 0.1 * z;
  const expL = Math.exp(-((x + 5) * (x + 5) + (z + 5) * (z + 5)) / 2.0);
  gx += (2 * 0.4 / 2.0) * (x + 5) * expL;
  gz += (2 * 0.4 / 2.0) * (z + 5) * expL;
  return { gx, gz };
}

// ── Level 3: 중급 — "로컬 미니마 + 모멘텀" ──
// 글로벌 최솟값: (1, 2) 깊이 -3.0 / 로컬들: -2.5 ~ -2.8
function lossLevel3(x, z) {
  const r2 = x * x + z * z;
  const bowl = 0.02 * r2;
  const globalMin = -3.0 * Math.exp(-((x - 1) * (x - 1) + (z - 2) * (z - 2)) / 1.5);
  const local1 = -2.8 * Math.exp(-((x + 4) * (x + 4) + (z + 1) * (z + 1)) / 2);
  const local2 = -2.5 * Math.exp(-((x - 4) * (x - 4) + (z - 3) * (z - 3)) / 2);
  const local3 = -2.6 * Math.exp(-((x + 2) * (x + 2) + (z - 4) * (z - 4)) / 1.5);
  const local4 = -2.5 * Math.exp(-((x - 2) * (x - 2) + (z + 4) * (z + 4)) / 1.5);
  const noise = 0.15 * Math.sin(2 * x) * Math.cos(2 * z);
  return bowl + globalMin + local1 + local2 + local3 + local4 + noise + 4;
}

function gradientLevel3(x, z) {
  const r2 = x * x + z * z;
  let gx = 0, gz = 0;
  gx += 0.04 * x;
  gz += 0.04 * z;

  const expG = Math.exp(-((x - 1) * (x - 1) + (z - 2) * (z - 2)) / 1.5);
  gx += (2 * 3.0 / 1.5) * (x - 1) * expG;
  gz += (2 * 3.0 / 1.5) * (z - 2) * expG;

  const expL1 = Math.exp(-((x + 4) * (x + 4) + (z + 1) * (z + 1)) / 2);
  gx += (2 * 2.8 / 2) * (x + 4) * expL1;
  gz += (2 * 2.8 / 2) * (z + 1) * expL1;

  const expL2 = Math.exp(-((x - 4) * (x - 4) + (z - 3) * (z - 3)) / 2);
  gx += (2 * 2.5 / 2) * (x - 4) * expL2;
  gz += (2 * 2.5 / 2) * (z - 3) * expL2;

  const expL3 = Math.exp(-((x + 2) * (x + 2) + (z - 4) * (z - 4)) / 1.5);
  gx += (2 * 2.6 / 1.5) * (x + 2) * expL3;
  gz += (2 * 2.6 / 1.5) * (z - 4) * expL3;

  const expL4 = Math.exp(-((x - 2) * (x - 2) + (z + 4) * (z + 4)) / 1.5);
  gx += (2 * 2.5 / 1.5) * (x - 2) * expL4;
  gz += (2 * 2.5 / 1.5) * (z + 4) * expL4;

  gx += 0.15 * 2 * Math.cos(2 * x) * Math.cos(2 * z);
  gz += 0.15 * Math.sin(2 * x) * (-2 * Math.sin(2 * z));

  return { gx, gz };
}

// ── Level 4: 고급 — "계곡 진동" ──
// x방향 급경사 + z방향 완경사 → 고학습률은 x에서 진동
// 글로벌 최솟값: (0, -3) / 노이즈 감소 (0.1→0.05)
function lossLevel4(x, z) {
  const steep   = 2.0 * x * x;
  const shallow = 0.04 * (z + 3) * (z + 3);
  const noise   = 0.05 * Math.sin(2 * x) * Math.cos(0.5 * z);
  return steep + shallow + noise + 0.5;
}

function gradientLevel4(x, z) {
  const gx = 4.0 * x + 0.1 * Math.cos(2 * x) * Math.cos(0.5 * z);
  const gz = 0.08 * (z + 3) - 0.025 * Math.sin(2 * x) * Math.sin(0.5 * z);
  return { gx, gz };
}

// ── Level 5: 마스터 — "종합 전략" ──
// 로컬 함정 7개 (깊이 -3.0 ~ -3.3) + 글로벌 최솟값 -3.5
// 글로벌 최솟값: (1, 1) / LR ~0.15 AND 모멘텀 ~0.7 필요
function lossLevel5(x, z) {
  const bowl      = 0.03 * (x * x + z * z);
  const globalMin = -3.5 * Math.exp(-((x - 1) * (x - 1) + (z - 1) * (z - 1)) / 1.2);
  const t1 = -3.0 * Math.exp(-((x + 4) * (x + 4) + (z - 1) * (z - 1)) / 1.5);
  const t2 = -3.1 * Math.exp(-((x + 2) * (x + 2) + (z + 4) * (z + 4)) / 1.5);
  const t3 = -3.2 * Math.exp(-((x - 4) * (x - 4) + (z + 2) * (z + 2)) / 1.5);
  const t4 = -3.0 * Math.exp(-((x + 1) * (x + 1) + (z - 4) * (z - 4)) / 1.5);
  const t5 = -3.3 * Math.exp(-((x - 3) * (x - 3) + (z - 4) * (z - 4)) / 1.5);
  const t6 = -3.0 * Math.exp(-((x - 2) * (x - 2) + (z + 3) * (z + 3)) / 1.2);
  const t7 = -3.1 * Math.exp(-(x * x + z * z) / 1.5);
  const noise = 0.2 * Math.sin(1.5 * x) * Math.cos(1.5 * z);
  return bowl + globalMin + t1 + t2 + t3 + t4 + t5 + t6 + t7 + noise + 4;
}

function gradientLevel5(x, z) {
  let gx = 0.06 * x;
  let gz = 0.06 * z;

  const expG = Math.exp(-((x - 1) * (x - 1) + (z - 1) * (z - 1)) / 1.2);
  gx += (2 * 3.5 / 1.2) * (x - 1) * expG;
  gz += (2 * 3.5 / 1.2) * (z - 1) * expG;

  const eT1 = Math.exp(-((x + 4) * (x + 4) + (z - 1) * (z - 1)) / 1.5);
  gx += (2 * 3.0 / 1.5) * (x + 4) * eT1;
  gz += (2 * 3.0 / 1.5) * (z - 1) * eT1;

  const eT2 = Math.exp(-((x + 2) * (x + 2) + (z + 4) * (z + 4)) / 1.5);
  gx += (2 * 3.1 / 1.5) * (x + 2) * eT2;
  gz += (2 * 3.1 / 1.5) * (z + 4) * eT2;

  const eT3 = Math.exp(-((x - 4) * (x - 4) + (z + 2) * (z + 2)) / 1.5);
  gx += (2 * 3.2 / 1.5) * (x - 4) * eT3;
  gz += (2 * 3.2 / 1.5) * (z + 2) * eT3;

  const eT4 = Math.exp(-((x + 1) * (x + 1) + (z - 4) * (z - 4)) / 1.5);
  gx += (2 * 3.0 / 1.5) * (x + 1) * eT4;
  gz += (2 * 3.0 / 1.5) * (z - 4) * eT4;

  const eT5 = Math.exp(-((x - 3) * (x - 3) + (z - 4) * (z - 4)) / 1.5);
  gx += (2 * 3.3 / 1.5) * (x - 3) * eT5;
  gz += (2 * 3.3 / 1.5) * (z - 4) * eT5;

  const eT6 = Math.exp(-((x - 2) * (x - 2) + (z + 3) * (z + 3)) / 1.2);
  gx += (2 * 3.0 / 1.2) * (x - 2) * eT6;
  gz += (2 * 3.0 / 1.2) * (z + 3) * eT6;

  const eT7 = Math.exp(-(x * x + z * z) / 1.5);
  gx += (2 * 3.1 / 1.5) * x * eT7;
  gz += (2 * 3.1 / 1.5) * z * eT7;

  gx += 0.2 * 1.5 * Math.cos(1.5 * x) * Math.cos(1.5 * z);
  gz -= 0.2 * 1.5 * Math.sin(1.5 * x) * Math.sin(1.5 * z);

  return { gx, gz };
}

// ── Level 6: 중급 — "쌍봉 계곡" (Twin Peaks) ──
// 글로벌 최솟값: (-3, 0) — 미세하게 더 깊음 / 시작점: (0, 5)
function lossLevel6(x, z) {
  const bowl = 0.02 * (x * x + z * z);
  const leftValley = -2.55 * Math.exp(-((x + 3) * (x + 3) + z * z) / 2.0);
  const rightValley = -2.5 * Math.exp(-((x - 3) * (x - 3) + z * z) / 2.0);
  const ridge = 0.8 * Math.exp(-(x * x) / 1.0) * Math.exp(-(z * z) / 4.0);
  const noise = 0.08 * Math.sin(1.5 * x) * Math.cos(1.5 * z);
  return bowl + leftValley + rightValley + ridge + noise + 3.0;
}

function gradientLevel6(x, z) {
  let gx = 0.04 * x;
  let gz = 0.04 * z;
  const expL = Math.exp(-((x + 3) * (x + 3) + z * z) / 2.0);
  gx += (2 * 2.55 / 2.0) * (x + 3) * expL;
  gz += (2 * 2.55 / 2.0) * z * expL;
  const expR = Math.exp(-((x - 3) * (x - 3) + z * z) / 2.0);
  gx += (2 * 2.5 / 2.0) * (x - 3) * expR;
  gz += (2 * 2.5 / 2.0) * z * expR;
  const expRidgeX = Math.exp(-(x * x) / 1.0);
  const expRidgeZ = Math.exp(-(z * z) / 4.0);
  gx += 0.8 * (-2 * x / 1.0) * expRidgeX * expRidgeZ;
  gz += 0.8 * expRidgeX * (-2 * z / 4.0) * expRidgeZ;
  gx += 0.08 * 1.5 * Math.cos(1.5 * x) * Math.cos(1.5 * z);
  gz -= 0.08 * 1.5 * Math.sin(1.5 * x) * Math.sin(1.5 * z);
  return { gx, gz };
}

// ── Level 7: 고급 — "나선 계곡" (Spiral Valley) ──
// 글로벌 최솟값: (0, 0) / 시작점: (6, 6)
function lossLevel7(x, z) {
  const r = Math.sqrt(x * x + z * z);
  const theta = Math.atan2(z, x);
  const spiral = 0.5 * Math.sin(2 * theta - r * 1.2) * Math.exp(-r * 0.08);
  const funnel = 0.15 * r - 2.5 * Math.exp(-(r * r) / 3.0);
  const ridges = 0.6 * Math.cos(2 * theta - r * 1.2) * Math.exp(-r * 0.05) * (r > 1 ? 1 : r);
  const noise = 0.05 * Math.sin(3 * x) * Math.cos(3 * z);
  return funnel + spiral + ridges + noise + 3.0;
}

function gradientLevel7(x, z) {
  const r = Math.sqrt(x * x + z * z) + 1e-10;
  const theta = Math.atan2(z, x);
  const drx = x / r;
  const drz = z / r;
  const dtx = -z / (r * r);
  const dtz = x / (r * r);

  const spiralArg = 2 * theta - r * 1.2;
  const cosArg = Math.cos(spiralArg);
  const sinArg = Math.sin(spiralArg);
  const expDecay = Math.exp(-r * 0.08);
  const spiralGx = 0.5 * (cosArg * (2 * dtx - 1.2 * drx) * expDecay + sinArg * (-0.08 * drx) * expDecay);
  const spiralGz = 0.5 * (cosArg * (2 * dtz - 1.2 * drz) * expDecay + sinArg * (-0.08 * drz) * expDecay);

  const expFunnel = Math.exp(-(r * r) / 3.0);
  const funnelGx = 0.15 * drx + 2.5 * (2 * x / 3.0) * expFunnel;
  const funnelGz = 0.15 * drz + 2.5 * (2 * z / 3.0) * expFunnel;

  const ridgeArg = 2 * theta - r * 1.2;
  const cosRidge = Math.cos(ridgeArg);
  const sinRidge = Math.sin(ridgeArg);
  const expRidge = Math.exp(-r * 0.05);
  const rClamp = r > 1 ? 1 : r;
  const rClampDrx = r > 1 ? 0 : drx;
  const rClampDrz = r > 1 ? 0 : drz;
  const ridgeGx = 0.6 * (
    (-sinRidge) * (2 * dtx - 1.2 * drx) * expRidge * rClamp +
    cosRidge * (-0.05 * drx) * expRidge * rClamp +
    cosRidge * expRidge * rClampDrx
  );
  const ridgeGz = 0.6 * (
    (-sinRidge) * (2 * dtz - 1.2 * drz) * expRidge * rClamp +
    cosRidge * (-0.05 * drz) * expRidge * rClamp +
    cosRidge * expRidge * rClampDrz
  );

  const noiseGx = 0.05 * 3 * Math.cos(3 * x) * Math.cos(3 * z);
  const noiseGz = -0.05 * 3 * Math.sin(3 * x) * Math.sin(3 * z);

  return {
    gx: funnelGx + spiralGx + ridgeGx + noiseGx,
    gz: funnelGz + spiralGz + ridgeGz + noiseGz,
  };
}

// ── Level 8: 마스터 — "절벽과 평원" (Cliff and Plateau) + 롤러코스터 ──
// 글로벌 최솟값: (-5, -5) / 시작점: (3, 3)
function lossLevel8(x, z) {
  const plateau = 2.0 / (1 + Math.exp(-0.8 * (x + z - 2)));
  const cliff = -3.5 / (1 + Math.exp(1.5 * (x + z + 4)));
  const globalMin = -4.0 * Math.exp(-((x + 5) * (x + 5) + (z + 5) * (z + 5)) / 3.0);
  const rollerX = 1.5 * Math.sin(0.4 * x) * Math.exp(-0.01 * x * x);
  const rollerZ = 1.5 * Math.cos(0.4 * z) * Math.exp(-0.01 * z * z);
  const hill1 = 2.0 * Math.exp(-((x - 8) * (x - 8) + (z + 3) * (z + 3)) / 6.0);
  const hill2 = 1.8 * Math.exp(-((x + 8) * (x + 8) + (z - 8) * (z - 8)) / 5.0);
  const valley1 = -2.0 * Math.exp(-((x - 3) * (x - 3) + (z + 8) * (z + 8)) / 4.0);
  const valley2 = -1.8 * Math.exp(-((x + 10) * (x + 10) + z * z) / 5.0);
  const localTrap = -2.5 * Math.exp(-((x + 2) * (x + 2) + (z + 2) * (z + 2)) / 2.0);
  const noise = 0.1 * Math.sin(0.8 * x) * Math.cos(0.8 * z);
  return plateau + cliff + globalMin + rollerX + rollerZ + hill1 + hill2 + valley1 + valley2 + localTrap + noise + 4.0;
}

function gradientLevel8(x, z) {
  let gx = 0, gz = 0;
  const sigP = 1.0 / (1 + Math.exp(-0.8 * (x + z - 2)));
  const dPlat = 2.0 * 0.8 * sigP * (1 - sigP);
  gx += dPlat; gz += dPlat;

  const sigC = 1.0 / (1 + Math.exp(1.5 * (x + z + 4)));
  const dCliff = 3.5 * 1.5 * sigC * (1 - sigC);
  gx += dCliff; gz += dCliff;

  const expG = Math.exp(-((x + 5) * (x + 5) + (z + 5) * (z + 5)) / 3.0);
  gx += (2 * 4.0 / 3.0) * (x + 5) * expG;
  gz += (2 * 4.0 / 3.0) * (z + 5) * expG;

  const expRX = Math.exp(-0.01 * x * x);
  gx += 1.5 * (0.4 * Math.cos(0.4 * x) * expRX + Math.sin(0.4 * x) * (-0.02 * x) * expRX);
  const expRZ = Math.exp(-0.01 * z * z);
  gz += 1.5 * (-0.4 * Math.sin(0.4 * z) * expRZ + Math.cos(0.4 * z) * (-0.02 * z) * expRZ);

  const expH1 = Math.exp(-((x - 8) * (x - 8) + (z + 3) * (z + 3)) / 6.0);
  gx += 2.0 * (-2 * (x - 8) / 6.0) * expH1;
  gz += 2.0 * (-2 * (z + 3) / 6.0) * expH1;

  const expH2 = Math.exp(-((x + 8) * (x + 8) + (z - 8) * (z - 8)) / 5.0);
  gx += 1.8 * (-2 * (x + 8) / 5.0) * expH2;
  gz += 1.8 * (-2 * (z - 8) / 5.0) * expH2;

  const expV1 = Math.exp(-((x - 3) * (x - 3) + (z + 8) * (z + 8)) / 4.0);
  gx += (2 * 2.0 / 4.0) * (x - 3) * expV1;
  gz += (2 * 2.0 / 4.0) * (z + 8) * expV1;

  const expV2 = Math.exp(-((x + 10) * (x + 10) + z * z) / 5.0);
  gx += (2 * 1.8 / 5.0) * (x + 10) * expV2;
  gz += (2 * 1.8 / 5.0) * z * expV2;

  const expLT = Math.exp(-((x + 2) * (x + 2) + (z + 2) * (z + 2)) / 2.0);
  gx += (2 * 2.5 / 2.0) * (x + 2) * expLT;
  gz += (2 * 2.5 / 2.0) * (z + 2) * expLT;

  gx += 0.1 * 0.8 * Math.cos(0.8 * x) * Math.cos(0.8 * z);
  gz -= 0.1 * 0.8 * Math.sin(0.8 * x) * Math.sin(0.8 * z);

  return { gx, gz };
}

// ── 레벨별 손실함수 / 그래디언트 디스패치 ──
export function lossFunctionByLevel(x, z, level) {
  if (level === 1) return lossLevel1(x, z);
  if (level === 3) return lossLevel3(x, z);
  if (level === 4) return lossLevel4(x, z);
  if (level === 5) return lossLevel5(x, z);
  if (level === 6) return lossLevel6(x, z);
  if (level === 7) return lossLevel7(x, z);
  if (level === 8) return lossLevel8(x, z);
  return lossFunction(x, z); // Level 2 = 기존 맵
}

export function gradientByLevel(x, z, level) {
  if (level === 1) return gradientLevel1(x, z);
  if (level === 3) return gradientLevel3(x, z);
  if (level === 4) return gradientLevel4(x, z);
  if (level === 5) return gradientLevel5(x, z);
  if (level === 6) return gradientLevel6(x, z);
  if (level === 7) return gradientLevel7(x, z);
  if (level === 8) return gradientLevel8(x, z);
  return gradient(x, z); // Level 2 = 기존 맵
}

// 레벨별 글로벌 최솟값 위치 — 수렴 판정에 사용
export const GLOBAL_MINIMA = {
  1: { x: 0, z: 0 },    // Level 1: 포물면 꼭짓점
  2: { x: 0, z: 2 },    // Level 2: 글로벌 최솟값
  3: { x: 1, z: 2 },    // Level 3: 글로벌 최솟값
  4: { x: 0, z: -3 },   // Level 4: 긴 계곡 최솟값
  5: { x: 1, z: 1 },    // Level 5: 함정 미로 최솟값
  6: { x: -3, z: 0 },   // Level 6: 왼쪽 계곡
  7: { x: 0, z: 0 },    // Level 7: 나선 중심
  8: { x: -5, z: -5 },  // Level 8: 절벽 아래
};
