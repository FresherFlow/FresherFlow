'use client';

import { useState, useEffect } from 'react';
import { SparklesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { useTheme } from '@/lib/providers/ThemeContext';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../../opportunities/components/ConfirmModal';

export default function PendingTool({ initialJobs }: { initialJobs?: any[] }) {
    const { theme, toggleTheme } = useTheme();
    const [jobs, setJobs] = useState<any[]>(initialJobs || []);
    const [loading, setLoading] = useState(!initialJobs || initialJobs.length === 0);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'ats' | 'non-ats' | 'aggregators'>('all');
    const [activeJobId, setActiveJobId] = useState<string | null>(
        initialJobs && initialJobs.length > 0 ? (initialJobs[0]._r2Key || initialJobs[0].id || initialJobs[0].slug || `${initialJobs[0].title}-0`) : null
    );
    const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
    const [isMobilePreviewOpen, setIsMobilePreviewOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);

    useEffect(() => {
        if (!initialJobs || initialJobs.length === 0) {
            setLoading(true);
            fetch('/api/pending')
                .then(res => res.json())
                .then(data => {
                    if (data.jobs) {
                        setJobs(data.jobs);
                        if (data.jobs.length > 0) {
                            const firstJob = data.jobs[0];
                            setActiveJobId(firstJob._r2Key || firstJob.id || firstJob.slug || `${firstJob.title}-0`);
                        }
                    }
                })
                .catch(err => console.error('Failed to load pending jobs dynamically:', err))
                .finally(() => setLoading(false));
        }
    }, [initialJobs]);

    const toggleCollapseDate = (date: string) => {
        setCollapsedDates(prev => ({ ...prev, [date]: !prev[date] }));
    };

    const handleDelete = (key: string) => {
        setDeleteConfirmKey(key);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmKey) return;
        const key = deleteConfirmKey;
        setDeleteConfirmKey(null);
        setIsDeleting(key);
        const tid = toast.loading('Deleting job from pending queue...');
        try {
            const res = await fetch(`/api/pending?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setJobs(prev => prev.filter(job => job._r2Key !== key));
                if (activeJobId === key) setActiveJobId(null);
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

    const filteredJobs = jobs.filter((job) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
            (job.company || '').toLowerCase().includes(query) ||
            (job.title || '').toLowerCase().includes(query)
        );
        if (activeTab === 'all') return matchesSearch;
        return matchesSearch && job._sourceType === activeTab;
    });

    const groupedJobs = filteredJobs.reduce((acc, job) => {
        let group = 'Unknown';
        if (job._sourceType === 'ats') {
            group = `ATS: ${job._provider} - ${job._companyFolder || job.company || 'Unknown'}`;
        } else if (job._sourceType === 'non-ats') {
            group = `Direct: ${job._companyFolder || job.company || 'Unknown'}`;
        } else if (job._sourceType === 'aggregators') {
            group = `Aggregator: ${job._dateFolder || job._date || 'Recent'}`;
        } else {
            group = job._date || 'Recent';
        }

        if (!acc[group]) acc[group] = [];
        acc[group].push(job);
        return acc;
    }, {} as Record<string, any[]>);

    const activeJob = jobs.find((job, idx) => (job._r2Key || job.id || job.slug || `${job.title}-${idx}`) === activeJobId) || null;

    return (
        <div className="animate-in fade-in duration-500 text-foreground h-full flex flex-col min-h-0">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground animate-pulse">Fetching pending jobs...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0 overflow-hidden">
                    {/* Left: Feed opportunities selector */}
                    <div className="lg:col-span-1 h-full rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-border bg-card p-3 sm:p-4 shadow-none sm:shadow-sm flex flex-col space-y-4 overflow-hidden min-h-0">
                        <div className="border-b border-border pb-3 shrink-0 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-primary" />
                                    Pending Jobs
                                </h1>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Review and verify live jobs directly from the CDN.
                                </p>
                            </div>
                            <div className="shrink-0 pt-0.5">
                                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by company or role..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-muted/20 border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex bg-muted/30 p-1 rounded-lg shrink-0 gap-1 overflow-x-auto">
                            {(['all', 'ats', 'non-ats', 'aggregators'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 text-[11px] font-semibold py-1.5 px-3 rounded-md capitalize transition-colors whitespace-nowrap ${
                                        activeTab === tab 
                                            ? 'bg-background shadow-sm text-foreground' 
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0">
                            {Object.keys(groupedJobs).length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-8">No jobs found.</p>
                            ) : (
                                (Object.entries(groupedJobs) as Array<[string, any[]]>)
                                    .sort(([a], [b]) => b.localeCompare(a))
                                    .map(([date, dateJobs]: [string, any[]]) => (
                                        <div key={date} className="pb-4 space-y-2">
                                            <h3 
                                                onClick={() => toggleCollapseDate(date)}
                                                className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1 sticky top-0 bg-card py-1.5 z-10 flex items-center justify-between cursor-pointer hover:text-primary transition-colors border-b border-border"
                                            >
                                                <span>{date}</span>
                                                <svg className={`w-3 h-3 transition-transform ${collapsedDates[date] ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </h3>
                                            {!collapsedDates[date] && dateJobs.map((job, idx) => {
                                                const identifier = job._r2Key || job.id || job.slug || `${job.title}-${idx}`;
                                                return (
                                                    <div
                                                        key={identifier}
                                                        onClick={() => {
                                                            setActiveJobId(identifier);
                                                            setIsMobilePreviewOpen(true);
                                                        }}
                                                        className={`relative overflow-hidden group rounded-xl border p-3 cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                                            activeJobId === identifier
                                                                ? 'border-border bg-primary/5 pl-3.5'
                                                                : 'border-border/85 bg-secondary/20 hover:bg-secondary/40'
                                                        }`}
                                                    >
                                                        {activeJobId === identifier && (
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                        )}
                                                        <CompanyLogo
                                                            companyName={job.company}
                                                            companyLogoUrl={job.companyLogoUrl}
                                                            companyWebsite={job.url || job.companyWebsite}
                                                            applyLink={job.applyLink || job.url}
                                                            className="w-10 h-10 shrink-0 rounded-xl border border-border mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2 min-w-0">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-foreground truncate">{job.company || 'Unknown'}</p>
                                                                    <p className="text-[11px] text-muted-foreground truncate">{job.title || 'Untitled Role'}</p>
                                                                </div>
                                                                {job._sourceType && (
                                                                    <span className={`shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                                                                        job._sourceType === 'ats' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                                                        job._sourceType === 'aggregators' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                                                        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                                    }`}>
                                                                        {job._provider || job._sourceType}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>

                    {/* Right: Job Previewer */}
                    <div className="hidden lg:col-span-2 lg:flex flex-col h-full space-y-0 min-h-0">
                        {activeJob ? (
                            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col h-full overflow-hidden space-y-4 min-h-0">
                                <div className="border-b border-border pb-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <CompanyLogo
                                            companyName={activeJob.company}
                                            companyLogoUrl={activeJob.companyLogoUrl}
                                            companyWebsite={activeJob.url || activeJob.companyWebsite}
                                            applyLink={activeJob.applyLink || activeJob.url}
                                            className="w-16 h-16 rounded-xl border border-border"
                                        />
                                        <div>
                                            <h2 className="text-xl font-bold text-foreground">{activeJob.title}</h2>
                                            <p className="text-sm text-muted-foreground">{activeJob.company}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Simplified action buttons matching your request for "just fetching data" */}
                                        {activeJob._r2Key && (
                                            <button
                                                onClick={() => handleDelete(activeJob._r2Key)}
                                                disabled={isDeleting === activeJob._r2Key}
                                                className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold disabled:opacity-50"
                                            >
                                                {isDeleting === activeJob._r2Key ? 'Deleting...' : 'Reject & Delete'}
                                            </button>
                                        )}
                                        <a 
                                            href={activeJob.applyLink || activeJob.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold"
                                        >
                                            View Source
                                        </a>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto min-h-0 w-full bg-muted/20 border border-border rounded-xl p-5 text-sm whitespace-pre-wrap break-words">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(activeJob).map(([key, value]) => {
                                            if (key === '_r2Key' || key === '_date' || key === 'companyLogoUrl' || value === null || value === undefined || value === '') return null;
                                            
                                            if (typeof value === 'object') {
                                                return (
                                                    <div key={key} className="col-span-1 md:col-span-2 border-t border-border/50 pt-3 mt-1">
                                                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-2">{key}</span>
                                                        <pre className="font-mono text-[11px] bg-background/50 p-3 rounded-lg border border-border overflow-x-auto text-foreground/80">{JSON.stringify(value, null, 2)}</pre>
                                                    </div>
                                                );
                                            }
                                            
                                            const isDescription = key.toLowerCase().includes('description') || key === 'details' || key === 'responsibilities' || key === 'requirements' || String(value).length > 100;
                                            
                                            return (
                                                <div key={key} className={isDescription ? "col-span-1 md:col-span-2 border-t border-border/50 pt-3 mt-1" : "col-span-1"}>
                                                    <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider block mb-1">{key}</span>
                                                    {String(value).startsWith('http') ? (
                                                        <a href={String(value)} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium text-sm break-all">
                                                            {String(value)}
                                                        </a>
                                                    ) : (
                                                        <div className={`text-foreground ${isDescription ? 'text-sm leading-relaxed' : 'font-medium text-sm'} max-w-full overflow-hidden`}>
                                                            {String(value)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex items-center justify-center h-full">
                                <p className="text-sm text-muted-foreground">Select a job from the list to view its details.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Preview Modal */}
            {isMobilePreviewOpen && activeJob && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden flex items-end sm:items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-lg flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
                        {/* Header */}
                        <div className="border-b border-border p-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <CompanyLogo
                                    companyName={activeJob.company}
                                    companyLogoUrl={activeJob.companyLogoUrl}
                                    companyWebsite={activeJob.url || activeJob.companyWebsite}
                                    applyLink={activeJob.applyLink || activeJob.url}
                                    className="w-12 h-12 rounded-xl border border-border"
                                />
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-foreground truncate">{activeJob.title}</h2>
                                    <p className="text-xs text-muted-foreground truncate">{activeJob.company}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsMobilePreviewOpen(false)}
                                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 bg-muted/10 text-xs space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(activeJob).map(([key, value]) => {
                                    if (key === '_r2Key' || key === '_date' || key === 'companyLogoUrl' || value === null || value === undefined || value === '') return null;
                                    
                                    if (typeof value === 'object') {
                                        return (
                                            <div key={key} className="border-t border-border/50 pt-2">
                                                <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block mb-1">{key}</span>
                                                <pre className="font-mono text-[10px] bg-background/50 p-2 rounded-lg border border-border overflow-x-auto text-foreground/80">{JSON.stringify(value, null, 2)}</pre>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={key} className="border-t border-border/50 pt-2">
                                            <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider block mb-1">{key}</span>
                                            {String(value).startsWith('http') ? (
                                                <a href={String(value)} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium break-all">
                                                    {String(value)}
                                                </a>
                                            ) : (
                                                <div className={`text-foreground leading-relaxed max-w-full overflow-hidden whitespace-pre-wrap break-words`}>
                                                    {String(value)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border p-4 bg-muted/20 flex gap-2 shrink-0 justify-end">
                            {activeJob._r2Key && (
                                <button
                                    onClick={() => handleDelete(activeJob._r2Key)}
                                    disabled={isDeleting === activeJob._r2Key}
                                    className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold disabled:opacity-50 mr-auto"
                                >
                                    {isDeleting === activeJob._r2Key ? 'Deleting...' : 'Delete'}
                                </button>
                            )}
                            <a 
                                href={activeJob.applyLink || activeJob.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold"
                            >
                                View Source
                            </a>
                            <button
                                onClick={() => setIsMobilePreviewOpen(false)}
                                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                show={deleteConfirmKey !== null}
                title="Reject & Delete Pending Job"
                message="Are you sure you want to permanently delete this job from the pending queue? This action cannot be undone."
                type="danger"
                confirmText="Delete"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirmKey(null)}
            />
        </div>
    );
}
