'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useClassStore } from '@/stores/useClassStore';
import { CURRICULUM } from '@/constants/curriculum';
import s from './page.module.css';

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
    const studentName = useClassStore((st) => st.studentName);
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
        <div className={s.container}>
            {/* 헤더 */}
            <div className={s.header}>
                <h1 className={s.mainTitle}>
                    <span className="text-gradient">🚀 미션 센터</span>
                </h1>
                <p className={s.headerSub}>
                    {studentName ? `${studentName}님, ` : ''}학습할 모듈을 선택하세요!
                </p>
            </div>

            {/* 진행률 요약 */}
            <div className={s.progressSection}>
                <div className={s.progressHeader}>
                    <span className={s.progressLabel}>전체 진행률</span>
                    <span className={s.progressCount}>
                        {completedCount} / {readyModules.length} 완료
                        {progressPercent === 100 && ' 🎉'}
                    </span>
                </div>
                <div className={s.progressTrack}>
                    <div
                        className={s.progressFill}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                {progressPercent > 0 && progressPercent < 100 && (
                    <p className={s.progressHint}>
                        💡 학습을 마친 모듈은 카드의 체크 버튼을 눌러 완료 표시하세요!
                    </p>
                )}
                {progressPercent === 0 && (
                    <p className={s.progressHint}>
                        📖 학습을 시작하고, 완료한 모듈에 체크 표시를 해보세요!
                    </p>
                )}
            </div>

            {/* 모듈 카드 그리드 */}
            <div className={s.grid}>
                {CURRICULUM.map((mod, index) => {
                    const isCompleted = progress[mod.week];
                    return (
                        <div
                            key={mod.week}
                            className={`hub-card${isCompleted ? ' completed' : ''} ${s.card}`}
                            style={{
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
                            <div className={s.cardHeader}>
                                <span
                                    className={s.weekBadge}
                                    style={{
                                        background: mod.color + '20',
                                        color: mod.color,
                                    }}
                                >
                                    {mod.week}주차
                                </span>
                                <div className={s.cardBtnRow}>
                                    {mod.status === 'coming' && (
                                        <span className={s.comingSoon}>🔒 준비중</span>
                                    )}
                                    {mod.status === 'ready' && (
                                        <button
                                            onClick={(e) => toggleComplete(e, mod.week)}
                                            className={s.checkBtn}
                                            style={{
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
                                <div className={s.completedBadge}>
                                    ✅ 완료!
                                </div>
                            )}

                            {/* 이모지 */}
                            <div className={s.cardEmoji}>
                                {mod.emoji}
                            </div>

                            {/* 제목 */}
                            <h2 className={s.cardTitle} style={{ color: mod.status === 'ready' ? '#f1f5f9' : '#6b7280' }}>
                                {mod.title}
                            </h2>
                            <p className={s.cardSubtitle}>{mod.subtitle}</p>

                            {/* 설명 */}
                            <p className={s.cardDesc}>{mod.description}</p>

                            {/* 태그 */}
                            <div className={s.tagRow}>
                                {mod.tags.map((tag) => (
                                    <span key={tag} className={s.tag} style={{ border: `1px solid ${mod.color}30` }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>

                            {/* 버튼 */}
                            {mod.status === 'ready' && (
                                <button
                                    className={`btn-nova ${s.cardBtn}`}
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
            <div className={s.footer}>
                <p>💡 각 모듈은 <strong>개념 학습 → 인터랙티브 실습</strong> 순서로 진행됩니다.</p>
                <button
                    className={`btn-nova ${s.footerBtn}`}
                    onClick={() => router.push('/')}
                >
                    <span>🏠 로비로 돌아가기</span>
                </button>
            </div>
        </div>
    );
}
