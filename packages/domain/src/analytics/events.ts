// @fresherflow/domain — Universal Analytics Events
// Unified event names and parameter structures for the platform.

export enum AnalyticsEvent {
    // Opportunity interactions
    JOB_VIEW = 'job_view',
    APPLY_CLICK = 'apply_click',
    SAVE_JOB = 'save_job',
    SHARE_JOB = 'share_job',
    
    // Growth & Referrals
    INVITE_SHARE = 'invite_share_clicked',
    SIGNUP = 'sign_up',
    LOGIN = 'login',

    // Search & Filter
    SEARCH = 'search',
    FILTER = 'filter',

    // Profile Progress
    PROFILE_STEP = 'profile_complete_step',
}

export interface AnalyticsParams {
    job_id?: string;
    company?: string;
    location?: string;
    has_link?: boolean;
    share_method?: string;
    search_query?: string;
    filter_type?: string;
    filter_value?: string;
    method?: string;
    step?: string;
    source?: string;
}
