import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { DiscoveryWorkspace } from '@/features/admin/discovery/DiscoveryWorkspace';
import PasswordGate from '@/lib/components/PasswordGate/PasswordGate';

export const metadata: Metadata = {
    title: 'Discovery Control - FresherFlow',
    description: 'ATS Ingestion Engine & Opportunity Discovery Control Room',
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

export default async function DiscoveryPage() {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get('discovery_auth')?.value === '1';
    
    if (!isAuthed) {
        return <PasswordGate title="Discovery Portal" cookieName="discovery_auth" />;
    }

    return (
        <main className="min-h-screen bg-background text-foreground max-w-7xl mx-auto flex flex-col h-[100dvh]">
            <DiscoveryWorkspace />
        </main>
    );
}
