import Link from 'next/link';

export function AppPromoBanner() {
    return (
        <div className="bg-primary/[0.03] dark:bg-primary/[0.01] border border-primary/10 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.523 15.3414C17.078 15.3414 16.717 14.9804 16.717 14.5354C16.717 14.0904 17.523 13.7294 17.523 13.7294C17.968 13.7294 18.329 14.0904 18.329 14.5354C18.329 14.9804 17.968 15.3414 17.523 15.3414ZM6.477 15.3414C6.032 15.3414 5.671 14.9804 5.671 14.5354C5.671 14.0904 6.032 13.7294 6.477 13.7294C6.922 13.7294 7.283 14.0904 7.283 14.5354C7.283 14.9804 6.922 15.3414 6.477 15.3414ZM17.925 9.7894L19.92 6.3314C20.088 6.0394 19.988 5.6664 19.696 5.4984C19.404 5.3304 19.031 5.4304 18.863 5.7224L16.828 9.2484C15.397 8.5994 13.784 8.2414 12 8.2414C10.216 8.2414 8.603 8.5994 7.172 9.2484L5.137 5.7224C4.969 5.4304 4.596 5.3304 4.304 5.4984C4.012 5.6664 3.912 6.0394 4.08 6.3314L6.075 9.7894C2.569 11.7584 0.17 15.3764 0 19.6454H24C23.83 15.3764 21.431 11.7584 17.925 9.7894Z"/>
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground">Get Instant Job Updates</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Download our Android app to track applications on the go.</p>
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
