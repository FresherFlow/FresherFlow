import Link from 'next/link';

export function AppPromoBanner() {
    return (
        <div className="bg-primary/[0.03] dark:bg-primary/[0.01] border border-primary/10 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">Get Instant Job Updates</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Download our mobile app to track applications on the go.</p>
                </div>
            </div>
            <Link
                href="/app"
                className="shrink-0 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
            >
                Install App
            </Link>
        </div>
    );
}
