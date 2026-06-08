import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import type { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
    typeParamToEnum,
    enumToTypeParam,
    buildExportUrl
} from '@/features/admin/opportunities/listUtils';

interface Filters {
    typeFilter: string;
    statusFilter: string;
    linkHealthFilter: '' | 'HEALTHY' | 'RETRYING' | 'BROKEN';
    activeOnly: boolean;
    search: string;
    sort: string;
}

export function useAdminOpportunities(pageSize: number = 20) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const pathname = usePathname();

    const [filters, setFilters] = useState<Filters>({
        typeFilter: '',
        statusFilter: '',
        linkHealthFilter: '',
        activeOnly: false,
        search: '',
        sort: 'postedAt_desc',
    });

    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const debouncedSearch = useDebounce(filters.search, 300);
    const isInternalUrlSyncRef = useRef(false);

    const exportUrl = useMemo(() => buildExportUrl(filters.typeFilter, filters.statusFilter), [filters.typeFilter, filters.statusFilter]);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = (await adminApi.getOpportunities({
                type: filters.typeFilter === 'GOVERNMENT' ? undefined : (filters.typeFilter || undefined),
                sector: filters.typeFilter === 'GOVERNMENT' ? 'GOVERNMENT' : undefined,
                status: filters.statusFilter || undefined,
                linkHealth: filters.linkHealthFilter || undefined,
                activeOnly: filters.activeOnly || undefined,
                q: debouncedSearch || undefined,
                sort: filters.sort,
                limit: pageSize,
                offset: (page - 1) * pageSize
            })) as { opportunities: Opportunity[]; total: number; totalPages: number };
            setOpportunities(data.opportunities || []);
            setTotalCount(data.total || 0);
            setTotalPages(data.totalPages || 1);
            setHasLoadedOnce(true);
        } catch (err: unknown) {
            const errorMsg = (err as Error).message || 'Failed to load opportunities';
            toast.error(errorMsg);
            if (errorMsg.includes('403') || errorMsg.includes('Unauthorized')) {
                router.push('/admin/login');
            }
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.typeFilter, filters.statusFilter, filters.linkHealthFilter, filters.activeOnly, debouncedSearch, filters.sort, page, pageSize]);

    // Sync from URL params — one batched setState, no extra renders
    useEffect(() => {
        if (isInternalUrlSyncRef.current) {
            isInternalUrlSyncRef.current = false;
            return;
        }
        const typeParam = searchParams.get('type');
        const statusParam = searchParams.get('status');
        const linkHealthParam = searchParams.get('linkHealth');
        const activeOnlyParam = searchParams.get('activeOnly');
        const qParam = searchParams.get('q');
        const sortParam = searchParams.get('sort');

        const nextLinkHealth = (linkHealthParam === 'HEALTHY' || linkHealthParam === 'RETRYING' || linkHealthParam === 'BROKEN') ? linkHealthParam : '';

        setFilters(prev => {
            const next: Filters = {
                typeFilter: typeParam ? typeParamToEnum(typeParam) : '',
                statusFilter: statusParam ? statusParam.toUpperCase() : '',
                linkHealthFilter: nextLinkHealth,
                activeOnly: activeOnlyParam === 'true',
                search: qParam ?? '',
                sort: sortParam || 'postedAt_desc',
            };
            // Only update if something actually changed
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            return next;
        });
        setPage(1);
    }, [searchParamsKey, searchParams]);

    // Sync filters back to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (filters.typeFilter) params.set('type', enumToTypeParam(filters.typeFilter)); else params.delete('type');
        if (filters.statusFilter) params.set('status', filters.statusFilter); else params.delete('status');
        if (filters.linkHealthFilter) params.set('linkHealth', filters.linkHealthFilter); else params.delete('linkHealth');
        if (filters.activeOnly) params.set('activeOnly', 'true'); else params.delete('activeOnly');
        if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim()); else params.delete('q');
        if (filters.sort) params.set('sort', filters.sort); else params.delete('sort');

        const next = params.toString();
        if (next !== searchParamsKey) {
            isInternalUrlSyncRef.current = true;
            router.replace(`${pathname}?${next}`);
        }
    }, [filters, debouncedSearch, searchParamsKey, searchParams, pathname, router]);

    // Convenience setters that keep backward compat with the page component
    const setTypeFilter = (v: string) => setFilters(f => ({ ...f, typeFilter: v }));
    const setStatusFilter = (v: string) => setFilters(f => ({ ...f, statusFilter: v }));
    const setLinkHealthFilter = (v: '' | 'HEALTHY' | 'RETRYING' | 'BROKEN') => setFilters(f => ({ ...f, linkHealthFilter: v }));
    const setActiveOnly = (v: boolean) => setFilters(f => ({ ...f, activeOnly: v }));
    const setSearch = (v: string) => setFilters(f => ({ ...f, search: v }));
    const setSort = (v: string) => setFilters(f => ({ ...f, sort: v }));

    return {
        opportunities,
        isLoading,
        hasLoadedOnce,
        typeFilter: filters.typeFilter, setTypeFilter,
        statusFilter: filters.statusFilter, setStatusFilter,
        linkHealthFilter: filters.linkHealthFilter, setLinkHealthFilter,
        activeOnly: filters.activeOnly, setActiveOnly,
        search: filters.search, setSearch,
        sort: filters.sort, setSort,
        page, setPage,
        totalCount,
        totalPages,
        exportUrl,
        loadOpportunities
    };
}
