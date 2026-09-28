'use client';

import { useState } from 'react';
import { cn } from '@repo/ui/utils/cn';

export function HelpfulButton({
    helpfulCount,
    isHelpful,
    onToggle,
    onError,
}: {
    helpfulCount: number;
    isHelpful: boolean;
    onToggle: () => Promise<{ helpfulCount: number; isHelpful: boolean }>;
    onError?: () => void;
}) {
    const [optimistic, setOptimistic] = useState<{ count: number; marked: boolean } | null>(null);
    const [voting, setVoting] = useState(false);
    const display = optimistic ?? { count: helpfulCount, marked: isHelpful };

    const handleToggle = async () => {
        if (voting) return;
        setVoting(true);
        const prev = display;
        setOptimistic({
            count: prev.marked ? Math.max(0, prev.count - 1) : prev.count + 1,
            marked: !prev.marked,
        });
        try {
            const result = await onToggle();
            setOptimistic({ count: result.helpfulCount, marked: result.isHelpful });
        } catch {
            setOptimistic(null);
            onError?.();
        } finally {
            setVoting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void handleToggle()}
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                display.marked
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
        >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill={display.marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Helpful
            <span className="tabular-nums font-bold">{display.count}</span>
        </button>
    );
}
