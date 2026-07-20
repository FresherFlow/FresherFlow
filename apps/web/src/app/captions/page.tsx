import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import CaptionsTool from '@/app/(admin)/admin/captions/components/CaptionsTool';
import PasswordGate from '@/lib/components/PasswordGate/PasswordGate';

export const metadata: Metadata = {
    title: 'Captions Generator - FresherFlow',
    description: 'Generate social media captions for jobs',
    robots: {
        index: false,
        follow: false,
    },
};

export default async function PublicCaptionsPage() {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get('captions_auth')?.value === '1';
    
    if (!isAuthed) {
        return <PasswordGate title="Captions Portal" cookieName="captions_auth" />;
    }

    return (
        <main className="min-h-screen bg-background text-foreground py-0 sm:py-4 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <CaptionsTool isAdmin={false} />
        </main>
    );
}
