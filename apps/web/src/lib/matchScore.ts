import type { Opportunity, Profile } from '@fresherflow/types';

type MatchResult = {
    score: number;
    reason: string;
};

type OpportunityAcademicConstraints = {
    allowedCourses?: string[];
    allowedSpecializations?: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();
const normalizeAcademic = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const toSet = (values: string[]) => new Set(values.map(normalize).filter(Boolean));

// Partial city match: "Hyderabad" matches "Hyderabad, Telangana"
function cityMatches(profileCities: Set<string>, jobLocations: string[]): boolean {
    for (const loc of jobLocations) {
        const locNorm = normalize(loc);
        for (const city of profileCities) {
            if (locNorm.includes(city) || city.includes(locNorm)) return true;
        }
    }
    return false;
}

export function calculateOpportunityMatch(profile: Profile | null | undefined, opportunity: Opportunity): MatchResult {
    if (!profile) {
        return { score: 0, reason: 'Complete profile for match score' };
    }

    // --- Hard Eligibility Gates ---
    // 1. Passout Year
    const hasYearRestrictions = opportunity.allowedPassoutYears && opportunity.allowedPassoutYears.length > 0;
    const userYear = profile.gradYear || profile.pgYear;
    if (hasYearRestrictions) {
        if (!userYear || !opportunity.allowedPassoutYears!.includes(userYear)) {
            return { score: 0, reason: 'Not eligible (Batch mismatch)' };
        }
    }

    // 2. Education Level & Course / Specialization
    const allowedDegrees = opportunity.allowedDegrees || [];
    const typedOpportunity = opportunity as OpportunityAcademicConstraints & Opportunity;
    const allowedCourses = typedOpportunity.allowedCourses || [];
    const allowedSpecializations = typedOpportunity.allowedSpecializations || [];

    const hasLevelRestrictions = allowedDegrees.length > 0;
    const hasCourseRestrictions = allowedCourses.length > 0;
    const hasSpecializationRestrictions = allowedSpecializations.length > 0;

    if (hasLevelRestrictions || hasCourseRestrictions || hasSpecializationRestrictions) {
        if (!profile.educationLevel) {
            return { score: 0, reason: 'Not eligible (Education missing)' };
        }

        // Strict Course Match
        if (hasCourseRestrictions) {
            const userGradCourse = profile.gradCourse ? normalizeAcademic(profile.gradCourse) : '';
            const userPgCourse = profile.pgCourse ? normalizeAcademic(profile.pgCourse) : '';
            const allowedCoursesNorm = allowedCourses.map(normalizeAcademic);

            const courseMatch = (userGradCourse && allowedCoursesNorm.includes(userGradCourse)) ||
                (userPgCourse && allowedCoursesNorm.includes(userPgCourse));

            if (!courseMatch) {
                return { score: 0, reason: 'Not eligible (Degree mismatch)' };
            }
        }

        // Strict Specialization Match
        if (hasSpecializationRestrictions) {
            const userGradSpec = profile.gradSpecialization ? normalizeAcademic(profile.gradSpecialization) : '';
            const userPgSpec = profile.pgSpecialization ? normalizeAcademic(profile.pgSpecialization) : '';
            const allowedSpecNorm = allowedSpecializations.map(normalizeAcademic);

            const specMatch = (userGradSpec && allowedSpecNorm.includes(userGradSpec)) ||
                (userPgSpec && allowedSpecNorm.includes(userPgSpec));

            if (!specMatch) {
                return { score: 0, reason: 'Not eligible (Specialization mismatch)' };
            }
        }

        // Degree Level check
        if (hasLevelRestrictions) {
            const levels = ['DIPLOMA', 'DEGREE', 'PG'];
            const userLevelIndex = levels.indexOf(profile.educationLevel);
            const levelMatch = allowedDegrees.some(deg => {
                const degIndex = levels.indexOf(deg as string);
                return degIndex !== -1 && degIndex <= userLevelIndex;
            });

            if (!levelMatch) {
                return { score: 0, reason: 'Not eligible (Level mismatch)' };
            }
        }
    }

    let score = 0;
    let topReason = 'General fit';

    // --- Skills (up to 45 pts) ---
    const profileSkills = toSet(profile.skills || []);
    const requiredSkills = toSet(opportunity.requiredSkills || []);
    if (requiredSkills.size > 0 && profileSkills.size > 0) {
        let matchedSkills = 0;
        requiredSkills.forEach((skill) => {
            if (profileSkills.has(skill)) matchedSkills += 1;
        });
        const skillsRatio = matchedSkills / requiredSkills.size;
        score += skillsRatio * 45;
        if (matchedSkills > 0) topReason = `${matchedSkills} matching skill${matchedSkills > 1 ? 's' : ''}`;
    } else if (requiredSkills.size === 0) {
        // Job has no required skills listed — neutral, small boost
        score += 15;
    }

    // --- Eligibility (up to 30 pts) ---
    let eligibilityScore = 0;
    if (opportunity.allowedPassoutYears?.length) {
        const gradYear = profile.gradYear || profile.pgYear;
        if (gradYear && opportunity.allowedPassoutYears.includes(gradYear)) {
            eligibilityScore += 15;
            topReason = topReason === 'General fit' ? 'Eligible batch' : topReason;
        }
    } else {
        eligibilityScore += 7;
    }

    if (opportunity.experienceMax != null) {
        const expectedExperience = 0;
        if (expectedExperience >= (opportunity.experienceMin || 0) && expectedExperience <= opportunity.experienceMax) {
            eligibilityScore += 15;
        }
    } else {
        eligibilityScore += 8;
    }
    score += Math.min(30, eligibilityScore);

    // --- Location + Work Mode (up to 20 pts) ---
    let preferenceScore = 0;
    const preferredCities = toSet(profile.preferredCities || []);
    const jobLocations = opportunity.locations || [];

    if (preferredCities.size > 0) {
        if (cityMatches(preferredCities, jobLocations)) {
            preferenceScore += 15; // strong boost for city match
            topReason = topReason === 'General fit' ? 'Your preferred city' : topReason;
        } else if (jobLocations.length === 0) {
            preferenceScore += 5; // remote / no location specified
        }
        // No match and job has locations = 0 pts (deprioritize)
    } else {
        preferenceScore += 5;
    }

    if (opportunity.workMode && profile.workModes?.includes(opportunity.workMode)) {
        preferenceScore += 5;
    } else if (!opportunity.workMode) {
        preferenceScore += 2;
    }
    score += Math.min(20, preferenceScore);

    // --- Urgency bonus (up to 10 pts) ---
    if (opportunity.expiresAt) {
        const daysLeft = Math.ceil((new Date(opportunity.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        if (daysLeft > 0 && daysLeft <= 2) score += 10;
        else if (daysLeft > 2 && daysLeft <= 7) score += 5;
    }

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        reason: topReason,
    };
}

/**
 * Returns true if the opportunity was explicitly marked as not eligible for this user.
 * Use this as a sort key to push not-eligible items to the bottom of any list.
 */
export function isNotEligible(opp: { matchScore?: number; matchReason?: string }): boolean {
    return opp.matchScore === 0 && (opp.matchReason?.includes('Not eligible') ?? false);
}
