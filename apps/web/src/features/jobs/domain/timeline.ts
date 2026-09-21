import type { Opportunity } from '@fresherflow/types';

export type ListingState = 'EXPIRED' | 'CLOSING_SOON' | 'ACTIVE' | 'INACTIVE';

export type TimelineEventView = NonNullable<Opportunity['events']>[number] & { _dt: Date };

export function getListingState(opportunity: Opportunity): ListingState {
    if (opportunity.status && opportunity.status !== 'PUBLISHED') return 'INACTIVE';
    if (isExpired(opportunity)) return 'EXPIRED';
    if (isClosingSoon(opportunity)) return 'CLOSING_SOON';
    return 'ACTIVE';
}

export function formatDeadline(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return null;
    return new Date(opportunity.expiresAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function sortTimelineEvents(events: Opportunity['events'] = []): TimelineEventView[] {
    return (events || [])
        .map((event): TimelineEventView => ({ ...event, _dt: new Date(event.eventDate) }))
        .sort((a, b) => a._dt.getTime() - b._dt.getTime());
}

export function formatLpaValue(value: string) {
    return /\bLPA\b/i.test(value) ? value : `${value} LPA`;
}

export function formatTimeText12Hour(value?: string | null) {
    if (!value) return 'Not specified';
    return value;
}

export function isExpired(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return false;
    return new Date(opportunity.expiresAt) < new Date();
}

export function isClosingSoon(opportunity: Opportunity) {
    if (!opportunity.expiresAt) return false;
    const expiryDate = new Date(opportunity.expiresAt);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return expiryDate >= now && expiryDate <= threeDaysFromNow;
}
