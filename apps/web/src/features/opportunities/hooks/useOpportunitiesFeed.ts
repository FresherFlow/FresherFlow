import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Opportunity, EducationLevel } from '@fresherflow/types';
// WEB PIVOT: keep API imports disabled while public web runs from CDN/static JSON.
// import { opportunitiesApi, savedApi } from '@/lib/api/client';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/lib/auth/AuthContext';
import toast from 'react-hot-toast';
import { readFeedCache } from '@/lib/api/offline/opportunitiesFeedCache';
import { calculateOpportunityMatch, isNotEligible } from '@/features/opportunities/domain/matchScore';

import { useFirebaseSaved } from '@/features/dashboard/hooks/useFirebaseSaved';
import { promptLoginToast } from '@/lib/utils/toastUtils';


const WEB_STATIC_DISCOVERY = true;

export const getAtsName = (link?: string | null) => {
    if (!link) return null;
    try {
        const url = new URL(link);
        const host = url.hostname.toLowerCase();
        
        // CodeQL [js/incomplete-url-substring-sanitization] false positive — display only
        
        if (host.includes('greenhouse.io')) return 'Greenhouse';
        if (host.includes('lever.co')) return 'Lever';
        if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) return 'Workday';
        if (host.includes('ashbyhq.com')) return 'Ashby';
        if (host.includes('bamboohr.com')) return 'BambooHR';
        if (host.includes('breezy.hr')) return 'BreezyHR';
        if (host.includes('smartrecruiters.com')) return 'SmartRecruiters';
        if (host.includes('workable.com')) return 'Workable';
        if (host.includes('icims.com')) return 'iCIMS';
        if (host.includes('jobvite.com')) return 'Jobvite';
        if (host.includes('recruitee.com')) return 'Recruitee';
        if (host.includes('phenompro.com') || host.includes('phenom.com')) return 'Phenom';
        if (host.includes('taleo.net')) return 'Taleo';
        if (host.includes('successfactors.com') || host.includes('successfactors.eu')) return 'SuccessFactors';
        if (host.includes('darwinbox.in') || host.includes('darwinbox.com')) return 'Darwinbox';
        if (host.includes('eightfold.ai')) return 'Eightfold';
        if (host.includes('mercor.com')) return 'Mercor';
        if (host.includes('keka.com')) return 'Keka';
        if (host.includes('oraclecloud.com')) return 'Oracle';
        
        if (host.includes('internshala.com')) return 'Internshala';
        if (host.includes('linkedin.com')) return 'LinkedIn';
        if (host.includes('wellfound.com') || host.includes('angel.co')) return 'Wellfound';
        if (host.includes('naukri.com')) return 'Naukri';
        if (host.includes('instahyre.com')) return 'Instahyre';
        if (host.includes('unstop.com')) return 'Unstop';

        if (host.includes('amazon.jobs')) return 'Amazon';
        if (host.includes('careers.google.com')) return 'Google';
        if (host.includes('apple.com')) return 'Apple';
        if (host.includes('metacareers.com')) return 'Meta';
        if (host.includes('microsoft.com')) return 'Microsoft';
        if (host.includes('oraclecloud.com')) return 'Oracle';
        if (host.includes('keka.com')) return 'Keka';

        const path = url.pathname.toLowerCase();
        if (host.includes('careers.') || host.includes('jobs.') || path.includes('/careers') || path.includes('/jobs') || host.includes('careers')) {
            return 'Careers';
        }
    } catch {}
    return 'Website';
};


interface UseOpportunitiesFeedOptions {
    type?: string | null;
    mode?: string[] | string | null;
    source?: string[];
    company?: string[] | null;
    sort?: string | null;
    selectedLoc?: string | null;
    selectedYear?: number | null;
    showOnlySaved: boolean;
    closingSoon: boolean;
    search: string;
    sector?: string | null;
    qualification?: string | null;
    course?: string | null;
    skills?: string[] | null;
    roles?: string[] | null;
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
    company,
    sort,
    selectedLoc,
    selectedYear,
    showOnlySaved,
    closingSoon,
    search,
    sector,
    qualification,
    course,
    skills,
    roles,
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
            if (showOnlySaved) {
                if (!user) {
                    setError('Please log in to view saved opportunities');
                    setOpportunities([]);
                    setTotalCount(0);
                    setIsLoading(false);
                    return;
                }
                throw new Error('Saved jobs are disabled on web');
            } else if (shouldUseBackendSearch) {
                throw new Error('Backend search is disabled on web');
            } else {
                throw new Error('Opportunity API list is disabled on web');
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
                    setOpportunities(cached.opportunities);
                    setTotalCount(cached.count || cached.opportunities.length);
                    setUsingCachedFeed(true);
                    setCachedAt(cached.cachedAt);
                    setHasMore(false);
                } else if (!showOnlySaved) {
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
    }, [user, authLoading, showOnlySaved, cacheScope, shouldUseBackendSearch, initialData]);

    const hasOpportunities = !!initialData?.opportunities?.length;
    const hasInitialData = !!initialData;
    useEffect(() => {
        if (!authLoading) {
            if (hasOpportunities && !shouldUseBackendSearch) {
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

            // Support sort === 'expiring': exclude listings without deadline or already expired
            if (sort === 'expiring') {
                if (!opp.expiresAt || new Date(opp.expiresAt) < new Date()) {
                    return false;
                }
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
                    
                    const oppWorkMode = String((opp as unknown as Record<string, unknown>).workMode || '').toLowerCase();
                    
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
                }) || (opp as unknown as Record<string, unknown>).workMode === 'REMOTE' || opp.title.toLowerCase().includes('remote');
                if (!isRemote) return false;
            }

            if (source && source.length > 0) {
                const atsName = getAtsName(opp.applyLink || (opp as any).sourceLink || opp.companyWebsite);
                if (!atsName || !source.some(s => s.toLowerCase() === atsName.toLowerCase())) {
                    return false;
                }
            }

            const govtDetails = opp.governmentJobDetails as unknown as Record<string, unknown> | undefined;
            const matchesSearch = !normalizedSearch || [
                opp.title,
                opp.normalizedRole,
                opp.company,
                opp.description,
                ...( (opp as any).allowedCourses || []),
                ...( (opp as any).allowedDegrees || []),
                ...((opp as any).skills || opp.requiredSkills || []),
                ...( (opp as any).roles || []),
                ...( (opp as any).categories || []),
                govtDetails?.recruitingBody,
                govtDetails?.organization,
                govtDetails?.department,
                govtDetails?.examName,
                govtDetails?.postName,
                govtDetails?.advertisementNumber,
                ...(Array.isArray(govtDetails?.jobCategory) ? govtDetails.jobCategory : []),
                govtDetails?.minimumQualification
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
                (mappedQual && ((opp as any).allowedDegrees || []).includes(mappedQual)) ||
                ((opp.governmentJobDetails as unknown as Record<string, unknown>)?.minimumQualification && String((opp.governmentJobDetails as unknown as Record<string, unknown>).minimumQualification).toLowerCase().includes(qualification.toLowerCase()));

            const courseParts = course ? course.split('/').map(p => p.trim().toLowerCase()) : [];
            const matchesCourse = !course || 
                ((opp as any).allowedCourses || []).some((c: string) => {
                    const cl = c.toLowerCase();
                    return courseParts.some(cp => cl.includes(cp));
                }) ||
                (course === 'Diploma' && ((opp as any).allowedDegrees || []).includes(EducationLevel.DIPLOMA));

            let passoutYears = [...((opp as any).allowedPassoutYears || [])];
            if (passoutYears.length === 0 && opp.passoutYearMin && opp.passoutYearMax) {
                const min = Number(opp.passoutYearMin);
                const max = Number(opp.passoutYearMax);
                if (!isNaN(min) && !isNaN(max) && min <= max) {
                    passoutYears = Array.from({ length: max - min + 1 }, (_, i) => min + i);
                }
            }
            if (passoutYears.length === 0) {
                const titleMatch = opp.title.match(/(202[0-9]|2030)/);
                if (titleMatch) passoutYears.push(Number(titleMatch[0]));
            }

            const matchesYear = !selectedYear || 
                passoutYears.map(Number).includes(Number(selectedYear));
            
            const matchesSkills = !skills || skills.length === 0 || skills.some((s: string) =>
                ((opp as any).skills || opp.requiredSkills || []).some((os: string) => os.toLowerCase() === s.toLowerCase())
            );

            const matchesRoles = !roles || roles.length === 0 || roles.some((r: string) =>
                ((opp as any).roles || []).some((or: string) => or.toLowerCase() === r.toLowerCase())
            );

            const matchesCompany = !company || company.length === 0 || company.some((c: string) =>
                (opp.company || '').toLowerCase() === c.toLowerCase()
            );

            return matchesSearch && matchesLoc && matchesClosingSoon && matchesSector && matchesQualification && matchesCourse && matchesYear && matchesSkills && matchesRoles && matchesCompany;
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

        const now = Date.now();
        const sortKeys = new Map(enriched.map(opp => [
            opp.id,
            {
                expiresAt: opp.expiresAt ? new Date(opp.expiresAt).getTime() : Infinity,
                postedAt: opp.postedAt ? new Date(opp.postedAt).getTime() : 0,
            }
        ]));

        return enriched.sort((a, b) => {
            const keysA = sortKeys.get(a.id)!;
            const keysB = sortKeys.get(b.id)!;

            // 1. Expired opportunities always go to the absolute bottom
            const isExpiredA = keysA.expiresAt < now;
            const isExpiredB = keysB.expiresAt < now;
            if (isExpiredA !== isExpiredB) return isExpiredA ? 1 : -1;

            // 2. Not-eligible jobs always go to the bottom
            if (isNotEligible(a) !== isNotEligible(b)) return isNotEligible(a) ? 1 : -1;

            // 3. Bucket weight (unapplied/unsaved first)
            const bucketDiff = bucketWeight(a) - bucketWeight(b);
            if (bucketDiff !== 0) return bucketDiff;

            // 4. Sort override
            if (sort === 'expiring') {
                const expA = keysA.expiresAt;
                const expB = keysB.expiresAt;
                if (expA !== expB) return expA - expB;
            } else if (sort === 'latest') {
                const timeA = keysA.postedAt;
                const timeB = keysB.postedAt;
                if (timeB !== timeA) return timeB - timeA;
            } else if (sort === 'trending') {
                const trendA = (a as unknown as Record<string, unknown>).views || (a as unknown as Record<string, unknown>).applicationsCount || a.matchScore || 0;
                const trendB = (b as unknown as Record<string, unknown>).views || (b as unknown as Record<string, unknown>).applicationsCount || b.matchScore || 0;
                if ((trendB as number) !== (trendA as number)) return (trendB as number) - (trendA as number);
            }

            // 5. Mobile Architecture: Recency priority (newer postedAt date comes first)
            const timeA = keysA.postedAt;
            const timeB = keysB.postedAt;

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
    }, [opportunities, selectedLoc, selectedYear, closingSoon, sector, qualification, course, skills, roles, company, profile, normalizedSearch, type, mode, source, sort, showOnlySaved, savedJobsMap, isMounted]);

    const toggleSave = async (opportunityId: string) => {
        if (!user) {
            promptLoginToast('Sign in to save opportunities');
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
