import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Opportunity, OpportunityType, Profile } from '@fresherflow/types';
import { useNotificationStore } from '@/store/useNotificationStore';
import { useNotifications } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import { saveFeedCache, readFeedCache, saveLastSyncTimestamp } from '@/utils/offlineCache';
import { diffAndNotify } from '@/utils/localNotifications';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { generateCdnSignature } from '@/utils/cdnSignature';
import Fuse from 'fuse.js';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL, FEED_VERSION_URL } from '@/config/api';

import { getString, setString } from '@/utils/storage';

export const useFeed = (initialFeedType: string | null = null) => {
    const { user } = useAuthStore();
    useNotifications();
    
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | OpportunityType>('ALL');
    const [activeCity, setActiveCity] = useState('ALL');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [feedType, setFeedType] = useState<string | null>(initialFeedType);
    
    const [cachedItems, setCachedItems] = useState<Opportunity[]>([]);
    const [isBootstrapping, setIsBootstrapping] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Sync local profile for match scoring
    useEffect(() => {
        const syncProfile = async () => {
            const p = await getLocalProfile();
            setLocalProfile(p || (user?.profile as Profile));
        };
        void syncProfile();
    }, [user?.profile]);

    const hasProfileData = useMemo(() => {
        const profile = localProfile;
        return !!(profile && (
            (profile.skills && profile.skills.length > 0) ||
            (profile.preferredCities && profile.preferredCities.length > 0) ||
            (profile.interestedIn && profile.interestedIn.length > 0) ||
            profile.educationLevel
        ));
    }, [localProfile]);

    // 1. Client-First Hydration (Instant Render from Cache)
    useEffect(() => {
        const hydrate = async () => {
            setIsBootstrapping(true);
            try {
                const cached = await readFeedCache();
                if (cached && cached.items.length > 0) {
                    setCachedItems(cached.items);
                }
            } catch (e) {
                console.warn('[useFeed] Offline cache read failed:', (e as Error).message);
            } finally {
                setIsBootstrapping(false);
            }
        };
        void hydrate();
    }, []);

    // 2. Local Score Computing Helper
    const computeScoringAndCache = useCallback(async (opportunities: Opportunity[]) => {
        const profile = await getLocalProfile();
        
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

        // Save feed cache locally
        if (scoredOpportunities.length > 0) {
            await saveFeedCache(scoredOpportunities);
            setCachedItems(scoredOpportunities);
            
            // Diff against seen list and update notification badge counts
            void diffAndNotify(scoredOpportunities).then(() => {
                void useNotificationStore.getState().fetchUnreadCount();
            });
        }
    }, []);

    // 3. Smart Edge Sync (Zero Database pressure, queries static CDN file)
    const performSync = useCallback(async (force = false, isUserInitiated = false) => {
        const lastSyncStr = getString('fresherflow_last_sync_timestamp');
        const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
        const now = Date.now();
        // Cooldown: 5 minutes (300,000ms) to prevent redundant Edge pulls
        if (!force && now - lastSync < 300000) return;
        setString('fresherflow_last_sync_timestamp', now.toString());

        if (isUserInitiated) {
            setIsRefreshing(true);
        }
        setIsSyncing(true);
        setSyncError(null);

        try {
            // Fetch the centrally uploaded feed version to bypass stale CDN edge caches
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

            // Generate HMAC cryptographic request signature to bypass Edge WAF block
            const signatureParams = generateCdnSignature('/bootstrap-feed.min.json');
            const signedUrl = `${BOOTSTRAP_FEED_URL}?v=${feedVersion}&t=${signatureParams.t}&sig=${signatureParams.sig}`;

            console.log('Fetching signed URL:', signedUrl);

            // Pull the single compressed Master JSON feed directly from CDN Pop
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
                await saveLastSyncTimestamp(response.data.timestamp || now);
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            console.warn('[useFeed] CDN static sync failed:', errMsg);
            setSyncError(errMsg);
        } finally {
            setIsSyncing(false);
            setIsRefreshing(false);
        }
    }, [computeScoringAndCache]);

    // Pull from CDN on screen focus automatically (respects cooldown)
    useFocusEffect(
        useCallback(() => {
            void performSync();
        }, [performSync])
    );

    // 4. In-Memory Fuzzy Search Index (Fuse.js)
    const fuseIndex = useMemo(() => {
        if (cachedItems.length === 0) return null;
        return new Fuse(cachedItems, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
        });
    }, [cachedItems]);

    // 5. High-Speed Local Filter/Scoring Pipeline (Takes <3ms)
    const filteredOpportunities = useMemo(() => {
        let result = cachedItems;

        if (activeFilter !== 'ALL') {
            result = result.filter(j => j.type === activeFilter);
        }

        if (feedType === 'remote') {
            result = result.filter(j => j.workMode === 'REMOTE');
        } else if (feedType === '2026') {
            result = result.filter(j => !j.allowedPassoutYears || j.allowedPassoutYears.length === 0 || j.allowedPassoutYears.includes(2026));
        } else if (feedType === 'internships') {
            result = result.filter(j => j.type === 'INTERNSHIP');
        } else if (feedType === 'trending') {
            result = [...result].sort((a, b) => {
                const scoreA = a.trendingScore || 0;
                const scoreB = b.trendingScore || 0;
                return scoreB - scoreA;
            });
        }

        if (searchQuery.trim() && fuseIndex) {
            result = fuseIndex.search(searchQuery).map(r => r.item);
        }

        // Expiry management: sort expired listings cleanly to the bottom
        const now = Date.now();
        const active: Opportunity[] = [];
        const expired: Opportunity[] = [];
        
        for (const j of result) {
            if (!j.expiresAt || new Date(j.expiresAt).getTime() > now) {
                active.push(j);
            } else {
                expired.push(j);
            }
        }
        
        // Sort active opportunities: referred & eligible to the top, then referred & ineligible, then normal active.
        active.sort((a: Opportunity & { isReferral?: boolean; isEligible?: boolean }, b: Opportunity & { isReferral?: boolean; isEligible?: boolean }) => {
            const isReferredA = a.isReferral ? 1 : 0;
            const isReferredB = b.isReferral ? 1 : 0;
            
            if (isReferredA !== isReferredB) {
                return isReferredB - isReferredA; // Referred ones first
            }
            
            // If both are referred, prioritize eligible ones
            if (a.isReferral && b.isReferral) {
                const eligibleA = a.isEligible !== false ? 1 : 0;
                const eligibleB = b.isEligible !== false ? 1 : 0;
                if (eligibleA !== eligibleB) {
                    return eligibleB - eligibleA; // Eligible first
                }
            }
            
            return 0; // Maintain original database/CDN order otherwise
        });
        
        return [...active, ...expired];
    }, [cachedItems, fuseIndex, searchQuery, activeFilter, feedType]);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setActiveFilter('ALL');
        setActiveCity('ALL');
        setSelectedTag(null);
        setFeedType(null);
    }, []);

    const hasActiveFilters = activeFilter !== 'ALL' || activeCity !== 'ALL' || searchQuery.trim().length > 0 || !!selectedTag || !!feedType;

    return {
        user,
        profile: localProfile,
        opportunities: filteredOpportunities,
        loading: isBootstrapping,
        refreshing: isRefreshing,
        isSyncing,
        loadingMore: false, // Pure CDN model loads all active items in one single gzipped file
        error: syncError,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        activeCity,
        setActiveCity,
        selectedTag,
        setSelectedTag,
        feedType,
        setFeedType,
        offlineMode: !!syncError,
        onRefresh: () => performSync(true, true), // Force refresh head check marked as user-initiated
        loadMore: () => {}, // No paging scroll requests needed!
        filteredOpportunities,
        clearFilters,
        hasActiveFilters,
        hasProfileData,
        totalResults: filteredOpportunities.length,
        hasMore: false, // We have the full, complete set of active jobs locally
        isBootstrapping,
    };
};
