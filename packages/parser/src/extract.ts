/**
 * Field extraction functions.
 * Each function takes raw job text and returns one specific field or group.
 */
import { OpportunityType, WorkMode } from '@fresherflow/types';
import nlp from 'compromise';
import natural from 'natural';
import { City } from 'country-state-city';
import {
    COMMON_SKILLS, COMMON_CITIES, KNOWN_COMPANIES, TITLE_KEYWORDS,
    STOP_WORDS, GENERIC_TITLES,
    splitMergedWords, isValidSkill,
} from './heuristics.js';
import { CANONICAL_SKILLS_MAP } from './metadata.js';

// ── Title ─────────────────────────────────────────────────────────────────────

export function extractTitle(textLines: string[]): string | undefined {
    for (const line of textLines) {
        if (line.length > 10 && !line.toLowerCase().includes('posted') && !line.toLowerCase().includes('reviews')) {
            const cleaned = line.replace(/Mega Walkin Drive-?\s*/i, '').trim();
            if (
                TITLE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(cleaned)) &&
                cleaned.split(' ').length >= 2 &&
                cleaned.split(' ').length <= 8
            ) {
                return cleaned;
            }
        }
    }
    return textLines[0];
}

// ── Company ───────────────────────────────────────────────────────────────────

export function extractCompany(text: string): string | undefined {
    const textLower = text.toLowerCase();
    for (const g of KNOWN_COMPANIES) {
        if (textLower.includes(g.toLowerCase())) return g;
    }
    const doc = nlp(text);
    const organizations = doc.organizations().out('array') as string[];
    return organizations.length > 0 ? organizations[0] : undefined;
}

// ── Opportunity type ──────────────────────────────────────────────────────────

export function extractType(textLower: string): OpportunityType {
    if (textLower.includes('walkin') || textLower.includes('walk-in') || textLower.includes('venue')) return OpportunityType.WALKIN;
    if (textLower.includes('internship') || textLower.includes('stipend')) return OpportunityType.INTERNSHIP;
    return OpportunityType.JOB;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export function extractLocations(text: string): string[] {
    const textLower = text.toLowerCase();
    if (textLower.includes('pan india') || textLower.includes('across india') || textLower.includes('anywhere in india')) {
        return ['Pan India'];
    }

    const doc = nlp(text);
    const rawLocations = doc.places().out('array') as string[];
    const validLocations = rawLocations.filter(loc =>
        City.getCitiesOfCountry('IN')?.some(c => c.name.toLowerCase() === loc.trim().toLowerCase())
    );

    const found: string[] = [];
    for (const city of COMMON_CITIES) {
        if (text.includes(city) && !found.includes(city)) found.push(city);
    }

    if (found.length > 0) return Array.from(new Set(found));
    if (validLocations.length > 0) return Array.from(new Set(validLocations));
    return Array.from(new Set(rawLocations));
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function extractSkills(text: string, locations: string[] = []): string[] {
    const textStr = typeof text === 'string' ? text : (text ? String(text) : '');
    if (!textStr.trim()) return [];
    const textLower = textStr.toLowerCase();
    
    // Use live CDN skills if available, otherwise fallback to heuristics COMMON_SKILLS
    const skillsToSearch = CANONICAL_SKILLS_MAP.size > 0 
        ? Array.from(CANONICAL_SKILLS_MAP.values()) 
        : COMMON_SKILLS;
    
    const matchedSkills = new Set<string>();

    for (const skill of skillsToSearch) {
        if (!skill || skill.length < 2) continue;

        const lowerSkill = skill.toLowerCase();
        
        // Quick substring check first for performance
        if (!textLower.includes(lowerSkill)) continue;

        // Escape special characters for regex (e.g. C++, .NET)
        const escaped = lowerSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Exact boundary match: word boundaries or non-alphanumeric boundaries
        // This handles cases like "C" not matching inside "React"
        const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i');
        
        if (regex.test(textStr)) {
            matchedSkills.add(skill);
        }
    }

    return Array.from(matchedSkills).slice(0, 15);
}

// ── Passout years ─────────────────────────────────────────────────────────────

export function extractPassoutYears(text: string): number[] {
    // Only match years if they are near relevant keywords, or if the text is very short (like a label)
    const contextRegex = /(?:batch|class\s+of|passout|graduating\s+in|passing\s+out|graduates?(?:\s+of)?|yop)[\s\S]{0,30}\b(202[0-9]|20[0-2][0-9])\b/gi;
    const years: number[] = [];
    let match;
    while ((match = contextRegex.exec(text)) !== null) {
        years.push(parseInt(match[1]));
    }
    return Array.from(new Set(years));
}

// ── Degrees ───────────────────────────────────────────────────────────────────

export function extractDegrees(text: string): string[] {
    const degrees: string[] = [];
    if (/\b(diploma|polytechnic)\b/i.test(text)) degrees.push('DIPLOMA');
    if (/\b(bachelor|degree|b\.?tech|b\.?e|bsc|b\.?sc|bcom|b\.?com|graduation)\b/i.test(text)) degrees.push('DEGREE');
    if (/\b(master|pg|post.?graduate|m\.?tech|m\.?e|mca|mba)\b/i.test(text)) degrees.push('PG');
    if (degrees.length === 0) degrees.push('DEGREE');
    return degrees;
}

// ── Work mode ─────────────────────────────────────────────────────────────────

export function extractWorkMode(text: string): WorkMode {
    if (/\b(fully remote|100% remote|remote.?only|work from home|wfh)\b/i.test(text)) return WorkMode.REMOTE;
    if (/\b(hybrid|flexible|remote.?friendly|2.?3 days office|3.?2 days office)\b/i.test(text)) return WorkMode.HYBRID;
    return WorkMode.ONSITE;
}

// ── Experience ────────────────────────────────────────────────────────────────

export function extractExperience(text: string): { min?: number; max?: number } {
    const rangeMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr)s?/i);
    if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
    const minOnly = text.match(/(\d+)\+?\s*(?:year|yr)s?\s*exp/i);
    if (minOnly) return { min: parseInt(minOnly[1]) };
    return {};
}

// ── Incentives ────────────────────────────────────────────────────────────────

export function extractIncentives(text: string): string | undefined {
    const m = text.match(/incentives?\s+(?:up to|of)\s*(?:rs\.?\s*)?([\d,]+(?:\s*to\s*[\d,]+)?)/i) ||
              text.match(/incentives?\s*(?:rs\.?\s*)?([\d,]+(?:\s*to\s*[\d,]+)?)/i);
    return m ? `Rs. ${m[1]}` : undefined;
}

// ── Job function ──────────────────────────────────────────────────────────────

export function extractJobFunction(textLower: string): string | undefined {
    for (const kw of ['banking', 'sales', 'engineering', 'finance', 'marketing', 'hr', 'support', 'operations', 'customer success']) {
        if (textLower.includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
    return undefined;
}

// ── Walk-in details ───────────────────────────────────────────────────────────

export interface WalkInExtraction {
    dateRange?: string;
    timeRange?: string;
    venueLink?: string;
    venueAddress?: string;
}

export function extractWalkInDetails(text: string, textLines: string[]): WalkInExtraction {
    const result: WalkInExtraction = {};

    const months = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*';
    const day = '\\d+(?:st|nd|rd|th)?';
    const drMatch = text.match(new RegExp(`(${day}\\s+${months}\\s*(?:to|-)\\s*${day}\\s+${months})`, 'i')) ||
                    text.match(new RegExp(`(${day}\\s*(?:to|-)\\s*${day}\\s+${months})`, 'i'));
    if (drMatch) result.dateRange = drMatch[1].trim();

    const trMatch = text.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)\s*(?:to|-)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM))/i);
    if (trMatch) result.timeRange = trMatch[1].trim();

    const mapMatch = text.match(/https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl)\/\S+/i);
    if (mapMatch) result.venueLink = mapMatch[0];

    const venueMatch = text.match(/(?:Venue|Location|Address):\s*([^\n\r]+)/i);
    if (venueMatch) {
        result.venueAddress = venueMatch[1].trim();
    } else {
        const idx = textLines.findIndex(l => l.toLowerCase().includes('time and venue'));
        if (idx !== -1 && textLines[idx + 2]) result.venueAddress = textLines[idx + 2];
    }

    return result;
}
