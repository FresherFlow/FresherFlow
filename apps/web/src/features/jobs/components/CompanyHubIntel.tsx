'use client';

import { useEffect, useState } from 'react';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { CompanyHubResult } from '@fresherflow/api-client';
import Link from 'next/link';

function formatLpa(thousands: number | null | undefined): string {
    if (thousands == null) return '—';
    const lpa = thousands / 100;
    return `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
}

export function CompanyHubClient({ companyName }: { companyName: string }) {
    const [hub, setHub] = useState<CompanyHubResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fresherNeedsApi
            .companyHub(companyName)
            .then((res) => {
                if (!cancelled) setHub(res);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [companyName]);

    if (loading) {
        return <div className="h-48 animate-pulse rounded-2xl bg-muted/40" />;
    }

    if (error || !hub) {
        return null; // silently hide on ISR pages — community data is optional
    }

    const hasCommunityData =
        hub.interviewExperiences.length > 0 || hub.salaryReports.length > 0 || hub.trust.openReferralRequests > 0;

    if (!hasCommunityData) {
        return null;
    }

    return (
        <section className="space-y-4 border border-border/50 bg-card rounded-xl p-5">
            <h2 className="font-semibold text-lg text-foreground tracking-tight">Community Intel</h2>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{hub.experienceStats.total}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Interview stories</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                        {formatLpa(hub.salaryStats.avgTotal)}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Avg CTC {hub.salaryStats.count > 0 ? `(${hub.salaryStats.count})` : ''}
                    </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{hub.trust.openReferralRequests}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Open referral asks</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">
                        {hub.trust.reportCount > 0 ? 'Reported' : 'Clean'}
                    </p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {hub.trust.reportCount > 0 ? `${hub.trust.reportCount} fake-job reports` : 'No fake-job reports'}
                    </p>
                </div>
            </div>

            {/* Interview experiences */}
            {hub.interviewExperiences.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent interview experiences</p>
                    {hub.interviewExperiences.slice(0, 3).map((e) => (
                        <div key={e.id} className="rounded-lg bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground">{e.role}</span>
                                <span className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {e.batch ? `${e.batch} batch · ` : ''}
                                {e.difficulty ? `${e.difficulty.toLowerCase()} difficulty · ` : ''}
                                {e.result ?? 'outcome not shared'}
                                {e.upvotes > 0 ? ` · ${e.upvotes} upvotes` : ''}
                            </p>
                            {e.overallNotes ? (
                                <p className="mt-1 line-clamp-2 text-sm text-foreground/90">{e.overallNotes}</p>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}

            {/* Salary reports */}
            {hub.salaryReports.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salary reports</p>
                    {hub.salaryReports.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                            <span className="text-sm font-medium text-foreground">{r.role}</span>
                            <span className="text-sm font-bold tabular-nums text-primary">
                                {formatLpa(r.ctcTotal)}
                                {r.bondMonths ? ` · ${r.bondMonths}mo bond` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3 text-xs">
                <Link href="/community?tab=referrals" className="rounded-full bg-primary/10 px-3 py-1.5 font-semibold text-primary">
                    Request a referral here →
                </Link>
                <Link href="/community?tab=salary" className="rounded-full bg-muted/40 px-3 py-1.5 font-semibold text-muted-foreground">
                    Share your offer
                </Link>
            </div>
        </section>
    );
}
