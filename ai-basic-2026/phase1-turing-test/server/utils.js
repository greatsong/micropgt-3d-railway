// nanoid 대체 — 의존성 없이 짧은 고유 ID 생성
export function nanoid(size = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < size; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
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
