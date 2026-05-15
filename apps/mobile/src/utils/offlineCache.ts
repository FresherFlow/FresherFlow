import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';

const FEED_INDEX_KEY = 'fresherflow_feed_index';
const JOB_PREFIX = 'fresherflow_job_';
const SHARES_CACHE_KEY = 'fresherflow_shares_cache';
const COMPANIES_CACHE_KEY = 'fresherflow_companies_cache';
const ALERTS_CACHE_KEY = 'fresherflow_alerts_cache';
const DETAIL_CACHE_PREFIX = 'fresherflow_detail_cache_';
const COMPANY_JOBS_CACHE_PREFIX = 'fresherflow_company_jobs_cache_';
const LAST_SYNC_KEY = 'fresherflow_last_sync_timestamp';

export const saveLastSyncTimestamp = async (timestamp: string) => {
    try {
        await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
        console.warn('Failed to save last sync timestamp', error);
    }
};

export const getLastSyncTimestamp = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch {
        return null;
    }
};

/**
 * Saves a single opportunity atomically to its own key.
 * This prevents "Large Object" serialization lag.
 */
export const saveOpportunityAtomic = async (job: Opportunity) => {
    try {
        await AsyncStorage.setItem(`${JOB_PREFIX}${job.id}`, JSON.stringify(job));
    } catch (e) {
        console.warn(`[Atomic] Failed to save job ${job.id}`, e);
    }
};

/**
 * Reads a single opportunity by ID.
 */
export const getOpportunityAtomic = async (id: string): Promise<Opportunity | null> => {
    try {
        const data = await AsyncStorage.getItem(`${JOB_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

export interface FeedIndex {
    ids: string[];
    timestamp: number;
}

/**
 * Saves the feed as a list of IDs + individual atomic job saves using BATCH operations.
 */
export const saveFeedCache = async (items: Opportunity[]) => {
    try {
        if (items.length === 0) return;
        
        // 1. Perform Storage Garbage Collection
        await pruneGhostJobs(items.map(i => i.id));

        // 2. Prepare batch set
        const batch: [string, string][] = items.map(job => [
            `${JOB_PREFIX}${job.id}`,
            JSON.stringify(job)
        ]);

        // 3. Execute multiSet for maximum bridge efficiency
        await AsyncStorage.multiSet(batch);

        // 4. Save the index (order)
        const index: FeedIndex = {
            ids: items.map(i => i.id),
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(FEED_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
        console.warn('Failed to save batch feed cache', error);
    }
};

/**
 * Reads the feed by reconstructing it from the index and atomic keys using BATCH read.
 */
export const readFeedCache = async (): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    try {
        const indexJson = await AsyncStorage.getItem(FEED_INDEX_KEY);
        if (!indexJson) return null;

        const index: FeedIndex = JSON.parse(indexJson);
        if (!index.ids || index.ids.length === 0) return null;

        // 3. Batch read all keys from the index
        const keys = index.ids.map(id => `${JOB_PREFIX}${id}`);
        const pairs = await AsyncStorage.multiGet(keys);
        
        const items: Opportunity[] = pairs
            .map(([, value]) => value ? JSON.parse(value) : null)
            .filter((j): j is Opportunity => j !== null);

        return {
            items,
            timestamp: index.timestamp
        };
    } catch (error) {
        console.warn('Failed to read batch feed cache', error);
        return null;
    }
};

export const saveSharesCache = async (shares: unknown[], stats: unknown) => {
    try {
        const cache = {
            items: shares,
            stats,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(SHARES_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save shares cache', error);
    }
};

export const readSharesCache = async (): Promise<{ items: unknown[], stats: unknown, timestamp: number } | null> => {
    try {
        const data = await AsyncStorage.getItem(SHARES_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read shares cache', error);
        return null;
    }
};

export const saveCompaniesCache = async (companies: unknown[]) => {
    try {
        const cache = {
            items: companies,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(COMPANIES_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save companies cache', error);
    }
};

export const readCompaniesCache = async (): Promise<{ items: unknown[], timestamp: number } | null> => {
    try {
        const data = await AsyncStorage.getItem(COMPANIES_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read companies cache', error);
        return null;
    }
};

export const saveAlertsCache = async (alerts: unknown[], unreadCount: number) => {
    try {
        const cache = {
            items: alerts,
            unreadCount,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save alerts cache', error);
    }
};

export const readAlertsCache = async (): Promise<{ items: unknown[], unreadCount: number, timestamp: number } | null> => {
    try {
        const data = await AsyncStorage.getItem(ALERTS_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read alerts cache', error);
        return null;
    }
};

export const saveCompanyJobsCache = async (companyName: string, jobs: Opportunity[]) => {
    try {
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const key = `${COMPANY_JOBS_CACHE_PREFIX}${slug}`;
        const cache = {
            items: jobs,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(key, JSON.stringify(cache));
    } catch (error) {
        console.warn(`Failed to save company jobs cache for ${companyName}`, error);
    }
};

export const readCompanyJobsCache = async (companyName: string): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    try {
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const key = `${COMPANY_JOBS_CACHE_PREFIX}${slug}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn(`Failed to read company jobs cache for ${companyName}`, error);
        return null;
    }
};

const SIMILAR_CACHE_PREFIX = 'fresherflow_similar_cache_';

export const saveDetailCache = async (opportunity: Opportunity) => {
    try {
        const cache = {
            ...opportunity,
            _cachedAt: Date.now()
        };
        await AsyncStorage.setItem(`${DETAIL_CACHE_PREFIX}${opportunity.id}`, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save detail cache', error);
    }
};

export const readDetailCache = async (id: string): Promise<Opportunity & { _cachedAt?: number } | null> => {
    try {
        const data = await AsyncStorage.getItem(`${DETAIL_CACHE_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read detail cache', error);
        return null;
    }
};

export interface SimilarCache {
    opportunities: Opportunity[];
    timestamp: number;
}

export const saveSimilarCache = async (opportunityId: string, opportunities: Opportunity[]) => {
    try {
        const cache: SimilarCache = {
            opportunities,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(`${SIMILAR_CACHE_PREFIX}${opportunityId}`, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save similar cache', error);
    }
};

export const readSimilarCache = async (opportunityId: string): Promise<SimilarCache | null> => {
    try {
        const data = await AsyncStorage.getItem(`${SIMILAR_CACHE_PREFIX}${opportunityId}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read similar cache', error);
        return null;
    }
};

/**
 * Searches across all primary job caches (Feed, Explore, etc.) to find jobs matching a company.
 * This follows the "Global Sync + Local Filtering" architecture.
 */
export const findJobsByCompanyLocally = async (companyName: string): Promise<Opportunity[]> => {
    try {
        const feedCache = await readFeedCache();
        const exploreData = await AsyncStorage.getItem('fresherflow_explore_cache');

        const allJobs: Opportunity[] = feedCache?.items || [];
        const seenIds = new Set<string>(allJobs.map(j => j.id));

        if (exploreData) {
            try {
                const parsed = JSON.parse(exploreData);
                const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
                items.forEach((job: Opportunity) => {
                    if (job && job.id && !seenIds.has(job.id)) {
                        allJobs.push(job);
                        seenIds.add(job.id);
                    }
                });
            } catch (e) {
                console.warn('Failed to parse explore cache chunk', e);
            }
        }

        const target = companyName.toLowerCase().trim();
        return allJobs.filter(job => job.company.toLowerCase().trim() === target);
    } catch (error) {
        console.warn('Local company job search failed', error);
        return [];
    }
};

/**
 * Prunes jobs from disk that are no longer present in the primary index.
 * This prevents the "Ghost Jobs" issue where thousands of individual keys stay on disk.
 */
export const pruneGhostJobs = async (currentIds: string[]) => {
    try {
        const oldIndexJson = await AsyncStorage.getItem(FEED_INDEX_KEY);
        if (!oldIndexJson) return;

        const oldIndex: FeedIndex = JSON.parse(oldIndexJson);
        const newIdsSet = new Set(currentIds);
        
        // Identify jobs that were in the old feed but are not in the current one
        const ghostIds = oldIndex.ids.filter(id => !newIdsSet.has(id));
        
        if (ghostIds.length > 0) {
            const ghostKeys = ghostIds.map(id => `${JOB_PREFIX}${id}`);
            // Also prune detail caches for these jobs to be extra thorough
            const detailKeys = ghostIds.map(id => `${DETAIL_CACHE_PREFIX}${id}`);
            
            await AsyncStorage.multiRemove([...ghostKeys, ...detailKeys]);
            console.log(`[OfflineCache] GC: Pruned ${ghostIds.length} ghost jobs from disk`);
        }
    } catch (e) {
        console.warn('[OfflineCache] GC Failed', e);
    }
};
/**
 * Wipes all FresherFlow related cache from disk.
 * Use this for debugging cold-start or forcing a fresh sync.
 */
export const clearAllCache = async () => {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        const ffKeys = allKeys.filter(k => k.startsWith('fresherflow_'));
        if (ffKeys.length > 0) {
            await AsyncStorage.multiRemove(ffKeys);
        }
        console.log(`[OfflineCache] Successfully cleared ${ffKeys.length} keys`);
    } catch (e) {
        console.warn('[OfflineCache] Clear failed', e);
    }
};
