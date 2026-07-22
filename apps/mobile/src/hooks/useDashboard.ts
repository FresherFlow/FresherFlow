import { useState, useCallback, useEffect, useMemo } from 'react';
import { Opportunity } from '@fresherflow/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { useSaved } from '@repo/frontend-core';
import { useTracker } from '@/hooks/useTracker';
import { getString, setString } from '@/utils/storage';

interface Highlights {
    urgent?: {
        walkins?: Opportunity[];
        deadlines?: Opportunity[];
    };
    new?: Opportunity[];
    hot?: Opportunity[];
    driveMilestones?: Array<{
        opportunityId: string;
        eventId: string;
        eventType: string;
        eventDate: string;
        eventTitle: string;
        opportunity: Opportunity;
    }>;
    [key: string]: unknown;
}

export function useDashboard() {
    const { user } = useAuthStore();
    const isAnonymous = !user || user.isAnonymous;

    const cachedItems = useFeedStore((s) => s.cachedItems);
    const isSyncing = useFeedStore((s) => s.isSyncing);
    const performSync = useFeedStore((s) => s.performSync);

    const { savedJobs } = useSaved();
    const { actions } = useTracker();

    const recentActivity = savedJobs;
    const latestJobs = cachedItems;

    const appliedJobs = useMemo(() => {
        return actions.map(a => a.opportunity).filter((o): o is Opportunity => !!o);
    }, [actions]);

    const highlights = useMemo((): Highlights | null => {
        if (cachedItems.length === 0) return null;

        const now = new Date();
        const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Get opportunities expiring in next 48 hours
        const expiringOpps = cachedItems.filter(o => {
            if (!o.expiresAt) return false;
            const exp = new Date(o.expiresAt);
            return exp > now && exp < fortyEightHoursFromNow;
        });

        const walkins = expiringOpps.filter(o => o.type === 'WALKIN');
        const others = expiringOpps.filter(o => o.type !== 'WALKIN');

        // 2. Newly added in last 24h
        const newlyAdded = cachedItems.filter(o => {
            if (!o.postedAt) return false;
            const posted = new Date(o.postedAt);
            return posted > twentyFourHoursAgo;
        });

        // 3. New since last visit
        const lastVisitStr = getString('ff_last_dashboard_visit');
        const lastVisit = lastVisitStr ? new Date(parseInt(lastVisitStr, 10)) : twentyFourHoursAgo;
        const newSinceLastVisit = cachedItems.filter(o => {
            if (!o.postedAt) return false;
            const posted = new Date(o.postedAt);
            return posted > lastVisit;
        });

        // 4. Drive Milestones
        const driveEventTypes = [
            'NOTIFICATION',
            'REG_START',
            'REG_END',
            'EXAM_DATE',
            'RESULT',
        ];
        const upcomingEvents: any[] = [];
        cachedItems.forEach(opp => {
            if (opp.events && Array.isArray(opp.events)) {
                opp.events.forEach(evt => {
                    const evtDate = new Date(evt.eventDate);
                    if (
                        driveEventTypes.includes(evt.eventType) &&
                        evtDate >= new Date(now.getTime() - 6 * 60 * 60 * 1000) &&
                        evtDate <= new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
                    ) {
                        upcomingEvents.push({
                            ...evt,
                            opportunity: opp
                        });
                    }
                });
            }
        });

        const seenDriveIds = new Set<string>();
        const driveMilestones = upcomingEvents
            .filter((item) => {
                if (seenDriveIds.has(item.opportunityId)) return false;
                seenDriveIds.add(item.opportunityId);
                return true;
            })
            .sort((a, b) => {
                const aPriority = /tcs/i.test(a.opportunity?.company || '') && /nqt/i.test(a.opportunity?.title || '') ? 1 : 0;
                const bPriority = /tcs/i.test(b.opportunity?.company || '') && /nqt/i.test(b.opportunity?.title || '') ? 1 : 0;
                if (aPriority !== bPriority) return bPriority - aPriority;
                return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
            })
            .slice(0, 4)
            .map((item) => ({
                opportunityId: item.opportunityId,
                eventId: item.id,
                eventType: item.eventType,
                eventDate: new Date(item.eventDate).toISOString(),
                eventTitle: item.title,
                opportunity: item.opportunity,
            }));

        if (driveMilestones.length === 0) {
            const fallbackDrive = cachedItems.find(o => 
                o.title.toLowerCase().includes('nqt') && 
                (!o.expiresAt || new Date(o.expiresAt) > now)
            );
            if (fallbackDrive) {
                driveMilestones.push({
                    opportunityId: fallbackDrive.id,
                    eventId: `fallback-${fallbackDrive.id}`,
                    eventType: 'NOTIFICATION',
                    eventDate: typeof fallbackDrive.postedAt === 'string' ? fallbackDrive.postedAt : new Date(fallbackDrive.postedAt).toISOString(),
                    eventTitle: 'Drive update available',
                    opportunity: fallbackDrive,
                });
            }
        }

        return {
            urgent: {
                walkins: walkins.slice(0, 3),
                deadlines: others.slice(0, 3)
            },
            newlyAdded: newlyAdded.slice(0, 3),
            newSinceLastVisit: newSinceLastVisit.slice(0, 6),
            newSinceLastVisitCount: newSinceLastVisit.length,
            driveMilestones
        };
    }, [cachedItems]);

    useEffect(() => {
        if (!isAnonymous) {
            setString('ff_last_dashboard_visit', Date.now().toString());
        }
    }, [isAnonymous]);

    const refresh = useCallback(async () => {
        setString('ff_last_dashboard_visit', Date.now().toString());
        await performSync(true, true);
    }, [performSync]);

    return {
        highlights,
        recentActivity,
        latestJobs,
        appliedJobs,
        loading: isSyncing,
        refresh
    };
}

