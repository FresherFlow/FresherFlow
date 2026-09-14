import type { Metadata } from 'next';
import { PostJobForm } from '@/features/opportunities/components/post/PostJobForm';

export const metadata: Metadata = {
    title: 'Share a job | FresherFlow',
    description: 'Share a job or internship opening with other freshers.',
};

export default function ContributePage() {
    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Share a job</h1>
                <p className="text-sm text-muted-foreground">
                    Paste a link to an opening. We keep the source and who shared it, so others can trust it.
                </p>
            </header>
            <PostJobForm />
        </main>
    );
}
