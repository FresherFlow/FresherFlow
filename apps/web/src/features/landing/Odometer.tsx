'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@repo/ui/utils/cn';

/**
 * Odometer-style rolling digit counter (no deps).
 * Each digit is a vertical 0-9 column that translates to its target value
 * when the element enters the viewport.
 * - Transform only; no layout shift.
 * - Server render + reduced-motion render show the final number directly.
 */

interface OdometerProps {
    value: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}

const DIGITS = Array.from({ length: 10 }, (_, i) => i);

function DigitColumn({ digit, play }: { digit: number; play: boolean }) {
    return (
        <span className="inline-flex flex-col overflow-hidden" style={{ height: '1em', lineHeight: 1 }} aria-hidden>
            <span
                className="flex flex-col will-change-transform"
                style={{
                    transform: play ? `translateY(-${digit}em)` : 'translateY(0)',
                    transition: 'transform 1200ms cubic-bezier(0.23, 1, 0.32, 1)',
                }}
            >
                {DIGITS.map((d) => (
                    <span key={d} className="flex items-center justify-center" style={{ height: '1em', lineHeight: 1 }}>
                        {d}
                    </span>
                ))}
            </span>
        </span>
    );
}

export function Odometer({ value, suffix, prefix, className }: OdometerProps) {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [play, setPlay] = useState(false);
    const [reduced, setReduced] = useState(true);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (reduced) return;
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setPlay(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.4 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [reduced]);

    const chars = String(Math.max(0, Math.round(value))).split('');

    return (
        <span
            ref={ref}
            className={cn('inline-flex items-baseline tabular-nums', className)}
            aria-label={`${prefix ?? ''}${value.toLocaleString('en-IN')}${suffix ?? ''}`}
            role="text"
        >
            {prefix && <span aria-hidden>{prefix}</span>}
            <span aria-hidden className="inline-flex items-baseline">
                {chars.map((c, i) =>
                    /\d/.test(c) ? (
                        <DigitColumn key={`${i}-${c}`} digit={Number(c)} play={play && !reduced} />
                    ) : (
                        <span key={`${i}-${c}`}>{c}</span>
                    ),
                )}
            </span>
            {suffix && <span aria-hidden>{suffix}</span>}
        </span>
    );
}
