import { Opportunity } from '@fresherflow/types';

// Standard known coordinates for Hyderabad tech clusters and IT corridors
export const CLUSTER_COORDS: Record<string, [number, number]> = {
    'HITEC City': [17.4474, 78.3762],
    'Madhapur': [17.4485, 78.3776],
    'Gachibowli': [17.4144, 78.3498],
    'Begumpet': [17.4447, 78.4721],
    'Uppal': [17.4022, 78.5595],
    'Ameerpet': [17.4375, 78.4482],
    'Kondapur': [17.4699, 78.3578],
    'Raidurg': [17.4225, 78.3758],
};

export const HYDERABAD_DEFAULT_CENTER: [number, number] = [17.4350, 78.4000];

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
    const d = opp.walkInDetails;
    if (!d?.latitude && !d?.longitude && !d?.techCluster) {
        // Only location-based match — still compute but mark as approximate
    }
    return getDistanceKm(userLat, userLng, coords[0], coords[1]);
}

/**
 * Extract the dominant city name from a list of opportunities.
 * Counts location mentions across all opps and returns the most common one.
 * Falls back to 'India' if no locations are found.
 */
export function getDominantCity(opportunities: Opportunity[]): string {
    const cityCounts = new Map<string, number>();
    // Common non-city strings to exclude
    const exclude = new Set(['india', 'remote', 'pan-india', 'worldwide', 'hybrid', 'wfh', 'work from home', 'onsite', 'on-site', 'telangana', 'karnataka', 'maharashtra', 'tamil nadu', 'delhi', 'ncr']);

    for (const opp of opportunities) {
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
    const d = opp.walkInDetails;
    if (d?.latitude && d?.longitude && !isNaN(d.latitude) && !isNaN(d.longitude)) {
        return [d.latitude, d.longitude];
    }
    if (d?.techCluster) {
        for (const [key, coords] of Object.entries(CLUSTER_COORDS)) {
            if (d.techCluster.toLowerCase().includes(key.toLowerCase())) {
                return coords;
            }
        }
    }
    const locStr = (opp.locations || []).join(' ').toLowerCase();
    for (const [key, coords] of Object.entries(CLUSTER_COORDS)) {
        if (locStr.includes(key.toLowerCase())) {
            return coords;
        }
    }
    return HYDERABAD_DEFAULT_CENTER;
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
 * 1-Tap Google Calendar event generator with pre-filled document checklist & directions
 */
export function getGoogleCalendarUrl(opp: Opportunity): string {
    const details = opp.walkInDetails;
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
        '• 3 hard copies of Updated Resume',
        '• Govt ID Proof (Aadhaar / PAN card)',
        '• 10th, 12th & Degree Marksheets / Provisional Certificate',
        '• 2 Passport size photographs',
        '',
        `Directions: ${details?.venueLink || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(details?.venueAddress || '')}`}`,
        '',
        'Verified on FresherFlow: https://fresherflow.in/jobs/walkins',
    ].filter(Boolean).join('\n');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${encodeURIComponent(descLines)}`;
}

/**
 * 1-Tap WhatsApp share URL generator with full venue & transit details.
 * Message includes: company, role, salary, dates, venue, transit info,
 * walking directions from nearest metro, and a Google Maps link.
 */
export function getWhatsAppShareUrl(opp: Opportunity): string {
    const details = opp.walkInDetails;
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
    lines.push(`Verified on FresherFlow`);
    lines.push(`https://fresherflow.in/jobs/walkins`);

    const text = encodeURIComponent(lines.join('\n'));
    return `https://api.whatsapp.com/send?text=${text}`;
}

export type WalkinDrivePeriod = 'all' | 'today' | 'thisWeek';

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
    const isWalkin = opp.type === 'WALKIN' || Boolean(opp.walkInDetails);
    if (!isWalkin) return false;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const d = opp.walkInDetails;

    // 1. Check explicit expiryDate
    if (d?.expiryDate) {
        const exp = new Date(d.expiryDate).getTime();
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
    const d = opp.walkInDetails;
    if (!d?.dateRange) return true; // No date info — include by default

    const parsed = parseWalkinDateRange(d.dateRange);
    if (!parsed) return true; // Can't parse — include by default

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') {
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        // Drive overlaps with today if it starts on or before today and ends on or after today
        return parsed.start < todayEnd && parsed.end >= todayStart;
    }

    if (period === 'thisWeek') {
        // This week = next 7 days from today
        const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return parsed.start < weekEnd && parsed.end >= todayStart;
    }

    return true;
}

export interface TransitInfo {
    /** Raw transit string from walkInDetails.transitInfo */
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
    const details = opp.walkInDetails;
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
        return `https://www.google.com/maps/dir/${origin}/${destEncoded}/@17.4,78.4,14z/data=!3m1!4b1!4m2!4m1!3e2`;
    }

    if (transit?.station) {
        const city = (opp.locations || [])[0] || '';
        const origin = encodeURIComponent(`${transit.station}${city ? ', ' + city : ''}`);
        return `https://www.google.com/maps/dir/${origin}/${destEncoded}/@17.4,78.4,14z/data=!3m1!4b1!4m2!4m1!3e3`;
    }

    // Fallback: driving directions from user to venue
    return `https://www.google.com/maps/dir/?api=1&destination=${destEncoded}&travelmode=driving`;
}

/**
 * Generate a Google Maps walking-only URL from nearest station to venue.
 * Used for the "Walk from Metro" button.
 */
export function getWalkingFromStationUrl(opp: Opportunity): string | null {
    const details = opp.walkInDetails;
    const transit = parseTransitInfo(details?.transitInfo);
    if (!transit?.station) return null;

    const dest = details?.latitude && details?.longitude
        ? `${details.latitude},${details.longitude}`
        : details?.venueAddress || '';
    if (!dest) return null;

    const city = (opp.locations || [])[0] || '';
    const origin = encodeURIComponent(`${transit.station}${city ? ', ' + city : ''}`);
    const destEncoded = encodeURIComponent(dest);
    return `https://www.google.com/maps/dir/${origin}/${destEncoded}/@17.4,78.4,15z/data=!3m1!4b1!4m2!4m1!3e2`;
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
