import { useCallback, useMemo, useState, useEffect } from 'react';
import { OpportunityType, Profile } from '@fresherflow/types';
import { useNotifications, useSaved } from '@repo/frontend-core';
import { useFollows } from '@/hooks/useFollows';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { getLocalProfile } from '@/utils/cache/localProfile';
import { calculateMatchScore } from '@/utils/matchScoring';
import Fuse from 'fuse.js';

export const useFeed = (initialFeedType: string | null = null) => {
    const { user } = useAuthStore();
    useNotifications();
    const { savedJobs } = useSaved();
    const { follows } = useFollows();
    
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
            const p = await getLocalProfile(user?.id);  // scoped to this user
            setLocalProfile(p || (user?.profile as Profile));
        };
        void syncProfile();
    }, [user?.id, user?.profile]);


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

    const followSets = useMemo(() => {
        const companies = new Set<string>();
        const tags = new Set<string>();
        const contributors = new Set<string>();

        Object.keys(follows.companies || {}).forEach(k => companies.add(k.toLowerCase().trim()));
        Object.keys(follows.tags || {}).forEach(k => tags.add(k.toLowerCase().trim()));
        Object.keys(follows.contributors || {}).forEach(k => contributors.add(k.toLowerCase().trim()));

        return { companies, tags, contributors };
    }, [follows]);

    // 5. Behavioral Snapshotting
    // To prevent the feed from wildly re-sorting or re-bucketing when a user saves or clicks a job,
    // we snapshot the behavioral data once after hydration, and only update it on manual refresh.
    const [snapshot, setSnapshot] = useState<{
        savedJobsData: typeof savedJobsData | null;
        openedJobsData: typeof openedJobsData | null;
        seenIds: Set<string> | null;
        appliedIds: Set<string> | null;
    }>({ savedJobsData: null, openedJobsData: null, seenIds: null, appliedIds: null });

    useEffect(() => {
        if (!isBootstrapping && snapshot.seenIds === null) {
            setSnapshot({
                savedJobsData,
                openedJobsData,
                seenIds: new Set(seenIds),
                appliedIds: new Set(appliedIds),
            });
        }
    }, [isBootstrapping, savedJobsData, openedJobsData, seenIds, appliedIds, snapshot.seenIds]);

    // 6. High-Speed Local Filter/Scoring Pipeline (Takes <3ms)
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
        }

        if (searchQuery.trim() && fuseIndex) {
            result = fuseIndex.search(searchQuery).map(r => r.item);
        }

        const now = Date.now();

        // Map and compute relevance scores for all items in result
        const scored = result.map(job => {
            const matchResult = calculateMatchScore(localProfile, job as any);
            let score = matchResult.score;

            const activeSavedJobsData = snapshot.savedJobsData || savedJobsData;
            const activeOpenedJobsData = snapshot.openedJobsData || openedJobsData;

            // 1. Saved Job Boost (max +30)
            let savedBoost = 0;
            if (job.jobFunction && activeSavedJobsData.functions.has(job.jobFunction.toLowerCase().trim())) {
                savedBoost += 15;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (activeSavedJobsData.skills.has(s.toLowerCase().trim())) {
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
            if (job.jobFunction && activeOpenedJobsData.functions.has(job.jobFunction.toLowerCase().trim())) {
                openedBoost += 5;
            }
            if (job.requiredSkills) {
                let skillMatches = 0;
                job.requiredSkills.forEach(s => {
                    if (activeOpenedJobsData.skills.has(s.toLowerCase().trim())) {
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

            // 6. Follow Signals Boost (max +75)
            if (job.companyWebsite && followSets.companies.has(job.companyWebsite.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0].trim())) {
                score += 40;
            } else if (job.company && followSets.companies.has(job.company.toLowerCase().trim())) {
                score += 40;
            }

            if (job.tags && job.tags.length > 0) {
                job.tags.forEach(t => {
                    if (followSets.tags.has(t.toLowerCase().trim())) score += 20;
                });
            }

            if (job.postedByUserId && followSets.contributors.has(job.postedByUserId.toLowerCase().trim())) {
                score += 15;
            }

            return {
                ...job,
                isEligible: matchResult.isEligible,
                matchScore: matchResult.score,
                matchReason: matchResult.reason,
                clicksCount: job.clicksCount || 0,
                relevanceScore: Math.round(score)
            };
        });

        const sortByEligibleAndDate = (a: any, b: any) => {
            if (a.isEligible && !b.isEligible) return -1;
            if (!a.isEligible && b.isEligible) return 1;
            const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
            return dateB - dateA;
        };

        const activeItems = scored.filter(j => !j.expiresAt || new Date(j.expiresAt).getTime() > now);

        if (feedType === 'closing_soon') {
            return scored
                .filter(j => Boolean(j.expiresAt) && new Date(j.expiresAt as string).getTime() > now)
                .sort((a, b) => new Date(a.expiresAt as string).getTime() - new Date(b.expiresAt as string).getTime());
        }

        if (feedType === 'latest') {
            return activeItems.sort((a, b) => {
                const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
                const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
                return dateB - dateA;
            });
        }

        if (feedType === 'trending') {
            const trendScore = (item: typeof scored[0]) =>
                ((item.clicksCount || 0) * 1.5) +
                ((item.appliedCount || 0) * 4.0) +
                ((item.savesCount || 0) * 3.0) +
                (item.trendingScore || 0);

            return activeItems.sort((a, b) => trendScore(b) - trendScore(a));
        }

        if (feedType === null && hasProfileData) {
            return activeItems
                .filter(j => j.isEligible && (j.matchScore || 0) > 0)
                .sort(sortByEligibleAndDate);
        }

        return activeItems.sort(sortByEligibleAndDate);
    }, [cachedItems, fuseIndex, searchQuery, activeFilter, feedType, snapshot, recentKeywords, followSets, localProfile]);

    const profileMatchedOpportunities = useMemo(() => {
        return filteredOpportunities.filter(j => j.isEligible && (j.matchScore || 0) > 0);
    }, [filteredOpportunities]);

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
        opportunities: feedType === 'profile' ? profileMatchedOpportunities : filteredOpportunities,
        profileMatchedOpportunities,
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
            setSnapshot({
                savedJobsData,
                openedJobsData,
                seenIds: new Set(seenIds),
                appliedIds: new Set(appliedIds),
            });
            void refreshBehavioralData();
            void performSync(true, true);
        }, [performSync, refreshBehavioralData, savedJobsData, openedJobsData, seenIds, appliedIds]), // Force refresh head check marked as user-initiated
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
