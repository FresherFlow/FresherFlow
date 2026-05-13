/**
 * Profile Completion Calculator
 * **MUST MATCH** backend logic in apps/api/src/utils/profileCompletion.ts
 */

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateProfileCompletion(profile: any): ProfileCompletionResult {
    let completion = 0;
    const missingFields: string[] = [];
    const missingCategories = {
        education: false,
        preferences: false,
        readiness: false,
    };

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
    const resolvedCompletion = storedCompletion === null || storedCompletion !== completion
        ? completion
        : storedCompletion;

    return {
        percentage: resolvedCompletion,
        isComplete: resolvedCompletion === 100,
        missingFields,
        missingCategories,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isProfileComplete(profile: any): boolean {
    return calculateProfileCompletion(profile).percentage === 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
