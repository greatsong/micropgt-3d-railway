'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';

/**
 * roomCode가 없으면 홈으로 리다이렉트하는 가드 훅
 * 멀티플레이어 페이지(week3, week5, week10)에서 사용
 *
 * @param {Object} options
 * @param {boolean} options.required - roomCode 필수 여부 (기본 false = 솔로모드 허용)
 * @returns {{ roomCode: string, studentName: string, hasRoom: boolean }}
 */
export function useRequireRoom({ required = false } = {}) {
    const router = useRouter();
    const roomCode = useClassStore((s) => s.roomCode);
    const studentName = useClassStore((s) => s.studentName);

    useEffect(() => {
        if (required && !roomCode) {
            router.replace('/');
        }
    }, [required, roomCode, router]);

    return {
        roomCode: roomCode || '',
        studentName: studentName || '익명',
        hasRoom: !!roomCode,
    };
}
