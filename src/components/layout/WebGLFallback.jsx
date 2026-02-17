'use client';

import s from './WebGLFallback.module.css';

export default function WebGLFallback({ weekTitle, conceptSummary, onRetry, errorType }) {
    return (
        <div className={s.container}>
            <div className={`glass-card ${s.card}`}>
                {/* 아이콘 */}
                <div className={s.iconArea}>
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <rect x="8" y="8" width="64" height="64" rx="12" stroke="var(--accent-pulsar)" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                        <path d="M28 52L40 28L52 52" stroke="var(--accent-nova)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="40" cy="24" r="3" fill="var(--accent-star-cyan)" />
                        <circle cx="26" cy="54" r="3" fill="var(--accent-nebula-pink)" />
                        <circle cx="54" cy="54" r="3" fill="var(--accent-laser-gold)" />
                        <line x1="26" y1="54" x2="54" y2="54" stroke="var(--accent-pulsar)" strokeWidth="1.5" opacity="0.3" />
                        <line x1="40" y1="24" x2="26" y2="54" stroke="var(--accent-pulsar)" strokeWidth="1.5" opacity="0.3" />
                        <line x1="40" y1="24" x2="54" y2="54" stroke="var(--accent-pulsar)" strokeWidth="1.5" opacity="0.3" />
                    </svg>
                </div>

                {/* 제목 */}
                <h3 className={s.title}>{weekTitle || '3D 시각화'}</h3>

                {/* 오류 메시지 */}
                <div className={s.messageBox}>
                    <p className={s.message}>
                        {errorType === 'no-webgl'
                            ? '이 기기는 3D 시각화를 지원하지 않습니다.'
                            : errorType === 'context-lost'
                                ? '3D 렌더링이 일시적으로 중단되었습니다.'
                                : '3D 시각화를 불러오는 중 문제가 발생했습니다.'}
                    </p>
                    <p className={s.hint}>
                        {errorType === 'no-webgl'
                            ? '최신 Chrome 또는 Safari 브라우저를 사용해 보세요.'
                            : '다른 탭을 닫거나 브라우저를 새로고침하면 해결될 수 있습니다.'}
                    </p>
                </div>

                {/* 핵심 개념 요약 */}
                {conceptSummary && (
                    <div className={s.summaryBox}>
                        <div className={s.summaryHeader}>
                            <span className={s.summaryIcon}>📖</span>
                            <span className={s.summaryLabel}>핵심 개념 요약</span>
                        </div>
                        <p className={s.summaryText}>{conceptSummary}</p>
                    </div>
                )}

                {/* 다시 시도 버튼 */}
                {onRetry && (
                    <button className={`btn-nova ${s.retryBtn}`} onClick={onRetry}>
                        <span>🔄 다시 시도</span>
                    </button>
                )}
            </div>
        </div>
    );
}
