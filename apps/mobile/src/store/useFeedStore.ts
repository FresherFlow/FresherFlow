import { create } from 'zustand';
import { Opportunity, ActionType } from '@fresherflow/types';
import { useNotificationStore } from './useNotificationStore';
import { saveFeedCache, readFeedCache, saveLastSyncTimestamp, readTrackerCacheSync, readFeedCacheSync } from '@/utils/cache/offlineCache';
import { diffAndNotify } from '@/utils/cache/localNotifications';
import { getLocalProfile } from '@/utils/cache/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { useSectorStore } from './useSectorStore';
import { generateCdnSignature, generateVersionedCdnSignature } from '@/utils/cdnSignature';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL, FEED_VERSION_URL, GOVERNMENT_FEED_URL, getApiUrlForSector } from '@/config/api';
import { getString, setString, storage } from '@/utils/storage';
import { getSeenIds, getOpenedIds, getSeenIdsSync, getOpenedIdsSync, markJobAsOpened, markJobAsSeen } from '@/utils/cache/seenJobs';
import { getRecentSearchKeywords } from '@/utils/userBehavior';
import { Image as ExpoImage } from 'expo-image';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';
import { useAuthStore } from './useAuthStore';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { storage as coreStorage } from '@repo/frontend-core';

const fsWithDir = FileSystem as any;

// Resolved IDs are persisted in MMKV to survive app restarts,
// preventing redundant network requests on every cold boot.
const RESOLVED_IDS_KEY = 'ff_logo_resolved_ids_v1';
const _loadResolvedIds = (): Set<string> => {
    try {
        const raw = getString(RESOLVED_IDS_KEY);
        if (raw) return new Set<string>(JSON.parse(raw));
    } catch {}
    return new Set<string>();
};
const resolvedIds: Set<string> = _loadResolvedIds();
const _persistResolvedIds = () => {
    try {
        setString(RESOLVED_IDS_KEY, JSON.stringify(Array.from(resolvedIds)));
    } catch {}
};

let bootstrapRetryScheduled = false;

const cacheLogo = (key: string, value: string) => {
    try {
        storage.set(key, value);
        const rawKeys = storage.getString('ff_logo_cache_keys_v1');
        const keys = rawKeys ? JSON.parse(rawKeys) : [];
        if (!keys.includes(key)) {
            keys.push(key);
            storage.set('ff_logo_cache_keys_v1', JSON.stringify(keys));
        }
    } catch {}
    try {
        void coreStorage.setItem(key, value);
    } catch {}
};

export const getLogoCacheKey = (opp: Opportunity): string => {
    const name = opp.company;
    const website = opp.companyWebsite;
    const logoUrl = opp.companyLogoUrl;
    const applyLink = opp.applyLink;
    const normalizedName = (name || '').toLowerCase().trim();
    const cleanName = normalizedName.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const candidates: string[] = [];
    if (logoUrl) {
        candidates.push(`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}size=80`);
    }
    const websiteDomain = website ? getRootDomain(website) : null;
    const applyDomain = applyLink ? getRootDomain(applyLink) : null;
    const knownDomain = BRAND_DOMAINS[cleanName] ||
        Object.entries(BRAND_DOMAINS).find(([key]) => cleanName.includes(key))?.[1];
    const domainsToTry = Array.from(new Set([
        websiteDomain,
        applyDomain,
        knownDomain,
        !knownDomain && cleanName.length > 2 && cleanName.length < 15 && !cleanName.includes(' ') ? `${cleanName}.com` : null
    ].filter((d): d is string => !!d)));
    domainsToTry.forEach(d => {
        candidates.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
        candidates.push(`https://logo.clearbit.com/${d}`);
        candidates.push(`https://icons.duckduckgo.com/ip3/${d}.ico`);
    });
    if (candidates.length === 0) return `name_${normalizedName}`;
    return candidates.join('|');
};

const preResolveAndCacheLogos = async (opportunities: Opportunity[]) => {
    const toResolve = opportunities.filter(o => !resolvedIds.has(o.id));
    if (toResolve.length === 0) return;
    
    toResolve.forEach(o => resolvedIds.add(o.id));
    _persistResolvedIds();
    
    if (__DEV__) console.log(`[useFeedStore] Logo engine: resolving ${toResolve.length} items...`);
    
    // Process in batches of 5 to avoid network/bridge congestion
    for (let i = 0; i < toResolve.length; i += 5) {
        const chunk = toResolve.slice(i, i + 5);
        
        await Promise.all(chunk.map(async (opp) => {
            try {
                const cacheKey = getLogoCacheKey(opp);
                const isNameFallback = cacheKey.startsWith('name_');
                const candidates = isNameFallback ? [] : cacheKey.split('|');
                if (candidates.length === 0) return;

                const cachedValue = storage.getString(`logo_${cacheKey}`);
                if (cachedValue) {
                    if (cachedValue.startsWith('file://')) {
                        try {
                            const fileInfo = await fsWithDir.getInfoAsync(cachedValue);
                            if (fileInfo.exists) {
                                void ExpoImage.prefetch([cachedValue]).catch(() => {});
                                return;
                            }
                        } catch (e) {}
                    } else {
                        void ExpoImage.prefetch([cachedValue]).catch(() => {});
                        return;
                    }
                }

                // Sequentially ping candidates to find the first working high-res logo
                for (const url of candidates) {
                    try {
                        const response = await axios.get(url, {
                            timeout: 2500,
                            responseType: 'arraybuffer',
                            headers: { 'Accept': 'image/*' }
                        });

                        if (response.status === 200 && response.data) {
                            if (url.includes('google.com') && (response.data as ArrayBuffer).byteLength < 1000) {
                                continue;
                            }

                            if (Platform.OS === 'web' || !fsWithDir.documentDirectory) {
                                cacheLogo(`logo_${cacheKey}`, url);
                                void ExpoImage.prefetch([url]).catch(() => {});
                                break;
                            }

                            const ext = url.split('?')[0].split('.').pop()?.substring(0, 4) || 'png';
                            const safeKey = cacheKey.replace(/[^a-z0-9]/gi, '_');
                            const localUri = `${fsWithDir.documentDirectory}logo_${safeKey}.${ext}`;

                            try {
                                const { uri } = await fsWithDir.downloadAsync(url, localUri);
                                cacheLogo(`logo_${cacheKey}`, uri);
                                void ExpoImage.prefetch([uri]).catch(() => {});
                            } catch (e) {
                                cacheLogo(`logo_${cacheKey}`, url);
                                void ExpoImage.prefetch([url]).catch(() => {});
                            }
                            break;
                        }
                    } catch {
                        // Try next candidate
                    }
                }
            } catch (err) {
                if (__DEV__) { console.warn('[useFeedStore] Logo engine pre-resolution skipped for opportunity:', err) }
            }
        }));
    }
    if (__DEV__) console.log('[useFeedStore] Logo engine finished.');
};

interface FeedStoreState {
    cachedItems: Opportunity[];
    privateCachedItems: Opportunity[];
    govtCachedItems: Opportunity[];
    seenIds: Set<string>;
    openedIds: Set<string>;
    appliedIds: Set<string>;
    recentKeywords: string[];
    isBootstrapping: boolean;
    isSyncing: boolean;
    isRefreshing: boolean;
    syncError: string | null;
    hasHydrated: boolean;

    cleanupOrphanedLogos: () => Promise<void>;
    hydrate: () => Promise<void>;
    performSync: (force?: boolean, isUserInitiated?: boolean) => Promise<void>;
    computeScoringAndCache: (opportunities: Opportunity[]) => Promise<void>;
    recalculateScores: () => Promise<void>;
    refreshBehavioralData: () => Promise<void>;
    markAsOpened: (id: string) => Promise<void>;
}

// Synchronously read initial cache & behavioral state from MMKV on startup
const getInitialFeedState = () => {
    try {
        const storedSector = getString('fresherflow_active_sector') || 'PRIVATE';
        const cachedPrivate = readFeedCacheSync('PRIVATE');
        const cachedGovt = readFeedCacheSync('GOVERNMENT');
        const privateItems = cachedPrivate?.items || [];
        const govtItems = cachedGovt?.items || [];
        const activeItems = storedSector === 'GOVERNMENT' ? govtItems : privateItems;

        const seen = getSeenIdsSync();
        const opened = getOpenedIdsSync();
        const applied = new Set<string>();
        try {
            const trackerCache = readTrackerCacheSync();
            if (trackerCache?.items) {
                (trackerCache.items as Array<{ actionType: ActionType; opportunityId?: string; opportunity?: { id?: string } }>).forEach((item) => {
                    if (item?.actionType === ActionType.APPLIED) {
                        const id = item?.opportunityId || item?.opportunity?.id;
                        if (id) applied.add(id);
                    }
                });
            }
        } catch {}

        const keywords = getRecentSearchKeywords();

        return {
            cachedItems: activeItems,
            privateCachedItems: privateItems,
            govtCachedItems: govtItems,
            seenIds: seen,
            openedIds: opened,
            appliedIds: applied,
            recentKeywords: keywords,
            isBootstrapping: activeItems.length === 0,
            hasHydrated: true,
        };
    } catch (e) {
        return {
            cachedItems: [],
            privateCachedItems: [],
            govtCachedItems: [],
            seenIds: new Set<string>(),
            openedIds: new Set<string>(),
            appliedIds: new Set<string>(),
            recentKeywords: [],
            isBootstrapping: true,
            hasHydrated: false,
        };
    }
};

const initialFeedState = getInitialFeedState();

export const useFeedStore = create<FeedStoreState>((set, get) => ({
    ...initialFeedState,
    isSyncing: false,
    isRefreshing: false,
    syncError: null,

    cleanupOrphanedLogos: async () => {
        try {
            const { cachedItems } = get();
            if (cachedItems.length === 0 || Platform.OS === 'web' || !fsWithDir.documentDirectory) return;
            
            const activeKeys = new Set<string>();
            cachedItems.forEach(opp => {
                activeKeys.add(`logo_${getLogoCacheKey(opp)}`);
            });

            // Read the tracked logo keys from MMKV
            const rawKeys = storage.getString('ff_logo_cache_keys_v1');
            const logoKeys: string[] = rawKeys ? JSON.parse(rawKeys) : [];
            
            const validFileUris = new Set<string>();
            const remainingKeys: string[] = [];
            
            for (const key of logoKeys) {
                if (!activeKeys.has(key)) {
                    storage.delete(key);
                    try {
                        void coreStorage.removeItem(key);
                    } catch {}
                } else {
                    const uri = storage.getString(key);
                    if (uri && uri.startsWith('file://')) {
                        validFileUris.add(uri);
                    }
                    remainingKeys.push(key);
                }
            }
            
            // Save updated key list back to MMKV
            storage.set('ff_logo_cache_keys_v1', JSON.stringify(remainingKeys));
            // Clean Document Directory
            const files = await fsWithDir.readDirectoryAsync(fsWithDir.documentDirectory);
            const logoFiles = (files as string[]).filter((f: string) => f.startsWith('logo_'));
            let deleted = 0;
            for (const file of logoFiles) {
                const uri = `${fsWithDir.documentDirectory}${file}`;
                if (!validFileUris.has(uri)) {
                    await fsWithDir.deleteAsync(uri, { idempotent: true });
                    deleted++;
                }
            }
            if (__DEV__ && deleted > 0) {
                if (__DEV__) { console.log(`[useFeedStore] GC removed ${deleted} orphaned logos.`) }
            }
        } catch (e) {
            if (__DEV__) console.warn('[useFeedStore] Logo cleanup failed:', e);
        }
    },

    recalculateScores: async () => {
        const { cachedItems, computeScoringAndCache } = get();
        if (cachedItems && cachedItems.length > 0) {
            await computeScoringAndCache(cachedItems);
        }
    },

    refreshBehavioralData: async () => {
        const [seen, opened] = await Promise.all([getSeenIds(), getOpenedIds()]);
        
        const applied = new Set<string>();
        try {
            const trackerCache = readTrackerCacheSync();
            if (trackerCache?.items) {
                (trackerCache.items as Array<{ actionType: ActionType; opportunityId?: string; opportunity?: { id?: string } }>).forEach((item) => {
                    if (item?.actionType === ActionType.APPLIED) {
                        const id = item?.opportunityId || item?.opportunity?.id;
                        if (id) applied.add(id);
                    }
                });
            }
        } catch (e) {
            if (__DEV__) { console.warn('[useFeedStore] Failed to parse tracker cache for applied IDs:', e) }
        }

        const keywords = getRecentSearchKeywords();

        set({
            seenIds: seen,
            openedIds: opened,
            appliedIds: applied,
            recentKeywords: keywords
        });
    },

    markAsOpened: async (id: string) => {
        // Optimistic update: dim the card immediately, then persist to disk
        const nextOpened = new Set(get().openedIds);
        nextOpened.add(id);
        const nextSeen = new Set(get().seenIds);
        nextSeen.add(id);
        set({ openedIds: nextOpened, seenIds: nextSeen });

        try {
            await markJobAsOpened(id);
            await markJobAsSeen(id);
        } catch (e) {
            if (__DEV__) { console.error('[useFeedStore] Failed to persist opened state:', e) }
        }
    },

    computeScoringAndCache: async (opportunities: Opportunity[]) => {
        const userId = useAuthStore.getState().user?.id;
        const profile = await getLocalProfile(userId);  // scoped to current user
        const activeSector = useSectorStore.getState().sector || 'PRIVATE';

        // Normalize opportunity types: if it has governmentJobDetails, force type to 'GOVERNMENT'
        const normalizedOpportunities = opportunities.map(job => {
            if (job.governmentJobDetails) {
                return { ...job, type: 'GOVERNMENT' as any };
            }
            return job;
        });

        // Filter opportunities based on active sector
        const sectorFilteredOpportunities = normalizedOpportunities.filter(job => {
            const isGovtJob = !!job.governmentJobDetails;
            if (activeSector === 'GOVERNMENT') {
                return isGovtJob;
            }
            return !isGovtJob;
        });

        const hasProfileData = profile && (
            (profile.skills && profile.skills.length > 0) ||
            (profile.preferredCities && profile.preferredCities.length > 0) ||
            (profile.interestedIn && profile.interestedIn.length > 0) ||
            profile.educationLevel
        );

        const scoredOpportunities = sectorFilteredOpportunities.map(job => {
            const rawJob = { ...job } as any;
            delete rawJob.matchScore;
            delete rawJob.matchReason;
            delete rawJob.isEligible;
            
            // Bypass scoring for Government Jobs
            if (activeSector === 'GOVERNMENT' || !hasProfileData) {
                return rawJob as Opportunity;
            }

            const match = calculateMatchScore(profile, rawJob);
            return {
                ...rawJob,
                matchScore: match.score > 0 ? match.score : undefined,
                matchReason: match.score > 0 ? match.reason : undefined,
                isEligible: match.isEligible
            };
        });

        if (scoredOpportunities.length > 0) {
            await saveFeedCache(scoredOpportunities, activeSector);
            
            // Push to UI first so the user sees content immediately
            if (activeSector === 'GOVERNMENT') {
                set({ govtCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
            } else {
                set({ privateCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
            }
            
            // Defer logo resolution so it runs AFTER the UI renders (3s delay)
            setTimeout(() => {
                void preResolveAndCacheLogos(scoredOpportunities.slice(0, 10));
                setTimeout(() => {
                    void preResolveAndCacheLogos(scoredOpportunities.slice(10));
                    void get().cleanupOrphanedLogos();
                }, 2000);
            }, 3000);

            void diffAndNotify(scoredOpportunities).then(() => {
                void useNotificationStore.getState().fetchUnreadCount();
            });
        }
    },

    performSync: async (force = false, isUserInitiated = false) => {
        const { isSyncing, computeScoringAndCache } = get();
        if (isSyncing) return; // Prevent concurrent syncs

        const activeSector = useSectorStore.getState().sector || 'PRIVATE';
        const lastSyncKey = `fresherflow_last_sync_timestamp_${activeSector.toLowerCase()}`;
        const lastSyncStr = getString(lastSyncKey);
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Date.now();
        
        if (!force && now - lastSync < 300000 && get().cachedItems.length > 0) return;

        if (isUserInitiated) {
            set({ isRefreshing: true });
        }
        set({ isSyncing: true, syncError: null });

        try {
            const isGovt = activeSector === 'GOVERNMENT';
            const sectorApiUrl = getApiUrlForSector(activeSector);

            let response;
            if (isGovt) {
                // Government mode: CDN-signed static feed
                let feedVersion = '';
                try {
                    const versionRes = await axios.get(FEED_VERSION_URL, {
                        timeout: 3000,
                        headers: { 'Cache-Control': 'no-cache' }
                    });
                    if (versionRes.data?.version) feedVersion = versionRes.data.version;
                } catch (e) {
                    if (__DEV__) { console.warn('[mobile] Failed to fetch feed version, using timestamp:', e) }
                    feedVersion = Math.floor(Date.now() / 300000).toString();
                }

                const signaturePath = '/government-feed.json';
                const signatureParams = feedVersion
                    ? generateVersionedCdnSignature(signaturePath, feedVersion)
                    : generateCdnSignature(signaturePath);
                const signedUrl = 'v' in signatureParams
                    ? `${GOVERNMENT_FEED_URL}?v=${signatureParams.v}&sig=${signatureParams.sig}`
                    : `${GOVERNMENT_FEED_URL}?t=${signatureParams.t}&sig=${signatureParams.sig}`;

                response = await axios.get(signedUrl, {
                    timeout: 5000,
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
            } else {
                // Private mode: CDN-signed static feed
                let feedVersion = '';
                try {
                    const versionRes = await axios.get(FEED_VERSION_URL, {
                        timeout: 3000,
                        headers: { 'Cache-Control': 'no-cache' }
                    });
                    if (versionRes.data?.version) feedVersion = versionRes.data.version;
                } catch (e) {
                    if (__DEV__) { console.warn('[mobile] Failed to fetch feed version, using timestamp:', e) }
                    feedVersion = Math.floor(Date.now() / 300000).toString();
                }

                const signaturePath = '/bootstrap-feed.min.json';
                const signatureParams = feedVersion
                    ? generateVersionedCdnSignature(signaturePath, feedVersion)
                    : generateCdnSignature(signaturePath);
                const signedUrl = 'v' in signatureParams
                    ? `${BOOTSTRAP_FEED_URL}?v=${signatureParams.v}&sig=${signatureParams.sig}`
                    : `${BOOTSTRAP_FEED_URL}?t=${signatureParams.t}&sig=${signatureParams.sig}`;

                response = await axios.get(signedUrl, {
                    timeout: 5000,
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
            }

            if (response.data?.opportunities) {
                const opportunities = response.data.opportunities as Opportunity[];
                await computeScoringAndCache(opportunities);
                await saveLastSyncTimestamp(response.data.timestamp || now);
                setString(lastSyncKey, now.toString());
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            if (__DEV__) console.warn('[useFeedStore] Feed sync failed:', errMsg);
            set({ syncError: errMsg });
        } finally {
            set({ isSyncing: false, isRefreshing: false });
        }
    },

    hydrate: async () => {
        const { performSync } = get();
        // Since we are already hydrated synchronously from MMKV, we just trigger a background sync on app start.
        if (get().cachedItems.length > 0) {
            void performSync();
        } else {
            set({ isBootstrapping: true });
            await performSync();
            set({ isBootstrapping: false });
        }
    }
}));
