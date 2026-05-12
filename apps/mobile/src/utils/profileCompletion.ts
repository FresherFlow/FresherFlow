/**
 * Profile Completion Calculator
 * Synchronized with Web logic
 */
import { Profile } from '@fresherflow/types';

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

export function calculateProfileCompletion(profile: Profile | null): ProfileCompletionResult {
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
    const hasGraduation =
        profile?.educationLevel &&
        profile?.gradCourse &&
        profile?.gradYear;

    if (hasGraduation) {
        completion += 25;
    } else {
        missingCategories.education = true;
        if (!profile?.educationLevel) missingFields.push('Education Level');
        if (!profile?.gradCourse) missingFields.push('UG Course');
        if (!profile?.gradYear) missingFields.push('UG Passout Year');
    }

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

    return {
        percentage: Math.min(100, completion),
        isComplete: completion >= 100,
        missingFields,
        missingCategories,
    };
}
