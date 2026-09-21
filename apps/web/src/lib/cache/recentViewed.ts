import type { Opportunity } from '@fresherflow/types';

const RECENT_VIEWED_KEY = 'ff_recent_viewed_opportunities_v1';
const MAX_ITEMS = 12;

type StoredOpportunity = {
    id: string;
    slug?: string | null;
    title?: string;
    company?: string;
    viewedAt: number;
    data: Opportunity;
};

function readRaw(): StoredOpportunity[] {
    if (typeof window === 'undefined') return [];
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_VIEWED_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeRaw(items: StoredOpportunity[]) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(RECENT_VIEWED_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch {
        // Ignore storage quota or privacy mode errors.
    }
}

export function saveRecentViewed(opportunity: Opportunity) {
    const current = readRaw();
    const filtered = current.filter(
        (item) => item.id !== opportunity.id && item.slug !== opportunity.slug
    );
    const next: StoredOpportunity = {
        id: opportunity.id,
        slug: opportunity.slug,
        title: opportunity.title,
        company: opportunity.company,
        viewedAt: Date.now(),
        data: opportunity,
    };
    writeRaw([next, ...filtered]);
}

export function getRecentViewedCount(): number {
    return readRaw().length;
}

export function getRecentViewedByIdOrSlug(idOrSlug: string): Opportunity | null {
    const items = readRaw();
    const found = items.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
    return found?.data || null;
}

