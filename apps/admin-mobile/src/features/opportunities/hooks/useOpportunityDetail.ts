import { useState, useCallback, useEffect } from 'react';
import { adminOpportunitiesApi, type Opportunity } from '@fresherflow/api-client';

export const useOpportunityDetail = (id: string) => {
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'details' | 'timeline'>('details');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oppRes, eventsRes] = await Promise.all([
        adminOpportunitiesApi.get(id),
        adminOpportunitiesApi.events(id),
      ]);
      setOpp(oppRes.opportunity);
      setEvents(eventsRes.events);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void fetchAll();
  }, [id, fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchAll();
  }, [fetchAll]);

  return {
    opp,
    events,
    loading,
    refreshing,
    error,
    tab,
    setTab,
    fetchAll,
    onRefresh,
  };
};
