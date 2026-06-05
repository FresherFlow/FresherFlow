import { GovernmentJobDetails, Opportunity } from '@fresherflow/types';
import { apiClient } from './apiClient';

export type PublicGovernmentJobDetail = GovernmentJobDetails & {
    opportunity: Opportunity;
};

export type PublicGovernmentJobListEntry = GovernmentJobDetails & {
    opportunity: {
        title: string;
        company: string;
        locations: string[];
        slug: string;
    };
};

export const governmentJobsApi = {
    list: () => apiClient<PublicGovernmentJobListEntry[]>('/api/public/government-jobs'),
    get: (jobId: string) => apiClient<PublicGovernmentJobDetail>(`/api/public/government-jobs/${jobId}`),
};
