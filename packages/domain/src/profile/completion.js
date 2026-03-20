"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProfileCompletion = calculateProfileCompletion;
exports.isProfileComplete = isProfileComplete;
exports.getMissingFieldsHelper = getMissingFieldsHelper;
exports.calculateCompletion = calculateCompletion;
/**
 * Calculates profile completion percentage based on core requirements.
 * This is the canonical logic for the FresherFlow platform.
 */
function calculateProfileCompletion(profile) {
    if (!profile) {
        return {
            percentage: 0,
            isComplete: false,
            missingFields: ['Profile not found'],
            missingCategories: { education: true, preferences: true, readiness: true },
        };
    }
    // Short-circuit if the percentage is already pre-calculated by the API
    if (typeof profile.completionPercentage === 'number') {
        const p = profile.completionPercentage;
        return {
            percentage: p,
            isComplete: p === 100,
            missingFields: [],
            missingCategories: { education: false, preferences: false, readiness: false },
        };
    }
    let completion = 0;
    const missingFields = [];
    const missingCategories = { education: false, preferences: false, readiness: false };
    // 1. Education Details (40% total)
    // Part 1: Graduation/Degree (25%)
    const hasGraduation = profile.educationLevel &&
        profile.gradCourse &&
        profile.gradSpecialization &&
        profile.gradYear;
    if (hasGraduation) {
        completion += 25;
    }
    else {
        missingCategories.education = true;
        if (!profile.educationLevel)
            missingFields.push('Education Level');
        if (!profile.gradCourse)
            missingFields.push('UG Course');
        if (!profile.gradSpecialization)
            missingFields.push('Specialization');
        if (!profile.gradYear)
            missingFields.push('UG Passout Year');
    }
    // Part 2: Secondary Education (15%)
    const hasSecondary = profile.tenthYear && profile.twelfthYear;
    if (hasSecondary) {
        completion += 15;
    }
    else {
        missingCategories.education = true;
        if (!profile.tenthYear)
            missingFields.push('10th Passout Year');
        if (!profile.twelfthYear)
            missingFields.push('12th Passout Year');
    }
    // 2. Career Preferences (40%)
    const hasPreferences = (profile.interestedIn?.length ?? 0) > 0 &&
        (profile.preferredCities?.length ?? 0) > 0 &&
        (profile.workModes?.length ?? 0) > 0;
    if (hasPreferences) {
        completion += 40;
    }
    else {
        missingCategories.preferences = true;
        if (!profile.interestedIn?.length)
            missingFields.push('Career Interests');
        if (!profile.preferredCities?.length)
            missingFields.push('Preferred Cities');
        if (!profile.workModes?.length)
            missingFields.push('Work Modes');
    }
    // 3. Readiness Status (20%)
    const hasReadiness = profile.availability && (profile.skills?.length ?? 0) > 0;
    if (hasReadiness) {
        completion += 20;
    }
    else {
        missingCategories.readiness = true;
        if (!profile.availability)
            missingFields.push('Availability Status');
        if (!profile.skills?.length)
            missingFields.push('Professional Skills');
    }
    return {
        percentage: completion,
        isComplete: completion === 100,
        missingFields,
        missingCategories,
    };
}
function isProfileComplete(profile) {
    return calculateProfileCompletion(profile).percentage === 100;
}
function getMissingFieldsHelper(missingFields) {
    const count = missingFields.length;
    if (count === 0)
        return 'Profile is complete!';
    if (count === 1)
        return `Complete ${missingFields[0]} to unlock job listings`;
    if (count === 2)
        return `Add ${missingFields[0]} and ${missingFields[1]}`;
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
function calculateCompletion(profile) {
    return calculateProfileCompletion(profile).percentage;
}
