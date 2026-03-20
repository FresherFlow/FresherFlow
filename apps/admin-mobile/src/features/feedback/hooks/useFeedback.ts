import { useCallback, useMemo, useState } from 'react';
import { adminFeedbackApi, type AppFeedbackItem, type ListingFeedbackSummary, type FeedbackAlerts } from '@fresherflow/api-client';

export type FeedbackTab = 'overview' | 'listing' | 'app';

const EMPTY_ALERTS: FeedbackAlerts = {
    listingCount: 0,
    appCount: 0,
    total: 0,
};

export const useFeedback = () => {
    const [tab, setTab] = useState<FeedbackTab>('overview');
    const [listingGroups, setListingGroups] = useState<ListingFeedbackSummary[]>([]);
    const [appFeedback, setAppFeedback] = useState<AppFeedbackItem[]>([]);
    const [alerts, setAlerts] = useState<FeedbackAlerts>(EMPTY_ALERTS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [listingResult, appResult, alertsResult] = await Promise.allSettled([
                adminFeedbackApi.list({ limit: 100 }),
                adminFeedbackApi.appFeedback({ limit: 50 }),
                adminFeedbackApi.alerts(),
            ]);

            if (listingResult.status === 'fulfilled') {
                setListingGroups(listingResult.value.feedbackSummary ?? []);
            }

            if (appResult.status === 'fulfilled') {
                setAppFeedback(appResult.value.feedback ?? []);
            }

            if (alertsResult.status === 'fulfilled') {
                setAlerts(alertsResult.value);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const totalListingReports = useMemo(
        () => listingGroups.reduce((sum, group) => sum + (group.feedbackCount || 0), 0),
        [listingGroups],
    );

    const totalNegativeReports = useMemo(
        () => listingGroups.reduce((sum, group) => sum + (group.negativeCount || 0), 0),
        [listingGroups],
    );

    const negativeGroups = useMemo(
        () => listingGroups.filter((group) => (group.negativeCount || 0) > 0),
        [listingGroups],
    );

    const topProblemListings = useMemo(
        () =>
            [...listingGroups]
                .sort((a, b) => (b.negativeCount || 0) - (a.negativeCount || 0) || (b.feedbackCount || 0) - (a.feedbackCount || 0))
                .slice(0, 5),
        [listingGroups],
    );

    return {
        tab,
        setTab,
        listingGroups,
        appFeedback,
        alerts,
        loading,
        refreshing,
        setRefreshing,
        fetchAll,
        totalListingReports,
        totalNegativeReports,
        negativeGroups,
        topProblemListings,
    };
};
