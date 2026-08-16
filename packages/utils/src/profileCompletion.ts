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

export interface ProfileCompletionResult {
    percentage: number;
    isComplete: boolean;
    missingFields: string[];
    missingCategories: {
        education: boolean;
        preferences: boolean;
        readiness: boolean;
    };
}

export function calculateProfileCompletion(profile: any): ProfileCompletionResult {
    let completion = 0;
    const missingFields: string[] = [];
    const missingCategories = {
        education: false,
        preferences: false,
        readiness: false,
    };

    if (!profile) {
        return {
            percentage: 0,
            isComplete: false,
            missingFields: ['Basic Information'],
            missingCategories: { education: true, preferences: true, readiness: true }
        };
    }

    // Education Details (40% total)
    // Part 1: Graduation/Degree (25%)
    const hasGraduation =
        profile?.educationLevel &&
        profile?.gradCourse &&
        profile?.gradSpecialization &&
        profile?.gradYear;

    if (hasGraduation) {
        completion += 25;
    } else {
        missingCategories.education = true;
        if (!profile?.educationLevel) missingFields.push('Education Level');
        if (!profile?.gradCourse) missingFields.push('UG Course');
        if (!profile?.gradSpecialization) missingFields.push('Specialization');
        if (!profile?.gradYear) missingFields.push('UG Passout Year');
    }

    // Part 2: Secondary Education (15%)
    const hasSecondary = profile?.tenthYear && profile?.twelfthYear;

    if (hasSecondary) {
        completion += 15;
    } else {
        missingCategories.education = true;
        if (!profile?.tenthYear) missingFields.push('10th Passout Year');
        if (!profile?.twelfthYear) missingFields.push('12th Passout Year');
    }

    // Opportunity Preferences (40%)
    const hasPreferences =
        profile?.interestedIn?.length > 0 &&
        profile?.preferredCities?.length > 0 &&
        profile?.workModes?.length > 0;

    if (hasPreferences) {
        completion += 40;
    } else {
        missingCategories.preferences = true;
        if (!profile?.interestedIn?.length) missingFields.push('Career Interests');
        if (!profile?.preferredCities?.length) missingFields.push('Preferred Cities');
        if (!profile?.workModes?.length) missingFields.push('Work Modes');
    }

    // Readiness Status (20%)
    const hasReadiness = profile?.availability && profile?.skills?.length > 0;

    if (hasReadiness) {
        completion += 20;
    } else {
        missingCategories.readiness = true;
        if (!profile?.availability) missingFields.push('Availability Status');
        if (!profile?.skills?.length) missingFields.push('Professional Skills');
    }

    const storedCompletion =
        typeof profile?.completionPercentage === 'number' ? profile.completionPercentage : null;
    let resolvedCompletion = storedCompletion === null || storedCompletion !== completion
        ? completion
        : storedCompletion;

    resolvedCompletion = Math.min(100, resolvedCompletion);

    return {
        percentage: resolvedCompletion,
        isComplete: resolvedCompletion >= 100,
        missingFields,
        missingCategories,
    };
}

export function isProfileComplete(profile: any): boolean {
    return calculateProfileCompletion(profile).percentage === 100;
}

export function getMissingFieldsMessage(profile: any): string {
    const result = calculateProfileCompletion(profile);

    if (result.isComplete) {
        return 'Profile is complete!';
    }

    const { missingFields } = result;
    const count = missingFields.length;

    if (count === 1) {
        return `Complete ${missingFields[0]} to unlock job listings`;
    }

    if (count === 2) {
        return `Add ${missingFields[0]} and ${missingFields[1]}`;
    }

    if (count <= 4) {
        const last = missingFields[missingFields.length - 1];
        const rest = missingFields.slice(0, -1).join(', ');
        return `Add ${rest}, and ${last}`;
    }

    return `${count} required fields missing. Complete your profile to see jobs.`;
}

