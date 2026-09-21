'use client';

import { useCallback, useEffect, useState } from 'react';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { SalaryReportItem, SalaryReportListResult } from '@fresherflow/api-client';
import { cn } from '@repo/ui/utils/cn';

function formatLpa(thousands: number | null | undefined): string {
    if (thousands == null) return '—';
    const lpa = thousands / 100;
    return `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
}

function formatInHand(monthly: number | null | undefined): string {
    if (monthly == null) return '—';
    return `₹${monthly.toLocaleString('en-IN')}/mo`;
}

function SalaryForm({ onDone, onCreated }: { onDone: () => void; onCreated: () => void }) {
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [ctcTotal, setCtcTotal] = useState('');
    const [inHand, setInHand] = useState('');
    const [bond, setBond] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!company.trim() || !role.trim()) return;
        setSubmitting(true);
        try {
            await fresherNeedsApi.createSalaryReport({
                company: company.trim(),
                role: role.trim(),
                ctcTotal: ctcTotal ? Math.round(parseFloat(ctcTotal) * 100) : undefined,
                inHandMonthly: inHand ? parseInt(inHand, 10) : undefined,
                bondMonths: bond ? parseInt(bond, 10) : undefined,
                notes: notes.trim() || undefined,
            });
            onCreated();
            onDone();
        } catch {
            // keep form open on failure
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company *" required maxLength={120}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role *" required maxLength={120}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={ctcTotal} onChange={(e) => setCtcTotal(e.target.value)} placeholder="CTC in LPA (e.g. 4.5)" inputMode="decimal"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={inHand} onChange={(e) => setInHand(e.target.value)} placeholder="In-hand ₹/month" inputMode="numeric"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={bond} onChange={(e) => setBond(e.target.value)} placeholder="Bond (months)" inputMode="numeric"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (variable, bonus…)" maxLength={1000}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" />
            </div>
            <button type="submit" disabled={submitting}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {submitting ? 'Sharing…' : 'Share salary — helps everyone'}
            </button>
        </form>
    );
}

export function SalaryReportsClient() {
    const [data, setData] = useState<SalaryReportListResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());

    const load = useCallback(() => {
        fresherNeedsApi
            .listSalaryReports({ limit: 30 })
            .then(setData)
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function toggleHelpful(id: string) {
        try {
            const res = await fresherNeedsApi.markSalaryReportHelpful(id);
            setHelpfulIds((prev) => {
                const next = new Set(prev);
                if (res.marked) next.add(id);
                else next.delete(id);
                return next;
            });
            load();
        } catch {
            // ignore
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Aggregate stats */}
            {data && data.stats.count > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-border p-3 text-center">
                        <p className="text-xs uppercase text-muted-foreground">Reports</p>
                        <p className="text-lg font-bold tabular-nums text-foreground">{data.stats.count}</p>
                    </div>
                    <div className="rounded-2xl border border-border p-3 text-center">
                        <p className="text-xs uppercase text-muted-foreground">Avg CTC</p>
                        <p className="text-lg font-bold tabular-nums text-foreground">{formatLpa(data.stats.avgTotal)}</p>
                    </div>
                    <div className="rounded-2xl border border-border p-3 text-center">
                        <p className="text-xs uppercase text-muted-foreground">Range</p>
                        <p className="text-sm font-bold tabular-nums text-foreground">
                            {formatLpa(data.stats.minTotal)} – {formatLpa(data.stats.maxTotal)}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border p-3 text-center">
                        <p className="text-xs uppercase text-muted-foreground">Avg in-hand</p>
                        <p className="text-sm font-bold tabular-nums text-foreground">{formatInHand(data.stats.avgInHand)}</p>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
                {showForm ? 'Cancel' : '+ Share your offer / salary'}
            </button>

            {showForm && <SalaryForm onDone={() => setShowForm(false)} onCreated={load} />}

            {error && <p className="text-sm text-destructive">Something went wrong. Try refreshing.</p>}

            {!error && data && data.reports.length === 0 && (
                <div className="rounded-2xl border border-border p-8 text-center">
                    <p className="text-sm font-medium text-foreground">No salary reports yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Got an offer? Share the real numbers — in-hand, bond, all of it.</p>
                </div>
            )}

            <div className="space-y-3">
                {data?.reports.map((r: SalaryReportItem) => (
                    <article key={r.id} className="rounded-2xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-foreground">
                                    {r.company} · {r.role}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {r.batch ? `${r.batch} batch` : 'Fresher'}
                                    {r.city ? ` · ${r.city}` : ''} · {r.reportType === 'OFFER' ? 'Offer' : 'Current CTC'}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-base font-bold tabular-nums text-foreground">{formatLpa(r.ctcTotal)}</p>
                                <p className="text-xs text-muted-foreground">{formatInHand(r.inHandMonthly)}</p>
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {r.bondMonths != null && r.bondMonths > 0 && (
                                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                                    {r.bondMonths}-month bond
                                </span>
                            )}
                            {r.notes ? (
                                <span className="max-w-full truncate text-xs text-muted-foreground">{r.notes}</span>
                            ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                by <span className="font-medium text-foreground/80">@{r.author.username ?? 'anon'}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => toggleHelpful(r.id)}
                                className={cn(
                                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                                    helpfulIds.has(r.id)
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                )}
                            >
                                Helpful {r.helpfulCount > 0 ? `(${r.helpfulCount})` : ''}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
