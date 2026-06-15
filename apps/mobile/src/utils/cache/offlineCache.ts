import { Opportunity } from '@fresherflow/types';
import { getCompanyDomain } from '@fresherflow/utils';
import { getJSON, getString, setJSON, setString, remove, storage } from '../storage';
import { useSectorStore } from '@/store/useSectorStore';
import { getSectorKey, JobSector } from '../storage/scopedKeys';

const getActiveSector = (): JobSector => useSectorStore.getState().sector || 'PRIVATE';

const getFEED_INDEX_KEY = (sector?: JobSector) => getSectorKey('fresherflow_feed_index', sector || getActiveSector());
const getJOB_PREFIX = (sector?: JobSector) => getSectorKey('fresherflow_job_', sector || getActiveSector());
const getSHARES_CACHE_KEY = () => getSectorKey('fresherflow_shares_cache', getActiveSector());
const getCOMPANIES_CACHE_KEY = () => getSectorKey('fresherflow_companies_cache', getActiveSector());
const getALERTS_CACHE_KEY = () => getSectorKey('fresherflow_alerts_cache', getActiveSector());
const getDETAIL_CACHE_PREFIX = () => getSectorKey('fresherflow_detail_cache_', getActiveSector());
const getCOMPANY_JOBS_CACHE_PREFIX = () => getSectorKey('fresherflow_company_jobs_cache_', getActiveSector());
const getLAST_SYNC_KEY = () => getSectorKey('fresherflow_last_sync_timestamp', getActiveSector());
const getTRACKER_CACHE_KEY = () => getSectorKey('fresherflow_tracker_cache', getActiveSector());
const getCONTRIBUTIONS_CACHE_KEY = () => getSectorKey('fresherflow_contributions_cache', getActiveSector());
const getINVITES_CACHE_KEY = () => getSectorKey('fresherflow_invites_cache', getActiveSector());
const getREPORTED_JOBS_KEY = () => getSectorKey('fresherflow_reported_jobs', getActiveSector());
const getSIMILAR_CACHE_PREFIX = () => getSectorKey('fresherflow_similar_cache_', getActiveSector());

export const saveLastSyncTimestamp = async (timestamp: string) => {
    setString(getLAST_SYNC_KEY(), timestamp);
};

export const getLastSyncTimestamp = async (): Promise<string | null> => {
    return getString(getLAST_SYNC_KEY());
};

/**
 * Saves a single opportunity atomically to its own key.
 * This prevents "Large Object" serialization lag.
 */
export const saveOpportunityAtomic = async (job: Opportunity) => {
    setJSON(`${getJOB_PREFIX()}${job.id}`, job);
};

/**
 * Reads a single opportunity by ID.
 */
export const getOpportunityAtomic = async (id: string): Promise<Opportunity | null> => {
    return getJSON<Opportunity>(`${getJOB_PREFIX()}${id}`);
};

export interface FeedIndex {
    ids: string[];
    timestamp: number;
}

/**
 * Saves the feed as a list of IDs + individual atomic job saves using BATCH operations.
 */
export const saveFeedCache = async (items: Opportunity[], sector?: JobSector) => {
    if (items.length === 0) return;
    
    const targetSector = sector || getActiveSector();
    // 1. Perform Storage Garbage Collection
    void pruneGhostJobs(items.map(i => i.id), targetSector);

    // 2. Save items (Synchronous in MMKV, but we wrap for compatibility)
    items.forEach(job => {
        setJSON(`${getJOB_PREFIX(targetSector)}${job.id}`, job);
    });

    // 3. Save the index (order)
    const index: FeedIndex = {
        ids: items.map(i => i.id),
        timestamp: Date.now(),
    };
    setJSON(getFEED_INDEX_KEY(targetSector), index);
};

/**
 * Reads the feed by reconstructing it from the index and atomic keys using BATCH read.
 */
export const readFeedCache = async (sector?: JobSector): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    const targetSector = sector || getActiveSector();
    const index = getJSON<FeedIndex>(getFEED_INDEX_KEY(targetSector));
    if (!index || !index.ids || index.ids.length === 0) return null;

    const items: Opportunity[] = index.ids
        .map(id => getJSON<Opportunity>(`${getJOB_PREFIX(targetSector)}${id}`))
        .filter((j): j is Opportunity => j !== null);

    return {
        items,
        timestamp: index.timestamp
    };
};

export const readFeedCacheSync = (sector?: JobSector): { items: Opportunity[], timestamp: number } | null => {
    const targetSector = sector || getActiveSector();
    const index = getJSON<FeedIndex>(getFEED_INDEX_KEY(targetSector));
    if (!index || !index.ids || index.ids.length === 0) return null;

    const items: Opportunity[] = index.ids
        .map(id => getJSON<Opportunity>(`${getJOB_PREFIX(targetSector)}${id}`))
        .filter((j): j is Opportunity => j !== null);

    return {
        items,
        timestamp: index.timestamp
    };
};

export const saveSharesCache = async (shares: unknown[], resources: unknown[], stats: unknown) => {
    const cache = {
        items: shares,
        resources,
        stats,
        timestamp: Date.now(),
    };
    setJSON(getSHARES_CACHE_KEY(), cache);
};

export const readSharesCache = async (): Promise<{ items: unknown[], resources?: unknown[], stats: unknown, timestamp: number } | null> => {
    return getJSON(getSHARES_CACHE_KEY());
};

export const saveCompaniesCache = async (companies: unknown[]) => {
    const cache = {
        items: companies,
        timestamp: Date.now(),
    };
    setJSON(getCOMPANIES_CACHE_KEY(), cache);
};

export const readCompaniesCache = async (): Promise<{ items: unknown[], timestamp: number } | null> => {
    return getJSON(getCOMPANIES_CACHE_KEY());
};

export const saveAlertsCache = async (alerts: unknown[], unreadCount: number) => {
    const cache = {
        items: alerts,
        unreadCount,
        timestamp: Date.now(),
    };
    setJSON(getALERTS_CACHE_KEY(), cache);
};

export const readAlertsCache = async (): Promise<{ items: unknown[], unreadCount: number, timestamp: number } | null> => {
    return getJSON(getALERTS_CACHE_KEY());
};

export const saveCompanyJobsCache = async (companyName: string, jobs: Opportunity[]) => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const key = `${getCOMPANY_JOBS_CACHE_PREFIX()}${slug}`;
    const cache = {
        items: jobs,
        timestamp: Date.now(),
    };
    setJSON(key, cache);
};

export const readCompanyJobsCache = async (companyName: string): Promise<{ items: Opportunity[], timestamp: number } | null> => {
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const key = `${getCOMPANY_JOBS_CACHE_PREFIX()}${slug}`;
    return getJSON(key);
};

export const saveDetailCache = async (opportunity: Opportunity) => {
    const cache = {
        ...opportunity,
        _cachedAt: Date.now()
    };
    setJSON(`${getDETAIL_CACHE_PREFIX()}${opportunity.id}`, cache);
};

export const readDetailCache = async (id: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<Opportunity & { _cachedAt?: number } | null> => {
    const cached = await getJSON<Opportunity & { _cachedAt?: number }>(`${getDETAIL_CACHE_PREFIX()}${id}`);
    if (!cached) return null;
    if (cached._cachedAt && Date.now() - cached._cachedAt > maxAgeMs) {
        // Stale — evict and return null so caller fetches fresh data
        remove(`${getDETAIL_CACHE_PREFIX()}${id}`);
        return null;
    }
    return cached;
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
    setJSON(`${getSIMILAR_CACHE_PREFIX()}${opportunityId}`, cache);
};

export const readSimilarCache = async (opportunityId: string, maxAgeMs = 24 * 60 * 60 * 1000): Promise<SimilarCache | null> => {
    const cached = await getJSON<SimilarCache>(`${getSIMILAR_CACHE_PREFIX()}${opportunityId}`);
    if (!cached) return null;
    if (cached.timestamp && Date.now() - cached.timestamp > maxAgeMs) {
        remove(`${getSIMILAR_CACHE_PREFIX()}${opportunityId}`);
        return null;
    }
    return cached;
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
                if (__DEV__) { console.warn('Failed to parse explore cache chunk', e) }
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
        if (__DEV__) { console.warn('Local company job search failed', error) }
        return [];
    }
};

/**
 * Prunes jobs from disk that are no longer present in the primary index.
 * This prevents the "Ghost Jobs" issue where thousands of individual keys stay on disk.
 */
export const pruneGhostJobs = async (currentIds: string[], sector?: JobSector) => {
    const targetSector = sector || getActiveSector();
    const oldIndex = getJSON<FeedIndex>(getFEED_INDEX_KEY(targetSector));
    if (!oldIndex) return;

    const newIdsSet = new Set(currentIds);
    const ghostIds = oldIndex.ids.filter(id => !newIdsSet.has(id));
    
    if (ghostIds.length > 0) {
        ghostIds.forEach(id => {
            remove(`${getJOB_PREFIX(targetSector)}${id}`);
            remove(`${getDETAIL_CACHE_PREFIX()}${id}`);
        });
        if (__DEV__) { console.log(`[OfflineCache] GC: Pruned ${ghostIds.length} ghost jobs from disk for ${targetSector}`) }
    }
};
/**
 * Wipes all FresherFlow related cache from disk.
 * Use this for debugging cold-start or forcing a fresh sync.
 */
export const clearAllCache = async () => {
    storage.clearAll();
    if (__DEV__) { console.log(`[OfflineCache] Successfully cleared all MMKV storage`) }
};
export const saveTrackerCache = async (actions: unknown[]) => {
    const cache = {
        items: actions,
        timestamp: Date.now(),
    };
    setJSON(getTRACKER_CACHE_KEY(), cache);
};

export const readTrackerCache = async (): Promise<{ items: unknown[], timestamp: number } | null> => {
    return getJSON(getTRACKER_CACHE_KEY());
};

export const readTrackerCacheSync = (): { items: unknown[], timestamp: number } | null => {
    return getJSON(getTRACKER_CACHE_KEY());
};

export const saveContributionsCache = async (contributions: unknown[], user: unknown) => {
    const cache = {
        items: contributions,
        user,
        timestamp: Date.now(),
    };
    setJSON(getCONTRIBUTIONS_CACHE_KEY(), cache);
};

export const readContributionsCache = async (): Promise<{ items: unknown[], user: unknown, timestamp: number } | null> => {
    return getJSON(getCONTRIBUTIONS_CACHE_KEY());
};

export const saveInvitesCache = async (invites: unknown[], stats: unknown, metadata: Record<string, unknown>) => {
    const cache = {
        items: invites,
        stats,
        ...metadata,
        timestamp: Date.now(),
    };
    setJSON(getINVITES_CACHE_KEY(), cache);
};

export const readInvitesCache = async (): Promise<{ items: unknown[], stats: unknown, timestamp: number } | null> => {
    return getJSON(getINVITES_CACHE_KEY());
};

export const saveReportedJobLocally = (opportunityId: string) => {
    const reported = getJSON<string[]>(getREPORTED_JOBS_KEY()) || [];
    if (!reported.includes(opportunityId)) {
        reported.push(opportunityId);
        setJSON(getREPORTED_JOBS_KEY(), reported);
    }
};

export const isJobReportedLocally = (opportunityId: string): boolean => {
    const reported = getJSON<string[]>(getREPORTED_JOBS_KEY()) || [];
    return reported.includes(opportunityId);
};
