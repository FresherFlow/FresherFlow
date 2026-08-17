'use client';

import { Suspense } from 'react';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { FeedPageSkeleton } from '@/features/opportunities/components/OpportunitySkeletons';
import { useCategoryPageState } from '@/features/opportunities/hooks/useCategoryPageState';
import { CategoryPageView } from '@/features/opportunities/components/CategoryPageView';

interface CategoryPageProps {
    type: OpportunityType | null;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
    initialFilters?: Partial<import('@/features/opportunities/components/FilterDropdownBar').FilterBarFilters>;
    canonicalRedirect?: boolean;
    customTitle?: string;
    bottomContent?: React.ReactNode;
}

function CategoryPageContainer({ type, initialData, initialFilters, canonicalRedirect, customTitle, bottomContent }: CategoryPageProps) {
    const state = useCategoryPageState({ type, initialData, initialFilters, canonicalRedirect, customTitle, bottomContent });
    return <CategoryPageView {...state} />;
}

export default function CategoryPage({ type, initialData, initialFilters, canonicalRedirect, customTitle, bottomContent }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton isGovt={type === OpportunityType.GOVERNMENT} />}>
            <CategoryPageContainer type={type} initialData={initialData} initialFilters={initialFilters} canonicalRedirect={canonicalRedirect} customTitle={customTitle} bottomContent={bottomContent} />
        </Suspense>
    );
}
