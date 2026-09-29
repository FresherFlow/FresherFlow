'use client';

import { useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';

interface JobSearchFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
}

/**
 * The search field on the job-list tabs (`?tab=saved`, `?tab=applied`).
 *
 * It was hand-rolled separately in both tabs and had drifted — different
 * heights, different corner radii, different border and background opacity, and
 * neither had a way to clear the query. This is the one version: sharp corners
 * to match the rest of the box work, and a clear control that only appears once
 * there is something to clear.
 */
export function JobSearchField({
    value,
    onChange,
    placeholder = 'Search…',
    className,
    'aria-label': ariaLabel = 'Search',
}: JobSearchFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasValue = value.length > 0;

    const clear = () => {
        onChange('');
        // Return focus so the keyboard user can keep typing instead of losing
        // the caret to the body after the button disappears.
        inputRef.current?.focus();
    };

    return (
        <div className={cn('relative', className)}>
            <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
            />
            <input
                ref={inputRef}
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && hasValue) {
                        e.preventDefault();
                        clear();
                    }
                }}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className={cn(
                    'h-10 w-full rounded-xs border border-border bg-card pl-9 text-xs text-foreground',
                    'placeholder:text-muted-foreground/60',
                    'focus:outline-none focus:ring-1 focus:ring-primary',
                    // Reserve the right gutter for the clear button so text never
                    // runs underneath it.
                    hasValue ? 'pr-9' : 'pr-3',
                    // Hide the native clear affordance; we render our own.
                    '[&::-webkit-search-cancel-button]:appearance-none'
                )}
            />
            {hasValue && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
