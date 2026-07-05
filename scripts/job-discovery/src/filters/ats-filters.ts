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

export function isLocationIndiaOrRemote(location: string): boolean {
    if (!location) return true;
    const loc = location.toLowerCase();
    
    // Explicitly reject common non-India locations to be safe
    const FOREIGN_COUNTRIES = [
        'usa', 'us ', 'united states', 'uk', 'united kingdom', 'london', 
        'canada', 'australia', 'germany', 'france', 'japan', 'china', 
        'singapore', 'ireland', 'poland', 'netherlands', 'sweden', 'brazil',
        'mexico', 'spain', 'italy', 'dubai', 'uae', 'malaysia', 'emea', 'americas'
    ];

    for (const c of FOREIGN_COUNTRIES) {
        if (loc.includes(c) && !loc.includes('india') && !loc.includes('remote')) {
            return false;
        }
    }

    // Keep if it has India, IN, or specific Indian cities, or Remote
    const INDIA_KEYWORDS = [
        'india', 'remote', 'bengaluru', 'bangalore', 'hyderabad', 
        'pune', 'mumbai', 'chennai', 'delhi', 'noida', 'gurugram', 'gurgaon',
        'ahmedabad', 'kolkata', 'anywhere'
    ];

    for (const kw of INDIA_KEYWORDS) {
        if (loc.includes(kw)) {
            return true;
        }
    }

    // If it's a completely unknown location string (e.g. "HQ"), it's safer to pass it to the parser
    // than to drop it, unless we want to strictly require India/Remote.
    // Given the user's concern ("y it was out of india"), let's be somewhat strict but allow generic strings.
    // Actually, if it didn't match FOREIGN_COUNTRIES, we'll let it pass for the LLM to decide.
    return true;
}
