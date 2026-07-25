import { Profile } from '@fresherflow/types';

export interface CompletionDetails {
    percentage: number;
    missingFields: string[];
}

export function getProfileCompletionDetails(profile: Profile): CompletionDetails {
    let completion = 0;
    const missingFields: string[] = [];

    // Part 1: Graduation/Degree (25%)
    const hasGrad = profile.gradCourse && profile.gradSpecialization && profile.gradYear;
    if (hasGrad) {
        completion += 25;
    } else {
        missingFields.push('graduationDetails');
    }

    // Part 2: Secondary Education (15%)
    const hasSecondary = profile.tenthYear && profile.twelfthYear;
    if (hasSecondary) {
        completion += 15;
    } else {
        missingFields.push('schoolingDetails');
    }

    // Opportunity Preferences (40% weight)
    const hasPrefs = (profile.interestedIn?.length || 0) > 0 &&
        (profile.preferredCities?.length || 0) > 0 &&
        (profile.workModes?.length || 0) > 0;

    if (hasPrefs) {
        completion += 40;
    } else {
        missingFields.push('preferences');
    }

    // Readiness Status (20% weight)
    const hasReadiness = (profile.availability) && (profile.skills?.length || 0) > 0;
    if (hasReadiness) {
        completion += 20;
    } else {
        missingFields.push('readiness');
    }

    return {
        percentage: completion,
        missingFields
    };
}

export function calculateCompletion(profile: Profile): number {
    return getProfileCompletionDetails(profile).percentage;
}

export interface ProfileStrengthResult {
    score: number;
    missingItems: string[];
}

export function calculateProfileStrength(
    profile?: Partial<Profile> | Record<string, unknown> | null,
    user?: { fullName?: string | null } | Record<string, unknown> | null
): ProfileStrengthResult {
    let score = 0;
    const missingItems: string[] = [];

    const headline = typeof profile?.headline === 'string' ? profile.headline : undefined;
    const skills = Array.isArray(profile?.skills) ? profile.skills : [];
    const gradCourse = typeof profile?.gradCourse === 'string' ? profile.gradCourse : undefined;
    const gradSpecialization = typeof profile?.gradSpecialization === 'string' ? profile.gradSpecialization : undefined;
    const gradYear = typeof profile?.gradYear === 'number' ? profile.gradYear : undefined;
    const githubUrl = typeof profile?.githubUrl === 'string' ? profile.githubUrl : undefined;
    const linkedinUrl = typeof profile?.linkedinUrl === 'string' ? profile.linkedinUrl : undefined;
    const about = typeof profile?.about === 'string' ? profile.about : undefined;
    const fullName = typeof user?.fullName === 'string' ? user.fullName : undefined;

    // Headline (20 pts)
    if (headline?.trim()) {
        score += 20;
    } else {
        missingItems.push('Add a professional headline');
    }

    // At least 3 skills (20 pts)
    if (skills.length >= 3) {
        score += 20;
    } else {
        missingItems.push('Add at least 3 skills');
    }

    // Education complete (20 pts)
    if (gradCourse && gradSpecialization && gradYear) {
        score += 20;
    } else {
        missingItems.push('Complete your education details');
    }

    // GitHub or LinkedIn (20 pts)
    if (githubUrl?.trim() || linkedinUrl?.trim()) {
        score += 20;
    } else {
        missingItems.push('Link your GitHub or LinkedIn');
    }

    // About filled (10 pts)
    if (about?.trim()) {
        score += 10;
    } else {
        missingItems.push('Write a short bio in About');
    }

    // Avatar/Name (10 pts)
    if (fullName?.trim()) {
        score += 10;
    } else {
        missingItems.push('Add your full name');
    }

    return {
        score,
        missingItems,
    };
}

