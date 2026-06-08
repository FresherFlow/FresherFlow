// Admin APIs
export * from './admin/auth';
export * from './admin/opportunities';
export * from './admin/system';
export * from './admin/analytics';
export * from './admin/feedback';
export * from './admin/users';
export * from './admin/resources';

// Public APIs
export { authApi } from './public/auth';
export { opportunitiesApi } from './public/opportunities';
export { companiesApi } from './public/companies';
export { profileApi } from './public/profile';
export { savedApi } from './public/saved';
export { dashboardApi } from './public/dashboard';
export { growthApi } from './public/growth';
export { referralApi } from './public/referral';
export { joblinksApi } from './public/joblinks';
export { opportunityClicksApi } from './public/opportunityClicks';
export * from './public/socialPosts';
export * from './public/telegrams';
export { actionsApi } from './public/actions';
export { alertsApi } from './public/alerts';
export { feedbackApi } from './public/feedback';
export { appFeedbackApi } from './public/appFeedback';
export { commentsApi, type Comment } from './public/comments';
export { contributorsApi, type Contributor } from './public/contributors';
export { followsApi } from './public/follows';
export { usernameApi } from './public/username';
export { governmentJobsApi } from './public/governmentJobs';
export { deviceTokenApi } from './public/deviceToken';
export { resourcesApi } from './public/resources';
export { publicApi } from './public/index';

export * from './apiClient';
export * from './config';
export * from '@fresherflow/types';
