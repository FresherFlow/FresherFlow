'use client';

import { Suspense } from 'react';
import { OpportunityFormPage } from '@/features/admin/opportunities/components/OpportunityFormPage';

export default function CreateGovernmentJobPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-muted-foreground animate-pulse">Loading government job editor...</div>}>
            <OpportunityFormPage mode="create" initialGovernmentMode />
        </Suspense>
    );
}
