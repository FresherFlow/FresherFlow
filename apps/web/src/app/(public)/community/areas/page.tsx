import type { Metadata } from 'next';
import { AreasDirectoryClient } from '@/features/community/components/AreasDirectoryClient';

export const metadata: Metadata = {
    title: 'Areas | FresherFlow Community',
    description: 'Join persistent communities organized by batch, skill, location, and more.',
};

export default function AreasPage() {
    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-3">
                    <a href="/community" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        ← Community
                    </a>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Areas</h1>
                <p className="text-sm text-muted-foreground">
                    Persistent communities organized by batch, skill, location, and more.
                </p>
            </header>
            <AreasDirectoryClient />
        </main>
    );
}
