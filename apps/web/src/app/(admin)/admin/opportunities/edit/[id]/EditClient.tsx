'use client';

import { useParams } from 'next/navigation';
import { OpportunityFormPage } from '@/features/admin/opportunities/components/OpportunityFormPage';

export default function EditOpportunityPage() {
    const params = useParams<{ id: string }>();
    const id = typeof params?.id === 'string' ? params.id : '';

    if (!id) return null;

    return <OpportunityFormPage mode="edit" opportunityId={id} />;
}
