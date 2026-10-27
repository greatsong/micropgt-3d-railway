// 튜토리얼 캡처 2차 — 질문자 흐름(브리핑·질문·답변 도착·투표), 팀 만들기 폼, 수업 완전 종료 분석 화면
// 2팀(학생 페이지 1 + 봇 1)으로 라운드를 열고, 학생 페이지가 질문자가 될 때까지 최대 5번 다시 연다.
// 실행: node scripts/capture-tutorial-judge.mjs <playwright-core가 있는 node_modules> [출력 폴더]
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
fs.mkdirSync(OUT, { recursive: true })
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const post = async (p, b, h = {}) => { const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p} ${r.status} ${d.error}`); return d }
const connect = () => new Promise((res, rej) => { const s = io(HOST, { path: '/turing-test/socket.io', transports: ['websocket'] }); s.on('connect', () => res(s)); s.on('connect_error', rej) })
const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts }); log('📸', name) }
const safe = async (label, fn) => { try { await fn() } catch (e) { log(`!! ${label}: ${e.message}`) } }
const TURNS = 4, DELAY = 8
const QUESTIONS = ['좋아하는 음식이 뭐야?', '주말에 보통 뭐 해?', '요즘 뭐에 빠져 있어?', '좋아하는 계절은?']

const { token } = await post('/auth/teacher', { pin: '000000' })
const H = { 'x-teacher-token': token }
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' })
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR' })

let done = false
for (let attempt = 1; attempt <= 5 && !done; attempt++) {
  const code = `ai-judge${attempt}`
  const session = await post('/session', { teacherCode: code }, H)
  log(`시도 ${attempt}: 세션 ${session.id}`)
  const A = await mobile.newPage()
  await A.goto(`${BASE}/?code=${code}`, { waitUntil: 'networkidle' })
  await A.waitForSelector('h2:has-text("우리 팀 만들기")', { timeout: 10000 })
  await A.fill('input[placeholder="팀 이름"]', '1조')
  await A.fill('input[placeholder="팀원 1 이름"]', '민수')
  await A.fill('input[placeholder="팀원 2 이름 (선택)"]', '지우')
  if (attempt === 1) await safe('팀 폼', async () => { await A.locator('h2:has-text("우리 팀 만들기")').scrollIntoViewIfNeeded(); await wait(300); await shot(A, 's02_team_form') })
  await A.click('text=팀 만들고 입장')
  await A.waitForSelector('text=대기', { timeout: 10000 })
  const bot = await post(`/session/${session.id}/team`, { name: '2조', members: ['서연', '하준'] })
  const bs = await connect(); bs.emit('team:join', { sessionId: session.id, teamId: bot.id })
  bs.on('turn:question-received', ({ turnNum }) => setTimeout(() => bs.emit('respondent:send-answer', { sessionId: session.id, teamId: bot.id, message: ['떡볶이 좋아해', '집에서 쉬어', '게임이지', '가을이 좋아'][(turnNum - 1) % 4] }), 1500))
  const ts = await connect(); ts.emit('teacher:join', { sessionId: session.id, token })
  ts.on('error', (e) => log('teacher error:', e.message))
  await wait(800)
  const startedP = new Promise((r) => ts.once('round:started', r))
  ts.emit('round:start', { sessionId: session.id, token, style: '자연스러운대화', turns: TURNS, chatTime: 240, responseDelay: DELAY, voteTime: 90, pointValue: 1, aiModel: 'claude', briefingTime: 15 })
  const started = await startedP
  const myRole = started.teams.find((t) => t.name === '1조')?.role
  log('1조 역할:', myRole)
  if (myRole !== 'judge') {
    ts.emit('session:close', { sessionId: session.id, token }); await wait(800)
    bs.disconnect(); ts.disconnect(); await A.close()
    continue
  }
  // ── 질문자 흐름 ──
  await wait(2500)
  await shot(A, 's04_briefing_judge')
  await wait(14000)
  for (let k = 0; k < TURNS; k++) {
    await A.fill('input[placeholder="메시지를 입력하세요..."]', QUESTIONS[k])
    await A.keyboard.press('Enter')
    if (k === 0) { await wait(2500); await shot(A, 's05_judge_waiting') }
    await wait((DELAY + 3) * 1000)
    if (k === 1) await shot(A, 's06_judge_chat')
  }
  await wait(2000)
  await safe('투표 화면', async () => {
    await A.waitForSelector('text=최종 제출', { timeout: 20000 })
    await wait(800)
    await shot(A, 's09_vote')
    const humanBtns = A.locator('button:has-text("사람")')
    const n = await humanBtns.count()
    for (let i = 0; i < Math.min(n, 2); i++) await humanBtns.nth(i).click().catch(() => {})
    const aiBtns = A.locator('button:has-text("AI")')
    const m = await aiBtns.count()
    for (let i = 2; i < Math.min(m, TURNS); i++) await aiBtns.nth(i).click().catch(() => {})
    await wait(500)
    await shot(A, 's09b_vote_filled')
    await A.click('text=최종 제출')
    await wait(1000)
  })
  ts.emit('round:force-end-vote', { sessionId: session.id, token }); await wait(1200)
  const resP = new Promise((r) => ts.once('round:results', r))
  ts.emit('round:reveal', { sessionId: session.id, token }); await resP; await wait(1500)
  await shot(A, 's10_results_judge')
  await safe('결과 전체', async () => shot(A, 's10_results_judge_full', { fullPage: true }))

  // ── 교사: 이 세션을 수업 완전 종료 → 분석 화면 ──
  const T = await desktop.newPage()
  await T.goto(`${BASE}/teacher`, { waitUntil: 'networkidle' })
  await T.fill('input[type=password]', '000000'); await T.keyboard.press('Enter')
  await T.waitForSelector('text=수업 세션 만들기', { timeout: 10000 })
  await T.fill('input[placeholder="예: ai-leader"]', code)
  await T.click('text=세션 열기')
  await T.waitForSelector('text=참가 링크 복사', { timeout: 10000 })
  await wait(1200)
  await T.click('text=수업 완전 종료'); await wait(600)
  await shot(T, 't12_close_confirm')
  await T.locator('button:has-text("종료")').last().click()
  await T.waitForSelector('text=라운드별 결과', { timeout: 15000 })
  await wait(800)
  await shot(T, 't13_closed')
  await safe('종료 전체', async () => shot(T, 't13_closed_full', { fullPage: true }))
  await shot(A, 's12_closed')
  bs.disconnect(); ts.disconnect()
  done = true
}
await browser.close()
log(done ? '완료' : '질문자 역할을 5번 안에 얻지 못함')
process.exit(done ? 0 : 1)
