'use client';

import { Suspense } from 'react';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { FeedPageSkeleton } from '@/ui/Skeleton';
import { useCategoryPageState } from '@/features/opportunities/hooks/useCategoryPageState';
import { CategoryPageView } from '@/features/opportunities/components/CategoryPageView';

interface CategoryPageProps {
    type: OpportunityType;
    initialData?: { opportunities: Opportunity[]; total: number; cachedAt?: number } | null;
}

function CategoryPageContainer({ type, initialData }: CategoryPageProps) {
    const state = useCategoryPageState({ type, initialData });
    return <CategoryPageView {...state} />;
}

export default function CategoryPage({ type, initialData }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton isGovt={type === OpportunityType.GOVERNMENT} />}>
            <CategoryPageContainer type={type} initialData={initialData} />
        </Suspense>
    );
}
