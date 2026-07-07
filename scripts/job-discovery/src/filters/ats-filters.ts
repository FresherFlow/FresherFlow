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

import { State, City } from 'country-state-city';

// Pre-compute sets of valid Indian cities and states (lowercase for case-insensitive matching)
const INDIAN_STATES = new Set((State.getStatesOfCountry('IN') || []).map(s => s.name.toLowerCase()));
const INDIAN_CITIES = new Set((City.getCitiesOfCountry('IN') || []).map(c => c.name.toLowerCase()));

export function isLocationIndiaOrRemote(location: string): boolean {
    if (!location) return true;
    const loc = location.toLowerCase();
    
    // Explicitly reject common non-India locations and terms
    const FOREIGN_TERMS = [
        'usa', 'us ', 'united states', 'uk', 'united kingdom', 'london', 
        'canada', 'australia', 'germany', 'france', 'japan', 'china', 
        'singapore', 'ireland', 'poland', 'netherlands', 'sweden', 'brazil',
        'mexico', 'spain', 'italy', 'dubai', 'uae', 'malaysia', 'emea', 'americas', 'apac', 'latam',
        'new york', 'california', 'texas', 'florida', 'berlin', 'paris', 'amsterdam', 'san francisco',
        'seattle', 'boston', 'chicago', 'toronto', 'sydney', 'melbourne', 'dublin', 'kuala lumpur', 'taiwan', 'taipei'
    ];

    for (const c of FOREIGN_TERMS) {
        if (loc.includes(c)) {
            // Exception: if it explicitly also mentions India, we might keep it.
            // Example: "San Francisco, CA or Bangalore, India"
            if (!loc.includes('india') && !loc.includes('in ')) {
                return false;
            }
        }
    }

    // Check against official Indian Cities from country-state-city
    for (const city of INDIAN_CITIES) {
        if (loc.includes(city)) return true;
    }

    // Check against official Indian States
    for (const state of INDIAN_STATES) {
        if (loc.includes(state)) return true;
    }

    // Fallback basic keywords
    const BASIC_KEYWORDS = [
        'india', 'remote', 'work from home', 'wfh', 'anywhere', 'worldwide', 'home based', 'home-based', 'global'
    ];
    for (const kw of BASIC_KEYWORDS) {
        if (loc.includes(kw)) {
            return true;
        }
    }

    // If it mentions no Indian city/state and no basic keyword, it's likely a foreign or undefined location
    return false;
}
