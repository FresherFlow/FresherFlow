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

// Validation helpers
export function isProfileComplete(profile: Profile): boolean {
    return calculateCompletion(profile) === 100;
}
