import Link from 'next/link';

interface ShareListingBannerProps {
    title: string;
    company: string;
    onCopyCaption: (platform: 'telegram' | 'linkedin' | 'x' | 'instagram') => void;
    onCopyFullPack: () => void;
}

export function ShareListingBanner({
    onCopyCaption,
    onCopyFullPack
}: ShareListingBannerProps) {
    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Listing published</h3>
                    <p className="text-xs text-muted-foreground mt-1">Copy platform captions or open the listings page.</p>
                </div>
                <Link
                    href="/opportunities"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold capitalize tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Back to listings
                </Link>
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => onCopyCaption('telegram')}
                    className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-[10px] font-bold capitalize tracking-widest text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Copy Telegram
                </button>
                <button
                    type="button"
                    onClick={() => onCopyCaption('linkedin')}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold capitalize tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Copy LinkedIn
                </button>
                <button
                    type="button"
                    onClick={() => onCopyCaption('x')}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold capitalize tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Copy X
                </button>
                <button
                    type="button"
                    onClick={() => onCopyCaption('instagram')}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold capitalize tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Copy Instagram
                </button>
                <button
                    type="button"
                    onClick={onCopyFullPack}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold capitalize tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                    Copy full pack
                </button>
            </div>
        </div>
    );
}
