/**
 * Profile page skeleton.
 *
 * Mirrors the live page's shape — eyebrow rule, identity header, two-column body — so
 * the page does not reflow when the profile resolves. Only the tokens the design system
 * already uses for loading (`animate-pulse` + `bg-muted`) are used here.
 */
export default function ProfilePageLoading() {
    return (
        <div className="min-h-screen w-full bg-background">
            <div className="mx-auto w-full max-w-280 px-6 py-10 md:py-14">
                <div className="flex items-center gap-3">
                    <div className="h-1.75 w-1.75 animate-pulse rounded-full bg-muted" />
                    <div className="h-3 w-28 animate-pulse rounded-xs bg-muted" />
                    <div className="h-px flex-1 bg-border" />
                </div>

                <div className="mt-6 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-5">
                        <div className="h-16 w-16 shrink-0 animate-pulse rounded-xs bg-muted md:h-20 md:w-20" />
                        <div className="space-y-3 pt-1">
                            <div className="h-9 w-56 animate-pulse rounded-xs bg-muted" />
                            <div className="h-3 w-40 animate-pulse rounded-xs bg-muted/60" />
                            <div className="flex gap-2 pt-1">
                                <div className="h-6 w-32 animate-pulse rounded-xs bg-muted/60" />
                                <div className="h-6 w-28 animate-pulse rounded-xs bg-muted/60" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-28 animate-pulse rounded-xs bg-muted/60" />
                        <div className="h-9 w-24 animate-pulse rounded-xs bg-muted/60" />
                    </div>
                </div>

                <div className="mt-10 flex flex-col gap-10 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-10">
                        {[0, 1].map((block) => (
                            <div key={block} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-3 w-20 animate-pulse rounded-xs bg-muted" />
                                    <div className="h-px flex-1 bg-border" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-full animate-pulse rounded-xs bg-muted/60" />
                                    <div className="h-4 w-5/6 animate-pulse rounded-xs bg-muted/60" />
                                    <div className="h-4 w-2/3 animate-pulse rounded-xs bg-muted/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="h-40 animate-pulse rounded-xs border border-border bg-muted/30 lg:w-75 lg:shrink-0" />
                </div>
            </div>
        </div>
    );
}
