// Eligibility Matching Engine
// Deterministic, explainable, logged

import { Opportunity, Profile } from '@fresherflow/types';
import { HARD_RULES, SOFT_RULES } from './rules';
import { logger } from '@fresherflow/logger';
import { normalizeSkillList } from '@fresherflow/constants';
import {
    normalizeAcademicToken,
    normalizeCourseName,
    normalizeSpecializationName
} from '@fresherflow/utils';

export interface EligibilityResult {
    eligible: boolean;
    reason?: string;
    warnings?: string[];
    matchedRules: string[];
    failedRules: string[];
}

const SHOULD_LOG_ELIGIBILITY_CHECKS = process.env.LOG_ELIGIBILITY_CHECKS === 'true';

/**
 * Check if user is eligible for an opportunity
 * Deterministic - same input always produces same output
 * Explainable - returns specific reason for ineligibility
 * Logged - all checks are logged for audit
 */
export function checkEligibility(
    opportunity: Opportunity,
    profile: Profile,
    userId?: string
): EligibilityResult {
    const matchedRules: string[] = [];
    const failedRules: string[] = [];
    const warnings: string[] = [];
    let eligible = true;
    let reason: string | undefined;

    // Check all hard rules
    for (const rule of HARD_RULES) {
        const passed = rule.check(opportunity, profile);

        if (passed) {
            matchedRules.push(rule.name);
        } else {
            failedRules.push(rule.name);
            eligible = false;
            reason = rule.getReason(opportunity, profile);

            // Log ineligibility
            if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                logger.debug('Eligibility check failed', {
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
        for (const rule of SOFT_RULES) {
            const passed = rule.check(opportunity, profile);

            if (passed) {
                matchedRules.push(rule.name);
            } else {
                const warning = rule.getReason(opportunity, profile);
                warnings.push(warning);

                // Log warning
                if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                    logger.debug('Soft rule warning', {
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
            logger.debug('Eligibility check passed', {
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
export function filterOpportunitiesForUserWithReasons(
    opportunities: Opportunity[],
    profile: Profile,
    userId?: string
): Array<Opportunity & { eligibility: EligibilityResult }> {
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
export function filterOpportunitiesForUser(
    opportunities: Opportunity[],
    profile: Profile
): Opportunity[] {
    return opportunities.filter(opp =>
        checkEligibility(opp, profile).eligible
    );
}

/**
 * Sort opportunities with walk-ins pinned at top
 */
export function sortOpportunitiesWithWalkinsFirst<T extends { type: string; postedAt: Date | string }>(opportunities: T[]): T[] {
    return [...opportunities].sort((a, b) => {
        // Walk-ins first
        if (a.type === 'WALKIN' && b.type !== 'WALKIN') return -1;
        if (a.type !== 'WALKIN' && b.type === 'WALKIN') return 1;

        // Then by posted date (newest first)
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
}

export interface RelevanceBreakdown {
    experience: number;
    skills: number;
    passoutYear: number;
    educationLevel: number;
    course: number;
    specialization: number;
    location: number;
    workMode: number;
    freshness: number;
    urgency: number;
}

export interface RankedOpportunity<T extends Opportunity> {
    opportunity: T;
    score: number;
    breakdown: RelevanceBreakdown;
}

function isLikelyFresher(profile: Profile): boolean {
    const baseYear = profile.pgYear || profile.gradYear;
    if (!baseYear) return false;
    const currentYear = new Date().getFullYear();
    return (currentYear - baseYear) <= 1;
}

function getProfileStrength(profile: Profile): number {
    const completion = Math.max(0, Math.min(100, profile.completionPercentage || 0)) / 100;
    const skillsCount = Math.min(1, (profile.skills?.length || 0) / 8);
    const preferenceDepth = Math.min(
        1,
        ((profile.preferredCities?.length || 0) + (profile.workModes?.length || 0) + (profile.interestedIn?.length || 0)) / 9
    );
    // Completion remains primary; skills and preferences refine personalization confidence.
    return (completion * 0.6) + (skillsCount * 0.25) + (preferenceDepth * 0.15);
}

function getExperienceRelevance(opportunity: Opportunity, fresher: boolean): number {
    const minExp = Math.max(0, opportunity.experienceMin ?? 0);
    if (!fresher) {
        // For non-fresher users keep experience neutral, but still nudge lower-exp roles slightly up.
        return Math.max(0.5, 1 - (minExp * 0.08));
    }

    // Fresher-first ordering:
    // 0 yrs => strongest relevance, 1 yr => medium, 2+ => demoted to bottom.
    if (minExp <= 0) return 1;
    if (minExp === 1) return 0.6;
    if (minExp === 2) return 0.2;
    return 0;
}

function getSkillOverlapScore(opportunity: Opportunity, profile: Profile): number {
    if (!opportunity.requiredSkills || opportunity.requiredSkills.length === 0) return 1;
    const userSkills = new Set(normalizeSkillList(profile.skills || []));
    if (userSkills.size === 0) return 0;

    const required = normalizeSkillList(opportunity.requiredSkills || []);
    const matches = required.filter((skill) => userSkills.has(skill)).length;
    return matches / required.length;
}

function getPassoutExactness(opportunity: Opportunity, profile: Profile): number {
    const years = opportunity.allowedPassoutYears || [];
    if (years.length === 0) return 0.7;
    const userYear = profile.pgYear || profile.gradYear;
    if (!userYear) return 0;
    return years.includes(userYear) ? 1 : 0;
}

function getEducationLevelScore(opportunity: Opportunity, profile: Profile): number {
    const allowed = opportunity.allowedDegrees || [];
    if (allowed.length === 0) return 1;
    if (!profile.educationLevel) return 0;

    if (allowed.includes(profile.educationLevel)) return 1;

    // Higher education should still partially match lower requirement buckets.
    const hierarchy = ['DIPLOMA', 'DEGREE', 'PG'];
    const userLevel = hierarchy.indexOf(profile.educationLevel);
    const hasLowerAllowed = allowed.some((deg) => hierarchy.indexOf(deg) <= userLevel);
    return hasLowerAllowed ? 0.6 : 0;
}

function getCourseMatchScore(opportunity: Opportunity, profile: Profile): number {
    const allowed = (opportunity.allowedCourses || []).map((c) => normalizeAcademicToken(normalizeCourseName(c)));
    if (allowed.length === 0) return 1;

    const userCourses = [profile.gradCourse, profile.pgCourse]
        .filter(Boolean)
        .map((c) => normalizeAcademicToken(normalizeCourseName(c as string)));

    if (userCourses.length === 0) return 0;
    return userCourses.some((course) => allowed.includes(course)) ? 1 : 0;
}

function getSpecializationMatchScore(opportunity: Opportunity, profile: Profile): number {
    const allowed = (opportunity.allowedSpecializations || []).map((s: string) => normalizeAcademicToken(normalizeSpecializationName(s)));
    if (allowed.length === 0) return 1;

    const userSpecializations = [profile.gradSpecialization, profile.pgSpecialization]
        .filter(Boolean)
        .map((s) => normalizeAcademicToken(normalizeSpecializationName(s as string)));

    if (userSpecializations.length === 0) return 0;
    return userSpecializations.some((specialization) => allowed.includes(specialization)) ? 1 : 0;
}

function getLocationPreferenceScore(opportunity: Opportunity, profile: Profile): number {
    const preferredCities = (profile.preferredCities || []).map((c: string) => c.toLowerCase());
    if (preferredCities.length === 0) return 0.7;
    const oppLocations = (opportunity.locations || []).map((l: string) => l.toLowerCase());
    return oppLocations.some((loc) => preferredCities.includes(loc)) ? 1 : 0;
}

function getWorkModeScore(opportunity: Opportunity, profile: Profile): number {
    const preferred = profile.workModes || [];
    if (preferred.length === 0) return 0.7;
    if (!opportunity.workMode) return 0.6;
    return preferred.includes(opportunity.workMode) ? 1 : 0;
}

function getFreshnessBoost(opportunity: Opportunity): number {
    const postedAt = new Date(opportunity.postedAt).getTime();
    const now = Date.now();
    const ageInDays = (now - postedAt) / (24 * 60 * 60 * 1000);
    if (ageInDays <= 1) return 1;
    if (ageInDays <= 3) return 0.85;
    if (ageInDays <= 7) return 0.6;
    if (ageInDays <= 14) return 0.3;
    return 0.1;
}

function getUrgencyBoost(opportunity: Opportunity): number {
    if (!opportunity.expiresAt) return 0.15;
    const expiry = new Date(opportunity.expiresAt).getTime();
    const now = Date.now();
    const remainingInDays = (expiry - now) / (24 * 60 * 60 * 1000);
    if (remainingInDays < 0) return 0;
    if (remainingInDays <= 1) return 1;
    if (remainingInDays <= 3) return 0.85;
    if (remainingInDays <= 7) return 0.6;
    if (remainingInDays <= 14) return 0.35;
    return 0.15;
}

function computeRelevanceBreakdown(opportunity: Opportunity, profile: Profile): RelevanceBreakdown {
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

export function rankOpportunitiesForUser<T extends Opportunity>(opportunities: T[], profile: Profile): RankedOpportunity<T>[] {
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
                if (aExp !== bExp) return aExp - bExp;
            }

            // Then urgency (sooner expiry first) and recency fallback.
            const aExpiry = a.opportunity.expiresAt ? new Date(a.opportunity.expiresAt).getTime() : Number.POSITIVE_INFINITY;
            const bExpiry = b.opportunity.expiresAt ? new Date(b.opportunity.expiresAt).getTime() : Number.POSITIVE_INFINITY;
            if (aExpiry !== bExpiry) return aExpiry - bExpiry;

            return new Date(b.opportunity.postedAt).getTime() - new Date(a.opportunity.postedAt).getTime();
        });
}

export function filterAndRankOpportunitiesForUser<T extends Opportunity>(
    opportunities: T[],
    profile: Profile,
    userId?: string
): RankedOpportunity<T>[] {
    const eligibleOpportunities: T[] = [];

    for (const opportunity of opportunities) {
        if (checkEligibility(opportunity, profile, userId).eligible) {
            eligibleOpportunities.push(opportunity);
        }
    }

    return rankOpportunitiesForUser(eligibleOpportunities, profile);
}

/**
 * Personalized relevance ranking.
 * Keeps only eligible opportunities (done by caller), then orders to show
 * fresher-friendly and high-signal jobs first while keeping all results visible.
 */
export function sortOpportunitiesForUser<T extends Opportunity>(opportunities: T[], profile: Profile): T[] {
    return rankOpportunitiesForUser(opportunities, profile).map((item) => item.opportunity);
}
