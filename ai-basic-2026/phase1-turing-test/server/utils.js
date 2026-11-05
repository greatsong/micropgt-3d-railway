import crypto from 'crypto'

// nanoid 대체 — 의존성 없이 고유 ID 생성. 세션 id는 입장 권한과 이어지므로 암호학적 난수를 쓴다
export function nanoid(size = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < size; i++) {
    id += chars[crypto.randomInt(chars.length)]
  }
  return id
}

/** 학생 입장 토큰 — 수업 코드를 아는 사람에게만 주고 팀·소켓 요청에서 확인한다 */
export function createJoinToken() {
  return crypto.randomBytes(24).toString('hex')
}

/** 무인증·학생 응답에서 실명을 가린다: "김철수" → "김○○" */
export function maskName(name) {
  const chars = Array.from(String(name ?? ''))
  if (chars.length === 0) return ''
  return chars[0] + '○'.repeat(Math.max(1, chars.length - 1))
}

/** 길이가 달라도 시간 차이가 드러나지 않는 문자열 비교 */
export function safeEqual(input, expected) {
  if (typeof input !== 'string' || typeof expected !== 'string' || !expected) return false
  const a = crypto.createHash('sha256').update(input).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

// 배열 셔플 (Fisher-Yates)
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildSharedRankings(items, scoreKey = 'totalScore') {
  let previousScore = null
  let previousRank = 0

  return items.map((item, index) => {
    const score = item[scoreKey]
    const rank = score === previousScore ? previousRank : index + 1
    previousScore = score
    previousRank = rank
    return {
      ...item,
      rank,
      isTie: index > 0 && score === items[index - 1][scoreKey],
    }
  })
}
