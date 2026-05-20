import { redirect } from 'next/navigation';
import { generateStaticParams as generateOpportunityStaticParams } from '../../../opportunities/[id]/page';

type LegacyWalkInRouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export const revalidate = 3600;
export const dynamicParams = true;
export const generateStaticParams = generateOpportunityStaticParams;

export default async function LegacyWalkInRoute({ params }: LegacyWalkInRouteProps) {
    const { id } = await params;
    redirect(`/walk-ins/details/${id}`);
}
