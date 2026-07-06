import { EXPERIENCED_PHRASES, FRESHER_PHRASES } from '../config.js';

// Is this a fresher job?
export function isFresherJob(text: string): boolean {
    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    
    // Check for ranges like "1-3 years", "2-5 years", "1 to 4 years", or just "1-3 experience"
    const expRangeRegex = /(?:[1-9]|10)\s*(?:-|–|\bto\b)\s*(?:[2-9]|1[0-5])\s*(?:years|years'|yrs|yr|y\b)?\s*(?:of\s+)?(?:experience\b)?/gi;
    if (expRangeRegex.test(lowerText) && lowerText.match(expRangeRegex)![0].match(/years|yrs|yr|y|experience/i)) {
        return false;
    }

    // Check for experience requirements of 1+ years (e.g. "1 year experience", "2 years' experience", "Experience: 2+")
    const expReqRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*(?:years'|year's|years|year|yrs|yr|y\b)?\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    if (expReqRegex.test(lowerText)) {
        return false;
    }

    // Check for "1+ years", "2+ yr", "2+ experience"
    const plusExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*\+\s*(?:years|year|yrs|yr|y\b|experience\b)/gi;
    if (plusExpRegex.test(lowerText)) {
        return false;
    }

    // Check for "minimum of 1 year", "min 2 year", "at least 1 yrs", "minimum 2 experience"
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[1-9]\b|\b10\b)\s*(?:years|year|yrs|yr|y\b|experience\b)/gi;
    if (minExpRegex.test(lowerText)) {
        return false;
    }
    
    // Check for standalone experience requirements of 1-10 years (e.g. "1 year", "3 years") that are not part of a 0-X range
    const standaloneExpRegex = /(?<!\b0\s*(?:-|–|\bto\b)\s*)(?:\b[1-9]\b|\b10\b)\s*(?:years|yrs|yr|y\b)/gi;
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
    
    // Check for ranges like "3-5 years", "10-13 years", "5 to 8 years" (excluding ranges starting with 0, 1, or 2)
    const expRangeRegex = /(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years|years'|yrs|yr|y\b)/gi;
    if (expRangeRegex.test(lowerText)) {
        return true;
    }

    // Check for experience requirements of 3+ years (e.g. "3 years' experience", "5 year's analytical experience")
    const expReqRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years'|year's|years|year|yrs|yr)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    if (expReqRegex.test(lowerText)) {
        return true;
    }

    // Check for "3+ years", "4+ yr", "10+ years", etc. (excluding 0+, 1+, 2+)
    const plusExpRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*\+\s*(?:years|year|yrs|yr|y\b)/gi;
    if (plusExpRegex.test(lowerText)) {
        return true;
    }

    // Check for "minimum of 3 years", "min 5 years", "at least 4 yrs", etc. (excluding 0, 1, 2)
    const minExpRegex = /\b(?:minimum|min|at least)\s*(?:of\s+)?(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|year|yrs|yr|y\b)/gi;
    if (minExpRegex.test(lowerText)) {
        return true;
    }
    
    // Check for standalone experience requirements of 3+ years (excluding 0, 1, 2)
    const standaloneExpRegex = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-9]\b|\b\d{2,}\b)\s*(?:years|yrs|yr|y\b)/gi;
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
