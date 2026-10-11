'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/ui/cn';
import { Input } from '@/ui/Input';
import { useDebounce } from '@/hooks/useDebounce';

export type MetaKind = 'skills' | 'cities' | 'companies' | 'courses' | 'tags';

interface SuggestInputProps {
    id?: string;
    kind: MetaKind;
    /** Selected values. */
    value: string[];
    /** Subset of value that is not in the known vocabulary (outside terms). */
    addedNew?: string[];
    onChange: (next: string[], addedNew: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    /** Single-value mode (company). Multi by default. */
    mode?: 'multi' | 'single';
}

/**
 * Generic suggest-and-add input. Known matches come from `/api/public/meta`;
 * anything outside the vocabulary can still be added — it is flagged "new"
 * (dotted chip) instead of being silently dropped or rejected. No product
 * knowledge: the parent owns meaning, this owns interaction.
 */
export function SuggestInput({
    id,
    kind,
    value,
    addedNew = [],
    onChange,
    placeholder,
    disabled,
    mode = 'multi',
}: SuggestInputProps) {
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<string[]>([]);
    const debouncedQuery = useDebounce(query, 200);
    const boxRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!open) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        fetch(`/api/public/meta?kind=${kind}&q=${encodeURIComponent(debouncedQuery)}&limit=12`, {
            signal: controller.signal,
        })
            .then((res) => (res.ok ? res.json() : { data: [] }))
            .then((json: { data?: string[] }) => {
                if (!controller.signal.aborted) setOptions(Array.isArray(json.data) ? json.data : []);
            })
            .catch(() => {
                if (!controller.signal.aborted) setOptions([]);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [debouncedQuery, kind, open]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    const knownSet = new Set(options.map((o) => o.toLowerCase()));
    const trimmed = query.trim();
    const exactKnown = trimmed !== '' && knownSet.has(trimmed.toLowerCase());
    const alreadyPicked = trimmed !== '' && value.some((v) => v.toLowerCase() === trimmed.toLowerCase());
    const showAddNew = trimmed !== '' && !exactKnown && !alreadyPicked;

    const pick = (term: string, isNew: boolean) => {
        const clean = term.trim();
        if (!clean) return;
        if (mode === 'single') {
            onChange([clean], isNew ? [clean] : []);
        } else {
            if (value.some((v) => v.toLowerCase() === clean.toLowerCase())) return;
            onChange([...value, clean], isNew ? [...addedNew, clean] : addedNew);
        }
        setQuery('');
        setOpen(false);
    };

    const removeAt = (term: string) => {
        onChange(
            value.filter((v) => v !== term),
            addedNew.filter((v) => v !== term),
        );
    };

    return (
        <div ref={boxRef} className="relative">
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2" aria-live="polite">
                    {value.map((term) => {
                        const isNew = addedNew.includes(term);
                        return (
                            <span
                                key={term}
                                title={isNew ? 'New — a moderator will map it' : undefined}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium',
                                    isNew
                                        ? 'border-dashed border-primary/60 bg-primary/5 text-primary'
                                        : 'border-border bg-muted/50 text-foreground',
                                )}
                            >
                                {isNew && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />}
                                {term}
                                <button
                                    type="button"
                                    onClick={() => removeAt(term)}
                                    aria-label={`Remove ${term}`}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
            <Input
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                autoComplete="off"
                disabled={disabled}
                value={query}
                placeholder={placeholder}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setOpen(false);
                    } else if (e.key === 'Enter' && trimmed !== '') {
                        e.preventDefault();
                        const exact = options.find((o) => o.toLowerCase() === trimmed.toLowerCase());
                        if (exact) pick(exact, false);
                        else if (showAddNew) pick(trimmed, true);
                    }
                }}
            />
            {open && (query.trim() !== '' || loading || options.length > 0) && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute z-overlay left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl"
                >
                    {loading && (
                        <li className="px-2.5 py-2 text-xs text-muted-foreground" aria-disabled="true">
                            Searching…
                        </li>
                    )}
                    {!loading &&
                        options.map((opt) => (
                            <li key={opt} role="option" aria-selected={value.includes(opt)}>
                                <button
                                    type="button"
                                    onClick={() => pick(opt, false)}
                                    className="w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors hover:bg-muted text-foreground"
                                >
                                    {opt}
                                </button>
                            </li>
                        ))}
                    {!loading && showAddNew && (
                        <li role="option" aria-selected={false}>
                            <button
                                type="button"
                                onClick={() => pick(trimmed, true)}
                                className="w-full text-left px-2.5 py-1.5 rounded-md text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                                Add “{trimmed}” as new
                            </button>
                        </li>
                    )}
                    {!loading && options.length === 0 && !showAddNew && query.trim() !== '' && (
                        <li className="px-2.5 py-2 text-xs text-muted-foreground" aria-disabled="true">
                            No matches
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
