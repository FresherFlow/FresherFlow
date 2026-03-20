"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTitle = extractTitle;
exports.extractCompany = extractCompany;
exports.extractType = extractType;
exports.extractLocations = extractLocations;
exports.extractSkills = extractSkills;
exports.extractPassoutYears = extractPassoutYears;
exports.extractDegrees = extractDegrees;
exports.extractWorkMode = extractWorkMode;
exports.extractExperience = extractExperience;
exports.extractIncentives = extractIncentives;
exports.extractJobFunction = extractJobFunction;
exports.extractWalkInDetails = extractWalkInDetails;
/**
 * Field extraction functions.
 * Each function takes raw job text and returns one specific field or group.
 */
const types_1 = require("@fresherflow/types");
const compromise_1 = __importDefault(require("compromise"));
const natural = __importStar(require("natural"));
const country_state_city_1 = require("country-state-city");
const heuristics_1 = require("./heuristics");
// ── Title ─────────────────────────────────────────────────────────────────────
function extractTitle(textLines) {
    for (const line of textLines) {
        if (line.length > 10 && !line.toLowerCase().includes('posted') && !line.toLowerCase().includes('reviews')) {
            const cleaned = line.replace(/Mega Walkin Drive-?\s*/i, '').trim();
            if (heuristics_1.TITLE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(cleaned)) &&
                cleaned.split(' ').length >= 2 &&
                cleaned.split(' ').length <= 8) {
                return cleaned;
            }
        }
    }
    return textLines[0];
}
// ── Company ───────────────────────────────────────────────────────────────────
function extractCompany(text) {
    const textLower = text.toLowerCase();
    for (const g of heuristics_1.KNOWN_COMPANIES) {
        if (textLower.includes(g.toLowerCase()))
            return g;
    }
    const doc = (0, compromise_1.default)(text);
    const organizations = doc.organizations().out('array');
    return organizations.length > 0 ? organizations[0] : undefined;
}
// ── Opportunity type ──────────────────────────────────────────────────────────
function extractType(textLower) {
    if (textLower.includes('walkin') || textLower.includes('walk-in') || textLower.includes('venue'))
        return types_1.OpportunityType.WALKIN;
    if (textLower.includes('internship') || textLower.includes('stipend'))
        return types_1.OpportunityType.INTERNSHIP;
    return types_1.OpportunityType.JOB;
}
// ── Locations ─────────────────────────────────────────────────────────────────
function extractLocations(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('pan india') || textLower.includes('across india') || textLower.includes('anywhere in india')) {
        return ['Pan India'];
    }
    const doc = (0, compromise_1.default)(text);
    const rawLocations = doc.places().out('array');
    const validLocations = rawLocations.filter(loc => country_state_city_1.City.getCitiesOfCountry('IN')?.some(c => c.name.toLowerCase() === loc.trim().toLowerCase()));
    const found = [];
    for (const city of heuristics_1.COMMON_CITIES) {
        if (text.includes(city) && !found.includes(city))
            found.push(city);
    }
    if (found.length > 0)
        return Array.from(new Set(found));
    if (validLocations.length > 0)
        return Array.from(new Set(validLocations));
    return Array.from(new Set(rawLocations));
}
// ── Skills ────────────────────────────────────────────────────────────────────
function extractSkills(text, locations = []) {
    const textLower = text.toLowerCase();
    const skillCandidates = [];
    // Strategy A: section-based extraction with scoring
    const sectionPatterns = [
        /(?:Key Skills|Keyskills|Skills)(.*)/is,
        /(?:Technical Skills|Knowledge of|Technical Support)(.*)/is,
        /(?:Key Responsibilities|Responsibilities|Job Description)(.*)/is,
    ];
    for (const pattern of sectionPatterns) {
        const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gis')));
        for (const match of matches) {
            const content = match[1].split(/(?:\n\n|\r\n\r\n|Role:|Education|Industry Type|Department|Requirements|Work location|Immediate joiner|Walk-in Details|Note :)/i)[0];
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            for (const line of lines) {
                if (line.toLowerCase().includes('highlighted with') || line.length < 3)
                    continue;
                const splitLine = (0, heuristics_1.splitMergedWords)(line).join(' ');
                const parts = splitLine.split(/[,|•*■-]/).map(p => p.trim()).filter(p => p.length > 2);
                for (const part of parts) {
                    let score = 0;
                    const lowPart = part.toLowerCase();
                    if (heuristics_1.COMMON_SKILLS.some(s => lowPart.includes(s)))
                        score += 5;
                    if (lowPart.includes('support') || lowPart.includes('tools') || lowPart.includes('process'))
                        score += 3;
                    if (lowPart.includes('match') || lowPart.includes('early') || lowPart.includes('score') || lowPart.includes('growth'))
                        score -= 10;
                    if (part.split(/\s+/).length > 5)
                        score -= 15;
                    skillCandidates.push({ text: part, score });
                }
            }
        }
    }
    // Strategy B: global dictionary match
    for (const skill of heuristics_1.COMMON_SKILLS) {
        if (textLower.includes(skill))
            skillCandidates.push({ text: skill, score: 10 });
    }
    let skills = skillCandidates
        .sort((a, b) => b.score - a.score)
        .map(c => c.text.replace(/()[[\]{}"''']/g, '').trim())
        .filter((s, i, self) => (0, heuristics_1.isValidSkill)(s) && self.indexOf(s) === i)
        .slice(0, 15);
    // Fallback: TF-IDF nouns
    if (skills.length < 5) {
        const tfidf = new natural.TfIdf();
        tfidf.addDocument(text);
        const doc = (0, compromise_1.default)(text);
        const terms = doc.nouns().out('array');
        const topNouns = Array.from(new Set(terms))
            .filter(t => {
            const low = t.toLowerCase();
            return t.length > 2 && !heuristics_1.STOP_WORDS.has(low) &&
                !locations.some(l => l.toLowerCase() === low) &&
                !heuristics_1.GENERIC_TITLES.has(low);
        })
            .slice(0, 5);
        skills = Array.from(new Set([...skills, ...topNouns]));
    }
    return Array.from(new Set(skills))
        .map(s => s.replace(/()[[\]{}"''']/g, '').trim())
        .filter((s, i, self) => (0, heuristics_1.isValidSkill)(s) && self.indexOf(s) === i)
        .slice(0, 15);
}
// ── Passout years ─────────────────────────────────────────────────────────────
function extractPassoutYears(text) {
    const yearRegex = /\b(202[0-9]|20[0-2][0-9])\b/g;
    return Array.from(new Set((text.match(yearRegex) || []).map(y => parseInt(y))));
}
// ── Degrees ───────────────────────────────────────────────────────────────────
function extractDegrees(text) {
    const degrees = [];
    if (/\b(diploma|polytechnic)\b/i.test(text))
        degrees.push('DIPLOMA');
    if (/\b(bachelor|degree|b\.?tech|b\.?e|bsc|b\.?sc|bcom|b\.?com|graduation)\b/i.test(text))
        degrees.push('DEGREE');
    if (/\b(master|pg|post.?graduate|m\.?tech|m\.?e|mca|mba)\b/i.test(text))
        degrees.push('PG');
    if (degrees.length === 0)
        degrees.push('DEGREE');
    return degrees;
}
// ── Work mode ─────────────────────────────────────────────────────────────────
function extractWorkMode(text) {
    if (/\b(fully remote|100% remote|remote.?only|work from home|wfh)\b/i.test(text))
        return types_1.WorkMode.REMOTE;
    if (/\b(hybrid|flexible|remote.?friendly|2.?3 days office|3.?2 days office)\b/i.test(text))
        return types_1.WorkMode.HYBRID;
    return types_1.WorkMode.ONSITE;
}
// ── Experience ────────────────────────────────────────────────────────────────
function extractExperience(text) {
    const rangMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr)s?/i);
    if (rangMatch)
        return { min: parseInt(rangMatch[1]), max: parseInt(rangMatch[2]) };
    const minOnly = text.match(/(\d+)\+?\s*(?:year|yr)s?\s*(?:exp|experience)/i);
    if (minOnly)
        return { min: parseInt(minOnly[1]) };
    return {};
}
// ── Incentives ────────────────────────────────────────────────────────────────
function extractIncentives(text) {
    const m = text.match(/incentives?\s*(?:up to|of)?\s*(?:rs\.?)?\s*([\d,]+(?:\s*to\s*[\d,]+)?)/i);
    return m ? `Rs. ${m[1]}` : undefined;
}
// ── Job function ──────────────────────────────────────────────────────────────
function extractJobFunction(textLower) {
    for (const kw of ['banking', 'sales', 'engineering', 'finance', 'marketing', 'hr', 'support', 'operations', 'customer success']) {
        if (textLower.includes(kw))
            return kw.charAt(0).toUpperCase() + kw.slice(1);
    }
    return undefined;
}
function extractWalkInDetails(text, textLines) {
    const result = {};
    const drMatch = text.match(/(\d+(?:st|nd|rd|th)?(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)?\s*(?:to|-)\s*\d+(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)/i);
    if (drMatch)
        result.dateRange = drMatch[1].trim();
    const trMatch = text.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)\s*(?:to|-)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM))/i);
    if (trMatch)
        result.timeRange = trMatch[1].trim();
    const mapMatch = text.match(/https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl)\/\S+/i);
    if (mapMatch)
        result.venueLink = mapMatch[0];
    const venueMatch = text.match(/(?:Venue|Location|Address):\s*([^\n\r]+)/i);
    if (venueMatch) {
        result.venueAddress = venueMatch[1].trim();
    }
    else {
        const idx = textLines.findIndex(l => l.toLowerCase().includes('time and venue'));
        if (idx !== -1 && textLines[idx + 2])
            result.venueAddress = textLines[idx + 2];
    }
    return result;
}
