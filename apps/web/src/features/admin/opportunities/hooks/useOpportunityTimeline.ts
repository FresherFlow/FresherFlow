'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api/admin';
import type { TimelineEvent } from '@/features/admin/opportunities/formUtils';

const toLocalISOString = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localTime = new Date(date.getTime() - tzOffset);
    return localTime.toISOString().slice(0, 16);
};

export function useOpportunityTimeline(opportunityId?: string, enabled = true) {
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineBusyId, setTimelineBusyId] = useState<string | null>(null);
    const [newEventType, setNewEventType] = useState<TimelineEvent['eventType']>('OTHER');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventNotes, setNewEventNotes] = useState('');
    const [newEventSourceLink, setNewEventSourceLink] = useState('');

    const loadTimelineEvents = useCallback(async () => {
        if (!opportunityId) return;
        setTimelineLoading(true);
        try {
            const response = await adminApi.getOpportunityEvents(opportunityId) as { events: TimelineEvent[] };
            setTimelineEvents((response.events || []).map((event) => ({
                ...event,
                eventDate: event.eventDate ? toLocalISOString(event.eventDate) : '',
            })));
        } catch {
            toast.error('Could not load timeline events.');
        } finally {
            setTimelineLoading(false);
        }
    }, [opportunityId]);

    useEffect(() => {
        if (!enabled || !opportunityId) return;
        void loadTimelineEvents();
    }, [enabled, loadTimelineEvents, opportunityId]);

    const handleCreateTimelineEvent = useCallback(async () => {
        if (!opportunityId) return;
        if (!newEventTitle.trim() || !newEventDate) {
            toast.error('Event title and date are required.');
            return;
        }

        try {
            setTimelineBusyId('new');
            await adminApi.createOpportunityEvent(opportunityId, {
                eventType: newEventType,
                eventDate: new Date(newEventDate).toISOString(),
                title: newEventTitle.trim(),
                notes: newEventNotes.trim() || undefined,
                sourceLink: newEventSourceLink.trim() || undefined,
            });
            setNewEventTitle('');
            setNewEventDate('');
            setNewEventNotes('');
            setNewEventSourceLink('');
            setNewEventType('OTHER');
            await loadTimelineEvents();
            toast.success('Timeline event added.');
        } catch {
            toast.error('Failed to add timeline event.');
        } finally {
            setTimelineBusyId(null);
        }
    }, [loadTimelineEvents, newEventDate, newEventNotes, newEventSourceLink, newEventTitle, newEventType, opportunityId]);

    const handleUpdateTimelineEvent = useCallback(async (event: TimelineEvent) => {
        if (!opportunityId || !event.id) return;
        if (!event.title.trim() || !event.eventDate) {
            toast.error('Event title and date are required.');
            return;
        }
        try {
            setTimelineBusyId(event.id);
            await adminApi.updateOpportunityEvent(opportunityId, event.id, {
                eventType: event.eventType,
                eventDate: new Date(event.eventDate).toISOString(),
                title: event.title.trim(),
                notes: event.notes?.trim() || undefined,
                sourceLink: event.sourceLink?.trim() || undefined,
            });
            toast.success('Event updated.');
        } catch {
            toast.error('Failed to update event.');
        } finally {
            setTimelineBusyId(null);
        }
    }, [opportunityId]);

    const handleDeleteTimelineEvent = useCallback(async (eventId: string) => {
        if (!opportunityId || !eventId) return;
        try {
            setTimelineBusyId(eventId);
            await adminApi.deleteOpportunityEvent(opportunityId, eventId);
            setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId));
            toast.success('Event removed.');
        } catch {
            toast.error('Failed to remove event.');
        } finally {
            setTimelineBusyId(null);
        }
    }, [opportunityId]);

    return {
        timelineEvents,
        setTimelineEvents,
        timelineLoading,
        timelineBusyId,
        newEventType,
        setNewEventType,
        newEventDate,
        setNewEventDate,
        newEventTitle,
        setNewEventTitle,
        newEventNotes,
        setNewEventNotes,
        newEventSourceLink,
        setNewEventSourceLink,
        loadTimelineEvents,
        handleCreateTimelineEvent,
        handleUpdateTimelineEvent,
        handleDeleteTimelineEvent,
    };
}





