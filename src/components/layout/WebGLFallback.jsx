'use client';

export default function WebGLFallback({ weekTitle, conceptSummary, onRetry, errorType }) {
    return (
        <div style={styles.container}>
            <div className="glass-card" style={styles.card}>
                {/* 아이콘 */}
                <div style={styles.iconArea}>
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
                <h3 style={styles.title}>{weekTitle || '3D 시각화'}</h3>

                {/* 오류 메시지 */}
                <div style={styles.messageBox}>
                    <p style={styles.message}>
                        {errorType === 'no-webgl'
                            ? '이 기기는 3D 시각화를 지원하지 않습니다.'
                            : errorType === 'context-lost'
                                ? '3D 렌더링이 일시적으로 중단되었습니다.'
                                : '3D 시각화를 불러오는 중 문제가 발생했습니다.'}
                    </p>
                    <p style={styles.hint}>
                        {errorType === 'no-webgl'
                            ? '최신 Chrome 또는 Safari 브라우저를 사용해 보세요.'
                            : '다른 탭을 닫거나 브라우저를 새로고침하면 해결될 수 있습니다.'}
                    </p>
                </div>

                {/* 핵심 개념 요약 */}
                {conceptSummary && (
                    <div style={styles.summaryBox}>
                        <div style={styles.summaryHeader}>
                            <span style={styles.summaryIcon}>📖</span>
                            <span style={styles.summaryLabel}>핵심 개념 요약</span>
                        </div>
                        <p style={styles.summaryText}>{conceptSummary}</p>
                    </div>
                )}

                {/* 다시 시도 버튼 */}
                {onRetry && (
                    <button className="btn-nova" onClick={onRetry} style={styles.retryBtn}>
                        <span>🔄 다시 시도</span>
                    </button>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-void)',
        padding: 24,
    },
    card: {
        maxWidth: 480,
        width: '100%',
        padding: '40px 32px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
    },
    iconArea: {
        marginBottom: 4,
        opacity: 0.8,
    },
    title: {
        fontSize: '1.3rem',
        fontWeight: 800,
        color: 'var(--text-primary)',
    },
    messageBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    message: {
        fontSize: '0.95rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
    },
    hint: {
        fontSize: '0.8rem',
        color: 'var(--text-dim)',
        lineHeight: 1.5,
    },
    summaryBox: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        background: 'rgba(124, 92, 252, 0.06)',
        border: '1px solid rgba(124, 92, 252, 0.15)',
        textAlign: 'left',
    },
    summaryHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    summaryIcon: {
        fontSize: '1rem',
    },
    summaryLabel: {
        fontSize: '0.8rem',
        fontWeight: 700,
        color: 'var(--accent-pulsar)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    summaryText: {
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
    },
    retryBtn: {
        marginTop: 8,
        padding: '10px 28px',
        fontSize: '0.9rem',
    },
};
