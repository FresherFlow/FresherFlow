import { Opportunity } from '@fresherflow/types';
import { getCompanyDomain } from '@fresherflow/utils';
import { getJSON, getString, setJSON, setString, remove, storage } from './storage';

const FEED_INDEX_KEY = 'fresherflow_feed_index';
const JOB_PREFIX = 'fresherflow_job_';
const SHARES_CACHE_KEY = 'fresherflow_shares_cache';
const COMPANIES_CACHE_KEY = 'fresherflow_companies_cache';
const ALERTS_CACHE_KEY = 'fresherflow_alerts_cache';
const DETAIL_CACHE_PREFIX = 'fresherflow_detail_cache_';
const COMPANY_JOBS_CACHE_PREFIX = 'fresherflow_company_jobs_cache_';
const LAST_SYNC_KEY = 'fresherflow_last_sync_timestamp';
const TRACKER_CACHE_KEY = 'fresherflow_tracker_cache';
const CONTRIBUTIONS_CACHE_KEY = 'fresherflow_contributions_cache';
const INVITES_CACHE_KEY = 'fresherflow_invites_cache';

export const saveLastSyncTimestamp = async (timestamp: string) => {
    setString(LAST_SYNC_KEY, timestamp);
};

export const getLastSyncTimestamp = async (): Promise<string | null> => {
    return getString(LAST_SYNC_KEY);
};

/**
 * Saves a single opportunity atomically to its own key.
 * This prevents "Large Object" serialization lag.
 */
export const saveOpportunityAtomic = async (job: Opportunity) => {
    setJSON(`${JOB_PREFIX}${job.id}`, job);
};

/**
 * Reads a single opportunity by ID.
 */
export const getOpportunityAtomic = async (id: string): Promise<Opportunity | null> => {
    return getJSON<Opportunity>(`${JOB_PREFIX}${id}`);
};

export interface FeedIndex {
    ids: string[];
    timestamp: number;
}

/**
 * Saves the feed as a list of IDs + individual atomic job saves using BATCH operations.
 */
export const saveFeedCache = async (items: Opportunity[]) => {
    if (items.length === 0) return;
    
    // 1. Perform Storage Garbage Collection
    void pruneGhostJobs(items.map(i => i.id));

    // 2. Save items (Synchronous in MMKV, but we wrap for compatibility)
    items.forEach(job => {
        setJSON(`${JOB_PREFIX}${job.id}`, job);
    });

    // 3. Save the index (order)
    const index: FeedIndex = {
        ids: items.map(i => i.id),
        timestamp: Date.now(),
    };
    setJSON(FEED_INDEX_KEY, index);
};

/**
 * Reads the feed by reconstructing it from the index and atomic keys using BATCH read.
 */
export const readFeedCache = async (): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    const index = getJSON<FeedIndex>(FEED_INDEX_KEY);
    if (!index || !index.ids || index.ids.length === 0) return null;

    const items: Opportunity[] = index.ids
        .map(id => getJSON<Opportunity>(`${JOB_PREFIX}${id}`))
        .filter((j): j is Opportunity => j !== null);

    return {
        items,
        timestamp: index.timestamp
    };
};

export const saveSharesCache = async (shares: unknown[], stats: unknown) => {
    const cache = {
        items: shares,
        stats,
        timestamp: Date.now(),
    };
    setJSON(SHARES_CACHE_KEY, cache);
};

export const readSharesCache = async (): Promise<{ items: unknown[], stats: unknown, timestamp: number } | null> => {
    return getJSON(SHARES_CACHE_KEY);
};

export const saveCompaniesCache = async (companies: unknown[]) => {
    const cache = {
        items: companies,
        timestamp: Date.now(),
    };
    setJSON(COMPANIES_CACHE_KEY, cache);
};

export const readCompaniesCache = async (): Promise<{ items: unknown[], timestamp: number } | null> => {
    return getJSON(COMPANIES_CACHE_KEY);
};

export const saveAlertsCache = async (alerts: unknown[], unreadCount: number) => {
    const cache = {
        items: alerts,
        unreadCount,
        timestamp: Date.now(),
    };
    setJSON(ALERTS_CACHE_KEY, cache);
};

export const readAlertsCache = async (): Promise<{ items: unknown[], unreadCount: number, timestamp: number } | null> => {
    return getJSON(ALERTS_CACHE_KEY);
};

export const saveCompanyJobsCache = async (companyName: string, jobs: Opportunity[]) => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const key = `${COMPANY_JOBS_CACHE_PREFIX}${slug}`;
    const cache = {
        items: jobs,
        timestamp: Date.now(),
    };
    setJSON(key, cache);
};

export const readCompanyJobsCache = async (companyName: string): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const key = `${COMPANY_JOBS_CACHE_PREFIX}${slug}`;
    return getJSON(key);
};

const SIMILAR_CACHE_PREFIX = 'fresherflow_similar_cache_';

export const saveDetailCache = async (opportunity: Opportunity) => {
    const cache = {
        ...opportunity,
        _cachedAt: Date.now()
    };
    setJSON(`${DETAIL_CACHE_PREFIX}${opportunity.id}`, cache);
};

export const readDetailCache = async (id: string): Promise<Opportunity & { _cachedAt?: number } | null> => {
    return getJSON(`${DETAIL_CACHE_PREFIX}${id}`);
};

export interface SimilarCache {
    opportunities: Opportunity[];
    timestamp: number;
}

export const saveSimilarCache = async (opportunityId: string, opportunities: Opportunity[]) => {
    const cache: SimilarCache = {
        opportunities,
        timestamp: Date.now(),
    };
    setJSON(`${SIMILAR_CACHE_PREFIX}${opportunityId}`, cache);
};

export const readSimilarCache = async (opportunityId: string): Promise<SimilarCache | null> => {
    return getJSON(`${SIMILAR_CACHE_PREFIX}${opportunityId}`);
};

/**
 * Searches across all primary job caches (Feed, Explore, etc.) to find jobs matching a company.
 * Matches by canonical domain first (so "Wipro Ltd" and "Wipro" both show the same jobs),
 * then falls back to name equality for companies without link data.
 */
export const findJobsByCompanyLocally = async (
    companyName: string,
    companyDomain?: string | null,
): Promise<Opportunity[]> => {
    try {
        const feedCache = await readFeedCache();
        const exploreData = getString('fresherflow_explore_cache');

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
        return allJobs.filter(job => {
            const nameMatch = job.company.toLowerCase().trim() === target;
            if (nameMatch) return true;
            
            if (companyDomain) {
                const jobDomain = getCompanyDomain({
                    companyWebsite: job.companyWebsite,
                    applyLink: job.applyLink,
                    sourceLink: job.sourceLink,
                });
                if (jobDomain === companyDomain) return true;
            }
            return false;
        });
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
    const oldIndex = getJSON<FeedIndex>(FEED_INDEX_KEY);
    if (!oldIndex) return;

    const newIdsSet = new Set(currentIds);
    const ghostIds = oldIndex.ids.filter(id => !newIdsSet.has(id));
    
    if (ghostIds.length > 0) {
        ghostIds.forEach(id => {
            remove(`${JOB_PREFIX}${id}`);
            remove(`${DETAIL_CACHE_PREFIX}${id}`);
        });
        console.log(`[OfflineCache] GC: Pruned ${ghostIds.length} ghost jobs from disk`);
    }
};
/**
 * Wipes all FresherFlow related cache from disk.
 * Use this for debugging cold-start or forcing a fresh sync.
 */
export const clearAllCache = async () => {
    storage.clearAll();
    console.log(`[OfflineCache] Successfully cleared all MMKV storage`);
};
export const saveTrackerCache = async (actions: unknown[]) => {
    const cache = {
        items: actions,
        timestamp: Date.now(),
    };
    setJSON(TRACKER_CACHE_KEY, cache);
};

export const readTrackerCache = async (): Promise<{ items: unknown[], timestamp: number } | null> => {
    return getJSON(TRACKER_CACHE_KEY);
};

export const readTrackerCacheSync = (): { items: unknown[], timestamp: number } | null => {
    return getJSON(TRACKER_CACHE_KEY);
};

export const saveContributionsCache = async (contributions: unknown[], user: unknown) => {
    const cache = {
        items: contributions,
        user,
        timestamp: Date.now(),
    };
    setJSON(CONTRIBUTIONS_CACHE_KEY, cache);
};

export const readContributionsCache = async (): Promise<{ items: unknown[], user: unknown, timestamp: number } | null> => {
    return getJSON(CONTRIBUTIONS_CACHE_KEY);
};

export const saveInvitesCache = async (invites: unknown[], stats: unknown, metadata: Record<string, unknown>) => {
    const cache = {
        items: invites,
        stats,
        ...metadata,
        timestamp: Date.now(),
    };
    setJSON(INVITES_CACHE_KEY, cache);
};

export const readInvitesCache = async (): Promise<{ items: unknown[], stats: unknown, timestamp: number } | null> => {
    return getJSON(INVITES_CACHE_KEY);
};

const REPORTED_JOBS_KEY = 'fresherflow_reported_jobs';

export const saveReportedJobLocally = (opportunityId: string) => {
    const reported = getJSON<string[]>(REPORTED_JOBS_KEY) || [];
    if (!reported.includes(opportunityId)) {
        reported.push(opportunityId);
        setJSON(REPORTED_JOBS_KEY, reported);
    }
};

export const isJobReportedLocally = (opportunityId: string): boolean => {
    const reported = getJSON<string[]>(REPORTED_JOBS_KEY) || [];
    return reported.includes(opportunityId);
};
