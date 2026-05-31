import OpportunityDetailPage, { 
    generateMetadata as generateOpportunityMetadata,
    generateStaticParams as generateOpportunityStaticParams
} from '../../opportunities/[id]/page';

export const dynamicParams = true;

export const generateMetadata = generateOpportunityMetadata;
export const generateStaticParams = generateOpportunityStaticParams;

export default OpportunityDetailPage;
