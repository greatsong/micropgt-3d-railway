'use client';

import { create } from 'zustand';

export const useClassStore = create((set, get) => ({
    // ── 접속 정보 ──
    studentName: '',
    schoolCode: '',
    roomCode: '',
    isConnected: false,
    isTeacher: false,

    // ── 교실 상태 ──
    students: [],
    currentWeek: 3,
    notifications: [],

    // ── 액션: 학생 입장 정보 설정 ──
    setStudentInfo: (name, school, room) =>
        set({ studentName: name, schoolCode: school, roomCode: room }),

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
}));
