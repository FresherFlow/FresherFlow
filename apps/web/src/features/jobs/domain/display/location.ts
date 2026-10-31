import { normalizeLocationLabels } from '@fresherflow/utils';

export interface ParsedOpportunityLocation {
    shortLabel: string;
    fullLabel: string;
    city?: string;
    state?: string;
    country?: string;
    cities: string[];
    isRemote: boolean;
}

const remoteLocation = (): ParsedOpportunityLocation => ({
    shortLabel: 'Remote',
    fullLabel: 'Remote',
    cities: [],
    isRemote: true,
});

export const parseOpportunityLocation = (locations?: string[] | null): ParsedOpportunityLocation => {
    const normalized = normalizeLocationLabels(locations).filter((entry) => entry.label);
    if (normalized.length === 0) return remoteLocation();
    if (normalized.some((entry) => entry.isRemote)) return remoteLocation();

    const labels = normalized.map((entry) => entry.label);
    const primary = normalized[0];

    let shortLabel: string;
    if (labels.length === 1) {
        shortLabel = labels[0];
    } else if (labels.length === 2) {
        shortLabel = labels.join(', ');
    } else {
        shortLabel = `${labels[0]} +${labels.length - 1}`;
    }

    return {
        shortLabel,
        fullLabel: labels.join(', '),
        city: primary.city,
        state: primary.state,
        country: primary.country,
        cities: labels,
        isRemote: false,
    };
};

/**
 * The location chips a detail page renders, each a `City, State` run.
 *
 * Delegates to the shared normalizer so the hero, chips, cards and SEO labels
 * all read the same canonical names.
 */
export function getGroupedLocations(locations?: string[] | null): string[] {
    const normalized = normalizeLocationLabels(locations).filter((entry) => entry.label);
    if (normalized.length === 0) return [];
    if (normalized.some((entry) => entry.isRemote)) return ['Remote'];
    return normalized.map((entry) => entry.label);
}
