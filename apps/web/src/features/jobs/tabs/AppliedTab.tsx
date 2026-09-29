'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useFirebaseTracker } from '@/features/dashboard/hooks/useFirebaseTracker';
import { useSavedJobs } from '@/features/dashboard/hooks/useSavedJobs';
import { fetchFeedIndex } from '@/lib/api/cdnFeed';
import { readFeedCache, getOpportunityFromCache } from '@/lib/cache/opportunitiesFeedCache';
import { ActionType } from '@fresherflow/types';
import type { Opportunity } from '@fresherflow/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import toast from 'react-hot-toast';
import { cn } from "@/ui/cn";
import { Button } from '@/ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';
import { SkeletonTrackerTable } from '@/features/jobs/components/OpportunitySkeletons';
import { JobSearchField } from '@/features/jobs/components/JobSearchField';
import { EmptyState } from '@/ui/EmptyState';
import { BrandButton } from '@/ui/BrandButton';

// Primary Status Tabs
type TrackerTabKey = 'ALL' | 'SAVED' | 'APPLIED' | 'INTERVIEWED' | 'SELECTED' | 'REJECTED' | 'PLANNED';

interface StatusConfig {
    key: ActionType;
    label: string;
}

// Stage color is gone on purpose: the status control is a plain bordered
// select in the reference's table. One neutral treatment for every stage.
const STATUS_CONFIGS: Record<string, StatusConfig> = {
    ['SAVED']: {
        key: 'SAVED' as ActionType,
        label: 'Saved',
    },
    [ActionType.APPLIED]: {
        key: ActionType.APPLIED,
        label: 'Applied',
    },
    [ActionType.INTERVIEWED]: {
        key: ActionType.INTERVIEWED,
        label: 'Interviewing',
    },
    [ActionType.SELECTED]: {
        key: ActionType.SELECTED,
        label: 'Offered',
    },
    [ActionType.REJECTED]: {
        key: ActionType.REJECTED,
        label: 'Rejected',
    },
    [ActionType.PLANNED]: {
        key: ActionType.PLANNED,
        label: 'Planned',
    },
};

const TAB_OPTIONS: { key: TrackerTabKey; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'SAVED', label: 'Saved' },
    { key: 'APPLIED', label: 'Applied' },
    { key: 'INTERVIEWED', label: 'Interviewing' },
    { key: 'SELECTED', label: 'Offered' },
    { key: 'REJECTED', label: 'Rejected' },
    { key: 'PLANNED', label: 'Planned' },
];

const normalizeStatus = (value: ActionType | string): ActionType => {
    if (value === ActionType.PLANNING || value === 'PLANNED') return ActionType.PLANNED;
    if (value === ActionType.ATTENDED || value === 'INTERVIEWED') return ActionType.INTERVIEWED;
    if (value === 'SELECTED' || value === 'OFFERED') return ActionType.SELECTED;
    if (value === 'REJECTED') return ActionType.REJECTED;
    return ActionType.APPLIED;
};

interface TrackedItem extends Opportunity {
    trackerStatus: ActionType | 'SAVED';
    updatedAt: number;
}

function TrackerPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { trackerMap, writeTrackerItem, removeTrackerItem } = useFirebaseTracker(user?.id);
    const { savedJobsMap, toggleSavedJob } = useSavedJobs(user?.id);

    const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>(() => {
        return readFeedCache()?.opportunities || [];
    });
    const [isLoading, setIsLoading] = useState(() => (readFeedCache()?.opportunities?.length || 0) === 0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TrackerTabKey>('ALL');

    useEffect(() => {
        async function loadFeed() {
            try {
                // Table view only needs card fields — lightweight index suffices.
                const feed = await fetchFeedIndex();
                if (feed?.opportunities) {
                    const cached = readFeedCache()?.opportunities || [];
                    const mergedMap = new Map<string, Opportunity>();
                    [...cached, ...feed.opportunities].forEach(o => mergedMap.set(o.id, o));
                    setAllOpportunities(Array.from(mergedMap.values()));
                }
            } catch (err) {
                console.error('Failed to fetch bootstrap feed:', err);
            } finally {
                setIsLoading(false);
            }
        }
        void loadFeed();
    }, []);

    // Combine tracker items with full opportunity details or fallback
    const trackedItems = useMemo(() => {
        const oppMap = new Map<string, Opportunity>();
        allOpportunities.forEach(o => oppMap.set(o.id, o));

        const list: TrackedItem[] = [];
        const seenIds = new Set<string>();

        Object.entries(trackerMap).forEach(([oppId, item]) => {
            const opp = oppMap.get(oppId) || getOpportunityFromCache(oppId) || (({
                id: oppId,
                title: 'Tracked Application',
                company: 'FresherFlow Opportunity',
                type: 'JOB',
                postedAt: new Date(item.updatedAt || Date.now()).toISOString(),
                batchYears: [2024, 2025, 2026],
                locations: ['Flexible / Remote'],
                requiredSkills: ['General'],
                applyUrl: '#',
                source: 'FresherFlow',
                freshness: 'RECENT',
                status: 'ACTIVE'
            } as unknown) as Opportunity);

            const normStatus = normalizeStatus(item.status);
            list.push({
                ...opp,
                trackerStatus: normStatus,
                updatedAt: item.updatedAt || Date.now(),
            });
            seenIds.add(oppId);
        });

        Object.entries(savedJobsMap).forEach(([oppId, isSaved]) => {
            if (isSaved && !seenIds.has(oppId)) {
                const opp = oppMap.get(oppId) || getOpportunityFromCache(oppId) || (({
                    id: oppId,
                    title: 'Saved Application',
                    company: 'FresherFlow Opportunity',
                    type: 'JOB',
                    postedAt: new Date().toISOString(),
                    batchYears: [2024, 2025, 2026],
                    locations: ['Flexible / Remote'],
                    requiredSkills: ['General'],
                    applyUrl: '#',
                    source: 'FresherFlow',
                    freshness: 'RECENT',
                    status: 'ACTIVE'
                } as unknown) as Opportunity);

                list.push({
                    ...opp,
                    trackerStatus: 'SAVED' as ActionType,
                    updatedAt: Date.now(),
                });
                seenIds.add(oppId);
            }
        });

        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }, [allOpportunities, trackerMap, savedJobsMap]);

    // Counts per status tab
    const tabCounts = useMemo(() => {
        const counts: Record<TrackerTabKey, number> = {
            ALL: trackedItems.length,
            SAVED: 0,
            APPLIED: 0,
            INTERVIEWED: 0,
            SELECTED: 0,
            REJECTED: 0,
            PLANNED: 0,
        };
        trackedItems.forEach((item) => {
            if (item.trackerStatus === 'SAVED') counts.SAVED++;
            else if (item.trackerStatus === ActionType.APPLIED) counts.APPLIED++;
            else if (item.trackerStatus === ActionType.INTERVIEWED) counts.INTERVIEWED++;
            else if (item.trackerStatus === ActionType.SELECTED) counts.SELECTED++;
            else if (item.trackerStatus === ActionType.REJECTED) counts.REJECTED++;
            else if (item.trackerStatus === ActionType.PLANNED) counts.PLANNED++;
        });
        return counts;
    }, [trackedItems]);

    // Filtered items based on active tab & search query
    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return trackedItems.filter((item) => {
            // Tab filter
            if (activeTab !== 'ALL') {
                if (activeTab === 'SAVED' && item.trackerStatus !== 'SAVED') return false;
                if (activeTab === 'APPLIED' && item.trackerStatus !== ActionType.APPLIED) return false;
                if (activeTab === 'INTERVIEWED' && item.trackerStatus !== ActionType.INTERVIEWED) return false;
                if (activeTab === 'SELECTED' && item.trackerStatus !== ActionType.SELECTED) return false;
                if (activeTab === 'REJECTED' && item.trackerStatus !== ActionType.REJECTED) return false;
                if (activeTab === 'PLANNED' && item.trackerStatus !== ActionType.PLANNED) return false;
            }

            // Search filter
            if (query) {
                const companyName = typeof item.company === 'string' ? item.company : (item.company as any)?.name || '';
                const locationStr = Array.isArray(item.locations) ? item.locations.join(' ') : '';
                return (
                    item.title.toLowerCase().includes(query) ||
                    companyName.toLowerCase().includes(query) ||
                    locationStr.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [trackedItems, activeTab, searchQuery]);

    const handleStatusChange = async (jobId: string, targetStatus: ActionType) => {
        try {
            await writeTrackerItem(jobId, targetStatus);
            toast.success(`Stage updated to ${STATUS_CONFIGS[targetStatus]?.label || targetStatus}`);
        } catch {
            toast.error('Failed to update stage');
        }
    };

    const handleRemove = async (jobId: string) => {
        try {
            if (trackerMap[jobId]) {
                await removeTrackerItem(jobId);
            }
            if (savedJobsMap[jobId]) {
                await toggleSavedJob(jobId);
            }
            toast.success('Removed from tracker');
        } catch {
            toast.error('Failed to remove item');
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                <div className="space-y-1">
                    <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Application Tracker</h1>
                    </div>
                </div>

                {/* Search Bar */}
                <JobSearchField
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search applications..."
                    aria-label="Search applications"
                    className="min-w-60 sm:min-w-72"
                />
            </div>

            {/* Status Tabs Bar */}
            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none">
                {TAB_OPTIONS.map((tab) => {
                    const count = tabCounts[tab.key];
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap border flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 duration-150 ease-out',
                                isActive
                                    ? 'border-foreground/30 bg-muted text-foreground'
                                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/20'
                            )}
                        >
                            {tab.label}
                            <span className="text-xs tabular-nums text-muted-foreground">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* High-Density Table View */}
            {isLoading ? (
                <SkeletonTrackerTable />
            ) : filteredItems.length === 0 ? (
                /* Uses the shared `EmptyState` rather than its own dashed
                   panel, so it inherits the brand box treatment. The tracker
                   needs a building icon, not the default search or inbox, so the
                   icon is passed through the action slot's sibling below. */
                <EmptyState
                    icon="inbox"
                    size="md"
                    title={`No applications in ${TAB_OPTIONS.find((t) => t.key === activeTab)?.label}`}
                    description="Apply to opportunities from the job feed to automatically track your application pipeline."
                    action={
                        <BrandButton asChild variant="neutral" size="sm">
                            <Link href="/jobs">Browse feed</Link>
                        </BrandButton>
                    }
                    className="mx-auto max-w-xl"
                />
            ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card/60 shadow-sm border-border/40">
                    <Table >
                        <TableHeader>
                            <TableRow >
                                <TableHead >Company</TableHead>
                                <TableHead >Role</TableHead>
                                <TableHead >Location</TableHead>
                                <TableHead >Status</TableHead>
                                <TableHead >Date</TableHead>
                                <TableHead >Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody >
                            {filteredItems.map((item) => {
                                const companyName = typeof item.company === 'string' ? item.company : (item.company as any)?.name || 'Company';
                                const locationInfo = parseOpportunityLocation(item.locations);
                                const currentConfig = STATUS_CONFIGS[item.trackerStatus] || STATUS_CONFIGS[ActionType.APPLIED];
                                const jobHref = `/${item.slug || item.id}`;
                                const applyHref = item.applyLink && item.applyLink !== '#' ? item.applyLink : null;

                                return (
                                    <TableRow key={item.id} >
                                        {/* Company */}
                                        <TableCell >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="shrink-0">
                                                    <CompanyLogo
                                                        companyName={companyName}
                                                        companyWebsite={item.companyWebsite}
                                                        companyLogoUrl={item.companyLogoUrl}
                                                        className="!w-9 !h-9"
                                                    />
                                                </div>
                                                <span className="text-sm text-foreground truncate">{companyName}</span>
                                            </div>
                                        </TableCell>

                                        {/* Role */}
                                        <TableCell >
                                            <Link
                                                href={jobHref}
                                                className="text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                                            >
                                                {item.title}
                                            </Link>
                                        </TableCell>

                                        {/* Location */}
                                        <TableCell >
                                            <div className="flex items-center gap-1 max-w-40 truncate">
                                                <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{locationInfo.shortLabel}</span>
                                            </div>
                                        </TableCell>

                                        {/* Status selector */}
                                        <TableCell >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-background text-xs font-medium text-foreground hover:bg-muted cursor-pointer active:scale-95 transition-colors duration-150 ease-out"
                                                    >
                                                        <span>{currentConfig.label}</span>
                                                        <ChevronDownIcon className="w-3 h-3 opacity-70" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-40 z-50">
                                                    {Object.values(STATUS_CONFIGS).map((cfg) => (
                                                        <DropdownMenuItem
                                                            key={cfg.key}
                                                            onClick={() => void handleStatusChange(item.id, cfg.key)}
                                                            className="cursor-pointer flex items-center justify-between"
                                                        >
                                                            <span>{cfg.label}</span>
                                                            {item.trackerStatus === cfg.key && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>

                                        {/* Stage-aware date. The column used to be
                                            headed "Applied" and printed a bare date
                                            for every row, so a row still sitting at
                                            "Saved" claimed an application date it
                                            never had. Prefixing the stage label
                                            keeps the header honest. */}
                                        <TableCell >
                                            <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                                                {currentConfig.label}{' '}
                                                {new Date(item.updatedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell >
                                            <div className="flex items-center justify-end gap-1.5">
                                                {applyHref ? (
                                                    <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                                                        <a href={applyHref} target="_blank" rel="noreferrer">
                                                            Apply URL
                                                            <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                                        </a>
                                                    </Button>
                                                ) : null}
                                                <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                                                    <Link href={jobHref} target="_blank">
                                                        Job
                                                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                                    </Link>
                                                </Button>

                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemove(item.id)}
                                                    aria-label="Remove from tracker"
                                                    title="Remove from tracker"
                                                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}

export default function AppliedTab() {
    return <TrackerPageContent />;
}
