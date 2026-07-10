import { EXPERIENCED_PHRASES, FRESHER_PHRASES } from '../config.js';

// Is this a fresher job?
export function isFresherJob(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    
    // Check for ranges like "1-3 years of experience", "2-5 years of relevant experience"
    // Does NOT match "0-1" or "0-2" because the first digit is 1-10.
    const expRangeRegex = /(?:[1-9]|10)\s*(?:-|–|\bto\b)\s*(?:[2-9]|1[0-5])\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z]+\s+){0,4}(?:experience|expertise|proficiency|building|working|developing|engineering|leading|managing)/gi;
    if (expRangeRegex.test(lowerText)) {
        return false;
    }

    // Check for "Experience: 1-3 years" / "Years of Expn - 5 to 7" (expn, exp. etc. prefix)
    const prefixExpRangeRegex = /(?:experience|exp(?:n|erience|\.)?|requires?|requiring)[^a-z0-9]{1,10}(?:[1-9]|10)\s*(?:-|–|\bto\b)\s*(?:[2-9]|1[0-5])\s*(?:years?|yrs?|y\b)/gi;
    if (prefixExpRangeRegex.test(lowerText)) {
        return false;
    }

    // Catch bare "X to Y Years" / "X-Y Years" with no keyword prefix (e.g. label rows like "5 to 7 Years")
    const bareRangeRegex = /\b(?:[3-9]|[1-9]\d)\s*(?:-|–|\bto\b)\s*(?:[3-9]|[1-9]\d)\s*(?:years?|yrs?)\b/gi;
    if (bareRangeRegex.test(lowerText)) {
        return false;
    }

    // Check for experience requirements like "1 year of experience", "2 years' experience"
    // Does NOT match if preceded by "0-" or "0 to"
    const expReqRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,4}(?:experience|expertise|proficiency|building|working|developing|engineering|leading|managing)/gi;
    if (expReqRegex.test(lowerText)) {
        return false;
    }

    // Check for "1+ years of experience", "2+ yrs experience", "4+ years expertise"
    const plusExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*\+\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,4}(?:experience|expertise|proficiency|building|working|developing|engineering|leading|managing)/gi;
    if (plusExpRegex.test(lowerText)) {
        return false;
    }

    // Check for "minimum of 1 year of experience", "min 2 years experience"
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[1-9]\b|\b10\b)\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}(?:experience|expertise)/gi;
    if (minExpRegex.test(lowerText)) {
        return false;
    }
    
    // Standalone experience that doesn't say "of experience" but implies it:
    // "Experience: 1 year", "Exp - 2 yrs", "Requires 1 year", "Experience: 8+yrs"
    const standaloneExpRegex = /(?:experience|exp|requires?|requiring|minimum|min)[^a-z0-9]{1,4}(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*\+?\s*(?:years?|yrs?|y\b)/gi;
    if (standaloneExpRegex.test(lowerText)) {
        return false;
    }
    
    // If it explicitly asks for experience (e.g. 3+ years), it is NOT a fresher job.
    for (const phrase of EXPERIENCED_PHRASES) {
        if (lowerText.includes(phrase)) return false;
    }

    // If it explicitly says fresher/entry-level/intern, it is.
    for (const phrase of FRESHER_PHRASES) {
        if (lowerText.includes(phrase)) return true;
    }
    // Default to true to avoid missing potential entry level/fresher jobs
    return true; 
}

// Is this strictly a senior job (experience >= 3 years)?
export function isSeniorJob(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    
    // Check for ranges like "3-5 years of experience", "10-13 years" (excluding ranges starting with 0, 1, or 2)
    const expRangeRegex = /(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,4}(?:experience|building|working|developing|engineering|leading|managing)/gi;
    if (expRangeRegex.test(lowerText)) {
        return true;
    }

    // Check for "Experience: 3-5 years"
    const prefixExpRangeRegex = /(?:experience|exp|requires?|requiring)[^a-z0-9]{1,4}(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years?|yrs?|y\b)/gi;
    if (prefixExpRangeRegex.test(lowerText)) {
        return true;
    }

    // Check for experience requirements of 3+ years (e.g. "3 years' experience", "5 year's analytical experience")
    const expReqRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,4}(?:experience|building|working|developing|engineering|leading|managing)/gi;
    if (expReqRegex.test(lowerText)) {
        return true;
    }

    // Check for "3+ years of experience", "4+ yr", "10+ years" (excluding 0+, 1+, 2+)
    const plusExpRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*\+\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,4}(?:experience|building|working|developing|engineering|leading|managing)/gi;
    if (plusExpRegex.test(lowerText)) {
        return true;
    }

    // Check for "minimum of 3 years", "min 5 years", "at least 4 yrs", etc. (excluding 0, 1, 2)
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    if (minExpRegex.test(lowerText)) {
        return true;
    }
    
    // Check for standalone experience requirements (e.g. "Requires 3 years", "Experience: 5+ yrs")
    const standaloneExpRegex = /(?:experience|exp|requires?|requiring|minimum|min)[^a-z0-9]{1,4}(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years?|yrs?|y\b)/gi;
    if (standaloneExpRegex.test(lowerText)) {
        return true;
    }
    
    const seniorPhrases = [
        "3+ years", "4+ years", "5+ years", "6+ years", "7+ years", "8+ years", "9+ years", "10+ years",
        "3+ yrs", "4+ yrs", "5+ yrs", "6+ yrs", "7+ yrs", "8+ yrs", "9+ yrs", "10+ yrs",
        "3+ exp", "4+ exp", "5+ exp", "6+ exp", "7+ exp", "8+ exp", "9+ exp", "10+ exp",
        "3 years of exp", "4 years of exp", "5 years of exp", "6 years of exp", "7 years of exp", "8 years of exp", "9 years of exp", "10 years of exp",
        "3 years exp", "4 years exp", "5 years exp", "6 years exp", "7 years exp", "8 years exp", "9 years exp", "10 years exp",
        "3 year exp", "4 year exp", "5 year exp", "6 year exp", "7 year exp", "8 year exp", "9 year exp", "10 year exp",
        "10 - 13 years", "10-13 years", "10-13 yrs", "10 to 13 years", "10 to 13 yrs"
    ];
    for (const phrase of seniorPhrases) {
        if (lowerText.includes(phrase)) return true;
    }

    return false;
}

// Check if the text contains any fresher keywords
export function hasFresherKeyword(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    for (const phrase of FRESHER_PHRASES) {
        if (lowerText.includes(phrase)) return true;
    }
    return false;
}

// Check if a page is actually a job post (vs a course, syllabus, prep guide, roadmap, exam result)
export function isActualJob(title: string): boolean {
    const titleLower = title.toLowerCase();

    // Only block if the title explicitly indicates it is a course, syllabus, mock test, study material, roadmap, or exam info.
    const titleBlacklist = [
        'course', 'courses', 'bootcamp', 'syllabus', 'admit card', 'admit-card', 'hall ticket', 
        'exam date', 'exam result', 'exam paper', 'question paper', 'answer key', 'mock test', 
        'test series', 'practice test', 'study material', 'roadmap', 'roadmaps', 'ambassador', 
        'newsletter', 'whatsapp', 'telegram', 'pdf download', 'placement papers', 'eligibility criteria', 
        'how to apply', 'nqt preparation', 'exam syllabus', 'exam details'
    ];

    for (const keyword of titleBlacklist) {
        if (titleLower.includes(keyword)) {
            return false;
        }
    }

    return true;
}
