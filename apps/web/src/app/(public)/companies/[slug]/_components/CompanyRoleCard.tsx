'use client';

import type { Opportunity } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSavedJobs } from '@/features/dashboard/hooks/useSavedJobs';
import SavedJobCard from '@/features/jobs/components/SavedJobCard';

type Props = {
    opp: Opportunity;
    typeLabel?: string;
    applyHref?: string | null;
};

/**
 * Save-state wiring only. The row itself is the shared `SavedJobCard`, the
 * same component the saved-jobs page renders, so there is no second copy of
 * that UI to keep in sync.
 */
export default function CompanyRoleCard({ opp, typeLabel, applyHref }: Props) {
    const { user } = useAuth();
    const { savedJobsMap, toggleSavedJob } = useSavedJobs(user?.id);

    return (
        <SavedJobCard
            opp={opp}
            isSaved={Boolean(savedJobsMap[opp.id])}
            onToggleSave={() => toggleSavedJob(opp.id)}
            showCompany={false}
            typeLabel={typeLabel}
            applyHref={applyHref}
        />
    );
}
