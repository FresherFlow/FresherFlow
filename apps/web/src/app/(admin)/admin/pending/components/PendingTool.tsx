'use client';

import { useState, useEffect } from 'react';
import { 
    SparklesIcon, 
    MagnifyingGlassIcon, 
    CpuChipIcon, 
    ArrowPathIcon,
    CheckCircleIcon,
    ClockIcon,
    XMarkIcon,
    CheckIcon,
    DocumentTextIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    CurrencyRupeeIcon,
    ArrowTopRightOnSquareIcon,
    FunnelIcon,
    CodeBracketIcon
} from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { useTheme } from '@/lib/providers/ThemeContext';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../../opportunities/components/ConfirmModal';
import { cn } from '@repo/ui/utils/cn';

interface PendingToolProps {
    initialJobs?: any[];
    initialRuns?: any[];
}

export type StatusCategory = 'all' | 'PENDING_REVIEW' | 'DRAFT' | 'PROCESSING' | 'VERIFIED';

export function normalizeStatus(status?: string): 'PENDING_REVIEW' | 'DRAFT' | 'PROCESSING' | 'VERIFIED' {
    if (!status) return 'PENDING_REVIEW';
    const upper = status.toUpperCase();
    if (upper === 'APPROVED' || upper === 'PUBLISHED' || upper === 'VERIFIED') return 'VERIFIED';
    if (upper === 'DRAFT') return 'DRAFT';
    if (upper === 'PROCESSING' || upper === 'DISCOVERED') return 'PROCESSING';
    return 'PENDING_REVIEW';
}

export function getStatusBadge(status?: string) {
    const norm = normalizeStatus(status);
    switch (norm) {
        case 'VERIFIED':
            return {
                label: 'Verified',
                badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                dotClass: 'bg-emerald-500',
            };
        case 'DRAFT':
            return {
                label: 'Draft',
                badgeClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
                dotClass: 'bg-zinc-400',
            };
        case 'PROCESSING':
            return {
                label: 'Processing',
                badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                dotClass: 'bg-blue-500 animate-pulse',
            };
        case 'PENDING_REVIEW':
        default:
            return {
                label: 'Pending Verification',
                badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                dotClass: 'bg-amber-500',
            };
    }
}

export default function PendingTool({ initialJobs = [], initialRuns = [] }: PendingToolProps) {
    const { theme, toggleTheme } = useTheme();
    const [jobs, setJobs] = useState<any[]>(initialJobs);
    const [runs, setRuns] = useState<any[]>(initialRuns);
    const [activePanel, setActivePanel] = useState<'jobs' | 'runs'>('jobs');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusCategory>('all');
    const [activeSource, setActiveSource] = useState<string>('all');
    const [activeType, setActiveType] = useState<string>('all');
    const [activeJobId, setActiveJobId] = useState<string | null>(
        initialJobs && initialJobs.length > 0 ? initialJobs[0].id : null
    );
    const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'description' | 'raw'>('overview');

    // Sync initialJobs if prop changes
    useEffect(() => {
        if (initialJobs && initialJobs.length > 0) {
            setJobs(initialJobs);
            if (!activeJobId) {
                setActiveJobId(initialJobs[0].id);
            }
        }
    }, [initialJobs]);

    // Client fetch if initialJobs was empty or on manual refresh
    const fetchPendingData = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/pending?status=all');
            if (res.ok) {
                const data = await res.json();
                setJobs(data.jobs || []);
                setRuns(data.runs || []);
                if (data.jobs && data.jobs.length > 0 && !activeJobId) {
                    setActiveJobId(data.jobs[0].id);
                }
                toast.success('Refreshed pending queue');
            } else {
                toast.error('Failed to fetch pending data');
            }
        } catch (err: any) {
            console.error('Error fetching pending data:', err);
            toast.error('Failed to fetch pending data');
        } finally {
            setIsRefreshing(false);
        }
    };

    const toggleCollapseDate = (date: string) => {
        setCollapsedDates(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const handleUpdateStatus = async (jobId: string, newStatus: string) => {
        setIsUpdatingStatus(jobId);
        const tid = toast.loading(`Updating status to ${newStatus}...`);
        try {
            const res = await fetch('/api/pending', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: jobId, status: newStatus }),
            });

            if (res.ok) {
                setJobs(prev => prev.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
                toast.success(`Job marked as ${newStatus}`, { id: tid });
            } else {
                const data = await res.json();
                toast.error(`Failed to update status: ${data.error || 'Unknown error'}`, { id: tid });
            }
        } catch (err: any) {
            console.error(err);
            toast.error(`Failed to update status: ${err.message || 'Unknown error'}`, { id: tid });
        } finally {
            setIsUpdatingStatus(null);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        const id = deleteConfirmId;
        setDeleteConfirmId(null);
        setIsDeleting(id);
        const tid = toast.loading('Deleting job from pending queue...');
        try {
            const res = await fetch(`/api/pending?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setJobs(prev => prev.filter(job => job.id !== id));
                if (activeJobId === id) setActiveJobId(null);
                setIsMobilePreviewOpen(false);
                toast.success('Job deleted successfully', { id: tid });
            } else {
                const data = await res.json();
                toast.error(`Failed to delete job: ${data.error || 'Unknown error'}`, { id: tid });
            }
        } catch (err: any) {
            toast.error(`Failed to delete job: ${err.message || 'Unknown error'}`, { id: tid });
            console.error(err);
        } finally {
            setIsDeleting(null);
        }
    };

    // Calculate status counts
    const pendingCount = jobs.filter(j => normalizeStatus(j.status) === 'PENDING_REVIEW').length;
    const draftCount = jobs.filter(j => normalizeStatus(j.status) === 'DRAFT').length;
    const processingCount = jobs.filter(j => normalizeStatus(j.status) === 'PROCESSING').length;
    const verifiedCount = jobs.filter(j => normalizeStatus(j.status) === 'VERIFIED').length;

    // Filter jobs based on search, status filter, source, and type
    const filteredJobs = jobs.filter((job) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch = !query || (
            (job.company || '').toLowerCase().includes(query) ||
            (job.title || '').toLowerCase().includes(query) ||
            (job.location || '').toLowerCase().includes(query)
        );

        const norm = normalizeStatus(job.status);
        const matchesStatus = statusFilter === 'all' || norm === statusFilter;
        const matchesSource = activeSource === 'all' || job.source === activeSource;
        const matchesType = activeType === 'all' || (job.sourceType || job.type || '').toUpperCase() === activeType.toUpperCase();

        return matchesSearch && matchesStatus && matchesSource && matchesType;
    });

    // Derive available dynamic sources and types
    const availableSources = Array.from(new Set(jobs.map(j => j.source).filter(Boolean)));
    const availableTypes = Array.from(new Set(jobs.map(j => (j.sourceType || j.type || '').toUpperCase()).filter(Boolean)));

    // Group filtered jobs by creation date
    const groupedJobs = filteredJobs.reduce((acc, job) => {
        let group = 'Unknown Date';
        if (job.createdAt) {
            const d = new Date(job.createdAt);
            const todayStr = new Date().toDateString();
            const jobStr = d.toDateString();
            if (jobStr === todayStr) {
                group = 'Today';
            } else {
                group = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }

        if (!acc[group]) acc[group] = [];
        acc[group].push(job);
        return acc;
    }, {} as Record<string, any[]>);

    const activeJob = jobs.find(job => job.id === activeJobId) || null;

    const formatDuration = (ms: any) => {
        if (!ms) return 'N/A';
        const sec = Math.floor(Number(ms) / 1000);
        if (sec < 60) return `${sec}s`;
        const min = Math.floor(sec / 60);
        return `${min}m ${sec % 60}s`;
    };

    const formatRunDate = (dateStr: string) => {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="animate-in fade-in duration-500 text-foreground h-full flex flex-col min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0 overflow-hidden">
                
                {/* LEFT PANEL DASHBOARD (5 Columns) */}
                <div className="lg:col-span-5 h-full rounded-none sm:rounded-2xl border-y sm:border border-border bg-card p-3 sm:p-4 shadow-none sm:shadow-sm flex flex-col space-y-3 overflow-hidden min-h-0">
                    
                    {/* 1. Header & Actions */}
                    <div className="border-b border-border pb-3 shrink-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
                                <SparklesIcon className="h-5 w-5 text-primary shrink-0" />
                                Pending Opportunities
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                Ingestion queue & verification dashboard
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={fetchPendingData}
                                disabled={isRefreshing}
                                title="Refresh Pending Queue"
                                className="p-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <ArrowPathIcon className={cn("h-4 w-4", isRefreshing && "animate-spin text-primary")} />
                            </button>
                            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        </div>
                    </div>

                    {/* 2. Left Panel Opportunity Stats Widget */}
                    {activePanel === 'jobs' && (
                        <div className="grid grid-cols-4 gap-2 shrink-0">
                            <div 
                                onClick={() => setStatusFilter('all')}
                                className={cn(
                                    "rounded-xl border p-2 flex flex-col cursor-pointer transition-all",
                                    statusFilter === 'all' ? "bg-primary/10 border-primary" : "bg-secondary/10 border-border/50 hover:bg-secondary/20"
                                )}
                            >
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate">Total</span>
                                <span className="text-lg font-black text-foreground mt-0.5">{jobs.length}</span>
                            </div>

                            <div 
                                onClick={() => setStatusFilter('PENDING_REVIEW')}
                                className={cn(
                                    "rounded-xl border p-2 flex flex-col cursor-pointer transition-all",
                                    statusFilter === 'PENDING_REVIEW' ? "bg-amber-500/15 border-amber-500" : "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                                )}
                            >
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">Pending</span>
                                </div>
                                <span className="text-lg font-black text-amber-900 dark:text-amber-300 mt-0.5">{pendingCount}</span>
                            </div>

                            <div 
                                onClick={() => setStatusFilter('DRAFT')}
                                className={cn(
                                    "rounded-xl border p-2 flex flex-col cursor-pointer transition-all",
                                    statusFilter === 'DRAFT' ? "bg-zinc-500/15 border-zinc-500" : "bg-zinc-500/5 border-zinc-500/20 hover:bg-zinc-500/10"
                                )}
                            >
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                                    <span className="text-[9px] font-bold text-zinc-700 dark:text-zinc-400 uppercase tracking-wider truncate">Drafts</span>
                                </div>
                                <span className="text-lg font-black text-zinc-900 dark:text-zinc-300 mt-0.5">{draftCount}</span>
                            </div>

                            <div 
                                onClick={() => setStatusFilter('VERIFIED')}
                                className={cn(
                                    "rounded-xl border p-2 flex flex-col cursor-pointer transition-all",
                                    statusFilter === 'VERIFIED' ? "bg-emerald-500/15 border-emerald-500" : "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10"
                                )}
                            >
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">Verified</span>
                                </div>
                                <span className="text-lg font-black text-emerald-900 dark:text-emerald-300 mt-0.5">{verifiedCount}</span>
                            </div>
                        </div>
                    )}

                    {/* 3. Main Panel View Toggle */}
                    <div className="flex bg-muted/30 p-1 rounded-xl shrink-0 gap-1 border border-border/50">
                        <button
                            onClick={() => setActivePanel('jobs')}
                            className={cn(
                                "flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer",
                                activePanel === 'jobs' 
                                    ? 'bg-background shadow-sm text-foreground border border-border/50' 
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            Opportunities ({filteredJobs.length})
                        </button>
                        <button
                            onClick={() => setActivePanel('runs')}
                            className={cn(
                                "flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5",
                                activePanel === 'runs' 
                                    ? 'bg-background shadow-sm text-foreground border border-border/50' 
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <CpuChipIcon className="w-3.5 h-3.5" />
                            Crawler Runs ({runs.length})
                        </button>
                    </div>

                    {activePanel === 'jobs' ? (
                        <>
                            {/* 4. Sleek Status Filters Bar */}
                            <div className="flex bg-muted/20 p-1 rounded-xl shrink-0 gap-1 overflow-x-auto scrollbar-hide border border-border/30">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={cn(
                                        "text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer",
                                        statusFilter === 'all'
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    All ({jobs.length})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('PENDING_REVIEW')}
                                    className={cn(
                                        "text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                                        statusFilter === 'PENDING_REVIEW'
                                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Pending ({pendingCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('DRAFT')}
                                    className={cn(
                                        "text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                                        statusFilter === 'DRAFT'
                                            ? "bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 font-extrabold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                    Drafts ({draftCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('PROCESSING')}
                                    className={cn(
                                        "text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                                        statusFilter === 'PROCESSING'
                                            ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-extrabold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    Processing ({processingCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('VERIFIED')}
                                    className={cn(
                                        "text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                                        statusFilter === 'VERIFIED'
                                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Verified ({verifiedCount})
                                </button>
                            </div>

                            {/* 5. Search Bar & Secondary Source/Type Filters */}
                            <div className="space-y-2 shrink-0">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search company, title, or location..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-muted/20 border border-border rounded-xl pl-9 pr-8 py-2 text-xs focus:ring-1 focus:ring-primary outline-none text-foreground placeholder:text-muted-foreground"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                        >
                                            <XMarkIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Source & Type Pill Filters if available */}
                                {(availableSources.length > 0 || availableTypes.length > 0) && (
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[10px]">
                                        <span className="text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
                                            <FunnelIcon className="w-3 h-3" />
                                            Source:
                                        </span>
                                        <button
                                            onClick={() => setActiveSource('all')}
                                            className={cn(
                                                "px-2 py-0.5 rounded-md cursor-pointer transition-colors shrink-0",
                                                activeSource === 'all' ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            All
                                        </button>
                                        {availableSources.map(src => (
                                            <button
                                                key={src}
                                                onClick={() => setActiveSource(src)}
                                                className={cn(
                                                    "px-2 py-0.5 rounded-md capitalize cursor-pointer transition-colors shrink-0",
                                                    activeSource === src ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                {src}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 6. Clean Opportunities Item Cards List */}
                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                                {Object.keys(groupedJobs).length === 0 ? (
                                    <div className="text-center py-12 px-4 border border-dashed border-border rounded-xl my-4">
                                        <SparklesIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-xs font-bold text-foreground">No opportunities found</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Try clearing your search query or status filter.</p>
                                        {(searchQuery || statusFilter !== 'all' || activeSource !== 'all') && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setStatusFilter('all');
                                                    setActiveSource('all');
                                                    setActiveType('all');
                                                }}
                                                className="mt-3 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                            >
                                                Reset Filters
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    (Object.entries(groupedJobs) as Array<[string, any[]]>).map(([date, dateJobs]) => (
                                        <div key={date} className="space-y-2">
                                            <div 
                                                onClick={() => toggleCollapseDate(date)}
                                                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 sticky top-0 bg-card py-1.5 z-10 flex items-center justify-between cursor-pointer hover:text-primary transition-colors border-b border-border/50"
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <ClockIcon className="w-3.5 h-3.5" />
                                                    {date} ({dateJobs.length})
                                                </span>
                                                <svg className={`w-3 h-3 transition-transform ${collapsedDates[date] ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>

                                            {!collapsedDates[date] && dateJobs.map((job) => {
                                                const identifier = job.id;
                                                const badgeInfo = getStatusBadge(job.status);
                                                const isSelected = activeJobId === identifier;

                                                return (
                                                    <div
                                                        key={identifier}
                                                        onClick={() => {
                                                            setActiveJobId(identifier);
                                                            setIsMobilePreviewOpen(true);
                                                        }}
                                                        className={cn(
                                                            "relative overflow-hidden group rounded-xl border p-3 cursor-pointer transition-all duration-200 flex flex-col gap-2.5",
                                                            isSelected
                                                                ? 'border-primary/50 bg-primary/5 pl-3.5 shadow-sm'
                                                                : 'border-border/80 bg-secondary/10 hover:bg-secondary/30'
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l" />
                                                        )}

                                                        <div className="flex items-start gap-3">
                                                            <CompanyLogo
                                                                companyName={job.company}
                                                                companyLogoUrl={job.companyLogoUrl}
                                                                companyWebsite={job.applyLink}
                                                                applyLink={job.applyLink}
                                                                className="w-10 h-10 shrink-0 rounded-xl border border-border mt-0.5 bg-background p-0.5"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                                            {job.company || 'Unknown Company'}
                                                                        </h4>
                                                                        <p className="text-[11px] font-medium text-foreground/90 truncate mt-0.5">
                                                                            {job.title || 'Untitled Role'}
                                                                        </p>
                                                                    </div>

                                                                    {/* Status Pill */}
                                                                    <span className={cn(
                                                                        "shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                                                                        badgeInfo.badgeClass
                                                                    )}>
                                                                        <span className={cn("w-1.5 h-1.5 rounded-full", badgeInfo.dotClass)} />
                                                                        {badgeInfo.label}
                                                                    </span>
                                                                </div>

                                                                {/* Item Meta Tags */}
                                                                <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-muted-foreground">
                                                                    {job.source && (
                                                                        <span className="bg-muted px-1.5 py-0.5 rounded text-[9px] uppercase font-bold text-foreground/70">
                                                                            {job.source}
                                                                        </span>
                                                                    )}
                                                                    {job.sourceType && job.sourceType !== job.source && (
                                                                        <span className="bg-muted/60 px-1.5 py-0.5 rounded text-[9px] uppercase font-semibold">
                                                                            {job.sourceType}
                                                                        </span>
                                                                    )}
                                                                    {job.fresherScore !== undefined && job.fresherScore !== null && (
                                                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded text-[9px]">
                                                                            Score: {job.fresherScore}
                                                                        </span>
                                                                    )}
                                                                    {job.locations && Array.isArray(job.locations) && job.locations.length > 0 && (
                                                                        <span className="flex items-center gap-0.5 text-[10px] truncate max-w-[120px]">
                                                                            <MapPinIcon className="w-3 h-3 shrink-0 text-muted-foreground" />
                                                                            {job.locations[0]}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        /* CRAWLER RUNS ACTIVITY LOGGER */
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
                            {runs.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-8">No crawler runs logged.</p>
                            ) : (
                                runs.map((run) => (
                                    <div key={run.id} className="border border-border/70 rounded-xl p-3.5 bg-secondary/10 space-y-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5">
                                                <CpuChipIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                Run #{run.id.slice(0, 8)}
                                            </span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                run.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                run.status === 'FAILED' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            )}>
                                                {run.status || 'RUNNING'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                                            <div>Started: <span className="font-semibold text-foreground/80">{formatRunDate(run.started_at)}</span></div>
                                            <div>Duration: <span className="font-semibold text-foreground/80">{formatDuration(run.duration_ms)}</span></div>
                                        </div>
                                        <div className="grid grid-cols-5 gap-1 text-[9px] text-center font-bold pt-1 border-t border-border/30">
                                            <div className="bg-primary/5 text-primary p-1 rounded">
                                                <div>{run.total_found || 0}</div>
                                                <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Found</div>
                                            </div>
                                            <div className="bg-emerald-500/5 text-emerald-600 p-1 rounded">
                                                <div>{run.accepted || 0}</div>
                                                <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Ok</div>
                                            </div>
                                            <div className="bg-amber-500/5 text-amber-600 p-1 rounded">
                                                <div>{run.review_required || 0}</div>
                                                <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Review</div>
                                            </div>
                                            <div className="bg-muted text-muted-foreground p-1 rounded">
                                                <div>{run.duplicates || 0}</div>
                                                <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Dup</div>
                                            </div>
                                            <div className="bg-rose-500/5 text-rose-600 p-1 rounded">
                                                <div>{run.failed || 0}</div>
                                                <div className="text-[8px] uppercase tracking-tighter text-muted-foreground">Fail</div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: OPPORTUNITY DETAIL & VERIFICATION CENTER (7 Columns) */}
                <div className="hidden lg:col-span-7 lg:flex flex-col h-full space-y-0 min-h-0">
                    {activeJob ? (
                        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col h-full overflow-hidden space-y-4 min-h-0">
                            
                            {/* Detail Header */}
                            <div className="border-b border-border pb-4 flex items-start justify-between gap-4 shrink-0">
                                <div className="flex items-center gap-4 min-w-0">
                                    <CompanyLogo
                                        companyName={activeJob.company}
                                        companyLogoUrl={activeJob.companyLogoUrl}
                                        companyWebsite={activeJob.applyLink}
                                        applyLink={activeJob.applyLink}
                                        className="w-14 h-14 rounded-2xl border border-border shrink-0 bg-background p-1"
                                    />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-foreground truncate">{activeJob.title}</h2>
                                            {(() => {
                                                const badge = getStatusBadge(activeJob.status);
                                                return (
                                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1", badge.badgeClass)}>
                                                        <span className={cn("w-1.5 h-1.5 rounded-full", badge.dotClass)} />
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-0.5">
                                            <BuildingOfficeIcon className="w-4 h-4 text-muted-foreground" />
                                            {activeJob.company}
                                            {activeJob.locations && Array.isArray(activeJob.locations) && activeJob.locations.length > 0 && (
                                                <span className="flex items-center gap-1 border-l border-border/60 pl-2">
                                                    <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {activeJob.locations.join(', ')}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <a 
                                    href={activeJob.applyLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-3.5 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                                >
                                    <span>View Source</span>
                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                </a>
                            </div>

                            {/* Verification Workflow Actions Bar */}
                            <div className="flex items-center justify-between gap-2 p-2 bg-muted/20 border border-border/60 rounded-xl shrink-0">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">Verification Actions:</span>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => handleUpdateStatus(activeJob.id, 'APPROVED')}
                                        disabled={isUpdatingStatus === activeJob.id || normalizeStatus(activeJob.status) === 'VERIFIED'}
                                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                                    >
                                        <CheckIcon className="w-3.5 h-3.5" />
                                        Verify & Approve
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus(activeJob.id, 'DRAFT')}
                                        disabled={isUpdatingStatus === activeJob.id || normalizeStatus(activeJob.status) === 'DRAFT'}
                                        className="px-3 py-1.5 rounded-lg border border-zinc-500/30 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Mark Draft
                                    </button>

                                    <button
                                        onClick={() => handleUpdateStatus(activeJob.id, 'PROCESSING')}
                                        disabled={isUpdatingStatus === activeJob.id || normalizeStatus(activeJob.status) === 'PROCESSING'}
                                        className="px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Mark Processing
                                    </button>

                                    <button
                                        onClick={() => handleDelete(activeJob.id)}
                                        disabled={isDeleting === activeJob.id}
                                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        Reject & Delete
                                    </button>
                                </div>
                            </div>

                            {/* Tabs Switcher for Detail View */}
                            <div className="flex border-b border-border gap-4 shrink-0 text-xs">
                                <button
                                    onClick={() => setActiveDetailTab('overview')}
                                    className={cn(
                                        "py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                                        activeDetailTab === 'overview' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <BriefcaseIcon className="w-4 h-4" />
                                    Overview & Eligibility
                                </button>
                                <button
                                    onClick={() => setActiveDetailTab('description')}
                                    className={cn(
                                        "py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                                        activeDetailTab === 'description' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <DocumentTextIcon className="w-4 h-4" />
                                    Description & Requirements
                                </button>
                                <button
                                    onClick={() => setActiveDetailTab('raw')}
                                    className={cn(
                                        "py-2 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
                                        activeDetailTab === 'raw' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <CodeBracketIcon className="w-4 h-4" />
                                    Raw Payload JSON
                                </button>
                            </div>

                            {/* Tab Content Container */}
                            <div className="flex-1 overflow-y-auto min-h-0 w-full bg-muted/15 border border-border rounded-xl p-5 text-sm">
                                {activeDetailTab === 'overview' && (
                                    <div className="space-y-6">
                                        {/* Grid Stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Employment Type</span>
                                                <span className="text-sm font-semibold text-foreground mt-1 block">{activeJob.employmentType || activeJob.type || 'N/A'}</span>
                                            </div>
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Work Mode</span>
                                                <span className="text-sm font-semibold text-foreground mt-1 block">{activeJob.workMode || 'N/A'}</span>
                                            </div>
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Experience</span>
                                                <span className="text-sm font-semibold text-foreground mt-1 block">
                                                    {activeJob.experienceMin !== undefined ? `${activeJob.experienceMin} - ${activeJob.experienceMax || 0} Yrs` : 'Fresher'}
                                                </span>
                                            </div>
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Salary</span>
                                                <span className="text-sm font-semibold text-foreground mt-1 block">{activeJob.salaryRange || activeJob.salaryAmount || 'Not Disclosed'}</span>
                                            </div>
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Fresher Match Score</span>
                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                                                    {activeJob.fresherScore !== undefined ? `${activeJob.fresherScore} / 100` : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="bg-background border border-border p-3.5 rounded-xl">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Source Domain</span>
                                                <span className="text-sm font-semibold text-primary mt-1 block truncate">{activeJob.source || 'Direct'}</span>
                                            </div>
                                        </div>

                                        {/* Allowed Degrees / Courses */}
                                        {activeJob.allowedDegrees && Array.isArray(activeJob.allowedDegrees) && activeJob.allowedDegrees.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <AcademicCapIcon className="w-4 h-4" />
                                                    Allowed Degrees
                                                </h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {activeJob.allowedDegrees.map((deg: string) => (
                                                        <span key={deg} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 text-xs font-semibold rounded-lg">
                                                            {deg}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Required Skills */}
                                        {activeJob.requiredSkills && Array.isArray(activeJob.requiredSkills) && activeJob.requiredSkills.length > 0 && (
                                            <div>
                                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {activeJob.requiredSkills.map((skill: string) => (
                                                        <span key={skill} className="px-2.5 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-lg border border-border">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeDetailTab === 'description' && (
                                    <div className="space-y-4 whitespace-pre-wrap leading-relaxed text-foreground/90">
                                        <h3 className="text-base font-bold text-foreground">Job Description & Responsibilities</h3>
                                        <p className="text-xs leading-relaxed">{activeJob.description || activeJob.details || 'No description text provided.'}</p>
                                    </div>
                                )}

                                {activeDetailTab === 'raw' && (
                                    <div className="relative">
                                        <pre className="font-mono text-xs bg-background p-4 rounded-xl border border-border overflow-x-auto text-foreground/90 leading-relaxed">
                                            {JSON.stringify(activeJob, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-center h-full text-center">
                            <div>
                                <SparklesIcon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                                <p className="text-sm font-semibold text-muted-foreground">Select an opportunity from the left panel to inspect details.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Sheet Drawer */}
            {isMobilePreviewOpen && activeJob && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden flex items-end sm:items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-lg flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
                        {/* Header */}
                        <div className="border-b border-border p-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <CompanyLogo
                                    companyName={activeJob.company}
                                    companyLogoUrl={activeJob.companyLogoUrl}
                                    companyWebsite={activeJob.applyLink}
                                    applyLink={activeJob.applyLink}
                                    className="w-12 h-12 rounded-xl border border-border"
                                />
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-foreground truncate">{activeJob.title}</h2>
                                    <p className="text-xs text-muted-foreground truncate">{activeJob.company}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsMobilePreviewOpen(false)}
                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 bg-muted/10 text-xs space-y-4">
                            <div className="flex items-center gap-2 flex-wrap border-b border-border pb-3">
                                <button
                                    onClick={() => handleUpdateStatus(activeJob.id, 'APPROVED')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <CheckIcon className="w-3.5 h-3.5" /> Verify & Approve
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus(activeJob.id, 'DRAFT')}
                                    className="px-3 py-1.5 rounded-lg border border-border bg-muted text-xs font-semibold cursor-pointer"
                                >
                                    Mark Draft
                                </button>
                                <button
                                    onClick={() => handleDelete(activeJob.id)}
                                    className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-semibold cursor-pointer ml-auto"
                                >
                                    Delete
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Description</span>
                                    <p className="mt-1 leading-relaxed text-foreground">{activeJob.description || 'No description'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border p-4 bg-muted/20 flex gap-2 shrink-0 justify-end">
                            <a 
                                href={activeJob.applyLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold"
                            >
                                View Source
                            </a>
                            <button
                                onClick={() => setIsMobilePreviewOpen(false)}
                                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                show={deleteConfirmId !== null}
                title="Reject & Delete Pending Opportunity"
                message="Are you sure you want to permanently delete this opportunity from the pending queue? This action cannot be undone."
                type="danger"
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmId(null)}
            />
        </div>
    );
}
