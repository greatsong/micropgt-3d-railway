'use client';

import { io } from 'socket.io-client';

let socket = null;
let reconnectHandlerRegistered = false;

export function getSocket() {
    if (!socket) {
        socket = io({
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            randomizationFactor: 0.5,
        });

        // 연결 에러 로깅
        socket.on('connect_error', (err) => {
            console.warn('[socket] connect_error:', err.message);
        });
    }
    return socket;
}

export function connectSocket() {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

export function disconnectSocket() {
    if (socket && socket.connected) {
        socket.disconnect();
    }
}

/**
 * 재연결 성공 시 자동으로 방에 재입장하는 핸들러 등록.
 * useClassStore에서 roomCode, studentName, schoolCode를 읽어 join_class를 다시 emit한다.
 * 여러 번 호출해도 핸들러는 한 번만 등록된다.
 *
 * @param {Function} getStoreState - useClassStore.getState (zustand)
 */
export function setupReconnectHandler(getStoreState) {
    const s = getSocket();

    // 중복 등록 방지
    if (reconnectHandlerRegistered) return;
    reconnectHandlerRegistered = true;

    s.io.on('reconnect', (attemptNumber) => {
        console.log(`[socket] 재연결 성공 (시도 ${attemptNumber}회)`);

        const { roomCode, studentName, schoolCode } = getStoreState();
        if (roomCode) {
            console.log(`[socket] 방 재입장: ${roomCode}`);
            s.emit('join_class', {
                studentName: studentName || '익명',
                schoolCode: schoolCode || 'UNKNOWN',
                roomCode,
            });
        }
    });
}
