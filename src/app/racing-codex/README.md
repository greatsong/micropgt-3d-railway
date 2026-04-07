# Racing Codex

`racing-codex` 폴더는 기존 `week5/page.js`에 몰려 있던 경사하강법 레이싱 기능을 더 작고 읽기 쉬운 단위로 다시 나누기 위한 출발점입니다.

## 목적

- 교육 설명과 시뮬레이션 로직을 분리합니다.
- 동일한 입력이면 동일한 결과가 나오는 재현 가능한 로컬 실험실을 제공합니다.
- 멀티플레이/소켓 기능을 다시 붙이기 전에 교육용 단일 사용자 흐름을 먼저 안정화합니다.

## 파일 역할

- `page.js`: Next.js 라우트 엔트리
- `RacingCodexLab.jsx`: 상태 조합과 화면 흐름
- `courseData.js`: 학습 목표, 교사용 질문, 추천 프리셋
- `simulation.js`: 레이스 계산, 해설 생성, 맵 샘플링
- `CourseMap.jsx`: 경로와 손실 지형의 2D 시각화
- `page.module.css`: 전용 스타일

## 다음 마이그레이션 제안

1. `week5/page.js`의 솔로 모드를 `simulation.js` 기반으로 바꿉니다.
2. `backend/socketHandlers.js`의 레이스 결과 메시지를 `courseData.js`의 교육 문구와 연결합니다.
3. `GradientRaceScene.jsx`는 멀티플레이 전용 뷰로 역할을 좁히고, 교육 해설은 `racing-codex`가 담당하게 합니다.
