import { Opportunity } from '@fresherflow/types';
import { FEED_PAGE_SIZE } from '@/lib/utils/feedPageSize';
import CategoryPage from './CategoryPage';
import { ResolvedTaxonomy, boardFilters } from '../domain/taxonomy';

export function TopicBoardPage({ resolved, jobs, title, cachedAt }: { resolved: ResolvedTaxonomy; jobs: Opportunity[]; title: string; cachedAt?: number }) {
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
