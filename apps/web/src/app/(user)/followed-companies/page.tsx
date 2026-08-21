'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseFollowedCompanies } from '@/features/companies/hooks/useFirebaseFollowedCompanies';
import { UsernameGate } from '@/lib/components/ProfileGate';
import { ArrowLeftIcon, BuildingOffice2Icon, MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { cn } from '@repo/ui/utils/cn';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Tab = 'all' | 'following';

function CompaniesPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { followedMap, loading, toggleFollow } = useFirebaseFollowedCompanies(user?.id);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('following');

    const followedSlugs = useMemo(() => Object.keys(followedMap), [followedMap]);

    const filteredSlugs = useMemo(() => {
        const source = followedSlugs;
        if (!search.trim()) return source;
        const q = search.toLowerCase();
        return source.filter(slug => slug.toLowerCase().includes(q));
    }, [followedSlugs, search]);

    const handleToggle = async (slug: string) => {
        try {
            await toggleFollow(slug);
            const now = !!followedMap[slug];
            toast.success(now ? `Unfollowed ${slug}` : `Following ${slug}`);
        } catch {
            toast.error('Failed to update follow status');
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer" aria-label="Go back">
                    <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Followed Companies</h1>
                    <p className="text-xs text-muted-foreground">{followedSlugs.length} companies followed</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
                {(['following', 'all'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'flex-1 py-1.5 text-xs font-bold capitalize tracking-widest rounded-lg transition-all',
                            activeTab === tab
                                ? 'bg-card shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab === 'following' ? `Following (${followedSlugs.length})` : 'Browse'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search companies..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Content */}
            {activeTab === 'following' && (
                filteredSlugs.length === 0 ? (
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
                            className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-[11px] rounded-lg hover:bg-primary/90 transition-all"
                        >
                            Browse Companies
                        </Link>
                    </div>
                ) : (
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                        {filteredSlugs.map(slug => {
                            const isFollowing = !!followedMap[slug];
                            const followedAt = followedMap[slug]?.followedAt;
                            return (
                                <div key={slug} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary text-sm font-extrabold flex items-center justify-center shrink-0 uppercase">
                                        {slug[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/companies/${slug}`}
                                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors capitalize truncate block"
                                        >
                                            {slug.replace(/-/g, ' ')}
                                        </Link>
                                        {followedAt && (
                                            <p className="text-[10px] text-muted-foreground">
                                                Since {new Date(followedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleToggle(slug)}
                                        className="shrink-0 p-2 rounded-xl hover:bg-muted transition-colors"
                                        title={isFollowing ? 'Unfollow' : 'Follow'}
                                    >
                                        {isFollowing
                                            ? <HeartSolidIcon className="w-4 h-4 text-primary" />
                                            : <HeartIcon className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {activeTab === 'all' && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-3">
                    <BuildingOffice2Icon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-bold text-foreground">Browse the companies directory</p>
                    <p className="text-xs text-muted-foreground">Follow companies directly from their job listing pages.</p>
                    <Link
                        href="/companies"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold text-[11px] rounded-lg hover:bg-primary/90 transition-all"
                    >
                        Browse Companies
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function AccountCompaniesPage() {
    return (
        <UsernameGate>
            <CompaniesPageContent />
        </UsernameGate>
    );
}
