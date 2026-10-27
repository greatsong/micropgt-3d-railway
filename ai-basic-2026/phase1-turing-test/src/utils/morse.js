/**
 * 모스 부호 배경음 — 외부 음원 없이 Web Audio API로 합성
 *
 * 블레츨리 파크 분위기의 저음 드론 위에 "IMITATION GAME" 모스 전신음이 띄엄띄엄 반복된다.
 * 브라우저 정책상 소리는 사용자가 한 번 클릭한 뒤에만 난다 (armBgmOnFirstGesture 또는 클릭 핸들러 안의 startBgm).
 * 음소거 여부는 localStorage에 기억한다 (이 브라우저에서만).
 * 음향 설계: Codex 제안(2026-10-27)을 검토 후 채택. 시작 화면(JoinPage)·미션 브리핑에서만 재생한다.
 */
const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
}
const MUTE_KEY = 'turing_test_sound_muted'
const BGM_TEXT = 'IMITATION GAME'
const UNIT = 0.085
const MASTER_VOLUME = 0.38
let ctx = null, master = null, session = null, loopTimer = null
let gestureHandler = null
let muted = (() => {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
})()

function resumeContext() {
  if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
    ctx.resume().catch(() => {})
  }
}

function ensureContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    try { ctx = new AudioContextClass() } catch { return null }
    master = ctx.createGain()
    master.gain.value = muted ? 0 : MASTER_VOLUME
    master.connect(ctx.destination)
    document.addEventListener('pointerdown', resumeContext, { passive: true })
    document.addEventListener('keydown', resumeContext)
  }
  resumeContext()
  return ctx
}

// 진행 중인 램프의 현재 값을 보존한 뒤 새 램프를 시작한다.
function hold(param, time) {
  if (typeof param.cancelAndHoldAtTime === 'function') {
    param.cancelAndHoldAtTime(time)
  } else {
    const value = param.value
    param.cancelScheduledValues(time)
    param.setValueAtTime(value, time)
  }
}

function track(source, owner, cleanup) {
  if (owner) owner.sources.add(source)
  source.onended = () => {
    if (owner) owner.sources.delete(source)
    source.disconnect()
    if (cleanup) cleanup()
  }
}

function beep(startAt, duration, frequency, volume, owner = null) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const filter = ctx.createBiquadFilter()
  const attack = Math.min(0.009, duration / 4)
  const release = Math.min(0.025, duration / 3)
  osc.type = 'triangle'
  osc.frequency.value = frequency
  filter.type = 'lowpass'
  filter.frequency.value = 1050
  filter.Q.value = 0.4
  gain.gain.setValueAtTime(0, startAt)
  gain.gain.linearRampToValueAtTime(volume, startAt + attack)
  gain.gain.setValueAtTime(volume, startAt + duration - release)
  gain.gain.linearRampToValueAtTime(0, startAt + duration)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(owner ? owner.bus : master)
  if (owner) gain.connect(owner.delay)
  track(osc, owner, () => { filter.disconnect(); gain.disconnect() })
  osc.start(startAt)
  osc.stop(startAt + duration + 0.01)
}

function scheduleMorse(text, startAt, owner) {
  let time = startAt
  const words = text.toUpperCase().trim().split(/\s+/)
  words.forEach((word, wi) => {
    const letters = [...word].map(ch => MORSE[ch]).filter(Boolean)
    letters.forEach((code, ci) => {
      ;[...code].forEach((symbol, si) => {
        const duration = UNIT * (symbol === '.' ? 1 : 3)
        beep(time, duration, 565, 0.085, owner)
        time += duration
        if (si < code.length - 1) time += UNIT
      })
      if (ci < letters.length - 1) time += UNIT * 3
    })
    if (wi < words.length - 1) time += UNIT * 7
  })
  return time
}

function startDrone(owner) {
  const now = ctx.currentTime
  const fade = ctx.createGain(), breath = ctx.createGain()
  const filter = ctx.createBiquadFilter(), depth = ctx.createGain()
  const lfo = ctx.createOscillator()
  filter.type = 'lowpass'
  filter.frequency.value = 190
  filter.Q.value = 0.45
  fade.gain.setValueAtTime(0, now)
  fade.gain.linearRampToValueAtTime(0.065, now + 2.8)
  breath.gain.value = 0.75
  depth.gain.value = 0.2
  lfo.frequency.value = 0.085
  lfo.connect(depth)
  depth.connect(breath.gain)
  filter.connect(breath)
  breath.connect(fade)
  fade.connect(owner.bus)
  const sources = [lfo]
  ;[[55, -5, 0.65], [55, 6, 0.55], [110, 2, 0.2], [82.5, -2, 0.12]]
    .forEach(([frequency, detune, level]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = frequency
      osc.detune.value = detune
      gain.gain.value = level
      osc.connect(gain)
      gain.connect(filter)
      sources.push(osc)
      owner.nodes.push(gain)
    })
  owner.nodes.push(fade, breath, filter, depth)
  sources.forEach(source => { track(source, owner); source.start(now) })
}

function loop() {
  const owner = session
  if (!owner) return
  if (ctx.state === 'running' && owner.next <= ctx.currentTime + 0.3) {
    let end = scheduleMorse(BGM_TEXT, Math.max(owner.next, ctx.currentTime + 0.08), owner)
    if (Math.random() < 0.35) {
      const letter = 'ETIKS'[Math.floor(Math.random() * 5)]
      end = scheduleMorse(letter, end + 1 + Math.random(), owner)
    }
    owner.next = end + 2 + Math.random() * 3
  }
  loopTimer = setTimeout(loop, 200)
}

export function startBgm() {
  if (!ensureContext() || session) return
  const bus = ctx.createGain(), delay = ctx.createDelay(0.5)
  const wet = ctx.createGain(), filter = ctx.createBiquadFilter()
  bus.connect(master)
  delay.delayTime.value = 0.145
  wet.gain.value = 0.075
  filter.type = 'lowpass'
  filter.frequency.value = 850
  delay.connect(filter)
  filter.connect(wet)
  wet.connect(bus)
  session = { bus, delay, sources: new Set(), nodes: [bus, delay, wet, filter], next: ctx.currentTime + 0.2 }
  startDrone(session)
  loop()
}

export function stopBgm() {
  if (gestureHandler) {
    document.removeEventListener('pointerdown', gestureHandler)
    document.removeEventListener('keydown', gestureHandler)
    gestureHandler = null
  }
  clearTimeout(loopTimer)
  loopTimer = null
  const owner = session
  session = null
  if (!owner) return
  const now = ctx.currentTime
  hold(owner.bus.gain, now)
  owner.bus.gain.linearRampToValueAtTime(0, now + 0.35)
  owner.sources.forEach(source => { try { source.stop(now + 0.36) } catch {} })
  const sentinel = ctx.createOscillator()
  sentinel.onended = () => { owner.nodes.forEach(node => node.disconnect()) }
  sentinel.start(now)
  sentinel.stop(now + 0.4)
}

export function isBgmRunning() { return session !== null }

export function armBgmOnFirstGesture() {
  if (gestureHandler || session) return
  gestureHandler = () => {
    document.removeEventListener('pointerdown', gestureHandler)
    document.removeEventListener('keydown', gestureHandler)
    gestureHandler = null
    startBgm()
  }
  document.addEventListener('pointerdown', gestureHandler)
  document.addEventListener('keydown', gestureHandler)
}

export function playArrival() {
  if (!ensureContext() || muted) return
  const now = ctx.currentTime + 0.01
  beep(now, 0.075, 700, 0.15)
  beep(now + 0.14, 0.16, 835, 0.13)
}

export function playDit() {
  if (!ensureContext() || muted) return
  beep(ctx.currentTime + 0.01, 0.065, 740, 0.13)
}

export function isMuted() { return muted }

export function setMuted(value) {
  muted = Boolean(value)
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch {}
  if (!master) return
  const now = ctx.currentTime
  hold(master.gain, now)
  master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_VOLUME, now + 0.08)
  if (!muted) resumeContext()
}
