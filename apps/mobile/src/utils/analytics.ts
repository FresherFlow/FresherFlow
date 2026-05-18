import * as Sentry from '@sentry/react-native';
import { User } from '@fresherflow/types';

/**
 * Premium Analytics Engine for FresherFlow
 * Centralizes Sentry and future tracking providers
 */

export const Analytics = {
    /**
     * Identify the user for crash reporting and tracking
     */
    identify: (user: User | null) => {
        if (!user) {
            Sentry.setUser(null);
            return;
        }

        Sentry.setUser({
            id: user.id,
            username: user.username || 'guest',
            email: user.email || undefined,
        });

        // Add breadcrumb for identity change
        Sentry.addBreadcrumb({
            category: 'auth',
            message: `User identified: ${user.username || user.id}`,
            level: 'info',
        });
    },

    /**
     * Track a specific UI or Business event
     */
    trackEvent: (eventName: string, properties?: Record<string, unknown>) => {
        // Log to console in dev for visibility
        if (__DEV__) {
            console.log(`[Analytics] ${eventName}`, properties);
        }

        // Use breadcrumbs to trace user path before a crash
        Sentry.addBreadcrumb({
            category: 'action',
            message: eventName,
            data: properties,
            level: 'info',
        });

        // For major events, we can send as message to Sentry for aggregation
        const majorEvents = [
            'JOB_APPLY_CLICKED',
            'JOB_SHARED',
            'REFERRAL_OFFERED',
            'REPORT_SUBMITTED',
            'WEBVIEW_OPENED'
        ];

        if (majorEvents.includes(eventName)) {
            Sentry.captureMessage(`Event: ${eventName}`, {
                level: 'info',
                extra: properties,
            });
        }
    },

    /**
     * Track an error with context
     */
    trackError: (error: unknown, context?: string) => {
        if (__DEV__) {
            console.error(`[Analytics] Error in ${context}:`, error);
        }

        Sentry.captureException(error, {
            extra: { context }
        });
    },

    /**
     * Screen View tracking (Manual)
     */
    trackScreen: (screenName: string) => {
        Sentry.addBreadcrumb({
            category: 'navigation',
            message: `Screen viewed: ${screenName}`,
            level: 'info',
        });
    }
};

export enum EventNames {
    // Discovery
    SEARCH_PERFORMED = 'SEARCH_PERFORMED',
    FILTER_CHANGED = 'FILTER_CHANGED',
    JOB_DETAILS_VIEWED = 'JOB_DETAILS_VIEWED',
    
    // Actions
    JOB_APPLY_CLICKED = 'JOB_APPLY_CLICKED',
    JOB_SHARED = 'JOB_SHARED',
    REFERRAL_OFFERED = 'REFERRAL_OFFERED',
    REPORT_SUBMITTED = 'REPORT_SUBMITTED',
    
    // Retention
    TRACKER_ITEM_ADDED = 'TRACKER_ITEM_ADDED',
    TRACKER_STATUS_UPDATED = 'TRACKER_STATUS_UPDATED',
    
    // System
    WEBVIEW_OPENED = 'WEBVIEW_OPENED',
    OFFLINE_SYNC_TRIGGERED = 'OFFLINE_SYNC_TRIGGERED',
}
