// Eligibility Rules - Deterministic & Explainable
// Every rule must have a clear reason

import { Opportunity, Profile, EducationLevel } from '@fresherflow/types';
import {
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeAcademicToken
} from '../../utils/academicNormalization';
import { normalizeSkillList } from '@fresherflow/constants';

export interface EligibilityRule {
    name: string;
    check: (opportunity: Opportunity, profile: Profile) => boolean;
    getReason: (opportunity: Opportunity, profile: Profile) => string;
}

/**
 * Degree Eligibility Rule
 * User's education level must be in allowed degrees
 */
export const degreeRule: EligibilityRule = {
    name: 'DEGREE_MATCH',
    check: (opp, profile) => {
        // If no degrees or courses specified, it's open to all
        const hasLevelRestrictions = !!(opp.allowedDegrees && opp.allowedDegrees.length > 0);
        const hasCourseRestrictions = !!((opp as any).allowedCourses && (opp as any).allowedCourses.length > 0);
        const hasSpecializationRestrictions = !!((opp as any).allowedSpecializations && (opp as any).allowedSpecializations.length > 0);

        if (!hasLevelRestrictions && !hasCourseRestrictions && !hasSpecializationRestrictions) return true;
        if (!profile.educationLevel) return false;

        // 1. Course restrictions are strict when provided.
        if (hasCourseRestrictions) {
            const allowedCourses = ((opp as any).allowedCourses as string[]).map((course) => normalizeAcademicToken(normalizeCourseName(course)));
            const userCourse = normalizeAcademicToken(normalizeCourseName(profile.gradCourse));
            const userPGCourse = normalizeAcademicToken(normalizeCourseName(profile.pgCourse));

            const courseMatch = (userCourse && allowedCourses.includes(userCourse)) ||
                (userPGCourse && allowedCourses.includes(userPGCourse));

            if (!courseMatch) return false;
        }

        // 2. Specialization restrictions are strict when provided.
        if (hasSpecializationRestrictions) {
            const allowedSpecializations = ((opp as any).allowedSpecializations as string[]).map((specialization) => normalizeAcademicToken(normalizeSpecializationName(specialization)));
            const userSpecialization = normalizeAcademicToken(normalizeSpecializationName(profile.gradSpecialization));
            const userPGSpecialization = normalizeAcademicToken(normalizeSpecializationName(profile.pgSpecialization));

            const specializationMatch = (userSpecialization && allowedSpecializations.includes(userSpecialization)) ||
                (userPGSpecialization && allowedSpecializations.includes(userPGSpecialization));

            if (!specializationMatch) return false;
        }

        // 3. Level restrictions are also strict when provided.
        if (hasLevelRestrictions) {
            const levels = ['DIPLOMA', 'DEGREE', 'PG'];
            const userLevelIndex = levels.indexOf(profile.educationLevel);

            const levelMatch = opp.allowedDegrees.some(deg => {
                const degIndex = levels.indexOf(deg);
                return degIndex !== -1 && degIndex <= userLevelIndex;
            });

            if (!levelMatch) return false;
        }

        // If every provided restriction passed, the user is eligible.
        return true;
    },
    getReason: (opp, profile) => {
        const hasCourses = (opp as any).allowedCourses && (opp as any).allowedCourses.length > 0;
        const hasSpecializations = (opp as any).allowedSpecializations && (opp as any).allowedSpecializations.length > 0;
        if (hasCourses) {
            return `This opportunity requires specific courses: ${(opp as any).allowedCourses.join(', ')}`;
        }
        if (hasSpecializations) {
            return `This opportunity requires specific specializations: ${(opp as any).allowedSpecializations.join(', ')}`;
        }
        return `Your education level (${profile.educationLevel}) is not in the allowed degrees: ${opp.allowedDegrees.join(', ')}`;
    }
};

/**
 * Passout Year Eligibility Rule
 * User's passout year must be in allowed years
 */
export const passoutYearRule: EligibilityRule = {
    name: 'PASSOUT_YEAR_MATCH',
    check: (opp, profile) => {
        // If no years specified, it's open to all freshers
        if (!opp.allowedPassoutYears || opp.allowedPassoutYears.length === 0) return true;

        // User is eligible if EITHER their graduation year or PG year matches
        return !!(
            (profile.gradYear && opp.allowedPassoutYears.includes(profile.gradYear)) ||
            (profile.pgYear && opp.allowedPassoutYears.includes(profile.pgYear))
        );
    },
    getReason: (opp, profile) => {
        const passoutYear = profile.pgYear || profile.gradYear;
        return `Your passout year (${passoutYear}) is not in the allowed years: ${opp.allowedPassoutYears.join(', ')}`;
    }
};

/**
 * Skills Preference Rule (Soft)
 * Skills improve ranking relevance but should not block fresher eligibility
 */
export const skillsRule: EligibilityRule = {
    name: 'SKILLS_MATCH',
    check: (opp, profile) => {
        if (!opp.requiredSkills || opp.requiredSkills.length === 0) {
            return true; // No skills required
        }

        const userSkills = normalizeSkillList(profile.skills || []);
        const requiredSkills = normalizeSkillList(opp.requiredSkills || []);

        return requiredSkills.some((req: string) => userSkills.includes(req));
    },
    getReason: (opp, profile) => {
        return `You need at least one of these skills: ${opp.requiredSkills.join(', ')}. Your skills: ${profile.skills?.join(', ') || 'None'}`;
    }
};

/**
 * Location Preference Rule
 * Opportunity location should be in user's preferred cities
 */
export const locationRule: EligibilityRule = {
    name: 'LOCATION_MATCH',
    check: (opp, profile) => {
        if (!profile.preferredCities || profile.preferredCities.length === 0) {
            return true; // No preference set
        }

        const userCities = profile.preferredCities.map((c: string) => c.toLowerCase());
        const oppLocations = opp.locations.map((l: string) => l.toLowerCase());

        return oppLocations.some((loc: string) => userCities.includes(loc));
    },
    getReason: (opp, profile) => {
        return `Opportunity locations (${opp.locations.join(', ')}) don't match your preferred cities: ${profile.preferredCities?.join(', ') || 'None'}`;
    }
};

/**
 * Work Mode Preference Rule (Soft Rule - Warning Only)
 * Opportunity work mode should match user's preferred work modes
 */
export const workModeRule: EligibilityRule = {
    name: 'WORK_MODE_MATCH',
    check: (opp, profile) => {
        if (!opp.workMode || !profile.workModes || profile.workModes.length === 0) {
            return true; // No restriction
        }

        return profile.workModes.includes(opp.workMode);
    },
    getReason: (opp, profile) => {
        return `Work mode (${opp.workMode}) doesn't match your preferences: ${profile.workModes?.join(', ') || 'None'}`;
    }
};

/**
 * All Hard Rules (Must Pass)
 * These are non-negotiable eligibility criteria
 */
export const HARD_RULES: EligibilityRule[] = [
    degreeRule,
    passoutYearRule,
];

/**
 * All Soft Rules (Warnings)
 * These are preferences but not blockers
 */
export const SOFT_RULES: EligibilityRule[] = [
    skillsRule,
    locationRule,
    workModeRule,
];

/**
 * All Rules Combined
 */
export const ALL_RULES: EligibilityRule[] = [
    ...HARD_RULES,
    ...SOFT_RULES,
];

