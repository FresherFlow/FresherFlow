import type { Opportunity, Profile } from '@fresherflow/types';

type MatchResult = {
    score: number;
    reason: string;
};

const normalize = (value: string) => value.trim().toLowerCase();
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
