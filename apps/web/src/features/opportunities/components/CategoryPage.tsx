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
    topContent?: React.ReactNode;
    bottomContent?: React.ReactNode;
    userLocation?: { latitude: number; longitude: number } | null;
    onLocationRequest?: () => void;
    onLocationClear?: () => void;
    locationLoading?: boolean;
    locationRequested?: boolean;
    locationDenied?: boolean;
}

function CategoryPageContainer({ type, initialData, initialFilters, canonicalRedirect, customTitle, topContent, bottomContent, userLocation, onLocationRequest, onLocationClear, locationLoading, locationRequested, locationDenied }: CategoryPageProps) {
    const state = useCategoryPageState({ type, initialData, initialFilters, canonicalRedirect, customTitle, topContent, bottomContent, userLocation });
    return (
        <CategoryPageView
            {...state}
            onLocationRequest={onLocationRequest}
            onLocationClear={onLocationClear}
            locationLoading={locationLoading}
            locationRequested={locationRequested}
            locationDenied={locationDenied}
        />
    );
}

export default function CategoryPage({ type, initialData, initialFilters, canonicalRedirect, customTitle, topContent, bottomContent, userLocation, onLocationRequest, onLocationClear, locationLoading, locationRequested, locationDenied }: CategoryPageProps) {
    return (
        <Suspense fallback={<FeedPageSkeleton isGovt={type === OpportunityType.GOVERNMENT} />}>
            <CategoryPageContainer type={type} initialData={initialData} initialFilters={initialFilters} canonicalRedirect={canonicalRedirect} customTitle={customTitle} topContent={topContent} bottomContent={bottomContent} userLocation={userLocation} onLocationRequest={onLocationRequest} onLocationClear={onLocationClear} locationLoading={locationLoading} locationRequested={locationRequested} locationDenied={locationDenied} />
        </Suspense>
    );
}
