import { Profile, Opportunity } from '@fresherflow/types';

export interface MatchResult {
  score: number;
  reason: string;
  isEligible: boolean;
}



export function calculateMatchScore(profile: Profile | null, opportunity: Opportunity): MatchResult {
  if (!profile) {
    return { score: 0, reason: 'Complete your profile', isEligible: true };
  }

  // 1. Eligibility (Education & Passout Year)
  const userYears = [profile.gradYear, profile.pgYear].filter(Boolean).map(Number);
  const yearMatch = !opportunity.allowedPassoutYears || 
                   opportunity.allowedPassoutYears.length === 0 || 
                   opportunity.allowedPassoutYears.some(y => userYears.includes(Number(y)));
  
  // Degrees/Courses check
  const userDegrees = [
    profile.educationLevel,
    profile.gradCourse,
    profile.pgCourse
  ].filter(Boolean).map(d => String(d).toLowerCase());

  const allowedDegrees = [
    ...(opportunity.allowedDegrees || []),
    ...(opportunity.allowedCourses || [])
  ].map(d => String(d).toLowerCase());

  const degreeMatch = allowedDegrees.length === 0 || 
                     allowedDegrees.some(d => userDegrees.some(ud => ud.includes(d) || d.includes(ud)));
  
  const isEligible = yearMatch && degreeMatch;

  // 2. Match Percentage (Skills Matching - Core Rule)
  let skillsScore = 0;
  let matchingSkillsCount = 0;
  
  if (opportunity.requiredSkills && opportunity.requiredSkills.length > 0) {
    const matchingSkills = opportunity.requiredSkills.filter(skill => 
      profile.skills?.some(s => s.toLowerCase().includes(skill.toLowerCase()))
    );
    matchingSkillsCount = matchingSkills.length;
    skillsScore = (matchingSkills.length / opportunity.requiredSkills.length) * 100;
  } else {
    // If no specific skills listed, assume baseline match
    skillsScore = 100;
  }

  // 3. Location Preferences (Role in Match)
  const locationMatch = opportunity.locations?.some(loc => 
    profile.preferredCities?.some(city => city.toLowerCase().includes(loc.toLowerCase()))
  ) || opportunity.workMode === 'REMOTE';

  // Preferences (Interested In)
  const typeMatch = profile.interestedIn?.includes(opportunity.type);

  // Final Score Composition
  // Skills: 80%, Location/Prefs: 20%
  const preferenceScore = (locationMatch ? 15 : 0) + (typeMatch ? 5 : 0);
  const finalScore = Math.min(100, Math.round((skillsScore * 0.8) + preferenceScore));

  // Determine Reason
  let reason = '';
  if (isEligible) {
    if (matchingSkillsCount > 0) {
      reason = `${matchingSkillsCount} Skills Match`;
    } else if (locationMatch) {
      reason = 'Location Match';
    } else {
      reason = 'Eligible Match';
    }
  } else {
    if (!yearMatch) reason = 'Year Ineligible';
    else if (!degreeMatch) reason = 'Degree Mismatch';
    else reason = 'Not Eligible';
  }

  return {
    score: finalScore,
    reason,
    isEligible
  };
}
