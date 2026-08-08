import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Opportunity, EducationLevel } from '@fresherflow/types';
// WEB PIVOT: keep API imports disabled while public web runs from CDN/static JSON.
// import { opportunitiesApi, savedApi } from '@/lib/api/client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { readFeedCache, saveFeedCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { calculateOpportunityMatch, isNotEligible } from '@/features/opportunities/domain/matchScore';

import { useFirebaseSaved } from '@/lib/hooks/useFirebaseSaved';


const WEB_STATIC_DISCOVERY = true;

interface UseOpportunitiesFeedOptions {
    type?: string | null;
    mode?: string[] | string | null;
    source?: string | null;
    sort?: string | null;
    selectedLoc?: string | null;
    selectedYear?: number | null;
    showOnlySaved: boolean;
    closingSoon: boolean;
    search: string;
    sector?: string | null;
    qualification?: string | null;
    course?: string | null;
    minSalary?: number | null;
    maxSalary?: number | null;
    initialData?: {
        opportunities: Opportunity[];
        total: number;
        cachedAt?: number;
    } | null;
}

type OpportunityAction = {
    actionType: string;
};

export function useOpportunitiesFeed({
    type,
    mode,
    source,
    sort,
    selectedLoc,
    selectedYear,
    showOnlySaved,
    closingSoon,
    search,
    sector,
    qualification,
    course,
    initialData,
}: UseOpportunitiesFeedOptions) {
    const router = useRouter();
    const { user, profile, isLoading: authLoading } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useFirebaseSaved(user?.id);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
        if (initialData?.opportunities) return initialData.opportunities;
        return [];
    });
    const [totalCount, setTotalCount] = useState<number>(() => {
        if (initialData?.total !== undefined) return initialData.total;
        return 0;
    });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(() => {
        if (initialData?.opportunities) return false;
        return true;
    });
    const [error, setError] = useState<string | null>(null);
    const [usingCachedFeed, setUsingCachedFeed] = useState<boolean>(() => !!initialData);
    const [cachedAt, setCachedAt] = useState<number | null>(() => {
        if (initialData?.cachedAt) return initialData.cachedAt;
        return null;
    });
    const [profileIncomplete, setProfileIncomplete] = useState<{ percentage: number; message: string } | null>(null);
    const lastRequestTimestamp = useRef(0);
    const opportunitiesCountRef = useRef(opportunities.length);
    const debouncedSearch = useDebounce(search, 500);
    const normalizedSearch = debouncedSearch.trim();
    const shouldUseBackendSearch = normalizedSearch.length >= 2;
    const cacheScope = useMemo(() => {
        return `type:${(type || 'all').toLowerCase()}`;
    }, [type]);

    useEffect(() => {
        opportunitiesCountRef.current = opportunities.length;
    }, [opportunities.length]);

    const loadOpportunities = useCallback(async (pageNum = 1, append = false) => {
        if (WEB_STATIC_DISCOVERY) {
            if (showOnlySaved && !user) {
                setError('Please log in to view saved opportunities');
                setOpportunities([]);
                setTotalCount(0);
                setIsLoading(false);
                return;
            }

            const staticOpps = initialData?.opportunities || readFeedCache(cacheScope)?.opportunities || [];
            setOpportunities(staticOpps);
            setTotalCount(initialData?.total ?? staticOpps.length);
            setPage(1);
            setHasMore(false);
            setError(null);
            setProfileIncomplete(null);
            setIsLoading(false);
            return;
        }

        if (authLoading) return;
        const timestamp = Date.now();
        lastRequestTimestamp.current = timestamp;

        const shouldShowBlockingLoader = !append && pageNum === 1 && opportunitiesCountRef.current === 0;
        if (shouldShowBlockingLoader) {
            setIsLoading(true);
        }
        setProfileIncomplete(null);
        setError(null);
        setUsingCachedFeed(false);

        try {
            interface FeedResponse {
                opportunities: Opportunity[];
                total?: number;
                count?: number;
                limit?: number;
            }
            let data: FeedResponse;
            if (showOnlySaved) {
                if (!user) {
                    setError('Please log in to view saved opportunities');
                    setOpportunities([]);
                    setTotalCount(0);
                    setIsLoading(false);
                    return;
                }
                throw new Error('Saved jobs are disabled on web');
                // data = (await savedApi.list()) as FeedResponse;
                if (type) {
                    data.opportunities = data.opportunities?.filter((opp: Opportunity) => opp.type === type) || [];
                }
            } else if (shouldUseBackendSearch) {
                throw new Error('Backend search is disabled on web');
                // const searchData = (await opportunitiesApi.search({
                //     q: normalizedSearch,
                //     type: type || undefined,
                //     city: selectedLoc || undefined,
                //     page: pageNum,
                //     limit: 50,
                // })) as FeedResponse & { hits?: Opportunity[]; totalHits?: number; hasMore?: boolean };
                const searchData = { hits: [], totalHits: 0, total: 0, limit: 0, hasMore: false };
                data = {
                    opportunities: searchData.hits || [],
                    total: searchData.totalHits ?? searchData.total ?? (searchData.hits?.length || 0),
                    limit: searchData.limit,
                };
                if (lastRequestTimestamp.current === timestamp) {
                    setHasMore(Boolean(searchData.hasMore));
                }
            } else {
                throw new Error('Opportunity API list is disabled on web');
                // data = (await opportunitiesApi.list({
                //     type: type || undefined,
                //     city: selectedLoc || undefined,
                //     minSalary: minSalary || undefined,
                //     maxSalary: maxSalary || undefined,
                //     closingSoon: closingSoon || undefined,
                //     page: pageNum,
                //     limit: user ? 50 : 200
                // })) as FeedResponse;
                data = { opportunities: [], total: 0, limit: 0 };
            }

            // Freshness check: only update if this is the most recent request
            if (lastRequestTimestamp.current !== timestamp) return;

            const newOpps = data.opportunities || [];
            setOpportunities(prev => append ? [...prev, ...newOpps] : newOpps);
            if (typeof data.total === 'number' || typeof data.count === 'number') {
                setTotalCount(data.total || data.count || 0);
            } else if (append) {
                setTotalCount(prev => prev + newOpps.length);
            } else {
                setTotalCount(newOpps.length);
            }
            if (!shouldUseBackendSearch) {
                setHasMore(newOpps.length >= (data.limit || 50));
            }
            setPage(pageNum);

            if (!showOnlySaved && !shouldUseBackendSearch && pageNum === 1) {
                saveFeedCache(newOpps, data.total || data.count || newOpps.length, cacheScope);
                setCachedAt(Date.now());
            }
        } catch (err: unknown) {
            if (lastRequestTimestamp.current !== timestamp) return;
            const errorObj = err as { code?: string; completionPercentage?: number; message?: string };
            if (errorObj.code === 'PROFILE_INCOMPLETE') {
                setProfileIncomplete({
                    percentage: errorObj.completionPercentage || 0,
                    message: errorObj.message || 'Complete your profile to access job listings'
                });
            } else {
                const cached = readFeedCache(cacheScope);
                if (cached && !showOnlySaved && !shouldUseBackendSearch && pageNum === 1) {
                    // Silently fall back to cache — no toast, user doesn't need to know
                    setOpportunities(cached.opportunities);
                    setTotalCount(cached.count || cached.opportunities.length);
                    setUsingCachedFeed(true);
                    setCachedAt(cached.cachedAt);
                    setHasMore(false);
                } else if (!showOnlySaved) {
                    // No cache available — only then show error
                    const { getErrorMessage } = await import('@/lib/utils/error');
                    const msg = getErrorMessage(err);
                    setError(msg);
                }
            }
        } finally {
            if (lastRequestTimestamp.current === timestamp) {
                setIsLoading(false);
            }
        }
    }, [type, user, authLoading, showOnlySaved, cacheScope, shouldUseBackendSearch, initialData]);

    const hasOpportunities = !!initialData?.opportunities?.length;
    const hasInitialData = !!initialData;
    useEffect(() => {
        if (!authLoading) {
            // If we have initial data, we already rendered. 
            // We only need to trigger a background sync if we're not searching
            // or if the initial data is old.
            if (hasOpportunities && !shouldUseBackendSearch) {
                // Background sync (SWR)
                loadOpportunities(1, false);
            } else {
                loadOpportunities();
            }
        }
    }, [loadOpportunities, authLoading, user, showOnlySaved, hasOpportunities, shouldUseBackendSearch, hasInitialData]);

    const filteredOpps = useMemo(() => {
        const modeFiltered = opportunities;

        const filtered = modeFiltered.filter(opp => {
            if (showOnlySaved && !savedJobsMap[opp.id]) {
                return false;
            }

            // Segregate government jobs from normal feeds
            const isGovOpp = opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails);
            const isGovFeed = type === 'GOVERNMENT';
            if (isGovOpp !== isGovFeed) {
                return false;
            }

            // Filter by selected type (JOB, INTERNSHIP, WALKIN)
            if (type && type !== 'GOVERNMENT' && type !== 'REMOTE') {
                if (opp.type !== type) {
                    return false;
                }
            }

            if (mode) {
                const modeArray = Array.isArray(mode) ? mode : [mode];
                const isRemoteOrHybrid = modeArray.some(m => {
                    const selectedMode = m.toLowerCase();
                    const isModeRemote = selectedMode === 'remote';
                    const isModeHybrid = selectedMode === 'hybrid';
                    const isModeOnsite = selectedMode === 'on_site' || selectedMode === 'onsite';
                    
                    const oppWorkMode = String((opp as any).workMode || '').toLowerCase();
                    
                    if (isModeRemote) {
                        return (opp.locations || []).some(loc => {
                            const l = loc.toLowerCase();
                            return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
                        }) || oppWorkMode === 'remote' || (opp.title || '').toLowerCase().includes('remote');
                    }
                    if (isModeHybrid) {
                        return (opp.locations || []).some(loc => loc.toLowerCase().includes('hybrid')) 
                        || oppWorkMode === 'hybrid' || (opp.title || '').toLowerCase().includes('hybrid');
                    }
                    if (isModeOnsite) {
                        return oppWorkMode === 'on_site' || oppWorkMode === 'onsite' || 
                        (!oppWorkMode && !((opp.locations || []).some(loc => {
                            const l = loc.toLowerCase();
                            return l.includes('remote') || l.includes('wfh') || l.includes('work from home') || l.includes('hybrid');
                        })) && !(opp.title || '').toLowerCase().includes('remote') && !(opp.title || '').toLowerCase().includes('hybrid'));
                    }
                    return false;
                });
                
                if (!isRemoteOrHybrid) return false;
            } else if (type === 'REMOTE') {
                const isRemote = (opp.locations || []).some(loc => {
                    const l = loc.toLowerCase();
                    return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
                }) || (opp as any).workMode === 'REMOTE' || opp.title.toLowerCase().includes('remote');
                if (!isRemote) return false;
            }

            if (source === 'offcampus') {
                const isOffCampus = (opp as any).source === 'OFFCAMPUS' || (opp as any).category === 'OFFCAMPUS' ||
                    (opp.tags || []).some((t: string) => t.toLowerCase().replace('-', '') === 'offcampus') ||
                    (opp.title || '').toLowerCase().includes('off campus') ||
                    (opp.title || '').toLowerCase().includes('off-campus');
                if (!isOffCampus) return false;
            }

            const matchesSearch = !normalizedSearch || [
                opp.title,
                opp.normalizedRole,
                opp.company,
                opp.description,
                ...(opp.allowedCourses || []),
                ...(opp.allowedDegrees || []),
                (opp.governmentJobDetails as any)?.minimumQualification
            ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch.toLowerCase()));

            const matchesLoc = !selectedLoc || (opp.locations || []).some((loc) => {
                const l = loc.toLowerCase().trim();
                const s = selectedLoc.toLowerCase().trim();
                if ((s === 'bangalore' || s === 'bengaluru') && (l === 'bangalore' || l === 'bengaluru')) {
                    return true;
                }
                if ((s === 'gurgaon' || s === 'gurugram') && (l === 'gurgaon' || l === 'gurugram')) {
                    return true;
                }
                return l.includes(s) || s.includes(l);
            });

            const matchesClosingSoon = !closingSoon || (() => {
                if (!opp.expiresAt) return false;
                const expiryDate = new Date(opp.expiresAt);
                const now = new Date();
                const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                return expiryDate >= now && expiryDate <= threeDaysFromNow;
            })();

            const matchesSector = !sector || (opp.governmentJobDetails?.jobCategory || []).some(cat => 
                cat.toLowerCase().includes(sector.toLowerCase())
            );

            const qualMap: Record<string, EducationLevel> = {
                '10th pass': EducationLevel.TENTH,
                '12th pass': EducationLevel.INTER,
                'diploma': EducationLevel.DIPLOMA,
                'graduate': EducationLevel.DEGREE,
                'postgraduate': EducationLevel.PG
            };
            const mappedQual = qualification ? qualMap[qualification.toLowerCase()] : null;

            const matchesQualification = !qualification || 
                (mappedQual && (opp.allowedDegrees || []).includes(mappedQual)) ||
                ((opp.governmentJobDetails as any)?.minimumQualification && String((opp.governmentJobDetails as any).minimumQualification).toLowerCase().includes(qualification.toLowerCase()));

            const courseParts = course ? course.split('/').map(p => p.trim().toLowerCase()) : [];
            const matchesCourse = !course || 
                (opp.allowedCourses || []).some(c => {
                    const cl = c.toLowerCase();
                    return courseParts.some(cp => cl.includes(cp));
                }) ||
                (course === 'Diploma' && (opp.allowedDegrees || []).includes(EducationLevel.DIPLOMA));

            const matchesYear = !selectedYear || 
                !opp.allowedPassoutYears || 
                opp.allowedPassoutYears.length === 0 || 
                opp.allowedPassoutYears.map(Number).includes(Number(selectedYear));

            return matchesSearch && matchesLoc && matchesClosingSoon && matchesSector && matchesQualification && matchesCourse && matchesYear;
        });

        const enriched = filtered.map((opp) => {
            const match = calculateOpportunityMatch(profile, opp);
            return {
                ...opp,
                isSaved: !!savedJobsMap[opp.id],
                isEligible: match.isEligible,
                matchScore: match.score,
                matchReason: match.reason,
            };
        });

        if (!isMounted) {
            return enriched;
        }

        const bucketWeight = (opp: Opportunity & { isSaved?: boolean; actions?: OpportunityAction[] }) => {
            const isApplied = Array.isArray(opp.actions) && opp.actions.some((a: OpportunityAction) => a.actionType === 'APPLIED');
            if (isApplied) return 2;
            if (opp.isSaved) return 1;
            return 0;
        };

        return enriched.sort((a, b) => {
            // 1. Expired opportunities always go to the absolute bottom
            const isExpiredA = a.expiresAt ? new Date(a.expiresAt) < new Date() : false;
            const isExpiredB = b.expiresAt ? new Date(b.expiresAt) < new Date() : false;
            if (isExpiredA !== isExpiredB) return isExpiredA ? 1 : -1;

            // 2. Not-eligible jobs always go to the bottom
            if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;

            // 3. Bucket weight (unapplied/unsaved first)
            const bucketDiff = bucketWeight(a) - bucketWeight(b);
            if (bucketDiff !== 0) return bucketDiff;

            // 4. Sort override
            if (sort === 'latest') {
                const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
            } else if (sort === 'trending') {
                const trendA = (a as any).views || (a as any).applicationsCount || a.matchScore || 0;
                const trendB = (b as any).views || (b as any).applicationsCount || b.matchScore || 0;
                if (trendB !== trendA) return trendB - trendA;
            }

            // 5. Mobile Architecture: Recency priority (newer postedAt date comes first)
            const timeA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const timeB = b.postedAt ? new Date(b.postedAt).getTime() : 0;

            const diff = Math.abs(timeB - timeA);
            if (diff > 24 * 60 * 60 * 1000) {
                return timeB - timeA;
            }

            // 5. Match score tie-breaker for postings within the same 24h window
            const scoreA = a.matchScore ?? 0;
            const scoreB = b.matchScore ?? 0;
            if (scoreB !== scoreA) {
                return scoreB - scoreA;
            }

            return timeB - timeA;
        });
    }, [opportunities, selectedLoc, selectedYear, closingSoon, sector, qualification, course, profile, normalizedSearch, type, mode, source, sort, showOnlySaved, savedJobsMap, isMounted]);

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

    return {
        opportunities,
        filteredOpps,
        totalCount,
        page,
        hasMore,
        isLoading,
        error,
        usingCachedFeed,
        cachedAt,
        profileIncomplete,
        toggleSave,
        setOpportunities,
        reload: () => loadOpportunities(1, false),
        loadMore: () => hasMore && !isLoading && loadOpportunities(page + 1, true),
    };
}
