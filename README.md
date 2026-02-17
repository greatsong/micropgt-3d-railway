# MicroGPT 3D Learning Lab

> **서울고 · 동덕여고 · 상문고 공유 캠퍼스 연합 동아리**를 위한 실시간 다중접속 AI 학습 게임 플랫폼

AI/ML 핵심 개념을 **3D 인터랙티브 환경**에서 학습하는 15주 커리큘럼입니다.
학생들이 직접 토큰을 쪼개고, 임베딩 은하수에 별을 띄우고, 경사하강법 레이싱을 하며 GPT의 원리를 체험합니다.

---

## 목차

- [아키텍처](#아키텍처)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [15주 커리큘럼](#15주-커리큘럼)
- [주요 기능](#주요-기능)
- [로컬 개발](#로컬-개발)
- [Railway 배포](#railway-배포)
- [환경 변수](#환경-변수)
- [사용법](#사용법)
- [API 엔드포인트](#api-엔드포인트)
- [상태 관리](#상태-관리)
- [주의사항](#주의사항)

---

## 아키텍처

Express + Next.js + Socket.io를 **단일 서버**로 통합한 구조입니다.

```
┌─────────────────────────────────────────────┐
│              Node.js 서버 (포트 3000)         │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   Express    │  │     Next.js 16       │  │
│  │  REST API    │  │   App Router (SSR)   │  │
│  │  /api/health │  │   31개 페이지        │  │
│  │  /api/rooms  │  │   13개 컴포넌트      │  │
│  └──────┬───────┘  └──────────┬───────────┘  │
│         │                     │              │
│  ┌──────┴─────────────────────┴───────────┐  │
│  │         Socket.io (WebSocket)          │  │
│  │   실시간 교실 동기화 · 퀴즈 · 레이싱    │  │
│  └────────────────────────────────────────┘  │
│                                             │
│  ┌────────────────────────────────────────┐  │
│  │        인메모리 상태 (Map)              │  │
│  │   교실 · 학생 · 레이스 · 퀴즈 데이터    │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 기술 스택

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **프레임워크** | Next.js | 16.1.6 | App Router, SSR, 페이지 라우팅 |
| **UI** | React | 19.2.3 | 컴포넌트 기반 UI |
| **3D 그래픽** | Three.js | 0.182.0 | 3D 시각화 |
| **3D React** | @react-three/fiber | 9.5.0 | React용 Three.js 렌더러 |
| **3D 유틸** | @react-three/drei | 10.7.7 | 카메라, 컨트롤 등 헬퍼 |
| **애니메이션** | GSAP | 3.14.2 | 고성능 애니메이션 |
| **상태관리** | Zustand | 5.0.11 | 글로벌 상태 + localStorage 영속화 |
| **서버** | Express | 4.18.2 | HTTP 서버, REST API |
| **실시간** | Socket.io | 4.7.4 | WebSocket 양방향 통신 |
| **스타일** | CSS Modules | - | 컴포넌트 스코프 스타일링 |

---

## 프로젝트 구조

```
micropgt-3d-railway/
├── server.js                  # 통합 서버 (Express + Next.js + Socket.io)
├── railway.toml               # Railway 배포 설정
├── Dockerfile                 # 멀티스테이지 Docker 빌드
├── package.json
│
├── backend/
│   ├── socketHandlers.js      # WebSocket 이벤트 핸들러
│   ├── roomManager.js         # 교실(방) 상태 관리
│   └── gameLogic.js           # 게임 로직 (단어 좌표, 손실 함수, 경사)
│
├── src/
│   ├── app/
│   │   ├── layout.js          # 루트 레이아웃
│   │   ├── globals.css        # 전역 CSS
│   │   ├── cosmic-ui.css      # 우주 테마 디자인 시스템
│   │   ├── page.js            # 홈 (학생 입장)
│   │   ├── hub/               # 주차별 허브 네비게이션
│   │   ├── dashboard/         # 교사 관제탑
│   │   ├── week1/ ~ week15/   # 주차별 학습 페이지
│   │   │   ├── intro/page.js  # 개념 소개 (스텝별 인터랙션)
│   │   │   └── page.js        # 실험실 (체험형 학습)
│   │   └── advanced-gpt/      # 심화: MicroGPT 해부학
│   │
│   ├── components/
│   │   ├── 3d/                # 3D 시각화 컴포넌트 (7개)
│   │   │   ├── EmbeddingGalaxy.jsx   # 임베딩 은하수
│   │   │   ├── GradientRaceScene.jsx # 경사하강법 레이싱 씬
│   │   │   ├── RacingBall.jsx        # 레이싱 공
│   │   │   ├── LossSurface.jsx       # 3D 손실 곡면
│   │   │   ├── WordStar.jsx          # 단어 별 파티클
│   │   │   ├── ConnectionBeam.jsx    # 노드 연결선
│   │   │   └── SpaceBackground.jsx   # 우주 배경
│   │   ├── layout/            # 레이아웃 컴포넌트 (5개)
│   │   │   ├── ClientLayout.jsx      # 루트 래퍼
│   │   │   ├── Sidebar.jsx           # 사이드바 네비게이션
│   │   │   ├── Breadcrumb.jsx        # 경로 탐색
│   │   │   ├── WebGLErrorBoundary.jsx
│   │   │   └── WebGLFallback.jsx
│   │   └── quiz/
│   │       └── QuizOverlay.jsx       # 퀴즈 오버레이 모달
│   │
│   ├── stores/                # Zustand 상태 저장소
│   │   ├── useClassStore.js   # 교실 상태 (이름, 학교, 방코드 영속)
│   │   ├── useGalaxyStore.js  # 은하수 상태 (내 단어 영속)
│   │   └── useRaceStore.js    # 레이싱 상태 (학습률, 모멘텀 영속)
│   │
│   ├── lib/                   # 유틸리티 훅 & 라이브러리
│   │   ├── socket.js          # Socket.io 싱글톤 클라이언트
│   │   ├── useSocketRoom.js   # 방 기반 WebSocket 관리 훅
│   │   ├── useRequireRoom.js  # 멀티플레이어 페이지 가드
│   │   ├── useIsMobile.js     # 모바일 감지 (768px)
│   │   └── lossFunction.js    # 손실 함수 (클라이언트용)
│   │
│   └── constants/
│       └── curriculum.js      # 15주 커리큘럼 데이터
│
└── public/                    # 정적 파일
```

---

## 15주 커리큘럼

| 주차 | 주제 | 핵심 개념 | 인터랙션 |
|------|------|-----------|----------|
| **1주** | 토크나이저 실험실 | BPE 알고리즘, 토큰화 | 텍스트 직접 분리 체험 |
| **2주** | 확률과 언어 모델 | Softmax, Temperature | 확률 슬라이더 조작 |
| **3주** | 원-핫 인코딩 | 벡터 표현, 희소성 문제 | 단어→벡터 변환 실습 |
| **4주** | 임베딩 은하수 | Word2Vec, 의미 공간 | **3D 멀티플레이어** 은하수 |
| **5주** | 경사하강법 레이싱 | 학습률, 모멘텀, 수렴 | **3D 멀티플레이어** 레이싱 |
| **6주** | 신경망의 기초 | 퍼셉트론, MLP, XOR | 레이어 구성 실험 |
| **7주** | 역전파 탐험 | 체인룰, 기울기 전파 | 역전파 과정 시각화 |
| **8주** | 시퀀스와 포지션 | RNN, Positional Encoding | 위치 인코딩 조작 |
| **10주** | 어텐션 게임 | Q/K/V, Self-Attention | 히트맵, 멀티헤드 시각화 |
| **12주** | RMS 정규화 | RMSNorm, Layer Norm | 정규화 효과 비교 |
| **13주** | GPT 아키텍처 | Transformer 블록 구조 | 파라미터 슬라이더 |
| **14주** | AI 조련하기 | SFT, RLHF, DPO | 학습 시뮬레이션 |
| **15주** | 바이브 코딩 해커톤 | 종합 프로젝트 | 자유 제작 |
| **심화** | MicroGPT 해부학 | Transformer 코드 분석 | 코드 따라가기 |

---

## 주요 기능

### 실시간 멀티플레이어 교실

- 학생들이 **방 코드**로 같은 교실에 입장
- Socket.io로 실시간 동기화 (30fps 물리 시뮬레이션)
- 교사 관제탑에서 전체 학생 상태 모니터링

### 3D 임베딩 은하수 (Week 4)

- 학생이 입력한 단어가 **3D 공간의 별**로 표시
- 의미가 비슷한 단어는 가까이 군집 (6개 카테고리)
- 슬라이더로 좌표 조작하며 임베딩 공간 이해

### 경사하강법 레이싱 (Week 5)

- 학생마다 **학습률(0.001~2.0)** 과 **모멘텀(0~0.99)** 설정
- 3D 손실 곡면 위에서 공이 구르는 레이싱
- 수렴, 발산, 로컬 미니마 등을 직접 체험

### 교사 퀴즈 시스템

- O/X 및 객관식 퀴즈 실시간 브로드캐스트
- 응답 시간 측정, 정답률 집계
- 가장 빠른 정답자 표시

### 어텐션 시각화 (Week 10)

- Q/K/V 벡터 슬라이더 조작
- Self-Attention 히트맵 실시간 렌더링
- 멀티헤드 어텐션 비교 체험

---

## 로컬 개발

### 사전 요구

- Node.js 20 이상
- npm

### 설치 및 실행

```bash
git clone https://github.com/greatsong/micropgt-3d-railway.git
cd micropgt-3d-railway
npm install
npm run dev
```

`http://localhost:3000`에서 접속합니다.

### 환경 변수 (선택)

```bash
cp .env.example .env
```

```env
PORT=3000
TEACHER_PASSWORD=teacher2025
NODE_ENV=development
```

---

## Railway 배포

### 1단계: Railway 프로젝트 생성

1. [railway.app](https://railway.app) 접속 후 로그인
2. **"New Project"** 클릭
3. **"Deploy from GitHub repo"** 선택
4. GitHub 연동이 안 되어 있으면 **"Configure GitHub App"** 클릭하여 연동
5. **`greatsong/micropgt-3d-railway`** 레포 선택

### 2단계: 자동 빌드

Railway가 `railway.toml` + `Dockerfile`을 자동 감지합니다.

```toml
# railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ALWAYS"
restartPolicyMaxRetries = 5
```

Docker 멀티스테이지 빌드:
1. **deps**: `npm ci` (의존성 설치)
2. **builder**: `next build` (Next.js 빌드)
3. **runner**: 프로덕션 이미지 (최소화)

### 3단계: 환경 변수 설정

Railway 대시보드 → **Variables** 탭:

| 변수 | 값 | 필수 여부 |
|------|-----|-----------|
| `TEACHER_PASSWORD` | 원하는 비밀번호 | 권장 (기본값: teacher2025) |

> `PORT`와 `NODE_ENV`는 Railway가 자동 제공합니다. 직접 설정하지 마세요.

### 4단계: 도메인 생성

1. 프로젝트 클릭 → **Settings** 탭
2. **Networking** 섹션
3. **"Generate Domain"** 클릭
4. `https://xxx.up.railway.app` 형태의 공개 URL 생성

### 5단계: 배포 확인

- 빌드 완료 후 **Deployments** 탭에서 상태 확인
- `https://xxx.up.railway.app` 접속하여 메인 페이지 확인
- `https://xxx.up.railway.app/api/health` → `{"status":"ok"}` 응답 확인

### 자동 배포

GitHub `main` 브랜치에 push하면 Railway가 자동으로 재빌드 및 배포합니다.

---

## 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 (Railway 자동 설정) |
| `NODE_ENV` | `development` | 환경 모드 (Railway 자동 설정) |
| `TEACHER_PASSWORD` | `teacher2025` | 교사 대시보드 인증 비밀번호 |

---

## 사용법

### 학생

1. 메인 페이지(`/`)에서 **이름, 학교, 방 코드** 입력
2. 입장 후 **허브(`/hub`)** 에서 주차별 학습 선택
3. **Intro** 페이지에서 개념 학습 → **Lab** 페이지에서 체험
4. 멀티플레이어 활동 (은하수, 레이싱)은 같은 방 코드의 학생끼리 실시간 연동

### 교사

1. `/dashboard` 페이지 접속
2. **방 코드 + 비밀번호** 입력하여 관제탑 접속
3. 접속 중인 학생 목록 실시간 모니터링
4. 퀴즈 출제 및 결과 확인
5. 레이싱 시작/리셋 제어

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 확인 |
| GET | `/api/rooms` | 활성 교실 목록 |

### WebSocket 이벤트

**학생 → 서버:**

| 이벤트 | 설명 |
|--------|------|
| `join_class` | 교실 입장 (이름, 학교, 방코드) |
| `register_word` | 3D 은하수 단어 등록 |
| `update_word_position` | 별 좌표 이동 |
| `update_attention_slider` | 어텐션 슬라이더 값 변경 |
| `set_race_params` | 레이싱 학습률/모멘텀 설정 |
| `submit_quiz_answer` | 퀴즈 답변 제출 |

**교사 → 서버:**

| 이벤트 | 설명 |
|--------|------|
| `join_dashboard` | 관제탑 입장 (비밀번호 인증) |
| `start_race` | 레이싱 시작 |
| `reset_race` | 레이싱 리셋 |
| `send_quiz` | 퀴즈 브로드캐스트 |
| `reveal_quiz_results` | 퀴즈 결과 공개 |
| `cancel_quiz` | 퀴즈 취소 |
| `teacher_command` | 범용 명령 브로드캐스트 |

**서버 → 클라이언트:**

| 이벤트 | 설명 |
|--------|------|
| `room_state` | 방 전체 상태 전송 |
| `room_update` | 학생 목록 갱신 |
| `student_joined` / `student_left` | 입퇴장 알림 |
| `word_registered` / `word_moved` | 은하수 별 동기화 |
| `attention_updated` | 어텐션 값 동기화 |
| `race_started` / `race_tick` / `race_finished` | 레이싱 상태 |
| `race_alert` | 공 이탈 경고 |
| `quiz_broadcast` / `quiz_results` | 퀴즈 진행 |

---

## 상태 관리

Zustand + `persist` 미들웨어로 핵심 데이터를 localStorage에 영속화합니다.

| Store | localStorage 키 | 저장 항목 | 비저장 항목 |
|-------|------------------|-----------|-------------|
| `useClassStore` | `microgpt-class` | 이름, 학교, 방코드 | 연결 상태, 학생 목록 |
| `useGalaxyStore` | `microgpt-galaxy` | 내 단어 | 다른 학생 별 데이터 |
| `useRaceStore` | `microgpt-race` | 학습률, 모멘텀 | 레이스 상태, 공 위치 |

> 새로고침해도 학생 정보와 설정이 유지됩니다.

---

## 주의사항

- **Stateful 서버**: 인메모리 상태를 사용하므로 서버 재배포 시 모든 교실 데이터가 초기화됩니다
- **서버리스 불가**: Vercel/Netlify 같은 서버리스 환경에서는 Socket.io가 동작하지 않습니다
- **WebSocket 필수**: Socket.io 실시간 통신이 필수이므로 WebSocket을 지원하는 플랫폼(Railway, Render, Fly.io 등)이 필요합니다
- **단일 인스턴스**: 인메모리 상태 공유를 위해 서버를 1개 인스턴스로 운영해야 합니다
- **3D 성능**: WebGL 미지원 기기에서는 자동으로 폴백 UI가 표시됩니다
