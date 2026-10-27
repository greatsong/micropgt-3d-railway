# 이미테이션 게임 웹앱 점검 보고서 (2026-10-27)

> 목적: 10월 28~29일 교사 연수 배포 전, 모델 최신화·동시 10명 사용·라운드/세션 반복·연수용 입장 방식을 점검한다.
> 상태: **반영 완료(브랜치 `feat/turing-test-training-2610`, 2026-10-27).** 사용자가 P0·P1·컨셉·교사 토큰 검사를 모두 승인했고, 10절에 반영 내역과 검증 결과를 적었다. 배포는 사용자가 한다.
> 검토 방식: Claude(호스트)가 코드 분석·공식 문서 확인·실호출·자동 테스트를 하고, Codex와 Argon(Gemini 4)이 읽기 전용 사본으로 독립 검토했다. 두 검토의 지적은 모두 코드와 대조해 채택 여부를 정했다(7절).

## 1. 결론 요약

1. **Gemini는 지금 배포 서버에서 고장 상태다.** `gemini-2.0-flash`는 2026-06-01 종료되어 호출마다 404가 난다. 교사가 Gemini를 고르면 AI 답변이 전부 회피 문구로 대체된다. 연수 전 교체가 필수다.
2. **같은 수업 코드로 두 교사가 시작하면 한 세션에 합쳐진다.** 교사 화면의 기본 수업 코드가 `AI-BASIC-2026`으로 고정되어 있어 10명이 그대로 시작하면 전원이 첫 교사의 세션에 들어가고 API 키도 서로 덮어쓴다.
3. **연수용 입장(API 키 없이 입장 코드만)은 서버에 절반이 있고 화면에는 없다.** 서버는 PIN을 받지만 실제 교사 화면(`TeacherApp.jsx`)은 Anthropic 키를 필수로 요구하고, 모델 목록도 교사가 넣은 키로만 거른다. 화면과 필터를 고치면 된다.
4. **라운드·세션 반복과 10세션 동시 실행은 자동 테스트로 통과했다.** 같은 코드로 세션 생성→2라운드→토너먼트 종료→새 세션→라운드 도중 강제 종료→새 세션→라운드를 돌렸고, 10세션(각 4팀, Claude/GPT/Solar 순환)을 동시에 돌려 전부 정상 완료했다(17초). 단, 코드 검토에서 "라운드 시작 버튼 두 번 누름"과 "토너먼트 종료 시 타이머 미정리"처럼 테스트가 건드리지 않은 경로의 결함이 나왔다(5절).
5. 나머지 모델도 함께 올리는 것을 권한다. `gpt-4o-mini`는 2027-01-14 제거 예정, `claude-haiku-4-5`는 퇴역 공지 가능 시점(2026-10-15)이 지났다. 교체 후보 전부를 실호출로 검증했고 SDK 업그레이드 없이 가능하다.

## 2. 어느 사본이 실제 배포본인가

| 위치 | 상태 | 판단 |
|---|---|---|
| `micropgt-3d-railway/ai-basic-2026/phase1-turing-test/` | git 추적, 최종 커밋 2026-05-07, 교사 API 키 모드·회피 문구 로테이션·미션 브리핑 포함 | **실제 배포본.** `https://ai-turing-production.up.railway.app/turing-test/`가 이 코드로 응답한다(`teacherKeyMode: true`). 수정은 여기에만 한다 |
| `ai-basic-2026/turing-test-app/` | git 미추적, 2026-03-24 이후 수정 없음, PIN 로그인 방식 | 구버전. GUIDE.md·TEST-REPORT.md만 여기에 있다 |
| `codex_project/ai-basic-2026/turing-test-app/` | Codex 작업 사본, Fly.io 설정 | Fly 서버는 꺼져 있다. 무시한다 |

배포 경로: Railway CLI는 이 Mac에서 인증이 안 되어 있다(`Unauthorized`). GitHub `greatsong/micropgt-3d-railway` main 푸시로 자동 배포되는지는 **확인하지 못했다.** 사용자 확인이 필요하다.

주의: 이 저장소에는 `server/db/turing.db`와 WAL 파일이 git에 들어 있다. 로컬에서 서버를 켜면 추적 파일이 바뀌고, 학생 대화 기록이 GitHub에 올라간다. `.gitignore`에 추가하고 `git rm --cached`로 빼는 것을 권한다(P2, 연수 뒤).

## 3. 모델 ID 점검표

대상: `server/ai.js` (Railway 사본 행 번호)

| 행 | 용도 | 현재 ID | 상태 (공식 문서 2026-10-27) | 실호출 |
|---|---|---|---|---|
| 76 | 말투 변환 | `claude-haiku-4-5-20251001` | 동작. 퇴역 공지 가능일 경과, 공지 시 60일 유예 | 1.6초 |
| 184 | Claude 답변 | `claude-sonnet-4-6` | 동작. 퇴역 2027-02-17 이전 없음 | 1.4초 |
| 204 | GPT 답변 | `gpt-4o-mini` | **deprecated.** 2027-01-14 제거. `max_tokens`도 deprecated | 2.1초 |
| 228 | Gemini 답변 | `gemini-2.0-flash` | **종료(2026-06-01).** 404 | **실패** |
| 261 | Solar 답변 | `solar-pro3` | 동작. 현재 alias 표에 없음(pro4·mini4만). 종료일 확인 불가 | 0.2~0.6초 |

### 교체안 (실호출로 검증한 설정)

| 용도 | 권장 ID | 필요한 설정 | 실측 | 대안 |
|---|---|---|---|---|
| 말투 변환 | `claude-haiku-5-5` | `output_config: { effort: 'low' }`, `max_tokens` 120 이상, 텍스트 블록을 `type === 'text'`로 골라 읽기 | 1.0~1.3초 | `thinking: { type: 'disabled' }` 0.7~1.4초 |
| Claude 답변 | `claude-sonnet-5-5` | `output_config: { effort: 'low' }`, `max_tokens` 200, 텍스트 블록 필터 | 1.4초 | 4.6 유지(5.5가 더 쌈: $2/$10 대 $3/$15) |
| GPT 답변 | `gpt-6.1-terra` | `reasoning_effort: 'none'`, `max_tokens` → `max_completion_tokens` | 1.6초 | `gpt-6-luna`($0.10/$0.50) 2.8초 |
| Gemini 답변 | `gemini-3.5-flash-lite` | 현재 REST 경로 그대로. thinking 토큰 없음 | 0.8~2.0초 | `gemini-3.8-flash` + `thinkingConfig: { thinkingLevel: 'low' }` 2.4초 |
| Solar 답변 | `solar-pro4` | 변경 없음 | 0.6~0.8초 | `solar-mini4` 0.5초 |

설정을 빼면 생기는 문제(실측):
- `claude-haiku-5-5` 기본 설정은 thinking이 켜져 **9.3초**. `effort: 'low'`로 1.0초.
- `claude-sonnet-5-5`에 `max_tokens: 80`이면 thinking이 토큰을 다 써 **텍스트 없이 끝나는 경우**가 있었다.
- `gemini-3.8-flash` 기본 설정은 `maxOutputTokens: 200` 안에서 thinking이 188토큰을 써 **잘렸다.**
- 현재 코드 `message.content[0]?.text`(ai.js:97, 190)는 thinking 블록이 앞에 오면 `undefined`가 되어 회피 문구로 빠진다. `content.find(b => b.type === 'text')`로 바꿔야 한다. (Codex 보완: 말투 변환은 빈 결과일 때 `null`이 아니라 원문을 돌려줘야 한다.)

SDK: 설치된 `@anthropic-ai/sdk` 0.32.1로 `output_config`·`thinking` 필드가 그대로 전달되는 것을 확인했다. 업그레이드 불필요.

가격(1M 토큰 입력/출력): Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, GPT-6.1 Terra $1/$5, Gemini 3.5 Flash-Lite $0.30/$2.50, Solar Pro 4 $0.30/$1.20. 연수 이틀 전체(10세션 × 3라운드 × 8턴)를 넉넉히 잡아도 $3 미만이다.

함께 바꿀 표기: `TeacherApp.jsx:15` 라벨 `Solar Pro 3`, `GuidePage.jsx:235`, `ai.js:249` 주석.

## 4. 동시 10명 사용과 생명주기 반복

### 4-1. 자동 테스트 결과 (로컬, 현재 코드 그대로, 2026-10-27)

| 시나리오 | 결과 |
|---|---|
| 세션1(3팀, 홀수→관찰자) 라운드1 → 라운드2 → 토너먼트 종료 | 정상. 라운드 번호 1, 2. 종료 후 라운드 시작 시도는 "이미 종료" 메시지로 거부. 종료 후 timer:tick 없음 |
| 같은 코드로 세션2(4팀) 생성 → 라운드1 → 라운드 도중 `session:close` | 새 세션 ID 발급, 점수 초기화 확인. 학생 소켓이 `session:closed` 수신, 이후 tick 없음, 상태 `closed` |
| 같은 코드로 세션3(2팀) → 라운드1 | 정상 |
| 10세션 동시(각 4팀, 2턴, Claude/Solar/GPT 순환, 지연 8초) | 10/10 완료, 17초. AI 답변 미리보기 전부 수신, 타임아웃 0, error 이벤트 0 |

### 4-2. 코드 검토로 드러난 결함 (테스트가 지나간 경로)

| 위치 | 문제 | 출처 | 판정 |
|---|---|---|---|
| `server/index.js:119`, `TeacherApp.jsx:51` | 같은 수업 코드의 활성 세션이 있으면 그 세션을 돌려준다. 기본 코드 고정이라 10명이 충돌 | 호스트, Codex·Argon 동의 | **P0** |
| `server/socketHandlers.js:41` | 라운드 진행 중 `round:start`를 다시 받으면 상태를 덮어쓴다. 이전 라운드의 답변 전달 예약이 취소되지 않아 새 라운드에 이전 답변이 섞일 수 있다. 버튼 두 번 누름·다른 탭으로 재현 가능 | Codex·Argon | **P0** (가드 3줄) |
| `server/socketHandlers.js:581, 761` | `tournament:end`와 `round:reveal`이 타이머·전달 예약을 정리하지 않는다. 투표 끝난 뒤 reveal이면 실제 피해는 없으나, 대화 중 reveal을 누르면 tick이 계속 돈다 | Codex·Argon | **P0** (공통 정리 함수) |
| `server/timer.js:138`, `apiKeyStore.js:2` | 세션 종료 시 `timerStore`·`sessionApiKeys` 항목을 지우지 않는다 | Codex·Argon | P2 (10세션 규모에선 무해) |
| `TeacherApp.jsx` | 서버 `error` 이벤트 리스너가 없다. 팀 2개 미만일 때 시작을 누르면 아무 반응이 없다 | Argon | **P1** (한 줄) |
| `TeacherApp.jsx:286` | 3초 폴링이 세션을 통째로 덮어써 라운드 시작 뒤 3초 안에 팀 역할(심판/응답/관찰) 표시가 사라진다. 코드로 확인, 화면은 미확인 | Argon | P1 (역할 병합 3줄) |
| `TeacherApp.jsx:153` | 교사 소켓이 재연결되면 `teacher:join`을 다시 보내지 않아 실시간 이벤트가 끊긴다. 3초 폴링이 대부분 보완 | Codex | P1 |
| `VotePanel.jsx:70` | 응답자 팀은 투표할 대화가 없어 투표 시간 내내 "대화 내역을 불러오는 중..."이 보인다 | Argon | P1 (문구만 교체) |
| `server/ai.js:287` | 타임아웃이 `Promise.race`라 원 요청을 끊지 않는다. 느린 모델이면 뒤늦은 응답·중복 호출이 생긴다 | Codex | P1 (교체 모델이 3초 이내라 당장은 낮음) |
| `server/socketHandlers.js:654` | 대화 종료 뒤에도 `chatStarted`가 true라 투표 중 질문이 서버에서 막히지 않는다(화면은 막음) | Codex | P2 |
| AI 실패가 서버 콘솔에만 찍힌다. 교사는 키 오류·한도 초과를 알 수 없다 | | Argon | P1 (교사에게 `ai:error` 이벤트 + 배너) |
| `server/index.js:238` CSV 내보내기 무인증, 수식 문자 미이스케이프 | | Argon | P2 |
| `RoundController.jsx`, `TeacherGate.jsx`, `FinalResults.jsx`, `pages/TeacherPage.jsx` | 실제 라우트(`App.jsx` → `TeacherApp`)가 쓰지 않는 미사용 파일. 호스트 초안이 여기서 "기본 말투 `급식체`" 결함을 잡았으나 **실제 화면에는 영향이 없다**(Codex·Argon 지적으로 정정) | | P2 (삭제) |

### 4-3. 공용 키 한도

연수에서 공용 키 하나로 10세션을 돌리면 호출이 한 키에 몰린다. 10세션 × 3페어가 20초마다 질문하면 분당 90~150회다(Argon 계산). Anthropic Tier 1은 모델당 50 RPM이라 **계정 등급이 Tier 2 이상인지 확인**해야 한다. 오늘 테스트는 10세션 동시 호출 수십 건이 전부 통과했다. 교사마다 모델을 다르게 고르게 하면 분산된다.

## 5. 연수용 입장 설계 (사용자 요청: 로그인 없이 입장 코드만)

현재: 서버 `/api/auth/teacher`(`index.js:73`)는 `pin === TEACHER_PIN`도 통과시키지만, 실제 화면 `TeacherApp.jsx:311`은 Anthropic 키가 없으면 막고, 세션 생성 직후 `/api-keys`를 올리며(`index.js:88`은 Anthropic 키 필수), 모델 목록을 `savedApiKeys`로만 거른다(`TeacherApp.jsx:592`). 서버 AI 호출은 세션 키가 없으면 환경변수 키로 자동 대체한다(`socketHandlers.js:145`, `ai.js:33`).

제안(최소 변경):
1. **교사 입장 화면**: "입장 코드" 입력 한 칸. 성공하면 `/auth/teacher`에 `{ pin }`으로 인증. "내 API 키로 입장"은 접힌 선택 항목으로 남긴다(실제 수업용).
2. **서버**: `TEACHER_PIN` 환경변수를 연수 전용 난수로 설정(Railway Variables). 기본값 `000000`은 제거하고 변수가 없으면 PIN 입장을 거부한다. 아무 문자열이나 Anthropic 키로 통과하는 분기(`index.js:77`)는 닫는다(Codex 지적).
3. **모델 목록**: `savedApiKeys` 또는 `aiStatus`(이미 `/api/system/ai-status`를 불러오고 있음) 중 하나라도 있으면 표시.
4. **키 업로드 생략**: PIN 입장이면 `/api-keys` 호출(`TeacherApp.jsx:265, 340`)을 건너뛴다.
5. **입장 코드 유출 시 피해 범위**(Argon·Codex 공통 지적): 현재 교사용 소켓 이벤트(`round:start`, `session:close` 등)와 교사용 REST에는 인증 검사가 없다. 학생 링크에 `?session=ID`가 노출되므로 세션 ID만 알면 누구나 남의 세션을 종료할 수 있다. 연수(참가자가 교사)에서는 위험이 낮지만 실제 수업에서는 문제다. **권장**: PIN 인증 시 서버가 난수 토큰을 발급하고, 교사용 REST·소켓 이벤트에서 토큰을 검사한다(약 30행). 연수 전에 넣을지는 사용자 결정.
6. 연수 직후 `TEACHER_PIN`을 바꾼다.

## 6. 컨셉 강화 제안 (사용자 요청: 복잡하지 않게)

| 제안 | 구현 | 복잡도 |
|---|---|---|
| **시작 화면 모스 부호 배경음** | 외부 음원 없이 Web Audio API로 합성. 낮은 드론 + 모스 부호 비프(예: `IMITATION GAME`을 모스로 반복). 브라우저 정책상 첫 클릭(입장 버튼) 뒤에 재생되며, 화면 구석에 🔇 토글. 학생 입장 페이지와 미션 브리핑 화면에 적용 | 낮음 (파일 1개, 80행 안팎) |
| 답변 도착 효과음 | 답변이 도착할 때 짧은 모스 "딧" 한 번. 위 모듈 재사용 | 매우 낮음 |
| 텔레타이프 글자 출력 | 답변 문장이 타자기처럼 한 글자씩 찍히는 CSS/JS 효과. 사람·AI 모두 같은 효과라 판별 단서가 되지 않음 | 낮음 |
| **튜링의 30% 기준 표시** | 결과 화면에 "튜링은 심문관이 30% 이상 속으면 기계가 통과한다고 봤다"는 설명과 함께 이번 라운드 AI가 사람으로 판정된 비율을 표시. 기존 `stats`로 계산 가능 | 낮음 |
| 팀 코드네임 | 팀 색상 대신 블레츨리 파크식 코드네임(ENIGMA, CHRISTOPHER, BOMBE…) 자동 부여. 팀 이름은 그대로 두고 부제로만 | 낮음 |
| 1950년 논문 인용 카드 | 미션 브리핑 첫 장에 "Computing Machinery and Intelligence"(1950) 한 문장 인용 | 매우 낮음 |

굵게 표시한 둘이 효과 대비 비용이 가장 좋다. 나머지는 선택.

### 영상 튜토리얼 (사용자 요청)

현재 튜토리얼은 `GuidePage.jsx`·`StudentGuidePage.jsx`의 웹페이지다. 이를 교사용 2~3분, 학생용 1분 모션그래픽 영상으로 바꾸는 작업은 `showreel` 스킬(HyperFrames 기반, 코드로 화면을 그리고 렌더)로 가능하다. 실제 앱 화면을 녹화해 넣고, 모스 부호 배경음과 같은 톤으로 맞출 수 있다. **앱 화면이 바뀐 뒤에 찍어야 하므로 위 P0·P1 반영과 배포 확인 후에 진행한다.** 결과물은 mp4 파일과, 가이드 페이지에 넣을 재생 영역이다.

## 7. 3-way 검토 결과 정리

| 출처 | 제안 | 채택 |
|---|---|---|
| Codex | 모델 ID를 환경변수로 분리 | 보류. 연수용 단순함을 우선. 코드 상수 + 주석으로 충분 |
| Codex | 텍스트 블록 합치기, 말투 변환 빈 결과 시 원문 반환 | **채택** |
| Codex | 생성 모드에서 같은 코드 활성 세션이면 409 | 보류. 무작위 기본 코드로 충돌이 사라지고, "같은 코드로 이어서 사용"은 유지가 낫다 |
| Codex | 기본 말투 결함은 미사용 파일 | **채택(초안 정정)** |
| Codex | PIN 필수화·키 문자열 우회 제거·교사 토큰 검사 | PIN 필수·우회 제거 **채택**. 토큰 검사는 사용자 결정(5절 5항) |
| Codex | `round:start` 중복 가드, 종료 경로 공통 정리, Map 정리 | 가드·공통 정리 **채택(P0)**. Map 정리 P2 |
| Codex | 단계 검사(`phase`) 전면 도입, async 결과 `isCurrent` 검사, AbortController | 중복 가드로 핵심 위험이 사라지므로 P1~P2로 미룸 |
| Codex | 타이머 async 콜백 unhandled rejection 보호 | P1 (try/catch 한 줄) |
| Codex | 교사 재연결 시 `teacher:join` 재전송 | P1 **채택** |
| Codex | 늦은 fetch가 종료 세션을 되살림, 인덱스·트랜잭션 | P2 |
| Argon | 교사 `error` 리스너·시작 버튼 비활성화 | P1 **채택** |
| Argon | 폴링이 팀 역할을 지움 | P1 **채택** (코드 확인, 화면 미확인) |
| Argon | 응답자 팀 투표 화면 무한 로딩 | P1 **채택** (대기 문구로) |
| Argon | 학생 새로고침 시 대화 유실·단계 복구 | P2. 연수에서는 새로고침 금지 안내로 대체 |
| Argon | AI 실패를 교사에게 알림 | P1 **채택** |
| Argon | 토너먼트 종료 뒤 교사 "새 수업 시작" 버튼이 종료 화면에만 있음, 학생 접근 키 미삭제 | P1. 오늘 테스트에서는 서버 쪽 새 세션 생성이 정상이었고, 교사는 "수업 완전 종료"를 한 번 더 누르면 된다 |
| Argon | CSV 이스케이프·인증, localStorage 키 보관 | P2 |
| Argon | QR 코드 UI 부재 | 보류. `/api/network/ip`는 로컬용이고 연수는 Railway 링크 공유로 충분 |

## 8. 제안하는 작업 순서 (컨펌 후)

**P0 (연수 전 필수)**
1. `server/ai.js` 모델 5곳 교체 + 파라미터 + 텍스트 블록 필터 + 라벨 3곳
2. `TeacherApp.jsx:51` 기본 수업 코드 `AI-` + 무작위 4자
3. 연수용 입장 코드 화면·서버(5절 1~4항, 6항)
4. `socketHandlers.js` 라운드 중복 시작 가드 + 종료 경로 공통 정리

**P1 (권장, 각각 10행 안팎)**
5. 교사 `error` 표시, 시작 버튼 비활성화, 재연결 시 `teacher:join`, 폴링 역할 병합
6. 응답자 투표 대기 문구, AI 실패 교사 알림
7. (결정) 교사 토큰 검사

**컨셉 (선택)**
8. 모스 부호 배경음 + 답변 효과음, 튜링 30% 기준 표시

**검증·배포**
9. 로컬에서 오늘 만든 자동 테스트(생명주기 + 10세션) 재실행, 4모델 실호출 확인
10. 커밋 → 사용자가 Railway 배포 → 배포 주소에서 1라운드 확인
11. 연수 당일 재배포 금지(서버 메모리의 진행 중 라운드가 끊긴다)

**영상 (배포 확인 뒤)**
12. 교사용·학생용 영상 튜토리얼 제작, 가이드 페이지에 재생 영역 추가

## 9. 검증 근거

- 공식 문서: platform.claude.com(models/overview, model-deprecations, haiku-5-5·sonnet-5-5 migration), developers.openai.com(models, deprecations, gpt-6-luna, gpt-6.1-terra), ai.google.dev(models, changelog, thinking), console.upstage.ai(models, solar-pro-4, solar-mini-4)
- 실호출: 2026-10-27, 이 Mac의 `.env` 키로 현재 ID 5종·후보 12종 호출. 지연 시간은 1회 측정값
- 자동 테스트: 로컬 서버(스크래치 사본, 별도 DB)에서 Socket.IO 클라이언트로 생명주기 3세션 + 10세션 동시 실행. 스크립트는 `lifecycle-test.mjs`(세션 폴더 밖, 요청 시 프로젝트에 넣는다)
- 배포 서버: `GET /turing-test/api/system/ai-status` 200, 키 4종 등록
- 3-way: Codex 120초, Argon 136초, 둘 다 읽기 전용 사본(.env·DB 제외)
- 검증하지 않은 것: Railway GitHub 자동 배포 연결, 브라우저 화면에서의 역할 표시 결함, 교체 후 말투 품질(사극체·AI체) 비교, 공용 키 계정의 RPM 등급

## 10. 반영 내역과 검증 (2026-10-27, 브랜치 `feat/turing-test-training-2610`)

### 바뀐 파일

| 파일 | 내용 |
|---|---|
| `server/ai.js` | 모델 5곳 교체(`MODELS` 상수), Claude `effort: 'low'`·텍스트 블록 필터, GPT `max_completion_tokens`·`reasoning_effort: 'none'`, Gemini `thinkingLevel: 'minimal'`, AbortController로 실제 타임아웃, 실패 시 `aiEvents`로 교사 알림 |
| `server/teacherAuth.js` (신규) | 입장 코드/본인 키 인증 후 12시간 토큰 발급·검증, Express 미들웨어, 입장 코드 시도 제한(IP당 10분 10회) |
| `server/index.js` | `/auth/teacher`가 토큰 반환. 입장 코드는 `TEACHER_PIN` 환경변수(프로덕션에서 미설정이면 503), 본인 키는 Anthropic 모델 목록 호출로 유효성 확인. 세션 생성·키 등록·대시보드·CSV에 교사 토큰 필수(학생 join은 그대로). CSV 셀 이스케이프. `ai-status`에 `entryCodeMode` |
| `server/socketHandlers.js` | 교사 이벤트 9종 토큰 검사, 라운드 중복 시작 거부, `phase`(chatting→voting→closed→done) 검사, `cleanupRound`로 reveal·session:close·tournament:end 공통 정리, 세션 종료 시 `timerStore`·`sessionApiKeys` 제거, `calcStats`에 `aiFooledRate`·`turingPassed`, `ai:error` 교사 전달 |
| `server/timer.js` | 전달 콜백의 비동기 예외 포착 |
| `src/utils/api.js` | 토큰 저장(sessionStorage)·헤더 자동 첨부, `apiDownload` |
| `src/components/teacher/TeacherApp.jsx` | 입장 코드 로그인 화면(본인 키는 접힌 선택), 기본 수업 코드 `AI-XXXX` 무작위, 모든 교사 이벤트에 토큰, 재연결 시 `teacher:join` 재전송, 서버 `error`·`ai:error` 표시, 팀 2개 미만·진행 중일 때 시작 버튼 비활성, 폴링 시 팀 역할 유지, 모델 목록이 서버 공용 키도 반영, 결과·최종 화면에 튜링 30% 카드, 최종 화면에 CSV 다운로드·새 수업 시작 버튼, 라벨 Solar Pro 4 |
| `src/components/TuringCriterion.jsx` (신규) | 튜링 30% 기준 카드 (교사·학생 공용) |
| `src/components/student/TeamPage.jsx`, `ScoreBoard.jsx`, `JoinPage.jsx` | 응답자 팀 투표 단계 대기 문구, 라운드·최종 결과에 30% 카드, 시작 화면·브리핑 배경음, 답변 도착음, 소리 토글 |
| `src/utils/morse.js`, `src/components/student/SoundToggle.jsx` (신규) | Web Audio 합성 배경음(드론 + 모스 "IMITATION GAME" + 약한 딜레이). 음향 설계는 Codex 제안을 검토해 채택 |
| `src/components/GuidePage.jsx` | 입장 코드 안내, Solar Pro 4 |
| `scripts/lifecycle-test.mjs` (신규) | 아래 자동 테스트. 서버를 `PORT=4999 TEACHER_PIN=000000`으로 띄우고 `node scripts/lifecycle-test.mjs ./node_modules` |

### 자동 테스트 결과 (로컬, 수정 후 코드)

| 항목 | 결과 |
|---|---|
| 토큰 없이 세션 생성 / 잘못된 입장 코드 / 가짜 Anthropic 키 / 가짜 토큰 대시보드 / 가짜 토큰 소켓 이벤트 | 전부 401 또는 거부 |
| 학생 join(토큰 없음) | 정상(없는 코드는 404) |
| 세션1: 라운드1(Gemini) → 라운드2 시작 직후 중복 시작 → 대화 중 결과 공개 → 라운드3(GPT) → 토너먼트 종료 | 중복 시작 거부, 공개 뒤 타이머 정지, 라운드 번호 1·2·3, 종료 뒤 tick 없음 |
| 같은 코드로 세션2 → 라운드1(Claude) → 라운드 도중 강제 종료 → 세션3 → 라운드1(Solar) | 전부 정상, 새 세션 ID, 점수 초기화 |
| 10세션 동시(각 4팀, Claude/GPT/Gemini/Solar 순환) | 10/10 완료 17초, AI 답변 미리보기 전부 수신, 타임아웃 0, AI 오류 알림 0 |
| `npm run build` | 통과 |

Gemini는 교체 전 404였고 교체 후 정상 응답을 확인했다. 수정 전 테스트 결과와의 차이는 Gemini 동작과 인증 거부뿐이고 나머지는 같다.

### 배포 전에 사용자가 할 일

1. **Railway Variables에 `TEACHER_PIN` 추가** (연수 전용 난수, 예: 6자리). 프로덕션(`NODE_ENV=production`)에서 이 값이 없으면 입장 코드 로그인이 503으로 막힌다. 연수 뒤에는 값을 바꾼다.
2. 브랜치를 main에 합치고 푸시 → Railway 자동 배포 여부 확인(이 Mac의 Railway CLI는 미인증).
3. 배포 주소에서 `/turing-test/api/system/ai-status`에 `"entryCodeMode": true`가 뜨는지 확인한 뒤, 교사 화면에 입장 코드로 들어가 1라운드를 돌려 본다.
4. 연수 당일에는 재배포하지 않는다.

### 검증하지 못한 것

- 배경음과 효과음의 실제 소리(브라우저에서 들어 보지 않았다). 코드는 빌드를 통과했고 음소거 토글이 있다.
- 교사 화면의 역할 표시·30% 카드·오류 배너는 코드와 빌드로만 확인했다. 실제 라운드 화면은 배포 뒤 1라운드로 확인해야 한다.
- 공용 키 계정의 분당 호출 한도 등급.
