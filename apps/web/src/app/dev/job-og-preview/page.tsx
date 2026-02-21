'use client';

import { useState } from 'react';

export default function JobOgPreviewPage() {
    const [mode, setMode] = useState<'job' | 'drive'>('job');
    const previewUrl = `/api/og/job/preview?mode=${mode}`;

    return (
        <main className="min-h-screen bg-background px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-5xl space-y-5">
                <h1 className="text-xl font-bold text-foreground">Job OG Preview (Dummy Data)</h1>
                <p className="text-sm text-muted-foreground">
                    Switch mode and review the generated job OG card locally.
                </p>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('job')}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${mode === 'job' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
                    >
                        Normal Job
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('drive')}
                        className={`rounded-lg border px-4 py-2 text-sm font-semibold ${mode === 'drive' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
                    >
                        Hiring Drive
                    </button>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                    URL: <code>{previewUrl}</code>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Dummy generated job OG preview" className="h-auto w-full" />
                </div>
            </div>
        </main>
    );
}
