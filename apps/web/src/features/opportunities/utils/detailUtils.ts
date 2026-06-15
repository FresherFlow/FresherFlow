import type { Opportunity, Profile } from '@fresherflow/types';

export type ListingState = 'EXPIRED' | 'CLOSING_SOON' | 'ACTIVE' | 'INACTIVE';

export type TimelineEventView = NonNullable<Opportunity['events']>[number] & { _dt: Date };

export type EligibilitySnapshot = {
    statusLabel: string;
    statusTone: 'neutral' | 'warn' | 'ok';
    mustFix: string[];
    matchedSkills: string[];
    missingSkills: string[];
};

export function getListingState(opportunity: Opportunity): ListingState {
    if (opportunity.status && opportunity.status !== 'PUBLISHED') return 'INACTIVE';
    if (isExpired(opportunity)) return 'EXPIRED';
    if (isClosingSoon(opportunity)) return 'CLOSING_SOON';
    return 'ACTIVE';
}

export function formatDeadline(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return null;
    return new Date(opportunity.expiresAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function getEducationDetails(degrees: string[], courses: string[], specializations: string[] = []) {
    const level = Array.from(new Set((degrees || []).map(formatEducationLevel).filter(Boolean))).join(', ') || 'Any Graduate';
    const courseList = Array.from(new Set((courses || []).map((item) => item.trim()).filter(Boolean)));
    const specializationList = Array.from(new Set((specializations || []).map((item) => item.trim()).filter(Boolean)));
    return {
        level,
        courses: courseList.length ? courseList.join(', ') : null,
        specializations: specializationList.length ? specializationList.join(', ') : null,
    };
}

export function buildEligibilitySnapshot(opportunity: Opportunity, profile: Profile | null): EligibilitySnapshot {
    if (!profile) {
        return {
            statusLabel: 'Complete Profile',
            statusTone: 'neutral',
            mustFix: ['Add your education details to check eligibility for this role.'],
            matchedSkills: [],
            missingSkills: (opportunity.requiredSkills || []).slice(0, 8),
        };
    }

    const mustFix: string[] = [];
    const allowedYears = opportunity.allowedPassoutYears || [];
    if (allowedYears.length > 0) {
        const hasMatchingGradYear = profile.gradYear && allowedYears.includes(profile.gradYear);
        const hasMatchingPgYear = profile.pgYear && allowedYears.includes(profile.pgYear);

        if (!profile.gradYear && !profile.pgYear) {
            mustFix.push('Passout year is missing in your profile');
        } else if (!hasMatchingGradYear && !hasMatchingPgYear) {
            mustFix.push(`Passout year does not match (${allowedYears.join(', ')})`);
        }
    }

    const levels = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'];
    const allowedDegrees = opportunity.allowedDegrees || [];
    if (allowedDegrees.length > 0) {
        if (!profile.educationLevel) {
            mustFix.push('Education level is missing in your profile');
        } else {
            const userLevelIndex = levels.indexOf(profile.educationLevel);
            const levelMatch = allowedDegrees.some((degree) => {
                const degreeIndex = levels.indexOf(degree as string);
                return degreeIndex !== -1 && degreeIndex <= userLevelIndex;
            });
            if (!levelMatch) mustFix.push('Education level does not meet this role');
        }
    }

    const allowedCourses = opportunity.allowedCourses || [];
    if (allowedCourses.length > 0) {
        const normalizedAllowed = allowedCourses.map(normalizeAcademic);
        const gradCourse = profile.gradCourse ? normalizeAcademic(profile.gradCourse) : '';
        const pgCourse = profile.pgCourse ? normalizeAcademic(profile.pgCourse) : '';
        if (!(gradCourse && normalizedAllowed.includes(gradCourse)) && !(pgCourse && normalizedAllowed.includes(pgCourse))) {
            mustFix.push('Your degree course is not in the allowed list');
        }
    }

    const allowedSpecializations = (opportunity as { allowedSpecializations?: string[] }).allowedSpecializations || [];
    if (allowedSpecializations.length > 0) {
        const normalizedAllowed = allowedSpecializations.map(normalizeAcademic);
        const gradSpec = profile.gradSpecialization ? normalizeAcademic(profile.gradSpecialization) : '';
        const pgSpec = profile.pgSpecialization ? normalizeAcademic(profile.pgSpecialization) : '';
        if (!(gradSpec && normalizedAllowed.includes(gradSpec)) && !(pgSpec && normalizedAllowed.includes(pgSpec))) {
            mustFix.push('Your specialization is not in the allowed list');
        }
    }

    const requiredSkills = Array.from(new Set((opportunity.requiredSkills || []).map((skill) => skill.trim()).filter(Boolean)));
    const userSkills = new Set((profile.skills || []).map((skill) => skill.trim().toLowerCase()));
    const matchedSkills = requiredSkills.filter((skill) => userSkills.has(skill.toLowerCase()));
    const missingSkills = requiredSkills.filter((skill) => !userSkills.has(skill.toLowerCase()));

    return {
        statusLabel: mustFix.length > 0 ? 'Not Eligible Yet' : 'Eligible',
        statusTone: mustFix.length > 0 ? 'warn' : 'ok',
        mustFix,
        matchedSkills,
        missingSkills,
    };
}

export function getRelatedOpportunities(opportunity: Opportunity, opportunities: Opportunity[]) {
    const isGov = Boolean(opportunity.governmentJobDetails);
    const currentSkillSet = new Set((opportunity.requiredSkills || []).map((skill) => skill.toLowerCase()));
    const currentLocations = new Set((opportunity.locations || []).map((location: string) => location.toLowerCase()));

    return (opportunities || [])
        .filter((item) => item.id !== opportunity.id)
        .filter((item) => {
            const itemGov = Boolean(item.governmentJobDetails);
            return itemGov === isGov;
        })
        .filter((item) => !item.expiresAt || new Date(item.expiresAt) > new Date())
        .map((item) => {
            let score = 0;
            if (item.company === opportunity.company) score += 5;

            const itemLocations = (item.locations || []).map((location: string) => location.toLowerCase());
            if (itemLocations.some((location: string) => currentLocations.has(location))) score += 3;

            const itemSkills = (item.requiredSkills || []).map((skill) => skill.toLowerCase());
            const sharedSkills = itemSkills.filter((skill) => currentSkillSet.has(skill)).length;
            score += Math.min(sharedSkills, 4);

            if (item.workMode && item.workMode === opportunity.workMode) score += 1;
            return { item, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item);
}

export function sortTimelineEvents(events: Opportunity['events'] = []): TimelineEventView[] {
    return (events || [])
        .map((event): TimelineEventView => ({ ...event, _dt: new Date(event.eventDate) }))
        .sort((a, b) => a._dt.getTime() - b._dt.getTime());
}

export function formatLpaValue(value: string) {
    return /\bLPA\b/i.test(value) ? value : `${value} LPA`;
}

export function formatTimeText12Hour(value?: string | null) {
    if (!value) return 'Not specified';
    return value;
}

export function isExpired(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return false;
    return new Date(opportunity.expiresAt) < new Date();
}

export function isClosingSoon(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return false;
    const expiryDate = new Date(opportunity.expiresAt);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiryDate >= now && expiryDate <= threeDaysFromNow;
}

function formatEducationLevel(degree: string): string {
    switch (degree) {
        case 'TENTH': return '10th / SSC';
        case 'INTER': return '12th / Intermediate';
        case 'DIPLOMA': return 'Diploma';
        case 'DEGREE': return 'Any Graduate';
        case 'PG': return 'Postgraduate';
        default: return degree;
    }
}

function normalizeAcademic(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
