import PendingTool from '../(admin)/admin/pending/components/PendingTool';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pending Jobs - FresherFlow',
    description: 'Verify and view pending jobs',
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

export default function PendingPage() {
    return (
        <main className="h-[100dvh] max-h-screen bg-background text-foreground p-0 sm:p-4 lg:p-6 max-w-7xl mx-auto flex flex-col min-h-0 overflow-hidden">
            <PendingTool />
        </main>
    );
}
