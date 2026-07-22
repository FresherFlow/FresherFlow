import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL } from '../config/api';
import { generateCdnSignature } from '../lib/cdnSignature';
import type { Opportunity } from '../lib/api';

export function useCdnOpportunities() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOpportunities = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const sigParams = generateCdnSignature('/bootstrap-feed.min.json');
            const signedUrl = `${BOOTSTRAP_FEED_URL}?t=${sigParams.t}&sig=${sigParams.sig}`;

            const response = await axios.get(signedUrl, {
                timeout: 5000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                },
            });

            if (response.data?.opportunities) {
                setOpportunities(response.data.opportunities as Opportunity[]);
            } else if (Array.isArray(response.data)) {
                setOpportunities(response.data as Opportunity[]);
            }
        } catch (e: unknown) {
            const errMsg = (e as Error).message || 'Failed to fetch from CDN';
            console.warn('[useCdnOpportunities] CDN feed fetch failed:', errMsg);
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchOpportunities();
    }, [fetchOpportunities]);

    return {
        opportunities,
        isLoading,
        error,
        refetch: fetchOpportunities,
    };
}
