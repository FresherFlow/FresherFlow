import OpportunityDetailPage, { generateMetadata as generateOpportunityMetadata } from '../../opportunities/[id]/page';

export const revalidate = 3600;
export const dynamicParams = true;

export const generateMetadata = generateOpportunityMetadata;

export default OpportunityDetailPage;
