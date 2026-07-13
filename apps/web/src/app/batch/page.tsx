import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Graduation Batch | FresherFlow',
    description: 'Find verified fresher jobs, internships, and off-campus placements grouped by your graduation year. Explore opportunities for 2024, 2025, 2026, and 2027 batches.',
    alternates: { canonical: `${SITE_URL}/batch` },
};

export default async function BatchIndexPage() {
    const feed = await fetchBootstrapFeed();
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
        .filter(([, count]) => count >= 1)
        .sort((a, b) => b[0].localeCompare(a[0])); // String compare works for years

    const totalJobs = opportunities.length;

    return (
        <div className="min-h-screen bg-background pb-20">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Batches' }]} />

                {/* Header */}
                <div className="border-b border-border/60 pb-6 space-y-2">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground">
                        Browse by Graduation Batch
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Find verified fresher jobs and internships matched to your specific graduation year.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                            {sorted.length} batches listed
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border">
                            {totalJobs} active listings
                        </span>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sorted.map(([batch, count]) => (
                        <Link
                            key={batch}
                            href={`/batch/${batch}`}
                            className="group flex flex-col justify-center gap-1 p-4 rounded-xl bg-card hover:bg-primary/5 border border-border hover:border-primary/30 transition-all"
                        >
                            <span className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                                {batch} Batch
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {count} active listing{count !== 1 ? 's' : ''}
                            </span>
                        </Link>
                    ))}
                </div>

            </main>
        </div>
    );
}
