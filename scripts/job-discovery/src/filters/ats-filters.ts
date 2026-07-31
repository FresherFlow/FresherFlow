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
const foreignCountriesPattern = FOREIGN_COUNTRIES.map(c => c.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")).join('|');
const foreignMegaRegex = new RegExp(`\\b(${foreignCountriesPattern})\\b`, 'i');

// Major foreign cities and states/regions that might bypass country checks
const foreignCitiesRegex = /\b(london|berlin|paris|amsterdam|san francisco|seattle|boston|chicago|toronto|sydney|melbourne|dublin|kuala lumpur|taiwan|taipei|manila|bangkok|seoul|cape town|stockholm|tokyo|singapore|hong kong|beijing|shanghai|jakarta|osaka|madrid|rome|vienna|lisbon|helsinki|oslo|california|texas|new york|florida|sf|nyc|sao paulo|saopaulo|buenos aires|johannesburg|nairobi|cairo|vancouver|montreal|calgary|zurich|geneva|brussels|munich|nashville|nashvile|dallas|austin|atlanta|charlotte|denver|phoenix|miami|orlando|detroit|philadelphia|minneapolis|portland|washington)\b/i;

export function isLocationIndiaOrRemote(location: string, title?: string): boolean {
    const titleLower = (title || '').toLowerCase();
    if (titleLower && (foreignMegaRegex.test(titleLower) || foreignCitiesRegex.test(titleLower))) {
        if (!titleLower.includes('india') && !/\b(in|ind)\b/i.test(titleLower) && !titleLower.includes('remote india')) {
            return false;
        }
    }

    // Empty/missing location = Assumed India/Remote for ATS discovery (if title didn't advertise a foreign location).
    if (!location || location.trim() === '') return true;
    const loc = location.toLowerCase();

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
        /\bindia\b/i, /\bremote\b/i, /\bwork from home\b/i, /\bwfh\b/i, /\banywhere\b/i, /\bhome based\b/i, /\bhome-based\b/i,
        /\bvirtual\b/i, /\bonline\b/i, /\bhybrid\b/i, /\btelecommute\b/i, /\bdistributed\b/i, /\bpan india\b/i, /\bflexible\b/i,
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

/**
 * Strictly verify that a job title or department belongs to technology / engineering / data / product / IT.
 */
export function isTechJob(title: string, department?: string): boolean {
    const textLower = `${title} ${department || ''}`.toLowerCase();

    const NON_TECH_KEYWORDS = [
        'sales', 'account executive', 'business development', 'buyer', 'merchandiser', 'procurement',
        'recruiter', 'recruiting', 'talent acquisition', 'human resources', 'hr generalist', 'hr specialist',
        'accountant', 'accounting', 'tax', 'auditor', 'bookkeeper', 'counsel', 'attorney', 'paralegal', 'legal',
        'facilities', 'facility', 'security guard', 'receptionist', 'executive assistant', 'administrative assistant',
        'driver', 'warehouse', 'clerk', 'customer service', 'customer support', 'content associate',
        'social media', 'copywriter', 'brand manager', 'pr manager', 'payroll', 'claims', 'underwriter',
        'risk management', 'editorial', 'medical', 'nursing', 'clinical', 'supply chain', 'logistics'
    ];

    for (const kw of NON_TECH_KEYWORDS) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(textLower)) {
            return false;
        }
    }

    const TECH_KEYWORDS = [
        'software', 'engineer', 'engineering', 'developer', 'programmer', 'data', 'analytics', 'analyst',
        'science', 'scientist', 'machine learning', 'ai', 'ml', 'qa', 'test', 'testing', 'sdet', 'devops',
        'cloud', 'infrastructure', 'security', 'cyber', 'network', 'systems', 'it', 'information technology',
        'product', 'designer', 'ui', 'ux', 'frontend', 'backend', 'fullstack', 'full-stack', 'mobile',
        'ios', 'android', 'web', 'embedded', 'firmware', 'hardware', 'technical', 'tech', 'platform',
        'automation', 'site reliability', 'sre', 'database', 'dba', 'computer', 'application', 'apps',
        'intern', 'internship', 'trainee', 'apprentice', 'graduate'
    ];

    for (const kw of TECH_KEYWORDS) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(textLower)) {
            return true;
        }
    }

    return false;
}
