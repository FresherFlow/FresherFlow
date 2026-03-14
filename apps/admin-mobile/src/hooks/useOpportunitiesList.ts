import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { Opportunities, type Opportunity } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_OPPORTUNITIES_CACHE_KEY, ADMIN_OPPORTUNITIES_PAGE_SIZE } from '../lib/constants';
import { toast } from '../lib/toast';

export type RequestState = {
    q: string;
    status: string;
    type: string;
    page: number;
    sort: string;
};

const DEFAULT_REQUEST: RequestState = { q: '', status: 'ALL', type: 'ALL', page: 1, sort: '' };

type CachedPayload = {
    cachedAt: number;
    opportunities: Opportunity[];
    request: Omit<RequestState, 'page'>;
};

export const useOpportunitiesList = () => {
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [draftQuery, setDraftQuery] = useState('');
    const [req, setReq] = useState<RequestState>(DEFAULT_REQUEST);

    const fetchingRef = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchJobs = useCallback(async (r: RequestState, append = false) => {
        if (fetchingRef.current && !append) return;
        fetchingRef.current = true;
        try {
            if (!append) setLoading(true); else setLoadingMore(true);
            setError(null);

            const params = {
                page: r.page,
                limit: ADMIN_OPPORTUNITIES_PAGE_SIZE,
                ...(r.q ? { q: r.q } : {}),
                ...(r.status !== 'ALL' ? { status: r.status } : {}),
                ...(r.type !== 'ALL' ? { type: r.type } : {}),
                ...(r.sort ? { sort: r.sort } : {}),
            };

            const data = await Opportunities.list(params);
            const rows = data.opportunities ?? [];

            if (!append) {
                setJobs(rows);
                setTotal(data.total ?? rows.length);
                const payload: CachedPayload = {
                    cachedAt: Date.now(),
                    opportunities: rows,
                    request: { q: r.q, status: r.status, type: r.type, sort: r.sort },
                };
                await AsyncStorage.setItem(ADMIN_OPPORTUNITIES_CACHE_KEY, JSON.stringify(payload));
            } else {
                setJobs(prev => {
                    const seen = new Set(prev.map(j => j.id));
                    return [...prev, ...rows.filter(row => !seen.has(row.id))];
                });
                setTotal(data.total ?? 0);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        void fetchJobs(req, req.page > 1);
    }, [req, fetchJobs]);

    const bootstrap = useCallback(async () => {
        fetchingRef.current = false;
        const raw = await AsyncStorage.getItem(ADMIN_OPPORTUNITIES_CACHE_KEY).catch(() => null);
        if (raw) {
            try {
                const p = JSON.parse(raw) as CachedPayload;
                if (
                    p.opportunities &&
                    p.request.q === req.q &&
                    p.request.status === req.status &&
                    p.request.type === req.type
                ) {
                    setJobs(p.opportunities);
                    setLoading(false);
                }
            } catch { /* ignore corrupt cache */ }
        }
        void fetchJobs(req, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const commitSearch = useCallback((q: string) => {
        setReq(prev => ({ ...prev, q: q.trim(), page: 1 }));
    }, []);

    const onDraftChange = useCallback((text: string) => {
        setDraftQuery(text);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => commitSearch(text), 300);
    }, [commitSearch]);

    const onSubmitSearch = useCallback(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        commitSearch(draftQuery);
    }, [draftQuery, commitSearch]);

    const onClearSearch = useCallback(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setDraftQuery('');
        commitSearch('');
    }, [commitSearch]);

    const onStatusFilter = useCallback((status: string) => setReq(prev => ({ ...prev, status, page: 1 })), []);
    const onTypeFilter = useCallback((type: string) => setReq(prev => ({ ...prev, type, page: 1 })), []);
    
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setReq(prev => ({ ...prev, page: 1 }));
    }, []);

    const onLoadMore = useCallback(() => {
        if (!fetchingRef.current && jobs.length < total) {
            setReq(prev => ({ ...prev, page: prev.page + 1 }));
        }
    }, [jobs.length, total]);

    const reload = useCallback(() => setReq(prev => ({ ...prev, page: 1 })), []);

    return {
        jobs, total, loading, loadingMore, refreshing, error,
        req, draftQuery,
        bootstrap, onDraftChange, onSubmitSearch, onClearSearch,
        onStatusFilter, onTypeFilter, onRefresh, onLoadMore, reload
    };
};

export const useOpportunityActions = (reload: () => void) => {
    const confirmAction = useCallback((title: string, body: string, action: () => Promise<void>, destructive = false) => {
        Alert.alert(title, body, [
            { text: 'Cancel', style: 'cancel' },
            { text: destructive ? 'Confirm' : 'OK', style: destructive ? 'destructive' : 'default', onPress: () => void action() },
        ]);
    }, []);

    const handleExpire = useCallback((id: string, title: string) => {
        Alert.prompt('Expire Opportunity', `Reason for expiring "${title}" (optional):`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Expire', style: 'destructive',
                onPress: async (reason?: string) => {
                    try { await Opportunities.expire(id, reason); reload(); }
                    catch (e) { toast.error('Expire failed', e instanceof Error ? e.message : 'Failed'); }
                },
            },
        ], 'plain-text');
    }, [reload]);

    const handleRestore = useCallback((id: string) =>
        confirmAction('Restore Opportunity?', 'This will restore the expired opportunity.', async () => {
            await Opportunities.restore(id); reload();
        }), [confirmAction, reload]);

    const handleDelete = useCallback((id: string, title: string) => {
        Alert.prompt('Delete Opportunity', `Type a reason for deleting "${title}":`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async (reason?: string) => {
                    try { await Opportunities.delete(id, reason); reload(); }
                    catch (e) { toast.error('Delete failed', e instanceof Error ? e.message : 'Failed'); }
                },
            },
        ], 'plain-text');
    }, [reload]);

    const handlePublish = useCallback((id: string) => {
        Alert.alert('Publish Opportunity?', 'This will make the opportunity live.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Publish', onPress: async () => {
                    try { await Opportunities.update(id, { status: 'PUBLISHED' }); reload(); }
                    catch (e) { toast.error('Publish failed', e instanceof Error ? e.message : 'Failed'); }
                },
            },
        ]);
    }, [reload]);

    const handleExport = useCallback(async (statusFilter: string) => {
        Alert.alert('Export Opportunities', `Export ${statusFilter !== 'ALL' ? statusFilter : 'all'} opportunities as CSV?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Export', onPress: async () => {
                    try {
                        Alert.alert('Exporting…', 'The CSV will be available shortly.');
                        await Opportunities.export(statusFilter !== 'ALL' ? { status: statusFilter } : {});
                    } catch (e) { toast.error('Export failed', e instanceof Error ? e.message : 'Export failed'); }
                },
            },
        ]);
    }, []);

    return { handleExpire, handleRestore, handleDelete, handlePublish, handleExport };
};
