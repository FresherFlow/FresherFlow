'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { joblinksApi } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, LinkIcon, ShieldCheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function SubmitLinkPage() {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmedUrl = url.trim();
        
        if (!trimmedUrl) {
            toast.error('Please enter a job link.');
            return;
        }

        if (!/^https?:\/\//i.test(trimmedUrl)) {
            toast.error('Please enter a valid URL starting with http:// or https://');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Submitting job link...');
        try {
            const source = user 
                ? (user.fullName || user.email || 'authenticated') 
                : 'anonymous';

            // Append optional notes to the url parameter
            const submissionUrl = notes.trim()
                ? `${trimmedUrl} ?notes=${encodeURIComponent(notes.trim())}`
                : trimmedUrl;

            await joblinksApi.submit(submissionUrl, source);
            toast.success('Opportunity submitted successfully!', { id: toastId });
            setSubmitted(true);
            setUrl('');
            setNotes('');
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Failed to submit link', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-500 bg-card border border-border/80 p-8 rounded-3xl shadow-sm">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Thank you!</h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            We have received your job link. Our team reviews submissions daily to verify eligibility criteria and direct apply links.
                        </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2">
                        <button 
                            onClick={() => setSubmitted(false)}
                            className="w-full h-11 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all cursor-pointer"
                        >
                            Submit another link
                        </button>
                        <Link 
                            href="/" 
                            className="w-full h-11 text-xs font-semibold rounded-xl border border-border flex items-center justify-center text-foreground hover:bg-muted/50 transition-all"
                        >
                            Return home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700 pb-16">
            <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Post a Job</p>
                        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground mt-1">Submit Job Link</h1>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-card border border-border/85 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Job Opportunity URL</label>
                                <span className="text-[11px] text-muted-foreground block">Enter the official career portal or application form link.</span>
                            </div>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="url"
                                    required
                                    value={url}
                                    onChange={(event) => setUrl(event.target.value)}
                                    placeholder="https://careers.company.com/jobs/..."
                                    className="w-full h-11 rounded-xl border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                        </div>

                        <div className="bg-card border border-border/85 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Submission Notes (Optional)</label>
                                <span className="text-[11px] text-muted-foreground block">Mention role name, company, eligibility, or batch years if known.</span>
                            </div>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={4}
                                placeholder="Example: Google Associate Engineer - 2026 Batch - Bengaluru..."
                                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full h-12 capitalize tracking-widest text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
                        >
                            {submitting ? 'Submitting...' : 'Submit link for review'}
                        </button>
                    </form>

                    <div className="space-y-5">
                        <div className="bg-card border border-border/70 rounded-2xl p-5 space-y-4 shadow-sm">
                            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                                Review Guidelines
                            </h3>
                            <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span>We prioritize official career portal links (clearbit, workday, brassring, myworkdayjobs, greenhouse, lever, etc.).</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span>No direct link shorteners, affiliate trackers, or redirect spam links.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-primary font-bold">•</span>
                                    <span>Roles must target fresh graduates, students (internships), or early-career professionals (0-2 years experience).</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
