import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchBootstrapFeed } from '@/lib/api/cdnFeed';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { Card, CardContent } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { HeaderPortal } from '@/lib/components/HeaderPortal';

export const revalidate = false;

export const metadata: Metadata = {
    title: 'Jobs by Graduation Batch',
    description: 'Find verified fresher jobs, internships, and walk-in drives by graduation batch (2025, 2024, 2023, 2022).',
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
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

                <HeaderPortal>
                    <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Batches' }]} />
                </HeaderPortal>

                {/* Header */}
                <div className="pb-4 border-b border-border/40 space-y-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Browse Jobs by Graduation Batch
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                        Find verified fresher jobs and internships matched to your specific graduation year.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Badge variant="default" className="text-xs font-semibold px-3 py-1">
                            {sorted.length} batches listed
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
                            {totalJobs} active listings
                        </Badge>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sorted.map(([batch, count]) => (
                        <Link key={batch} href={`/batch/${batch}`} className="group">
                            <Card className="border-border/70 hover:border-border hover:bg-accent/40 transition-all shadow-2xs">
                                <CardContent className="p-5 flex items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                            {batch} Batch
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {count} active listing{count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        View →
                                    </Badge>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

            </main>
        </div>
    );
}
