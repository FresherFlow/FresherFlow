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

  // Gate E: Government Job Age Gate
  const isGovJob = opportunity.type === 'GOVERNMENT' || !!opportunity.governmentJobDetails;
  if (isGovJob) {
    const ageMin = opportunity.governmentJobDetails?.ageMin;
    const ageMax = opportunity.governmentJobDetails?.ageMax;

    if ((ageMin !== undefined && ageMin !== null) || (ageMax !== undefined && ageMax !== null)) {
      if (!profile.dob) {
        return {
          score: 0,
          reason: 'Date of birth is required to check age eligibility.',
          isEligible: false
        };
      }

      const dob = new Date(profile.dob);
      if (isNaN(dob.getTime())) {
        return {
          score: 0,
          reason: 'Invalid date of birth in profile.',
          isEligible: false
        };
      }

      let cutoffDate = new Date();
      const governmentDetails = opportunity.governmentJobDetails;
      if (governmentDetails?.notificationIssuedDate) {
        const d = new Date(governmentDetails.notificationIssuedDate);
        if (!isNaN(d.getTime())) {
          cutoffDate = d;
        }
      } else if (opportunity.postedAt) {
        const d = new Date(opportunity.postedAt);
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
        return {
          score: 0,
          reason: `Your age (${age}) is below the minimum required age of ${ageMin}.`,
          isEligible: false
        };
      }
      if (ageMax !== undefined && ageMax !== null && age > (ageMax + relaxation)) {
        return {
          score: 0,
          reason: `Your age (${age}) exceeds the maximum allowed age of ${ageMax} (with ${relaxation} years of relaxation applied).`,
          isEligible: false
        };
      }
    }
  }

  // Gate F: Government Job State Residency Gate
  if (isGovJob && opportunity.governmentJobDetails?.governmentLevel === 'STATE') {
    if (!profile.homeState) {
      return {
        score: 0,
        reason: 'Home state is required to check state residency eligibility.',
        isEligible: false
      };
    }

    const homeStateNormalized = profile.homeState.trim().toLowerCase();
    const locations = opportunity.locations || [];

    const isResidentMatched = locations.some(loc => {
      const locNormalized = loc.trim().toLowerCase();
      return locNormalized === homeStateNormalized || 
             locNormalized.includes(homeStateNormalized) || 
             homeStateNormalized.includes(locNormalized);
    });

    if (!isResidentMatched) {
      return {
        score: 0,
        reason: `Restricted to residents of: ${(opportunity.locations || []).join(', ')}. Your home state: ${profile.homeState}.`,
        isEligible: false
      };
    }
  }

  // Gate A: Allowed Degrees (Degree/Level Gate)
  if (opportunity.allowedDegrees && opportunity.allowedDegrees.length > 0 && profile.educationLevel) {
    const levels = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'];
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
  const hasAnyYear = profile.tenthYear || profile.twelfthYear || profile.gradYear || profile.pgYear;
  if (opportunity.allowedPassoutYears && opportunity.allowedPassoutYears.length > 0 && hasAnyYear) {
    const normTenthYear = normalizeNumber(profile.tenthYear);
    const normTwelfthYear = normalizeNumber(profile.twelfthYear);
    const normGradYear = normalizeNumber(profile.gradYear);
    const normPgYear = normalizeNumber(profile.pgYear);

    const hasTenthMatch = !!(normTenthYear && opportunity.allowedPassoutYears.includes(normTenthYear));
    const hasTwelfthMatch = !!(normTwelfthYear && opportunity.allowedPassoutYears.includes(normTwelfthYear));
    const hasGradMatch = !!(normGradYear && opportunity.allowedPassoutYears.includes(normGradYear));
    const hasPgMatch = !!(normPgYear && opportunity.allowedPassoutYears.includes(normPgYear));
    
    const passoutYearMatch = hasTenthMatch || hasTwelfthMatch || hasGradMatch || hasPgMatch;

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
