'use client';

import Link from 'next/link';
import s from './Breadcrumb.module.css';

export default function Breadcrumb({ items = [], current }) {
    return (
        <nav className={s.nav} aria-label="breadcrumb">
            <Link href="/hub" className={s.link}>
                미션 센터
            </Link>
            {items.map((item, i) => (
                <span key={i} className={s.separator}>
                    <span className={s.arrow}>/</span>
                    {item.href ? (
                        <Link href={item.href} className={s.link}>
                            {item.label}
                        </Link>
                    ) : (
                        <span className={s.link}>{item.label}</span>
                    )}
                </span>
            ))}
            {current && (
                <span className={s.separator}>
                    <span className={s.arrow}>/</span>
                    <span className={s.current}>{current}</span>
                </span>
            )}
        </nav>
    );
}
