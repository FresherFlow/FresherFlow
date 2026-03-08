"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCompletion = calculateCompletion;
exports.isProfileComplete = isProfileComplete;
function calculateCompletion(profile) {
    let completion = 0;
    // Education Details (40% weight total)
    // Part 1: Graduation/Degree (25%)
    const gradComplete = profile.educationLevel &&
        profile.gradCourse &&
        profile.gradSpecialization &&
        profile.gradYear;
    if (gradComplete) {
        completion += 25;
    }
    // Part 2: Secondary Education (15%)
    const secondaryComplete = profile.tenthYear &&
        profile.twelfthYear;
    if (secondaryComplete) {
        completion += 15;
    }
    // Opportunity Preferences (40% weight)
    const preferencesComplete = profile.interestedIn.length > 0 &&
        profile.preferredCities.length > 0 &&
        profile.workModes && profile.workModes.length > 0;
    if (preferencesComplete) {
        completion += 40;
    }
    // Readiness Status (20% weight)
    const readinessComplete = profile.availability &&
        profile.skills.length > 0;
    if (readinessComplete) {
        completion += 20;
    }
    return completion;
}
// Validation helpers
function isProfileComplete(profile) {
    return calculateCompletion(profile) === 100;
}
