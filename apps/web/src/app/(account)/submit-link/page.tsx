'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { joblinksApi } from '@/lib/api/client';

export default function SubmitLinkPage() {
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!url || !url.startsWith('http')) {
            setStatus('error');
            setErrorMessage('Please enter a valid URL starting with http:// or https://');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const source = user ? (user.fullName || user.email || 'authenticated') : 'anonymous';
            await joblinksApi.submit(url, source);
            setStatus('success');
            setUrl('');
        } catch (error) {
            setStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-500 pb-20 font-sans">
            <main className="max-w-2xl mx-auto px-4 md:px-8 py-5 md:py-10">

                {/* Top bar */}
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/account" className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95 group">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Submit a Job Link</h1>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                    <div className="mb-6 space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                            <LinkIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Help the Community</h2>
                        <p className="text-sm text-muted-foreground">
                            Found an interesting job, internship, or walk-in drive? Paste the link below to share it with other FresherFlow users. Our team will verify and add it to the platform!
                        </p>
                    </div>

                    {status === 'success' ? (
                        <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
                            <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto" />
                            <div>
                                <h3 className="text-green-600 dark:text-green-400 font-bold">Successfully Submitted!</h3>
                                <p className="text-sm text-green-600/80 dark:text-green-400/80 mt-1">Thank you for contributing to FresherFlow.</p>
                            </div>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-4 px-4 py-2 bg-background border border-border rounded-lg text-sm font-semibold hover:bg-muted transition-colors"
                            >
                                Submit Another Link
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="job-url" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                                    Job URL
                                </label>
                                <input
                                    id="job-url"
                                    type="url"
                                    placeholder="https://careers.google.com/jobs/..."
                                    value={url}
                                    onChange={(e) => {
                                        setUrl(e.target.value);
                                        if (status === 'error') setStatus('idle');
                                    }}
                                    disabled={status === 'loading'}
                                    className="w-full px-4 py-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all placeholder:text-muted-foreground/50"
                                    required
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-sm text-red-500 font-medium animate-in fade-in">{errorMessage}</p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full h-11 bg-foreground text-background rounded-xl text-sm font-semibold hover:opacity-85 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Link'
                                )}
                            </button>
                        </form>
                    )}
                </div>

            </main>
        </div>
    );
}
