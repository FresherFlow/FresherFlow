import { apiClient } from './apiClient';

export interface IngestionTarget {
    company: string;
    ats: string;
    slug: string;
    resultsWanted?: number;
    hoursOld?: number;
    filter?: boolean;
}

export interface IngestionRunAllPayload {
    filter?: boolean;
    dryRun?: boolean;
    hoursOld?: number;
    resultsWanted?: number;
    targets?: IngestionTarget[];
}

export interface IngestionRunAllResponse {
    totalTargets: number;
    jobIds: string[];
}

export interface IngestionRunTargetPayload extends IngestionTarget {
    dryRun?: boolean;
}

export interface IngestionJobStatus {
    id: string;
    state: string;
    result?: {
        ats?: string;
        slug?: string;
        company?: string;
        total?: number;
        filtered?: number;
        saved?: number;
        skipped?: number;
        durationMs?: number;
        status?: 'OK' | 'TIMEOUT' | 'ERROR';
        error?: string;
        jobs?: unknown[];
        dryRun?: boolean;
    };
    failedReason?: string;
}

export interface IngestionStats {
    uptimeSeconds?: number;
    totalRuns?: number;
    totalJobsIngested?: number;
    totalJobsSaved?: number;
    totalJobsSkipped?: number;
    totalErrors?: number;
    lastRunTimestamp?: string;
}

export const adminIngestionApi = {
    getTargets: () =>
        apiClient<IngestionTarget[] | { status: string; total: number; targets: IngestionTarget[] }>(
            '/api/admin/ingestion/run/targets'
        ),

    runAll: (payload?: IngestionRunAllPayload) =>
        apiClient<IngestionRunAllResponse>('/api/admin/ingestion/run/all', {
            method: 'POST',
            body: payload || { filter: true },
        }),

    runTarget: (payload: IngestionRunTargetPayload) =>
        apiClient<unknown>('/api/admin/ingestion/run', {
            method: 'POST',
            body: payload,
        }),

    getJobStatus: (jobId: string) =>
        apiClient<IngestionJobStatus>(`/api/admin/ingestion/run/status/${jobId}`),

    getStats: () =>
        apiClient<IngestionStats>('/api/admin/ingestion/stats'),
};
