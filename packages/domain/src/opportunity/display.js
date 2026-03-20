"use strict";
// @fresherflow/domain — Opportunity Display Logic
// Consistent labels and formatting for the platform.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpportunityDisplaySalary = exports.formatDisplayDate = exports.formatExperienceRange = exports.formatSalaryRange = void 0;
exports.formatTimeText12Hour = formatTimeText12Hour;
exports.parseOpportunityLocation = parseOpportunityLocation;
exports.getListingState = getListingState;
exports.formatDeadline = formatDeadline;
exports.getEducationDetails = getEducationDetails;
exports.buildEligibilitySnapshot = buildEligibilitySnapshot;
exports.getRelatedOpportunities = getRelatedOpportunities;
exports.sortTimelineEvents = sortTimelineEvents;
exports.formatLpaValue = formatLpaValue;
exports.isExpired = isExpired;
exports.isClosingSoon = isClosingSoon;
exports.getCurrentActionType = getCurrentActionType;
exports.getTrackerOptions = getTrackerOptions;
exports.buildShareUrl = buildShareUrl;
/**
 * Formats a salary range for display.
 */
const formatSalaryRange = (salary) => {
    if (!salary || (!salary.min && !salary.max))
        return 'Not disclosed';
    const { min, max } = salary;
    if (min && max) {
        return `₹${(min / 100000).toFixed(1)}L - ${(max / 100000).toFixed(1)}L`;
    }
    if (min)
        return `From ₹${(min / 100000).toFixed(1)}L`;
    if (max)
        return `Up to ₹${(max / 100000).toFixed(1)}L`;
    return 'Not disclosed';
};
exports.formatSalaryRange = formatSalaryRange;
/**
 * Formats experience requirements for display.
 */
const formatExperienceRange = (min, max) => {
    if (min === 0 && max === 0)
        return 'Fresher';
    if (min === max) {
        if (min === 0)
            return 'Fresher';
        return `${min} year${min !== 1 ? 's' : ''}`;
    }
    if (max >= 50)
        return `${min}+ years`;
    return `${min}-${max} years`;
};
exports.formatExperienceRange = formatExperienceRange;
/**
 * Standard date formatting for the platform (e.g., Nov 24, 2026).
 */
const formatDisplayDate = (dateStr) => {
    if (!dateStr)
        return 'TBA';
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime()))
        return 'TBA';
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};
exports.formatDisplayDate = formatDisplayDate;
/**
 * Normalizes a time range (e.g., "10.00-18.00") into a standard 12-hour display format.
 */
function formatTimeText12Hour(input) {
    if (!input)
        return '';
    const trimmed = input.trim();
    if (!trimmed)
        return '';
    const to12HourPart = (value) => {
        const normalized = value.trim().replace(/\./g, ':').replace(/\s+/g, ' ');
        const match = normalized.match(/^(\d{1,2})(?::([0-5]\d))?\s*([AaPp][Mm])?$/);
        if (!match)
            return value.trim();
        const rawHour = Number(match[1]);
        const rawMinute = match[2] ?? '00';
        const ampm = match[3]?.toUpperCase();
        if (ampm) {
            const hour = rawHour % 12 || 12;
            return `${hour}:${rawMinute} ${ampm}`;
        }
        if (rawHour > 23)
            return value.trim();
        const hour12 = rawHour % 12 || 12;
        const suffix = rawHour >= 12 ? 'PM' : 'AM';
        return `${hour12}:${rawMinute} ${suffix}`;
    };
    const rangeMatch = trimmed.match(/^(.*?)(?:\s*(?:-|–|to)\s*)(.*?)$/i);
    if (!rangeMatch)
        return to12HourPart(trimmed);
    return `${to12HourPart(rangeMatch[1])} - ${to12HourPart(rangeMatch[2])}`;
}
/**
 * Normalizes an array of locations into a human-friendly display label.
 * Prioritizes PAN India drive status.
 */
function parseOpportunityLocation(locations) {
    if (!locations || locations.length === 0) {
        return { shortLabel: 'Remote', fullLabel: 'Remote / Work from Home', city: 'Remote' };
    }
    const first = locations[0];
    const cityCount = locations.length;
    if (cityCount === 1) {
        return { shortLabel: first, fullLabel: first, city: first };
    }
    if (cityCount > 3) {
        return { shortLabel: `${first} +${cityCount - 1} cities`, fullLabel: locations.join(', '), city: first };
    }
    return { shortLabel: locations.join(', '), fullLabel: locations.join(', '), city: first };
}
/**
 * Legacy Alias: Formats opportunity salary for display.
 */
const getOpportunityDisplaySalary = (item) => {
    return (0, exports.formatSalaryRange)(item.salary);
};
exports.getOpportunityDisplaySalary = getOpportunityDisplaySalary;
function getListingState(opportunity) {
    if (opportunity.status && opportunity.status !== 'PUBLISHED')
        return 'INACTIVE';
    if (isExpired(opportunity))
        return 'EXPIRED';
    if (isClosingSoon(opportunity))
        return 'CLOSING_SOON';
    return 'ACTIVE';
}
function formatDeadline(opportunity) {
    if (!opportunity.expiresAt)
        return null;
    return new Date(opportunity.expiresAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}
function getEducationDetails(degrees, courses, specializations = []) {
    const level = Array.from(new Set((degrees || []).map(formatEducationLevel).filter(Boolean))).join(', ') || 'Any Graduate';
    const courseList = Array.from(new Set((courses || []).map((item) => item.trim()).filter(Boolean)));
    const specializationList = Array.from(new Set((specializations || []).map((item) => item.trim()).filter(Boolean)));
    return {
        level,
        courses: courseList.length ? courseList.join(', ') : null,
        specializations: specializationList.length ? specializationList.join(', ') : null,
    };
}
function buildEligibilitySnapshot(opportunity, profile) {
    if (!profile) {
        return {
            statusLabel: 'Complete Profile',
            statusTone: 'neutral',
            mustFix: ['Add your education details to check eligibility for this role.'],
            matchedSkills: [],
            missingSkills: (opportunity.requiredSkills || []).slice(0, 8),
        };
    }
    const mustFix = [];
    const allowedYears = opportunity.allowedPassoutYears || [];
    if (allowedYears.length > 0) {
        const hasMatchingGradYear = profile.gradYear && allowedYears.includes(profile.gradYear);
        const hasMatchingPgYear = profile.pgYear && allowedYears.includes(profile.pgYear);
        if (!profile.gradYear && !profile.pgYear) {
            mustFix.push('Passout year is missing in your profile');
        }
        else if (!hasMatchingGradYear && !hasMatchingPgYear) {
            mustFix.push(`Passout year does not match (${allowedYears.join(', ')})`);
        }
    }
    const levels = ['DIPLOMA', 'DEGREE', 'PG'];
    const allowedDegrees = opportunity.allowedDegrees || [];
    if (allowedDegrees.length > 0) {
        if (!profile.educationLevel) {
            mustFix.push('Education level is missing in your profile');
        }
        else {
            const userLevelIndex = levels.indexOf(profile.educationLevel);
            const levelMatch = allowedDegrees.some((degree) => {
                const degreeIndex = levels.indexOf(degree);
                return degreeIndex !== -1 && degreeIndex <= userLevelIndex;
            });
            if (!levelMatch)
                mustFix.push('Education level does not meet this role');
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
    const allowedSpecializations = opportunity.allowedSpecializations || [];
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
function getRelatedOpportunities(opportunity, opportunities) {
    const currentSkillSet = new Set((opportunity.requiredSkills || []).map((skill) => skill.toLowerCase()));
    const currentLocations = new Set((opportunity.locations || []).map((location) => location.toLowerCase()));
    return (opportunities || [])
        .filter((item) => item.id !== opportunity.id)
        .filter((item) => !item.expiresAt || new Date(item.expiresAt) > new Date())
        .map((item) => {
        let score = 0;
        if (item.company === opportunity.company)
            score += 5;
        const itemLocations = (item.locations || []).map((location) => location.toLowerCase());
        if (itemLocations.some((location) => currentLocations.has(location)))
            score += 3;
        const itemSkills = (item.requiredSkills || []).map((skill) => skill.toLowerCase());
        const sharedSkills = itemSkills.filter((skill) => currentSkillSet.has(skill)).length;
        score += Math.min(sharedSkills, 4);
        if (item.workMode && item.workMode === opportunity.workMode)
            score += 1;
        return { item, score };
    })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item);
}
function sortTimelineEvents(events = []) {
    return (events || [])
        .map((event) => ({ ...event, _dt: new Date(event.eventDate) }))
        .sort((a, b) => a._dt.getTime() - b._dt.getTime());
}
function formatLpaValue(value) {
    return /\bLPA\b/i.test(value) ? value : `${value} LPA`;
}
function isExpired(opportunity) {
    if (!opportunity.expiresAt)
        return false;
    return new Date(opportunity.expiresAt) < new Date();
}
function isClosingSoon(opportunity) {
    if (!opportunity.expiresAt)
        return false;
    const expiryDate = new Date(opportunity.expiresAt);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiryDate >= now && expiryDate <= threeDaysFromNow;
}
function formatEducationLevel(degree) {
    switch (degree) {
        case 'DIPLOMA': return 'Diploma';
        case 'DEGREE': return 'Any Graduate';
        case 'PG': return 'Postgraduate';
        default: return degree;
    }
}
function normalizeAcademic(value) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
const types_1 = require("@fresherflow/types");
function getCurrentActionType(opportunity) {
    if (!opportunity?.actions?.length)
        return null;
    const current = opportunity.actions[0].actionType;
    if (current === types_1.ActionType.PLANNING)
        return types_1.ActionType.PLANNED;
    if (current === types_1.ActionType.ATTENDED)
        return types_1.ActionType.INTERVIEWED;
    return current;
}
function getTrackerOptions(isWalkinFlow) {
    return [
        ...(isWalkinFlow ? [] : [{ key: types_1.ActionType.APPLIED, label: 'Applied' }]),
        { key: types_1.ActionType.PLANNED, label: 'Planned' },
        { key: types_1.ActionType.INTERVIEWED, label: isWalkinFlow ? 'Attended' : 'Interviewed' },
        { key: types_1.ActionType.SELECTED, label: 'Selected' },
    ];
}
function buildShareUrl(baseUrl, options) {
    try {
        const url = new URL(baseUrl);
        if (options.ref)
            url.searchParams.set('ref', options.ref);
        if (options.source)
            url.searchParams.set('source', options.source);
        if (options.platform)
            url.searchParams.set('utm_source', options.platform);
        if (options.medium)
            url.searchParams.set('utm_medium', options.medium);
        if (options.campaign)
            url.searchParams.set('utm_campaign', options.campaign);
        return url.toString();
    }
    catch {
        return baseUrl;
    }
}
