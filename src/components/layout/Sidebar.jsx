'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CURRICULUM } from '@/constants/curriculum';
import useIsMobile from '@/lib/useIsMobile';

function getProgress() {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem('microgpt-progress') || '{}');
    } catch { return {}; }
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isHovered, setIsHovered] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [progress, setProgress] = useState({});

    useEffect(() => {
        setProgress(getProgress());
        const onStorage = () => setProgress(getProgress());
        window.addEventListener('storage', onStorage);
        window.addEventListener('microgpt-progress-update', onStorage);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('microgpt-progress-update', onStorage);
        };
    }, []);

    // 페이지 이동 시 모바일 메뉴 닫기
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const readyModules = CURRICULUM.filter(m => m.status === 'ready');
    const completedCount = readyModules.filter(m => progress[m.week]).length;
    const progressPercent = readyModules.length > 0 ? Math.round((completedCount / readyModules.length) * 100) : 0;

    // 확장 상태: 데스크톱은 hover, 모바일은 open 상태
    const isExpanded = isMobile ? isMobileOpen : isHovered;

    // ── 메뉴 아이템 렌더 (공통) ──
    const renderMenuItems = () => (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '10px 0',
        }}>
            {CURRICULUM.map((mod) => {
                const isActive = pathname.startsWith(mod.labPath) || pathname.startsWith(mod.introPath);
                const isReady = mod.status === 'ready';
                const isCompleted = progress[mod.week];

                const inner = (
                    <>
                        <span style={{
                            fontSize: '1.5rem',
                            width: 30,
                            textAlign: 'center',
                            marginRight: 16,
                            filter: isActive ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                            position: 'relative',
                            flexShrink: 0,
                        }}>
                            {mod.emoji}
                            {isCompleted && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -4,
                                    fontSize: '0.6rem',
                                    lineHeight: 1,
                                }}>✅</span>
                            )}
                        </span>

                        <div style={{
                            opacity: isExpanded ? 1 : 0,
                            transition: 'opacity 0.2s',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <span style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                color: isActive ? '#fff' : '#a5a0c0',
                            }}>
                                {mod.week}주차: {mod.title}
                            </span>
                            {mod.status !== 'ready' && (
                                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>🔒 준비중</span>
                            )}
                        </div>
                    </>
                );

                const commonStyle = {
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    cursor: isReady ? 'pointer' : 'default',
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${mod.color}` : '3px solid transparent',
                    transition: 'background 0.2s',
                    opacity: isReady ? 1 : 0.5,
                    textDecoration: 'none',
                };

                return isReady ? (
                    <Link key={mod.week} href={mod.introPath} style={commonStyle}>
                        {inner}
                    </Link>
                ) : (
                    <div key={mod.week} style={commonStyle}>
                        {inner}
                    </div>
                );
            })}
        </div>
    );

    // ── 모바일 렌더링 ──
    if (isMobile) {
        return (
            <>
                {/* 햄버거 버튼 */}
                {!isMobileOpen && (
                    <button
                        onClick={() => setIsMobileOpen(true)}
                        style={mobileStyles.hamburger}
                        aria-label="메뉴 열기"
                    >
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                            <path d="M3 6h16M3 11h16M3 16h16" stroke="#f0eef8" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                )}

                {/* 배경 딤 */}
                {isMobileOpen && (
                    <div
                        style={mobileStyles.backdrop}
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                {/* 슬라이드인 패널 */}
                <div style={{
                    ...mobileStyles.panel,
                    transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
                }}>
                    {/* 헤더 + 닫기 버튼 */}
                    <div style={mobileStyles.panelHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.5rem' }}>🚀</span>
                            <span style={{
                                fontWeight: 800,
                                fontSize: '1.05rem',
                                background: 'linear-gradient(to right, #fff, #a5a0c0)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                미션 센터
                            </span>
                        </div>
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            style={mobileStyles.closeBtn}
                            aria-label="메뉴 닫기"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 진행률 (항상 표시) */}
                    <div style={{
                        padding: '12px 16px 8px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.72rem',
                            color: '#a5a0c0',
                            marginBottom: 6,
                        }}>
                            <span>학습 진행률</span>
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>{completedCount}/{readyModules.length}</span>
                        </div>
                        <div style={{
                            height: 4,
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercent}%`,
                                background: 'linear-gradient(90deg, #7c5cfc, #22d3ee)',
                                borderRadius: 2,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>

                    {/* 메뉴 목록 */}
                    {renderMenuItems()}

                    {/* 하단 버튼 */}
                    <div style={{
                        padding: 16,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        gap: 8,
                    }}>
                        <button onClick={() => router.push('/')} style={sidebarStyles.footerBtn}>
                            🏠 홈
                        </button>
                        <button onClick={() => router.push('/dashboard')} style={sidebarStyles.footerBtn}>
                            📊 대시보드
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ── 데스크톱 렌더링 (기존 hover 방식) ──
    return (
        <div
            style={{
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                width: isHovered ? 260 : 70,
                background: isHovered ? 'rgba(15, 10, 40, 0.95)' : 'rgba(15, 10, 40, 0.6)',
                backdropFilter: 'blur(12px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 100,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: isHovered ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 로고 영역 */}
            <div
                style={{
                    height: 70,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
                onClick={() => router.push('/hub')}
            >
                <span style={{ fontSize: '1.8rem', marginRight: 16 }}>🚀</span>
                <span style={{
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s',
                    background: 'linear-gradient(to right, #fff, #a5a0c0)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    미션 센터
                </span>
            </div>

            {/* 진행률 표시 */}
            {isHovered && (
                <div style={{
                    padding: '12px 16px 8px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.72rem',
                        color: '#a5a0c0',
                        marginBottom: 6,
                    }}>
                        <span>학습 진행률</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>{completedCount}/{readyModules.length}</span>
                    </div>
                    <div style={{
                        height: 4,
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${progressPercent}%`,
                            background: 'linear-gradient(90deg, #7c5cfc, #22d3ee)',
                            borderRadius: 2,
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* 메뉴 목록 */}
            {renderMenuItems()}

            {/* 하단 버튼 */}
            <div style={{
                padding: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: isHovered ? 'flex' : 'none',
                gap: 8,
            }}>
                <button onClick={() => router.push('/')} style={sidebarStyles.footerBtn}>
                    🏠 홈
                </button>
                <button onClick={() => router.push('/dashboard')} style={sidebarStyles.footerBtn}>
                    📊 대시보드
                </button>
            </div>
        </div>
    );
}

const mobileStyles = {
    hamburger: {
        position: 'fixed',
        top: 14,
        left: 14,
        zIndex: 160,
        width: 44,
        height: 44,
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(15, 10, 40, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
    },
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 150,
    },
    panel: {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 280,
        background: 'rgba(15, 10, 40, 0.97)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 160,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 30px rgba(0,0,0,0.5)',
    },
    panelHeader: {
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#a5a0c0',
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
};

const sidebarStyles = {
    footerBtn: {
        flex: 1,
        padding: '8px 0',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#a5a0c0',
        fontSize: '0.8rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
    },
};
