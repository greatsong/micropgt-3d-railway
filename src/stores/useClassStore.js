'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 브라우저 탭 고유 ID (새로고침해도 유지, 탭마다 다름)
function getOrCreateStableId() {
    if (typeof window === 'undefined') return '';
    let id = sessionStorage.getItem('microgpt-stableId');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('microgpt-stableId', id);
    }
    return id;
}

export const useClassStore = create(
    persist(
        (set, get) => ({
            // ── 접속 정보 (localStorage 저장) ──
            studentName: '',   // 팀 이름 (레이싱 팀명으로 사용)
            memberNames: '',   // 팀원 학번/이름 (기록용)
            roomCode: '',

            // ── 실시간 상태 (저장 안 함) ──
            isConnected: false,
            isTeacher: false,
            students: [],
            currentWeek: 3,
            notifications: [],

            // ── 안정적 식별자 ──
            getStableId: () => getOrCreateStableId(),

            // ── 액션: 학생 입장 정보 설정 ──
            setStudentInfo: (name, room, members) =>
                set({ studentName: name, roomCode: room, memberNames: members || '' }),

            setConnected: (val) => set({ isConnected: val }),
            setTeacher: (val) => set({ isTeacher: val }),

            // ── 액션: 학생 목록 갱신 ──
            setStudents: (students) => set({ students }),

            addStudent: (student) =>
                set((state) => ({
                    students: [...state.students.filter((s) => s.id !== student.id), student],
                })),

            removeStudent: (studentId) =>
                set((state) => ({
                    students: state.students.filter((s) => s.id !== studentId),
                })),

            // ── 액션: 알림 ──
            addNotification: (msg) =>
                set((state) => ({
                    notifications: [
                        { id: Date.now(), message: msg, time: new Date().toLocaleTimeString('ko-KR') },
                        ...state.notifications,
                    ].slice(0, 50),
                })),

            // ── 주차 전환 ──
            setCurrentWeek: (week) => set({ currentWeek: week }),

            // ── 방 삭제 시 상태 초기화 ──
            clearRoom: () => set({ roomCode: '', isConnected: false, students: [] }),
        }),
        {
            name: 'microgpt-class',
            partialize: (state) => ({
                studentName: state.studentName,
                memberNames: state.memberNames,
                roomCode: state.roomCode,
            }),
        }
    )
);
