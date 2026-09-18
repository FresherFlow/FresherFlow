import type { Metadata } from 'next';
import { CommunityFeedClient } from '@/features/community/components/CommunityFeedClient';

export const metadata: Metadata = {
    title: 'Community | FresherFlow',
    description: 'Discuss jobs, share experiences, and connect with freshers.',
};

export default function CommunityPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Community</h1>                    <a href="/community/leaderboard" className="rounded-full bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                        Leaderboard
                    </a>
                </div>
                <p className="text-sm text-muted-foreground">
                    Discuss job opportunities, share experiences, and connect with fellow freshers.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                    <a href="/community/referrals" className="rounded-full bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                        Referral Board
                    </a>
                    <a href="/community/salary" className="rounded-full bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                        Salary &amp; Offers
                    </a>
                    <a href="/community/saved-searches" className="rounded-full bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                        Saved Searches
                    </a>
                    <a href="/community/leaderboard" className="rounded-full bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground">
                        Leaderboard
                    </a>
                </div>
            </header>
            <CommunityFeedClient />
        </main>
    );
}
