import { useState, useCallback } from 'react';
import { opportunitiesApi, profileApi } from '@fresherflow/api-client';
import { ParsedJob } from '@fresherflow/types';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { readFeedCache } from '@/utils/offlineCache';
import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/AppNavigator';

export type ShareResult = {
    success: boolean;
    id: string;
    existing?: boolean;
    pending?: boolean;
};

export const useShare = (navigation?: NavigationProp<RootStackParamList>) => {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<(Partial<ParsedJob> & { duplicateCount?: number; isDuplicate?: boolean; existingId?: string | null }) | null>(null);

    const handleParse = useCallback(async (manualUrl?: string) => {
        const urlToUse = manualUrl || url;
        if (!urlToUse.trim()) return;

        setLoading(true);
        setError(null);
        setPreview(null);

        try {
            const normalized = normalizeOpportunityUrl(urlToUse);

            // 1. Local Duplicate Check (Feed Cache)
            const cache = await readFeedCache();
            if (cache && cache.items.length > 0) {
                const urlMatch = cache.items.find(job =>
                    (job.sourceLink && normalizeOpportunityUrl(job.sourceLink) === normalized) ||
                    (job.applyLink && normalizeOpportunityUrl(job.applyLink) === normalized)
                );

                if (urlMatch) {
                    setPreview({
                        title: urlMatch.title,
                        company: urlMatch.company,
                        locations: urlMatch.locations,
                        type: urlMatch.type,
                        isDuplicate: true,
                        existingId: urlMatch.id
                    });
                    setLoading(false);
                    return;
                }
            }

            const response = await opportunitiesApi.ingest(normalized);
            if (response.success && response.data) {
                setPreview({
                    ...response.data,
                    isDuplicate: !!response.data.isDuplicate,
                    existingId: response.data.existingId
                });
            } else {
                setError(response.message || 'Could not extract details from this link.');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred while parsing the URL.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [url]);

    const handleShare = useCallback(async (): Promise<ShareResult | undefined> => {
        if (!preview) {
            return undefined;
        }

        setLoading(true);
        setError(null);

        try {
            const normalized = normalizeOpportunityUrl(url);
            const response = await opportunitiesApi.shareLink(normalized);

            return {
                success: true,
                id: response.id || '',
                existing: !!response.existing,
                pending: !!response.pending
            };
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            if (error.status === 401) {
                setError('Your session has expired. Please sign in again.');
            } else if (error.status === 409) {
                setError(error.message || 'This link has already been shared.');
            } else if (error.status === 400) {
                setError('Invalid URL format. Please check the link and try again.');
            } else {
                setError('Something went wrong on our end. Please try again later.');
            }
            return undefined;
        } finally {
            setLoading(false);
        }
    }, [preview, user, url, navigation]);

    const handleReferral = useCallback(async (referralData: { contact: string; description: string; company: string; companyUrl?: string }): Promise<ShareResult | undefined> => {
        setLoading(true);
        setError(null);

        try {
            const response = await profileApi.submitShare({ referral: referralData });
            setLoading(false);

            if (response.success && response.share) {
                return {
                    success: true,
                    id: response.share.id || '',
                    pending: true // Referrals are always pending review
                };
            }
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            console.error('Failed to submit referral:', err);

            setError(error.message || 'Failed to submit referral. Please try again.');
            return undefined;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        url,
        setUrl,
        loading,
        error,
        preview,
        setPreview,
        handleParse,
        handleShare,
        handleReferral,
    };
};
