import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';

const FEED_CACHE_KEY = 'fresherflow_feed_cache';
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

export interface FeedCache {
    items: Opportunity[];
    timestamp: number;
}

export const saveFeedCache = async (items: Opportunity[]) => {
    try {
        const cache: FeedCache = {
            items,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save feed cache', error);
    }
};

export const readFeedCache = async (): Promise<FeedCache | null> => {
    try {
        const data = await AsyncStorage.getItem(FEED_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read feed cache', error);
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
        const [feedData, exploreData] = await Promise.all([
            AsyncStorage.getItem(FEED_CACHE_KEY),
            AsyncStorage.getItem('fresherflow_explore_cache') // Note: Explore uses its own key
        ]);

        const allJobs: Opportunity[] = [];
        const seenIds = new Set<string>();

        const process = (json: string | null) => {
            if (!json) return;
            try {
                const parsed = JSON.parse(json);
                const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
                items.forEach((job: Opportunity) => {
                    if (job && job.id && !seenIds.has(job.id)) {
                        allJobs.push(job);
                        seenIds.add(job.id);
                    }
                });
            } catch (e) {
                console.warn('Failed to parse cache chunk during local search', e);
            }
        };

        process(feedData);
        process(exploreData);

        const target = companyName.toLowerCase().trim();
        return allJobs.filter(job => job.company.toLowerCase().trim() === target);
    } catch (error) {
        console.warn('Local company job search failed', error);
        return [];
    }
};
