import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Share } from 'react-native';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { opportunitiesApi, opportunityClicksApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth, useNotifications, useSaved } from '@repo/frontend-core';
import { readDetailCache, saveDetailCache } from '@/utils/offlineCache';
import { MOBILE_SITE_URL } from '@/config/runtime';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const getPublicOpportunityPath = (opportunity: Opportunity) => {
    const slugOrId = encodeURIComponent(opportunity.slug || opportunity.id);
    if (opportunity.type === OpportunityType.INTERNSHIP) return `/internships/${slugOrId}`;
    if (opportunity.type === OpportunityType.WALKIN) return `/walk-ins/details/${slugOrId}`;
    return `/jobs/${slugOrId}`;
};

export const useOpportunityDetail = (
    opportunityId: string | null, 
    initialOpportunity: Opportunity | null, 
    navigation: Props['navigation']
) => {
    const { isSaved, toggleSave } = useSaved();
    const { user } = useAuth();
    const { showToast } = useNotifications();
    const [opportunity, setOpportunity] = useState<Opportunity | null>(initialOpportunity);
    const [loading, setLoading] = useState(!opportunity);
    const [error, setError] = useState<string | null>(null);
    const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
    const [similarOpportunities, setSimilarOpportunities] = useState<Opportunity[]>([]);

    useEffect(() => {
        let cancelled = false;
        const loadOpportunity = async () => {
            if (!opportunityId) {
                setError('Opportunity details are unavailable.');
                setLoading(false);
                return;
            }
            if (!opportunity) setLoading(true);

            try {
                const data = await opportunitiesApi.getById(opportunityId) as { opportunity: Opportunity; isEligible?: boolean; eligibilityReason?: string };
                if (cancelled) return;
                setOpportunity(data.opportunity);
                setEligibilityReason(data.isEligible === false ? data.eligibilityReason ?? null : null);
                setError(null);
                await saveDetailCache(data.opportunity);
            } catch (remoteError: unknown) {
                const cached = await readDetailCache(opportunityId);
                if (cancelled) return;
                if (cached) {
                    setOpportunity(cached);
                    setError(null);
                    showToast('Offline mode: showing cached details');
                } else {
                    const message = (remoteError as Error).message || 'Could not load opportunity';
                    setError(message);
                    showToast(message, 'error');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        const loadSimilar = async () => {
            if (!opportunityId) return;
            try {
                const data = await opportunitiesApi.getSimilar(opportunityId) as { opportunities: Opportunity[] };
                if (cancelled) return;
                setSimilarOpportunities(data.opportunities || []);
            } catch (err) {
                console.warn('Failed to load similar opportunities', err);
            }
        };

        void loadOpportunity();
        void loadSimilar();
        return () => { cancelled = true; };
    }, [opportunityId, showToast]);

    const handleShare = useCallback(async () => {
        if (!opportunity) return;
        try {
            const shareUrl = `${MOBILE_SITE_URL}${getPublicOpportunityPath(opportunity)}`;
            await Share.share({
                message: `Check out this opportunity: ${opportunity.title} at ${opportunity.company}\n\nView details: ${shareUrl}${opportunity.applyLink ? `\nApply here: ${opportunity.applyLink}` : ''}`,
                url: shareUrl,
            });
        } catch (shareError) {
            console.error('Error sharing opportunity', shareError);
        }
    }, [opportunity]);

    const handleApply = useCallback(async () => {
        if (!opportunity?.applyLink) {
            Alert.alert('Apply link unavailable', 'This opportunity does not have an application link yet.');
            return;
        }
        try {
            await opportunityClicksApi.trackApplyClick(opportunity.id, 'mobile_app');
        } catch (trackError) {
            console.warn('Failed to track application action', trackError);
        }
        try {
            await Linking.openURL(opportunity.applyLink);
        } catch {
            Alert.alert('Could not open link', 'Please try again later.');
        }
    }, [opportunity, user, navigation]);

    return {
        opportunity,
        loading,
        error,
        eligibilityReason,
        isSaved,
        toggleSave,
        handleShare,
        handleApply,
        similarOpportunities,
    };
};
