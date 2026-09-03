'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { normalizeOpportunityUrl } from '@fresherflow/utils';
import toast from 'react-hot-toast';
import { Input } from '@/ui/Input';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    LinkIcon,
    CheckCircleIcon,
    BriefcaseIcon,
    EnvelopeIcon,
    SparklesIcon,
    AcademicCapIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { submitJobLinkAction, getSubmissionHistoryAction } from './actions';
import { formatDistanceToNow } from 'date-fns';

type SubmissionMode = 'LINK' | 'RESOURCE' | 'REFERRAL' | 'HISTORY';

export default function PublicSubmitPage() {
    const { user } = useAuth();
    const [mode, setMode] = useState<SubmissionMode>('LINK');

    // Link Mode
    const [url, setUrl] = useState('');
    const [opportunityType, setOpportunityType] = useState<'JOB' | 'INTERNSHIP' | 'WALKIN'>('JOB');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [notes, setNotes] = useState('');

    // Resource Mode
    const [resUrl, setResUrl] = useState('');

    // Referral Mode
    const [refTitle, setRefTitle] = useState('');
    const [refCompany, setRefCompany] = useState('');
    const [contact, setContact] = useState('');
    const [eligibleBatches, setEligibleBatches] = useState('');
    const [companyUrl, setCompanyUrl] = useState('');
    const [description, setDescription] = useState('');

    // History Mode
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [clipboardLink, setClipboardLink] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [preview, setPreview] = useState<{ title?: string; company?: string; isDuplicate?: boolean } | null>(null);

    // Clipboard detection on mount
    useEffect(() => {
        const checkClipboard = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                    setClipboardLink(text);
                }
            } catch {
                // clipboard read denied — fine
            }
        };
        void checkClipboard();
    }, []);

    // Load history when tab changes
    useEffect(() => {
        if (mode === 'HISTORY') {
            setLoadingHistory(true);
            getSubmissionHistoryAction(user?.id).then((res) => {
                if (res.submissions) setHistory(res.submissions);
                setLoadingHistory(false);
            });
        }
    }, [mode, user]);

    // Auto-parse URL after typing stops
    useEffect(() => {
        if (!url.trim() || url.length < 15 || preview || parsing) return;
        const timer = setTimeout(() => {
            setParsing(true);
            // Simulate parse — in production this would call the API
            setTimeout(() => {
                setParsing(false);
                setPreview({ title: undefined, company: undefined });
            }, 800);
        }, 800);
        return () => clearTimeout(timer);
    }, [url, preview, parsing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const toastId = toast.loading('Submitting...');

        const userContext = user ? { userId: user.id, username: user.username || undefined } : undefined;

        try {
            if (mode === 'LINK') {
                if (!url.trim()) {
                    toast.error('Please enter a URL', { id: toastId });
                    setSubmitting(false);
                    return;
                }
                try { new URL(url.trim()); } catch {
                    toast.error('Please enter a valid URL', { id: toastId });
                    setSubmitting(false);
                    return;
                }
                const normalized = normalizeOpportunityUrl(url.trim());
                
                const details = [
                    title.trim() ? `Title: ${title.trim()}` : null,
                    company.trim() ? `Company: ${company.trim()}` : null,
                    `Type: ${opportunityType}`,
                    notes.trim() ? `Notes: ${notes.trim()}` : null,
                ].filter(Boolean).join(' | ');
                
                const payload = details ? `${normalized} ?details=${encodeURIComponent(details)}` : normalized;
                
                const res = await submitJobLinkAction(payload, 'community:web-submit', {
                    title: title.trim(),
                    company: company.trim(),
                    description: notes.trim()
                }, userContext);

                if (res.error) throw new Error(res.error);

            } else if (mode === 'RESOURCE') {
                if (!resUrl.trim()) {
                    toast.error('Please enter a URL', { id: toastId });
                    setSubmitting(false);
                    return;
                }
                const res = await submitJobLinkAction(resUrl.trim(), 'community:web-resource', undefined, userContext);
                if (res.error) throw new Error(res.error);

            } else if (mode === 'REFERRAL') {
                if (!refTitle.trim() || !refCompany.trim() || !contact.trim()) {
                    toast.error('Title, company, and contact are required', { id: toastId });
                    setSubmitting(false);
                    return;
                }
                const data = {
                    title: refTitle.trim(),
                    company: refCompany.trim(),
                    contact: contact.trim(),
                    eligibleBatches: eligibleBatches.trim() || '2024, 2025, 2026',
                    companyUrl: companyUrl.trim() || undefined,
                    description: description.trim() || `${refTitle.trim()} at ${refCompany.trim()}`,
                };
                const payload = `https://fresherflow.in/referral?data=${encodeURIComponent(JSON.stringify(data))}`;
                const res = await submitJobLinkAction(payload, `recruiter:${contact.trim()}`, {
                    title: refTitle.trim(),
                    company: refCompany.trim(),
                    contact: contact.trim(),
                    description: description.trim()
                }, userContext);
                if (res.error) throw new Error(res.error);
            }

            toast.success('Submitted!', { id: toastId });
            setSubmitted(true);
            
            // Reset all fields
            setUrl(''); setTitle(''); setCompany(''); setNotes('');
            setResUrl('');
            setRefTitle(''); setRefCompany(''); setContact('');
            setEligibleBatches(''); setCompanyUrl(''); setDescription('');
            setPreview(null);
            
            // If viewing history, refetch it
            getSubmissionHistoryAction(user?.id).then((res) => {
                if (res.submissions) setHistory(res.submissions);
            });
        } catch (err) {
            toast.error((err as Error).message || 'Failed to submit', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const useClipboard = () => {
        if (clipboardLink) {
            setUrl(clipboardLink);
            setClipboardLink(null);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <div className="max-w-sm w-full text-center space-y-5 bg-card border border-border/80 p-8 rounded-2xl">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto text-primary">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold text-foreground">Submitted!</h1>
                        <p className="text-sm text-muted-foreground">We&apos;ll review and publish it soon.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={() => setSubmitted(false)} className="w-full h-10 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                            Submit Another
                        </button>
                        <Link href="/jobs" className="w-full h-10 text-sm font-semibold rounded-lg border border-border flex items-center justify-center text-foreground hover:bg-muted/50 transition-all">
                            Browse Jobs
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const tabs: { id: SubmissionMode; label: string; icon: any }[] = [
        { id: 'LINK', label: 'Job Link', icon: LinkIcon },
        { id: 'RESOURCE', label: 'Resource', icon: AcademicCapIcon },
        { id: 'REFERRAL', label: 'Referral', icon: EnvelopeIcon },
        { id: 'HISTORY', label: 'History', icon: ClockIcon },
    ];

    const steps = [
        { title: 'Paste any link', body: 'ATS portals, Google Forms, careers pages — anything works.' },
        { title: 'We normalize & verify', body: 'Duplicates removed, details parsed, queued for review.' },
        { title: 'Live on feed + Telegram', body: 'Verified posts reach the community within hours.' },
    ];

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background pb-20">
            <main className="max-w-xl lg:max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Header */}
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        <SparklesIcon className="w-3 h-3" />
                        Community
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Share an Opportunity</h1>
                    <p className="text-sm text-muted-foreground">Job link, prep resource, or referral — submit in seconds.</p>
                </div>

                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start">
                <div className="min-w-0 space-y-6 lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:shadow-xs lg:p-6">
                {/* Tab Selector */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border/80 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setMode(tab.id)}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 h-9 text-xs font-semibold rounded-lg transition-all ${
                                mode === tab.id
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5 shrink-0" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Clipboard Banner */}
                {clipboardLink && mode === 'LINK' && !url && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                        <LinkIcon className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">Link in clipboard</p>
                            <p className="text-[11px] text-muted-foreground truncate">{clipboardLink}</p>
                        </div>
                        <button onClick={useClipboard} className="shrink-0 h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold">
                            Use
                        </button>
                        <button onClick={() => setClipboardLink(null)} className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                            <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {mode !== 'HISTORY' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* ── LINK MODE ── */}
                        {mode === 'LINK' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        Job URL <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        type="url"
                                        required
                                        value={url}
                                        onChange={(e) => { setUrl(e.target.value); setPreview(null); }}
                                        placeholder="https://careers.company.com/jobs/..."
                                    />
                                    <p className="text-[11px] text-muted-foreground">ATS links, Google Forms, careers pages — anything works.</p>
                                </div>

                                {/* Preview */}
                                {parsing && (
                                    <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                                        <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        Detecting details...
                                    </div>
                                )}
                                {preview && !preview.isDuplicate && (preview.title || preview.company) && (
                                    <div className="flex items-center gap-2.5 p-3 bg-muted/30 rounded-xl border border-border/50">
                                        <BriefcaseIcon className="w-4 h-4 text-primary shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{preview.title || 'Job Opportunity'}</p>
                                            {preview.company && <p className="text-xs text-muted-foreground truncate">{preview.company}</p>}
                                        </div>
                                    </div>
                                )}
                                {preview?.isDuplicate && (
                                    <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl">
                                        <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 shrink-0" />
                                        <p className="text-xs font-medium text-orange-700">This job is already in our feed.</p>
                                    </div>
                                )}

                                {/* Type */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">Type</label>
                                    <div className="flex gap-1.5">
                                        {(['JOB', 'INTERNSHIP', 'WALKIN'] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setOpportunityType(t)}
                                                className={`flex-1 h-8 text-xs font-medium rounded-lg border transition-all ${
                                                    opportunityType === t
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'border-border text-muted-foreground hover:bg-muted/50'
                                                }`}
                                            >
                                                {t === 'JOB' ? 'Full-Time' : t === 'INTERNSHIP' ? 'Internship' : 'Walk-in'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Optional meta */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Role (optional)</label>
                                        <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analyst" className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Company (optional)</label>
                                        <Input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Amazon" className="h-9 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-muted-foreground">Notes (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                        placeholder="Batch, venue, deadline..."
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    />
                                </div>
                            </>
                        )}

                        {/* ── RESOURCE MODE ── */}
                        {mode === 'RESOURCE' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <AcademicCapIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        Resource URL <span className="text-destructive">*</span>
                                    </label>
                                    <Input
                                        type="url"
                                        required
                                        value={resUrl}
                                        onChange={(e) => setResUrl(e.target.value)}
                                        placeholder="YouTube, PDF, blog, website..."
                                    />
                                    <p className="text-[11px] text-muted-foreground">Interview prep, coding resources, tutorials — anything helpful.</p>
                                </div>
                            </>
                        )}

                        {/* ── REFERRAL MODE ── */}
                        {mode === 'REFERRAL' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Job Title <span className="text-destructive">*</span>
                                    </label>
                                    <Input type="text" required value={refTitle} onChange={(e) => setRefTitle(e.target.value)} placeholder="e.g. Software Engineer" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Company <span className="text-destructive">*</span>
                                    </label>
                                    <Input type="text" required value={refCompany} onChange={(e) => setRefCompany(e.target.value)} placeholder="e.g. Google" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <EnvelopeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        Contact / How to Apply <span className="text-destructive">*</span>
                                    </label>
                                    <Input type="text" required value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or application link" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Batches (optional)</label>
                                        <Input type="text" value={eligibleBatches} onChange={(e) => setEligibleBatches(e.target.value)} placeholder="2024, 2025, 2026" className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-medium text-muted-foreground">Company URL (optional)</label>
                                        <Input type="url" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-muted-foreground">Description (optional)</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Role details, stipend, skills..."
                                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    />
                                </div>
                            </>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-11 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? 'Submitting...' : mode === 'LINK' ? 'Submit Link' : mode === 'RESOURCE' ? 'Submit Resource' : 'Publish Referral'}
                        </button>
                    </form>
                )}

                {/* ── HISTORY MODE ── */}
                {mode === 'HISTORY' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Your Submissions</h2>
                        </div>
                        {loadingHistory ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">Loading history...</div>
                        ) : history.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
                                No submissions yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div key={item.id} className="p-4 bg-card border border-border/80 rounded-xl space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">
                                                    {item.title || 'Submitted Link'}
                                                </p>
                                                {item.company && (
                                                    <p className="text-xs text-muted-foreground truncate">{item.company}</p>
                                                )}
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                item.status === 'FETCHED' || item.status === 'DRAFT_CREATED' 
                                                    ? 'bg-yellow-500/10 text-yellow-600'
                                                    : item.status === 'DEDUPED' || item.status === 'REJECTED'
                                                    ? 'bg-red-500/10 text-red-600'
                                                    : 'bg-green-500/10 text-green-600'
                                            }`}>
                                                {item.status === 'FETCHED' || item.status === 'DRAFT_CREATED' ? 'PENDING' : 
                                                 item.status === 'DEDUPED' ? 'DUPLICATE' : 
                                                 item.status === 'REJECTED' ? 'REJECTED' : 'PUBLISHED'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {item.sourceLink}
                                        </p>
                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                            </span>
                                            {item.mappedOpportunityId && (
                                                <Link href={`/jobs/${item.mappedOpportunityId}`} className="text-[11px] font-medium text-primary hover:underline">
                                                    View Job &rarr;
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Guidelines — inline on mobile, verification rail on desktop */}
                {mode !== 'HISTORY' && (
                    <div className="space-y-2 pt-2 border-t border-border/40 lg:hidden">
                        <p className="text-xs font-semibold text-foreground">Verification</p>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                            <li className="flex gap-2"><span className="text-primary">•</span> Freshers, 2024–2026 graduates, 0–1yr experience</li>
                            <li className="flex gap-2"><span className="text-primary">•</span> Official ATS portals, Google Forms, verified HR emails</li>
                            <li className="flex gap-2"><span className="text-primary">•</span> Verified links go live on feed + Telegram community</li>
                        </ul>
                    </div>
                )}
                </div>

                {/* Right rail — desktop only */}
                <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-20">
                    {/* How it works */}
                    <div className="rounded-2xl border border-border/60 bg-card shadow-xs p-5 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">How it works</p>
                        <ol className="space-y-4">
                            {steps.map((step, index) => (
                                <li key={step.title} className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                        {index + 1}
                                    </span>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold text-foreground">{step.title}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                    {/* Verification */}
                    <div className="rounded-2xl border border-border/60 bg-card shadow-xs p-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Verification</p>
                        <ul className="space-y-1.5 text-xs text-muted-foreground">
                            <li className="flex gap-2"><span className="text-primary">•</span> Freshers, 2024–2026 graduates, 0–1yr experience</li>
                            <li className="flex gap-2"><span className="text-primary">•</span> Official ATS portals, Google Forms, verified HR emails</li>
                            <li className="flex gap-2"><span className="text-primary">•</span> Verified links go live on feed + Telegram community</li>
                        </ul>
                    </div>
                </aside>
                </div>
            </main>
        </div>
    );
}
