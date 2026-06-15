// Eligibility Rules - Deterministic & Explainable
// Every rule must have a clear reason

import { Opportunity, Profile } from '@fresherflow/types';
import {
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeAcademicToken
} from '@fresherflow/utils';
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
        const hasCourseRestrictions = !!(opp.allowedCourses && opp.allowedCourses.length > 0);
        const hasSpecializationRestrictions = !!(opp.allowedSpecializations && opp.allowedSpecializations.length > 0);

        if (!hasLevelRestrictions && !hasCourseRestrictions && !hasSpecializationRestrictions) return true;
        if (!profile.educationLevel) return false;

        // 1. Course restrictions are strict when provided.
        if (hasCourseRestrictions) {
            const allowedCourses = opp.allowedCourses.map((course) => normalizeAcademicToken(normalizeCourseName(course)));
            const userCourse = normalizeAcademicToken(normalizeCourseName(profile.gradCourse));
            const userPGCourse = normalizeAcademicToken(normalizeCourseName(profile.pgCourse));

            const courseMatch = (userCourse && allowedCourses.includes(userCourse)) ||
                (userPGCourse && allowedCourses.includes(userPGCourse));

            if (!courseMatch) return false;
        }

        // 2. Specialization restrictions are strict when provided.
        if (hasSpecializationRestrictions) {
            const allowedSpecializations = (opp.allowedSpecializations || []).map((specialization) => normalizeAcademicToken(normalizeSpecializationName(specialization)));
            const userSpecialization = normalizeAcademicToken(normalizeSpecializationName(profile.gradSpecialization));
            const userPGSpecialization = normalizeAcademicToken(normalizeSpecializationName(profile.pgSpecialization));

            const specializationMatch = (userSpecialization && allowedSpecializations.includes(userSpecialization)) ||
                (userPGSpecialization && allowedSpecializations.includes(userPGSpecialization));

            if (!specializationMatch) return false;
        }

        // 3. Level restrictions are also strict when provided.
        if (hasLevelRestrictions) {
            const levels = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'];
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
        const hasCourses = opp.allowedCourses && opp.allowedCourses.length > 0;
        const hasSpecializations = opp.allowedSpecializations && opp.allowedSpecializations.length > 0;
        if (hasCourses) {
            return `This opportunity requires specific courses: ${opp.allowedCourses.join(', ')}`;
        }
        if (hasSpecializations) {
            return `This opportunity requires specific specializations: ${(opp.allowedSpecializations || []).join(', ')}`;
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
        const oppLocations = (opp.locations || []).map((l: string) => l.toLowerCase());

        return oppLocations.some((loc: string) => userCities.includes(loc));
    },
    getReason: (opp, profile) => {
        return `Opportunity locations (${(opp.locations || []).join(', ')}) don't match your preferred cities: ${profile.preferredCities?.join(', ') || 'None'}`;
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
 * Age Eligibility Rule (Hard Rule)
 * Checks if candidate is within allowed age range, considering relaxation.
 */
export const ageRule: EligibilityRule = {
    name: 'AGE_MATCH',
    check: (opp, profile) => {
        const ageMin = opp.governmentJobDetails?.ageMin;
        const ageMax = opp.governmentJobDetails?.ageMax;

        // If no age restrictions, open to all
        if (ageMin === undefined && ageMax === undefined) return true;
        if (ageMin === null && ageMax === null) return true;

        if (!profile.dob) return false;

        const dob = new Date(profile.dob);
        if (isNaN(dob.getTime())) return false;

        let cutoffDate = new Date();
        const governmentDetails = opp.governmentJobDetails;
        if (governmentDetails?.notificationIssuedDate) {
            const d = new Date(governmentDetails.notificationIssuedDate);
            if (!isNaN(d.getTime())) {
                cutoffDate = d;
            }
        } else if (opp.postedAt) {
            const d = new Date(opp.postedAt);
            if (!isNaN(d.getTime())) {
                cutoffDate = d;
            }
        }

        let age = cutoffDate.getFullYear() - dob.getFullYear();
        const monthDiff = cutoffDate.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && cutoffDate.getDate() < dob.getDate())) {
            age--;
        }

        // Compute age relaxation
        let relaxation = 0;
        const rules = governmentDetails?.ageRelaxationRules;
        if (Array.isArray(rules) && rules.length > 0) {
            for (const rule of rules) {
                let isMatch = false;
                const cat = (rule.category || '').toUpperCase();
                if (cat.includes('OBC') && profile.category === 'OBC') isMatch = true;
                if ((cat.includes('SC') || cat.includes('ST')) && (profile.category === 'SC' || profile.category === 'ST')) isMatch = true;
                if (cat.includes('EWS') && profile.category === 'EWS') isMatch = true;
                if ((cat.includes('PWBD') || cat.includes('PH') || cat.includes('DISAB')) && profile.isPwBD) isMatch = true;
                if ((cat.includes('EX-SERVICEMEN') || cat.includes('EX SERVICEMEN') || cat.includes('EX-SERV') || cat.includes('EXSERV')) && profile.isExServicemen) isMatch = true;
                if ((cat.includes('WOMEN') || cat.includes('FEMALE')) && profile.gender === 'FEMALE') isMatch = true;

                if (isMatch) {
                    let years = 0;
                    if (typeof rule.years === 'number') {
                        years = rule.years;
                    } else if (typeof rule.relaxation === 'string') {
                        const match = rule.relaxation.match(/(\d+)/);
                        if (match) {
                            years = parseInt(match[1], 10);
                        }
                    } else if (typeof rule.relaxation === 'number') {
                        years = rule.relaxation;
                    } else if (typeof rule.years === 'string') {
                        const match = rule.years.match(/(\d+)/);
                        if (match) {
                            years = parseInt(match[1], 10);
                        }
                    }
                    if (years > relaxation) {
                        relaxation = years;
                    }
                }
            }
        } else {
            // Default fallback relaxations
            if (profile.category === 'OBC') relaxation += 3;
            else if (profile.category === 'SC' || profile.category === 'ST') relaxation += 5;
            if (profile.isPwBD) relaxation += 10;
            if (profile.isExServicemen) relaxation += 3;
            if (profile.gender === 'FEMALE') relaxation += 5;
        }

        if (ageMin !== undefined && ageMin !== null && age < ageMin) return false;
        if (ageMax !== undefined && ageMax !== null && age > (ageMax + relaxation)) return false;

        return true;
    },
    getReason: (opp, profile) => {
        const ageMin = opp.governmentJobDetails?.ageMin;
        const ageMax = opp.governmentJobDetails?.ageMax;

        if (!profile.dob) {
            return 'Date of birth is required to check age eligibility.';
        }

        const dob = new Date(profile.dob);
        let cutoffDate = new Date();
        const governmentDetails = opp.governmentJobDetails;
        if (governmentDetails?.notificationIssuedDate) {
            const d = new Date(governmentDetails.notificationIssuedDate);
            if (!isNaN(d.getTime())) {
                cutoffDate = d;
            }
        } else if (opp.postedAt) {
            const d = new Date(opp.postedAt);
            if (!isNaN(d.getTime())) {
                cutoffDate = d;
            }
        }

        let age = cutoffDate.getFullYear() - dob.getFullYear();
        const monthDiff = cutoffDate.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && cutoffDate.getDate() < dob.getDate())) {
            age--;
        }

        // Compute age relaxation
        let relaxation = 0;
        const rules = governmentDetails?.ageRelaxationRules;
        if (Array.isArray(rules) && rules.length > 0) {
            for (const rule of rules) {
                let isMatch = false;
                const cat = (rule.category || '').toUpperCase();
                if (cat.includes('OBC') && profile.category === 'OBC') isMatch = true;
                if ((cat.includes('SC') || cat.includes('ST')) && (profile.category === 'SC' || profile.category === 'ST')) isMatch = true;
                if (cat.includes('EWS') && profile.category === 'EWS') isMatch = true;
                if ((cat.includes('PWBD') || cat.includes('PH') || cat.includes('DISAB')) && profile.isPwBD) isMatch = true;
                if ((cat.includes('EX-SERVICEMEN') || cat.includes('EX SERVICEMEN') || cat.includes('EX-SERV') || cat.includes('EXSERV')) && profile.isExServicemen) isMatch = true;
                if ((cat.includes('WOMEN') || cat.includes('FEMALE')) && profile.gender === 'FEMALE') isMatch = true;

                if (isMatch) {
                    let years = 0;
                    if (typeof rule.years === 'number') {
                        years = rule.years;
                    } else if (typeof rule.relaxation === 'string') {
                        const match = rule.relaxation.match(/(\d+)/);
                        if (match) {
                            years = parseInt(match[1], 10);
                        }
                    } else if (typeof rule.relaxation === 'number') {
                        years = rule.relaxation;
                    } else if (typeof rule.years === 'string') {
                        const match = rule.years.match(/(\d+)/);
                        if (match) {
                            years = parseInt(match[1], 10);
                        }
                    }
                    if (years > relaxation) {
                        relaxation = years;
                    }
                }
            }
        } else {
            // Default fallback relaxations
            if (profile.category === 'OBC') relaxation += 3;
            else if (profile.category === 'SC' || profile.category === 'ST') relaxation += 5;
            if (profile.isPwBD) relaxation += 10;
            if (profile.isExServicemen) relaxation += 3;
            if (profile.gender === 'FEMALE') relaxation += 5;
        }

        if (ageMin !== undefined && ageMin !== null && age < ageMin) {
            return `Your age (${age}) is below the minimum required age of ${ageMin}.`;
        }
        if (ageMax !== undefined && ageMax !== null && age > (ageMax + relaxation)) {
            return `Your age (${age}) exceeds the maximum allowed age of ${ageMax} (with ${relaxation} years of relaxation applied).`;
        }
        return 'Age matches opportunity requirements.';
    }
};

/**
 * State Residency Eligibility Rule (Hard Rule)
 * Checks if candidate homeState matches the job locations for STATE government level.
 */
export const stateResidencyRule: EligibilityRule = {
    name: 'STATE_RESIDENCY_MATCH',
    check: (opp, profile) => {
        if (opp.governmentJobDetails?.governmentLevel !== 'STATE') {
            return true;
        }
        if (!profile.homeState) return false;

        const homeStateNormalized = profile.homeState.trim().toLowerCase();
        const locations = opp.locations || [];

        return locations.some(loc => {
            const locNormalized = loc.trim().toLowerCase();
            return locNormalized === homeStateNormalized || 
                   locNormalized.includes(homeStateNormalized) || 
                   homeStateNormalized.includes(locNormalized);
        });
    },
    getReason: (opp, profile) => {
        if (!profile.homeState) {
            return 'Home state is required to check state residency eligibility.';
        }
        return `This state-level opportunity is restricted to residents of: ${(opp.locations || []).join(', ')}. Your home state: ${profile.homeState}.`;
    }
};

/**
 * All Hard Rules (Must Pass)
 * These are non-negotiable eligibility criteria
 */
export const HARD_RULES: EligibilityRule[] = [
    degreeRule,
    passoutYearRule,
    ageRule,
    stateResidencyRule,
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

