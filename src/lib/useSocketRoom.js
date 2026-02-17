'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useClassStore } from '@/stores/useClassStore';
import { getSocket, connectSocket } from '@/lib/socket';

/**
 * 소켓 방 입장 + 이벤트 바인딩 커스텀 훅
 * - 중복 이벤트 등록 방지 (핸들러 참조로 정확히 제거)
 * - roomCode 없으면 자동 감지
 *
 * @param {Object} options
 * @param {Object} options.events - { eventName: handlerFn } 맵
 * @param {boolean} options.autoJoin - 자동으로 join_class 할지 (기본 true)
 * @returns {{ socket: Socket, emit: Function }}
 */
export function useSocketRoom({ events = {}, autoJoin = true } = {}) {
    const studentName = useClassStore((s) => s.studentName);
    const schoolCode = useClassStore((s) => s.schoolCode);
    const roomCode = useClassStore((s) => s.roomCode);
    const handlersRef = useRef({});

    useEffect(() => {
        const socket = getSocket();
        if (!socket.connected) connectSocket();

        // 이벤트 핸들러 등록 (핸들러 참조 저장)
        const currentHandlers = {};
        for (const [event, handler] of Object.entries(events)) {
            currentHandlers[event] = handler;
            socket.on(event, handler);
        }
        handlersRef.current = currentHandlers;

        // 자동 방 입장
        const handleConnect = () => {
            if (autoJoin && roomCode) {
                socket.emit('join_class', {
                    studentName: studentName || '익명',
                    schoolCode: schoolCode || 'UNKNOWN',
                    roomCode,
                });
            }
        };

        if (socket.connected && autoJoin && roomCode) handleConnect();
        socket.on('connect', handleConnect);

        return () => {
            // 정확한 핸들러 참조로 제거 (다른 곳에서 등록한 이벤트 보존)
            socket.off('connect', handleConnect);
            for (const [event, handler] of Object.entries(currentHandlers)) {
                socket.off(event, handler);
            }
        };
    }, [roomCode, studentName, schoolCode, autoJoin]); // eslint-disable-line react-hooks/exhaustive-deps

    const emit = useCallback((event, data) => {
        const socket = getSocket();
        socket.emit(event, data);
    }, []);

    return { socket: getSocket(), emit };
}
