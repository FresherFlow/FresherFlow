'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import { useAuth } from '@/lib/auth/AuthContext';

type Result =
    | { kind: 'created'; slug: string }
    | { kind: 'existing'; slug: string }
    | null;

export function PostJobForm() {
    const { user } = useAuth();
    const [sourceUrl, setSourceUrl] = useState('');
    const [applyUrl, setApplyUrl] = useState('');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result>(null);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);

        if (!sourceUrl.trim() || !title.trim()) {
            setError('A source link and a title are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await communityApi.submitJob({
                sourceUrl: sourceUrl.trim(),
                applyUrl: applyUrl.trim() || undefined,
                title: title.trim(),
                company: company.trim() || undefined,
                description: description.trim() || undefined,
            });
            setResult(
                res.existing
                    ? { kind: 'existing', slug: res.slug }
                    : { kind: 'created', slug: res.slug }
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit this job.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center space-y-3">
                <h2 className="text-base font-bold text-foreground">Sign in to share a job</h2>
                <p className="text-xs text-muted-foreground">
                    Posting a link keeps provenance with your account so others can trust it.
                </p>
                <Link
                    href={`/login?next=${encodeURIComponent('/post')}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    Sign in
                </Link>
            </div>
        );
    }

    if (result) {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                <h2 className="text-base font-bold text-foreground">
                    {result.kind === 'existing' ? 'Looks like we already have this job' : 'Job shared'}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {result.kind === 'existing'
                        ? 'We folded your link into the existing listing.'
                        : 'Thanks — it is live now.'}
                </p>
                <Link
                    href={`/jobs/${result.slug}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    View job
                </Link>
            </div>
        );
    }

    const inputClass =
        'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label htmlFor="sourceUrl" className="text-xs font-semibold text-foreground">
                    Job link <span className="text-destructive">*</span>
                </label>
                <input
                    id="sourceUrl"
                    type="url"
                    required
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://careers.example.com/jobs/123"
                    className={inputClass}
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="title" className="text-xs font-semibold text-foreground">
                    Title <span className="text-destructive">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Software Engineer"
                    className={inputClass}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="company" className="text-xs font-semibold text-foreground">
                        Company
                    </label>
                    <input
                        id="company"
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Acme"
                        className={inputClass}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="applyUrl" className="text-xs font-semibold text-foreground">
                        Apply link
                    </label>
                    <input
                        id="applyUrl"
                        type="url"
                        value={applyUrl}
                        onChange={e => setApplyUrl(e.target.value)}
                        placeholder="https://…"
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-semibold text-foreground">
                    Notes
                </label>
                <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Anything useful for other candidates?"
                    className={inputClass}
                />
            </div>

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-[11px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 sm:w-auto sm:px-8"
            >
                {submitting ? 'Sharing…' : 'Share job'}
            </button>
        </form>
    );
}
