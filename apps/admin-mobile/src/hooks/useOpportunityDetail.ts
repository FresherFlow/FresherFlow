import { useState, useCallback } from 'react';
import { Opportunities } from '../lib/api';
import { type Event } from '../components/OpportunityTimeline';

export type OppDetail = {
    id: string; title: string; company: string; type: string; status: string;
    workMode?: string; locations?: string[]; description?: string;
    applyLink?: string; salaryMin?: number; salaryMax?: number; stipend?: string;
    allowedPassoutYears?: number[]; allowedDegrees?: string[];
    expiresAt?: string | null; createdAt: string; updatedAt?: string;
    [key: string]: unknown;
};

export function useOpportunityDetail(opportunityId: string) {
    const [opp, setOpp] = useState<OppDetail | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'details' | 'timeline'>('details');

    const fetchAll = useCallback(async () => {
        try {
            const [dRes, eRes] = await Promise.allSettled([
                Opportunities.get(opportunityId),
                Opportunities.events(opportunityId),
            ]);
            if (dRes.status === 'fulfilled') setOpp((dRes.value as any).opportunity ?? null);
            if (eRes.status === 'fulfilled') setEvents((eRes.value as any).events ?? []);
        } catch { /* silent */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [opportunityId]);

    const onRefresh = () => {
        setRefreshing(true);
        void fetchAll();
    };

    return {
        opp,
        events,
        loading,
        refreshing,
        tab,
        setTab,
        fetchAll,
        onRefresh
    };
}
