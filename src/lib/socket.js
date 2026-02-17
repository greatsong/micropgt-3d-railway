'use client';

import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
    if (!socket) {
        socket = io({
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
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
