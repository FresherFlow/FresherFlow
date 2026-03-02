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

export function calculateOpportunityMatch(profile: Profile | null | undefined, opportunity: Opportunity): MatchResult {
    if (!profile) {
        return { score: 0, reason: 'Complete profile for match score' };
    }

    // Hard eligibility gates
    const hasYearRestrictions = opportunity.allowedPassoutYears && opportunity.allowedPassoutYears.length > 0;
    const userYear = profile.gradYear || profile.pgYear;
    if (hasYearRestrictions && (!userYear || !opportunity.allowedPassoutYears!.includes(userYear))) {
        return { score: 0, reason: 'Not eligible (Batch mismatch)' };
    }

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

        if (hasCourseRestrictions) {
            const userGradCourse = profile.gradCourse ? normalizeAcademic(profile.gradCourse) : '';
            const userPgCourse = profile.pgCourse ? normalizeAcademic(profile.pgCourse) : '';
            const allowedCoursesNorm = allowedCourses.map(normalizeAcademic);
            const courseMatch = (userGradCourse && allowedCoursesNorm.includes(userGradCourse))
                || (userPgCourse && allowedCoursesNorm.includes(userPgCourse));

            if (!courseMatch) {
                return { score: 0, reason: 'Not eligible (Degree mismatch)' };
            }
        }

        if (hasSpecializationRestrictions) {
            const userGradSpec = profile.gradSpecialization ? normalizeAcademic(profile.gradSpecialization) : '';
            const userPgSpec = profile.pgSpecialization ? normalizeAcademic(profile.pgSpecialization) : '';
            const allowedSpecNorm = allowedSpecializations.map(normalizeAcademic);
            const specMatch = (userGradSpec && allowedSpecNorm.includes(userGradSpec))
                || (userPgSpec && allowedSpecNorm.includes(userPgSpec));

            if (!specMatch) {
                return { score: 0, reason: 'Not eligible (Specialization mismatch)' };
            }
        }

        if (hasLevelRestrictions) {
            const levels = ['DIPLOMA', 'DEGREE', 'PG'];
            const userLevelIndex = levels.indexOf(profile.educationLevel);
            const levelMatch = allowedDegrees.some((deg) => {
                const degIndex = levels.indexOf(deg as string);
                return degIndex !== -1 && degIndex <= userLevelIndex;
            });

            if (!levelMatch) {
                return { score: 0, reason: 'Not eligible (Level mismatch)' };
            }
        }
    }

    // Eligibility passed: show numeric score only for real skill overlap.
    const profileSkills = toSet(profile.skills || []);
    const requiredSkills = toSet(opportunity.requiredSkills || []);
    if (requiredSkills.size === 0 || profileSkills.size === 0) {
        return { score: 0, reason: 'Eligible' };
    }

    let matchedSkills = 0;
    requiredSkills.forEach((skill) => {
        if (profileSkills.has(skill)) matchedSkills += 1;
    });

    if (matchedSkills === 0) {
        return { score: 0, reason: 'Eligible' };
    }

    const skillsRatio = matchedSkills / requiredSkills.size;
    const score = Math.max(1, Math.min(100, Math.round(skillsRatio * 100)));

    return {
        score,
        reason: `${matchedSkills} matching skill${matchedSkills > 1 ? 's' : ''}`,
    };
}

/**
 * Returns true if the opportunity was explicitly marked as not eligible for this user.
 * Use this as a sort key to push not-eligible items to the bottom of any list.
 */
export function isNotEligible(opp: { matchScore?: number; matchReason?: string }): boolean {
    return opp.matchScore === 0 && (opp.matchReason?.includes('Not eligible') ?? false);
}
