// Eligibility Matching Engine
// Deterministic, explainable, logged

import { Opportunity, Profile } from '@fresherflow/types';
import { HARD_RULES, SOFT_RULES } from './rules.js';

import { normalizeSkillList } from '@fresherflow/constants';

export interface EligibilityResult {
    eligible: boolean;
    reason?: string;
    warnings?: string[];
    matchedRules: string[];
    failedRules: string[];
}

const SHOULD_LOG_ELIGIBILITY_CHECKS = typeof process !== 'undefined' && process.env.LOG_ELIGIBILITY_CHECKS === 'true';

/**
 * Check if user is eligible for an opportunity
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

    for (const rule of HARD_RULES) {
        const passed = rule.check(opportunity, profile);
        if (passed) {
            matchedRules.push(rule.name);
        } else {
            failedRules.push(rule.name);
            eligible = false;
            reason = rule.getReason(opportunity, profile);
            if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                console.debug('Eligibility check failed', { userId, opportunityId: opportunity.id, rule: rule.name, reason });
            }
            break;
        }
    }

    if (eligible) {
        for (const rule of SOFT_RULES) {
            const passed = rule.check(opportunity, profile);
            if (passed) {
                matchedRules.push(rule.name);
            } else {
                const warning = rule.getReason(opportunity, profile);
                warnings.push(warning);
                if (SHOULD_LOG_ELIGIBILITY_CHECKS) {
                    console.debug('Soft rule warning', { userId, opportunityId: opportunity.id, rule: rule.name, warning });
                }
            }
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

export function filterOpportunitiesForUser(
    opportunities: Opportunity[],
    profile: Profile
): Opportunity[] {
    return opportunities.filter(opp =>
        checkEligibility(opp, profile).eligible
    );
}

export function sortOpportunitiesWithWalkinsFirst<T extends { type: string; postedAt: Date | string }>(opportunities: T[]): T[] {
    return [...opportunities].sort((a, b) => {
        if (a.type === 'WALKIN' && b.type !== 'WALKIN') return -1;
        if (a.type !== 'WALKIN' && b.type === 'WALKIN') return 1;
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

function getSkillOverlapScore(opportunity: Opportunity, profile: Profile): number {
    if (opportunity.requiredSkills && opportunity.requiredSkills.length === 0) return 1;
    if (!opportunity.requiredSkills || !profile.skills || profile.skills.length === 0) return 0;

    const userSkills = new Set(normalizeSkillList(profile.skills));
    const required = normalizeSkillList(opportunity.requiredSkills);
    const matches = required.filter((skill) => userSkills.has(skill)).length;
    return matches / required.length;
}

function getPreferenceMatchScore(opportunity: Opportunity, profile: Profile): number {
    const locationMatch = (opportunity.locations || []).some(loc => 
        (profile.preferredCities || []).some(city => city.toLowerCase().includes(loc.toLowerCase()))
    ) || opportunity.workMode === 'REMOTE' || opportunity.workMode === 'HYBRID';

    const typeMatch = (profile.interestedIn || []).includes(opportunity.type);
    const workModeMatch = opportunity.workMode ? (profile.workModes || []).includes(opportunity.workMode) : false;

    return (locationMatch ? 0.333 : 0) + (typeMatch ? 0.333 : 0) + (workModeMatch ? 0.333 : 0);
}

function computeRelevanceBreakdown(opportunity: Opportunity, profile: Profile): RelevanceBreakdown {
    const skillsScore = getSkillOverlapScore(opportunity, profile);
    const prefsScore = getPreferenceMatchScore(opportunity, profile);

    return {
        experience: 0,
        skills: Math.round(skillsScore * 85),
        passoutYear: 0,
        educationLevel: 0,
        course: 0,
        specialization: 0,
        location: Math.round(prefsScore * 15),
        workMode: 0,
        freshness: 0,
        urgency: 0,
    };
}

export function rankOpportunitiesForUser<T extends Opportunity>(opportunities: T[], profile: Profile): RankedOpportunity<T>[] {
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
    const eligibleOpportunities: T[] = opportunities.filter(opp => checkEligibility(opp, profile, userId).eligible);
    return rankOpportunitiesForUser(eligibleOpportunities, profile);
}

export function sortOpportunitiesForUser<T extends Opportunity>(opportunities: T[], profile: Profile): T[] {
    return rankOpportunitiesForUser(opportunities, profile).map((item) => item.opportunity);
}

export function calculateOpportunityMatch(profile: Profile | null, opportunity: Opportunity): { score: number; reason: string } {
    if (!profile) return { score: 0, reason: 'Complete profile to see fit' };
    const eligibility = checkEligibility(opportunity, profile);
    if (!eligibility.eligible) {
        return { score: 0, reason: eligibility.reason || 'Ineligible' };
    }

    const breakdown = computeRelevanceBreakdown(opportunity, profile);
    const score = Math.max(0, Math.min(100, Math.round(Object.values(breakdown).reduce((acc, val) => acc + val, 0))));
    
    const skillsCount = (opportunity.requiredSkills || []).length;
    const matchCount = skillsCount > 0 ? Math.round((breakdown.skills / 85) * skillsCount) : 0;
    
    let reason = 'Eligible to apply';
    if (score >= 90) reason = 'Strong skills match';
    else if (score >= 70) reason = 'Good skills match';
    else if (matchCount > 0) reason = `${matchCount} skills matched`;
    else if (breakdown.location > 0) reason = 'Location match';

    return { score, reason };
}

export function isNotEligible(opportunity: Opportunity & { eligibility?: EligibilityResult }): boolean {
    return opportunity.eligibility?.eligible === false;
}
