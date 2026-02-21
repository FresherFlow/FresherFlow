export default function OgPreviewPage() {
    return (
        <main className="min-h-screen bg-background px-4 py-8 md:px-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <h1 className="text-xl font-bold text-foreground">OG Preview (Local)</h1>
                <p className="text-sm text-muted-foreground">
                    This previews your website social card assets before production.
                </p>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open Graph</p>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/opengraph-image"
                            alt="Open Graph preview"
                            className="h-auto w-full"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Twitter</p>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/twitter-image"
                            alt="Twitter preview"
                            className="h-auto w-full"
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
