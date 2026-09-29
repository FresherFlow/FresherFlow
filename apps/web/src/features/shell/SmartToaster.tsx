'use client';

import { useEffect, useRef } from 'react';
import toast, { Toaster, Toast, resolveValue, useToasterStore } from 'react-hot-toast';
import { Check, LoaderCircle, X } from 'lucide-react';

const TOAST_LIMIT = 2; // Maximum number of toasts visible at once
const BAR_FRAME_MS = 60; // Repaint cadence of the dismiss bar

type Tone = 'success' | 'error' | 'neutral';

// Every colour is a theme token, so the badge and the bar re-tint themselves
// when `.dark` swaps the palette in globals.css.
const TONE: Record<Tone, { badge: string; bar: string }> = {
    success: { badge: 'bg-success text-card', bar: 'bg-success' },
    error: { badge: 'bg-destructive text-card', bar: 'bg-destructive' },
    neutral: { badge: 'bg-muted text-muted-foreground', bar: 'bg-muted-foreground' },
};

const CARD_BASE = 'pointer-events-auto relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-md border border-border bg-card px-4 py-3 text-foreground shadow-md';
const CARD_ENTER = 'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 motion-reduce:animate-none';
const CARD_EXIT = 'animate-out fade-out-0 zoom-out-95 slide-out-to-top-2 duration-150 motion-reduce:animate-none';
const CLOSE_BUTTON = 'shrink-0 rounded-sm p-1 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:transition-none';

function toneFor(type: Toast['type']): Tone {
    if (type === 'success') return 'success';
    if (type === 'error') return 'error';
    return 'neutral';
}

function StatusIcon({ type }: { type: Toast['type'] }) {
    if (type === 'success') return <Check className="h-3 w-3" strokeWidth={3} />;
    if (type === 'error') return <X className="h-3 w-3" strokeWidth={3} />;
    if (type === 'loading') {
        return <LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" />;
    }
    return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}

/**
 * Remaining dismiss time as a 0..1 fraction, using the same arithmetic
 * react-hot-toast uses to schedule the dismissal: the toast counts down from
 * `createdAt`, `duration` comes from the toast's own `duration` option, and
 * `pausedAt` freezes the clock while the pointer hovers the toaster.
 */
function remainingRatio(item: Toast, pausedAt: number | undefined): number {
    const total = (item.duration ?? 0) + item.pauseDuration;
    if (!Number.isFinite(total) || total <= 0) return 0;
    // While paused the store has not yet folded the hover into pauseDuration,
    // so read the clock from pausedAt and the bar freezes in place.
    const elapsed = (pausedAt ?? Date.now()) - item.createdAt;
    return Math.min(Math.max(total - elapsed, 0), total) / total;
}

/** Bottom-edge bar that drains in step with the dismiss timer. */
function DismissBar({
    item,
    pausedAt,
    className,
}: {
    item: Toast;
    pausedAt: number | undefined;
    className: string;
}) {
    const barRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;

        let frame = 0;
        let lastPaint = 0;
        const paint = (stamp: number) => {
            frame = requestAnimationFrame(paint);
            if (stamp - lastPaint < BAR_FRAME_MS) return;
            lastPaint = stamp;
            bar.style.transform = `scaleX(${remainingRatio(item, pausedAt)})`;
        };

        frame = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(frame);
    }, [item, pausedAt]);

    return (
        <span className="absolute inset-x-0 bottom-0 block h-0.5 bg-border/40" aria-hidden="true">
            <span
                ref={barRef}
                className={`block h-full w-full origin-left ${className}`}
                style={{ transform: `scaleX(${remainingRatio(item, pausedAt)})` }}
            />
        </span>
    );
}

function ToastCard({ item, pausedAt }: { item: Toast; pausedAt: number | undefined }) {
    const tone = toneFor(item.type);
    const hasTimer = Number.isFinite((item.duration ?? 0) + item.pauseDuration);

    return (
        <div
            {...item.ariaProps}
            className={`${CARD_BASE} ${item.visible ? CARD_ENTER : CARD_EXIT}`}
        >
            <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${TONE[tone].badge}`}
                aria-hidden="true"
            >
                <StatusIcon type={item.type} />
            </span>

            <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug">
                {resolveValue(item.message, item)}
            </p>

            <button
                type="button"
                onClick={() => toast.dismiss(item.id)}
                aria-label="Dismiss notification"
                className={CLOSE_BUTTON}
            >
                <X className="h-3.5 w-3.5" />
            </button>

            {hasTimer && <DismissBar item={item} pausedAt={pausedAt} className={TONE[tone].bar} />}
        </div>
    );
}

export function SmartToaster() {
    const { toasts, pausedAt } = useToasterStore();

    useEffect(() => {
        toasts
            .filter((t) => t.visible) // Only count visible toasts
            .filter((_, i) => i >= TOAST_LIMIT) // Find toasts beyond the limit
            .forEach((t) => toast.dismiss(t.id)); // Dismiss them
    }, [toasts]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                toast.dismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{ top: 24, right: 24, left: 24, bottom: 24 }}
            toastOptions={{
                duration: 4000,
            }}
        >
            {(t) => <ToastCard item={t} pausedAt={pausedAt} />}
        </Toaster>
    );
}
