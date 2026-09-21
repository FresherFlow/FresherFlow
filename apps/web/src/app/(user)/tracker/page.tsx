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
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import { CheckIcon, CurrencyRupeeIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import toast from 'react-hot-toast';
import { cn } from "@/ui/cn";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/Dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { getOpportunityDisplaySalary, parseOpportunityLocation } from '@/features/jobs/domain/opportunityDisplay';

// Primary Status Tabs
type TrackerTabKey = 'ALL' | 'SAVED' | 'APPLIED' | 'INTERVIEWED' | 'SELECTED' | 'REJECTED' | 'PLANNED';

interface StatusConfig {
    key: ActionType;
    label: string;
    badgeStyle: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
    ['SAVED']: {
        key: 'SAVED' as ActionType,
        label: 'Saved',
        badgeStyle: 'bg-muted text-muted-foreground dark:text-muted-foreground border-border',
    },
    [ActionType.APPLIED]: {
        key: ActionType.APPLIED,
        label: 'Applied',
        badgeStyle: 'bg-signal-heat/10 text-signal-heat dark:text-signal-heat border-signal-heat/20',
    },
    [ActionType.INTERVIEWED]: {
        key: ActionType.INTERVIEWED,
        label: 'Interviewing',
        badgeStyle: 'bg-brand-discord/10 text-brand-discord dark:text-brand-discord border-brand-discord/20',
    },
    [ActionType.SELECTED]: {
        key: ActionType.SELECTED,
        label: 'Offered',
        badgeStyle: 'bg-success/10 text-success dark:text-success border-success/20',
    },
    [ActionType.REJECTED]: {
        key: ActionType.REJECTED,
        label: 'Rejected',
        badgeStyle: 'bg-error/10 text-error dark:text-error border-error/20',
    },
    [ActionType.PLANNED]: {
        key: ActionType.PLANNED,
        label: 'Planned',
        badgeStyle: 'bg-warning/10 text-warning dark:text-warning border-warning/20',
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

// Local storage helper for job notes
const NOTES_STORAGE_KEY = 'ff_tracker_notes_v1';

function getStoredNotes(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveStoredNote(jobId: string, note: string) {
    if (typeof window === 'undefined') return;
    try {
        const current = getStoredNotes();
        if (note.trim()) {
            current[jobId] = note;
        } else {
            delete current[jobId];
        }
        window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(current));
    } catch {
        // ignore
    }
}

function TrackerNotesDialog({ jobId, companyName }: { jobId: string; companyName: string }) {
    const [note, setNote] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const notesMap = getStoredNotes();
            setNote(notesMap[jobId] || '');
        }
    }, [isOpen, jobId]);

    const handleSave = () => {
        saveStoredNote(jobId, note);
        toast.success('Notes saved');
        setIsOpen(false);
    };

    const hasNotes = !!getStoredNotes()[jobId];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'p-1.5 rounded-lg border flex items-center gap-1 text-xs font-medium active:scale-95 transition-all duration-150 ease-out',
                        hasNotes
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    )}
                    title={hasNotes ? 'View/Edit Notes' : 'Add Notes'}
                >
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Notes for {companyName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full h-36 p-3 text-xs rounded-xl border border-border/60 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                        placeholder="Add interview dates, recruiter contact details, or preparation notes..."
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            Save Notes
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="space-y-1">
                    <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Application Tracker</h1>
                        <span className="inline-flex items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-2.5 py-0.5 tabular-nums">
                            {trackedItems.length} Total
                        </span>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative min-w-60 sm:min-w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search applications..."
                        className="w-full h-9 pl-9 pr-3 text-xs bg-card/60 border border-border/60 rounded-xl placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                </div>
            </div>

            {/* Status Tabs Bar */}
            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-none border-b border-border/40">
                {TAB_OPTIONS.map((tab) => {
                    const count = tabCounts[tab.key];
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                'px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap border flex items-center gap-2 cursor-pointer active:scale-95 transition-all duration-150 ease-out',
                                isActive
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/80'
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                'text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums',
                                isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                            )}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* High-Density Table View */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-14 bg-card/40 border border-border/40 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4 max-w-xl mx-auto">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/50">
                        <BuildingOfficeIcon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-bold text-foreground">No applications in {TAB_OPTIONS.find(t => t.key === activeTab)?.label}</h2>
                        <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
                            Apply to opportunities from the job feed to automatically track your application pipeline.
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg hover:bg-primary/90 transition-all shadow"
                    >
                        Browse feed
                    </Link>
                </div>
            ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-border/60 bg-card/60 shadow-sm border-border/40">
                    <Table >
                        <TableHeader>
                            <TableRow >
                                <TableHead >Company & Role</TableHead>
                                <TableHead >Location</TableHead>
                                <TableHead >Salary</TableHead>
                                <TableHead >Stage</TableHead>
                                <TableHead >Updated</TableHead>
                                <TableHead >Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody >
                            {filteredItems.map((item) => {
                                const companyName = typeof item.company === 'string' ? item.company : (item.company as any)?.name || 'Company';
                                const locationInfo = parseOpportunityLocation(item.locations);
                                const salaryText = getOpportunityDisplaySalary(item);
                                const currentConfig = STATUS_CONFIGS[item.trackerStatus] || STATUS_CONFIGS[ActionType.APPLIED];

                                return (
                                    <TableRow key={item.id} >
                                        {/* Company & Role */}
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
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-muted-foreground truncate">{companyName}</p>
                                                    <Link
                                                        href={`/${item.slug || item.id}`}
                                                        className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Location */}
                                        <TableCell >
                                            <div className="flex items-center gap-1 max-w-40 truncate">
                                                <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{locationInfo.shortLabel}</span>
                                            </div>
                                        </TableCell>

                                        {/* Salary */}
                                        <TableCell >
                                            {salaryText ? (
                                                <div className="flex items-center gap-1 font-semibold text-foreground/80">
                                                    <CurrencyRupeeIcon className="w-3.5 h-3.5 shrink-0 text-success" />
                                                    <span>{salaryText}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/50">—</span>
                                            )}
                                        </TableCell>

                                        {/* Stage Selector Dropdown */}
                                        <TableCell >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer active:scale-95 transition-all duration-150 ease-out',
                                                            currentConfig.badgeStyle
                                                        )}
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
                                                            className={cn(
                                                                '  cursor-pointer flex items-center justify-between',
                                                                item.trackerStatus === cfg.key ? ' ' : ''
                                                            )}
                                                        >
                                                            <span>{cfg.label}</span>
                                                            {item.trackerStatus === cfg.key && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>

                                        {/* Updated Date */}
                                        <TableCell >
                                            {new Date(item.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </TableCell>

                                        {/* Action Buttons */}
                                        <TableCell >
                                            <div className="flex items-center justify-end gap-1.5">
                                                <TrackerNotesDialog jobId={item.id} companyName={companyName} />
                                                
                                                <Link
                                                    href={`/${item.slug || item.id}`}
                                                    target="_blank"
                                                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 active:scale-95 transition-all duration-150 ease-out"
                                                    title="View Opportunity"
                                                >
                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={() => void handleRemove(item.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-error rounded-lg hover:bg-error/10 active:scale-95 transition-all duration-150 ease-out"
                                                    title="Remove from tracker"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
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

export default function TrackerPage() {
    return (
        <UsernameGate>
            <TrackerPageContent />
        </UsernameGate>
    );
}
