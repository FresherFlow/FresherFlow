import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import CategoryPage from './CategoryPage';
import { ResolvedTaxonomy, boardFilters } from '../domain/taxonomy';

export function TopicBoardPage({ resolved, jobs, title, cachedAt }: { resolved: ResolvedTaxonomy; jobs: Opportunity[]; title: string; cachedAt?: number }) {
    // Boards never 404 on zero matches (the board slug is provably not a
    // job): an empty board renders its title with an empty state and a path
    // back to live listings. Indexing is handled in generateMetadata
    // (noindex when empty).
    if (jobs.length === 0) {
        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12 space-y-6">
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        <Link href="/jobs" className="transition-colors hover:text-foreground">
                            Jobs
                        </Link>
                        {' / Board'}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                </div>
                <EmptyState
                    icon="search"
                    size="md"
                    title="No live jobs on this board right now"
                    description="New postings appear here first. Save the search and get alerted the moment one lands."
                    action={
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button asChild size="sm" variant="outline">
                                <Link href="/jobs">Browse all jobs</Link>
                            </Button>
                            <Button asChild size="sm">
                                <Link href="/jobs?tab=searches">Save this search</Link>
                            </Button>
                        </div>
                    }
                />
            </main>
        );
    }

    return (
        <CategoryPage
            type={null}
            initialData={{
                opportunities: (jobs as Opportunity[]).slice(0, FEED_PAGE_SIZE),
                total: jobs.length,
                cachedAt: cachedAt ?? Date.now(),
            }}
            initialFilters={boardFilters(resolved) as never}
            customTitle={title}
            canonicalRedirect={true}
        />
    );
}
