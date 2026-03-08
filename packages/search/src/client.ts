import { MeiliSearch } from 'meilisearch';

const host = process.env.MEILISEARCH_HOST || 'http://127.0.0.1:7700';
const apiKey = process.env.MEILISEARCH_API_KEY || 'masterKey';

export const searchClient = new MeiliSearch({
    host,
    apiKey,
});

export const OPPORTUNITIES_INDEX = 'opportunities';
