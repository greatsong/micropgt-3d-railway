# MicroGPT 3D Learning Lab - Railway 배포

AI/ML 개념을 3D 인터랙티브 환경에서 학습하는 15주 커리큘럼 플랫폼입니다.

## 아키텍처

Express + Next.js + Socket.io를 **단일 서버**로 통합한 구조입니다.

- **프론트엔드**: Next.js 16 (App Router) + Three.js 3D
- **백엔드**: Express + Socket.io (같은 프로세스)
- **상태**: 인메모리 (서버 재시작 시 초기화)

## 로컬 개발

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 접속합니다.

## Railway 배포

### 1. GitHub에 푸시

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Railway 프로젝트 생성

1. [railway.app](https://railway.app)에서 "New Project" → "Deploy from GitHub repo"
2. 이 저장소를 선택
3. Railway가 Dockerfile을 자동 감지하여 빌드/배포

### 3. 환경변수 설정

Railway 대시보드 → Variables에서 설정:

| 변수 | 값 | 비고 |
|------|-----|------|
| `TEACHER_PASSWORD` | (원하는 비밀번호) | 교사 대시보드 인증용 |

> `PORT`와 `NODE_ENV`는 Railway가 자동으로 제공합니다.

### 4. 도메인 설정

Railway 대시보드 → Settings → Networking → "Generate Domain"으로 공개 URL을 생성합니다.

## 사용법

- **학생**: 메인 페이지에서 이름, 학교, 방 코드 입력 후 입장
- **교사**: `/dashboard` 페이지에서 방 코드 + 비밀번호로 관제탑 접속

## 주의사항

- **Stateful 서버**: 인메모리 상태를 사용하므로 서버 재배포 시 모든 교실 데이터가 초기화됩니다
- **서버리스 불가**: Vercel/Netlify 같은 서버리스 환경에서는 동작하지 않습니다
- **WebSocket**: Socket.io 실시간 통신이 필수이므로 WebSocket을 지원하는 플랫폼이 필요합니다
