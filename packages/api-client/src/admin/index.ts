import { adminAuthApi } from './auth';
import { adminOpportunitiesApi } from './opportunities';
import { adminSystemApi } from './system';
import { adminAnalyticsApi } from './analytics';
import { adminFeedbackApi } from './feedback';

export const adminApi = {
    ...adminAuthApi,
    ...adminOpportunitiesApi,
    ...adminSystemApi,
    ...adminAnalyticsApi,
    ...adminFeedbackApi,
    
    // Explicit Aliases for frontend compatibility
    getOpportunities: adminOpportunitiesApi.list,
    getOpportunity: adminOpportunitiesApi.get,
    createOpportunity: adminOpportunitiesApi.create,
    updateOpportunity: adminOpportunitiesApi.update,
    deleteOpportunity: adminOpportunitiesApi.delete,
    expireOpportunity: adminOpportunitiesApi.expire,
    restoreOpportunity: adminOpportunitiesApi.restore,
    parseOpportunityUrl: adminOpportunitiesApi.parse,
    parseJobText: adminOpportunitiesApi.parseText,
    ingestJobDraft: adminOpportunitiesApi.ingestDraft,
    getOpportunityEvents: adminOpportunitiesApi.events,
    createOpportunityEvent: adminOpportunitiesApi.addEvent,
    updateOpportunityEvent: adminOpportunitiesApi.updateEvent,
    deleteOpportunityEvent: adminOpportunitiesApi.deleteEvent,

    // Audit & System
    getMetrics: adminSystemApi.metricsV2,
    getConfigHealth: adminSystemApi.configHealth,
};

export * from './auth';
export * from './opportunities';
export * from './system';
export * from './analytics';
export * from './feedback';
