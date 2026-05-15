import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { opportunitiesApi, profileApi } from '@fresherflow/api-client';
import { ParsedJob, Opportunity } from '@fresherflow/types';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { readFeedCache } from '@/utils/offlineCache';

const shareSchema = z.object({
    url: z.string().optional(),
    company: z.string().min(2, 'Company name is too short').optional(),
    contact: z.string().min(3, 'Contact info is required').optional(),
    description: z.string().min(5, 'Details should be more descriptive').optional(),
    companyUrl: z.string().optional(),
});

export type ShareFormData = z.infer<typeof shareSchema>;

export type ShareResult = {
    success: boolean;
    id: string;
    existing?: boolean;
    pending?: boolean;
};

export const useShare = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<(Partial<ParsedJob> & { duplicateCount?: number; isDuplicate?: boolean; existingId?: string | null }) | null>(null);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isValid },
    } = useForm<ShareFormData>({
        resolver: zodResolver(shareSchema),
        defaultValues: {
            url: '',
            company: '',
            contact: '',
            description: '',
            companyUrl: '',
        },
        mode: 'onChange',
    });

    const watchedUrl = watch('url');

    const handleParse = useCallback(async (manualUrl?: string) => {
        const urlToUse = manualUrl || watchedUrl;
        if (!urlToUse || !urlToUse.trim()) return;

        setLoading(true);
        setError(null);
        setPreview(null);

        try {
            const normalized = normalizeOpportunityUrl(urlToUse);

            // 1. Local Duplicate Check (Feed Cache)
            const cache = await readFeedCache();
            if (cache && cache.items.length > 0) {
                const urlMatch = cache.items.find((job: Opportunity) =>
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
    }, [watchedUrl]);

    const handleShare = useCallback(async (): Promise<ShareResult | undefined> => {
        if (!preview || !watchedUrl) {
            return undefined;
        }

        setLoading(true);
        setError(null);

        try {
            const normalized = normalizeOpportunityUrl(watchedUrl);
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
    }, [preview, watchedUrl]);

    const handleReferral = useCallback(async (data: ShareFormData): Promise<ShareResult | undefined> => {
        setLoading(true);
        setError(null);

        try {
            const response = await profileApi.submitShare({ 
                referral: {
                    company: data.company || '',
                    contact: data.contact || '',
                    description: data.description || '',
                    companyUrl: data.companyUrl
                } 
            });
            setLoading(false);

            if (response.success && response.share) {
                return {
                    success: true,
                    id: response.share.id || '',
                    pending: true 
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
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        loading,
        error,
        preview,
        setPreview,
        handleParse,
        handleShare,
        handleReferral,
        isValid,
        errors,
    };
};
