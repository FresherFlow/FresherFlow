import { useState, useEffect, useMemo } from 'react';
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

export interface UseCategoryPageStateProps {
    type: OpportunityType | null;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
}

export function useCategoryPageState({ type, initialData }: UseCategoryPageStateProps) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();

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
        location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null, workMode: (searchParams?.get('workMode') as any) || null, skills: searchParams?.get('skills') ? searchParams.get('skills')!.split(',') : [],
    });
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [draftLoc, setDraftLoc] = useState<string | null>(null);
    const [draftYear, setDraftYear] = useState<number | null>(null);
    const [draftClosingSoon, setDraftClosingSoon] = useState(false);
    const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
    const [draftSector, setDraftSector] = useState<string | null>(null);
    const [draftQualification, setDraftQualification] = useState<string | null>(null);
    const [draftCourse, setDraftCourse] = useState<string | null>(null);
    const [draftWorkMode, setDraftWorkMode] = useState<'REMOTE' | 'HYBRID' | 'ON_SITE' | null>(null);
    const [draftSkills, setDraftSkills] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [visibleCount, setVisibleCount] = useState(20);

    useEffect(() => { setMounted(true); }, []);

    // Reset pagination when search or filters change
    useEffect(() => {
        setVisibleCount(20);
    }, [search, type, filters.location, filters.sector, filters.qualification, filters.course, filters.year, filters.closingSoon, filters.saved, filters.workMode, filters.skills]);

    const mobileActiveCount =
        (filters.location ? 1 : 0) + (filters.closingSoon ? 1 : 0) + (filters.saved ? 1 : 0) +
        (filters.sector ? 1 : 0) + (filters.qualification ? 1 : 0) + (filters.course ? 1 : 0) + (filters.year ? 1 : 0) + (filters.workMode ? 1 : 0) + (filters.skills && filters.skills.length > 0 ? 1 : 0);

    useEffect(() => {
        if (!mounted) return;
        const params = new URLSearchParams(searchParams?.toString() || '');
        let changed = false;

        if (filters.skills && filters.skills.length > 0) {
            const current = params.get('skills');
            const next = filters.skills.join(',');
            if (current !== next) { params.set('skills', next); changed = true; }
        } else if (params.has('skills')) {
            params.delete('skills'); changed = true;
        }

        if (filters.workMode) {
            const current = params.get('workMode');
            if (current !== filters.workMode) { params.set('workMode', filters.workMode); changed = true; }
        } else if (params.has('workMode')) {
            params.delete('workMode'); changed = true;
        }

        if (changed) {
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [filters.skills, filters.workMode, mounted, router, searchParams]);

    const { filteredOpps, isLoading, error, profileIncomplete, toggleSave, reload } = useOpportunitiesFeed({
        type,
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
            if (filters.workMode) {
                if (opp.workMode !== filters.workMode) return false;
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
        setIsMobileFilterOpen(true);
    };

    const applyMobileFilters = () => {
        setFilters({ location: draftLoc, year: draftYear, closingSoon: draftClosingSoon, saved: draftShowOnlySaved, sector: draftSector, qualification: draftQualification, course: draftCourse, workMode: draftWorkMode, skills: draftSkills });
        setIsMobileFilterOpen(false);
    };

    const clearAll = () => {
        setSearch('');
        setFilters({ location: null, year: null, closingSoon: false, saved: false, sector: null, qualification: null, course: null, workMode: null, skills: [] });
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
