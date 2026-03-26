/**
 * 매칭 알고리즘 — 역할 순환 보장
 *
 * 원칙:
 * 1. 이전 심판 → 이번에 반드시 응답자 (또는 관찰자)
 * 2. 이전 응답자 → 이번에 반드시 심판 (또는 관찰자)
 * 3. 이전 관찰자 → 절대 연속 관찰자 금지, 심판 우선 배정
 * 4. 홀수 팀: 관찰자를 그룹 균형 맞춰 선택
 */

import { shuffle } from './utils.js'

/**
 * 라운드 데이터 생성
 * @param {Array} teams - 팀 배열 [{id, name, ...}]
 * @param {number} totalTurns - 총 턴 수 (짝수 권장)
 * @param {Object} previousRoles - 이전 라운드 역할 { teamId: 'judge'|'respondent'|'observer' }
 * @returns {{ pairs, soloObserver, observerTargetTeamId, teamTurns }}
 */
export function createRound(teams, totalTurns, previousRoles = {}) {
  const all = shuffle([...teams])

  // ── 1단계: 이전 역할별 분류 ──
  const prevJudges = all.filter((t) => previousRoles[t.id] === 'judge')
  const prevRespondents = all.filter((t) => previousRoles[t.id] === 'respondent')
  const prevObservers = all.filter((t) => previousRoles[t.id] === 'observer')
  const prevNone = all.filter((t) => !previousRoles[t.id])

  // ── 2단계: 홀수 팀이면 관찰자 1명 선택 ──
  // 핵심: 관찰자를 뽑은 뒤 "이번 심판 후보"와 "이번 응답자 후보"가 같은 수가 되어야 한다
  //   이번 심판 후보(wantJudge) = 이전 응답자 + 이전 관찰자 + 신규
  //   이번 응답자 후보(wantRespondent) = 이전 심판
  //   → jCount <= (N-1)/2 이면 wantJudge 풀에서, 아니면 wantRespondent 풀에서 관찰자를 뽑으면 균형
  let soloObserver = null
  if (all.length % 2 === 1) {
    const candidates = all.filter((t) => previousRoles[t.id] !== 'observer')
    if (candidates.length === 0) {
      // 극히 예외: 모두 이전 관찰자 → 아무나
      soloObserver = all[all.length - 1]
    } else {
      const jCount = prevJudges.length
      const halfFloor = Math.floor((all.length - 1) / 2)

      let picked = null
      if (jCount <= halfFloor) {
        // 이전 심판이 적거나 같음 → 비-심판 풀(wantJudge)에서 관찰자를 뽑아 균형
        picked = candidates.find((t) => previousRoles[t.id] === 'respondent')
            || candidates.find((t) => !previousRoles[t.id])
            || candidates.find((t) => previousRoles[t.id] !== 'judge')
      } else {
        // 이전 심판이 많음 → 심판 풀(wantRespondent)에서 관찰자를 뽑아 균형
        picked = candidates.find((t) => previousRoles[t.id] === 'judge')
      }
      soloObserver = picked || candidates[candidates.length - 1]
    }

    const obsIdx = all.findIndex((t) => t.id === soloObserver.id)
    if (obsIdx !== -1) all.splice(obsIdx, 1)
  }

  // ── 3단계: 역할 순환 페어링 ──
  // "이번에 심판이 되어야 할 팀" vs "이번에 응답자가 되어야 할 팀"으로 분리
  const wantJudge = []     // 이전 응답자/관찰자/신규 → 이번에 심판
  const wantRespondent = [] // 이전 심판 → 이번에 응답자

  for (const t of all) {
    if (previousRoles[t.id] === 'judge') {
      wantRespondent.push(t)
    } else {
      wantJudge.push(t)
    }
  }

  const pairs = []

  // 이상적 매칭: wantJudge에서 심판, wantRespondent에서 응답자
  while (wantJudge.length > 0 && wantRespondent.length > 0) {
    pairs.push([wantJudge.pop(), wantRespondent.pop()])
  }

  // 남은 팀끼리 (같은 역할이었던 팀들 — 불가피한 경우)
  const leftover = [...wantJudge, ...wantRespondent]
  shuffle(leftover)
  for (let i = 0; i < leftover.length - 1; i += 2) {
    pairs.push([leftover[i], leftover[i + 1]])
  }

  // 페어 순서 셔플 (매치 번호 예측 방지)
  shuffle(pairs)

  const humanTurns = Math.floor(totalTurns / 2)
  const aiTurns = totalTurns - humanTurns

  // 심판 팀(첫번째)에만 턴 순서 배정 — 응답 팀(두번째)은 질문하지 않음
  const teamTurns = {}

  for (const [judgeTeam, _respondentTeam] of pairs) {
    teamTurns[judgeTeam.id] = generateTurnOrder(humanTurns, aiTurns)
  }

  let observerTargetTeamId = null
  if (soloObserver) {
    observerTargetTeamId = pairs[0]?.[0]?.id ?? null
    if (observerTargetTeamId) {
      teamTurns[soloObserver.id] = [...teamTurns[observerTargetTeamId]]
    } else {
      teamTurns[soloObserver.id] = generateTurnOrder(humanTurns, aiTurns)
    }
  }

  return { pairs, soloObserver, observerTargetTeamId, teamTurns }
}

/**
 * 턴 순서 배열 생성 — 'human' n개 + 'ai' m개를 랜덤 셔플
 * @param {number} humanCount
 * @param {number} aiCount
 * @returns {string[]} e.g. ['human','ai','ai','human',...]
 */
function generateTurnOrder(humanCount, aiCount) {
  const order = [
    ...Array(humanCount).fill('human'),
    ...Array(aiCount).fill('ai'),
  ]
  return shuffle(order)
}

/**
 * 팀의 역할 조회
 * @param {Array} pairs - [[judgeTeam, respondentTeam], ...]
 * @param {number} teamId
 * @returns {'judge'|'respondent'|null}
 */
export function getRole(pairs, teamId) {
  for (const [judge, respondent] of pairs) {
    if (judge.id === teamId) return 'judge'
    if (respondent.id === teamId) return 'respondent'
  }
  return null
}

/**
 * 팀의 파트너 팀 조회
 * @param {Array} pairs - [[teamA, teamB], ...]
 * @param {number} teamId
 * @returns {object|null} 파트너 팀 객체, 없으면 null
 */
export function getPartner(pairs, teamId) {
  for (const [a, b] of pairs) {
    if (a.id === teamId) return b
    if (b.id === teamId) return a
  }
  return null
}

/**
 * 페어링 배열을 DB 저장용 형식으로 변환
 * @param {Array} pairs - [[teamA, teamB], ...]
 * @returns {Array} [{teamAId, teamBId}, ...]
 */
export function pairingsToRecords(pairs, observerTeamId = null, observerTargetTeamId = null) {
  return pairs.map(([a, b]) => ({
    teamAId: a.id,
    teamBId: b.id,
    observerTeamId: observerTargetTeamId === a.id || observerTargetTeamId === b.id ? observerTeamId : null,
  }))
}
