'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';

/**
 * roomCode가 없으면 홈으로 리다이렉트하는 가드 훅
 * 멀티플레이어 페이지(week3, week5, week10)에서 사용
 *
 * Zustand persist의 hydration이 완료된 후에만 리다이렉트 판단을 수행.
 * hydration 전에는 localStorage 복원이 아직 안 된 상태이므로,
 * roomCode가 빈 문자열이어도 리다이렉트하지 않고 대기한다.
 *
 * @param {Object} options
 * @param {boolean} options.required - roomCode 필수 여부 (기본 false = 솔로모드 허용)
 * @returns {{ roomCode: string, studentName: string, hasRoom: boolean, isHydrated: boolean }}
 */
export function useRequireRoom({ required = false } = {}) {
    const router = useRouter();
    const roomCode = useClassStore((s) => s.roomCode);
    const studentName = useClassStore((s) => s.studentName);
    const isConnected = useClassStore((s) => s.isConnected);

    // Zustand persist hydration 상태 추적
    const [isHydrated, setIsHydrated] = useState(
        useClassStore.persist.hasHydrated()
    );

    useEffect(() => {
        // 이미 hydration 완료된 경우 스킵
        if (isHydrated) return;

        // hydration 완료 시 콜백
        const unsubscribe = useClassStore.persist.onFinishHydration(() => {
            setIsHydrated(true);
        });

        return unsubscribe;
    }, [isHydrated]);

    useEffect(() => {
        // hydration이 완료되지 않았으면 리다이렉트하지 않음
        if (!isHydrated) return;

        // 소켓 연결 중일 수 있으므로 잠시 대기 후 최종 판단
        if (required && !roomCode) {
            const timer = setTimeout(() => {
                // 타이머 후에도 roomCode가 없으면 리다이렉트
                const currentRoomCode = useClassStore.getState().roomCode;
                if (!currentRoomCode) {
                    router.replace('/');
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [required, roomCode, isHydrated, router]);

    return {
        roomCode: roomCode || '',
        studentName: studentName || '익명',
        hasRoom: !!roomCode,
        isHydrated,
    };
}
