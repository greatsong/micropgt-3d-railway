// 튜토리얼 캡처 3차 — 교사 화면: 진행 중 아레나(상단), 매치 카드 클릭 라이브 채팅, 수업 완전 종료 분석 화면
// 교사 페이지가 세션을 만들고(소유자), 봇 4팀이 참가해 라운드를 자동 진행한다.
// 실행: node scripts/capture-tutorial-teacher.mjs <playwright-core가 있는 node_modules> [출력 폴더]
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
const appRequire = createRequire(import.meta.url)
const pwRequire = createRequire(process.argv[2] + '/')
const { chromium } = pwRequire('playwright-core')
const { io } = appRequire('socket.io-client')

const HOST = 'http://localhost:4999'
const BASE = `${HOST}/turing-test`
const API = `${BASE}/api`
const OUT = process.argv[3] || path.resolve('public/tutorial/img')
const CODE = 'ai-arena'
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const post = async (p, b, h = {}) => { const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p} ${r.status} ${d.error}`); return d }
const connect = () => new Promise((res, rej) => { const s = io(HOST, { path: '/turing-test/socket.io', transports: ['websocket'] }); s.on('connect', () => res(s)); s.on('connect_error', rej) })
const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts }); log('📸', name) }
const safe = async (label, fn) => { try { await fn() } catch (e) { log(`!! ${label}: ${e.message}`) } }
const TURNS = 4, DELAY = 6
const QUESTIONS = ['좋아하는 음식이 뭐야?', '주말에 보통 뭐 해?', '요즘 뭐에 빠져 있어?', '좋아하는 계절은?']
const ANSWERS = ['떡볶이 좋아해', '집에서 쉬어', '게임이지', '가을이 좋아']

const { token } = await post('/auth/teacher', { pin: '000000' })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR' })
const T = await desktop.newPage()
await T.goto(`${BASE}/teacher`, { waitUntil: 'networkidle' })
await T.fill('input[type=password]', '000000'); await T.keyboard.press('Enter')
await T.waitForSelector('text=수업 세션 만들기', { timeout: 10000 })
await T.fill('input[placeholder="예: ai-leader"]', CODE)
await T.click('text=세션 열기')
await T.waitForSelector('text=참가 링크 복사', { timeout: 10000 })
const session = await post('/session', { teacherCode: CODE, mode: 'join' })
log('세션', session.id)

const bots = []
for (let i = 1; i <= 4; i++) bots.push(await post(`/session/${session.id}/team`, { name: `${i}조`, members: [`학생${i}A`, `학생${i}B`] }))
const socks = []
for (const t of bots) {
  const s = await connect(); socks.push({ s, team: t })
  s.emit('team:join', { sessionId: session.id, teamId: t.id })
  s.on('turn:question-received', ({ turnNum }) => setTimeout(() => s.emit('respondent:send-answer', { sessionId: session.id, teamId: t.id, message: ANSWERS[(turnNum - 1) % 4] }), 1200))
}
const ts = await connect(); ts.emit('teacher:join', { sessionId: session.id, token })
ts.on('error', (e) => log('teacher error:', e.message))
await wait(1200)
const startedP = new Promise((r) => ts.once('round:started', r))
ts.emit('round:start', { sessionId: session.id, token, style: '사극체', turns: TURNS, chatTime: 240, responseDelay: DELAY, voteTime: 90, pointValue: 1, aiModel: 'gemini', briefingTime: 0 })
const started = await startedP
const judges = socks.filter((b) => started.teams.find((t) => t.id === b.team.id)?.role === 'judge')
log('질문 팀:', judges.map((b) => b.team.name).join(', '))
const askLoop = async (b) => {
  for (let k = 0; k < TURNS; k++) {
    const p = new Promise((r) => b.s.once('turn:answer-delivered', r))
    b.s.emit('judge:send-question', { sessionId: session.id, teamId: b.team.id, message: QUESTIONS[k] })
    await Promise.race([p, wait((DELAY + 20) * 1000)])
    await wait(1200)
  }
}
const loops = Promise.all(judges.map(askLoop))
await wait((DELAY + 4) * 1000) // 첫 턴이 끝난 뒤
await T.evaluate(() => window.scrollTo(0, 0)); await wait(400)
await shot(T, 't07_arena_live')
await safe('라이브 채팅', async () => {
  await T.locator('button', { hasText: 'MATCH 1' }).first().click()
  await wait(1500)
  await T.locator('text=LIVE CHAT').first().scrollIntoViewIfNeeded(); await wait(300)
  await shot(T, 't08_live_chat')
  await T.evaluate(() => window.scrollTo(0, 0))
})
await loops
await wait(2500)
await safe('투표 단계', async () => { await T.evaluate(() => window.scrollTo(0, 0)); await wait(500); await shot(T, 't09_vote_phase') })
for (const b of judges) b.s.emit('vote:submit', { sessionId: session.id, teamId: b.team.id, votes: Array.from({ length: TURNS }, (_, k) => ({ turn: k + 1, verdict: k % 2 ? 'human' : 'ai' })) })
await wait(800)
ts.emit('round:force-end-vote', { sessionId: session.id, token }); await wait(1200)
const resP = new Promise((r) => ts.once('round:results', r))
ts.emit('round:reveal', { sessionId: session.id, token }); await resP; await wait(2000)

// 수업 완전 종료 → 분석 화면
await T.evaluate(() => window.scrollTo(0, 0))
await T.click('text=수업 완전 종료'); await wait(600)
await shot(T, 't12_close_confirm')
await T.locator('button:has-text("종료")').last().click()
await T.waitForSelector('text=라운드별 결과', { timeout: 15000 })
await wait(1000)
await shot(T, 't13_closed')
await safe('종료 전체', async () => shot(T, 't13_closed_full', { fullPage: true }))
socks.forEach((b) => b.s.disconnect()); ts.disconnect()
await browser.close()
log('완료')
process.exit(0)
