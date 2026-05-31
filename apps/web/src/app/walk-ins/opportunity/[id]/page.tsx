import { redirect } from 'next/navigation';
import { generateStaticParams as generateOpportunityStaticParams } from '../../../opportunities/[id]/page';

type LegacyWalkInRouteProps = {
    params: Promise<{
        id: string;
    }>;
};

// On-Demand Revalidation is used for this route via /api/revalidate
export const revalidate = false;
export const dynamicParams = true;
export const generateStaticParams = generateOpportunityStaticParams;

export default async function LegacyWalkInRoute({ params }: LegacyWalkInRouteProps) {
    const { id } = await params;
    redirect(`/walk-ins/details/${id}`);
}
