import type { Metadata } from 'next';
import { SalaryReportsClient } from '@/features/community/components/SalaryReportsClient';

export const metadata: Metadata = {
    title: 'Salary & Offers | FresherFlow Community',
    description: 'Real CTC, in-hand salary, and bond details shared by freshers. Know what an offer is actually worth before you accept.',
};

export default function SalaryReportsPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        ← Community
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Salary &amp; Offers</h1>
                <p className="text-sm text-muted-foreground">
                    Real numbers from real offers — CTC breakup, in-hand, bonds. Stop guessing what &quot;5 LPA&quot; means.
                </p>
            </header>
            <SalaryReportsClient />
        </main>
    );
}
