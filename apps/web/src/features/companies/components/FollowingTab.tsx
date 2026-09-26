'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import { FollowedCompaniesPanel } from '@/features/companies/components/FollowedCompaniesPanel';
import type { CompanyFollowSummary } from '@/features/companies/types';
import { ArrowLeftIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';

type Tab = 'all' | 'following';

/**
 * The Following workspace tab on /jobs?tab=following. It lives under companies
 * because following a company is a companies concern, and renders
 * FollowedCompaniesPanel — the same list /companies?tab=following shows — so the
 * two views never drift. This file only owns the header and the local tabs.
 */
export default function FollowingTab({
    companyDirectory,
}: {
    companyDirectory: Record<string, CompanyFollowSummary>;
}) {
    const router = useRouter();
    const { user } = useAuth();
    const { followedMap, loading, toggleFollow } = useFirebaseFollowedCompanies(user?.id);
    const [activeTab, setActiveTab] = useState<Tab>('following');

    const followedCount = Object.keys(followedMap).length;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8 space-y-5">
            {/* Page header (not breadcrumb — those are on the wrapper page) */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Followed Companies</h1>
                    <p className="text-xs text-muted-foreground">
                        {followedCount} {followedCount === 1 ? 'company' : 'companies'} followed
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
                {(['following', 'all'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'flex-1 py-1.5 text-xs font-bold capitalize tracking-widest rounded-lg transition-all',
                            activeTab === tab
                                ? 'bg-card shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab === 'following' ? `Following (${followedCount})` : 'Browse'}
                    </button>
                ))}
            </div>

            {activeTab === 'following' ? (
                <FollowedCompaniesPanel
                    followedMap={followedMap}
                    loading={loading}
                    toggleFollow={toggleFollow}
                    companyDirectory={companyDirectory}
                />
            ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                    <BuildingOffice2Icon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-bold text-foreground">Browse the companies directory</p>
                    <p className="text-xs text-muted-foreground">Follow companies directly from their job listing pages.</p>
                    <Link
                        href="/companies"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 transition-all"
                    >
                        Browse Companies
                    </Link>
                </div>
            )}
        </div>
    );
}
