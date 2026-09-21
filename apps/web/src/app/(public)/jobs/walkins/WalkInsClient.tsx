'use client';

import { useMemo } from 'react';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import CategoryPage from '@/features/jobs/components/CategoryPage';
import { useGeolocation } from '@/hooks/useGeolocation';
import { WalkinEventBoard } from '@/features/jobs/components/WalkinEventBoard';

interface WalkInsClientProps {
    initialData: {
        opportunities: Opportunity[];
        total: number;
        cachedAt: number;
    } | null;
}

export function WalkInsClient({ initialData }: WalkInsClientProps) {
    const { latitude, longitude, requestLocation, clearLocation, loading, permissionDenied, requested } = useGeolocation();

    const userLocation = (latitude !== null && longitude !== null)
        ? { latitude, longitude }
        : null;

    // The event board renders above the feed via CategoryPage's topContent slot.
    // Calendar/List/Map switching is owned by CategoryPageView's view switcher —
    // one control surface, no floating buttons colliding with filters.
    const topContent = useMemo(() => {
        const opps = initialData?.opportunities ?? [];
        if (opps.length === 0) return null;
        return <WalkinEventBoard opportunities={opps} />;
    }, [initialData]);

    return (
        <CategoryPage
            type={OpportunityType.WALKIN}
            initialData={initialData}
            topContent={topContent}
            userLocation={userLocation}
            onLocationRequest={requestLocation}
            onLocationClear={clearLocation}
            locationLoading={loading}
            locationRequested={requested}
            locationDenied={permissionDenied}
        />
    );
}
