'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { communityApi } from '@fresherflow/api-client';
import type { ApplicationUpdate, ApplicationUpdateListResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    APPLIED: { label: 'Applied', color: 'bg-blue-500/10 text-blue-600' },
    ASSESSMENT_RECEIVED: { label: 'OA Received', color: 'bg-amber-500/10 text-amber-600' },
    ASSESSMENT_COMPLETED: { label: 'OA Completed', color: 'bg-amber-500/10 text-amber-600' },
    INTERVIEW_SCHEDULED: { label: 'Interview Scheduled', color: 'bg-purple-500/10 text-purple-600' },
    INTERVIEW_COMPLETED: { label: 'Interview Done', color: 'bg-purple-500/10 text-purple-600' },
    SELECTED: { label: 'Selected', color: 'bg-green-500/10 text-green-600' },
    REJECTED: { label: 'Rejected', color: 'bg-red-500/10 text-red-600' },
    WAITING: { label: 'Waiting', color: 'bg-muted text-muted-foreground' },
    NO_RESPONSE: { label: 'No Response', color: 'bg-muted text-muted-foreground' },
};

type Props = { opportunityIdOrSlug: string };

export function ApplicationUpdates({ opportunityIdOrSlug }: Props) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [data, setData] = useState<ApplicationUpdateListResult>({
        updates: [], total: 0, summary: {} as Record<string, number>,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loginHref = `/login?next=${encodeURIComponent(pathname || `/jobs/${opportunityIdOrSlug}`)}`;

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listApplicationUpdates(opportunityIdOrSlug);
            setData(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [opportunityIdOrSlug]);

    useEffect(() => { void load(); }, [load]);

    const totalUpdates = data.total;

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            {totalUpdates > 0 && (
                <div className="rounded-xl bg-muted/20 p-3 space-y-2">
                    <div className="text-xs font-bold text-foreground">{totalUpdates} user reports</div>
                    <div className="flex flex-wrap gap-1.5">
                        {Object.entries(data.summary)
                            .filter(([, count]) => count > 0)
                            .sort(([, a], [, b]) => b - a)
                            .map(([status, count]) => {
                                const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };
                                return (
                                    <span key={status} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', cfg.color)}>
                                        {cfg.label}: {count}
                                    </span>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Add update button */}
            {user ? (
                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    {showForm ? 'Cancel' : '+ Report Application Status'}
                </button>
            ) : (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                    <Link href={loginHref} className="font-semibold text-primary hover:underline">Sign in</Link> to report your application status.
                </div>
            )}

            {/* Update form */}
            {showForm && <UpdateForm opportunityIdOrSlug={opportunityIdOrSlug} onSubmitted={() => { setShowForm(false); void load(); }} />}

            {/* Timeline */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                    Could not load updates.{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">Retry</button>
                </div>
            ) : data.updates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                    No application updates yet. Be the first to share your status!
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-3">
                        {data.updates.map((update) => (
                            <UpdateCard key={update.id} update={update} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Update Card ─────────────────────────────────────────────────────────────

function UpdateCard({ update }: { update: ApplicationUpdate }) {
    const cfg = STATUS_CONFIG[update.status] ?? { label: update.status, color: 'bg-muted text-muted-foreground' };

    return (
        <div className="relative flex gap-3 pl-8">
            {/* Dot */}
            <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-card bg-primary/60" />

            <div className="flex-1 rounded-xl border border-border bg-card p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', cfg.color)}>
                        {cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground">
                    by @{update.author.username || update.author.fullName || 'Anonymous'}
                </div>
                {update.description && (
                    <p className="text-xs text-foreground whitespace-pre-wrap break-words">{update.description}</p>
                )}
            </div>
        </div>
    );
}

// ─── Update Form ─────────────────────────────────────────────────────────────

function UpdateForm({ opportunityIdOrSlug, onSubmitted }: { opportunityIdOrSlug: string; onSubmitted: () => void }) {
    const [status, setStatus] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!status) { setError('Please select a status.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await communityApi.createApplicationUpdate({
                opportunityId: opportunityIdOrSlug,
                status: status as Parameters<typeof communityApi.createApplicationUpdate>[0]['status'],
                description: description.trim() || undefined,
            });
            onSubmitted();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to submit.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}

            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Your Status *</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                    <option value="">Select your current status</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Notes (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    placeholder="Any additional context..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>

            <button type="button" onClick={() => void handleSubmit()} disabled={submitting || !status}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Update'}
            </button>
        </div>
    );
}
