import { Opportunity, EducationLevel } from '@fresherflow/types';
import {
    isStaleWalkin,
    isGovernmentOpportunity,
    matchesFeedType,
    getOpportunityDistanceKm,
    isWalkinInPeriod,
    type WalkinDrivePeriod,
} from '@/features/jobs/utils/walkinMapUtils';
import { getAtsName } from '@/features/jobs/utils/atsSource';
import { getDeclaredPassoutYears, matchesDeclaredPassoutYear } from '@/features/jobs/domain/passoutYears';
import { opportunityMatchesSearch } from '@/features/jobs/utils/searchUtils';
import { matchesProfileFilters } from '@/features/jobs/hooks/useProfileFilters';
import {
    GOVT_PHASE_STATUSES,
    jobMatchesCategory,
    type GovtPhaseFilter,
    type GovtCategoryFilter,
} from '@/features/jobs/components/GovtPhaseTabs';

/**
 * One home for feed filtering. The feed hook AND the mobile draft-match
 * counter both run these predicates — a filter change lands here once and
 * both follow. Never duplicate this logic at a callsite.
 */

const opportunitySkillList = (opp: Opportunity): string[] =>
    ((opp as any).skills || opp.requiredSkills || []) as string[];

const matchesSkills = (opp: Opportunity, skills?: string[] | null): boolean => {
    if (!skills || skills.length === 0) return true;
    const listing = opportunitySkillList(opp);
    if (listing.length === 0) return true;
    return skills.some((s) =>
        listing.some((os) => os.toLowerCase() === s.toLowerCase())
    );
};

const matchesRoles = (opp: Opportunity, roles?: string[] | null): boolean => {
    if (!roles || roles.length === 0) return true;
    return roles.some((r) => {
        const rLower = r.toLowerCase();
        const titleMatch = (opp.title || '').toLowerCase().includes(rLower);
        const normRoleMatch = ((opp.normalizedRole || '') as string).toLowerCase().includes(rLower);
        const rolesMatch = ((opp as any).roles || []).some((or: string) => or.toLowerCase().includes(rLower));
        return titleMatch || normRoleMatch || rolesMatch;
    });
};

const matchesWorkMode = (opp: Opportunity, mode?: string[] | string | null): boolean => {
    if (!mode) return true;
    const modeArray = Array.isArray(mode) ? mode : [mode];
    if (modeArray.length === 0) return true;
    return modeArray.some((m) => {
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
};

export interface FeedFilterCriteria {
    showOnlySaved: boolean;
    savedIds: Record<string, unknown>;
    sort?: string | null;
    type?: string | null;
    mode?: string[] | string | null;
    source?: string[];
    selectedLoc?: string | null;
    selectedYear?: number | null;
    closingSoon: boolean;
    sector?: string | null;
    qualification?: string | null;
    course?: string | null;
    skills?: string[] | null;
    roles?: string[] | null;
    experience?: string[] | null;
    company?: string[] | null;
    debouncedSearch: string;
    isLiveOverlay: boolean;
}

/** Pass 1: facet filtering over the loaded feed (or live-search results). */
export function filterOpportunities(opps: Opportunity[], criteria: FeedFilterCriteria): Opportunity[] {
    const {
        showOnlySaved,
        savedIds,
        sort,
        type,
        mode,
        source,
        selectedLoc,
        closingSoon,
        sector,
        qualification,
        course,
        selectedYear,
        skills,
        roles,
        experience,
        company,
        debouncedSearch,
        isLiveOverlay,
    } = criteria;

    return opps.filter(opp => {
        if (showOnlySaved && !savedIds[opp.id]) {
            return false;
        }

        // Support sort === 'expiring': exclude listings without deadline or already expired
        if (sort === 'expiring') {
            if (!opp.expiresAt || new Date(opp.expiresAt) < new Date()) {
                return false;
            }
        }

        // Segregate government jobs from normal feeds
        const isGovOpp = isGovernmentOpportunity(opp);
        const isGovFeed = type === 'GOVERNMENT';
        if (isGovOpp !== isGovFeed) {
            return false;
        }

        // Suppress stale walk-in drives whose dates are entirely in the past (unless showOnlySaved is true)
        if (!showOnlySaved && isStaleWalkin(opp)) {
            return false;
        }

        // Filter by selected feed kind (JOB, INTERNSHIP, WALKIN, REMOTE, HACKATHONS)
        if (type && !matchesFeedType(opp, type)) {
            return false;
        }

        if (!matchesWorkMode(opp, mode)) return false;

        if (source && source.length > 0) {
            const atsName = getAtsName(opp.applyLink || (opp as any).sourceLink || opp.companyWebsite);
            if (!atsName || !source.some(s => s.toLowerCase() === atsName.toLowerCase())) {
                return false;
            }
        }

        const matchesSearch = isLiveOverlay || opportunityMatchesSearch(opp, debouncedSearch);

        // Location is URL-owned now (profile seeds write `?location=Mumbai,Pune`),
        // so the value is comma-separated. Listings with no location data and
        // remote roles pass — the same rule the server's preference filter uses.
        const locationTerms = selectedLoc
            ? selectedLoc.split(',').map((term) => term.toLowerCase().trim()).filter(Boolean)
            : [];
        const oppLocations = (opp.locations || []).map((loc) => loc.toLowerCase().trim()).filter(Boolean);
        const oppWorkMode = String((opp as unknown as { workMode?: string | null }).workMode || '').toUpperCase();
        const isRemoteRole = oppWorkMode === 'REMOTE'
            || oppLocations.some((loc) => loc.includes('remote') || loc.includes('wfh') || loc.includes('work from home'));
        const matchesLoc = locationTerms.length === 0
            || oppLocations.length === 0
            || isRemoteRole
            || oppLocations.some((loc) => locationTerms.some((s) => {
                if ((s === 'bangalore' || s === 'bengaluru') && (loc === 'bangalore' || loc === 'bengaluru')) {
                    return true;
                }
                if ((s === 'gurgaon' || s === 'gurugram') && (loc === 'gurgaon' || loc === 'gurugram')) {
                    return true;
                }
                return loc.includes(s) || s.includes(loc);
            }));

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

        // A listing that declares no batch requirement passes any batch filter —
        // the server's `allowedPassoutYears IS EMPTY` rule. The old title-regex
        // sniff only ever added exclusions for jobs that never stated a batch.
        const matchesYear = !selectedYear || matchesDeclaredPassoutYear(opp, selectedYear);

        const matchesExperience = !experience || experience.length === 0 || experience.some(expStr => {
            const oppMin = opp.experienceMin ?? (opp as any).experienceRange?.min ?? 0;
            const oppMax = opp.experienceMax ?? (opp as any).experienceRange?.max ?? oppMin;
            if (expStr.includes('Fresher') || expStr.includes('0 years')) {
                return oppMin === 0;
            }
            if (expStr === '0-1 years') {
                return oppMin <= 1 && oppMax >= 0;
            }
            if (expStr === '1-2 years') {
                return oppMin <= 2 && oppMax >= 1;
            }
            if (expStr === '2-3 years') {
                return oppMin <= 3 && oppMax >= 2;
            }
            if (expStr === '3-5 years') {
                return oppMin <= 5 && oppMax >= 3;
            }
            if (expStr === '5+ years') {
                return oppMax >= 5 || oppMin >= 5;
            }
            return true;
        });

        const matchesCompany = !company || company.length === 0 || company.some((c: string) =>
            (opp.company || '').toLowerCase() === c.toLowerCase()
        );

        return matchesSearch && matchesLoc && matchesClosingSoon && matchesSector && matchesQualification && matchesCourse && matchesYear && matchesSkills(opp, skills) && matchesRoles(opp, roles) && matchesExperience && matchesCompany;
    });
}

export interface ProfileVisibilityInput {
    activeProfileChips: Parameters<typeof matchesProfileFilters>[1];
    layerOn: boolean;
    showHiddenProfile: boolean;
}

/** Profile layer gate: hides preference-mismatched jobs unless revealed. */
export function applyProfileVisibility(
    opps: Opportunity[],
    input: ProfileVisibilityInput,
): Opportunity[] {
    const { activeProfileChips, layerOn, showHiddenProfile } = input;
    const matchedByProfile = activeProfileChips.length > 0
        ? opps.filter((opp) => matchesProfileFilters(opp, activeProfileChips))
        : opps;
    return layerOn && !showHiddenProfile ? matchedByProfile : opps;
}

export interface LocalFilterInput {
    saved: boolean;
    workMode: string[] | null;
    skills: string[];
    role: string[] | undefined;
    type?: string | null;
    govtPhase: GovtPhaseFilter;
    govtCategory: GovtCategoryFilter | null;
    userLocation: { latitude: number; longitude: number } | null | undefined;
    driveDate: WalkinDrivePeriod;
    /**
     * Max distance in km for a walk-in. `null`/absent means no radius limit.
     * Optional so existing callers keep working while radius support lands;
     * distinct from `userLocation`, which only drives nearest-first sorting.
     */
    driveRadiusKm?: number | null;
}

/** Pass 2: workMode/skills/role/saved/govt/drive scoping over pass-1 output. */
export function applyLocalFilters(opps: Opportunity[], input: LocalFilterInput): Opportunity[] {
    const { workMode, skills, role, type, govtPhase, govtCategory, userLocation, driveDate, driveRadiusKm } = input;

    const filtered = opps.filter((opp) => {
        if (
            type !== 'GOVERNMENT' &&
            opp.expiresAt &&
            new Date(opp.expiresAt) < new Date()
        )
            return false;
        if (type === 'GOVERNMENT' && govtPhase !== "ALL") {
            const s =
                (opp.governmentJobDetails as any)?.applicationStatus || "OPEN";
            if (!s || !GOVT_PHASE_STATUSES[govtPhase].includes(s)) return false;
        }
        if (type === 'GOVERNMENT' && govtCategory !== null) {
            if (!jobMatchesCategory(opp.governmentJobDetails, govtCategory))
                return false;
        }
        if (type !== 'GOVERNMENT') {
            if (!matchesWorkMode(opp, workMode)) return false;
            if (!matchesSkills(opp, skills)) return false;
            if (!matchesRoles(opp, role)) return false;
        }

        // Walk-in date filter: today, this week, or the next 30 days.
        if (type === 'WALKIN' && driveDate !== "all") {
            if (!isWalkinInPeriod(opp, driveDate)) return false;
        }

        // Walk-in proximity. Only meaningful with a location, and only ever
        // applied to drives — a radius around the user is not a filter on
        // remote or hybrid roles.
        if (type === 'WALKIN' && userLocation && driveRadiusKm != null) {
            const distance = getOpportunityDistanceKm(
                opp,
                userLocation.latitude,
                userLocation.longitude,
            );
            // A drive with no resolvable venue has no distance. Excluding it
            // is the point of a radius filter, but the distance helper falls
            // back to a city centre, so a drive outside the radius is dropped
            // rather than silently kept.
            if (distance === null || distance > driveRadiusKm) return false;
        }

        return true;
    });

    // For WALKIN type: compute distance from user and sort nearest-first
    if (type === 'WALKIN' && userLocation) {
        const withDistance = filtered.map((opp) => ({
            ...opp,
            distanceKm: getOpportunityDistanceKm(
                opp,
                userLocation.latitude,
                userLocation.longitude,
            ),
        }));
        withDistance.sort((a, b) => {
            const dA = a.distanceKm ?? Infinity;
            const dB = b.distanceKm ?? Infinity;
            return dA - dB;
        });
        return withDistance;
    }

    return filtered;
}

export interface FacetCounts {
    locations: Record<string, number>;
    skills: Record<string, number>;
    sources: Record<string, number>;
    years: Record<string, number>;
    companies: Record<string, number>;
}

/**
 * Filter-panel counts, scoped to the page the user is on. An internships
 * page must show internship counts — not whole-feed counts. The scope is the
 * exact `type` value the feed hook receives, so counts and list can never
 * disagree about what "here" means. Null/undefined type = whole feed.
 */
export function countFilterFacets(opps: Opportunity[], type?: string | null): FacetCounts {
    const scoped = type ? opps.filter((opp) => matchesFeedType(opp, type)) : opps;

    const locations: Record<string, number> = {};
    const skills: Record<string, number> = {};
    const sources: Record<string, number> = {};
    const years: Record<string, number> = {};
    const companies: Record<string, number> = {};

    scoped.forEach(opp => {
        (opp.locations || []).forEach(loc => {
            const l = loc.trim();
            if (l) locations[l] = (locations[l] || 0) + 1;
        });
        opportunitySkillList(opp).forEach((s) => {
            const skill = s.trim();
            if (skill) skills[skill] = (skills[skill] || 0) + 1;
        });
        const atsName = getAtsName(opp.applyLink || (opp as any).sourceLink || opp.companyWebsite);
        if (atsName) {
            sources[atsName] = (sources[atsName] || 0) + 1;
        }
        const comp = opp.company?.trim();
        if (comp) {
            companies[comp] = (companies[comp] || 0) + 1;
        }
    });

    // A listing that declares no batch matches every batch filter, so it belongs
    // in every bucket: the count has to describe the same predicate
    // `matchesDeclaredPassoutYear` applies. Inferring a year from the title (what
    // this used to do) filed listings under a bucket the filter would never
    // exclude them from, so the badge numbers and the resulting list disagreed.
    const declaredYearsByJob = scoped.map((opp) => getDeclaredPassoutYears(opp));
    const jobsWithoutDeclaredBatch = declaredYearsByJob.filter((declared) => declared.length === 0).length;
    const yearBuckets = new Set(declaredYearsByJob.flat().map(String));
    yearBuckets.forEach((year) => {
        years[year] = jobsWithoutDeclaredBatch
            + declaredYearsByJob.filter((declared) => declared.includes(Number(year))).length;
    });

    const filteredLocations: Record<string, number> = {};
    for (const [loc, count] of Object.entries(locations)) {
        if (count >= 1) filteredLocations[loc] = count;
    }

    return { locations: filteredLocations, skills, sources, years, companies };
}
