'use client';

import { Suspense } from 'react';
import { OpportunityFormPage } from '@/features/admin/opportunities/components/OpportunityFormPage';

export default function CreateOpportunityPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-muted-foreground animate-pulse">Loading editor...</div>}>
            <OpportunityFormPage mode="create" />
        </Suspense>
    );
}
