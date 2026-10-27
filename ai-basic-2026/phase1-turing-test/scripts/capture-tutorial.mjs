// 튜토리얼용 화면 캡처 — 로컬 서버(PORT=4999, TEACHER_PIN=000000)에서 교사·학생 흐름을 자동 진행하며 스크린샷을 찍는다.
// 실행: node scripts/capture-tutorial.mjs <playwright-core가 있는 node_modules> [출력 폴더=public/tutorial/img]
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
const CODE = 'ai-leader'
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const post = async (p, b, h = {}) => { const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${p} ${r.status} ${d.error}`); return d }
const connect = () => new Promise((res, rej) => { const s = io(HOST, { path: '/turing-test/socket.io', transports: ['websocket'] }); s.on('connect', () => res(s)); s.on('connect_error', rej) })
const shot = async (page, name, opts = {}) => { await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts }); log('📸', name) }
const safe = async (label, fn) => { try { await fn() } catch (e) { log(`!! ${label}: ${e.message}`) } }

const { token } = await post('/auth/teacher', { pin: '000000' })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR' })
const mobile = async () => browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' })

// ── 교사: 입장 → 세션 생성 ──
const T = await desktop.newPage()
await T.goto(`${BASE}/teacher`, { waitUntil: 'networkidle' })
await shot(T, 't01_login')
await T.fill('input[type=password]', '000000')
await T.keyboard.press('Enter')
await T.waitForSelector('text=수업 세션 만들기', { timeout: 10000 })
await T.fill('input[placeholder="예: ai-leader"]', CODE)
await shot(T, 't02_session_create')
await T.click('text=세션 열기')
await T.waitForSelector('text=참가 링크 복사', { timeout: 10000 })
await wait(800)
await shot(T, 't03_dashboard_empty')
const session = await post('/session', { teacherCode: CODE, mode: 'join' })
log('세션', session.id, session.teacher_code)

// ── 학생 A: 링크로 입장 → 팀 만들기 ──
const ctxA = await mobile(); const A = await ctxA.newPage()
await A.goto(`${BASE}/?code=${CODE}`, { waitUntil: 'networkidle' })
await A.waitForSelector('text=우리 팀 만들기', { timeout: 10000 })
await wait(500)
await shot(A, 's01_join', { fullPage: false })
await A.fill('input[placeholder="팀 이름"]', '1조')
await A.fill('input[placeholder="팀원 1 이름"]', '민수')
await A.fill('input[placeholder="팀원 2 이름 (선택)"]', '지우')
await safe('팀 폼 캡처', async () => { await A.locator('text=우리 팀 만들기').scrollIntoViewIfNeeded(); await shot(A, 's02_team_form') })
await A.click('text=팀 만들고 입장')
await A.waitForSelector('text=대기', { timeout: 10000 })
await wait(800)
await shot(A, 's03_waiting')

// ── 학생 B + 봇 팀 ──
const ctxB = await mobile(); const B = await ctxB.newPage()
await B.goto(`${BASE}/?code=${CODE}`, { waitUntil: 'networkidle' })
await B.waitForSelector('text=우리 팀 만들기', { timeout: 10000 })
await B.fill('input[placeholder="팀 이름"]', '2조')
await B.fill('input[placeholder="팀원 1 이름"]', '서연')
await B.click('text=팀 만들고 입장')
await B.waitForSelector('text=대기', { timeout: 10000 })
const bots = []
for (let i = 3; i <= 6; i++) bots.push(await post(`/session/${session.id}/team`, { name: `${i}조`, members: [`학생${i}A`, `학생${i}B`] }))
const sockets = []
const QUESTIONS = ['좋아하는 음식이 뭐야?', '주말에 보통 뭐 해?', '요즘 뭐에 빠져 있어?', '좋아하는 계절은?']
const ANSWERS = ['떡볶이 좋아해', '집에서 쉬어', '게임이지', '가을이 좋아']
for (const t of bots) {
  const s = await connect(); sockets.push({ s, team: t, role: null, turn: 0 })
  s.emit('team:join', { sessionId: session.id, teamId: t.id })
  s.on('turn:question-received', ({ turnNum }) => setTimeout(() => s.emit('respondent:send-answer', { sessionId: session.id, teamId: t.id, message: ANSWERS[(turnNum - 1) % 4] }), 1200))
}
const teacherSock = await connect()
teacherSock.emit('teacher:join', { sessionId: session.id, token })
teacherSock.on('error', (e) => log('teacher error:', e.message))
await wait(1500)
await shot(T, 't04_dashboard_teams')
await safe('라운드 설정 캡처', async () => { const el = T.locator('section.panel', { hasText: 'ROUND SETUP' }); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(OUT, 't05_round_setup.png') }); log('📸 t05_round_setup') })

// ── 라운드 시작 (브리핑 15초) ──
const TURNS = 4, DELAY = 8
const roundStartedP = new Promise((r) => teacherSock.once('round:started', r))
teacherSock.emit('round:start', { sessionId: session.id, token, style: '자연스러운대화', turns: TURNS, chatTime: 240, responseDelay: DELAY, voteTime: 90, pointValue: 1, aiModel: 'claude', briefingTime: 15 })
const started = await roundStartedP
const roleOf = (teamName) => started.teams.find((t) => t.name === teamName)?.role
log('역할:', started.teams.map((t) => `${t.name}=${t.role}`).join(', '))
for (const b of sockets) b.role = roleOf(b.team.name)
await wait(2500)
await shot(A, `s04_briefing_${roleOf('1조')}`)
await shot(B, `s04_briefing_${roleOf('2조')}`)
await shot(T, 't06_arena_briefing')
await wait(14000) // 브리핑 종료
// 봇 질문자: 순서대로 질문
const botJudges = sockets.filter((b) => b.role === 'judge')
const askLoop = async (b) => {
  for (let k = 0; k < TURNS; k++) {
    const p = new Promise((r) => b.s.once('turn:answer-delivered', r))
    b.s.emit('judge:send-question', { sessionId: session.id, teamId: b.team.id, message: QUESTIONS[k % 4] })
    await Promise.race([p, wait((DELAY + 20) * 1000)])
    await wait(1500)
  }
}
botJudges.forEach((b) => { askLoop(b) })

// 플레이라이트 학생 페이지 진행
const pages = [{ page: A, name: '1조', role: roleOf('1조'), tag: 'A' }, { page: B, name: '2조', role: roleOf('2조'), tag: 'B' }]
const judgeTeamIds = { '1조': session.teams?.find?.((t) => t.name === '1조')?.id }
const playJudge = async ({ page, name }) => {
  for (let k = 0; k < TURNS; k++) {
    await page.fill('input[placeholder="메시지를 입력하세요..."]', QUESTIONS[k % 4])
    await page.keyboard.press('Enter')
    if (k === 0) { await wait(2500); await shot(page, 's05_judge_waiting') }
    await wait((DELAY + 2) * 1000)
    if (k === 1) await shot(page, 's06_judge_chat')
  }
}
const playRespondent = async ({ page, name }) => {
  const deadline = Date.now() + (TURNS * (DELAY + 6) + 30) * 1000
  let gotAi = false, gotHuman = false
  while (Date.now() < deadline) {
    const answerBox = page.locator('textarea[placeholder^="자연스럽게 답변"], input[placeholder^="자연스럽게 답변"]')
    const fake = page.locator('[placeholder="타이핑하는 척하세요..."]')
    if (await answerBox.count()) {
      if (!gotHuman) { await shot(page, 's07_respondent_question'); gotHuman = true }
      await answerBox.first().fill('떡볶이 좋아해')
      await page.keyboard.press('Enter')
      await wait(1500)
    } else if (await fake.count()) {
      if (!gotAi) { await shot(page, 's08_respondent_ai_turn'); gotAi = true }
      await wait(2000)
    } else {
      await wait(1000)
    }
    if (await page.locator('text=투표').count() && await page.locator('text=턴').count() === 0) break
  }
}
await Promise.all(pages.map((p) => (p.role === 'judge' ? playJudge(p) : playRespondent(p))))
await safe('라이브 매치 캡처', async () => { await shot(T, 't07_arena_live'); await T.locator('text=MATCH 1').first().click(); await wait(1500); await shot(T, 't08_live_chat') })

// ── 투표 ──
await wait(3000)
teacherSock.emit('round:force-end-chat', { sessionId: session.id, token })
await wait(2500)
const judgePage = pages.find((p) => p.role === 'judge')
const respPage = pages.find((p) => p.role !== 'judge')
await safe('투표 캡처', async () => {
  if (judgePage) {
    await shot(judgePage.page, 's09_vote')
    const humanBtns = judgePage.page.locator('button', { hasText: '사람' })
    const n = await humanBtns.count()
    for (let i = 0; i < Math.min(n, TURNS); i++) await humanBtns.nth(i).click().catch(() => {})
    await shot(judgePage.page, 's09b_vote_filled')
  }
  if (respPage) await shot(respPage.page, 's09c_vote_waiting')
})
for (const b of botJudges) b.s.emit('vote:submit', { sessionId: session.id, teamId: b.team.id, votes: Array.from({ length: TURNS }, (_, k) => ({ turn: k + 1, verdict: k % 2 ? 'human' : 'ai' })) })
await shot(T, 't09_vote_phase')
await wait(1000)
teacherSock.emit('round:force-end-vote', { sessionId: session.id, token })
await wait(1500)
const resultsP = new Promise((r) => teacherSock.once('round:results', r))
teacherSock.emit('round:reveal', { sessionId: session.id, token })
await resultsP
await wait(2000)
await shot(T, 't10_results')
await safe('결과 전체 캡처', async () => shot(T, 't10_results_full', { fullPage: true }))
await shot(A, 's10_results_A'); await shot(B, 's10_results_B')
await safe('학생 결과 전체', async () => { await shot(A, 's10_results_full_A', { fullPage: true }) })

// ── 토너먼트 종료 ──
const finalP = new Promise((r) => teacherSock.once('tournament:final', r))
teacherSock.emit('tournament:end', { sessionId: session.id, token })
await finalP
await wait(2000)
await shot(T, 't11_final')
await safe('최종 전체', async () => shot(T, 't11_final_full', { fullPage: true }))
await shot(A, 's11_final_A')

// ── 수업 완전 종료 화면 (새 세션을 만들어 바로 종료) ──
await safe('완전 종료 화면', async () => {
  await T.click('text=새 수업 시작')
  await T.waitForSelector('text=수업 세션 만들기', { timeout: 10000 })
  await T.fill('input[placeholder="예: ai-leader"]', 'ai-demo')
  await T.click('text=세션 열기')
  await T.waitForSelector('text=참가 링크 복사', { timeout: 10000 })
  const s2 = await post('/session', { teacherCode: 'ai-demo', mode: 'join' })
  await T.click('text=수업 완전 종료')
  await wait(800)
  await shot(T, 't12_close_confirm')
  const confirm = T.locator('button', { hasText: '종료' }).last()
  await confirm.click()
  await wait(2000)
  await shot(T, 't13_closed')
})

await browser.close()
sockets.forEach((b) => b.s.disconnect()); teacherSock.disconnect()
log('완료:', fs.readdirSync(OUT).length, '장')
process.exit(0)
