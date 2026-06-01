import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { referralApi } from '@fresherflow/api-client';
import { readInvitesCache, saveInvitesCache } from '@/utils/cache/offlineCache';

export interface ReferralStats {
  totalClicks: number;
  totalSignups: number;
  activated: number;
}

export interface Referral {
  id: string;
  fullName: string;
  joinedAt: string;
  completionPct: number;
  activated: boolean;
}

export interface Badge {
  badge: 'FIRST_INVITE' | 'CONNECTOR' | 'CAMPUS_SCOUT' | 'GROWTH_NODE' | 'NETWORK_BUILDER';
  label: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  earnedAt: string | null;
}

export interface ReferralData {
  referralCode: string;
  shareUrl: string;
  stats: ReferralStats;
  referrals: Referral[];
  badges: Badge[];
}

interface CachedInvitesData {
  items: unknown[];
  stats: ReferralStats;
  timestamp: number;
  referralCode?: string;
  shareUrl?: string;
  badges?: Badge[];
}

export function useReferrals() {
  const [cachedData, setCachedData] = useState<ReferralData | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Instant Hydration
  useEffect(() => {
    const hydrate = async () => {
      try {
        const cached = await readInvitesCache() as CachedInvitesData | null;
        if (cached) {
          setCachedData({
            referralCode: cached.referralCode || '',
            shareUrl: cached.shareUrl || '',
            stats: cached.stats,
            referrals: cached.items as Referral[],
            badges: cached.badges || [],
          });
        }
      } finally {
        setIsHydrating(false);
      }
    };
    void hydrate();
  }, []);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const res = await referralApi.getMe() as ReferralData;
      
      // Persistence
      void saveInvitesCache(res.referrals, res.stats, { 
        referralCode: res.referralCode, 
        shareUrl: res.shareUrl,
        badges: res.badges
      });
      
      return res;
    },
    staleTime: 1000 * 60 * 60, // 1 hour (referrals don't change fast)
  });

  const mergedData = data || cachedData;

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    await refetch();
    setIsManualRefreshing(false);
  }, [refetch]);

  return {
    ...mergedData,
    loading: (isLoading || isHydrating) && !mergedData?.referralCode,
    refreshing: isManualRefreshing,
    error: error ? (error as Error).message : null,
    refresh: onRefresh,
  };
}
