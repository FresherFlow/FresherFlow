/**
 * Google Analytics Event Tracking
 * 
 * Usage:
 * import { trackEvent } from '@/lib/analytics';
 * 
 * trackEvent('job_view', { job_id: '123', company: 'Infosys' });
 */

export const trackEvent = (eventName: string, eventParams?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, eventParams);
    }
};

// Predefined events for consistency
export const analytics = {
    // Job events
    jobView: (jobId: string, company: string, location: string) => {
        trackEvent('job_view', {
            job_id: jobId,
            company,
            location,
        });
    },

    applyClick: (jobId: string, company: string, hasLink: boolean) => {
        trackEvent('apply_click', {
            job_id: jobId,
            company,
            has_link: hasLink,
        });
    },

    saveJob: (jobId: string, company: string) => {
        trackEvent('save_job', {
            job_id: jobId,
            company,
        });
    },

    shareJob: (jobId: string, company: string, method: string) => {
        trackEvent('share_job', {
            job_id: jobId,
            company,
            share_method: method,
        });
    },

    inviteShare: (method: string) => {
        trackEvent('invite_share_clicked', {
            share_method: method,
            source: 'dashboard_invite',
        });
    },

    // Search/Filter events
    search: (query: string) => {
        trackEvent('search', {
            search_query: query,
        });
    },

    filter: (filterType: string, filterValue: string) => {
        trackEvent('filter', {
            filter_type: filterType,
            filter_value: filterValue,
        });
    },

    // User events
    signup: (method: string) => {
        trackEvent('sign_up', {
            method, // 'email', 'google', etc.
        });
    },

    login: (method: string) => {
        trackEvent('login', {
            method,
        });
    },

    profileComplete: (step: string) => {
        trackEvent('profile_complete_step', {
            step, // 'education', 'preferences', 'readiness'
        });
    },
};

declare global {
    interface Window {
        gtag: (command: string, ...args: unknown[]) => void;
    }
}
