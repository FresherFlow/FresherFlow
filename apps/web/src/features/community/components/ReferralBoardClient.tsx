'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { ReferralRequestItem } from '@fresherflow/api-client';
import { ReferralRequestStatus } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const STATUS_STYLES: Record<string, string> = {
    OPEN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    FULFILLED: 'bg-primary/10 text-primary',
    CLOSED: 'bg-muted/40 text-muted-foreground',
};

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function ReferralBoardClient() {
    const { user } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<ReferralRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyHandle, setReplyHandle] = useState('');

    const load = useCallback(() => {
        fresherNeedsApi
            .listReferralRequests({ limit: 30 })
            .then((res) => setRequests(res.requests))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function submitRequest(e: React.FormEvent) {
        e.preventDefault();
        if (!company.trim()) return;
        if (!user) {
            router.push('/login');
            return;
        }
        setSubmitting(true);
        try {
            await fresherNeedsApi.createReferralRequest({ company: company.trim(), role: role.trim() || undefined, note: note.trim() || undefined });
            setCompany('');
            setRole('');
            setNote('');
            setShowForm(false);
            load();
        } catch (e) {
            const err = e as { status?: number };
            if (err.status === 401) {
                router.push('/login');
            } else {
                setError(true);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function respond(requestId: string) {
        if (!user) {
            router.push('/login');
            return;
        }
        if (!replyText.trim() && !replyHandle.trim()) return;
        try {
            await fresherNeedsApi.respondToReferralRequest(requestId, {
                message: replyText.trim() || undefined,
                contactHandle: replyHandle.trim() || undefined,
            });
            setExpandedId(null);
            setReplyText('');
            setReplyHandle('');
            load();
        } catch (e) {
            const err = e as { status?: number };
            if (err.status === 401) {
                router.push('/login');
            } else {
                setError(true);
            }
        }
    }

    async function updateStatus(requestId: string, status: ReferralRequestStatus) {
        if (!user) {
            router.push('/login');
            return;
        }
        try {
            await fresherNeedsApi.updateReferralRequestStatus(requestId, status);
            load();
        } catch (e) {
            const err = e as { status?: number };
            if (err.status === 401) {
                router.push('/login');
            } else {
                setError(true);
            }
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Create request */}
            <div>
                <button
                    type="button"
                    onClick={() => setShowForm((v) => !v)}
                    className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                    {showForm ? 'Cancel' : '+ Request a referral'}
                </button>

                {showForm && (
                    <form onSubmit={submitRequest} className="mt-3 space-y-3 rounded-2xl border border-border p-4">
                        <input
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Company (e.g. Zoho) *"
                            required
                            maxLength={120}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                        <input
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="Role (optional)"
                            maxLength={120}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Anything else? (batch, location, why...)"
                            maxLength={1000}
                            rows={2}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !company.trim()}
                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {submitting ? 'Posting…' : 'Post request'}
                        </button>
                    </form>
                )}
            </div>

            {error && <p className="text-sm text-destructive">Something went wrong. Try refreshing.</p>}

            {!error && requests.length === 0 && (
                <div className="rounded-2xl border border-border p-8 text-center">
                    <p className="text-sm font-medium text-foreground">No referral requests yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Be the first to ask — the community helps fast.</p>
                </div>
            )}

            {/* Request cards */}
            <div className="space-y-3">
                {requests.map((req) => (
                    <article key={req.id} className="rounded-2xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold text-foreground">{req.company}</h3>
                                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold uppercase', STATUS_STYLES[req.status] ?? '')}>
                                        {req.status}
                                    </span>
                                    {req.batch ? <span className="text-xs text-muted-foreground">{req.batch} batch</span> : null}
                                    {req.city ? <span className="text-xs text-muted-foreground">· {req.city}</span> : null}
                                </div>
                                {req.role ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{req.role}</p> : null}
                                {req.note ? <p className="mt-2 text-sm text-foreground/90">{req.note}</p> : null}
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(req.createdAt)}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {req.responseCount === 0
                                    ? 'No responses yet'
                                    : `${req.responseCount} response${req.responseCount === 1 ? '' : 's'}`}
                                {' · '}
                                <span className="font-medium text-foreground/80">@{req.author.username ?? 'anon'}</span>
                            </span>
                            <div className="flex items-center gap-2">
                        {user?.id === req.author.id && req.status === 'OPEN' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => void updateStatus(req.id, ReferralRequestStatus.FULFILLED)}
                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                                >
                                     Fulfilled
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void updateStatus(req.id, ReferralRequestStatus.CLOSED)}
                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                                >
                                     Close
                                </button>
                            </>
                        )}
                        {user && req.status === 'OPEN' ? (
                            <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                                {expandedId === req.id ? 'Hide' : 'Respond'}
                            </button>
                        ) : user ? (
                            <button
                                type="button"
                                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hover:bg-muted/50"
                            >
                                {expandedId === req.id ? 'Hide' : 'Respond'}
                            </button>
                        ) : (
                            <span className="text-xs text-muted-foreground">Sign in to respond</span>
                        )}
                            </div>
                        </div>

                        {/* Responses */}
                        {expandedId === req.id && (
                            <div className="mt-3 space-y-3 border-t border-border pt-3">
                                {req.responses?.map((resp) => (
                                    <div key={resp.id} className="rounded-xl bg-muted/30 p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-foreground">@{resp.responder.username ?? 'anon'}</span>
                                            <span className="text-xs text-muted-foreground">{timeAgo(resp.createdAt)}</span>
                                        </div>
                                        {resp.message ? <p className="mt-1 text-sm text-foreground/90">{resp.message}</p> : null}
                                        {resp.contactHandle ? (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Contact: <span className="font-mono text-foreground">{resp.contactHandle}</span>
                                            </p>
                                        ) : null}
                                    </div>
                                ))}

                                <div className="space-y-2">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="I can refer — here's what you need…"
                                        rows={2}
                                        maxLength={1000}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                                    />
                                    <input
                                        value={replyHandle}
                                        onChange={(e) => setReplyHandle(e.target.value)}
                                        placeholder="Contact handle (email / Telegram / LinkedIn)"
                                        maxLength={200}
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => respond(req.id)}
                                        disabled={submitting || (!replyText.trim() && !replyHandle.trim())}
                                        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                                    >
                                        Send response
                                    </button>
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </div>
    );
}
