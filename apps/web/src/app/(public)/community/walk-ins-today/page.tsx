import type { Metadata } from 'next';
import { WalkInsTodayClient } from '@/features/community/components/WalkInsTodayClient';

export const metadata: Metadata = {
    title: 'Walk-ins Today | FresherFlow',
    description: 'Walk-in drives happening today and tomorrow, filtered by your city and batch. Check before you leave home.',
};

export default function WalkInsTodayPage() {
    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/jobs/walkins" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        All walk-ins
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Walk-ins Today</h1>
                <p className="text-sm text-muted-foreground">
                    The 9am check: drives running today near you, filtered by your batch. Resume copies, ID, photos —
                    verify the required documents on each drive page before travelling.
                </p>
            </header>
            <WalkInsTodayClient />
        </main>
    );
}
