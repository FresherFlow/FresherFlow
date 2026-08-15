import type { Metadata } from 'next';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';
import { DirectoryClient } from '@/ui/DirectoryClient';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Graduation Batch | Fresher Jobs',
    description: 'Find verified jobs, internships and off-campus opportunities for specific graduation batches, including 2026, 2025, 2024 and earlier.',
    alternates: { canonical: `${SITE_URL}/batch` },
};

export default async function BatchIndexPage() {
    const feed = await fetchBootstrapFeed(false, undefined, true);
    const opportunities = feed?.opportunities || [];

    // Extract all batches with job counts
    const batchCounts: Record<string, number> = {};
    for (const opp of opportunities) {
        for (const batchNum of opp.allowedPassoutYears || []) {
            if (!batchNum) continue;
            const key = batchNum.toString();
            batchCounts[key] = (batchCounts[key] || 0) + 1;
        }
    }

    // Sort by batch year desc (2027, 2026, etc)
    const sorted = Object.entries(batchCounts)
        .filter(([, count]) => count >= 5)
        .sort((a, b) => b[0].localeCompare(a[0])) // String compare works for years
        .map(([batch, count]) => ({
            name: `${batch} Batch`,
            count,
            slug: batch
        }));

    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Batches' }]} />
                </HeaderPortal>

                <DirectoryClient 
                    title="Browse Jobs by Graduation Batch"
                    description="Find verified fresher jobs and internships matched to your specific graduation year."
                    data={sorted}
                    urlPrefix="/batch/"
                />
            </main>
        </div>
    );
}
