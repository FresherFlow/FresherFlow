import { create } from 'zustand';
import { Opportunity, ActionType } from '@fresherflow/types';
import { useNotificationStore } from './useNotificationStore';
import { saveFeedCache, readFeedCache, saveLastSyncTimestamp, readTrackerCacheSync } from '@/utils/offlineCache';
import { diffAndNotify } from '@/utils/localNotifications';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { generateCdnSignature } from '@/utils/cdnSignature';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL, FEED_VERSION_URL } from '@/config/api';
import { getString, setString } from '@/utils/storage';
import { getSeenIds, getOpenedIds } from '@/utils/seenJobs';
import { getRecentSearchKeywords } from '@/utils/userBehavior';
import { Image as ExpoImage } from 'expo-image';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';
import { storage } from '@repo/frontend-core';
import { useAuthStore } from './useAuthStore';


const preResolveAndCacheLogos = async (opportunities: Opportunity[]) => {
    if (opportunities.length === 0) return;
    console.log(`[useFeedStore] Starting background logo pre-resolution engine for ${opportunities.length} opportunities...`);
    
    // Process in batches of 5 to avoid network/bridge congestion
    for (let i = 0; i < opportunities.length; i += 5) {
        const chunk = opportunities.slice(i, i + 5);
        
        await Promise.all(chunk.map(async (opp) => {
            try {
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

                if (candidates.length === 0) return;

                const cacheKey = candidates.join('|');
                const cachedValue = await storage.getItem(`logo_${cacheKey}`);
                if (cachedValue) {
                    void ExpoImage.prefetch([cachedValue]).catch(() => {});
                    return;
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
                            if (url.includes('google.com') && response.data.byteLength < 1000) {
                                continue;
                            }
                            await storage.setItem(`logo_${cacheKey}`, url);
                            void ExpoImage.prefetch([url]).catch(() => {});
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
    seenIds: Set<string>;
    openedIds: Set<string>;
    appliedIds: Set<string>;
    recentKeywords: string[];
    isBootstrapping: boolean;
    isSyncing: boolean;
    isRefreshing: boolean;
    syncError: string | null;
    hasHydrated: boolean;

    hydrate: () => Promise<void>;
    performSync: (force?: boolean, isUserInitiated?: boolean) => Promise<void>;
    computeScoringAndCache: (opportunities: Opportunity[]) => Promise<void>;
    refreshBehavioralData: () => Promise<void>;
}

export const useFeedStore = create<FeedStoreState>((set, get) => ({
    cachedItems: [],
    seenIds: new Set(),
    openedIds: new Set(),
    appliedIds: new Set(),
    recentKeywords: [],
    isBootstrapping: false,
    isSyncing: false,
    isRefreshing: false,
    syncError: null,
    hasHydrated: false,

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

        
        const hasProfileData = profile && (
            (profile.skills && profile.skills.length > 0) ||
            (profile.preferredCities && profile.preferredCities.length > 0) ||
            (profile.interestedIn && profile.interestedIn.length > 0) ||
            profile.educationLevel
        );

        const scoredOpportunities = opportunities.map(job => {
            if (!hasProfileData) return job;
            const match = calculateMatchScore(profile, job);
            return {
                ...job,
                matchScore: match.score > 0 ? match.score : undefined,
                matchReason: match.score > 0 ? match.reason : undefined,
                isEligible: match.isEligible
            };
        });

        if (scoredOpportunities.length > 0) {
            await saveFeedCache(scoredOpportunities);
            
            // 1. Pre-resolve the top 10 items BEFORE updating UI so first screen render is instant
            await preResolveAndCacheLogos(scoredOpportunities.slice(0, 10));

            // 2. Push to UI
            set({ cachedItems: scoredOpportunities });
            
            // 3. Pre-resolve the remaining jobs in the background (silent)
            void preResolveAndCacheLogos(scoredOpportunities.slice(10));

            void diffAndNotify(scoredOpportunities).then(() => {
                void useNotificationStore.getState().fetchUnreadCount();
            });
        }
    },

    performSync: async (force = false, isUserInitiated = false) => {
        const { isSyncing, computeScoringAndCache } = get();
        if (isSyncing) return; // Prevent concurrent syncs

        const lastSyncStr = getString('fresherflow_last_sync_timestamp');
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Date.now();
        
        if (!force && now - lastSync < 300000) return;

        if (isUserInitiated) {
            set({ isRefreshing: true });
        }
        set({ isSyncing: true, syncError: null });

        try {
            let feedVersion = '';
            try {
                const versionRes = await axios.get(FEED_VERSION_URL, {
                    timeout: 3000,
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (versionRes.data?.version) {
                    feedVersion = versionRes.data.version;
                }
            } catch (e) {
                console.warn('[mobile] Failed to fetch feed version, using timestamp:', e);
                feedVersion = Math.floor(Date.now() / 300000).toString();
            }

            const signatureParams = generateCdnSignature('/bootstrap-feed.min.json');
            const signedUrl = `${BOOTSTRAP_FEED_URL}?v=${feedVersion}&t=${signatureParams.t}&sig=${signatureParams.sig}`;

            console.log('Fetching signed URL:', signedUrl);

            const response = await axios.get(signedUrl, { 
                timeout: 5000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.data?.opportunities) {
                const opportunities = response.data.opportunities as Opportunity[];
                await computeScoringAndCache(opportunities);
                // Only persist timestamp after data actually lands successfully
                await saveLastSyncTimestamp(response.data.timestamp || now);
                setString('fresherflow_last_sync_timestamp', now.toString());
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            console.warn('[useFeedStore] CDN static sync failed:', errMsg);
            set({ syncError: errMsg });
        } finally {
            set({ isSyncing: false, isRefreshing: false });
        }
    },

    hydrate: async () => {
        const { hasHydrated, performSync, refreshBehavioralData } = get();
        if (hasHydrated) return; // Only hydrate once per app lifecycle

        set({ isBootstrapping: true, hasHydrated: true });
        try {
            const [cached] = await Promise.all([
                readFeedCache(),
                refreshBehavioralData()
            ]);
            if (cached && cached.items.length > 0) {
                set({ cachedItems: cached.items, isBootstrapping: false });
            }
            // If we have cache, perform sync in the background so it doesn't block the UI
            if (cached && cached.items.length > 0) {
                void performSync();
            } else {
                await performSync();
            }
        } catch (e) {
            console.warn('[useFeedStore] Offline cache read failed:', (e as Error).message);
        } finally {
            set({ isBootstrapping: false });
        }
    }
}));
