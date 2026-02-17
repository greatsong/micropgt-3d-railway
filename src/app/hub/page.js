'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';
import { CURRICULUM } from '@/constants/curriculum';

function getProgress() {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem('microgpt-progress') || '{}');
    } catch { return {}; }
}

function setProgressItem(week, completed) {
    const progress = getProgress();
    if (completed) {
        progress[week] = true;
    } else {
        delete progress[week];
    }
    localStorage.setItem('microgpt-progress', JSON.stringify(progress));
    window.dispatchEvent(new Event('microgpt-progress-update'));
}

export default function HubPage() {
    const router = useRouter();
    const studentName = useClassStore((s) => s.studentName);
    const [progress, setProgress] = useState({});

    useEffect(() => {
        setProgress(getProgress());
    }, []);

    const toggleComplete = useCallback((e, week) => {
        e.stopPropagation();
        const current = getProgress();
        const next = !current[week];
        setProgressItem(week, next);
        setProgress(getProgress());
    }, []);

    const readyModules = CURRICULUM.filter(m => m.status === 'ready');
    const completedCount = readyModules.filter(m => progress[m.week]).length;
    const progressPercent = readyModules.length > 0 ? Math.round((completedCount / readyModules.length) * 100) : 0;

    return (
        <div style={styles.container}>
            {/* 헤더 */}
            <div style={styles.header}>
                <h1 style={styles.mainTitle}>
                    <span className="text-gradient">🚀 미션 센터</span>
                </h1>
                <p style={styles.headerSub}>
                    {studentName ? `${studentName}님, ` : ''}학습할 모듈을 선택하세요!
                </p>
            </div>

            {/* 진행률 요약 */}
            <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>전체 진행률</span>
                    <span style={styles.progressCount}>
                        {completedCount} / {readyModules.length} 완료
                        {progressPercent === 100 && ' 🎉'}
                    </span>
                </div>
                <div style={styles.progressTrack}>
                    <div style={{
                        ...styles.progressFill,
                        width: `${progressPercent}%`,
                    }} />
                </div>
                {progressPercent > 0 && progressPercent < 100 && (
                    <p style={styles.progressHint}>
                        💡 학습을 마친 모듈은 카드의 체크 버튼을 눌러 완료 표시하세요!
                    </p>
                )}
                {progressPercent === 0 && (
                    <p style={styles.progressHint}>
                        📖 학습을 시작하고, 완료한 모듈에 체크 표시를 해보세요!
                    </p>
                )}
            </div>

            {/* 모듈 카드 그리드 */}
            <div style={styles.grid}>
                {CURRICULUM.map((mod, index) => {
                    const isCompleted = progress[mod.week];
                    return (
                        <div
                            key={mod.week}
                            className={`hub-card${isCompleted ? ' completed' : ''}`}
                            style={{
                                ...styles.card,
                                border: `1px solid ${isCompleted
                                    ? 'rgba(16, 185, 129, 0.4)'
                                    : mod.status === 'ready' ? mod.color + '40' : 'rgba(107, 114, 128, 0.15)'}`,
                                opacity: mod.status === 'coming' ? 0.6 : undefined,
                                cursor: mod.status === 'ready' ? 'pointer' : 'default',
                                animationDelay: `${index * 0.06}s`,
                            }}
                            onClick={() => mod.status === 'ready' && router.push(mod.introPath)}
                        >
                            {/* 배지 */}
                            <div style={styles.cardHeader}>
                                <span style={{
                                    ...styles.weekBadge,
                                    background: mod.color + '20',
                                    color: mod.color,
                                }}>
                                    {mod.week}주차
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {mod.status === 'coming' && (
                                        <span style={styles.comingSoon}>🔒 준비중</span>
                                    )}
                                    {mod.status === 'ready' && (
                                        <button
                                            onClick={(e) => toggleComplete(e, mod.week)}
                                            style={{
                                                ...styles.checkBtn,
                                                background: isCompleted
                                                    ? 'rgba(16, 185, 129, 0.2)'
                                                    : 'rgba(255,255,255,0.05)',
                                                border: `1px solid ${isCompleted
                                                    ? 'rgba(16, 185, 129, 0.4)'
                                                    : 'rgba(255,255,255,0.15)'}`,
                                                color: isCompleted ? '#10b981' : '#6b7280',
                                            }}
                                            title={isCompleted ? '완료 취소' : '학습 완료 표시'}
                                        >
                                            {isCompleted ? '✅ 완료' : '⬜ 미완료'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 완료 뱃지 */}
                            {isCompleted && (
                                <div style={styles.completedBadge}>
                                    ✅ 완료!
                                </div>
                            )}

                            {/* 이모지 */}
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>
                                {mod.emoji}
                            </div>

                            {/* 제목 */}
                            <h2 style={{ ...styles.cardTitle, color: mod.status === 'ready' ? '#f1f5f9' : '#6b7280' }}>
                                {mod.title}
                            </h2>
                            <p style={styles.cardSubtitle}>{mod.subtitle}</p>

                            {/* 설명 */}
                            <p style={styles.cardDesc}>{mod.description}</p>

                            {/* 태그 */}
                            <div style={styles.tagRow}>
                                {mod.tags.map((tag) => (
                                    <span key={tag} style={{ ...styles.tag, border: `1px solid ${mod.color}30` }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* 버튼 */}
                            {mod.status === 'ready' && (
                                <button
                                    className="btn-nova"
                                    style={{ width: '100%', marginTop: 16, padding: '10px 0', fontSize: '0.9rem' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(mod.introPath);
                                    }}
                                >
                                    <span>{isCompleted ? '🔄 다시 학습' : '📖 학습 시작'}</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 하단 안내 */}
            <div style={styles.footer}>
                <p>💡 각 모듈은 <strong>개념 학습 → 인터랙티브 실습</strong> 순서로 진행됩니다.</p>
                <button
                    className="btn-nova"
                    style={{ marginTop: 12, padding: '8px 24px', fontSize: '0.85rem' }}
                    onClick={() => router.push('/')}
                >
                    <span>🏠 로비로 돌아가기</span>
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: '100vh',
        padding: '40px 24px',
        maxWidth: 1100,
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        marginBottom: 24,
    },
    mainTitle: {
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: 8,
    },
    headerSub: {
        fontSize: '1rem',
        color: 'var(--text-secondary)',
    },
    // ── 진행률 ──
    progressSection: {
        background: 'rgba(15, 10, 40, 0.5)',
        border: '1px solid rgba(124, 92, 252, 0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 28,
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: '0.9rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
    },
    progressCount: {
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#fbbf24',
    },
    progressTrack: {
        height: 8,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: 'linear-gradient(90deg, #7c5cfc, #22d3ee, #10b981)',
        borderRadius: 4,
        transition: 'width 0.5s ease',
    },
    progressHint: {
        marginTop: 8,
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        textAlign: 'center',
    },
    // ── 그리드 ──
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 20,
    },
    card: {
        padding: 24,
        borderRadius: 16,
        background: 'rgba(15, 10, 40, 0.5)',
        border: '1px solid',
        transition: 'all 0.3s',
        textAlign: 'center',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    weekBadge: {
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
    },
    comingSoon: {
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--text-dim)',
    },
    checkBtn: {
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: '0.7rem',
        fontWeight: 600,
        border: '1px solid',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    cardTitle: {
        fontSize: '1.2rem',
        fontWeight: 800,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        marginBottom: 12,
    },
    cardDesc: {
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        lineHeight: 1.6,
        marginBottom: 12,
    },
    tagRow: {
        display: 'flex',
        gap: 6,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    tag: {
        padding: '2px 8px',
        borderRadius: 8,
        fontSize: '0.68rem',
        border: '1px solid',
        color: 'var(--text-dim)',
    },
    completedBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: 100,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#10b981',
        background: 'rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        marginBottom: 8,
    },
    footer: {
        textAlign: 'center',
        marginTop: 40,
        padding: 20,
        fontSize: '0.85rem',
        color: 'var(--text-dim)',
    },
};
