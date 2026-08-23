// Profile Stage Machine - Single Source of Truth
// Backend determines stage. Frontend renders based on stage.

export enum ProfileStage {
    /**
     * User has authenticated but hasn't started profile
     * Redirects: /profile/complete
     */
    AUTH = 'AUTH',

    /**
     * User has started profile but completionPercentage < 100
     * Redirects: /profile/complete
     * Cannot access: opportunities, dashboard, actions
     */
    PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',

    /**
     * Profile is 100% complete
     * Can access: opportunities, dashboard, actions
     */
    PROFILE_COMPLETE = 'PROFILE_COMPLETE',

    /**
     * User is actively browsing and taking actions
     * Same as PROFILE_COMPLETE but semantic distinction
     */
    ACTIVE = 'ACTIVE',
}

/**
 * Determine user's current stage
 * Called on every auth refresh
 */
export function getUserStage(completionPercentage: number): ProfileStage {
    if (completionPercentage === 0) {
        return ProfileStage.AUTH;
    }

    if (completionPercentage < 100) {
        return ProfileStage.PROFILE_INCOMPLETE;
    }

    return ProfileStage.PROFILE_COMPLETE;
}

/**
 * Check if stage allows access to opportunities
 */
export function canAccessOpportunities(stage: ProfileStage): boolean {
    return stage === ProfileStage.PROFILE_COMPLETE || stage === ProfileStage.ACTIVE;
}

/**
 * Check if stage requires profile completion
 */
export function requiresProfileCompletion(stage: ProfileStage): boolean {
    return stage === ProfileStage.AUTH || stage === ProfileStage.PROFILE_INCOMPLETE;
}
