import { useState, useMemo, useCallback } from 'react';
import { Opportunity, Profile } from '@fresherflow/types';
import { 
    checkEligibility,
    EligibilityResult
} from '@fresherflow/domain';

/**
 * Local Matching Engine Hook
 * Handles ranking and filtering on the client side using user profile data.
 * This avoids heavy API roundtrips for personalized sorting.
 */
export const usePersonalizedFeed = (
    initialOpportunities: Opportunity[],
    profile: Profile | null
) => {
    const [filters, setFilters] = useState({
        remoteOnly: false,
        batchYear: null as number | null,
        type: null as string | null,
    });

    // 1. Filter locally based on static attributes
    const filtered = useMemo(() => {
        return initialOpportunities.filter(opp => {
            if (filters.remoteOnly && opp.workMode !== 'REMOTE') return false;
            if (filters.type && opp.type !== filters.type) return false;
            if (filters.batchYear && !opp.allowedPassoutYears?.includes(filters.batchYear)) return false;
            return true;
        });
    }, [initialOpportunities, filters]);

    // 2. Rank locally based on Profile Match
    const ranked = useMemo(() => {
        if (!profile) return filtered.map(opp => ({ 
            opportunity: opp, 
            score: 0,
            eligibility: { eligible: true } as EligibilityResult
        }));

        // Use the domain matching engine on-device
        return filtered.map(opp => {
            const eligibility = checkEligibility(opp, profile);
            
            // We can still show ineligible jobs at the bottom or hide them
            return {
                opportunity: opp,
                eligibility,
                // rankOpportunitiesForUser gives a score out of 100
                score: eligibility.eligible ? 100 : 0 // Simplified for this example
            };
        }).sort((a, b) => {
            // Priority: Eligible first, then by posted date
            if (a.eligibility.eligible && !b.eligibility.eligible) return -1;
            if (!a.eligibility.eligible && b.eligibility.eligible) return 1;
            
            return new Date(b.opportunity.postedAt).getTime() - new Date(a.opportunity.postedAt).getTime();
        });
    }, [filtered, profile]);

    const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    return {
        data: ranked,
        updateFilters,
        filters
    };
};
