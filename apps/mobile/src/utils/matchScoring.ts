import { Profile, Opportunity } from '@fresherflow/types';
import { normalizeSkillList } from '@fresherflow/constants';
import {
  normalizeCourseName,
  normalizeSpecializationName,
  normalizeAcademicToken,
  normalizeNumber
} from '@fresherflow/utils';

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

  // If career profile education data is empty, treat as eligible but with no score/matching
  // (nothing implements until they actually fill in their career credentials)
  const isProfileEmpty = !profile.educationLevel && !profile.gradCourse && !profile.gradSpecialization;
  if (isProfileEmpty) {
    return { score: 0, reason: 'Complete profile to see eligibility', isEligible: true };
  }

  // ==========================================
  // 1. Strict Eligibility Gates (Must Pass if data exists)
  // ==========================================

  // Gate A: Allowed Degrees (Degree/Level Gate)
  if (opportunity.allowedDegrees && opportunity.allowedDegrees.length > 0 && profile.educationLevel) {
    const levels = ['DIPLOMA', 'DEGREE', 'PG'];
    const userLevelIndex = levels.indexOf(profile.educationLevel);
    const levelMatch = userLevelIndex !== -1 && opportunity.allowedDegrees.some(deg => {
      const degIndex = levels.indexOf(deg);
      return degIndex !== -1 && degIndex <= userLevelIndex;
    });

    if (!levelMatch) {
      return {
        score: 0,
        reason: `Required degrees: ${opportunity.allowedDegrees.join(', ')}`,
        isEligible: false
      };
    }
  }

  // Gate B: Allowed Passout Years (Batch / Passout Gate)
  if (opportunity.allowedPassoutYears && opportunity.allowedPassoutYears.length > 0 && (profile.gradYear || profile.pgYear)) {
    const normGradYear = normalizeNumber(profile.gradYear);
    const normPgYear = normalizeNumber(profile.pgYear);

    const hasGradMatch = !!(normGradYear && opportunity.allowedPassoutYears.includes(normGradYear));
    const hasPgMatch = !!(normPgYear && opportunity.allowedPassoutYears.includes(normPgYear));
    const passoutYearMatch = hasGradMatch || hasPgMatch;

    if (!passoutYearMatch) {
      return {
        score: 0,
        reason: `Required batches: ${opportunity.allowedPassoutYears.join(', ')}`,
        isEligible: false
      };
    }
  }

  // Gate C: Allowed Courses (Course Gate)
  if (opportunity.allowedCourses && opportunity.allowedCourses.length > 0 && (profile.gradCourse || profile.pgCourse)) {
    const allowedCourses = opportunity.allowedCourses.map(course => normalizeAcademicToken(normalizeCourseName(course))).filter(Boolean);
    if (allowedCourses.length > 0) {
      const userCourse = normalizeAcademicToken(normalizeCourseName(profile.gradCourse));
      const userPGCourse = normalizeAcademicToken(normalizeCourseName(profile.pgCourse));

      const courseMatch = (userCourse && allowedCourses.includes(userCourse)) ||
                          (userPGCourse && allowedCourses.includes(userPGCourse));

      if (!courseMatch) {
        return {
          score: 0,
          reason: `Required courses: ${opportunity.allowedCourses.join(', ')}`,
          isEligible: false
        };
      }
    }
  }

  // Gate D: Allowed Specializations (Specialization Gate)
  if (opportunity.allowedSpecializations && opportunity.allowedSpecializations.length > 0 && (profile.gradSpecialization || profile.pgSpecialization)) {
    const allowedSpecs = opportunity.allowedSpecializations.map(spec => normalizeAcademicToken(normalizeSpecializationName(spec))).filter(Boolean);
    if (allowedSpecs.length > 0) {
      const userSpec = normalizeAcademicToken(normalizeSpecializationName(profile.gradSpecialization));
      const userPGSpec = normalizeAcademicToken(normalizeSpecializationName(profile.pgSpecialization));

      const specMatch = (userSpec && allowedSpecs.includes(userSpec)) ||
                        (userPGSpec && allowedSpecs.includes(userPGSpec));

      if (!specMatch) {
        return {
          score: 0,
          reason: `Required specializations: ${opportunity.allowedSpecializations.join(', ')}`,
          isEligible: false
        };
      }
    }
  }

  // ==========================================
  // 2. Skill Match (85%)
  // ==========================================
  let skillsScore = 0;
  const hasSkills = opportunity.requiredSkills && opportunity.requiredSkills.length > 0;
  
  if (hasSkills) {
    const userSkills = new Set(normalizeSkillList(profile.skills || []));
    const required = normalizeSkillList(opportunity.requiredSkills || []);
    const matches = required.filter(skill => userSkills.has(skill)).length;
    skillsScore = (matches / required.length) * 85;
  } else if (opportunity.requiredSkills && opportunity.requiredSkills.length === 0) {
    // Explicitly no skills required
    skillsScore = 85;
  }

  // ==========================================
  // 3. Preference Match (15%)
  // ==========================================
  const locationMatch = (opportunity.locations || []).some(loc => 
    (profile.preferredCities || []).some(city => city.toLowerCase().includes(loc.toLowerCase()))
  ) || opportunity.workMode === 'REMOTE' || opportunity.workMode === 'HYBRID';

  const typeMatch = (profile.interestedIn || []).includes(opportunity.type);
  const workModeMatch = opportunity.workMode ? (profile.workModes || []).includes(opportunity.workMode) : false;

  const prefsScore = (locationMatch ? 5 : 0) + (typeMatch ? 5 : 0) + (workModeMatch ? 5 : 0);

  const totalScore = Math.round(skillsScore + prefsScore);

  // ==========================================
  // 4. Reason Strings & Outcome
  // ==========================================
  let reason = 'Eligible to apply';
  if (totalScore >= 90) reason = 'Strong skills match';
  else if (totalScore >= 70) reason = 'Good skills match';
  else if (skillsScore > 0) {
    const matchCount = Math.round((skillsScore / 85) * (opportunity.requiredSkills?.length || 0));
    reason = `${matchCount} skills matched`;
  } else if (locationMatch) {
    reason = 'Location match';
  }

  return {
    score: totalScore,
    reason,
    isEligible: true
  };
}
