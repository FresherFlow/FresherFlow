import { apiClient } from './apiClient';

export type RecruitmentStageKind =
    | 'SCREENING'
    | 'ASSESSMENT'
    | 'INTERVIEW'
    | 'CASE_STUDY'
    | 'GROUP_EXERCISE'
    | 'OFFER'
    | 'TRAINING'
    | 'ONBOARDING'
    | 'OTHER';

export type RecruitmentStage = {
    id: string;
    pipelineId: string;
    kind: RecruitmentStageKind;
    name: string;
    order: number;
    expectedDays: number | null;
};

export type HiringPipeline = {
    id: string;
    organizationId: string | null;
    name: string;
    isDefault: boolean;
    isTemplate: boolean;
    createdAt: string;
    updatedAt: string;
    stages: RecruitmentStage[];
};

export type PipelineStageInput = {
    kind: RecruitmentStageKind;
    name: string;
    expectedDays?: number | null;
};

export type ApplicationStage =
    | 'APPLIED'
    | 'REGISTERED'
    | 'IN_REVIEW'
    | 'ASSESSMENT'
    | 'INTERVIEW'
    | 'OFFERED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'WITHDRAWN'
    | 'SKIPPED'
    | 'PARTICIPATED';

export type PipelineApplication = {
    id: string;
    userId: string;
    opportunityId: string;
    stage: ApplicationStage;
    currentStageId: string | null;
    currentStageKind: RecruitmentStageKind | null;
    stageEnteredAt: string | null;
    outcome: string | null;
    appliedAt: string;
    updatedAt: string;
    user?: { id: string; fullName: string | null; username: string | null; email: string };
    currentStage?: RecruitmentStage | null;
};

export type PipelineBoardColumn = { stage: RecruitmentStage; applications: PipelineApplication[] };

export type PipelineBoard = { pipeline: HiringPipeline; columns: PipelineBoardColumn[] };

export type Pagination = { page: number; limit: number; total: number; pages: number };

export const pipelinesApi = {
    getDefaultTemplate: () =>
        apiClient<{ success: boolean; data: HiringPipeline }>('/api/pipeline/default'),

    listForOrganization: (organizationId: string) =>
        apiClient<{ success: boolean; data: HiringPipeline[] }>(`/api/pipeline/organizations/${organizationId}`),

    createForOrganization: (organizationId: string, data: { name: string; isDefault?: boolean; stages: PipelineStageInput[] }) =>
        apiClient<{ success: boolean; data: HiringPipeline }>(`/api/pipeline/organizations/${organizationId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    getForOrganization: (organizationId: string, pipelineId: string) =>
        apiClient<{ success: boolean; data: HiringPipeline }>(`/api/pipeline/organizations/${organizationId}/${pipelineId}`),

    updateForOrganization: (organizationId: string, pipelineId: string, data: { name?: string; isDefault?: boolean }) =>
        apiClient<{ success: boolean; data: HiringPipeline }>(`/api/pipeline/organizations/${organizationId}/${pipelineId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    deleteForOrganization: (organizationId: string, pipelineId: string) =>
        apiClient<{ success: boolean; message: string }>(`/api/pipeline/organizations/${organizationId}/${pipelineId}`, {
            method: 'DELETE'
        }),

    setDefault: (organizationId: string, pipelineId: string) =>
        apiClient<{ success: boolean; data: HiringPipeline }>(
            `/api/pipeline/organizations/${organizationId}/${pipelineId}/default`,
            { method: 'POST' }
        ),

    addStage: (pipelineId: string, data: PipelineStageInput) =>
        apiClient<{ success: boolean; data: RecruitmentStage }>(`/api/pipeline/stages/pipelines/${pipelineId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    updateStage: (stageId: string, data: { kind?: RecruitmentStageKind; name?: string; expectedDays?: number | null }) =>
        apiClient<{ success: boolean; data: RecruitmentStage }>(`/api/pipeline/stages/${stageId}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    deleteStage: (stageId: string) =>
        apiClient<{ success: boolean; message: string }>(`/api/pipeline/stages/${stageId}`, {
            method: 'DELETE'
        }),

    reorderStages: (pipelineId: string, orderedStageIds: string[]) =>
        apiClient<{ success: boolean; data: RecruitmentStage[] }>(`/api/pipeline/stages/pipelines/${pipelineId}/reorder`, {
            method: 'POST',
            body: JSON.stringify({ stageIds: orderedStageIds })
        }),

    getOpportunityBoard: (opportunityId: string) =>
        apiClient<{ success: boolean; data: PipelineBoard }>(`/api/pipeline/opportunities/${opportunityId}/board`),

    listApplications: (opportunityId: string, params?: { stageId?: string; kind?: RecruitmentStageKind; page?: number; limit?: number }) => {
        const searchParams = new URLSearchParams();
        if (params?.stageId) searchParams.set('stageId', params.stageId);
        if (params?.kind) searchParams.set('kind', params.kind);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        const query = searchParams.toString();
        return apiClient<{ success: boolean; data: PipelineApplication[]; pagination: Pagination }>(
            `/api/pipeline/opportunities/${opportunityId}/applications${query ? `?${query}` : ''}`
        );
    },

    // No userId is sent: the API derives the acting user from the auth token.
    applyToOpportunity: (opportunityId: string) =>
        apiClient<{ success: boolean; data: PipelineApplication }>(`/api/pipeline/opportunities/${opportunityId}/applications`, {
            method: 'POST'
        }),

    getApplication: (applicationId: string) =>
        apiClient<{ success: boolean; data: PipelineApplication }>(`/api/pipeline/applications/${applicationId}`),

    moveApplication: (applicationId: string, data: { stageId?: string; kind?: RecruitmentStageKind; outcome?: string; outcomeData?: Record<string, unknown> }) =>
        apiClient<{ success: boolean; data: PipelineApplication }>(`/api/pipeline/applications/${applicationId}/move`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    withdrawApplication: (applicationId: string) =>
        apiClient<{ success: boolean; message: string }>(`/api/pipeline/applications/${applicationId}`, {
            method: 'DELETE'
        })
};

