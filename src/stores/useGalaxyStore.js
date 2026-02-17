'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGalaxyStore = create(
    persist(
        (set, get) => ({
            // ── 은하수 노드(별) 데이터 (실시간 — 저장 안 함) ──
            stars: {},

            // ── 내 별 (localStorage 저장) ──
            myWord: '',
            myPosition: { x: 0, y: 0, z: 0 },

            // ── 액션: 별 등록/갱신 ──
            addOrUpdateStar: (studentId, data) =>
                set((state) => ({
                    stars: {
                        ...state.stars,
                        [studentId]: { ...state.stars[studentId], ...data },
                    },
                })),

            removeStar: (studentId) =>
                set((state) => {
                    const next = { ...state.stars };
                    delete next[studentId];
                    return { stars: next };
                }),

            // ── 내 단어 설정 ──
            setMyWord: (word) => set({ myWord: word }),

            // ── 내 좌표 이동 (슬라이더) ──
            setMyPosition: (pos) => set({ myPosition: pos }),

            // ── 전체 초기화 (방 떠날 때) ──
            reset: () => set({ stars: {}, myWord: '', myPosition: { x: 0, y: 0, z: 0 } }),

            // ── 방 상태로부터 별 일괄 로드 ──
            loadFromRoomState: (students) => {
                const stars = {};
                students.forEach((s) => {
                    if (s.word) {
                        stars[s.id] = {
                            studentName: s.studentName,
                            word: s.word,
                            position: s.position,
                            color: s.color,
                        };
                    }
                });
                set({ stars });
            },
        }),
        {
            name: 'microgpt-galaxy',
            partialize: (state) => ({
                myWord: state.myWord,
            }),
        }
    )
);
