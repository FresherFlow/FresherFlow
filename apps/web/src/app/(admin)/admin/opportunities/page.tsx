'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import type { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { AdminOpportunitiesSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/lib/hooks/useDebounce';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { getOpportunityPath } from '@/lib/opportunityPath';
import {
    PlusCircleIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    CalendarIcon,
    AdjustmentsHorizontalIcon,
    TrashIcon,
    ClockIcon,
    PencilSquareIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    EyeIcon,
    DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import {
    expireOpportunityAction,
    updateOpportunityAction,
    deleteOpportunityAction,
    bulkOpportunityAction,
    restoreOpportunityAction
} from '@/features/jobs/actions/opportunity';

export default function AdminOpportunitiesPage() {
    return (
        <Suspense fallback={<AdminOpportunitiesSkeleton />}>
            <OpportunitiesListPage />
        </Suspense>
    );
}

function OpportunitiesListPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamsKey = searchParams.toString();
    const pathname = usePathname();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('postedAt_desc');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 20;
    const debouncedSearch = useDebounce(search, 300);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkActionPending, setBulkActionPending] = useState(false);
    const [bulkActionLabel, setBulkActionLabel] = useState('');
    const [lastBulkResult, setLastBulkResult] = useState<{
        action: string;
        requestedCount: number;
        updatedCount: number;
        skippedCount: number;
        at: number;
    } | null>(null);
    const exportUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (typeFilter) params.set('type', enumToTypeParam(typeFilter));
        if (statusFilter) params.set('status', statusFilter);
        const query = params.toString();
        return `${process.env.NEXT_PUBLIC_API_URL}/api/admin/opportunities/export${query ? `?${query}` : ''}`;
    }, [typeFilter, statusFilter]);

    const typeParamToEnum = (value: string) => {
        const v = value.toLowerCase();
        if (v === 'job' || v === 'jobs') return 'JOB';
        if (v === 'internship' || v === 'internships') return 'INTERNSHIP';
        if (v === 'walk-in' || v === 'walkin' || v === 'walkins' || v === 'walk-ins') return 'WALKIN';
        return value.toUpperCase();
    };

    const enumToTypeParam = (value: string) => {
        if (value === 'JOB') return 'job';
        if (value === 'INTERNSHIP') return 'internship';
        if (value === 'WALKIN') return 'walk-in';
        return value.toLowerCase();
    };

    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        action: () => void;
        type: 'danger' | 'warning';
        confirmText: string;
    }>({
        show: false,
        title: '',
        message: '',
        action: () => { },
        type: 'warning',
        confirmText: 'Confirm'
    });

    useEffect(() => {
        const typeParam = searchParams.get('type');
        const statusParam = searchParams.get('status');
        const qParam = searchParams.get('q');
        const sortParam = searchParams.get('sort');
        const nextType = typeParam ? typeParamToEnum(typeParam) : '';
        const nextStatus = statusParam ? statusParam.toUpperCase() : '';
        const nextSearch = qParam ?? '';
        const nextSort = sortParam || 'postedAt_desc';

        setTypeFilter((prev) => (prev === nextType ? prev : nextType));
        setStatusFilter((prev) => (prev === nextStatus ? prev : nextStatus));
        setSearch((prev) => (prev === nextSearch ? prev : nextSearch));
        setSort((prev) => (prev === nextSort ? prev : nextSort));
        setPage((prev) => (prev === 1 ? prev : 1));
    }, [searchParamsKey, searchParams]);

    const loadOpportunities = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = (await adminApi.getOpportunities({
                type: typeFilter || undefined,
                status: statusFilter || undefined,
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
            toast.error(` ${errorMsg}`);

            if (errorMsg.includes('403') || errorMsg.includes('Unauthorized')) {
                toast.error('Session expired. Please log in again.');
                setTimeout(() => router.push('/admin/login'), 1500);
            }
        } finally {
            setIsLoading(false);
        }
    }, [typeFilter, statusFilter, debouncedSearch, sort, page, router]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
            return;
        }
        void loadOpportunities();
    }, [isAuthenticated, loadOpportunities, router]);

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (typeFilter) params.set('type', enumToTypeParam(typeFilter));
        else params.delete('type');
        if (statusFilter) params.set('status', statusFilter);
        else params.delete('status');
        if (search.trim()) params.set('q', search.trim());
        else params.delete('q');
        if (sort) params.set('sort', sort);
        else params.delete('sort');

        const next = params.toString();
        const current = searchParamsKey;
        if (next !== current) {
            router.replace(`${pathname}?${next}`);
        }
    }, [typeFilter, statusFilter, search, sort, searchParams, searchParamsKey, pathname, router]);


    const handleExpire = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Expire Opportunity',
            message: `Are you sure you want to mark "${title}" as EXPIRED? This will move it to the expired tab and hide it from the active feed.`,
            type: 'warning',
            confirmText: 'Expire listing',
            action: async () => {
                const loadingToast = toast.loading(' Updating status...');
                try {
                    const res = await expireOpportunityAction(id);
                    if (!res.success) throw new Error(res.error);

                    toast.success('Opportunity marked as expired', { id: loadingToast });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(` Failed: ${(err as Error).message}`, { id: loadingToast });
                }
            }
        });
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const loadingToast = toast.loading(`Updating to ${newStatus}...`);
        try {
            // TypeScript might complain about string vs explicit enum, but passing string works for now or casting
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = await updateOpportunityAction(id, { status: newStatus as any });
            if (!res.success) throw new Error(res.error);

            toast.success(` Listing updated to ${newStatus}`, { id: loadingToast });
            loadOpportunities();
        } catch (err: unknown) {
            toast.error(` Failed: ${(err as Error).message}`, { id: loadingToast });
        }
    };

    const handleDelete = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Remove Opportunity',
            message: `!! DANGER: Are you sure you want to REMOVE "${title}"? This is a soft-delete and will hide it from all users immediately.`,
            type: 'danger',
            confirmText: 'Remove listing',
            action: async () => {
                const loadingToast = toast.loading(' Removing listing...');
                try {
                    const res = await deleteOpportunityAction(id, 'Removed by admin via dashboard');
                    if (!res.success) throw new Error(res.error);

                    toast.success('Opportunity removed', { id: loadingToast });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(` Failed: ${(err as Error).message}`, { id: loadingToast });
                }
            }
        });
    };

    const handleBulkAction = async (action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE') => {
        if (selectedIds.length === 0) return;

        const actionNames = {
            'DELETE': 'remove',
            'ARCHIVE': 'archive',
            'PUBLISH': 'publish',
            'EXPIRE': 'expire'
        };

        setConfirmModal({
            show: true,
            title: `Bulk ${action.charAt(0) + action.slice(1).toLowerCase()}`,
            message: `Are you sure you want to ${actionNames[action]} ${selectedIds.length} listings? This action cannot be easily undone.`,
            type: action === 'DELETE' ? 'danger' : 'warning',
            confirmText: `Yes, ${action.toLowerCase()} all`,
            action: async () => {
                const loadingToast = toast.loading(` Processing bulk ${action.toLowerCase()}...`);
                try {
                    setBulkActionPending(true);
                    setBulkActionLabel(actionNames[action]);
                    const selectedCount = selectedIds.length;
                    const res = await bulkOpportunityAction(selectedIds, action);
                    if (!res.success) throw new Error(res.error);

                    const requestedCount = res.requestedCount ?? selectedCount;
                    const updatedCount = res.updatedCount ?? 0;
                    const skippedCount = res.skippedCount ?? Math.max(0, requestedCount - updatedCount);

                    setLastBulkResult({
                        action,
                        requestedCount,
                        updatedCount,
                        skippedCount,
                        at: Date.now()
                    });

                    toast.success(
                        skippedCount > 0
                            ? `${updatedCount}/${requestedCount} updated, ${skippedCount} skipped`
                            : `${updatedCount} listings updated`,
                        { id: loadingToast }
                    );
                    setSelectedIds([]);
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(` Failed: ${(err as Error).message}`, { id: loadingToast });
                } finally {
                    setBulkActionPending(false);
                    setBulkActionLabel('');
                }
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === displayOpportunities.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(displayOpportunities.map(o => o.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Admin preview should match exactly what a user sees on the public detail route.
    const getPublicOpportunityHref = (opp: { id: string; slug?: string | null; type?: Opportunity['type'] }) =>
        getOpportunityPath(opp.type, opp.slug || opp.id);
    const getPublicOpportunityUrl = (opp: { id: string; slug?: string | null; type?: Opportunity['type'] }) => {
        const configuredOrigin =
            process.env.NEXT_PUBLIC_SITE_URL
            || process.env.NEXT_PUBLIC_APP_URL
            || 'https://fresherflow.in';
        const origin = /localhost|127\.0\.0\.1/i.test(configuredOrigin)
            ? 'https://fresherflow.in'
            : configuredOrigin;
        return `${origin}${getPublicOpportunityHref(opp)}`;
    };

    type SocialOpportunity = Pick<Opportunity, 'id' | 'slug' | 'type' | 'title' | 'company' | 'locations' | 'allowedPassoutYears'>;

    const buildSocialCaption = (opp: SocialOpportunity) => {
        const normalizedLocations = (opp.locations || []).map((value: string) => String(value).trim()).filter(Boolean);
        const locationLine = normalizedLocations.length > 1 ? normalizedLocations.join(' | ') : (normalizedLocations[0] || 'Remote');
        const years = Array.isArray(opp.allowedPassoutYears)
            ? [...opp.allowedPassoutYears].filter((year: number) => Number.isFinite(year)).sort((a: number, b: number) => a - b)
            : [];
        const batch = years.length > 0 ? years.join(', ') : 'Any';
        const locationTag = normalizedLocations.length === 1
            ? `#${normalizedLocations[0].replace(/[^a-zA-Z0-9]/g, '')}Jobs`
            : '';
        const hashtags = ['#FresherJobs', locationTag, '#FresherFlow'].filter(Boolean).join(' ');

        return [
            `${opp.title} - at ${opp.company}`,
            `location: ${locationLine}`,
            '',
            `Batch: ${batch}`,
            '',
            `Apply: ${getPublicOpportunityUrl(opp)}`,
            '',
            hashtags,
        ].join('\n');
    };

    const copySocialCaption = async (opp: SocialOpportunity) => {
        try {
            await navigator.clipboard.writeText(buildSocialCaption(opp));
            toast.success('Social caption copied.');
        } catch {
            toast.error('Could not copy caption.');
        }
    };

    const formatLinkHealth = (health?: string) => {
        if (!health) return 'Unknown';
        return health.toUpperCase();
    };

    const linkHealthClass = (health?: string) => {
        if (health === 'HEALTHY') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
        if (health === 'RETRYING') return 'bg-amber-50 text-amber-700 ring-amber-600/20';
        if (health === 'BROKEN') return 'bg-rose-50 text-rose-700 ring-rose-600/20';
        return 'bg-slate-50 text-slate-600 ring-slate-500/10';
    };

    const formatLastVerified = (value?: string | Date | null) => {
        if (!value) return 'Never';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Never';
        return date.toLocaleString();
    };

    const isOpportunityExpired = (opp: { expiresAt?: string | Date | null; expiredAt?: string | Date | null }) => {
        if (opp.expiredAt) return true;
        if (!opp.expiresAt) return false;
        return new Date(opp.expiresAt).getTime() <= Date.now();
    };

    const getStatusLabel = (opp: Opportunity & { expiredAt?: string | Date | null; deletedAt?: string | Date | null }) => {
        if (opp.deletedAt) return 'DELETED';
        if (opp.status === 'ARCHIVED') return 'ARCHIVED';
        if (isOpportunityExpired(opp)) return 'EXPIRED';
        if (opp.status === 'PUBLISHED') return 'LIVE';
        return opp.status;
    };

    const getStatusBadgeClass = (opp: Opportunity & { expiredAt?: string | Date | null; deletedAt?: string | Date | null }) => {
        const label = getStatusLabel(opp);
        if (label === 'DELETED') return 'bg-slate-100 text-slate-700 ring-slate-300';
        if (label === 'EXPIRED') return 'bg-orange-50 text-orange-700 ring-orange-600/10';
        if (label === 'ARCHIVED') return 'bg-rose-50 text-rose-700 ring-rose-600/10';
        if (label === 'LIVE') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
        return 'bg-slate-50 text-slate-600 ring-slate-500/10';
    };

    if (!isAuthenticated) return null;

    const computedTotalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
    const effectiveTotalPages = totalPages || computedTotalPages;
    const hasNextPage = page < effectiveTotalPages;
    const displayOpportunities = [...opportunities].sort((a, b) => {
        const aArchived = getStatusLabel(a) === 'ARCHIVED' ? 1 : 0;
        const bArchived = getStatusLabel(b) === 'ARCHIVED' ? 1 : 0;
        return aArchived - bArchived;
    });

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header - Hidden on Mobile */}
            <div className="hidden md:flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Listings</h1>
                    <p className="text-sm text-muted-foreground">Manage listings and keep the feed accurate.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadOpportunities()}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        title="Refresh List"
                    >
                        <ArrowPathIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <a
                        href={exportUrl}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <DocumentTextIcon className="w-4 h-4 mr-2" />
                        Export CSV
                    </a>
                    <Link href="/admin/opportunities/create" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                        <PlusCircleIcon className="w-4 h-4 mr-2" />
                        New listing
                    </Link>
                </div>
            </div>

            {lastBulkResult && (
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                    Last bulk {lastBulkResult.action.toLowerCase()}:
                    <span className="ml-1 font-semibold text-foreground">{lastBulkResult.updatedCount}</span>
                    {' '}updated
                    {lastBulkResult.skippedCount > 0 && (
                        <>
                            , <span className="font-semibold text-amber-700">{lastBulkResult.skippedCount}</span> skipped
                        </>
                    )}
                    {' '}out of {lastBulkResult.requestedCount} ({new Date(lastBulkResult.at).toLocaleTimeString()}).
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="flex flex-col gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-4 duration-300 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                                {selectedIds.length}
                            </div>
                            <span className="text-sm font-medium text-primary">Selected listings</span>
                            {bulkActionPending && (
                                <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    Working on {bulkActionLabel || 'update'}...
                                </span>
                            )}
                        </div>
                        <div className="hidden h-4 w-[1px] bg-primary/20 md:block" />
                        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center">
                            <button
                                onClick={() => handleBulkAction('PUBLISH')}
                                disabled={bulkActionPending}
                                className="h-8 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {bulkActionPending ? 'Working...' : 'Publish all'}
                            </button>
                            <button
                                onClick={() => handleBulkAction('ARCHIVE')}
                                disabled={bulkActionPending}
                                className="h-8 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {bulkActionPending ? 'Working...' : 'Archive all'}
                            </button>
                            <button
                                onClick={() => handleBulkAction('DELETE')}
                                disabled={bulkActionPending}
                                className="h-8 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                            >
                                {bulkActionPending ? 'Working...' : 'Delete all'}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedIds([])}
                        disabled={bulkActionPending}
                        className="self-start text-xs font-medium text-muted-foreground hover:text-foreground px-2 disabled:opacity-60 disabled:cursor-not-allowed md:self-auto"
                    >
                        Clear selection
                    </button>
                </div>
            )}

            {/* Quick Toggle - Hidden on Mobile to avoid duplicates */}
            <div className="hidden md:flex items-center gap-2">
                <button
                    onClick={() => setTypeFilter('JOB')}
                    className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors border ${typeFilter === 'JOB'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                >
                    Jobs
                </button>
                <button
                    onClick={() => setTypeFilter('WALKIN')}
                    className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors border ${typeFilter === 'WALKIN'
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                >
                    Walk-ins
                </button>
                <button
                    onClick={() => setTypeFilter('')}
                    className="inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                    All types
                </button>
            </div>

            {/* Filters Bar - Sticky on Mobile & Desktop */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md md:relative md:top-auto md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent space-y-3">
                <div className="flex flex-col gap-3 md:bg-card md:border md:border-border md:p-4 md:rounded-lg md:flex-row md:items-center md:gap-4 md:shadow-none">
                    <div className="relative flex-1 w-full">
                        <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                            placeholder="Search listings..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    {/* Filters - Grid on mobile, Flex on desktop */}
                    <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto md:gap-2">
                        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-muted-foreground px-2">
                            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                            Filters
                        </div>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="h-9 w-full md:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="">All types</option>
                            <option value="JOB">Jobs</option>
                            <option value="INTERNSHIP">Internships</option>
                            <option value="WALKIN">Walk-ins</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 w-full md:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="">All status</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="EXPIRED">Expired</option>
                            <option value="ARCHIVED">Archived</option>
                            <option value="DELETED">Deleted</option>
                        </select>

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="h-9 w-full md:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="postedAt_desc">Newest</option>
                            <option value="postedAt_asc">Oldest</option>
                            <option value="company_asc">AZ</option>
                            <option value="company_desc">ZA</option>
                        </select>

                        <button
                            onClick={() => {
                                setTypeFilter('');
                                setStatusFilter('');
                                setSearch('');
                                setSort('postedAt_desc');
                                setPage(1);
                            }}
                            className="h-9 px-3 rounded-md border border-input bg-background text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Table/List */}
            {isLoading && !hasLoadedOnce ? (
                <AdminOpportunitiesSkeleton />
            ) : opportunities.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-lg p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-foreground">No listings found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Start by creating a new job, internship or walk-in to start the flow for freshers.
                    </p>
                    <Link href="/admin/opportunities/create" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                        <PlusCircleIcon className="w-4 h-4 mr-2" />
                        Quick Create
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {displayOpportunities.map((opp) => (
                            <div key={opp.id} className="bg-card rounded-lg border border-border p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            onClick={() => toggleSelect(opp.id)}
                                            className={`w-4 h-4 mt-1 rounded border transition-colors cursor-pointer flex-shrink-0 flex items-center justify-center ${selectedIds.includes(opp.id)
                                                ? 'bg-primary border-primary'
                                                : 'border-muted-foreground/30 hover:border-primary'
                                                }`}
                                        >
                                            {selectedIds.includes(opp.id) && (
                                                <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                            )}
                                        </div>
                                        <CompanyLogo
                                            companyName={opp.company}
                                            companyWebsite={opp.companyWebsite}
                                            applyLink={opp.applyLink}
                                            className="w-9 h-9 rounded-md flex-shrink-0"
                                        />
                                        <div>
                                            <div className="font-medium text-foreground">{opp.title}</div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                                <span>{opp.company}</span>
                                                <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                                                    {opp.type}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                                        {getStatusLabel(opp)}
                                    </span>
                                </div>

                                <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <MapPinIcon className="w-3 h-3" />
                                        <span className="truncate">{opp.locations.join(', ')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(opp.postedAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${linkHealthClass(opp.linkHealth)}`}>
                                            {formatLinkHealth(opp.linkHealth)}
                                        </span>
                                        <span className="text-[10px]">Fails: {opp.verificationFailures ?? 0}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Verified: {formatLastVerified(opp.lastVerifiedAt)}
                                    </div>
                                </div>

                                <div className="mt-3 space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => void copySocialCaption(opp)}
                                        className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                        title="Copy social caption"
                                    >
                                        <DocumentDuplicateIcon className="w-4 h-4 mr-1.5" />
                                        Copy
                                    </button>
                                    <Link
                                        href={getPublicOpportunityHref(opp)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                        title="View as user"
                                    >
                                        <EyeIcon className="w-4 h-4 mr-1.5" />
                                        View
                                    </Link>
                                    <Link
                                        href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                                        className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="w-4 h-4 mr-1.5" />
                                        Edit
                                    </Link>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                    {opp.status === 'DRAFT' && (
                                        <button
                                            onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')}
                                            className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                            title="Publish Now"
                                        >
                                            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                            Publish
                                        </button>
                                    )}
                                    {opp.status === 'PUBLISHED' && (
                                        <button
                                            onClick={() => handleExpire(opp.id, opp.title)}
                                            className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                            title="Expire"
                                        >
                                            <ClockIcon className="w-4 h-4 mr-1.5" />
                                            Expire
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(opp.id, opp.title)}
                                        className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100"
                                        title="Remove"
                                    >
                                        <TrashIcon className="w-4 h-4 mr-1.5" />
                                        Remove
                                    </button>
                                    {getStatusLabel(opp) === 'DELETED' && (
                                        <button
                                            onClick={async () => {
                                                const loadingToast = toast.loading('Restoring listing...');
                                                const res = await restoreOpportunityAction(opp.id);
                                                if (!res.success) {
                                                    toast.error(`Failed: ${res.error}`, { id: loadingToast });
                                                    return;
                                                }
                                                toast.success('Listing restored', { id: loadingToast });
                                                loadOpportunities();
                                            }}
                                            className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                            title="Restore"
                                        >
                                            <ArrowPathIcon className="w-4 h-4 mr-1.5" />
                                            Restore
                                        </button>
                                    )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="group px-5 py-3 w-10">
                                        <div
                                            onClick={bulkActionPending ? undefined : toggleSelectAll}
                                            className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${bulkActionPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedIds.length === displayOpportunities.length && displayOpportunities.length > 0
                                                ? 'bg-primary border-primary'
                                                : 'border-muted-foreground/30 hover:border-primary'
                                                }`}
                                        >
                                            {selectedIds.length === displayOpportunities.length && displayOpportunities.length > 0 && (
                                                <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Opportunity</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Details</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                                    <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {displayOpportunities.map((opp) => (
                                    <tr key={opp.id} className={`hover:bg-muted/50 transition-colors group ${selectedIds.includes(opp.id) ? 'bg-primary/5' : ''}`}>
                                        <td className="px-5 py-4">
                                            <div
                                                onClick={bulkActionPending ? undefined : () => toggleSelect(opp.id)}
                                                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${bulkActionPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedIds.includes(opp.id)
                                                    ? 'bg-primary border-primary'
                                                    : 'border-muted-foreground/30 hover:border-primary'
                                                    }`}
                                            >
                                                {selectedIds.includes(opp.id) && (
                                                    <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <CompanyLogo
                                                    companyName={opp.company}
                                                    companyWebsite={opp.companyWebsite}
                                                    applyLink={opp.applyLink}
                                                    className="w-8 h-8 rounded-md flex-shrink-0"
                                                />
                                                <div>
                                                    <div className="font-medium text-foreground">{opp.title}</div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                                        <span>{opp.company}</span>
                                                        <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                                                            {opp.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <MapPinIcon className="w-3 h-3" />
                                                    <span className="truncate max-w-[200px]">{opp.locations.join(', ')}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {new Date(opp.postedAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${linkHealthClass(opp.linkHealth)}`}>
                                                        {formatLinkHealth(opp.linkHealth)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Fails: {opp.verificationFailures ?? 0}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Verified: {formatLastVerified(opp.lastVerifiedAt)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                                                {getStatusLabel(opp)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => void copySocialCaption(opp)}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                                    title="Copy social caption"
                                                >
                                                    <DocumentDuplicateIcon className="w-4 h-4" />
                                                </button>
                                                <Link
                                                    href={getPublicOpportunityHref(opp)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                                    title="View as user"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </Link>
                                                {opp.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')}
                                                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-all"
                                                        title="Publish Now"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {opp.status === 'PUBLISHED' && (
                                                    <button
                                                        onClick={() => handleExpire(opp.id, opp.title)}
                                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                                        title="Expire"
                                                    >
                                                        <ClockIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(opp.id, opp.title)}
                                                    className="p-2 text-rose-700 hover:bg-rose-50 rounded-md transition-all"
                                                    title="Remove"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                                {getStatusLabel(opp) === 'DELETED' && (
                                                    <button
                                                        onClick={async () => {
                                                            const loadingToast = toast.loading('Restoring listing...');
                                                            const res = await restoreOpportunityAction(opp.id);
                                                            if (!res.success) {
                                                                toast.error(`Failed: ${res.error}`, { id: loadingToast });
                                                                return;
                                                            }
                                                            toast.success('Listing restored', { id: loadingToast });
                                                            loadOpportunities();
                                                        }}
                                                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-all"
                                                        title="Restore"
                                                    >
                                                        <ArrowPathIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="text-xs text-muted-foreground order-2 md:order-1">
                                Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span> results
                            </div>
                            <div className="flex items-center gap-1.5 order-1 md:order-2">
                                <button
                                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                    disabled={page === 1}
                                    className="h-8 px-3 rounded border border-input bg-background text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(Math.min(5, effectiveTotalPages))].map((_, i) => {
                                        let pageNum = page;
                                        if (effectiveTotalPages <= 5) pageNum = i + 1;
                                        else if (page <= 3) pageNum = i + 1;
                                        else if (page >= effectiveTotalPages - 2) pageNum = effectiveTotalPages - 4 + i;
                                        else pageNum = page - 2 + i;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${page === pageNum
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'border border-input bg-background hover:bg-accent'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(prev => Math.min(effectiveTotalPages, prev + 1))}
                                    disabled={!hasNextPage}
                                    className="h-8 px-3 rounded border border-input bg-background text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{confirmModal.message}</p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                                className="flex-1 h-10 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.action}
                                className={`flex-1 h-10 px-4 rounded-md text-sm font-medium transition-opacity hover:opacity-90 ${confirmModal.type === 'danger' ? 'bg-rose-600 text-white shadow-rose-200' : 'bg-primary text-primary-foreground shadow-primary/20 shadow-lg'}`}
                            >
                                {confirmModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ExclamationTriangleIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
        </svg>
    );
}
