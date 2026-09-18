import type { Metadata } from 'next';
import { SavedSearchesClient } from '@/features/community/components/SavedSearchesClient';

export const metadata: Metadata = {
    title: 'Saved Searches | FresherFlow',
    description: 'Save your job filters — batch, city, company — and get notified when new opportunities match.',
};

export default function SavedSearchesPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        ← Community
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Searches</h1>
                <p className="text-sm text-muted-foreground">
                    Can&apos;t check the app all day? Save your filter combo and get counted matches when new drives drop.
                </p>
            </header>
            <SavedSearchesClient />
        </main>
    );
}
