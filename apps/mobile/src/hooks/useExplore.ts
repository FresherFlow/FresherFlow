import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Opportunity, OpportunityType, WorkMode, Profile, ActionType } from '@fresherflow/types';
import { readFeedCache, saveFeedCache, saveLastSyncTimestamp, readTrackerCacheSync } from '@/utils/offlineCache';
import { generateCdnSignature } from '@/utils/cdnSignature';
import debounce from 'lodash.debounce';
import Fuse from 'fuse.js';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL } from '@/config/api';
import { normalizeQuery } from '@/utils/text';
import { useUIStore } from '@/store/useUIStore';
import { useSaved } from '@repo/frontend-core';
import { getRecentSearchKeywords, saveRecentSearchKeyword } from '@/utils/userBehavior';
import { getLocalProfile } from '@/utils/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import { getOpenedIds } from '@/utils/seenJobs';
import { useAuthStore } from '@/store/useAuthStore';


export interface ExploreFilters {
    types: OpportunityType[];
    workModes: WorkMode[];
    batchYears: number[];
    tag: string | null;
    sort: 'recommended' | 'latest' | 'trending' | 'closing_soon';
}

export function useExplore() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const filters = useUIStore(s => s.exploreFilters);
    const setFilters = useUIStore(s => s.setExploreFilters);
    const resetExploreFilters = useUIStore(s => s.resetExploreFilters);

    const [cachedItems, setCachedItems] = useState<Opportunity[]>([]);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    // Personalized relevance states
    const { savedJobs } = useSaved();
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);
    const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
    const [recentKeywords, setRecentKeywords] = useState<string[]>([]);

    const loadOpenedIds = useCallback(async () => {
        const ids = await getOpenedIds();
        setOpenedIds(ids);
    }, []);

    const loadAppliedIds = useCallback(() => {
        const set = new Set<string>();
        try {
            const trackerCache = readTrackerCacheSync();
            if (trackerCache?.items) {
                (trackerCache.items as Array<{ actionType: ActionType; opportunityId?: string; opportunity?: { id?: string } }>).forEach((item) => {
                    if (item?.actionType === ActionType.APPLIED) {
                        const id = item?.opportunityId || item?.opportunity?.id;
                        if (id) set.add(id);
                    }
                });
            }
        } catch (e) {
            console.warn('[useExplore] Failed to parse tracker cache for applied IDs:', e);
        }
        setAppliedIds(set);
    }, []);

    const loadRecentKeywords = useCallback(() => {
        const keywords = getRecentSearchKeywords();
        setRecentKeywords(keywords);
    }, []);

    // Sync local profile for match scoring
    useEffect(() => {
        const syncProfile = async () => {
            const p = await getLocalProfile(user?.id);  // scoped to current user
            setLocalProfile(p);
        };
        void syncProfile();
    }, [user?.id]);




    // Debounce search query to prevent rebuilding index on every keystroke
    const updateDebouncedQuery = useMemo(
        () => debounce((q: string) => setDebouncedSearchQuery(q), 300),
        []
    );

    useEffect(() => {
        updateDebouncedQuery(searchQuery);
        return () => updateDebouncedQuery.cancel();
    }, [searchQuery, updateDebouncedQuery]);

    // Save debounced search keywords to behavior history
    useEffect(() => {
        if (debouncedSearchQuery.trim().length >= 3) {
            saveRecentSearchKeyword(debouncedSearchQuery.trim());
            loadRecentKeywords();
        }
    }, [debouncedSearchQuery, loadRecentKeywords]);

    // 1. Client-First Hydration (Instant Render from Cache)
    const hydrate = useCallback(async () => {
        setIsBootstrapping(true);
        try {
            const cache = await readFeedCache();
            if (cache && cache.items.length > 0) {
                setCachedItems(cache.items);
            } else {
                // Generate secure signatures to bypass Cloudflare Worker block
                const sigParams = generateCdnSignature('/bootstrap-feed.min.json');
                const signedUrl = `${BOOTSTRAP_FEED_URL}?t=${sigParams.t}&sig=${sigParams.sig}`;

                // If cache is empty, bootstrap directly from CDN
                const response = await axios.get(signedUrl, { 
                    timeout: 4000
                });
                if (response.data?.opportunities) {
                    const ops = response.data.opportunities as Opportunity[];
                    setCachedItems(ops);
                    await saveFeedCache(ops);
                }
            }
            // Load user behavior records on mount
            void loadOpenedIds();
            loadAppliedIds();
            loadRecentKeywords();
        } catch (e) {
            console.warn('[useExplore] Cache hydration failed:', (e as Error).message);
        } finally {
            setIsBootstrapping(false);
        }
    }, [loadOpenedIds, loadAppliedIds, loadRecentKeywords]);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    // 2. Dynamic Manual Pull-to-Refresh
    const onRefresh = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            // Reload user behavior records on manual refresh
            void loadOpenedIds();
            loadAppliedIds();
            loadRecentKeywords();

            const sigParams = generateCdnSignature('/bootstrap-feed.min.json');
            const signedUrl = `${BOOTSTRAP_FEED_URL}?t=${sigParams.t}&sig=${sigParams.sig}`;

            const response = await axios.get(signedUrl, { 
                timeout: 5000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.data?.opportunities) {
                const opportunities = response.data.opportunities as Opportunity[];
                setCachedItems(opportunities);
                await saveFeedCache(opportunities);
                await saveLastSyncTimestamp(response.data.timestamp || Date.now());
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            console.warn('[useExplore] CDN static sync failed:', errMsg);
            setSyncError(errMsg);
        } finally {
            setIsSyncing(false);
        }
    }, [loadOpenedIds, loadAppliedIds, loadRecentKeywords]);

    const savedJobsData = useMemo(() => {
        const skills = new Set<string>();
        const functions = new Set<string>();
        savedJobs.forEach(job => {
            if (job.requiredSkills) {
                job.requiredSkills.forEach(s => skills.add(s.toLowerCase().trim()));
            }
            if (job.jobFunction) {
                functions.add(job.jobFunction.toLowerCase().trim());
            }
        });
        return { skills, functions };
    }, [savedJobs]);

    const openedJobsData = useMemo(() => {
        const skills = new Set<string>();
        const functions = new Set<string>();
        cachedItems.forEach(job => {
            if (openedIds.has(job.id)) {
                if (job.requiredSkills) {
                    job.requiredSkills.forEach(s => skills.add(s.toLowerCase().trim()));
                }
                if (job.jobFunction) {
                    functions.add(job.jobFunction.toLowerCase().trim());
                }
            }
        });
        return { skills, functions };
    }, [cachedItems, openedIds]);

    // Store dynamic user behavior states in refs to prevent layout shifting/re-ordering during active sessions
    const savedJobsDataRef = useRef(savedJobsData);
    const openedJobsDataRef = useRef(openedJobsData);
    const appliedIdsRef = useRef(appliedIds);
    const recentKeywordsRef = useRef(recentKeywords);

    useEffect(() => {
        savedJobsDataRef.current = savedJobsData;
    }, [savedJobsData]);

    useEffect(() => {
        openedJobsDataRef.current = openedJobsData;
    }, [openedJobsData]);

    useEffect(() => {
        appliedIdsRef.current = appliedIds;
    }, [appliedIds]);

    useEffect(() => {
        recentKeywordsRef.current = recentKeywords;
    }, [recentKeywords]);

    // 3. High-Speed Local Filter & Sort Pipeline (Parsed in <3ms)
    const rawResults = useMemo(() => {
        let items = cachedItems;

        // Apply Filters Locally
        if (filters.types && filters.types.length > 0) {
            items = items.filter(j => filters.types.includes(j.type));
        }

        if (filters.tag) {
            const tag = filters.tag;
            const batchMatch = tag.match(/(\d{4})\s*Batch/i);
            if (batchMatch) {
                const year = parseInt(batchMatch[1]);
                items = items.filter(j => !j.allowedPassoutYears || j.allowedPassoutYears.length === 0 || j.allowedPassoutYears.includes(year));
            } else {
                items = items.filter(j => j.tags?.includes(tag) || j.jobFunction === tag);
            }
        }

        if (filters.workModes && filters.workModes.length > 0) {
            items = items.filter(j => filters.workModes.includes(j.workMode as any));
        }

        if (filters.batchYears && filters.batchYears.length > 0) {
            items = items.filter(j => !j.allowedPassoutYears || j.allowedPassoutYears.length === 0 || j.allowedPassoutYears.some(y => filters.batchYears.includes(y)));
        }

        const currentSavedData = savedJobsDataRef.current;
        const currentOpenedData = openedJobsDataRef.current;
        const currentKeywords = recentKeywordsRef.current;
        const currentAppliedIds = appliedIdsRef.current;

        // Map and compute relevance scores for all items in result
        const scored = items.map(job => {
            let baseScore = 0;
            if (localProfile) {
                const match = calculateMatchScore(localProfile, job);
                baseScore = match.score > 0 ? match.score : 0;
            }

            let score = baseScore;

            // 1. Saved Job Boost (max +30)
            let savedBoost = 0;
            if (job.jobFunction && currentSavedData.functions.has(job.jobFunction.toLowerCase().trim())) {
                savedBoost += 15;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (currentSavedData.skills.has(s.toLowerCase().trim())) {
                        skillMatches++;
                    }
                });
                savedBoost += Math.min(skillMatches * 3, 15);
            }
            score += savedBoost;

            // 2. Recent Search Keyword Boost (max +25)
            let searchBoost = 0;
            if (currentKeywords.length > 0) {
                const titleLower = (job.title || '').toLowerCase();
                const compLower = (job.company || '').toLowerCase();
                const funcLower = (job.jobFunction || '').toLowerCase();
                const locsLower = (job.locations || []).map(l => l.toLowerCase());

                currentKeywords.forEach(kw => {
                    if (
                        titleLower.includes(kw) ||
                        compLower.includes(kw) ||
                        funcLower.includes(kw) ||
                        locsLower.some(l => l.includes(kw))
                    ) {
                        searchBoost += 10;
                    }
                });
                searchBoost = Math.min(searchBoost, 25);
            }
            score += searchBoost;

            // 3. Viewed/Opened Job Similarity Boost (max +15)
            let openedBoost = 0;
            if (job.jobFunction && currentOpenedData.functions.has(job.jobFunction.toLowerCase().trim())) {
                openedBoost += 5;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (currentOpenedData.skills.has(s.toLowerCase().trim())) {
                        skillMatches++;
                    }
                });
                openedBoost += Math.min(skillMatches * 2, 10);
            }
            score += openedBoost;

            // 4. Trending scaling boost (max +10)
            const trendBoost = Math.min(job.trendingScore || 0, 100) * 0.1;
            score += trendBoost;

            // 5. Referral Boost (if referral, add +10)
            if (job.isReferral) {
                score += 10;
            }

            return {
                ...job,
                clicksCount: openedIds.has(job.id) ? Math.max(job.clicksCount || 0, 1) : (job.clicksCount || 0),
                relevanceScore: Math.round(score),
                matchScore: baseScore > 0 ? baseScore : undefined
            };
        });

        // Apply Sorting Locally
        if (filters.sort === 'trending') {
            items = [...scored].sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
        } else if (filters.sort === 'closing_soon') {
            items = scored.filter(j => j.expiresAt).sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime());
        } else if (filters.sort === 'latest') {
            items = [...scored].sort((a, b) => new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime());
        } else {
            // 'recommended' is the default personalized relevance sorting with applied/expired demotion
            const active: typeof scored = [];
            const applied: typeof scored = [];
            const expired: typeof scored = [];
            const now = Date.now();

            for (const j of scored) {
                if (j.expiresAt && new Date(j.expiresAt).getTime() <= now) {
                    expired.push(j);
                } else if (currentAppliedIds.has(j.id)) {
                    applied.push(j);
                } else {
                    active.push(j);
                }
            }

            active.sort((a, b) => b.relevanceScore - a.relevanceScore);
            applied.sort((a, b) => b.relevanceScore - a.relevanceScore);
            expired.sort((a, b) => new Date(b.expiresAt || 0).getTime() - new Date(a.expiresAt || 0).getTime());

            items = [...active, ...applied, ...expired];
        }

        return items;
    }, [cachedItems, filters, localProfile]);

    // 4. Fuse.js Fuzzy Search Index (Lazy-loaded to prevent blocking UI on filter changes)
    const fuseIndex = useMemo(() => {
        if (rawResults.length === 0 || !debouncedSearchQuery) return null;
        return new Fuse(rawResults, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
            distance: 100,
        });
    }, [rawResults, debouncedSearchQuery]);

    // 5. In-Memory Search Engine & Suggestions
    const { results, suggestions } = useMemo(() => {
        const query = normalizeQuery(debouncedSearchQuery);
        if (!query || !fuseIndex) {
            return { results: rawResults, suggestions: [] };
        }
        
        const searchResults = fuseIndex.search(query).map(r => r.item);
        
        // Broader suggestions if exact search yields 0 results
        let fuzzySuggestions: Opportunity[] = [];
        if (searchResults.length === 0 && rawResults.length > 0) {
            const broaderFuse = new Fuse(rawResults, {
                keys: ['title', 'company', 'jobFunction'],
                threshold: 0.6,
            });
            fuzzySuggestions = broaderFuse.search(query).slice(0, 3).map(r => r.item);
        }
        
        return { results: searchResults, suggestions: fuzzySuggestions };
    }, [fuseIndex, debouncedSearchQuery, rawResults]);

    const resetFilters = useCallback(() => {
        resetExploreFilters();
        setSearchQuery('');
    }, [resetExploreFilters]);

    return {
        results,
        loading: isBootstrapping,
        refreshing: isSyncing,
        onRefresh,
        filters,
        setFilters,
        resetFilters,
        searchQuery,
        setSearchQuery,
        suggestions,
        isBootstrapping,
        error: syncError,
    };
}
