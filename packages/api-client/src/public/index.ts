import { authApi } from './auth';
import { opportunitiesApi } from './opportunities';
import { companiesApi } from './companies';
import { profileApi } from './profile';
import { savedApi } from './saved';
import { dashboardApi } from './dashboard';
import { growthApi } from './growth';
import { referralApi } from './referral';
import { joblinksApi } from './joblinks';
import { opportunityClicksApi } from './opportunityClicks';
import { socialPostsApi } from './socialPosts';
import { telegramsApi } from './telegrams';
import { actionsApi } from './actions';
import { alertsApi } from './alerts';
import { feedbackApi } from './feedback';
import { appFeedbackApi } from './appFeedback';
import { commentsApi } from './comments';
import { contributorsApi } from './contributors';
import { usernameApi } from './username';

export const publicApi = {
    auth: authApi,
    opportunities: opportunitiesApi,
    companies: companiesApi,
    profile: profileApi,
    saved: savedApi,
    dashboard: dashboardApi,
    growth: growthApi,
    referral: referralApi,
    joblinks: joblinksApi,
    opportunityClicks: opportunityClicksApi,
    socialPosts: socialPostsApi,
    telegrams: telegramsApi,
    actions: actionsApi,
    alerts: alertsApi,
    feedback: feedbackApi,
    appFeedback: appFeedbackApi,
    comments: commentsApi,
    contributors: contributorsApi,
    username: usernameApi,

    // Aliases
    getOpportunities: opportunitiesApi.list,
    getOpportunity: opportunitiesApi.get,
    trackAction: actionsApi.track,
};

export * from './auth';
export * from './opportunities';
export * from './companies';
export * from './profile';
export * from './saved';
export * from './dashboard';
export * from './growth';
export * from './referral';
export * from './joblinks';
export * from './opportunityClicks';
export * from './socialPosts';
export * from './telegrams';
export * from './actions';
export * from './alerts';
export * from './feedback';
export * from './appFeedback';
export * from './comments';
export * from './contributors';
export * from './username';
