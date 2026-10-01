/**
 * Non-UI code for the Career Preferences section: option lists, display labels and the payload.
 *
 * The database stores enums (`WALKIN`, `ONSITE`); people read "Walk-ins" and "On-site". That
 * translation belongs here, once, rather than inline in a component.
 */
import { OPPORTUNITY_TYPES, WORK_MODES } from '@/features/profile/profileConstants';

export const OPPORTUNITY_OPTIONS = OPPORTUNITY_TYPES;
export const WORK_MODE_OPTIONS = WORK_MODES;

const OPPORTUNITY_LABELS: Record<string, string> = {
    JOB: 'Jobs',
    INTERNSHIP: 'Internships',
    WALKIN: 'Walk-ins',
};

/**
 * The one work-mode label map. `ON_SITE` is the spelling older rows and some
 * scraped listings use; both spellings have to render the same, so it lives
 * here rather than being re-declared per surface.
 */
const WORK_MODE_LABELS: Record<string, string> = {
    ONSITE: 'On-site',
    ON_SITE: 'On-site',
    HYBRID: 'Hybrid',
    REMOTE: 'Remote',
};

/** Enum to label, falling back to a title-cased version so a new enum never renders raw. */
export function formatOpportunityType(value: string): string {
    return OPPORTUNITY_LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase();
}

export function formatWorkMode(value: string): string {
    return WORK_MODE_LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase();
}

export function buildPreferencesPayload({
    interestedIn,
    preferredCities,
    workModes,
}: {
    interestedIn: string[];
    preferredCities: string[];
    workModes: string[];
}) {
    return {
        interestedIn: interestedIn.filter(Boolean),
        preferredCities: preferredCities.map((city) => city.trim()).filter(Boolean),
        workModes: workModes.filter(Boolean),
    };
}

/** Add or remove a value from a multi-select list. */
export function toggleValue(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function hasAnyPreference({
    interestedIn,
    preferredCities,
    workModes,
}: {
    interestedIn: string[];
    preferredCities: string[];
    workModes: string[];
}): boolean {
    return interestedIn.length > 0 || preferredCities.length > 0 || workModes.length > 0;
}
