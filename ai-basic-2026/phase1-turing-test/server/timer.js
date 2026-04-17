/**
 * 타이머 모듈
 *
 * - 대화 시간 타이머 (chatTime)
 * - 투표 시간 타이머 (voteTime)
 * - 응답 딜레이 타이머 (responseDelay) — T=0 이후 정확히 D초 뒤 콜백
 * - timer:tick 이벤트 매초 발행
 */

export class RoundTimer {
  /**
   * @param {object} io - Socket.io 서버 인스턴스
   * @param {string} sessionId - 세션 ID
   */
  constructor(io, sessionId) {
    this.io = io
    this.sessionId = sessionId
    this._chatTimer = null
    this._voteTimer = null
    this._briefingTimer = null
    this._tickInterval = null
    this._remaining = 0
    this._phase = null // 'briefing' | 'chat' | 'vote'
  }

  // ── 브리핑(안내문 읽기) 타이머 ─────────────────────────────────────────
  /**
   * 안내문 읽기 시간 (대화 시간 소모 없이)
   * @param {number} seconds
   * @param {Function} onEnd - 끝나면 자동으로 chat 타이머 시작에 쓰이는 콜백
   */
  startBriefing(seconds, onEnd) {
    this._clear()
    this._phase = 'briefing'
    this._remaining = seconds
    this._startTick()

    this._briefingTimer = setTimeout(() => {
      this._clear()
      onEnd()
    }, seconds * 1000)
  }

  // ── 대화 타이머 ──────────────────────────────────────────────────────────
  /**
   * 대화 시간 시작
   * @param {number} seconds - 대화 시간 (초)
   * @param {Function} onEnd - 시간 종료 콜백
   */
  startChat(seconds, onEnd) {
    this._clear()
    this._phase = 'chat'
    this._remaining = seconds
    this._startTick()

    this._chatTimer = setTimeout(() => {
      this._clear()
      onEnd()
    }, seconds * 1000)
  }

  // ── 투표 타이머 ──────────────────────────────────────────────────────────
  /**
   * 투표 시간 시작
   * @param {number} seconds - 투표 시간 (초)
   * @param {Function} onEnd - 시간 종료 콜백
   */
  startVote(seconds, onEnd) {
    this._clear()
    this._phase = 'vote'
    this._remaining = seconds
    this._startTick()

    this._voteTimer = setTimeout(() => {
      this._clear()
      onEnd()
    }, seconds * 1000)
  }

  // ── 강제 종료 ─────────────────────────────────────────────────────────────
  forceEnd() {
    this._clear()
  }

  // ── 응답 딜레이 스케줄러 ─────────────────────────────────────────────────
  /**
   * T=0(질문 전송 시각)부터 정확히 delaySeconds 후에 콜백 실행
   * @param {number} questionSentAt - 질문 전송 시각 (Date.now())
   * @param {number} delaySeconds - 응답 딜레이 (초)
   * @param {Function} callback - 답변 전달 콜백
   * @returns {Function} 취소 함수
   */
  static scheduleDelivery(questionSentAt, delaySeconds, callback) {
    const elapsed = Date.now() - questionSentAt
    const remaining = Math.max(0, delaySeconds * 1000 - elapsed)

    const handle = setTimeout(callback, remaining)
    return () => clearTimeout(handle)
  }

  scheduleDelivery(questionSentAt, delaySeconds, callback) {
    return RoundTimer.scheduleDelivery(questionSentAt, delaySeconds, callback)
  }

  // ── 내부 메서드 ──────────────────────────────────────────────────────────
  _startTick() {
    this._tickInterval = setInterval(() => {
      this._remaining = Math.max(0, this._remaining - 1)
      this.io.to(`session:${this.sessionId}`).emit('timer:tick', {
        phase: this._phase,
        remaining: this._remaining,
      })
    }, 1000)
  }

  _clear() {
    if (this._chatTimer) { clearTimeout(this._chatTimer); this._chatTimer = null }
    if (this._voteTimer) { clearTimeout(this._voteTimer); this._voteTimer = null }
    if (this._briefingTimer) { clearTimeout(this._briefingTimer); this._briefingTimer = null }
    if (this._tickInterval) { clearInterval(this._tickInterval); this._tickInterval = null }
    this._phase = null
    this._remaining = 0
  }
}

/**
 * 세션별 타이머 저장소
 * key: sessionId, value: RoundTimer 인스턴스
 */
export const timerStore = new Map()

/**
 * 세션 타이머 반환 (없으면 생성)
 * @param {object} io
 * @param {string} sessionId
 * @returns {RoundTimer}
 */
export function getTimer(io, sessionId) {
  if (!timerStore.has(sessionId)) {
    timerStore.set(sessionId, new RoundTimer(io, sessionId))
  }
  return timerStore.get(sessionId)
}
