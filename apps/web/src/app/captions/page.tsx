import type { Metadata } from 'next';
import CaptionsTool from '@/app/(admin)/admin/captions/components/CaptionsTool';

export const metadata: Metadata = {
    title: "Social Captions Generator | FresherFlow",
    description: "Internal utility to compile and generate platform-optimized job opportunity captions.",
    robots: {
        index: false,
        follow: false,
    }
};

export default function PublicCaptionsPage() {
    return (
        <main className="min-h-screen bg-background text-foreground py-0 sm:py-4 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <CaptionsTool isAdmin={false} />
        </main>
    );
}
