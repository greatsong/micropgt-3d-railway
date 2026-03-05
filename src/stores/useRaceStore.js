'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 팀 색상 프리셋
const TEAM_COLORS = [
    '#f43f5e', // 로즈
    '#3b82f6', // 블루
    '#10b981', // 에메랄드
    '#f59e0b', // 앰버
    '#8b5cf6', // 바이올렛
    '#06b6d4', // 시안
];

// GP 스테이지별 포인트: 1등 = N점, 2등 = N-1점, ..., 이탈 = 0점
function calcGpPoints(rank, totalTeams, status) {
    if (status === 'escaped') return 0;
    return Math.max(0, totalTeams - rank + 1);
}

export const useRaceStore = create(
    persist(
        (set, get) => ({
            // ── 레이스 상태 (실시간 — 저장 안 함) ──
            racePhase: 'setup', // 'setup' | 'racing' | 'stageResult' | 'finished'
            teams: {},
            balls: {},
            results: [],
            myTeamId: null,

            // ── Grand Prix 상태 ──
            gpActive: false,        // GP 모드 진행 중
            gpStage: 0,             // 현재 스테이지 (0=미시작, 1,2,3)
            stageResults: [[], [], []], // 각 스테이지 결과
            gpFinalResults: [],     // 종합 순위
            gpCountdown: 0,         // 스테이지 전환 카운트다운 (초)

            // ── 내 파라미터 설정 (localStorage 저장) ──
            myLearningRate: 0.1,
            myMomentum: 0.9,
            mapLevel: 2,

            // ── 액션: 레이스 페이즈 ──
            setRacePhase: (phase) => set({ racePhase: phase }),

            // ── 액션: 팀 관리 ──
            setTeams: (teams) => set({ teams }),

            addTeam: (team) =>
                set((state) => ({
                    teams: { ...state.teams, [team.id]: team },
                })),

            setMyTeamId: (teamId) => set({ myTeamId: teamId }),

            // ── 액션: 파라미터 설정 ──
            setMyLearningRate: (lr) => set({ myLearningRate: lr }),
            setMyMomentum: (m) => set({ myMomentum: m }),
            setMapLevel: (level) => set({ mapLevel: level }),

            // ── 액션: 공 상태 업데이트 (서버 tick) ──
            updateBalls: (ballsData) => set({ balls: ballsData }),

            updateBall: (teamId, data) =>
                set((state) => ({
                    balls: {
                        ...state.balls,
                        [teamId]: { ...state.balls[teamId], ...data },
                    },
                })),

            // ── 액션: 결과 ──
            setResults: (results) => set({ results }),

            // ── Grand Prix 액션 ──
            setGpActive: (active) => set({ gpActive: active }),
            setGpStage: (stage) => set({ gpStage: stage }),
            setGpCountdown: (n) => set({ gpCountdown: n }),

            addStageResult: (stageIndex, results) =>
                set((state) => {
                    const newStageResults = [...state.stageResults];
                    newStageResults[stageIndex] = results;
                    return { stageResults: newStageResults };
                }),

            setGpFinalResults: (finalResults) => set({ gpFinalResults: finalResults }),

            // ── 전체 리셋 ──
            reset: () =>
                set({
                    racePhase: 'setup',
                    teams: {},
                    balls: {},
                    results: [],
                    myTeamId: null,
                    myLearningRate: 0.1,
                    myMomentum: 0.9,
                    mapLevel: 2,
                    gpActive: false,
                    gpStage: 0,
                    stageResults: [[], [], []],
                    gpFinalResults: [],
                    gpCountdown: 0,
                }),
        }),
        {
            name: 'microgpt-race',
            partialize: (state) => ({
                myLearningRate: state.myLearningRate,
                myMomentum: state.myMomentum,
            }),
        }
    )
);

export { TEAM_COLORS, calcGpPoints };
