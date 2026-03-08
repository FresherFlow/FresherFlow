import { searchQueue, SearchIndexJobData } from '../index';

export async function enqueueIndexOpportunity(data: SearchIndexJobData): Promise<void> {
    await searchQueue.add('index-opportunity', data);
}
