'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CURRICULUM } from '@/constants/curriculum';
import useIsMobile from '@/lib/useIsMobile';
import s from './Sidebar.module.css';

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
        <div className={s.menuScroll}>
            {CURRICULUM.map((mod) => {
                const isActive = pathname.startsWith(mod.labPath) || pathname.startsWith(mod.introPath);
                const isReady = mod.status === 'ready';
                const isCompleted = progress[mod.week];

                const inner = (
                    <>
                        <span
                            className={s.menuItemEmoji}
                            style={{
                                filter: isActive ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                            }}
                        >
                            {mod.emoji}
                            {isCompleted && (
                                <span className={s.completedBadge}>✅</span>
                            )}
                        </span>

                        <div
                            className={s.menuItemLabel}
                            style={{ opacity: isExpanded ? 1 : 0 }}
                        >
                            <span
                                className={s.menuItemTitle}
                                style={{ color: isActive ? '#fff' : '#a5a0c0' }}
                            >
                                {mod.week}주차: {mod.title}
                            </span>
                            {mod.status !== 'ready' && (
                                <span className={s.menuItemLock}>🔒 준비중</span>
                            )}
                        </div>
                    </>
                );

                const dynamicStyle = {
                    cursor: isReady ? 'pointer' : 'default',
                    background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${mod.color}` : '3px solid transparent',
                    opacity: isReady ? 1 : 0.5,
                };

                return isReady ? (
                    <Link key={mod.week} href={mod.introPath} className={s.menuItemCommon} style={dynamicStyle}>
                        {inner}
                    </Link>
                ) : (
                    <div key={mod.week} className={s.menuItemCommon} style={dynamicStyle}>
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
                        className={s.hamburger}
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
                        className={s.backdrop}
                        onClick={() => setIsMobileOpen(false)}
                    />
                )}

                {/* 슬라이드인 패널 */}
                <div
                    className={s.panel}
                    style={{ transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
                >
                    {/* 헤더 + 닫기 버튼 */}
                    <div className={s.panelHeader}>
                        <div className={s.panelHeaderLeft}>
                            <span className={s.panelHeaderEmoji}>🚀</span>
                            <span className={s.panelHeaderTitle}>미션 센터</span>
                        </div>
                        <button
                            onClick={() => setIsMobileOpen(false)}
                            className={s.closeBtn}
                            aria-label="메뉴 닫기"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 진행률 (항상 표시) */}
                    <div className={s.progressSection}>
                        <div className={s.progressHeader}>
                            <span>학습 진행률</span>
                            <span className={s.progressCount}>{completedCount}/{readyModules.length}</span>
                        </div>
                        <div className={s.progressTrack}>
                            <div className={s.progressBar} style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>

                    {/* 메뉴 목록 */}
                    {renderMenuItems()}

                    {/* 하단 버튼 */}
                    <div className={s.mobileFooter}>
                        <button onClick={() => router.push('/')} className={s.footerBtn}>
                            🏠 홈
                        </button>
                        <button onClick={() => router.push('/dashboard')} className={s.footerBtn}>
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
            className={s.desktopSidebar}
            style={{
                width: isHovered ? 260 : 70,
                background: isHovered ? 'rgba(15, 10, 40, 0.95)' : 'rgba(15, 10, 40, 0.6)',
                boxShadow: isHovered ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* 로고 영역 */}
            <div
                className={s.logoArea}
                onClick={() => router.push('/hub')}
            >
                <span className={s.logoEmoji}>🚀</span>
                <span
                    className={s.logoText}
                    style={{ opacity: isHovered ? 1 : 0 }}
                >
                    미션 센터
                </span>
            </div>

            {/* 진행률 표시 */}
            {isHovered && (
                <div className={s.progressSection}>
                    <div className={s.progressHeader}>
                        <span>학습 진행률</span>
                        <span className={s.progressCount}>{completedCount}/{readyModules.length}</span>
                    </div>
                    <div className={s.progressTrack}>
                        <div className={s.progressBar} style={{ width: `${progressPercent}%` }} />
                    </div>
                </div>
            )}

            {/* 메뉴 목록 */}
            {renderMenuItems()}

            {/* 하단 버튼 */}
            <div
                className={s.footerArea}
                style={{ display: isHovered ? 'flex' : 'none' }}
            >
                <button onClick={() => router.push('/')} className={s.footerBtn}>
                    🏠 홈
                </button>
                <button onClick={() => router.push('/dashboard')} className={s.footerBtn}>
                    📊 대시보드
                </button>
            </div>
        </div>
    );
}
