import type { CategoryFeedType } from '@/features/jobs/utils/walkinMapUtils';

export interface TitleFilters {
    type?: CategoryFeedType | string | null;
    workMode?: string[] | string | null;
    location?: string | null;
    skills?: string[] | null;
    sector?: string | null;
    course?: string | null;
    search?: string | null;
    sort?: string | null;
    year?: string | number | null;
}

/**
 * The feed heading.
 *
 * This used to be a dump of every active filter: `ONSITE, Hybrid & Remote Jobs
 * in Bengaluru,Chennai,Hyderabad,Mumbai,Pune`. It leaked a raw Prisma enum,
 * repeated what the chips below already said, and was long enough to be clipped
 * with an ellipsis. A heading describes the result, not the query string:
 *
 *   - one subject, the most meaningful dimension (type, then search, then skill,
 *     then work mode);
 *   - location as a count when it is a list (`Jobs in 5 cities`), never five
 *     comma-joined cities;
 *   - no raw enum, no count glued on, no punctuation to decorate the end.
 *
 * Everything else stays in the chips. Do not grow this back into a filter dump.
 */

function capitalise(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Stored modes are `ONSITE` / `ON_SITE` / `HYBRID` / `REMOTE`. */
function workModeLabel(value: string): string | null {
    const normalised = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (normalised === 'ONSITE' || normalised === 'ON_SITE') return 'On-site';
    if (normalised === 'HYBRID') return 'Hybrid';
    if (normalised === 'REMOTE') return 'Remote';
    return null;
}

const TYPE_HEADING: Partial<Record<string, string>> = {
    INTERNSHIP: 'Internships',
    WALKIN: 'Walk-in drives',
    HACKATHONS: 'Hackathons',
    DRIVES: 'Hiring drives',
    OFF_CAMPUS: 'Off-campus drives',
    FULL_TIME: 'Full-time jobs',
    PART_TIME: 'Part-time jobs',
    GOVERNMENT: 'Government jobs',
    REMOTE: 'Remote jobs',
};

/** Distinct, non-empty cities in a `?location=` value. */
function citiesIn(location: string | null | undefined): string[] {
    if (!location) return [];
    return Array.from(
        new Set(
            location
                .split(',')
                .map((city) => city.trim())
                .filter(Boolean),
        ),
    );
}

export function formatJobFeedTitle(filters: TitleFilters): string {
    const search = filters.search?.trim() ?? '';
    const skills = (filters.skills ?? []).map((skill) => skill.trim()).filter(Boolean);
    const modes = (Array.isArray(filters.workMode) ? filters.workMode : filters.workMode ? [filters.workMode] : [])
        .map(workModeLabel)
        .filter((label): label is string => Boolean(label));
    const cities = citiesIn(filters.location);
    const year = filters.year ? String(filters.year) : '';

    let subject: string;

    if (search) {
        subject = `Results for \u201c${search}\u201d`;
    } else if (skills.length === 1) {
        subject = `${capitalise(skills[0])} jobs`;
    } else if (skills.length > 1) {
        subject = `${capitalise(skills[0])} +${skills.length - 1} jobs`;
    } else if (filters.type && TYPE_HEADING[String(filters.type).toUpperCase()]) {
        subject = TYPE_HEADING[String(filters.type).toUpperCase()]!;
    } else if (modes.length === 1) {
        subject = `${modes[0]} jobs`;
    } else if (filters.course) {
        subject = `${capitalise(filters.course)} jobs`;
    } else if (filters.sort === 'expiring') {
        subject = 'Closing soon jobs';
    } else if (year) {
        subject = `${year} batch jobs`;
    } else {
        subject = 'Jobs';
    }

    if (cities.length === 1) return `${subject} in ${capitalise(cities[0])}`;
    if (cities.length > 1) return `${subject} in ${cities.length} cities`;
    return subject;
}
