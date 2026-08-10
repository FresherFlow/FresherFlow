import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { useOpportunitiesFeed } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { useAuth } from '@/lib/auth/AuthContext';
import { type FilterBarFilters } from '@/features/opportunities/components/FilterDropdownBar';
import {
    GOVT_PHASE_STATUSES,
    GOVT_CATEGORIES,
    jobMatchesCategory,
    type GovtPhaseFilter,
    type GovtCategoryFilter,
} from '@/features/opportunities/components/GovtPhaseTabs';
import { formatJobFeedTitle } from '@/features/opportunities/utils/formatJobFeedTitle';

export interface UseCategoryPageStateProps {
    type: OpportunityType | null;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
    initialFilters?: Partial<FilterBarFilters>;
    canonicalRedirect?: boolean;
}

export function useCategoryPageState({ type: propType, initialData, initialFilters, canonicalRedirect }: UseCategoryPageStateProps) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

    const urlType = searchParams?.get('type');
    const type = (urlType ? urlType.toUpperCase() : propType) as OpportunityType | null;
    const mode = searchParams?.get('mode');
    const sourceParam = searchParams?.get('source');
    const source = sourceParam ? sourceParam.split(',') : [];
    const sort = searchParams?.get('sort');

    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

    useEffect(() => {
        setIsDesktop(window.innerWidth >= 1024);
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (!event?.state || !event.state.modalOpen) {
                setSelectedOpp(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        if (!selectedOpp) return;
        if (window.innerWidth >= 1024) return; // Only lock scroll on mobile
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedOpp]);

    const handleSelectOpportunity = (opp: Opportunity) => {
        setSelectedOpp(opp);
        window.history.pushState({ modalOpen: true }, '', window.location.href);
    };

    const handleCloseOpportunityPane = () => {
        const mobileModal = document.getElementById('mobile-detail-modal');
        if (mobileModal) {
            mobileModal.classList.remove('animate-in', 'slide-in-from-bottom');
            mobileModal.classList.add('animate-out', 'slide-out-to-bottom', 'fade-out', 'duration-300');
        }
        setTimeout(() => {
            setSelectedOpp(null);
            if (window.history.state?.modalOpen) window.history.back();
        }, 250);
    };

    const [search, setSearch] = useState(searchParams?.get('q') || '');
    const [govtPhase, setGovtPhase] = useState<GovtPhaseFilter>('ALL');
    const [govtCategory, setGovtCategory] = useState<GovtCategoryFilter>((searchParams?.get('category') as GovtCategoryFilter) || null);
    const [filters, setFilters] = useState<FilterBarFilters>({
        location: searchParams?.get('location') || initialFilters?.location || null, 
        year: searchParams?.get('year') ? parseInt(searchParams.get('year')!, 10) : (initialFilters?.year || null), 
        closingSoon: searchParams?.get('closingSoon') === 'true', 
        saved: searchParams?.get('saved') === 'true', 
        sector: searchParams?.get('sector') || initialFilters?.sector || null, 
        qualification: searchParams?.get('qualification') || initialFilters?.qualification || null, 
        course: searchParams?.get('course') || initialFilters?.course || null, 
        workMode: searchParams?.getAll('mode').length ? searchParams.getAll('mode').map(m => m.toUpperCase()) : (initialFilters?.workMode || null), 
        skills: searchParams?.get('skills') ? searchParams.get('skills')!.split(',') : (initialFilters?.skills || []),
        source: searchParams?.get('source') ? searchParams.get('source')!.split(',') : (initialFilters?.source || []),
    });
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftLoc, setDraftLoc] = useState<string | null>(null);
    const [draftYear, setDraftYear] = useState<number | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftSector, setDraftSector] = useState<string | null>(null);
    const [draftQualification, setDraftQualification] = useState<string | null>(null);
    const [draftCourse, setDraftCourse] = useState<string | null>(null);
    const [draftWorkMode, setDraftWorkMode] = useState<string[] | null>(null);
    const [draftSkills, setDraftSkills] = useState<string[]>([]);
    const [draftSource, setDraftSource] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [visibleCount, setVisibleCount] = useState(20);

    useEffect(() => { setMounted(true); }, []);

    // Keep a ref to the latest searchParams so the outbound effect can read
    // the current URL without depending on searchParams reactively.
    const searchParamsRef = React.useRef(searchParams);
    useEffect(() => { searchParamsRef.current = searchParams; });

    // Sync filter state FROM URL when searchParams change (e.g. sidebar link navigation).
    // Skip the first render — state is already initialised from searchParams above.
    const isFirstRender = React.useRef(true);
    useEffect(() => {
        if (isFirstRender.current) { isFirstRender.current = false; return; }
        const sp = searchParams;
        setSearch(sp?.get('q') || '');
        setGovtCategory((sp?.get('category') as GovtCategoryFilter) || null);
        setFilters({
            location: sp?.get('location') || initialFilters?.location || null,
            year: sp?.get('year') ? parseInt(sp.get('year')!, 10) : (initialFilters?.year || null),
            closingSoon: sp?.get('closingSoon') === 'true',
            saved: sp?.get('saved') === 'true',
            sector: sp?.get('sector') || initialFilters?.sector || null,
            qualification: sp?.get('qualification') || initialFilters?.qualification || null,
            course: sp?.get('course') || initialFilters?.course || null,
            workMode: sp?.getAll('mode').length ? sp.getAll('mode').map(m => m.toUpperCase()) : (initialFilters?.workMode || null),
            skills: sp?.get('skills') ? sp.get('skills')!.split(',') : (initialFilters?.skills || []),
            source: sp?.get('source') ? sp.get('source')!.split(',') : (initialFilters?.source || []),
        });
     
    }, [searchParams]);

    // Reset pagination when search or filters change
    useEffect(() => {
        setVisibleCount(20);
    }, [search, type, filters.location, filters.sector, filters.qualification, filters.course, filters.year, filters.closingSoon, filters.saved, filters.workMode, filters.skills, filters.source]);

    const mobileActiveCount =
        (filters.location ? 1 : 0) + (filters.closingSoon ? 1 : 0) + (filters.saved ? 1 : 0) +
        (filters.sector ? 1 : 0) + (filters.qualification ? 1 : 0) + (filters.course ? 1 : 0) + (filters.year ? 1 : 0) + (filters.workMode ? 1 : 0) + (filters.skills && filters.skills.length > 0 ? 1 : 0) + (filters.source && filters.source.length > 0 ? 1 : 0);

    useEffect(() => {
        if (!mounted) return;

        if (canonicalRedirect && initialFilters) {
            let canonicalCleared = false;
            if (initialFilters.skills && initialFilters.skills.length > 0 && (!filters.skills || filters.skills.length === 0)) canonicalCleared = true;
            if (initialFilters.location && !filters.location) canonicalCleared = true;
            if (initialFilters.year && !filters.year) canonicalCleared = true;
            
            if (canonicalCleared) {
                router.push('/jobs');
                return;
            }
        }

        const params = new URLSearchParams(searchParamsRef.current?.toString() || '');
        let changed = false;

        const updateParam = (key: string, value: string | null | undefined | boolean | number) => {
            if (value) {
                const strValue = String(value);
                if (params.get(key) !== strValue) {
                    params.set(key, strValue);
                    changed = true;
                }
            } else if (params.has(key)) {
                params.delete(key);
                changed = true;
            }
        };

        updateParam('q', search);
        updateParam('category', govtCategory);
        updateParam('location', filters.location);
        updateParam('year', filters.year);
        updateParam('closingSoon', filters.closingSoon);
        updateParam('saved', filters.saved);
        updateParam('sector', filters.sector);
        updateParam('qualification', filters.qualification);
        updateParam('course', filters.course);
        
        if (params.has('workMode')) { params.delete('workMode'); changed = true; } // Cleanup old param
        
        const currentModes = params.getAll('mode');
        const nextModes = (filters.workMode || []).map(m => m.toLowerCase());
        
        // Simple array check
        if (currentModes.join(',') !== nextModes.join(',')) {
            params.delete('mode');
            nextModes.forEach(m => params.append('mode', m));
            changed = true;
        }
        
        if (filters.skills && filters.skills.length > 0) {
            updateParam('skills', filters.skills.join(','));
        } else {
            updateParam('skills', null);
        }

        if (filters.source && filters.source.length > 0) {
            updateParam('source', filters.source.join(','));
        } else {
            updateParam('source', null);
        }

        if (changed) {
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [search, govtCategory, filters.location, filters.year, filters.closingSoon, filters.saved, filters.sector, filters.qualification, filters.course, filters.skills, filters.source, filters.workMode, mounted, router]);

    useEffect(() => {
        if (!mounted) return;
        const newTitle = formatJobFeedTitle({
            type: type,
            workMode: filters.workMode,
            location: filters.location,
            skills: filters.skills,
            sector: filters.sector,
            course: filters.course,
            search: search
        });
        document.title = `${newTitle || 'Job Opportunities Feed'} | FresherFlow`;
    }, [type, filters, search, mounted]);

    const { filteredOpps, isLoading, error, profileIncomplete, toggleSave, reload } = useOpportunitiesFeed({
        type,
        mode,
        source,
        sort,
        selectedLoc: filters.location,
        showOnlySaved: filters.saved,
        closingSoon: filters.closingSoon,
        sector: filters.sector,
        qualification: filters.qualification,
        course: filters.course,
        selectedYear: filters.year,
        search,
        initialData,
    });

    const phaseCounts = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return undefined;
        const counts: Partial<Record<GovtPhaseFilter, number>> = {};
        for (const [phase, statuses] of Object.entries(GOVT_PHASE_STATUSES)) {
            const key = phase as GovtPhaseFilter;
            counts[key] = key === 'ALL'
                ? filteredOpps.length
                : filteredOpps.filter(o => { const s = (o.governmentJobDetails as any)?.applicationStatus; return s && statuses.includes(s); }).length;
        }
        return counts;
    }, [filteredOpps, type]);

    const categoryCounts = useMemo(() => {
        if (type !== OpportunityType.GOVERNMENT) return undefined;
        const counts: Record<string, number> = {};
        for (const { label } of GOVT_CATEGORIES) {
            counts[label] = filteredOpps.filter(o => jobMatchesCategory(o.governmentJobDetails, label)).length;
        }
        return counts;
    }, [filteredOpps, type]);

    const visibleOpps = filteredOpps.filter(opp => {
        if (filters.saved) return true;
        if (type !== OpportunityType.GOVERNMENT && opp.expiresAt && new Date(opp.expiresAt) < new Date()) return false;
        if (type === OpportunityType.GOVERNMENT && govtPhase !== 'ALL') {
            const s = (opp.governmentJobDetails as any)?.applicationStatus;
            if (!s || !GOVT_PHASE_STATUSES[govtPhase].includes(s)) return false;
        }
        if (type === OpportunityType.GOVERNMENT && govtCategory !== null) {
            if (!jobMatchesCategory(opp.governmentJobDetails, govtCategory)) return false;
        }
        if (type !== OpportunityType.GOVERNMENT) {
            if (filters.workMode && filters.workMode.length > 0) {
                const isMatch = filters.workMode.some(m => {
                    const sel = m.toLowerCase();
                    const oppWorkMode = String((opp as any).workMode || '').toLowerCase();
                    if (sel === 'remote') {
                        return (opp.locations || []).some(loc => {
                            const l = loc.toLowerCase();
                            return l.includes('remote') || l.includes('wfh') || l.includes('work from home');
                        }) || oppWorkMode === 'remote' || (opp.title || '').toLowerCase().includes('remote');
                    }
                    if (sel === 'hybrid') {
                        return (opp.locations || []).some(loc => loc.toLowerCase().includes('hybrid')) 
                            || oppWorkMode === 'hybrid' || (opp.title || '').toLowerCase().includes('hybrid');
                    }
                    if (sel === 'on_site' || sel === 'onsite') {
                        return oppWorkMode === 'on_site' || oppWorkMode === 'onsite' || 
                        (!oppWorkMode && !((opp.locations || []).some(loc => {
                            const l = loc.toLowerCase();
                            return l.includes('remote') || l.includes('wfh') || l.includes('work from home') || l.includes('hybrid');
                        })) && !(opp.title || '').toLowerCase().includes('remote') && !(opp.title || '').toLowerCase().includes('hybrid'));
                    }
                    return false;
                });
                if (!isMatch) return false;
            }
            if (filters.skills && filters.skills.length > 0) {
                const hasAllSkills = filters.skills.every(s => 
                    opp.requiredSkills?.some(rs => rs.toLowerCase() === s.toLowerCase())
                );
                if (!hasAllSkills) return false;
            }
        }
        return true;
    });

    // Keep selectedOpp in sync with visibleOpps on desktop without flashing null/skeleton
    useEffect(() => {
        if (isDesktop === true && type !== OpportunityType.GOVERNMENT) {
            if (visibleOpps.length === 0) {
                setSelectedOpp(null);
            } else if (!selectedOpp || !visibleOpps.some(o => o.id === selectedOpp.id)) {
                setSelectedOpp(visibleOpps[0]);
            }
        }
    }, [isDesktop, visibleOpps, selectedOpp, type]);

    const showGroupedView = type === OpportunityType.GOVERNMENT && govtPhase === 'ALL' && !search && !filters.saved;

    const isJobSaved = (opp: Opportunity) => opp.isSaved || false;
    const isJobApplied = (opp: Opportunity) => !!(opp.actions && opp.actions.length > 0);

    const openMobileFilters = () => {
        setDraftLoc(filters.location); setDraftYear(filters.year); setDraftClosingSoon(filters.closingSoon);
        setDraftShowOnlySaved(filters.saved); setDraftSector(filters.sector);
        setDraftQualification(filters.qualification); setDraftCourse(filters.course);
        setDraftWorkMode(filters.workMode); setDraftSkills(filters.skills || []);
        setDraftSource(filters.source || []);
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setFilters({ location: draftLoc, year: draftYear, closingSoon: draftClosingSoon, saved: draftShowOnlySaved, sector: draftSector, qualification: draftQualification, course: draftCourse, workMode: draftWorkMode, skills: draftSkills, source: draftSource });
        setIsMobileFilterOpen(false);
    };

    const clearAll = () => {
        setSearch('');
        setFilters({ location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null, workMode: null, skills: [], source: [] });
    };

    return {
        type,
        user,
        filteredOpps,
        visibleOpps,
        isLoading,
        error,
        profileIncomplete,
        mounted,
        isDesktop,
        
        selectedOpp,
        handleSelectOpportunity,
        handleCloseOpportunityPane,
        
        search,
        setSearch,
        filters,
        setFilters,
        
        govtPhase,
        setGovtPhase,
        govtCategory,
        setGovtCategory,
        phaseCounts,
        categoryCounts,
        showGroupedView,
        
        isMobileFilterOpen,
        setIsMobileFilterOpen,
        draftLoc, setDraftLoc,
        draftYear, setDraftYear,
        draftClosingSoon, setDraftClosingSoon,
        draftShowOnlySaved, setDraftShowOnlySaved,
        draftSector, setDraftSector,
        draftQualification, setDraftQualification,
        draftCourse, setDraftCourse,
        draftWorkMode, setDraftWorkMode,
        draftSkills, setDraftSkills,
        draftSource, setDraftSource,
        mobileActiveCount,
        openMobileFilters,
        applyMobileFilters,
        clearAll,
        
        visibleCount,
        setVisibleCount,
        
        isJobSaved,
        isJobApplied,
        toggleSave,
        reload,
    };
}

export type CategoryPageState = ReturnType<typeof useCategoryPageState>;
