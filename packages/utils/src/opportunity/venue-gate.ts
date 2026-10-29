/**
 * The venue gate: "is this a place you can actually walk into?"
 *
 * WHY: a walk-in drive is a promise — a place, a date, a time, a document
 * list. When a venue field holds nothing but a city name, that promise is
 * fabricated: the listing claims "Hyderabad, 10:00 AM - 1:00 PM, reporting
 * time 9:30 AM" for what is really a remote web-dev role or a Chandigarh
 * internship.
 *
 * HOW IT HAPPENED: `parseWalkInDetails` falls back to the location string when
 * the source text has no `Venue:` line, and the collectors only checked
 * `venueAddress.length >= 8`. "Hyderabad" is 9 characters, so the fallback
 * passed the length gate and the row was filed as a drive.
 *
 * WHAT: a venue must look like an ADDRESS, not a city:
 *   1. it is at least 8 characters (a bare short token is never an address),
 *   2. it is not the detected city,
 *   3. it is not a bare city name (also rejects "Hyderabad, Telangana"),
 *   4. and it carries an address signal — a street/landmark keyword, a
 *      numbered address marker, or a multi-part address whose first part is
 *      not a bare city.
 *
 * Used by the walk-in collector (so the bad rows are never created) and by
 * the promote step (so the bad rows that already exist are never published).
 */

/**
 * City names that are never an address on their own.
 *
 * Curated rather than derived: `detectCity` also returns localities
 * ("Gachibowli", "Banjara Hills"), and a locality alone is not somewhere you
 * can be told to report.
 */
const BARE_CITY_NAMES: readonly string[] = [
    'hyderabad', 'secunderabad', 'bengaluru', 'bangalore', 'pune', 'chennai',
    'mumbai', 'delhi', 'new delhi', 'noida', 'greater noida', 'gurugram',
    'gurgaon', 'faridabad', 'kolkata', 'ahmedabad', 'surat', 'jaipur',
    'lucknow', 'nagpur', 'indore', 'bhopal', 'patna', 'kochi', 'coimbatore',
    'madurai', 'visakhapatnam', 'vijayawada', 'mysuru', 'mysore', 'chandigarh',
    'mohali', 'ludhiana', 'jalandhar', 'bhubaneswar', 'guwahati', 'trivandrum',
    'thiruvananthapuram', 'goa', 'panaji', 'ranchi', 'dehradun', 'agra',
    'varanasi', 'amritsar', 'jodhpur', 'raipur', 'kota', 'jamshedpur',
    'kozhikode', 'hubballi', 'pondicherry', 'puducherry', 'siliguri',
    'gwalior', 'tiruchirappalli', 'tirupati', 'salem', 'warangal', 'thanjavur',
    'nellore', 'tirupati', 'mysore', 'secunderabad', 'karimnagar', 'warangal',
    'bikaner', 'jalandhar', 'bathinda', 'moradabad', 'gorakhpur', 'deoghar',
];

/**
 * Words that make a string look like a physical place rather than a city.
 *
 * Matched as substrings, so "Gachibowli Road No 5" and "Hitec City Cyber
 * Towers" both qualify.
 */
const VENUE_ADDRESS_KEYWORDS: readonly string[] = [
    'road', 'street', 'avenue', 'lane', 'marg', 'boulevard', 'highway',
    'cross road', 'main road', 'service road', 'footpath',
    'floor', 'block', 'tower', 'building', 'bldg', 'mall', 'plaza', 'centre',
    'center', 'complex', 'apartment', 'apartments', 'layout', 'sector',
    'phase', 'colony', 'enclave', 'square', 'junction', 'circle', 'gate',
    'nagar', 'park', 'village', 'campus', 'office', 'hotel', 'hospital',
    'temple', 'station', 'metro', 'airport', 'software park', 'industrial area',
    'post office', 'plot', 'survey', 'godown', 'shed', 'warehouse', 'mall road',
];

/**
 * A numbered address marker: "No 12", "H.No 5-6", "Plot 34", "Flat 3B".
 *
 * Deliberately anchored so it cannot match inside a longer word ("North 5"
 * does not match, "no" is not followed by a digit straight away).
 */
const NUMBERED_ADDRESS_PATTERN =
    /\b(?:h\.?\s?no|no|plot|survey|flat|shop|room|floor|unit|shed|block)\s*[-#.]?\s*\d/i;

/** Venues longer than this are not addresses, they are pasted pages of text. */
const MAX_VENUE_LENGTH = 500;

/** Lowercase, strip punctuation, collapse whitespace. */
function normalizeVenue(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * True when the segment names a city and nothing else.
 *
 * Catches "Hyderabad" and "Hyderabad, Telangana" (the head before the comma
 * is "Hyderabad").
 */
export function isBareCityVenue(segment: string): boolean {
    const normalized = normalizeVenue(segment);
    if (!normalized) return false;
    if (BARE_CITY_NAMES.includes(normalized)) return true;

    // "Hyderabad Telangana", "Bengaluru India" — a city with a region tacked on.
    const words = normalized.split(' ').filter(Boolean);
    if (words.length === 2 && BARE_CITY_NAMES.includes(words[0])) return true;

    return false;
}

/**
 * True when the string carries at least one signal that it is an address.
 */
function hasAddressSignal(value: string, parts: string[], head: string): boolean {
    const lower = value.toLowerCase();

    if (VENUE_ADDRESS_KEYWORDS.some((keyword) => lower.includes(keyword))) return true;
    if (NUMBERED_ADDRESS_PATTERN.test(value)) return true;

    if (parts.length >= 2) {
        // A multi-part address whose first part carries the place:
        // "Infosys Towers, Gachibowli, Hyderabad".
        const headWords = head.split(/\s+/).filter(Boolean);
        if (headWords.length >= 2) return true;
        // "12-3-45, Banjara Hills" — a house number leads the address.
        if (/\d/.test(head)) return true;
    }

    return false;
}

/**
 * Is this venue plausible as a real place to report to?
 *
 * @param venue The venue address on the listing (may be null/undefined).
 * @param city  The city the listing is about, when known. A venue that is just
 *              the city name is never plausible.
 */
export function isPlausibleVenueAddress(
    venue: string | null | undefined,
    city?: string | null,
): boolean {
    if (typeof venue !== 'string') return false;

    const value = venue.trim();
    if (value.length < 8 || value.length > MAX_VENUE_LENGTH) return false;

    if (city && normalizeVenue(value) === normalizeVenue(city)) return false;

    const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
    const head = parts[0] ?? value;
    if (isBareCityVenue(head)) return false;

    return hasAddressSignal(value, parts, head);
}
