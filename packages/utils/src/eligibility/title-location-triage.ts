import { State, City, Country } from '@fresherflow/constants';

// Pre-compute sets of valid Indian cities and states (lowercase for case-insensitive matching)
const INDIAN_STATES = new Set((State.getStatesOfCountry('IN') || []).map(s => s.name.toLowerCase()));
const INDIAN_CITIES = new Set((City.getCitiesOfCountry('IN') || []).map(c => c.name.toLowerCase()));

// Add common aliases, variations, and tech hubs that country-state-city misses or spells differently
const EXTRA_INDIAN_CITIES = [
    'bangalore', 'banglore', 'bengaluru', 'mumbai', 'bombay', 'delhi', 'new delhi', 'ncr', 'delhi ncr',
    'noida', 'gurgaon', 'gurugram', 'hyderabad', 'pune', 'chennai', 'madras', 'kolkata', 'calcutta',
    'ahmedabad', 'ahemdabad', 'jaipur', 'kochi', 'cochin', 'mysore', 'mysuru', 'chandigarh', 'tricity',
    'trivandrum', 'thiruvananthapuram', 'vadodara', 'indore', 'coimbatore', 'visakhapatnam', 'vizag',
    'nagpur', 'lucknow', 'surat', 'bhubaneswar', 'goa', 'kanpur', 'bhopal', 'nashik', 'raipur', 'madurai', 'guwahati'
];
for (const city of EXTRA_INDIAN_CITIES) {
    INDIAN_CITIES.add(city);
}

const FOREIGN_COUNTRIES = (Country.getAllCountries() || [])
    .map(c => c.name.toLowerCase())
    .filter(c => c !== 'india');
// Add some common abbreviations and regions to the foreign list
FOREIGN_COUNTRIES.push('us', 'usa', 'uk', 'dubai', 'uae', 'emea', 'americas', 'apac', 'latam');

// Create a mega-regex for strict word boundary matching of all foreign countries
const foreignCountriesPattern = FOREIGN_COUNTRIES.map(c => c.replace(/([.*+?^=!:${}()|[\]/\\-])/g, "\\$1")).join('|');
const foreignMegaRegex = new RegExp(`\\b(${foreignCountriesPattern})\\b`, 'i');

// Use the package to get all foreign states for accurate location filtering
const FOREIGN_STATES_SET = new Set(
    (State.getAllStates() || [])
        .filter(s => s.countryCode !== 'IN')
        .map(s => s.name.toLowerCase())
);

export function isIndiaOrRemoteLocation(loc: string): boolean {
    if (!loc) return false;
    return isLocationIndiaOrRemote(loc);
}

export function isPotentialFresherJob(title: string): boolean {
    if (!title) return false;
    
    const lowerTitle = title.toLowerCase();

    // 1. Strict rejection of obvious senior/managerial roles
    const SENIOR_KEYWORDS = [
        'senior', 'sr', 'sr.', 'manager', 'lead', 'principal', 'director', 
        'vp', 'head', 'architect', 'staff', 'president', 'experienced', 'expert',
        'supervisor', 'consultant', 'advisory', 'chief', 'executive', 'officer', 'managerial'
    ];
    
    // Check for exact word boundaries for roman numerals
    const SENIOR_LEVELS = [
        /\bii\b/i, /\biii\b/i, /\biv\b/i, /\bv\b/i,
        /\b2\b/, /\b3\b/, /\b4\b/, /\b5\b/
    ];

    for (const keyword of SENIOR_KEYWORDS) {
        if (lowerTitle.includes(keyword)) {
            // Exception: 'associate' is entry-level, but 'associate director' is not. 
            // We just reject if it has 'director' anywhere.
            return false;
        }
    }

    for (const regex of SENIOR_LEVELS) {
        if (regex.test(lowerTitle)) {
            return false;
        }
    }

    // 2. We keep everything else!
    // Why? "Software Engineer" with no level might be entry-level.
    // The downstream `job-processor` will read the full description and strictly check the 'Years of Experience' field.
    // Our goal here is just to prevent wasting API calls/tokens on obvious senior roles.
    
    return true;
}

export function isLocationIndiaOrRemote(location: string, title?: string): boolean {
    const titleLower = (title || '').toLowerCase();
    if (titleLower && foreignMegaRegex.test(titleLower)) {
        if (!titleLower.includes('india') && !/\b(in|ind)\b/i.test(titleLower) && !titleLower.includes('remote india')) {
            return false;
        }
    }

    // Empty/missing location = Assumed India/Remote for ATS discovery (if title didn't advertise a foreign location).
    if (!location || location.trim() === '') return true;
    const loc = location.toLowerCase();

    // 1. Strict Foreign Matching: Countries, specific cities, and ALL foreign states
    if (foreignMegaRegex.test(loc)) {
        if (!loc.includes('india') && !/\bin\b/i.test(loc)) {
            return false;
        }
    }

    // 2. Tokenize and check against foreign states
    const words = loc.split(/[^\w]+/);
    
    // Check for foreign states first (up to 3 words)
    for (let i = 0; i < words.length; i++) {
        if (!words[i]) continue;
        
        if (FOREIGN_STATES_SET.has(words[i]) && !INDIAN_CITIES.has(words[i]) && !INDIAN_STATES.has(words[i])) {
            return false;
        }
        if (i < words.length - 1) {
            const twoWords = words[i] + ' ' + words[i+1];
            if (FOREIGN_STATES_SET.has(twoWords) && !INDIAN_CITIES.has(twoWords) && !INDIAN_STATES.has(twoWords)) {
                return false;
            }
        }
        if (i < words.length - 2) {
            const threeWords = words[i] + ' ' + words[i+1] + ' ' + words[i+2];
            if (FOREIGN_STATES_SET.has(threeWords) && !INDIAN_CITIES.has(threeWords) && !INDIAN_STATES.has(threeWords)) {
                return false;
            }
        }
    }

    // 3. Check against Indian cities and states
    for (let i = 0; i < words.length; i++) {
        if (!words[i]) continue;
        
        if (INDIAN_CITIES.has(words[i])) return true;
        if (INDIAN_STATES.has(words[i])) return true;
        
        if (i < words.length - 1) {
            const twoWords = words[i] + ' ' + words[i+1];
            if (INDIAN_CITIES.has(twoWords)) return true;
            if (INDIAN_STATES.has(twoWords)) return true;
        }
        
        if (i < words.length - 2) {
            const threeWords = words[i] + ' ' + words[i+1] + ' ' + words[i+2];
            if (INDIAN_CITIES.has(threeWords)) return true;
            if (INDIAN_STATES.has(threeWords)) return true;
        }
    }

    // Fallback basic keywords
    const BASIC_KEYWORDS = [
        /\bindia\b/i, /\bremote\b/i, /\bwork from home\b/i, /\bwfh\b/i, /\banywhere\b/i, /\bhome based\b/i, /\bhome-based\b/i,
        /\bvirtual\b/i, /\bonline\b/i, /\btelecommute\b/i, /\bdistributed\b/i, /\bpan india\b/i,
    ];
    for (const regex of BASIC_KEYWORDS) {
        if (regex.test(loc)) {
            return true;
        }
    }

    // "worldwide" / "global" — reject unless India is explicitly mentioned
    if (loc.includes('worldwide') || loc.includes('global')) {
        return false;
    }

    // If no Indian city/state or basic keyword matched, it's a foreign location
    return false;
}

