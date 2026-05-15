import { Profile, Opportunity } from '@fresherflow/types';
import { normalizeSkillList } from '@fresherflow/constants';

export interface MatchResult {
  score: number;
  reason: string;
  isEligible: boolean;
}

/**
 * Standardized Match Scoring Logic
 * Note: Keep in sync with @fresherflow/domain/src/eligibility/match.ts
 */
export function calculateMatchScore(profile: Profile | null, opportunity: Opportunity): MatchResult {
  if (!profile) {
    return { score: 0, reason: 'Complete profile to see fit', isEligible: true };
  }

  // 1. Skill Match (90%)
  let skillsScore = 0;
  const hasSkills = opportunity.requiredSkills && opportunity.requiredSkills.length > 0;
  
  if (hasSkills) {
    const userSkills = new Set(normalizeSkillList(profile.skills || []));
    const required = normalizeSkillList(opportunity.requiredSkills || []);
    const matches = required.filter(skill => userSkills.has(skill)).length;
    skillsScore = (matches / required.length) * 90;
  } else if (opportunity.requiredSkills && opportunity.requiredSkills.length === 0) {
    // Explicitly no skills required
    skillsScore = 90;
  }

  // 2. Preference Match (10%)
  const locationMatch = (opportunity.locations || []).some(loc => 
    (profile.preferredCities || []).some(city => city.toLowerCase().includes(loc.toLowerCase()))
  ) || opportunity.workMode === 'REMOTE' || opportunity.workMode === 'HYBRID';

  const typeMatch = (profile.interestedIn || []).includes(opportunity.type);
  const prefsScore = (locationMatch ? 5 : 0) + (typeMatch ? 5 : 0);

  const totalScore = Math.round(skillsScore + prefsScore);

  // 3. Reason Strings
  let reason = 'Eligible to apply';
  if (totalScore >= 90) reason = 'Strong skills match';
  else if (totalScore >= 70) reason = 'Good skills match';
  else if (skillsScore > 0) {
    const matchCount = Math.round((skillsScore / 90) * (opportunity.requiredSkills?.length || 0));
    reason = `${matchCount} skills matched`;
  } else if (locationMatch) {
    reason = 'Location match';
  }

  return {
    score: totalScore,
    reason,
    isEligible: true // Eligibility is handled separately by gates, but we assume true if we got here
  };
}
