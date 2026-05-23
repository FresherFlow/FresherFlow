import { useCallback, useMemo, useState, useEffect } from 'react';
import { OpportunityType, Profile } from '@fresherflow/types';
import { useNotifications, useSaved } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { getLocalProfile } from '@/utils/localProfile';
import Fuse from 'fuse.js';

export const useFeed = (initialFeedType: string | null = null) => {
    const { user } = useAuthStore();
    useNotifications();
    const { savedJobs } = useSaved();
    
    const [localProfile, setLocalProfile] = useState<Profile | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | OpportunityType>('ALL');
    const [activeCity, setActiveCity] = useState('ALL');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [feedType, setFeedType] = useState<string | null>(initialFeedType);
    
    // Subscribe to global store
    const {
        cachedItems,
        seenIds,
        openedIds,
        appliedIds,
        recentKeywords,
        isBootstrapping,
        isSyncing,
        isRefreshing,
        syncError,
        performSync,
        refreshBehavioralData
    } = useFeedStore();

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

    // 4. In-Memory Fuzzy Search Index (Fuse.js)
    const fuseIndex = useMemo(() => {
        if (cachedItems.length === 0) return null;
        return new Fuse(cachedItems, {
            keys: ['title', 'company', 'jobFunction', 'locations'],
            threshold: 0.3,
        });
    }, [cachedItems]);

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

        const now = Date.now();

        // Map and compute relevance scores for all items in result
        const scored = result.map(job => {
            let score = (job as { matchScore?: number }).matchScore || 0;

            // 1. Saved Job Boost (max +30)
            let savedBoost = 0;
            if (job.jobFunction && savedJobsData.functions.has(job.jobFunction.toLowerCase().trim())) {
                savedBoost += 15;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (savedJobsData.skills.has(s.toLowerCase().trim())) {
                        skillMatches++;
                    }
                });
                savedBoost += Math.min(skillMatches * 3, 15);
            }
            score += savedBoost;

            // 2. Recent Search Keyword Boost (max +25)
            let searchBoost = 0;
            if (recentKeywords.length > 0) {
                const titleLower = (job.title || '').toLowerCase();
                const compLower = (job.company || '').toLowerCase();
                const funcLower = (job.jobFunction || '').toLowerCase();
                const locsLower = (job.locations || []).map(l => l.toLowerCase());

                recentKeywords.forEach(kw => {
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
            if (job.jobFunction && openedJobsData.functions.has(job.jobFunction.toLowerCase().trim())) {
                openedBoost += 5;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (openedJobsData.skills.has(s.toLowerCase().trim())) {
                        skillMatches++;
                    }
                });
                openedBoost += Math.min(skillMatches * 2, 10);
            }
            score += openedBoost;

            // 4. Trending scaling boost (max +10)
            const trendBoost = Math.min(job.trendingScore || 0, 100) * 0.1;
            score += trendBoost;

            // 5. Referral Boost (if referral, add +10 so referrals naturally float higher)
            if (job.isReferral) {
                score += 10;
            }

            return {
                ...job,
                clicksCount: openedIds.has(job.id) ? Math.max(job.clicksCount || 0, 1) : (job.clicksCount || 0),
                relevanceScore: Math.round(score)
            };
        });

        // Expiry, Applied, and Seen management: partition into unseen active, seen active, applied active, and expired
        const unseenActive: typeof scored = [];
        const seenActive: typeof scored = [];
        const appliedActive: typeof scored = [];
        const expired: typeof scored = [];
        
        for (const j of scored) {
            if (j.expiresAt && new Date(j.expiresAt).getTime() <= now) {
                expired.push(j);
            } else if (appliedIds.has(j.id)) {
                appliedActive.push(j);
            } else if (seenIds.has(j.id)) {
                seenActive.push(j);
            } else {
                unseenActive.push(j);
            }
        }
        
        const sortByRelevance = (a: typeof scored[0], b: typeof scored[0]) => {
            return b.relevanceScore - a.relevanceScore;
        };
        
        unseenActive.sort(sortByRelevance);
        seenActive.sort(sortByRelevance);
        appliedActive.sort(sortByRelevance);

        // Expired sorted by expiry time (newest first)
        expired.sort((a, b) => new Date(b.expiresAt || 0).getTime() - new Date(a.expiresAt || 0).getTime());
        
        return [...unseenActive, ...seenActive, ...appliedActive, ...expired];
    }, [cachedItems, fuseIndex, searchQuery, activeFilter, feedType, seenIds, appliedIds, recentKeywords, savedJobsData, openedJobsData]);

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
        onRefresh: useCallback(() => {
            void refreshBehavioralData();
            void performSync(true, true);
        }, [performSync, refreshBehavioralData]), // Force refresh head check marked as user-initiated
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
