'use client';

import { Suspense } from 'react';
import { OpportunityFormPage } from '@/features/admin/opportunities/components/OpportunityFormPage';

export default function CreateOpportunityPage() {
    return (
        <Suspense fallback={<div className="p-10" aria-hidden />}>
            <OpportunityFormPage mode="create" />
        </Suspense>
    );
}
