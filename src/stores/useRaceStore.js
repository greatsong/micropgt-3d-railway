'use client';

import { create } from 'zustand';

// 팀 색상 프리셋
const TEAM_COLORS = [
    '#f43f5e', // 로즈
    '#3b82f6', // 블루
    '#10b981', // 에메랄드
    '#f59e0b', // 앰버
    '#8b5cf6', // 바이올렛
    '#06b6d4', // 시안
];

export const useRaceStore = create((set, get) => ({
    // ── 레이스 상태 ──
    racePhase: 'setup', // 'setup' | 'racing' | 'finished'

    // ── 팀 데이터 ──
    teams: {},
    // key: teamId → { id, name, color, members[], learningRate, momentum }

    // ── 공 상태 (서버에서 수신) ──
    balls: {},
    // key: teamId → { x, z, y(loss), vx, vz, trail[], status, loss }

    // ── 레이스 결과 ──
    results: [],
    // [{ teamId, teamName, finalLoss, rank, time }]

    // ── 내 팀 ──
    myTeamId: null,

    // ── 내 파라미터 설정 ──
    myLearningRate: 0.1,
    myMomentum: 0.9,

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
        }),
}));

export { TEAM_COLORS };
