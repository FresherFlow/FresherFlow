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

import { State, City, Country } from 'country-state-city';

// Pre-compute sets of valid Indian cities and states (lowercase for case-insensitive matching)
const INDIAN_STATES = new Set((State.getStatesOfCountry('IN') || []).map(s => s.name.toLowerCase()));
const INDIAN_CITIES = new Set((City.getCitiesOfCountry('IN') || []).map(c => c.name.toLowerCase()));
const FOREIGN_COUNTRIES = (Country.getAllCountries() || [])
    .map(c => c.name.toLowerCase())
    .filter(c => c !== 'india');
// Add some common abbreviations and regions to the foreign list
FOREIGN_COUNTRIES.push('us', 'usa', 'uk', 'dubai', 'uae', 'emea', 'americas', 'apac', 'latam');

// Create a mega-regex for strict word boundary matching of all foreign countries
const foreignCountriesPattern = FOREIGN_COUNTRIES.map(c => c.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")).join('|');
const foreignMegaRegex = new RegExp(`\\b(${foreignCountriesPattern})\\b`, 'i');

export function isLocationIndiaOrRemote(location: string): boolean {
    // Empty/missing location = Assumed India/Remote for ATS discovery.
    // Companies like Binance, Capco etc. have hundreds of jobs with no location field in the list API.
    // We pass them through to the detail API or Playwright verification phase.
    if (!location || location.trim() === '') return true;
    const loc = location.toLowerCase();
    
    // Explicitly reject common non-India locations and terms using word boundaries
    // This prevents "us" from matching "campus" while catching "Remote - US"
    // Also includes major foreign cities that might bypass country checks
    const foreignCitiesRegex = /\b(london|berlin|paris|amsterdam|san francisco|seattle|boston|chicago|toronto|sydney|melbourne|dublin|kuala lumpur|taiwan|taipei|manila|bangkok|seoul)\b/i;

    if (foreignMegaRegex.test(loc) || foreignCitiesRegex.test(loc)) {
        if (!loc.includes('india') && !/\bin\b/i.test(loc)) {
            return false;
        }
    }

    const words = loc.split(/[\s,()[\]\/\-._|]+/);
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
        'india', 'remote', 'work from home', 'wfh', 'anywhere', 'home based', 'home-based',
    ];
    for (const kw of BASIC_KEYWORDS) {
        if (loc.includes(kw)) {
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
