'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { calculateOpportunityMatch, isNotEligible } from '@/features/opportunities/domain/matchScore';
import { ProfileCompletionBanner } from '@/features/dashboard/components/DashboardBanners';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { SkeletonJobCard } from '@/ui/Skeleton';
import JobCard from '@/features/opportunities/components/JobCard';
import CompanyLogo from '@/ui/CompanyLogo';
import { calculateProfileCompletion } from '@/features/profile/profileCompletion';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { readFeedCache, saveFeedCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { useFirebaseTracker } from '@/lib/hooks/useFirebaseTracker';
import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';
import { slugify } from '@fresherflow/utils/slugify';
import Link from 'next/link';
import {
    BriefcaseIcon,
    BookmarkIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    FireIcon,
    ClockIcon,
    BuildingOfficeIcon,
    AcademicCapIcon,
    RocketLaunchIcon,
    UserGroupIcon,
    BuildingLibraryIcon,
    CodeBracketIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Input } from '@/ui/Input';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardSection } from './components/DashboardSection';
import { RecentlyViewedRow } from './components/RecentlyViewedRow';

// ─────────────────────────────────────────────────────────────────────────────

const hasAppliedAction = (opp: Opportunity): boolean =>
    (opp.actions as { actionType: string }[] | undefined)?.some((a) =>
        ['APPLIED', 'PLANNED', 'INTERVIEWED', 'SELECTED', 'PLANNING', 'ATTENDED'].includes(a.actionType)
    ) ?? false;

interface DashboardStatsProps {
    savedCount: number;
    trackerCount: number;
}

function DashboardStats({ savedCount, trackerCount }: DashboardStatsProps) {
    return (
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link href="/saved" className="group">
                <Card className="hover:border-primary/40 transition-all duration-150 ease-out active:scale-[0.97] hover:shadow-sm cursor-pointer border-border/60 bg-card/80 backdrop-blur-sm">
                    <CardContent className="px-3.5 py-2 flex items-center gap-2.5">
                        <div className="p-1.5 w-fit rounded-lg bg-blue-500/10 text-blue-500 group-hover:scale-105 transition-transform">
                            <BookmarkIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Wishlist</p>
                            <p className="text-base font-black text-foreground leading-tight mt-0.5">{savedCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/tracker" className="group">
                <Card className="hover:border-primary/40 transition-all duration-150 ease-out active:scale-[0.97] hover:shadow-sm cursor-pointer border-border/60 bg-card/80 backdrop-blur-sm">
                    <CardContent className="px-3.5 py-2 flex items-center gap-2.5">
                        <div className="p-1.5 w-fit rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                            <BriefcaseIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">Applied</p>
                            <p className="text-base font-black text-foreground leading-tight mt-0.5">{trackerCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}

export default function DashboardClient({ initialData }: { initialData?: { opportunities: Opportunity[]; total?: number; count?: number; cachedAt?: number } | null } = {}) {
    const router = useRouter();
    const { user, profile, isLoading: authLoading } = useAuth();
    const profileCompletion = calculateProfileCompletion(profile).percentage;

    const [recentOpps, setRecentOpps] = useState<Opportunity[]>(() => {
        if (initialData?.opportunities && Array.isArray(initialData.opportunities)) {
            return initialData.opportunities.slice(0, 60).map((o: Opportunity) => ({
                ...o,
                locations: o.locations || [],
                requiredSkills: o.requiredSkills || []
            }));
        }
        return readFeedCache('type:all')?.opportunities || [];
    });
    const [isLoadingOpps, setIsLoadingOpps] = useState<boolean>(!(initialData?.opportunities && initialData.opportunities.length > 0));
    const [hasLoaded, setHasLoaded] = useState(false);
    const [recentError, setRecentError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { trackerMap } = useFirebaseTracker(user?.id);
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);

    const loadRecentOpportunities = useCallback(async (options?: { force?: boolean }) => {
        if (recentOpps.length > 0 && !options?.force) {
            saveFeedCache(recentOpps, recentOpps.length, 'type:all');
            setIsLoadingOpps(false);
            return;
        }
        setRecentError(null);
        try {
            const data = await fetchBootstrapFeed();
            if (!data || !Array.isArray(data.opportunities)) {
                throw new Error('Failed to fetch opportunities feed');
            }
            const sanitized = data.opportunities.slice(0, 60).map((o: Opportunity) => ({
                ...o,
                locations: o.locations || [],
                requiredSkills: o.requiredSkills || []
            }));
            setRecentOpps(sanitized);
            saveFeedCache(sanitized, sanitized.length, 'type:all');
        } catch (err: unknown) {
            setRecentError((err as Error)?.message || 'Unable to load recommended listings');
        } finally {
            setIsLoadingOpps(false);
        }
    }, [recentOpps]);

    useEffect(() => {
        if (!authLoading && user && !hasLoaded) {
            setHasLoaded(true);
            void loadRecentOpportunities();
        }
    }, [authLoading, user, hasLoaded, loadRecentOpportunities]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            toast.error('Please log in to save opportunities');
            router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
        }
        try {
            await toggleSavedJob(opportunityId);
            toast.success(savedJobsMap[opportunityId] ? 'Removed from bookmarks' : 'Added to bookmarks');
        } catch {
            toast.error('Bookmark update failed');
        }
    };

    const retryAll = () => {
        setIsLoadingOpps(true);
        void loadRecentOpportunities({ force: true });
    };

    const recentOppsWithActions = useMemo(() => {
        return recentOpps.map(opp => {
            const trackerItem = trackerMap[opp.id];
            const isSaved = !!savedJobsMap[opp.id];
            const oppWithActions = { ...opp, isSaved };

            if (trackerItem) {
                oppWithActions.actions = [
                    {
                        id: `rtdb-${opp.id}`,
                        userId: user?.id || '',
                        opportunityId: opp.id,
                        actionType: trackerItem.status,
                        createdAt: new Date(trackerItem.updatedAt),
                    }
                ];
            }
            return oppWithActions;
        });
    }, [recentOpps, trackerMap, savedJobsMap, user?.id]);

    const dataStreams = useMemo(() => {
        const nonExpired = recentOppsWithActions.filter(
            (o) => !o.expiresAt || new Date(o.expiresAt) > new Date()
        );

        // 1. Recommended for You (Match score priority)
        const matched = nonExpired
            .map((opp) => {
                const match = calculateOpportunityMatch(profile, opp);
                return {
                    ...opp,
                    matchScore: match.score,
                    matchReason: match.reason,
                    isEligible: match.isEligible,
                };
            })
            .filter((opp) => !isNotEligible(opp))
            .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
        const recommended = matched.slice(0, 6);

        // 2. Closing Soon (closest expiresAt first, 4 items)
        const closingSoon = nonExpired
            .filter((o) => o.expiresAt)
            .sort((a, b) => new Date(a.expiresAt as string | Date).getTime() - new Date(b.expiresAt as string | Date).getTime())
            .slice(0, 4);

        // 3. Latest Jobs
        const latest = [...nonExpired]
            .sort((a, b) => new Date(b.postedAt as string | Date).getTime() - new Date(a.postedAt as string | Date).getTime())
            .slice(0, 6);

        // 4. Trending Companies
        const companyCounts: Record<string, { count: number; logoUrl?: string }> = {};
        nonExpired.forEach((o) => {
            if (!o.company) return;
            const key = o.company.trim();
            if (!companyCounts[key]) {
                companyCounts[key] = { count: 0, logoUrl: o.companyLogoUrl || undefined };
            }
            companyCounts[key].count += 1;
            if (!companyCounts[key].logoUrl && o.companyLogoUrl) {
                companyCounts[key].logoUrl = o.companyLogoUrl;
            }
        });
        const trendingCompanies = Object.entries(companyCounts)
            .map(([name, data]) => ({ name, roleCount: data.count, logoUrl: data.logoUrl }))
            .sort((a, b) => b.roleCount - a.roleCount)
            .slice(0, 6);

        // 5. Internships
        const internships = nonExpired
            .filter((o) => o.type === OpportunityType.INTERNSHIP)
            .slice(0, 6);

        // 6. Off-Campus Drives
        const offCampus = nonExpired
            .filter((o) => {
                const oppAny = o as Record<string, unknown>;
                const titleLower = o.title?.toLowerCase() || '';
                const tagsLower = o.tags?.map((t) => t.toLowerCase()) || [];
                return (
                    Boolean(oppAny.isOffCampus) ||
                    titleLower.includes('off campus') ||
                    titleLower.includes('offcampus') ||
                    titleLower.includes('drive') ||
                    tagsLower.some((t) => t.includes('offcampus') || t.includes('drive'))
                );
            })
            .slice(0, 6);

        // 7. Walk-in Drives
        const walkins = nonExpired
            .filter((o) => {
                const titleLower = o.title?.toLowerCase() || '';
                return (
                    o.type === OpportunityType.WALKIN ||
                    titleLower.includes('walk-in') ||
                    titleLower.includes('walkin')
                );
            })
            .slice(0, 6);

        // 8. Government Highlights
        const govt = nonExpired
            .filter((o) => {
                const oppAny = o as Record<string, unknown>;
                const companyLower = o.company?.toLowerCase() || '';
                const tagsLower = o.tags?.map((t) => t.toLowerCase()) || [];
                return (
                    Boolean(oppAny.isGovernment) ||
                    o.type === OpportunityType.GOVERNMENT ||
                    companyLower.includes('railway') ||
                    companyLower.includes('upsc') ||
                    companyLower.includes('ssc') ||
                    tagsLower.some((t) => t.includes('govt') || t.includes('government'))
                );
            })
            .slice(0, 6);

        // 9. Hackathons
        const hackathons = nonExpired
            .filter((o) => {
                const titleLower = o.title?.toLowerCase() || '';
                const tagsLower = o.tags?.map((t) => t.toLowerCase()) || [];
                return (
                    o.type === OpportunityType.HACKATHONS ||
                    titleLower.includes('hackathon') ||
                    tagsLower.some((t) => t.includes('hackathon'))
                );
            })
            .slice(0, 6);

        return {
            recommended,
            closingSoon,
            latest,
            trendingCompanies,
            internships,
            offCampus,
            walkins,
            govt,
            hackathons,
            fallbackCompanies: trendingCompanies.slice(0, 6),
        };
    }, [recentOppsWithActions, profile]);

    const filteredSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.trim().toLowerCase();
        return recentOppsWithActions.filter((item) => {
            const titleMatch = item.title?.toLowerCase().includes(q);
            const companyMatch = item.company?.toLowerCase().includes(q);
            const roleMatch = item.normalizedRole?.toLowerCase().includes(q);
            const skillMatch = item.requiredSkills?.some((s) => s.toLowerCase().includes(q));
            const tagMatch = item.tags?.some((t) => t.toLowerCase().includes(q));
            return titleMatch || companyMatch || roleMatch || skillMatch || tagMatch;
        });
    }, [recentOppsWithActions, searchQuery]);

    const showSyncError = !!(recentError && recentOpps.length === 0);

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pt-4 md:pt-6 pb-16 md:pb-24 px-3 md:px-6">
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 md:pb-4 border-b border-border/40">
                        <DashboardHeader userName={user?.fullName?.split(' ')[0]} />
                        <DashboardStats
                            savedCount={Object.keys(savedJobsMap).filter((k) => savedJobsMap[k]).length}
                            trackerCount={Object.keys(trackerMap).length}
                        />
                    </div>

                    {showSyncError && (
                        <div className="w-full max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-center text-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded-xl">
                            <div className="text-xs text-foreground">Data sync issues. Browse existing listings.</div>
                            <Button variant="outline" onClick={retryAll} className="h-8 px-3 text-[10px] border-primary/30 text-primary">Retry</Button>
                        </div>
                    )}

                    {profileCompletion < 100 && <ProfileCompletionBanner />}

                    {/* Search & Quick Access Bar */}
                    <div className="relative w-full max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search role, company or skill across dashboard..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card border-border shadow-xs w-full"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-150 ease-out active:scale-[0.97]"
                                aria-label="Clear search"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {isLoadingOpps ? (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <SkeletonJobCard key={i} />
                                ))}
                            </div>
                        </div>
                    ) : searchQuery.trim() !== '' ? (
                        /* Search Results View */
                        <DashboardSection
                            title={`Search Results (${filteredSearchResults.length})`}
                            description={`Listings matching "${searchQuery}"`}
                            icon={<MagnifyingGlassIcon className="w-5 h-5 text-muted-foreground" />}
                        >
                            {filteredSearchResults.length === 0 ? (
                                <div className="p-10 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                                    No opportunities found matching &quot;{searchQuery}&quot;. Try a different keyword or clear search.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredSearchResults.map((opp) => (
                                        <JobCard
                                            key={`search-${opp.id}`}
                                            job={opp}
                                            jobId={opp.id}
                                            isApplied={hasAppliedAction(opp)}
                                            isSaved={opp.isSaved}
                                            onToggleSave={() => toggleSave(opp.id)}
                                            isAdmin={user?.role === 'ADMIN'}
                                            searchQuery={searchQuery}
                                        />
                                    ))}
                                </div>
                            )}
                        </DashboardSection>
                    ) : (
                        /* Single Scroll Feed Sections */
                        <div className="space-y-10 md:space-y-12">
                            {/* Recently Viewed / Quick Access */}
                            <RecentlyViewedRow fallbackCompanies={dataStreams.fallbackCompanies} />

                            {/* Recommended for You */}
                            {dataStreams.recommended.length > 0 && (
                                <DashboardSection
                                    title="Recommended for You"
                                    description="Top matches tailored to your profile preferences & skills"
                                    count={dataStreams.recommended.length}
                                    icon={<FireIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?sort=match"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.recommended.map((opp) => (
                                            <JobCard
                                                key={`rec-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Closing Soon */}
                            {dataStreams.closingSoon.length > 0 && (
                                <DashboardSection
                                    title="Closing Soon"
                                    description="Listings with application deadlines approaching fast"
                                    count={dataStreams.closingSoon.length}
                                    icon={<ExclamationTriangleIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?sort=expiring"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.closingSoon.map((opp) => (
                                            <JobCard
                                                key={`cls-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Latest Jobs */}
                            {dataStreams.latest.length > 0 && (
                                <DashboardSection
                                    title="Latest Jobs"
                                    description="Newest verified postings added in real-time"
                                    count={dataStreams.latest.length}
                                    icon={<ClockIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?sort=latest"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.latest.map((opp) => (
                                            <JobCard
                                                key={`lat-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Trending Companies */}
                            {dataStreams.trendingCompanies.length > 0 && (
                                <DashboardSection
                                    title="Trending Companies"
                                    description="Top hiring employers actively recruiting freshers"
                                    count={dataStreams.trendingCompanies.length}
                                    icon={<BuildingOfficeIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/companies"
                                >
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                                        {dataStreams.trendingCompanies.map((c) => (
                                            <Link
                                                key={c.name}
                                                href={`/companies/${slugify(c.name)}`}
                                                className="group flex items-center gap-3 p-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-muted/30 transition-all duration-150 ease-out active:scale-[0.98] overflow-hidden"
                                            >
                                                <CompanyLogo companyName={c.name} companyLogoUrl={c.logoUrl} className="w-9 h-9 text-xs rounded-lg shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {c.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {c.roleCount} active {c.roleCount === 1 ? 'role' : 'roles'}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Internships */}
                            {dataStreams.internships.length > 0 && (
                                <DashboardSection
                                    title="Internships"
                                    description="Stipend-backed internship roles for students & freshers"
                                    count={dataStreams.internships.length}
                                    icon={<AcademicCapIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?type=internship"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.internships.map((opp) => (
                                            <JobCard
                                                key={`int-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Off-Campus Drives */}
                            {dataStreams.offCampus.length > 0 && (
                                <DashboardSection
                                    title="Off-Campus Drives"
                                    description="Direct off-campus recruitment drives & mass hiring events"
                                    count={dataStreams.offCampus.length}
                                    icon={<RocketLaunchIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?source=offcampus"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.offCampus.map((opp) => (
                                            <JobCard
                                                key={`off-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Walk-in Drives */}
                            {dataStreams.walkins.length > 0 && (
                                <DashboardSection
                                    title="Walk-in Drives"
                                    description="Direct interview walk-in events and venue drives"
                                    count={dataStreams.walkins.length}
                                    icon={<UserGroupIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?type=walkin"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.walkins.map((opp) => (
                                            <JobCard
                                                key={`walk-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Government Highlights */}
                            {dataStreams.govt.length > 0 && (
                                <DashboardSection
                                    title="Government Highlights"
                                    description="Public sector, PSU, and government recruitment updates"
                                    count={dataStreams.govt.length}
                                    icon={<BuildingLibraryIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/govt"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.govt.map((opp) => (
                                            <JobCard
                                                key={`gov-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}

                            {/* Hackathons */}
                            {dataStreams.hackathons.length > 0 && (
                                <DashboardSection
                                    title="Hackathons"
                                    description="Competitive coding hackathons, challenges & hiring sprints"
                                    count={dataStreams.hackathons.length}
                                    icon={<CodeBracketIcon className="w-5 h-5 text-muted-foreground" />}
                                    viewAllHref="/jobs?type=hackathons"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {dataStreams.hackathons.map((opp) => (
                                            <JobCard
                                                key={`hack-${opp.id}`}
                                                job={opp}
                                                jobId={opp.id}
                                                isApplied={hasAppliedAction(opp)}
                                                isSaved={opp.isSaved}
                                                onToggleSave={() => toggleSave(opp.id)}
                                                isAdmin={user?.role === 'ADMIN'}
                                            />
                                        ))}
                                    </div>
                                </DashboardSection>
                            )}
                        </div>
                    )}
                </div>
            </ProfileGate>
        </AuthGate>
    );
}
