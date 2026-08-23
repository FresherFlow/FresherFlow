// Profile Completion Logic — Single Source of Truth
// Used by: Web UI (to show progress) and API (to gate access)
import type { Profile } from '@fresherflow/types';

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

type ProfileWithCompletion = Partial<Profile> & {
    completionPercentage?: number;
};

/**
 * Calculates profile completion percentage based on core requirements.
 * This is the canonical logic for the FresherFlow platform.
 */
export function calculateProfileCompletion(profile: Partial<Profile> | null | undefined): ProfileCompletionResult {
    if (!profile) {
        return {
            percentage: 0,
            isComplete: false,
            missingFields: ['Profile not found'],
            missingCategories: { education: true, preferences: true, readiness: true },
        };
    }

    // Short-circuit if the percentage is already pre-calculated by the API
    const profileWithCompletion = profile as ProfileWithCompletion;
    if (typeof profileWithCompletion.completionPercentage === 'number') {
        const p = profileWithCompletion.completionPercentage;
        return {
            percentage: p,
            isComplete: p === 100,
            missingFields: [],
            missingCategories: { education: false, preferences: false, readiness: false },
        };
    }

    let completion = 0;
    const missingFields: string[] = [];
    const missingCategories = { education: false, preferences: false, readiness: false };

    // 1. Education Details (40% total)
    // Part 1: Graduation/Degree (25%)
    const hasGraduation =
        profile.educationLevel &&
        profile.gradCourse &&
        profile.gradSpecialization &&
        profile.gradYear;

    if (hasGraduation) {
        completion += 25;
    } else {
        missingCategories.education = true;
        if (!profile.educationLevel) missingFields.push('Education Level');
        if (!profile.gradCourse) missingFields.push('UG Course');
        if (!profile.gradSpecialization) missingFields.push('Specialization');
        if (!profile.gradYear) missingFields.push('UG Passout Year');
    }

    // Part 2: Secondary Education (15%)
    const hasSecondary = profile.tenthYear && profile.twelfthYear;
    if (hasSecondary) {
        completion += 15;
    } else {
        missingCategories.education = true;
        if (!profile.tenthYear) missingFields.push('10th Passout Year');
        if (!profile.twelfthYear) missingFields.push('12th Passout Year');
    }

    // 2. Career Preferences (40%)
    const hasPreferences =
        (profile.interestedIn?.length ?? 0) > 0 &&
        (profile.preferredCities?.length ?? 0) > 0 &&
        (profile.workModes?.length ?? 0) > 0;

    if (hasPreferences) {
        completion += 40;
    } else {
        missingCategories.preferences = true;
        if (!profile.interestedIn?.length) missingFields.push('Career Interests');
        if (!profile.preferredCities?.length) missingFields.push('Preferred Cities');
        if (!profile.workModes?.length) missingFields.push('Work Modes');
    }

    // 3. Readiness Status (20%)
    const hasReadiness = profile.availability && (profile.skills?.length ?? 0) > 0;

    if (hasReadiness) {
        completion += 20;
    } else {
        missingCategories.readiness = true;
        if (!profile.availability) missingFields.push('Availability Status');
        if (!profile.skills?.length) missingFields.push('Professional Skills');
    }

    return {
        percentage: completion,
        isComplete: completion === 100,
        missingFields,
        missingCategories,
    };
}

export function isProfileComplete(profile: Partial<Profile> | null | undefined): boolean {
    return calculateProfileCompletion(profile).percentage === 100;
}

export function getMissingFieldsHelper(missingFields: string[]): string {
    const count = missingFields.length;
    if (count === 0) return 'Profile is complete!';
    if (count === 1) return `Complete ${missingFields[0]} to unlock job listings`;
    if (count === 2) return `Add ${missingFields[0]} and ${missingFields[1]}`;
    if (count <= 4) {
        const last = missingFields[missingFields.length - 1];
        const rest = missingFields.slice(0, -1).join(', ');
        return `Add ${rest}, and ${last}`;
    }
    return 'Multiple required fields missing. Complete your profile to see jobs.';
}

/**
 * Legacy compatibility helper.
 */
export function calculateCompletion(profile: Partial<Profile> | null | undefined): number {
    return calculateProfileCompletion(profile).percentage;
}
