/**
 * 매칭 알고리즘 (설계서 Section 10)
 *
 * - 팀을 2개씩 페어링 (라운드마다 셔플)
 * - 각 팀별 턴 순서 생성: 사람/AI 정확히 반반, 랜덤 순서
 * - 홀수 팀: 마지막 팀은 관찰 전용 심판
 */

import { shuffle } from './utils.js'

/**
 * 라운드 데이터 생성
 * @param {Array} teams - 팀 배열 [{id, name, ...}]
 * @param {number} totalTurns - 총 턴 수 (짝수 권장)
 * @returns {{ pairs, soloObserver, observerTargetTeamId, teamTurns }}
 */
export function createRound(teams, totalTurns) {
  const shuffled = shuffle(teams)
  const pairs = []

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]])
  }

  const soloObserver = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1] : null

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
