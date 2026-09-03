'use client';

import { Opportunity, OpportunityType } from '@fresherflow/types';
import CategoryPage from '@/features/opportunities/components/CategoryPage';
import { useGeolocation } from '@/hooks/useGeolocation';

interface WalkInsClientProps {
    initialData: {
        opportunities: Opportunity[];
        total: number;
        cachedAt: number;
    };
}

export function WalkInsClient({ initialData }: WalkInsClientProps) {
    const { latitude, longitude, requestLocation, clearLocation, loading, permissionDenied, requested } = useGeolocation();

    const userLocation = (latitude !== null && longitude !== null)
        ? { latitude, longitude }
        : null;

    return (
        <CategoryPage
            type={OpportunityType.WALKIN}
            initialData={initialData}
            userLocation={userLocation}
            onLocationRequest={requestLocation}
            onLocationClear={clearLocation}
            locationLoading={loading}
            locationRequested={requested}
            locationDenied={permissionDenied}
        />
    );
}
