import type { Metadata } from 'next';
import { ReferralBoardClient } from '@/features/community/components/ReferralBoardClient';

export const metadata: Metadata = {
    title: 'Referral Board | FresherFlow Community',
    description: 'Ask for referrals at companies you want to join, or refer a fellow fresher. Community-driven referral requests.',
};

export default function ReferralBoardPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        ← Community
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Referral Board</h1>
                <p className="text-sm text-muted-foreground">
                    &quot;Anyone at Zoho willing to refer for 2026 batch?&quot; — ask here. Employees can respond directly.
                    Contact handles are only visible on responses you choose to open.
                </p>
            </header>
            <ReferralBoardClient />
        </main>
    );
}
