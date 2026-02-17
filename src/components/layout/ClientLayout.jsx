'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import useIsMobile from '@/lib/useIsMobile';
import { getSocket } from '@/lib/socket';

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
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
            {!isHidden && <Sidebar />}

            {/* Socket 재연결 배너 */}
            {socketStatus === 'reconnecting' && (
                <div style={bannerStyles.reconnecting}>
                    <span className="animate-spin" style={{ display: 'inline-block' }}>⟳</span> 서버 재연결 중...
                </div>
            )}
            {socketStatus === 'disconnected' && (
                <div style={bannerStyles.disconnected}>
                    서버와 연결이 끊어졌습니다. 네트워크를 확인해주세요.
                </div>
            )}

            {/* 테마 토글 버튼 */}
            <button
                onClick={toggleTheme}
                style={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    zIndex: 200,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-glass)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                }}
                title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
                {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <div style={{
                flex: 1,
                paddingLeft: isHidden || isMobile ? 0 : 70,
                width: '100%',
                transition: 'padding-left 0.3s',
            }}>
                <div
                    style={{
                        opacity: isTransitioning ? 0 : 1,
                        transform: isTransitioning ? 'translateY(12px)' : 'translateY(0)',
                        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
                    }}
                >
                    {displayChildren}
                </div>
            </div>
        </div>
    );
}

const bannerStyles = {
    reconnecting: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: '#92400e',
        background: 'linear-gradient(90deg, rgba(251,191,36,0.9), rgba(245,158,11,0.9))',
        backdropFilter: 'blur(8px)',
    },
    disconnected: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '0.82rem',
        fontWeight: 600,
        color: '#fff',
        background: 'linear-gradient(90deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))',
        backdropFilter: 'blur(8px)',
    },
};
