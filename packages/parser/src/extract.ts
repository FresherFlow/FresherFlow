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
    const textLower = text.toLowerCase();
    const skillCandidates: { text: string; score: number }[] = [];

    // Strategy A: section-based extraction with scoring
    const sectionPatterns = [
        /(?:Key Skills|Keyskills|Skills)(.*)/is,
        /(?:Technical Skills|Knowledge of|Technical Support)(.*)/is,
        /(?:Key Responsibilities|Responsibilities|Job Description)(.*)/is,
    ];

    for (const pattern of sectionPatterns) {
        // Safety: Ensure text is a string
        const textStr = typeof text === 'string' ? text : (text ? String(text) : '');
        const regex = new RegExp(pattern.source, 'gis');
        const matches: RegExpExecArray[] = [];
        let match;
        while ((match = regex.exec(textStr)) !== null) {
            matches.push(match);
        }
        for (const m of matches) {
            const content = m[1].split(
                /(?:\n\n|\r\n\r\n|Role:|Education|Industry Type|Department|Requirements|Work location|Immediate joiner|Walk-in Details|Note :)/i
            )[0];
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                if (line.toLowerCase().includes('highlighted with') || line.length < 3) continue;
                const splitLine = splitMergedWords(line).join(' ');
                const parts = splitLine.split(/[,|•*■-]/).map(p => p.trim()).filter(p => p.length > 2);
                for (const part of parts) {
                    let score = 0;
                    const lowPart = part.toLowerCase();
                    if (COMMON_SKILLS.some(s => lowPart.includes(s))) score += 5;
                    if (lowPart.includes('support') || lowPart.includes('tools') || lowPart.includes('process')) score += 3;
                    if (lowPart.includes('match') || lowPart.includes('early') || lowPart.includes('score') || lowPart.includes('growth')) score -= 10;
                    if (part.split(/\s+/).length > 5) score -= 15;
                    skillCandidates.push({ text: part, score });
                }
            }
        }
    }

    // Strategy B: global dictionary match
    for (const skill of COMMON_SKILLS) {
        if (textLower.includes(skill)) skillCandidates.push({ text: skill, score: 10 });
    }

    let skills = skillCandidates
        .sort((a, b) => b.score - a.score)
        .map(c => c.text.replace(/[()[\]{}"']/g, '').trim())
        .filter((s, i, self) => isValidSkill(s) && self.indexOf(s) === i)
        .slice(0, 15);

    // Fallback: TF-IDF nouns
    if (skills.length < 5) {
        // Handle ESM/CJS interop for natural.TfIdf
        // @ts-expect-error - natural type definitions are inconsistent between ESM and CJS
        const TfIdfConstructor = natural.TfIdf || natural.default?.TfIdf;
        if (!TfIdfConstructor) {
            throw new Error('natural.TfIdf is not a constructor (check import/interop)');
        }
        const tfidf = new TfIdfConstructor();
        tfidf.addDocument(text);
        const doc = nlp(text);
        const terms = doc.nouns().out('array') as string[];
        const topNouns = Array.from(new Set(terms))
            .filter(t => {
                const low = t.toLowerCase();
                return t.length > 2 && !STOP_WORDS.has(low) &&
                    !locations.some(l => l.toLowerCase() === low) &&
                    !GENERIC_TITLES.has(low);
            })
            .slice(0, 5);
        skills = Array.from(new Set([...skills, ...topNouns]));
    }

    return Array.from(new Set(skills))
        .map(s => s.replace(/[()[\]{}"']/g, '').trim())
        .filter((s, i, self) => isValidSkill(s) && self.indexOf(s) === i)
        .slice(0, 15);
}

// ── Passout years ─────────────────────────────────────────────────────────────

export function extractPassoutYears(text: string): number[] {
    const yearRegex = /\b(202[0-9]|20[0-2][0-9])\b/g;
    return Array.from(new Set((text.match(yearRegex) || []).map(y => parseInt(y))));
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
    const rangMatch = text.match(/(\d+)\s*-\s*(\d+)\s*(?:year|yr)s?/i) ||
                      text.match(/(\d+)\s+to\s+(\d+)\s*(?:year|yr)s?/i);
    if (rangMatch) return { min: parseInt(rangMatch[1]), max: parseInt(rangMatch[2]) };
    const minOnly = text.match(/(\d+)\+?\s*(?:year|yr)s?\s+(?:exp|experience)/i) ||
                    text.match(/(\d+)\+?\s*(?:year|yr)s*(?:exp|experience)/i);
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
