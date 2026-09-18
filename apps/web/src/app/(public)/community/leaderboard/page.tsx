import type { Metadata } from 'next';
import { LeaderboardClient } from '@/features/community/components/LeaderboardClient';

export const metadata: Metadata = {
    title: 'Leaderboard | FresherFlow Community',
    description: 'Top contributors on FresherFlow — people who submit jobs, share experiences, and help fellow freshers.',
};

export default function LeaderboardPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        ← Community
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
                <p className="text-sm text-muted-foreground">
                    Top contributors ranked by submissions, comments, and community signals.
                </p>
            </header>
            <LeaderboardClient />
        </main>
    );
}
