'use client';

import type { ReactNode } from 'react';
import { PencilLine, Plus } from 'lucide-react';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';

/**
 * The one card shell every profile section uses.
 *
 * Sections previously each carried their own radius, padding and heading scale, so switching
 * between them visibly reshaped the panel. There is one shell now, and a section supplies only
 * a title, a description, an action and its body.
 */
export function ProfileSectionCard({
    title,
    description,
    action,
    children,
    className,
    bare = false,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Render fields without card chrome (stepped flows like onboarding). */
    bare?: boolean;
}) {
    if (bare) return <>{children}</>;
    return (
        <section
            className={cn(
                // Deliberately NOT overflow-hidden: the body can open a panel or a
                // suggestion list, and clipping it is how those lists ended up cut
                // off inside the card. The header rounds its own top corners instead.
                'rounded-2xl border border-border/70 bg-card shadow-sm',
                className,
            )}
        >
            {/* Header strip: title, one-line description, and the edit control. */}
            <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-border/60 bg-muted/30 px-5 py-3.5 sm:px-6">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{description}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

/**
 * The single edit affordance.
 *
 * Always labelled and always carrying an accessible name. Three of the old sections shipped an
 * icon-only pencil, so the control had no name for a screen reader and no text to scan for
 * anyone else.
 */
export function SectionEditButton({
    onClick,
    isAdd = false,
    disabled = false,
    label = 'Edit',
}: {
    onClick: () => void;
    isAdd?: boolean;
    disabled?: boolean;
    label?: string;
}) {
    const text = isAdd ? 'Add' : label;

    return (
        <Button variant="outline" size="sm" onClick={onClick} disabled={disabled} aria-label={text} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {isAdd ? <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <PencilLine className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            {text}
        </Button>
    );
}

/**
 * What a section shows instead of nothing.
 *
 * Two sections rendered literally `null` when empty, so an empty Education or Preferences tab
 * looked broken rather than empty.
 */
export function SectionEmptyState({
    label,
    hint,
    onClick,
}: {
    label: string;
    hint: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center transition-colors duration-150 ease-out hover:border-primary/40 hover:bg-primary/[0.03]"
        >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-1 text-sm font-semibold text-foreground">{label}</span>
            <span className="text-xs text-pretty text-muted-foreground">{hint}</span>
        </button>
    );
}

/**
 * Cancel / Save at the end of an inline form.
 *
 * Deliberately not sticky: the forms sit inside a page that scrolls normally, and a bar pinned
 * to the viewport edge is exactly the kind of thing that makes a page feel unpredictable.
 */
export function SectionFormActions({
    onCancel,
    onSave,
    saving = false,
    saveLabel = 'Save changes',
    status,
}: {
    onCancel: () => void;
    onSave: () => void;
    saving?: boolean;
    saveLabel?: string;
    status?: ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/50 pt-4">
            {status && <div className="mr-auto min-w-0 text-xs font-semibold text-muted-foreground">{status}</div>}
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
                Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'Saving…' : saveLabel}
            </Button>
        </div>
    );
}
