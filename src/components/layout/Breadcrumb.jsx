'use client';

import Link from 'next/link';

export default function Breadcrumb({ items = [], current }) {
    return (
        <nav style={styles.nav} aria-label="breadcrumb">
            <Link href="/hub" style={styles.link}>
                미션 센터
            </Link>
            {items.map((item, i) => (
                <span key={i} style={styles.separator}>
                    <span style={styles.arrow}>/</span>
                    {item.href ? (
                        <Link href={item.href} style={styles.link}>
                            {item.label}
                        </Link>
                    ) : (
                        <span style={styles.link}>{item.label}</span>
                    )}
                </span>
            ))}
            {current && (
                <span style={styles.separator}>
                    <span style={styles.arrow}>/</span>
                    <span style={styles.current}>{current}</span>
                </span>
            )}
        </nav>
    );
}

const styles = {
    nav: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        padding: '8px 0',
        fontSize: '0.78rem',
    },
    link: {
        color: 'var(--text-dim)',
        textDecoration: 'none',
        fontWeight: 500,
        transition: 'color 0.2s',
    },
    separator: {
        display: 'flex',
        alignItems: 'center',
        gap: 2,
    },
    arrow: {
        color: 'var(--text-dim)',
        opacity: 0.5,
        margin: '0 4px',
    },
    current: {
        color: 'var(--text-primary)',
        fontWeight: 600,
    },
};
