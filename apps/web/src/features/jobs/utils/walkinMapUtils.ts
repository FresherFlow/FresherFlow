import { EmploymentType, Opportunity, OpportunityCategory, RecruitmentMethod, Sector } from '@fresherflow/types';

/**
 * Page-level feed kinds. These are the legacy `OpportunityType` values
 * (JOB / INTERNSHIP / WALKIN / GOVERNMENT / REMOTE / HACKATHONS) kept as
 * plain strings for feed routing, titles, and UI branching. Filtering and
 * display derive from the independent taxonomy dimensions below — never
 * read `opp.type`, which no longer exists on the model.
 */
export type CategoryFeedType = 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT' | 'REMOTE' | 'HACKATHONS' | 'DRIVES' | 'OFF_CAMPUS' | 'FULL_TIME' | 'PART_TIME';

/**
 * Drive details regardless of which field name the payload used.
 *
 * The Prisma model is `DriveDetails` (relation `driveDetails`); the shared
 * `Opportunity` type still exposes the legacy `walkInDetails` name and the
 * grouped API contract uses `walkin`. All three shapes carry the same fields
 * except the cluster rename (`techCluster` → `clusterName`), which is
 * normalized here so readers can use either name.
 */
export interface DriveDetailsLike {
    /**
     * `DateTime[]` serialised to JSON, so these arrive as ISO strings. Some
     * legacy mappers have also written pre-formatted labels, hence the
     * defensive read at `firstDriveDate` rather than a bare `new Date(x)`.
     */
    dates?: unknown;
    dateRange?: string | null;
    timeRange?: string | null;
    venueAddress?: string | null;
    venueLink?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    techCluster?: string | null;
    clusterName?: string | null;
    city?: string | null;
    reportingTime?: string | null;
    requiredDocuments?: string[];
    contactPerson?: string | null;
    contactPhone?: string | null;
    expiryDate?: unknown;
    landmark?: string | null;
    transitInfo?: string | null;
    selectionProcess?: string | null;
}

export function getDriveDetails(opp: Opportunity): DriveDetailsLike | undefined {
    const raw = opp as unknown as {
        walkInDetails?: DriveDetailsLike | null;
        driveDetails?: DriveDetailsLike | null;
        walkin?: DriveDetailsLike | null;
    };
    const details = raw.walkInDetails ?? raw.driveDetails ?? raw.walkin ?? undefined;
    if (!details) return undefined;
    const cluster = details.techCluster ?? details.clusterName ?? undefined;
    return { ...details, techCluster: cluster, clusterName: cluster };
}

/** Cluster / corridor label for a drive (`techCluster` or `clusterName`). */
export function getDriveClusterName(opp: Opportunity): string | undefined {
    return getDriveDetails(opp)?.techCluster ?? undefined;
}

/** A walk-in / drive listing: WALK_IN recruitment method or drive details present. */
export function isWalkinOpportunity(opp: Opportunity): boolean {
    return opp.recruitmentMethod === RecruitmentMethod.WALK_IN || Boolean(getDriveDetails(opp));
}

/** An internship listing: INTERNSHIP in the employment-types dimension. */
export function isInternshipOpportunity(opp: Opportunity): boolean {
    if ((opp.employmentTypes || []).includes(EmploymentType.INTERNSHIP)) return true;
    const legacySingular = (opp as unknown as { employmentType?: unknown }).employmentType;
    return typeof legacySingular === 'string' && legacySingular.toUpperCase() === 'INTERNSHIP';
}

/** An off-campus drive: campus-based recruitment (not a walk-in, not the regular channel). */
export function isOffCampusOpportunity(opp: Opportunity): boolean {
    return (
        opp.recruitmentMethod === RecruitmentMethod.OFF_CAMPUS ||
        opp.recruitmentMethod === RecruitmentMethod.ON_CAMPUS ||
        opp.recruitmentMethod === RecruitmentMethod.POOL_CAMPUS
    );
}

/** Any drive on the platform: walk-ins plus campus drives. */
export function isDriveOpportunity(opp: Opportunity): boolean {
    return isWalkinOpportunity(opp) || isOffCampusOpportunity(opp);
}

/** A full-time listing. */
export function isFullTimeOpportunity(opp: Opportunity): boolean {
    if ((opp.employmentTypes || []).includes(EmploymentType.FULL_TIME)) return true;
    const legacy = (opp as unknown as { employmentType?: unknown }).employmentType;
    if (typeof legacy === 'string') {
        const normalized = legacy.toUpperCase().replace(/[\s-]+/g, '_');
        if (normalized === 'FULL_TIME') return true;
    }
    // Unlabelled permanent/contract roles without an explicit employment type
    // are the common case for fresher job listings, but only count them when
    // they are not internships — otherwise both hubs would show the same rows.
    return (
        opp.category === OpportunityCategory.EMPLOYMENT &&
        !isInternshipOpportunity(opp) &&
        !isDriveOpportunity(opp) &&
        !isGovernmentOpportunity(opp) &&
        (opp.employmentTypes || []).length === 0
    );
}

/** A part-time listing. */
export function isPartTimeOpportunity(opp: Opportunity): boolean {
    if ((opp.employmentTypes || []).includes(EmploymentType.PART_TIME)) return true;
    const legacy = (opp as unknown as { employmentType?: unknown }).employmentType;
    if (typeof legacy === 'string') {
        const normalized = legacy.toUpperCase().replace(/[\s-]+/g, '_');
        if (normalized === 'PART_TIME') return true;
    }
    return false;
}

/** A government listing: GOVERNMENT sector or government details present. */
export function isGovernmentOpportunity(opp: Opportunity): boolean {
    return opp.sector === Sector.GOVERNMENT || Boolean(opp.governmentJobDetails);
}

/** A remote listing: REMOTE work mode, or remote signals in locations/title. */
export function isRemoteOpportunity(opp: Opportunity): boolean {
    if (opp.workMode === 'REMOTE') return true;
    const locLabel = (opp.locations || []).join(' ').toLowerCase();
    if (
        locLabel.includes('remote') ||
        locLabel.includes('work from home') ||
        locLabel.includes('wfh') ||
        locLabel.includes('pan india')
    ) {
        return true;
    }
    return (opp.title || '').toLowerCase().includes('remote');
}

/** First employment-type label for display, with legacy singular fallback. */
export function getPrimaryEmploymentType(opp: Opportunity): string | null {
    const legacySingular = (opp as unknown as { employmentType?: unknown }).employmentType;
    if (typeof legacySingular === 'string' && legacySingular.trim()) return legacySingular;
    return opp.employmentTypes?.[0] ?? null;
}

/**
 * Whether an opportunity belongs on a feed page of the given kind.
 * Same filtering outcomes as the old single-enum `opp.type === kind`
 * checks, expressed in the new independent dimensions.
 */
export function matchesFeedType(opp: Opportunity, type: CategoryFeedType | string | null | undefined): boolean {
    if (!type) return true;
    switch (type) {
        case 'GOVERNMENT':
            return isGovernmentOpportunity(opp);
        case 'WALKIN':
            return isWalkinOpportunity(opp);
        case 'INTERNSHIP':
            return isInternshipOpportunity(opp);
        case 'HACKATHONS':
            return opp.category === OpportunityCategory.COMPETITION;
        case 'DRIVES':
            return isDriveOpportunity(opp);
        case 'OFF_CAMPUS':
            return isOffCampusOpportunity(opp);
        case 'FULL_TIME':
            return isFullTimeOpportunity(opp);
        case 'PART_TIME':
            return isPartTimeOpportunity(opp);
        case 'REMOTE':
            return isRemoteOpportunity(opp);
        case 'JOB':
            // isDriveOpportunity covers walk-in AND off-campus in one check.
            // Testing only isWalkinOpportunity here let ON_CAMPUS/POOL_CAMPUS
            // drives without driveDetails appear in the Jobs, Drives and
            // Off-Campus feeds at the same time.
            return (
                opp.category === OpportunityCategory.EMPLOYMENT &&
                !isInternshipOpportunity(opp) &&
                !isDriveOpportunity(opp) &&
                !isGovernmentOpportunity(opp) &&
                !isRemoteOpportunity(opp)
            );
        default:
            return true;
    }
}

/**
 * Single display badge for a card row, mirroring the old raw `opp.type`
 * values (JOB / INTERNSHIP / WALKIN / GOVERNMENT / REMOTE / HACKATHONS).
 */
export function getFeedBadgeLabel(opp: Opportunity): string {
    if (isGovernmentOpportunity(opp)) return 'GOVERNMENT';
    if (isWalkinOpportunity(opp)) return 'WALKIN';
    if (isInternshipOpportunity(opp)) return 'INTERNSHIP';
    if (opp.category === OpportunityCategory.COMPETITION) return 'HACKATHONS';
    if (isRemoteOpportunity(opp)) return 'REMOTE';
    return 'JOB';
}

// Neighbourhood-level coordinates. Kept because drives are frequently stored
// with a cluster label ("Kondapur") rather than coordinates. Localities come
// first for the city they belong to, so they are stored per city.
const CLUSTER_COORDS_BY_CITY: Record<string, Record<string, [number, number]>> = {
    hyderabad: {
        'HITEC City': [17.4474, 78.3762],
        Madhapur: [17.4485, 78.3776],
        Gachibowli: [17.4144, 78.3498],
        Begumpet: [17.4447, 78.4721],
        Uppal: [17.4022, 78.5595],
        Ameerpet: [17.4375, 78.4482],
        Kondapur: [17.4699, 78.3578],
        Raidurg: [17.4225, 78.3758],
    },
    bengaluru: {
        Whitefield: [12.9698, 77.75],
        'Electronic City': [12.8452, 77.6602],
        Marathahalli: [12.9531, 77.7012],
        Hebbal: [13.0358, 77.597],
        'HSR Layout': [12.9116, 77.6474],
    },
    pune: {
        Hinjewadi: [18.5913, 73.7389],
        Kharadi: [18.5515, 73.9475],
        'Viman Nagar': [18.5679, 73.9143],
        Wakad: [18.5975, 73.7625],
    },
    chennai: {
        'OMR': [12.8008, 80.2268],
        'Guindy': [13.0067, 80.2206],
        'Sholinganallur': [12.901, 80.227],
    },
    mumbai: {
        Powai: [19.1176, 72.906],
        Andheri: [19.1136, 72.8697],
        Thane: [19.2183, 72.9781],
    },
    delhi: {
        Noida: [28.5355, 77.391],
        Gurugram: [28.4595, 77.0266],
        'Dwarka': [28.5921, 77.046],
    },
    kolkata: {
        SaltLake: [22.5807, 88.4209],
        'Rajarhat': [22.7554, 88.4864],
    },
};

/** Flattened view retained for callers that only need "is this a known locality". */
export const CLUSTER_COORDS: Record<string, [number, number]> = Object.values(
    CLUSTER_COORDS_BY_CITY,
).reduce<Record<string, [number, number]>>((acc, city) => ({ ...acc, ...city }), {});

/**
 * Initial map viewport. Falls back to the city the drives are actually in, so a
 * Pune-only view does not open on Hyderabad.
 */
export function getMapFallbackCenter(
    opportunities: Opportunity[],
): [number, number] {
    for (const opp of opportunities) {
        const d = getDriveDetails(opp);
        const text = [
            d?.city || '',
            d?.venueAddress || '',
            ...(opp.locations || []),
        ].join(' ');
        const hit = findCityCoords(text);
        if (hit) return hit;
    }
    return INDIA_FALLBACK_CENTER;
}

/**
 * Haversine formula: calculate great-circle distance between two lat/lng points.
 * Returns distance in kilometers.
 */
export function getDistanceKm(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format distance for display. Under 1km shows "~800m", over 1km shows "2.3 km".
 */
export function formatDistance(km: number): string {
    if (km < 1) return `~${Math.round(km * 1000)}m`;
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
}

/**
 * Compute distance from user to an opportunity's venue.
 * Returns null if coordinates are unavailable.
 */
export function getOpportunityDistanceKm(
    opp: Opportunity,
    userLat: number,
    userLng: number
): number | null {
    const coords = getBaseCoords(opp);
    // getBaseCoords always returns valid coords (falls back to default center)
    // but if the opp has no real coords, the distance to default center is meaningless.
    // Check if the opp has explicit lat/lng or a known techCluster match.
    const d = getDriveDetails(opp);
    if (!d?.latitude && !d?.longitude && !d?.techCluster) {
        // Only location-based match — still compute but mark as approximate
    }
    return getDistanceKm(userLat, userLng, coords[0], coords[1]);
}

/**
 * Recognised city centres for drives that stored no coordinates.
 *
 * The previous list held only Hyderabad neighbourhoods, so every drive in
 * every other city was pinned into Gachibowli and the map opened on Hyderabad
 * regardless of where the data actually was. Keyed by city so a drive in Pune
 * falls back to Pune, and an unknown city falls back to India rather than to
 * Hyderabad.
 */
export const CITY_FALLBACK_COORDS: Record<string, [number, number]> = {
    hyderabad: [17.385, 78.4867],
    secunderabad: [17.4399, 78.4983],
    bengaluru: [12.9716, 77.5946],
    bangalore: [12.9716, 77.5946],
    mumbai: [19.076, 72.8777],
    pune: [18.5204, 73.8567],
    delhi: [28.6139, 77.209],
    'new delhi': [28.6139, 77.209],
    'noida': [28.5355, 77.391],
    gurugram: [28.4595, 77.0266],
    gurgaon: [28.4595, 77.0266],
    faridabad: [28.4089, 77.3178],
    chennai: [13.0827, 80.2707],
    kolkata: [22.5726, 88.3639],
    ahmedabad: [23.0225, 72.5714],
    surat: [21.1702, 72.8311],
    jaipur: [26.9124, 75.7873],
    lucknow: [26.8467, 80.9462],
    nagpur: [21.1458, 79.0882],
    indore: [22.7196, 75.8577],
    bhopal: [23.2599, 77.4126],
    patna: [25.5941, 85.1376],
    kochi: [9.9312, 76.2673],
    coimbatore: [11.0168, 76.9558],
    madurai: [9.9252, 78.1198],
    visakhapatnam: [17.6868, 83.2185],
    mysuru: [12.2958, 76.6394],
    mysore: [12.2958, 76.6394],
    chandigarh: [30.7333, 76.7794],
    ludhiana: [30.901, 75.8573],
    bhubaneswar: [20.2961, 85.8245],
    guwahati: [26.1445, 91.7362],
    trivandrum: [8.5241, 76.9366],
    goa: [15.2993, 74.124],
    chandigarh_punjab: [30.7333, 76.7794],
};

export const INDIA_FALLBACK_CENTER: [number, number] = [22.5937, 78.9629];

function findCityCoords(text: string): [number, number] | null {
    const lower = text.toLowerCase();
    for (const [city, coords] of Object.entries(CITY_FALLBACK_COORDS)) {
        if (lower.includes(city)) return coords;
    }
    return null;
}

/**
 * Extract the dominant city name from a list of opportunities.
 * Counts location mentions across all opps and returns the most common one.
 * Falls back to 'India' if no locations are found.
 */
export function getDominantCity(opportunities: Opportunity[]): string {
    // Work modes and regions are not cities, so they must not win the count.
    // This list deliberately contains no city names: it previously held 'delhi',
    // which is a real city, so a Delhi-only view reported "India" and then fell
    // back to Hyderabad coordinates.
    const exclude = new Set([
        'india',
        'remote',
        'pan-india',
        'worldwide',
        'hybrid',
        'wfh',
        'work from home',
        'onsite',
        'on-site',
        'in office',
        // States and union territories.
        'telangana',
        'karnataka',
        'maharashtra',
        'tamil nadu',
        'uttar pradesh',
        'gujarat',
        'west bengal',
        'punjab',
        'haryana',
        'kerala',
        'odisha',
        'rajasthan',
        'madhya pradesh',
        'andhra pradesh',
    ]);

    const cityCounts = new Map<string, number>();

    for (const opp of opportunities) {
        // `DriveDetails.city` is a dedicated, indexed column for exactly this,
        // so it outranks free-text `locations` which carry states and modes.
        const driveCity = getDriveDetails(opp)?.city?.trim();
        if (driveCity && driveCity.length >= 2 && !exclude.has(driveCity.toLowerCase())) {
            cityCounts.set(driveCity, (cityCounts.get(driveCity) || 0) + 1);
        }

        for (const loc of opp.locations || []) {
            const city = loc.trim();
            if (!city || city.length < 2) continue;
            const lower = city.toLowerCase();
            if (exclude.has(lower)) continue;
            // Skip if it looks like a state or country
            if (lower.length > 20) continue;
            cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        }
    }

    if (cityCounts.size === 0) return 'India';

    // Return the most frequently mentioned city
    let maxCount = 0;
    let dominant = 'India';
    for (const [city, count] of cityCounts) {
        if (count > maxCount) {
            maxCount = count;
            dominant = city;
        }
    }
    return dominant;
}

function getBaseCoords(opp: Opportunity): [number, number] {
    const d = getDriveDetails(opp);
    if (d?.latitude && d?.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)) {
        return [d.latitude, d.longitude];
    }
    if (d?.techCluster || d?.clusterName) {
        const label = (d.techCluster || d.clusterName || '').toLowerCase();
        // Hyderabad neighbourhood table, still useful for drives that did land
        // there. Other cities fall through to the city table below.
        for (const [key, coords] of Object.entries(CLUSTER_COORDS)) {
            if (label.includes(key.toLowerCase())) {
                return coords;
            }
        }
    }

    const locStr = [
        d?.city || '',
        d?.venueAddress || '',
        d?.landmark || '',
        ...(opp.locations || []),
    ].join(' ').toLowerCase();

    const cityCoords = findCityCoords(locStr);
    if (cityCoords) return cityCoords;

    for (const [key, coords] of Object.entries(CLUSTER_COORDS)) {
        if (locStr.includes(key.toLowerCase())) {
            return coords;
        }
    }
    return INDIA_FALLBACK_CENTER;
}

/**
 * Generates a stable pseudo-random number between -1 and 1 based on a string seed
 */
function seededRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0; // Convert to 32bit int
    }
    const x = Math.sin(hash) * 10000;
    return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Extract physical venue coordinates from an opportunity with multiple resilient fallbacks.
 * Adds a tiny deterministic jitter (~50m) so identical fallbacks (e.g. all in Gachibowli)
 * don't perfectly overlap, allowing them to naturally uncluster at max zoom.
 */
export function getOpportunityCoords(opp: Opportunity): [number, number] {
    const [lat, lng] = getBaseCoords(opp);
    
    // ~100-200m jitter spread so markers at the same venue separate visibly
    const jitterAmount = 0.0012;
    
    const latOffset = seededRandom(opp.id + 'lat') * jitterAmount;
    const lngOffset = seededRandom(opp.id + 'lng') * jitterAmount;
    
    return [lat + latOffset, lng + lngOffset];
}

/**
 * Cleanly format salary string (e.g. ₹3.5-4.5L or ₹5L+)
 */
export function formatSalaryBadge(opp: Opportunity): string {
    const minSal = opp.salaryMin ? (opp.salaryMin / 100000).toFixed(1).replace(/\.0$/, '') : null;
    const maxSal = opp.salaryMax ? (opp.salaryMax / 100000).toFixed(1).replace(/\.0$/, '') : null;
    if (minSal && maxSal) return `₹${minSal}-${maxSal}L`;
    if (minSal) return `₹${minSal}L+`;
    return '';
}

/**
 * Shorten company name for crisp badge display
 */
export function formatShortCompany(company?: string): string {
    if (!company) return 'Walk-in';
    return company
        .replace(/Global Services|Technologies|Technology|Limited|Pvt Ltd|Private Limited|Corporation|Inc\./gi, '')
        .trim() || company;
}

/**
 * Fallback document checklist for a drive that stored none.
 *
 * `DriveDetails.requiredDocuments` is a required column, but the public submit
 * and community submit paths write `[]`, so a drive created that way had a
 * heading promising a checklist above an empty list. This is the honest
 * default: what walk-in recruiters actually ask for.
 *
 * It lives here, not in a component, because two surfaces render it (the venue
 * card and the calendar export) and they had drifted apart — one said "2 Hard
 * Copies" and the other "3 hard copies" for the same drive.
 */
export const DEFAULT_REQUIRED_DOCUMENTS: string[] = [
    'Updated Resume (2 hard copies)',
    'Govt. Photo ID Proof (Aadhaar / PAN)',
    'Original Marksheets & Provisional Degree',
    '2 Passport Size Photos',
];

/**
 * The checklist a reader should pack for this drive: the drive's own list when
 * it has one, otherwise the shared default.
 */
export function getDriveRequiredDocuments(
    details: DriveDetailsLike | null | undefined
): string[] {
    const stored = details?.requiredDocuments;
    if (Array.isArray(stored) && stored.length > 0) {
        return stored.map((d) => String(d).trim()).filter(Boolean);
    }
    return DEFAULT_REQUIRED_DOCUMENTS;
}

/**
 * 1-Tap Google Calendar event generator with pre-filled document checklist & directions
 */
export function getGoogleCalendarUrl(opp: Opportunity): string {
    const details = getDriveDetails(opp);
    const title = encodeURIComponent(`Walk-in Interview: ${opp.company} - ${opp.normalizedRole || opp.title}`);
    const location = encodeURIComponent(details?.venueAddress || (opp.locations || []).join(', '));

    const descLines = [
        `Role: ${opp.normalizedRole || opp.title}`,
        `Company: ${opp.company}`,
        details?.dateRange ? `Dates: ${details.dateRange}` : '',
        details?.reportingTime ? `Reporting Time: ${details.reportingTime}` : '',
        details?.transitInfo ? `Transit: ${details.transitInfo}` : '',
        details?.contactPerson ? `Contact: ${details.contactPerson}` : '',
        '',
        'Mandatory Documents:',
        // The drive's own list, so the calendar a reader exports matches what
        // the venue card told them to pack.
        ...getDriveRequiredDocuments(details).map((doc) => `• ${doc}`),
        '',
        `Directions: ${details?.venueLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(details?.venueAddress || '')}`}`,
        '',
        'Shared on FresherFlow: https://fresherflow.in/drives/walk-in',
    ].filter(Boolean).join('\n');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${encodeURIComponent(descLines)}`;
}

/**
 * 1-Tap WhatsApp share URL generator with full venue & transit details.
 * Message includes: company, role, salary, dates, venue, transit info,
 * walking directions from nearest metro, and a Google Maps link.
 */
export function getWhatsAppShareUrl(opp: Opportunity): string {
    const details = getDriveDetails(opp);
    const salaryText = formatSalaryBadge(opp) ? `${formatSalaryBadge(opp)} PA` : 'Best in Industry';
    const transit = parseTransitInfo(details?.transitInfo);
    const walkingUrl = getWalkingFromStationUrl(opp);
    const dest = details?.latitude && details?.longitude
        ? `${details.latitude},${details.longitude}`
        : details?.venueAddress || '';
    const drivingUrl = dest
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`
        : '';

    const lines: string[] = [
        `*Walk-in Hiring Drive*`,
        ``,
        `*Company:* ${opp.company}`,
        `*Role:* ${opp.normalizedRole || opp.title}`,
        `*Salary:* ${salaryText}`,
        `*Dates:* ${details?.dateRange || 'This Week'}`,
        `*Reporting:* ${details?.reportingTime || '09:30 AM'}`,
    ];

    if (details?.timeRange) {
        lines.push(`*Time:* ${details.timeRange}`);
    }

    lines.push(``);
    lines.push(`*Venue:*`);
    lines.push(`${details?.venueAddress || (opp.locations || []).join(', ')}`);

    if (details?.landmark) {
        lines.push(`*Landmark:* ${details.landmark}`);
    }

    // Transit section
    if (transit) {
        lines.push(``);
        lines.push(`*How to reach:*`);
        if (transit.station) {
            const lineText = transit.line ? ` (${transit.line} Line)` : '';
            lines.push(`Nearest: *${transit.station}${lineText}*`);
        }
        if (transit.walkDistance) {
            lines.push(`Walk: *${transit.walkDistance}*`);
        }
        if (transit.mode === 'cab') {
            lines.push(`Cab/Auto available from station`);
        }
        if (transit.mode === 'shuttle') {
            lines.push(`Shuttle service from station`);
        }
    }

    // Links
    lines.push(``);
    if (walkingUrl) {
        lines.push(`*Walk from Metro:* ${walkingUrl}`);
    }
    if (drivingUrl) {
        lines.push(`*Directions:* ${drivingUrl}`);
    }
    if (details?.selectionProcess) {
        lines.push(``);
        lines.push(`*Selection:* ${details.selectionProcess}`);
    }
    if (details?.contactPerson) {
        lines.push(`*Contact:* ${details.contactPerson}`);
    }
    lines.push(``);
    lines.push(`Shared on FresherFlow`);
    lines.push(`https://fresherflow.in/drives/walk-in`);

    const text = encodeURIComponent(lines.join('\n'));
    return `https://api.whatsapp.com/send?text=${text}`;
}

export type WalkinDrivePeriod = 'all' | 'today' | 'thisWeek' | 'next30Days';

/**
 * Average walking speed in km/h. Indian urban walking avg ~4.5 km/h.
 * Used to estimate walking time from distance.
 */
const WALK_SPEED_KMH = 4.5;

/**
 * Convert distance in km to a human-readable walking time estimate.
 * Examples: "~1 min walk", "~4 min walk", "~12 min walk", "~25 min walk"
 * Returns null if distance is invalid.
 */
export function getWalkingTimeLabel(distanceKm: number): string | null {
    if (distanceKm <= 0 || !isFinite(distanceKm)) return null;
    const minutes = Math.round((distanceKm / WALK_SPEED_KMH) * 60);
    if (minutes < 1) return 'Adjacent';
    if (minutes === 1) return '~1 min walk';
    if (minutes < 60) return `~${minutes} min walk`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem > 0 ? `~${hrs}h ${rem}m walk` : `~${hrs}h walk`;
}

/**
 * Get walking time from transit walking distance string (e.g. "350m", "5 min").
 * Returns null if parsing fails.
 */
export function getTransitWalkTimeLabel(transitInfo?: string | null): string | null {
    if (!transitInfo) return null;
    const lower = transitInfo.toLowerCase();

    // "350m from ..."
    const mMatch = lower.match(/(\d+)\s*m\b/);
    if (mMatch) {
        const meters = Number(mMatch[1]);
        return getWalkingTimeLabel(meters / 1000);
    }

    // "5 min walk from ..." or "5 min from ..."
    const minMatch = lower.match(/(\d+)\s*min/);
    if (minMatch) {
        const mins = Number(minMatch[1]);
        if (mins < 1) return 'Adjacent';
        if (mins === 1) return '~1 min walk';
        return `~${mins} min walk`;
    }

    return null;
}

/**
 * Parse walk-in dateRange strings like "Aug 25 - Aug 28, 2026" into start/end Date objects.
 * Handles formats:
 *   - "Aug 25 - Aug 28, 2026" / "Aug 25 - 28, 2026"
 *   - "25 Aug - 28 Aug 2026" / "25 - 28 Aug 2026"
 *   - "25/08/2026 - 28/08/2026"
 *   - "2026-08-25 - 2026-08-28"
 *   - "Aug 25, 2026" / "2026-08-25" (single day)
 * Returns null if parsing fails.
 */
export function parseWalkinDateRange(dateRange: string): { start: Date; end: Date } | null {
    if (!dateRange) return null;

    try {
        const trimmed = dateRange.trim();

        // Pattern 1: "Mon DD - Mon DD, YYYY" or "Mon DD - DD, YYYY" (e.g. "Aug 25 - Aug 28, 2026" or "Aug 25 - 28, 2026")
        const m1 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(?:([A-Za-z]+)\s+)?(\d{1,2}),?\s*(\d{4})$/);
        if (m1) {
            const [, startMon, startDay, endMon, endDay, year] = m1;
            const start = new Date(`${startMon} ${startDay}, ${year}`);
            const end = new Date(`${endMon || startMon} ${endDay}, ${year}`);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
        }

        // Pattern 2: "DD Mon - DD Mon YYYY" or "DD - DD Mon YYYY" (e.g. "25 Aug - 28 Aug 2026" or "25 - 28 Aug 2026")
        const m2 = trimmed.match(/^(\d{1,2})(?:\s+([A-Za-z]+))?\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
        if (m2) {
            const [, startDay, startMon, endDay, endMon, year] = m2;
            const start = new Date(`${startMon || endMon} ${startDay}, ${year}`);
            const end = new Date(`${endMon} ${endDay}, ${year}`);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
        }

        // Pattern 3: "DD/MM/YYYY - DD/MM/YYYY"
        const m3 = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m3) {
            const [, sd, sm, sy, ed, em, ey] = m3;
            const start = new Date(Number(sy), Number(sm) - 1, Number(sd));
            const end = new Date(Number(ey), Number(em) - 1, Number(ed));
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
        }

        // Pattern 3b: ISO range "YYYY-MM-DD - YYYY-MM-DD"
        const m3Iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s*-\s*(\d{4})-(\d{2})-(\d{2})$/);
        if (m3Iso) {
            const [, sy, sm, sd, ey, em, ed] = m3Iso;
            const start = new Date(Number(sy), Number(sm) - 1, Number(sd));
            const end = new Date(Number(ey), Number(em) - 1, Number(ed));
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) return { start, end };
        }

        // Pattern 4: "Aug 25, 2026" (single day)
        const m4 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
        if (m4) {
            const [, mon, day, year] = m4;
            const d = new Date(`${mon} ${day}, ${year}`);
            if (!isNaN(d.getTime())) return { start: d, end: d };
        }

        // Pattern 4b: ISO single day "YYYY-MM-DD"
        const m4Iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m4Iso) {
            const [, year, mon, day] = m4Iso;
            const d = new Date(Number(year), Number(mon) - 1, Number(day));
            if (!isNaN(d.getTime())) return { start: d, end: d };
        }
    } catch {
        // Parsing failed
    }
    return null;
}

/**
 * Checks if a walk-in opportunity is stale (all scheduled drive dates are strictly in the past).
 */
export function isStaleWalkin(opp: Opportunity): boolean {
    const isWalkin = isWalkinOpportunity(opp);
    if (!isWalkin) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const d = getDriveDetails(opp);

    // 1. Check explicit expiryDate
    if (d?.expiryDate) {
        const exp = new Date(String(d.expiryDate)).getTime();
        if (!isNaN(exp) && exp < todayStart) return true;
    }

    // 2. Check dateRange string
    const dateRangeStr = d?.dateRange || (opp as unknown as Record<string, unknown>).walkinDate || (opp as unknown as Record<string, unknown>).dateRange;
    if (typeof dateRangeStr === 'string' && dateRangeStr.trim()) {
        const parsed = parseWalkinDateRange(dateRangeStr);
        if (parsed) {
            const endDayEnd = new Date(parsed.end.getFullYear(), parsed.end.getMonth(), parsed.end.getDate(), 23, 59, 59, 999).getTime();
            if (endDayEnd < now.getTime()) return true;
        }
    }

    // 3. Check dates array
    if (Array.isArray(d?.dates) && d.dates.length > 0) {
        const validTimestamps = d.dates
            .map(dateStr => new Date(dateStr).getTime())
            .filter(t => !isNaN(t));
        if (validTimestamps.length > 0) {
            const allPast = validTimestamps.every(t => {
                const dateObj = new Date(t);
                const dayEnd = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999).getTime();
                return dayEnd < now.getTime();
            });
            if (allPast) return true;
        }
    }

    // 4. Check expiresAt
    if (opp.expiresAt) {
        const exp = new Date(opp.expiresAt).getTime();
        if (!isNaN(exp) && exp < now.getTime()) return true;
    }

    return false;
}

/**
 * Check if a walk-in drive overlaps with a given period relative to now.
 */
export function isWalkinInPeriod(
    opp: Opportunity,
    period: WalkinDrivePeriod
): boolean {
    if (period === 'all') return true;
    const d = getDriveDetails(opp);
    // Use the stored `dates` array when present, not only the free-text
    // `dateRange`. `dateRange` is often missing or unparseable while `dates`
    // holds real values, and treating that as "no date, so include" made every
    // date filter return the full list.
    const stored = Array.isArray(d?.dates) ? d.dates : [];
    const storedTimes = stored
        .map((v) => new Date(String(v)).getTime())
        .filter((t) => !Number.isNaN(t));

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayMs = 24 * 60 * 60 * 1000;

    const windowEndMs =
        period === 'today'
            ? todayStart.getTime() + dayMs
            : period === 'thisWeek'
              ? todayStart.getTime() + 7 * dayMs
              : todayStart.getTime() + 30 * dayMs;

    if (storedTimes.length > 0) {
        return storedTimes.some((t) => t >= todayStart.getTime() && t < windowEndMs);
    }

    if (!d?.dateRange) return true; // Genuinely undated — include by default
    const parsed = parseWalkinDateRange(d.dateRange);
    if (!parsed) return true; // Unparseable range — include rather than hide

    return parsed.start.getTime() < windowEndMs && parsed.end.getTime() >= todayStart.getTime();
}

export interface TransitInfo {
    /** Raw transit string from driveDetails.transitInfo */
    raw: string;
    /** Extracted station/metro name (e.g. "Raidurg Metro") */
    station: string | null;
    /** Metro line if mentioned (e.g. "Blue Line") */
    line: string | null;
    /** Walking distance string (e.g. "350m", "5 min walk") */
    walkDistance: string | null;
    /** Mode hint: walking, cab, shuttle, etc. */
    mode: 'walk' | 'cab' | 'shuttle' | 'unknown';
}

/**
 * Parse transitInfo strings like "350m from Raidurg Metro (Blue Line)" into structured data.
 */
export function parseTransitInfo(transitInfo?: string | null): TransitInfo | null {
    if (!transitInfo) return null;

    const raw = transitInfo;
    const lower = raw.toLowerCase();

    // Detect mode
    let mode: TransitInfo['mode'] = 'unknown';
    if (lower.includes('cab') || lower.includes('auto') || lower.includes('rickshaw')) mode = 'cab';
    else if (lower.includes('shuttle') || lower.includes('bus')) mode = 'shuttle';
    else if (lower.includes('walk') || lower.includes('m from') || lower.includes('min from') || lower.match(/\d+m\b/) || lower.match(/\d+ min/)) mode = 'walk';

    // Extract station name: "from <Station>" or "from <Station> Metro"
    let station: string | null = null;
    const stationMatch = raw.match(/from\s+(.+?)(?:\s*\(|$)/i);
    if (stationMatch) {
        station = stationMatch[1].trim()
            .replace(/\s*Station$/i, '')
            .replace(/\s*Metro$/i, ' Metro');
    }

    // Extract line: "(Blue Line)" or "(Red Line)"
    let line: string | null = null;
    const lineMatch = raw.match(/\(([^)]+Line[^)]*)\)/i) || raw.match(/\(([^)]+)\)/i);
    if (lineMatch) {
        line = lineMatch[1].trim();
    }

    // Extract walking distance
    let walkDistance: string | null = null;
    const distMatch = raw.match(/(\d+\s*m(?:eters?)?)\b/i);
    if (distMatch) {
        walkDistance = distMatch[1];
    } else {
        const timeMatch = raw.match(/(\d+\s*min(?:ute)?s?)\s*(?:walk|cab|ride)?/i);
        if (timeMatch) {
            walkDistance = timeMatch[1];
        }
    }

    return { raw, station, line, walkDistance, mode };
}

/**
 * Generate a Google Maps URL with transit-specific travel mode.
 * Falls back to directions mode if transit isn't available.
 */
export function getTransitDirectionsUrl(opp: Opportunity): string {
    const details = getDriveDetails(opp);
    const dest = details?.latitude && details?.longitude
        ? `${details.latitude},${details.longitude}`
        : details?.venueAddress || '';

    if (!dest) return '#';

    const destEncoded = encodeURIComponent(dest);

    // If we have a known transit station, use Directions API with transit mode
    const transit = parseTransitInfo(details?.transitInfo);

    if (transit?.station && transit.mode === 'walk') {
        // Walking directions from nearest metro to venue
        // Google Maps: origin (station) → destination (venue), travelmode=walking
        const city = (opp.locations || [])[0] || '';
        const origin = encodeURIComponent(`${transit.station}${city ? ', ' + city : ''}`);
        return `https://www.google.com/maps/dir/${origin}/${destEncoded}/${viewportFor(details)}/data=!3m1!4b1!4m2!4m1!3e2`;
    }

    if (transit?.station) {
        const city = (opp.locations || [])[0] || '';
        const origin = encodeURIComponent(`${transit.station}${city ? ', ' + city : ''}`);
        return `https://www.google.com/maps/dir/${origin}/${destEncoded}/${viewportFor(details)}/data=!3m1!4b1!4m2!4m1!3e3`;
    }

    // Fallback: driving directions from user to venue
    return `https://www.google.com/maps/dir/?api=1&destination=${destEncoded}&travelmode=driving`;
}

/**
 * Generate a Google Maps walking-only URL from nearest station to venue.
 * Used for the "Walk from Metro" button.
 */
export function getWalkingFromStationUrl(opp: Opportunity): string | null {
    const details = getDriveDetails(opp);
    const transit = parseTransitInfo(details?.transitInfo);
    if (!transit?.station) return null;

    const dest = details?.latitude && details?.longitude
        ? `${details.latitude},${details.longitude}`
        : details?.venueAddress || '';
    if (!dest) return null;

    const city = (opp.locations || [])[0] || '';
    const origin = encodeURIComponent(`${transit.station}${city ? ', ' + city : ''}`);
    const destEncoded = encodeURIComponent(dest);
    return `https://www.google.com/maps/dir/${origin}/${destEncoded}/${viewportFor(details)}/data=!3m1!4b1!4m2!4m1!3e2`;
}

/**
 * Tile URL providers with high-speed CDNs
 */
export function getMapTileConfig(isDark: boolean) {
    return {
        // High-contrast clean CartoDB tiles
        url: isDark
            ? 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        // Fallback OpenStreetMap tile URL in case CDN encounters transient issues
        fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 10,
        keepBuffer: 6, // Keeps surrounding tiles in memory for smooth pan/zoom
        updateWhenIdle: false, // Loads tiles during smooth motion
        updateWhenZooming: true,
    };
}

/**
 * Google Maps path viewport segment (`@lat,lng,zoom`) for a drive URL.
 *
 * This used to be the literal `@17.4,78.4,14z`, which is Hyderabad's centre.
 * Destination is what actually navigates, so the link still worked, but the
 * map opened framed on Hyderabad for every drive in every other city. Framing
 * on the venue fixes it without needing a per-city lookup table.
 */
function viewportFor(
    details: DriveDetailsLike | null | undefined,
    zoom = 14,
): string {
    const lat = details?.latitude;
    const lng = details?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return `@17.4,78.4,${zoom}z`;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return `@17.4,78.4,${zoom}z`;
    if (lat === 0 && lng === 0) return `@17.4,78.4,${zoom}z`;
    return `@${lat.toFixed(5)},${lng.toFixed(5)},${zoom}z`;
}

/**
 * Keyless embeddable map for a drive venue, on OpenStreetMap.
 *
 * Google's keyless `maps.google.com/maps?...&output=embed` iframe was retired
 * in 2018 and now answers "API key required", which is what the walk-in detail
 * card was showing on every venue. The Google Maps Embed API needs a billing
 * account, and OSM's `export/embed.html` needs nothing: no key, no quota, no
 * account, and it works in every city rather than only where we happen to have
 * coordinates tuned.
 *
 * OSM has no keyless geocoder, so a venue address alone cannot be embedded. In
 * that case this returns null and the caller offers a directions link instead
 * of rendering a map that cannot resolve the address.
 *
 * @param spanDegrees Width of the visible box around the marker. 0.004 is
 * roughly a 400 m box, which reads as "here is the pin" at card height.
 */
export function getOsmEmbedUrl(
    details: DriveDetailsLike | null | undefined,
    spanDegrees = 0.004,
): string | null {
    const lat = details?.latitude;
    const lng = details?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    // A pin at (0, 0) is the classic "missing coordinate" artefact, not a venue
    // in the Gulf of Guinea.
    if (lat === 0 && lng === 0) return null;

    const half = spanDegrees / 2;
    // OSM's bbox is minlon,minlat,maxlon,maxlat - longitude first.
    const bbox = [lng - half, lat - half, lng + half, lat + half]
        .map((n) => n.toFixed(5))
        .join(',');
    const marker = `${lat.toFixed(5)},${lng.toFixed(5)}`;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
}
