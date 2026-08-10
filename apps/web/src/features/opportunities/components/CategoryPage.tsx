'use client';

import { Suspense } from 'react';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { FeedPageSkeleton } from '@/ui/Skeleton';
import { useCategoryPageState } from '@/features/opportunities/hooks/useCategoryPageState';
import { CategoryPageView } from '@/features/opportunities/components/CategoryPageView';

interface CategoryPageProps {
    type: OpportunityType | null;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
    initialFilters?: Partial<import('@/features/opportunities/components/FilterDropdownBar').FilterBarFilters>;
    canonicalRedirect?: boolean;
}

function CategoryPageContainer({ type, initialData, initialFilters, canonicalRedirect }: CategoryPageProps) {
    const state = useCategoryPageState({ type, initialData, initialFilters, canonicalRedirect });
    return <CategoryPageView {...state} />;
}

export default function CategoryPage({ type, initialData, initialFilters, canonicalRedirect }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton isGovt={type === OpportunityType.GOVERNMENT} />}>
            <CategoryPageContainer type={type} initialData={initialData} initialFilters={initialFilters} canonicalRedirect={canonicalRedirect} />
        </Suspense>
    );
}
