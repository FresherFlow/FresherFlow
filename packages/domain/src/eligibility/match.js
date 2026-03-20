"use strict";
// Eligibility Matching Engine
// Deterministic, explainable, logged
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEligibility = checkEligibility;
exports.filterOpportunitiesForUserWithReasons = filterOpportunitiesForUserWithReasons;
exports.filterOpportunitiesForUser = filterOpportunitiesForUser;
exports.sortOpportunitiesWithWalkinsFirst = sortOpportunitiesWithWalkinsFirst;
exports.rankOpportunitiesForUser = rankOpportunitiesForUser;
exports.filterAndRankOpportunitiesForUser = filterAndRankOpportunitiesForUser;
exports.sortOpportunitiesForUser = sortOpportunitiesForUser;
exports.calculateOpportunityMatch = calculateOpportunityMatch;
exports.isNotEligible = isNotEligible;
const rules_1 = require("./rules");
const constants_1 = require("@fresherflow/constants");
const academic_normalization_1 = require("./academic-normalization");
const SHOULD_LOG_ELIGIBILITY_CHECKS = typeof process !== 'undefined' && process.env.LOG_ELIGIBILITY_CHECKS === 'true';
/**
 * Check if user is eligible for an opportunity
 * Deterministic - same input always produces same output
 * Explainable - returns specific reason for ineligibility
 * Logged - all checks are logged for audit
 */
function checkEligibility(opportunity, profile, userId) {
    const matchedRules = [];
    const failedRules = [];
    const warnings = [];
    let eligible = true;
    let reason;
    // Check all hard rules
    for (const rule of rules_1.HARD_RULES) {
        const passed = rule.check(opportunity, profile);
        if (passed) {
            matchedRules.push(rule.name);
        }
        else {
            failedRules.push(rule.name);
            eligible = false;
            reason = rule.getReason(opportunity, profile);
            // Log ineligibility
            if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                console.debug('Eligibility check failed', {
                    userId,
                    opportunityId: opportunity.id,
                    rule: rule.name,
                    reason
                });
            }
            break; // Stop at first hard rule failure
        }
    }
    // Check soft rules (only if hard rules passed)
    if (eligible) {
        for (const rule of rules_1.SOFT_RULES) {
            const passed = rule.check(opportunity, profile);
            if (passed) {
                matchedRules.push(rule.name);
            }
            else {
                const warning = rule.getReason(opportunity, profile);
                warnings.push(warning);
                // Log warning
                if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                    console.debug('Soft rule warning', {
                        userId,
                        opportunityId: opportunity.id,
                        rule: rule.name,
                        warning
                    });
                }
            }
        }
    }
    // Log successful match
    if (eligible) {
        if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
            console.debug('Eligibility check passed', {
                userId,
                opportunityId: opportunity.id,
                matchedRules,
                warnings: warnings.length
            });
        }
    }
    return {
        eligible,
        reason,
        warnings: warnings.length > 0 ? warnings : undefined,
        matchedRules,
        failedRules
    };
}
/**
 * Filter opportunities for a user
 * Returns only eligible opportunities with eligibility metadata
 */
function filterOpportunitiesForUserWithReasons(opportunities, profile, userId) {
    return opportunities
        .map(opp => ({
        ...opp,
        eligibility: checkEligibility(opp, profile, userId)
    }))
        .filter(opp => opp.eligibility.eligible);
}
/**
 * Legacy compatibility - returns just opportunities
 */
function filterOpportunitiesForUser(opportunities, profile) {
    return opportunities.filter(opp => checkEligibility(opp, profile).eligible);
}
/**
 * Sort opportunities with walk-ins pinned at top
 */
function sortOpportunitiesWithWalkinsFirst(opportunities) {
    return [...opportunities].sort((a, b) => {
        // Walk-ins first
        if (a.type === 'WALKIN' && b.type !== 'WALKIN')
            return -1;
        if (a.type !== 'WALKIN' && b.type === 'WALKIN')
            return 1;
        // Then by posted date (newest first)
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
}
function isLikelyFresher(profile) {
    const baseYear = profile.pgYear || profile.gradYear;
    if (!baseYear)
        return false;
    const currentYear = new Date().getFullYear();
    return (currentYear - baseYear) <= 1;
}
function getProfileStrength(profile) {
    const completion = Math.max(0, Math.min(100, profile.completionPercentage || 0)) / 100;
    const skillsCount = Math.min(1, (profile.skills?.length || 0) / 8);
    const preferenceDepth = Math.min(1, ((profile.preferredCities?.length || 0) + (profile.workModes?.length || 0) + (profile.interestedIn?.length || 0)) / 9);
    // Completion remains primary; skills and preferences refine personalization confidence.
    return (completion * 0.6) + (skillsCount * 0.25) + (preferenceDepth * 0.15);
}
function getExperienceRelevance(opportunity, fresher) {
    const minExp = Math.max(0, opportunity.experienceMin ?? 0);
    if (!fresher) {
        // For non-fresher users keep experience neutral, but still nudge lower-exp roles slightly up.
        return Math.max(0.5, 1 - (minExp * 0.08));
    }
    // Fresher-first ordering:
    // 0 yrs => strongest relevance, 1 yr => medium, 2+ => demoted to bottom.
    if (minExp <= 0)
        return 1;
    if (minExp === 1)
        return 0.6;
    if (minExp === 2)
        return 0.2;
    return 0;
}
function getSkillOverlapScore(opportunity, profile) {
    if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0)
        return 1;
    const userSkills = new Set((0, constants_1.normalizeSkillList)(profile.skills || []));
    if (userSkills.size === 0)
        return 0;
    const required = (0, constants_1.normalizeSkillList)(opportunity.requiredSkills || []);
    const matches = required.filter((skill) => userSkills.has(skill)).length;
    return matches / required.length;
}
function getPassoutExactness(opportunity, profile) {
    const years = opportunity.allowedPassoutYears || [];
    if (years.length === 0)
        return 0.7;
    const userYear = profile.pgYear || profile.gradYear;
    if (!userYear)
        return 0;
    return years.includes(userYear) ? 1 : 0;
}
function getEducationLevelScore(opportunity, profile) {
    const allowed = opportunity.allowedDegrees || [];
    if (allowed.length === 0)
        return 1;
    if (!profile.educationLevel)
        return 0;
    if (allowed.includes(profile.educationLevel))
        return 1;
    // Higher education should still partially match lower requirement buckets.
    const hierarchy = ['DIPLOMA', 'DEGREE', 'PG'];
    const userLevel = hierarchy.indexOf(profile.educationLevel);
    const hasLowerAllowed = allowed.some((deg) => hierarchy.indexOf(deg) <= userLevel);
    return hasLowerAllowed ? 0.6 : 0;
}
function getCourseMatchScore(opportunity, profile) {
    const allowed = (opportunity.allowedCourses || []).map((c) => (0, academic_normalization_1.normalizeAcademicToken)((0, academic_normalization_1.normalizeCourseName)(c)));
    if (allowed.length === 0)
        return 1;
    const userCourses = [profile.gradCourse, profile.pgCourse]
        .filter(Boolean)
        .map((c) => (0, academic_normalization_1.normalizeAcademicToken)((0, academic_normalization_1.normalizeCourseName)(c)));
    if (userCourses.length === 0)
        return 0;
    return userCourses.some((course) => allowed.includes(course)) ? 1 : 0;
}
function getSpecializationMatchScore(opportunity, profile) {
    const allowed = (opportunity.allowedSpecializations || []).map((s) => (0, academic_normalization_1.normalizeAcademicToken)((0, academic_normalization_1.normalizeSpecializationName)(s)));
    if (allowed.length === 0)
        return 1;
    const userSpecializations = [profile.gradSpecialization, profile.pgSpecialization]
        .filter(Boolean)
        .map((s) => (0, academic_normalization_1.normalizeAcademicToken)((0, academic_normalization_1.normalizeSpecializationName)(s)));
    if (userSpecializations.length === 0)
        return 0;
    return userSpecializations.some((specialization) => allowed.includes(specialization)) ? 1 : 0;
}
function getLocationPreferenceScore(opportunity, profile) {
    const preferredCities = (profile.preferredCities || []).map((c) => c.toLowerCase());
    if (preferredCities.length === 0)
        return 0.7;
    const oppLocations = (opportunity.locations || []).map((l) => l.toLowerCase());
    return oppLocations.some((loc) => preferredCities.includes(loc)) ? 1 : 0;
}
function getWorkModeScore(opportunity, profile) {
    const preferred = profile.workModes || [];
    if (preferred.length === 0)
        return 0.7;
    if (!opportunity.workMode)
        return 0.6;
    return preferred.includes(opportunity.workMode) ? 1 : 0;
}
function getFreshnessBoost(opportunity) {
    const postedAt = new Date(opportunity.postedAt).getTime();
    const now = Date.now();
    const ageInDays = (now - postedAt) / (24 * 60 * 60 * 1000);
    if (ageInDays <= 1)
        return 1;
    if (ageInDays <= 3)
        return 0.85;
    if (ageInDays <= 7)
        return 0.6;
    if (ageInDays <= 14)
        return 0.3;
    return 0.1;
}
function getUrgencyBoost(opportunity) {
    if (!opportunity.expiresAt)
        return 0.15;
    const expiry = new Date(opportunity.expiresAt).getTime();
    const now = Date.now();
    const remainingInDays = (expiry - now) / (24 * 60 * 60 * 1000);
    if (remainingInDays < 0)
        return 0;
    if (remainingInDays <= 1)
        return 1;
    if (remainingInDays <= 3)
        return 0.85;
    if (remainingInDays <= 7)
        return 0.6;
    if (remainingInDays <= 14)
        return 0.35;
    return 0.15;
}
function computeRelevanceBreakdown(opportunity, profile) {
    const fresher = isLikelyFresher(profile);
    const profileStrength = getProfileStrength(profile);
    // Academic fit is primary for fresher matching; skills/location are secondary refinements.
    const experienceWeight = 18 + Math.round(profileStrength * 6);
    const passoutWeight = 14 + Math.round(profileStrength * 4);
    const educationWeight = 12 + Math.round(profileStrength * 4);
    const courseWeight = 10 + Math.round(profileStrength * 3);
    const specializationWeight = 10 + Math.round(profileStrength * 3);
    const skillsWeight = 8 + Math.round(profileStrength * 4);
    const locationWeight = 5 + Math.round(profileStrength * 2);
    const workModeWeight = 3 + Math.round(profileStrength * 2);
    const freshnessWeight = 4 + Math.round((1 - profileStrength) * 3);
    const urgencyWeight = 4 + Math.round((1 - profileStrength) * 5);
    return {
        experience: Math.round(getExperienceRelevance(opportunity, fresher) * experienceWeight),
        skills: Math.round(getSkillOverlapScore(opportunity, profile) * skillsWeight),
        passoutYear: Math.round(getPassoutExactness(opportunity, profile) * passoutWeight),
        educationLevel: Math.round(getEducationLevelScore(opportunity, profile) * educationWeight),
        course: Math.round(getCourseMatchScore(opportunity, profile) * courseWeight),
        specialization: Math.round(getSpecializationMatchScore(opportunity, profile) * specializationWeight),
        location: Math.round(getLocationPreferenceScore(opportunity, profile) * locationWeight),
        workMode: Math.round(getWorkModeScore(opportunity, profile) * workModeWeight),
        freshness: Math.round(getFreshnessBoost(opportunity) * freshnessWeight),
        urgency: Math.round(getUrgencyBoost(opportunity) * urgencyWeight),
    };
}
function rankOpportunitiesForUser(opportunities, profile) {
    const fresher = isLikelyFresher(profile);
    return [...opportunities]
        .map((opportunity) => {
        const breakdown = computeRelevanceBreakdown(opportunity, profile);
        const score = Object.values(breakdown).reduce((acc, val) => acc + val, 0);
        return { opportunity, score, breakdown };
    })
        .sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // Additional fresher bias when scores tie: lower min experience first.
        if (fresher) {
            const aExp = a.opportunity.experienceMin ?? 0;
            const bExp = b.opportunity.experienceMin ?? 0;
            if (aExp !== bExp)
                return aExp - bExp;
        }
        // Then urgency (sooner expiry first) and recency fallback.
        const aExpiry = a.opportunity.expiresAt ? new Date(a.opportunity.expiresAt).getTime() : Number.POSITIVE_INFINITY;
        const bExpiry = b.opportunity.expiresAt ? new Date(b.opportunity.expiresAt).getTime() : Number.POSITIVE_INFINITY;
        if (aExpiry !== bExpiry)
            return aExpiry - bExpiry;
        return new Date(b.opportunity.postedAt).getTime() - new Date(a.opportunity.postedAt).getTime();
    });
}
function filterAndRankOpportunitiesForUser(opportunities, profile, userId) {
    const eligibleOpportunities = [];
    for (const opportunity of opportunities) {
        if (checkEligibility(opportunity, profile, userId).eligible) {
            eligibleOpportunities.push(opportunity);
        }
    }
    return rankOpportunitiesForUser(eligibleOpportunities, profile);
}
// Personalized relevance ranking.
// Keeps only eligible opportunities (done by caller), then orders to show
// fresher-friendly and high-signal jobs first while keeping all results visible.
function sortOpportunitiesForUser(opportunities, profile) {
    return rankOpportunitiesForUser(opportunities, profile).map((item) => item.opportunity);
}
/**
 * Calculates a match score and summary breakdown for a profile and opportunity.
 */
function calculateOpportunityMatch(profile, opportunity) {
    if (!profile)
        return { score: 0, reason: 'Complete profile to see fit' };
    const breakdown = computeRelevanceBreakdown(opportunity, profile);
    const score = Object.values(breakdown).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
    return { score, reason: 'Personalized Match' };
}
/**
 * Checks if an opportunity is explicitly marked ineligible.
 */
function isNotEligible(opportunity) {
    return opportunity.eligibility?.eligible === false;
}
