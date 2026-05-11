import { useState, useCallback, useEffect } from 'react';
import { referralApi } from '@fresherflow/api-client';

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

export function useReferrals() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await referralApi.getMe() as ReferralData;
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to fetch referrals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReferrals();
  }, [fetchReferrals]);

  return {
    ...data,
    loading,
    error,
    refresh: fetchReferrals,
  };
}
