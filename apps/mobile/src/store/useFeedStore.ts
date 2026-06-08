import { create } from 'zustand';
import { Opportunity, ActionType } from '@fresherflow/types';
import { useNotificationStore } from './useNotificationStore';
import { saveFeedCache, readFeedCache, saveLastSyncTimestamp, readTrackerCacheSync } from '@/utils/cache/offlineCache';
import { diffAndNotify } from '@/utils/cache/localNotifications';
import { getLocalProfile } from '@/utils/cache/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { useSectorStore } from './useSectorStore';
import { generateCdnSignature, generateVersionedCdnSignature } from '@/utils/cdnSignature';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL, FEED_VERSION_URL, GOVERNMENT_FEED_URL, getApiUrlForSector } from '@/config/api';
import { getString, setString } from '@/utils/storage';
import { getSeenIds, getOpenedIds } from '@/utils/cache/seenJobs';
import { getRecentSearchKeywords } from '@/utils/userBehavior';
import { Image as ExpoImage } from 'expo-image';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';
import { storage } from '@repo/frontend-core';
import { useAuthStore } from './useAuthStore';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fsWithDir = FileSystem as any;

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

const resolvedIds = new Set<string>();
let bootstrapRetryScheduled = false;

const preResolveAndCacheLogos = async (opportunities: Opportunity[]) => {
    const toResolve = opportunities.filter(o => !resolvedIds.has(o.id));
    if (toResolve.length === 0) return;
    
    toResolve.forEach(o => resolvedIds.add(o.id));
    
    console.log(`[useFeedStore] Starting background logo pre-resolution engine for ${toResolve.length} opportunities...`);
    
    // Process in batches of 5 to avoid network/bridge congestion
    for (let i = 0; i < toResolve.length; i += 5) {
        const chunk = toResolve.slice(i, i + 5);
        
        await Promise.all(chunk.map(async (opp) => {
            try {
                const cacheKey = getLogoCacheKey(opp);
                const isNameFallback = cacheKey.startsWith('name_');
                const candidates = isNameFallback ? [] : cacheKey.split('|');
                if (candidates.length === 0) return;

                const cachedValue = await storage.getItem(`logo_${cacheKey}`);
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
                                await storage.setItem(`logo_${cacheKey}`, url);
                                void ExpoImage.prefetch([url]).catch(() => {});
                                break;
                            }

                            const ext = url.split('?')[0].split('.').pop()?.substring(0, 4) || 'png';
                            const safeKey = cacheKey.replace(/[^a-z0-9]/gi, '_');
                            const localUri = `${fsWithDir.documentDirectory}logo_${safeKey}.${ext}`;

                            try {
                                const { uri } = await fsWithDir.downloadAsync(url, localUri);
                                await storage.setItem(`logo_${cacheKey}`, uri);
                                void ExpoImage.prefetch([uri]).catch(() => {});
                            } catch (e) {
                                await storage.setItem(`logo_${cacheKey}`, url);
                                void ExpoImage.prefetch([url]).catch(() => {});
                            }
                            break;
                        }
                    } catch {
                        // Try next candidate
                    }
                }
            } catch (err) {
                console.warn('[useFeedStore] Logo engine pre-resolution skipped for opportunity:', err);
            }
        }));
    }
    console.log('[useFeedStore] Background logo pre-resolution engine finished.');
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
}

export const useFeedStore = create<FeedStoreState>((set, get) => ({
    cachedItems: [],
    privateCachedItems: [],
    govtCachedItems: [],
    seenIds: new Set(),
    openedIds: new Set(),
    appliedIds: new Set(),
    recentKeywords: [],
    isBootstrapping: true,
    isSyncing: false,
    isRefreshing: false,
    syncError: null,
    hasHydrated: false,

    cleanupOrphanedLogos: async () => {
        try {
            const { cachedItems } = get();
            if (cachedItems.length === 0 || Platform.OS === 'web' || !fsWithDir.documentDirectory) return;
            
            const activeKeys = new Set<string>();
            cachedItems.forEach(opp => {
                activeKeys.add(`logo_${getLogoCacheKey(opp)}`);
            });
            // Clean MMKV storage
            const allKeys = await AsyncStorage.getAllKeys();
            const logoKeys = allKeys.filter(k => k.startsWith('logo_'));
            
            const validFileUris = new Set<string>();
            
            for (const key of logoKeys) {
                if (!activeKeys.has(key)) {
                    await AsyncStorage.removeItem(key);
                } else {
                    const uri = await AsyncStorage.getItem(key);
                    if (uri && uri.startsWith('file://')) {
                        validFileUris.add(uri);
                    }
                }
            }
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
            if (deleted > 0) {
                console.log(`[useFeedStore] Garbage collection removed ${deleted} orphaned logos from disk.`);
            }
        } catch (e) {
            console.warn('[useFeedStore] Logo cleanup failed:', e);
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
            console.warn('[useFeedStore] Failed to parse tracker cache for applied IDs:', e);
        }

        const keywords = getRecentSearchKeywords();

        set({
            seenIds: seen,
            openedIds: opened,
            appliedIds: applied,
            recentKeywords: keywords
        });
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
            
            // 1. Pre-resolve the top 10 items in the background so feed renders instantly
            void preResolveAndCacheLogos(scoredOpportunities.slice(0, 10));

            // 2. Push to UI
            if (activeSector === 'GOVERNMENT') {
                set({ govtCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
            } else {
                set({ privateCachedItems: scoredOpportunities, cachedItems: scoredOpportunities });
            }
            
            // 3. Pre-resolve the remaining jobs in the background (silent)
            void preResolveAndCacheLogos(scoredOpportunities.slice(10));

            // 4. Run garbage collector to delete expired/orphaned logos
            void get().cleanupOrphanedLogos();

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
        
        if (!force && now - lastSync < 300000) return;

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
                    console.warn('[mobile] Failed to fetch feed version, using timestamp:', e);
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
                    console.warn('[mobile] Failed to fetch feed version, using timestamp:', e);
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
            console.warn('[useFeedStore] Feed sync failed:', errMsg);
            set({ syncError: errMsg });
        } finally {
            set({ isSyncing: false, isRefreshing: false });
        }
    },

    hydrate: async () => {
        const { hasHydrated, performSync, refreshBehavioralData } = get();
        if (hasHydrated) {
            if (get().cachedItems.length === 0 && !get().isSyncing) {
                void performSync(true);
            }
            return;
        }

        set({ isBootstrapping: true, hasHydrated: true });
        try {
            const [cachedPrivate, cachedGovt] = await Promise.all([
                readFeedCache('PRIVATE'),
                readFeedCache('GOVERNMENT'),
                refreshBehavioralData()
            ]);
            const activeSector = useSectorStore.getState().sector || 'PRIVATE';
            const privateItems = cachedPrivate?.items || [];
            const govtItems = cachedGovt?.items || [];
            const activeItems = activeSector === 'GOVERNMENT' ? govtItems : privateItems;

            set({
                privateCachedItems: privateItems,
                govtCachedItems: govtItems,
                cachedItems: activeItems,
                isBootstrapping: false
            });

            // If we have cache for current sector, perform sync in the background so it doesn't block the UI
            if (activeItems.length > 0) {
                void performSync();
            } else {
                await performSync();
                if (get().cachedItems.length === 0 && !bootstrapRetryScheduled) {
                    bootstrapRetryScheduled = true;
                    setTimeout(() => {
                        bootstrapRetryScheduled = false;
                        if (get().cachedItems.length === 0) {
                            void get().performSync(true);
                        }
                    }, 2500);
                }
            }
        } catch (e) {
            console.warn('[useFeedStore] Offline cache read failed:', (e as Error).message);
        } finally {
            set({ isBootstrapping: false });
        }
    }
}));
