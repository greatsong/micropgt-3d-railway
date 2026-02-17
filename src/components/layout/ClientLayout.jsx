'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import QuizOverlay from '@/components/quiz/QuizOverlay';
import useIsMobile from '@/lib/useIsMobile';
import { getSocket } from '@/lib/socket';
import s from './ClientLayout.module.css';

function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem('microgpt-theme') || 'dark';
}

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isMobile = useIsMobile();
    const isHidden = ['/', '/dashboard', '/hub'].includes(pathname);

    // 테마 상태
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = getInitialTheme();
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('microgpt-theme', next);
    };

    // Socket 재연결 상태
    const [socketStatus, setSocketStatus] = useState('idle'); // idle | connected | reconnecting | disconnected

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const onConnect = () => setSocketStatus('connected');
        const onDisconnect = () => setSocketStatus('disconnected');
        const onReconnectAttempt = () => setSocketStatus('reconnecting');
        const onReconnectFailed = () => setSocketStatus('disconnected');

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.io.on('reconnect_attempt', onReconnectAttempt);
        socket.io.on('reconnect_failed', onReconnectFailed);

        if (socket.connected) setSocketStatus('connected');

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.io.off('reconnect_attempt', onReconnectAttempt);
            socket.io.off('reconnect_failed', onReconnectFailed);
        };
    }, []);

    // 페이지 전환 애니메이션
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [displayChildren, setDisplayChildren] = useState(children);

    useEffect(() => {
        setIsTransitioning(true);
        const timer = setTimeout(() => {
            setDisplayChildren(children);
            setIsTransitioning(false);
        }, 80);
        return () => clearTimeout(timer);
    }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className={s.root}>
            {!isHidden && <Sidebar />}

            {/* Socket 재연결 배너 */}
            {socketStatus === 'reconnecting' && (
                <div className={s.bannerReconnecting}>
                    <span className={`animate-spin ${s.spinIcon}`}>⟳</span> 서버 재연결 중...
                </div>
            )}
            {socketStatus === 'disconnected' && (
                <div className={s.bannerDisconnected}>
                    서버와 연결이 끊어졌습니다. 네트워크를 확인해주세요.
                </div>
            )}

            {/* 테마 토글 버튼 */}
            <button
                onClick={toggleTheme}
                className={s.themeToggle}
                title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div
                className={s.contentArea}
                style={{ paddingLeft: isHidden || isMobile ? 0 : 70 }}
            >
                <div
                    className={s.transitionWrapper}
                    style={{
                        opacity: isTransitioning ? 0 : 1,
                        transform: isTransitioning ? 'translateY(12px)' : 'translateY(0)',
                    }}
                >
                    {displayChildren}
                </div>
            </div>

            {/* 교사 퀴즈 오버레이 (모든 페이지에서 작동) */}
            <QuizOverlay />
        </div>
    );
}
