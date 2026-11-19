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
        const emptyTitle =
            resolved.kind === 'city'
                ? `No jobs in ${resolved.label} right now`
                : resolved.kind === 'year'
                    ? `No jobs for ${resolved.year} passouts right now`
                    : `No ${resolved.label.toLowerCase()} jobs right now`;

        return (
            <main className="mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
                <div className="rounded-2xl border border-border-strong bg-card p-6 dark:border-transparent md:p-8">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        <span className="text-meta font-medium text-muted-foreground">Job board</span>
                    </div>
                    <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground text-balance md:text-3xl">
                        {title}
                    </h1>
                    <div className="mt-6">
                        <EmptyState
                            icon="search"
                            size="md"
                            title={emptyTitle}
                            description="Browse all jobs to see what's open, or check back when new postings land."
                            action={
                                <Button asChild size="sm">
                                    <Link href="/jobs">Browse all jobs</Link>
                                </Button>
                            }
                        />
                    </div>
                </div>
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
