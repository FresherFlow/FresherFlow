'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    BuildingOffice2Icon,
    HeartIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { cn } from '@repo/ui/utils/cn';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import type { FirebaseFollowedCompaniesMap } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import type { CompanyFollowSummary } from '@/features/companies/types';

interface FollowedCompaniesPanelProps {
    followedMap: FirebaseFollowedCompaniesMap;
    loading: boolean;
    toggleFollow: (slug: string) => Promise<void>;
    /** slug → canonical name, logo and live role count (see buildCompanyFollowMap). */
    companyDirectory: Record<string, CompanyFollowSummary>;
}

/**
 * The followed-companies list itself: search, rows and the two empty states.
 * Owned by companies (following a company is a companies concern) and rendered
 * by both the /companies Following tab and /jobs?tab=following, so the list has
 * one implementation. The caller owns the hook and the surrounding header/tabs.
 *
 * Companies with live roles come first — a following list is only useful if the
 * ones actually hiring are on top; within that, most recently followed first.
 */
export function FollowedCompaniesPanel({
    followedMap,
    loading,
    toggleFollow,
    companyDirectory,
}: FollowedCompaniesPanelProps) {
    const [search, setSearch] = useState('');

    const followedSlugs = useMemo(
        () =>
            Object.entries(followedMap)
                .sort(([aSlug, a], [bSlug, b]) => {
                    const byLiveJobs = (companyDirectory[bSlug]?.count ?? 0) - (companyDirectory[aSlug]?.count ?? 0);
                    return byLiveJobs || b.followedAt - a.followedAt;
                })
                .map(([slug]) => slug),
        [followedMap, companyDirectory]
    );

    const filteredSlugs = useMemo(() => {
        if (!search.trim()) return followedSlugs;
        const q = search.toLowerCase();
        return followedSlugs.filter((slug) => {
            const name = companyDirectory[slug]?.name || slug.replace(/-/g, ' ');
            return name.toLowerCase().includes(q) || slug.toLowerCase().includes(q);
        });
    }, [followedSlugs, search, companyDirectory]);

    const handleToggle = async (slug: string, displayName: string) => {
        try {
            const wasFollowing = !!followedMap[slug];
            await toggleFollow(slug);
            toast.success(wasFollowing ? `Unfollowed ${displayName}` : `Following ${displayName}`);
        } catch {
            toast.error('Failed to update follow status');
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (followedSlugs.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4">
                <BuildingOffice2Icon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-foreground">No followed companies yet</h2>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Follow companies from their job listing pages and they&apos;ll appear here.
                    </p>
                </div>
                <Link
                    href="/companies"
                    className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 transition-all"
                >
                    Browse Companies
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search followed companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide tabular-nums text-muted-foreground">
                    {followedSlugs.length} {followedSlugs.length === 1 ? 'company' : 'companies'}
                </span>
            </div>

            {filteredSlugs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-xs text-muted-foreground">
                    No followed companies match &ldquo;{search}&rdquo;.
                </div>
            ) : (
                <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                    {filteredSlugs.map((slug) => {
                        const summary = companyDirectory[slug];
                        const displayName = summary?.name || slug.replace(/-/g, ' ');
                        const liveJobs = summary?.count ?? 0;
                        const isFollowing = !!followedMap[slug];
                        const followedAt = followedMap[slug]?.followedAt;
                        return (
                            <div key={slug} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                                <CompanyLogo
                                    companyName={displayName}
                                    companyLogoUrl={summary?.logoUrl}
                                    companyWebsite={summary?.website}
                                    className="!w-9 !h-9 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/companies/${slug}`}
                                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                                    >
                                        {displayName}
                                    </Link>
                                    {followedAt && (
                                        <p className="text-xs text-muted-foreground">
                                            Followed{' '}
                                            {new Date(followedAt).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </p>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'shrink-0 whitespace-nowrap text-xs font-medium uppercase tracking-wide tabular-nums',
                                        liveJobs > 0 ? 'text-muted-foreground' : 'text-muted-foreground/60'
                                    )}
                                >
                                    {liveJobs > 0
                                        ? `${liveJobs} ${liveJobs === 1 ? 'role' : 'roles'}`
                                        : 'No live roles'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleToggle(slug, displayName)}
                                    className="shrink-0 p-2 rounded-xl hover:bg-muted transition-colors"
                                    title={isFollowing ? 'Unfollow' : 'Follow'}
                                    aria-label={isFollowing ? `Unfollow ${displayName}` : `Follow ${displayName}`}
                                >
                                    {isFollowing ? (
                                        <HeartSolidIcon className="w-4 h-4 text-primary" />
                                    ) : (
                                        <HeartIcon className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
