import { searchClient, OPPORTUNITIES_INDEX } from './client';
import { logger } from '@fresherflow/logger';

export async function indexOpportunity(opportunityData: any) {
    try {
        await searchClient.index(OPPORTUNITIES_INDEX).addDocuments([opportunityData]);
        logger.debug(`Successfully indexed opportunity ${opportunityData.id}`);
    } catch (e) {
        logger.error(`Failed to index opportunity ${opportunityData.id}:`, e);
        throw e;
    }
}

export async function removeOpportunityFromIndex(id: string) {
    try {
        await searchClient.index(OPPORTUNITIES_INDEX).deleteDocument(id);
        logger.debug(`Successfully removed opportunity ${id} from index`);
    } catch (e) {
        logger.error(`Failed to remove opportunity ${id} from index:`, e);
        throw e;
    }
}
