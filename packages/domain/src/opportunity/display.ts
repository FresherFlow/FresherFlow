// @fresherflow/domain — Opportunity Display Logic
// Consistent labels and formatting for the platform.

import type { Opportunity } from '@fresherflow/types';

/**
 * Formats a salary range for display.
 */
export const formatSalaryRange = (salary: { min?: number; max?: number } | null | undefined): string => {
    if (!salary || (!salary.min && !salary.max)) return 'Not disclosed';
    const { min, max } = salary;
    if (min && max) {
        return `₹${(min / 100000).toFixed(1)}L - ${(max / 100000).toFixed(1)}L`;
    }
    if (min) return `From ₹${(min / 100000).toFixed(1)}L`;
    if (max) return `Up to ₹${(max / 100000).toFixed(1)}L`;
    return 'Not disclosed';
};

/**
 * Formats experience requirements for display.
 */
export const formatExperienceRange = (min: number, max: number): string => {
    if (min === 0 && max === 0) return 'Fresher';
    if (min === max) {
        if (min === 0) return 'Fresher';
        return `${min} year${min !== 1 ? 's' : ''}`;
    }
    if (max >= 50) return `${min}+ years`;
    return `${min}-${max} years`;
};

/**
 * Standard date formatting for the platform (e.g., Nov 24, 2026).
 */
export const formatDisplayDate = (dateStr: string | Date | null | undefined): string => {
    if (!dateStr) return 'TBA';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return 'TBA';
    
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Normalizes a time range (e.g., "10.00-18.00") into a standard 12-hour display format.
 */
export function formatTimeText12Hour(input?: string | null): string {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    const to12HourPart = (value: string): string => {
        const normalized = value.trim().replace(/\./g, ':').replace(/\s+/g, ' ');
        const match = normalized.match(/^(\d{1,2})(?::([0-5]\d))?\s*([AaPp][Mm])?$/);
        if (!match) return value.trim();

        const rawHour = Number(match[1]);
        const rawMinute = match[2] ?? '00';
        const ampm = match[3]?.toUpperCase();

        if (ampm) {
            const hour = rawHour % 12 || 12;
            return `${hour}:${rawMinute} ${ampm}`;
        }
        if (rawHour > 23) return value.trim();
        const hour12 = rawHour % 12 || 12;
        const suffix = rawHour >= 12 ? 'PM' : 'AM';
        return `${hour12}:${rawMinute} ${suffix}`;
    };

    const rangeMatch = trimmed.match(/^(.*?)(?:\s*(?:-|–|to)\s*)(.*?)$/i);
    if (!rangeMatch) return to12HourPart(trimmed);

    return `${to12HourPart(rangeMatch[1])} - ${to12HourPart(rangeMatch[2])}`;
}

/**
 * Normalizes an array of locations into a human-friendly display label.
 * Prioritizes PAN India drive status.
 */
export function parseOpportunityLocation(locations?: string[] | null): { shortLabel: string; fullLabel: string; city?: string; state?: string; cities?: string[] } {
    if (!locations || locations.length === 0) {
        return { shortLabel: 'Remote', fullLabel: 'Remote / Work from Home', city: 'Remote', cities: [] };
    }

    const rawTokens = locations
        .flatMap((value) => value.split(','))
        .map((token) => token.trim())
        .filter(Boolean);

    const citiesList = Array.from(new Set(rawTokens));
    const first = citiesList[0] || 'Remote';

    let shortLabel = 'Remote';
    if (citiesList.length === 1) {
        shortLabel = first;
    } else if (citiesList.length === 2) {
        shortLabel = citiesList.join(', ');
    } else if (citiesList.length > 2) {
        shortLabel = `${first} +${citiesList.length - 1}`;
    }

    return {
        shortLabel,
        fullLabel: locations.join(', '),
        city: first,
        cities: citiesList,
    };
}

/**
 * Legacy Alias: Formats opportunity salary for display.
 */
export const getOpportunityDisplaySalary = (item: { salary?: { min?: number; max?: number } | null }): string => {
    return formatSalaryRange(item.salary);
};

// ── detailUtils Backports ───────────────────────────────────────────────────

import type { Profile } from '@fresherflow/types';

export type ListingState = 'EXPIRED' | 'CLOSING_SOON' | 'ACTIVE' | 'INACTIVE';

export type TimelineEventView = NonNullable<Opportunity['events']>[number] & { _dt: Date };

export type EligibilitySnapshot = {
    statusLabel: string;
    statusTone: 'neutral' | 'warn' | 'ok';
    mustFix: string[];
    matchedSkills: string[];
    missingSkills: string[];
};

export function getListingState(opportunity: Opportunity & { linkHealth?: string }): string {
    if (opportunity.status && opportunity.status !== 'PUBLISHED') return opportunity.status;
    if (opportunity.linkHealth === 'BROKEN') return 'BROKEN';
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

    const levels = ['DIPLOMA', 'DEGREE', 'PG'];
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
    const currentSkillSet = new Set((opportunity.requiredSkills || []).map((skill) => skill.toLowerCase()));
    const currentLocations = new Set((opportunity.locations || []).map((location: string) => location.toLowerCase()));

    return (opportunities || [])
        .filter((item) => item.id !== opportunity.id)
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

import { ActionType } from '@fresherflow/types';

export function getCurrentActionType(opportunity: Opportunity | null): ActionType | null {
    if (!opportunity?.actions?.length) return null;
    const current = opportunity.actions[0].actionType as ActionType;
    if (current === ActionType.PLANNING) return ActionType.PLANNED;
    if (current === ActionType.ATTENDED) return ActionType.INTERVIEWED;
    return current;
}

export function getTrackerOptions(isWalkinFlow: boolean): Array<{ key: ActionType; label: string }> {
    return [
        ...(isWalkinFlow ? [] : [{ key: ActionType.APPLIED, label: 'Applied' }]),
        { key: ActionType.PLANNED, label: 'Planned' },
        { key: ActionType.INTERVIEWED, label: isWalkinFlow ? 'Attended' : 'Interviewed' },
        { key: ActionType.SELECTED, label: 'Selected' },
    ];
}

export type SharePlatform = 'telegram' | 'linkedin' | 'x' | 'instagram' | 'facebook' | 'other';

export function buildShareUrl(baseUrl: string, options: { 
    platform: SharePlatform; 
    campaign?: string; 
    source?: string; 
    medium?: string; 
    ref?: string;
}) {
    try {
        const url = new URL(baseUrl);
        if (options.ref) url.searchParams.set('ref', options.ref);
        if (options.source) url.searchParams.set('source', options.source);
        if (options.platform) url.searchParams.set('utm_source', options.platform);
        if (options.medium) url.searchParams.set('utm_medium', options.medium);
        if (options.campaign) url.searchParams.set('utm_campaign', options.campaign);
        return url.toString();
    } catch {
        return baseUrl;
    }
}
