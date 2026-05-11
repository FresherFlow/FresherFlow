import { useState, useCallback } from 'react';
import { opportunitiesApi } from '@fresherflow/api-client';
import { ParsedJob } from '@fresherflow/types';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { Alert } from 'react-native';
import { useUserAuth as useAuth } from '@repo/frontend-core';
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
    const [preview, setPreview] = useState<Partial<ParsedJob> | null>(null);

    const handleParse = useCallback(async (manualUrl?: string) => {
        const urlToUse = manualUrl || url;
        if (!urlToUse.trim()) return;
        
        setLoading(true);
        setError(null);
        setPreview(null);

        try {
            const normalized = normalizeOpportunityUrl(urlToUse);
            const response = await opportunitiesApi.ingest(normalized);
            if (response.success && response.data) {
                setPreview(response.data);
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

    const handleConfirm = useCallback(async (): Promise<ShareResult | undefined> => {
        if (!preview) return undefined;
        
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to share opportunities.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign in', onPress: () => navigation?.navigate('Login') },
            ]);
            return undefined;
        }
        
        setLoading(true);
        setError(null);

        try {
            const response = await opportunitiesApi.submit(preview);
            if (response.success) {
                return {
                    success: true,
                    id: response.id,
                    existing: response.existing,
                    pending: response.pending
                };
            } else {
                setError(response.message || 'Could not submit opportunity.');
                return undefined;
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred while submitting.';
            setError(message);
            return undefined;
        } finally {
            setLoading(false);
        }
    }, [preview, user, navigation]);

    return {
        url,
        setUrl,
        loading,
        error,
        preview,
        setPreview,
        handleParse,
        handleConfirm,
    };
};
