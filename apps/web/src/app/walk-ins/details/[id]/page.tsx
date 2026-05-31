import OpportunityDetailPage, { 
    generateMetadata as generateOpportunityMetadata,
    generateStaticParams as generateOpportunityStaticParams
} from '../../../opportunities/[id]/page';

// On-Demand Revalidation is used for this route via /api/revalidate
export const revalidate = false;
export const dynamicParams = true;

export const generateMetadata = generateOpportunityMetadata;
export const generateStaticParams = generateOpportunityStaticParams;

export default OpportunityDetailPage;
