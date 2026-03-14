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

export function useAdminOpportunities(pageSize: number = 20) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const pathname = usePathname();
    
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [linkHealthFilter, setLinkHealthFilter] = useState<'HEALTHY' | 'RETRYING' | 'BROKEN' | ''>('');
    const [activeOnly, setActiveOnly] = useState(false);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('postedAt_desc');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    
    const debouncedSearch = useDebounce(search, 300);
    const isInternalUrlSyncRef = useRef(false);

    const exportUrl = useMemo(() => buildExportUrl(typeFilter, statusFilter), [typeFilter, statusFilter]);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = (await adminApi.getOpportunities({
                type: typeFilter || undefined,
                status: statusFilter || undefined,
                linkHealth: linkHealthFilter || undefined,
                activeOnly: activeOnly || undefined,
                q: debouncedSearch || undefined,
                sort,
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
    }, [typeFilter, statusFilter, linkHealthFilter, activeOnly, debouncedSearch, sort, page, pageSize, router]);

    // Sync from Search Params
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

        const nextType = typeParam ? typeParamToEnum(typeParam) : '';
        const nextStatus = statusParam ? statusParam.toUpperCase() : '';
        const nextLinkHealth = (linkHealthParam === 'HEALTHY' || linkHealthParam === 'RETRYING' || linkHealthParam === 'BROKEN') ? linkHealthParam : '';
        const nextActiveOnly = activeOnlyParam === 'true';
        const nextSearch = qParam ?? '';
        const nextSort = sortParam || 'postedAt_desc';

        setTypeFilter(prev => prev === nextType ? prev : nextType);
        setStatusFilter(prev => prev === nextStatus ? prev : nextStatus);
        setLinkHealthFilter(prev => prev === nextLinkHealth ? prev : nextLinkHealth);
        setActiveOnly(prev => prev === nextActiveOnly ? prev : nextActiveOnly);
        setSearch(prev => prev === nextSearch ? prev : nextSearch);
        setSort(prev => prev === nextSort ? prev : nextSort);
        setPage(1);
    }, [searchParamsKey, searchParams]);

    // Update Search Params
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (typeFilter) params.set('type', enumToTypeParam(typeFilter)); else params.delete('type');
        if (statusFilter) params.set('status', statusFilter); else params.delete('status');
        if (linkHealthFilter) params.set('linkHealth', linkHealthFilter); else params.delete('linkHealth');
        if (activeOnly) params.set('activeOnly', 'true'); else params.delete('activeOnly');
        if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim()); else params.delete('q');
        if (sort) params.set('sort', sort); else params.delete('sort');

        const next = params.toString();
        if (next !== searchParamsKey) {
            isInternalUrlSyncRef.current = true;
            router.replace(`${pathname}?${next}`);
        }
    }, [typeFilter, statusFilter, linkHealthFilter, activeOnly, debouncedSearch, sort, searchParamsKey, searchParams, pathname, router]);

    return {
        opportunities,
        isLoading,
        hasLoadedOnce,
        typeFilter, setTypeFilter,
        statusFilter, setStatusFilter,
        linkHealthFilter, setLinkHealthFilter,
        activeOnly, setActiveOnly,
        search, setSearch,
        sort, setSort,
        page, setPage,
        totalCount,
        totalPages,
        exportUrl,
        loadOpportunities
    };
}
