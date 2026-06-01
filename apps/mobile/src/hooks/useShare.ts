import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { opportunitiesApi, profileApi } from '@fresherflow/api-client';
import { ParsedJob, Opportunity } from '@fresherflow/types';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import { readFeedCache } from '@/utils/cache/offlineCache';
import { getJSON, setJSON, setBoolean } from '@/utils/storage';
import { queueShare } from '../utils/shareQueue';

const shareSchema = z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    company: z.string().optional(),
    contact: z.string().optional(),
    description: z.string().optional(),
    companyUrl: z.string().optional(),
    eligibleBatches: z.string().optional(),
}).superRefine((data, ctx) => {
    // If URL is empty, we are in Referral mode, so validate referral fields
    if (!data.url || data.url.trim().length === 0) {
        if (!data.title || data.title.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Job title is required', path: ['title'] });
        }
        if (!data.company || data.company.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company is required', path: ['company'] });
        }
        if (!data.contact || data.contact.trim().length < 3) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Contact info is required', path: ['contact'] });
        }
        if (!data.description || data.description.trim().length < 10) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Description must be at least 10 chars', path: ['description'] });
        }
    }
});

export type ShareFormData = z.infer<typeof shareSchema>;

export type ShareResult = {
    success: boolean;
    id: string;
    existing?: boolean;
    pending?: boolean;
    offline?: boolean;
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
            title: '',
            company: '',
            contact: '',
            description: '',
            companyUrl: '',
            eligibleBatches: '',
        },
        mode: 'onChange',
    });

    const watchedUrl = watch('url');

    useEffect(() => {
        setPreview(null);
        setError(null);
    }, [watchedUrl]);

    const handleParse = useCallback(async (manualUrl?: string) => {
        const urlToUse = manualUrl || watchedUrl;
        if (!urlToUse || !urlToUse.trim()) return;

        setLoading(true);
        setError(null);
        setPreview(null);

        try {
            const normalized = normalizeOpportunityUrl(urlToUse);

            // 0. Local Submitted Links Check
            const submitted = getJSON<string[]>('fresherflow_submitted_links') || [];
            if (submitted.includes(normalized)) {
                setError('This link is already under review!');
                setLoading(false);
                return;
            }

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

            let parsedTitle = 'Shared Opportunity';
            let parsedCompany = '';

            try {
                // Fetch the HTML directly from mobile (completely bypasses CORS!)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds max wait

                const resp = await fetch(normalized, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
                    }
                });
                clearTimeout(timeoutId);

                const html = await resp.text();

                // Extract <title> tag using basic regex
                const titleMatch = html.match(/<title[^>]*>([^<]{1,300})<\/title>/i);
                if (titleMatch && titleMatch[1]) {
                    parsedTitle = titleMatch[1].replace(/\s+/g, ' ').trim();
                }

                const urlParsed = new URL(normalized);
                parsedCompany = urlParsed.hostname.replace('www.', '');

                // Simple title & company format cleanup (e.g. "Software Engineer at Google | LinkedIn" -> Title: Software Engineer, Company: Google)
                if (parsedTitle.includes('|')) {
                    const parts = parsedTitle.split('|');
                    parsedTitle = parts[0].trim();
                    if (parts[1]) parsedCompany = parts[1].trim();
                } else if (parsedTitle.includes('-')) {
                    const parts = parsedTitle.split('-');
                    parsedTitle = parts[0].trim();
                    if (parts[1]) parsedCompany = parts[1].trim();
                }
            } catch (localParseError) {
                console.log('[useShare] Local HTML prefetch failed, using domain fallback:', localParseError);
                try {
                    const urlParsed = new URL(normalized);
                    parsedCompany = urlParsed.hostname.replace('www.', '');
                } catch {
                    parsedCompany = 'Unknown Source';
                }
            }

            setPreview({
                title: parsedTitle || 'Shared Opportunity',
                company: parsedCompany,
                locations: [],
                isDuplicate: false,
                existingId: null
            });
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
            const cachedList = getJSON<string[]>('fresherflow_submitted_links') || [];
            if (cachedList.includes(normalized)) {
                setError('This link is already under review!');
                setLoading(false);
                return undefined;
            }

            const response = await opportunitiesApi.shareLink(normalized, preview.title || undefined, preview.company || undefined);

            // Add successfully submitted link to local cache if not duplicate
            if (!response.existing) {
                cachedList.push(normalized);
                setJSON('fresherflow_submitted_links', cachedList);
            }

            setBoolean('fresherflow_shares_dirty', true);
            return {
                success: true,
                id: response.id || '',
                existing: !!response.existing,
                pending: !!response.pending
            };
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            const isNetworkError = !error.status || error.status === 0 || error.message === 'Network Error';
            if (isNetworkError) {
                const tempId = await queueShare('LINK', { 
                    url: watchedUrl,
                    title: preview?.title || undefined,
                    company: preview?.company || undefined
                });
                setBoolean('fresherflow_shares_dirty', true);
                return {
                    success: true,
                    id: tempId,
                    pending: true,
                    offline: true
                };
            }

            if (error.status === 401) {
                setError('Your session has expired. Please sign in again.');
            } else if (error.status === 409) {
                setError(error.message || 'This link is already under review!');
            } else if (error.status === 400) {
                setError(error.message || 'Invalid URL format. Please check the link and try again.');
            } else {
                setError(error.message || 'Something went wrong on our end. Please try again later.');
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
                    title: data.title || '',
                    company: data.company || '',
                    contact: data.contact || '',
                    description: data.description || '',
                    companyUrl: data.companyUrl,
                    eligibleBatches: data.eligibleBatches
                } 
            });
            setLoading(false);

            if (response.success && response.share) {
                setBoolean('fresherflow_shares_dirty', true);
                return {
                    success: true,
                    id: response.share.id || '',
                    pending: true 
                };
            }
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            console.error('Failed to submit referral:', err);

            const isNetworkError = !error.status || error.status === 0 || error.message === 'Network Error';
            if (isNetworkError) {
                const tempId = await queueShare('REFERRAL', {
                    referral: {
                        title: data.title || '',
                        company: data.company || '',
                        contact: data.contact || '',
                        description: data.description || '',
                        companyUrl: data.companyUrl,
                        eligibleBatches: data.eligibleBatches
                    }
                });
                setBoolean('fresherflow_shares_dirty', true);
                return {
                    success: true,
                    id: tempId,
                    pending: true,
                    offline: true
                };
            }

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
        setError,
        preview,
        setPreview,
        handleParse,
        handleShare,
        handleReferral,
        isValid,
        errors,
    };
};
