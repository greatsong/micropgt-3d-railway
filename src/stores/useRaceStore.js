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

export const useRaceStore = create(
    persist(
        (set, get) => ({
            // ── 레이스 상태 (실시간 — 저장 안 함) ──
            racePhase: 'setup', // 'setup' | 'racing' | 'finished'
            teams: {},
            balls: {},
            results: [],
            myTeamId: null,

            // ── 내 파라미터 설정 (localStorage 저장) ──
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

export { TEAM_COLORS };
