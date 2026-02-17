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

// ── 손실 함수 ──
export function lossFunction(x, z) {
  const bowl = 0.03 * (x * x + z * z);
  const globalMin = -2.5 * Math.exp(-(x * x + (z - 2) * (z - 2)) / 3);
  const localMin1 = -1.0 * Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
  const localMin2 = -1.2 * Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
  const noise = 0.2 * Math.sin(x) * Math.cos(z);
  return bowl + globalMin + localMin1 + localMin2 + noise + 3;
}

export function gradient(x, z) {
  let gx = 0.06 * x;
  let gz = 0.06 * z;
  const expGlobal = Math.exp(-(x * x + (z - 2) * (z - 2)) / 3);
  gx += -2.5 * expGlobal * (-2 * x / 3);
  gz += -2.5 * expGlobal * (-2 * (z - 2) / 3);
  const expL1 = Math.exp(-((x + 3) * (x + 3) + (z + 2) * (z + 2)) / 2);
  gx += -1.0 * expL1 * (-2 * (x + 3) / 2);
  gz += -1.0 * expL1 * (-2 * (z + 2) / 2);
  const expL2 = Math.exp(-((x - 3) * (x - 3) + (z + 2) * (z + 2)) / 2);
  gx += -1.2 * expL2 * (-2 * (x - 3) / 2);
  gz += -1.2 * expL2 * (-2 * (z + 2) / 2);
  gx += 0.2 * Math.cos(x) * Math.cos(z);
  gz += 0.2 * Math.sin(x) * -Math.sin(z);
  return { gx, gz };
}
