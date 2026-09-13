import { Opportunity } from '@fresherflow/types';
import CategoryPage from './CategoryPage';
import { ResolvedTaxonomy, boardFilters } from '../lib/taxonomyRegistry';

export function TopicBoardPage({ resolved, jobs, title, cachedAt }: { resolved: ResolvedTaxonomy; jobs: Opportunity[]; title: string; cachedAt?: number }) {
    return (
        <CategoryPage
            type={null}
            initialData={{
                opportunities: jobs as Opportunity[],
                total: jobs.length,
                cachedAt: cachedAt ?? Date.now(),
            }}
            initialFilters={boardFilters(resolved) as never}
            customTitle={title}
            canonicalRedirect={true}
        />
    );
}
