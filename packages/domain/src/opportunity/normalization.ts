// @fresherflow/domain — Opportunity Data Normalization
// Merged logic from Web and Parser for ultimate consistency.

import type { Opportunity, ParsedJob } from '@fresherflow/types';

// ── Shared Constants ─────────────────────────────────────────────────────────

const MONTH_INDEX: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
};

const CITY_TO_STATE: Record<string, string> = {
    ahmedabad: 'Gujarat',
    bengaluru: 'Karnataka',
    bangalore: 'Karnataka',
    bhopal: 'Madhya Pradesh',
    bhubaneswar: 'Odisha',
    chandigarh: 'Chandigarh',
    chennai: 'Tamil Nadu',
    coimbatore: 'Tamil Nadu',
    delhi: 'Delhi',
    faridabad: 'Haryana',
    gandhinagar: 'Gujarat',
    ghaziabad: 'Uttar Pradesh',
    gurgaon: 'Haryana',
    gurugram: 'Haryana',
    guwahati: 'Assam',
    hyderabad: 'Telangana',
    indore: 'Madhya Pradesh',
    jaipur: 'Rajasthan',
    kanpur: 'Uttar Pradesh',
    kochi: 'Kerala',
    kolkata: 'West Bengal',
    lucknow: 'Uttar Pradesh',
    mumbai: 'Maharashtra',
    mysuru: 'Karnataka',
    nagpur: 'Maharashtra',
    noida: 'Uttar Pradesh',
    patna: 'Bihar',
    pune: 'Maharashtra',
    ranchi: 'Jharkhand',
    surat: 'Gujarat',
    thane: 'Maharashtra',
    trivandrum: 'Kerala',
    thiruvananthapuram: 'Kerala',
    vadodara: 'Gujarat',
    visakhapatnam: 'Andhra Pradesh',
};

// ── Salary Normalization ──────────────────────────────────────────────────────

export interface NormalizedSalary {
    min?: number;
    max?: number;
    period?: 'MONTHLY' | 'YEARLY';
    range?: string;
}

export function normalizeSalary(text: string): NormalizedSalary {
    const textLower = text.toLowerCase();
    const period =
        textLower.includes('per month') || textLower.includes('/ month') ||
        textLower.includes('monthly') || /\bpm\b/.test(textLower)
            ? 'MONTHLY'
            : 'YEARLY';

    // "6-8 LPA"
    const lpaMatch = text.match(/([\d.]+)\s*(?:-|to)\s*([\d.]+)\s*(?:Lac|Lacs|LPA|L\.?P\.?A\.?|P\.A\.)/i);
    if (lpaMatch) {
        const min = parseFloat(lpaMatch[1]);
        const max = parseFloat(lpaMatch[2]);
        return { min, max, period: 'YEARLY', range: `${min}-${max} LPA` };
    }

    // "5 LPA"
    const singleLpaMatch = text.match(/([\d.]+)\s*(?:Lac|Lacs|LPA|L\.?P\.?A\.?)/i);
    if (singleLpaMatch) {
        const val = parseFloat(singleLpaMatch[1]);
        return { min: val, period: 'YEARLY', range: `${val} LPA` };
    }

    // "₹30,000/month"
    const monthlyMatch = text.match(/(?:₹|Rs\.?\s*)?(\d[\d,]+)(?:k)?\s*(?:\/\s*month|per\s*month|pm\b)/i);
    if (monthlyMatch) {
        const raw = monthlyMatch[1].replace(/,/g, '');
        const isK = monthlyMatch[0].toLowerCase().includes('k');
        const val = parseInt(raw) * (isK ? 1000 : 1);
        const kVal = val / 1000;
        return { 
            min: val, 
            period: 'MONTHLY', 
            range: `${Number.isInteger(kVal) ? kVal.toFixed(0) : kVal.toFixed(1)}k/month` 
        };
    }

    return { period: period as 'MONTHLY' | 'YEARLY' };
}

/**
 * Normalizes salary input for display compatibility.
 */
export const normalizeSalaryString = (raw?: string | number | null): string | null => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') {
        if (raw <= 0) return null;
        if (raw >= 100000) {
            const lpa = raw / 100000;
            return `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
        }
        const k = raw / 1000;
        return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k/month`;
    }
    return normalizeSalary(raw).range || null;
};

// ── Location Normalization ───────────────────────────────────────────────────

export interface NormalizedLocation {
    shortLabel: string;
    fullLabel: string;
    cities: string[];
    isRemote: boolean;
}

export const normalizeLocations = (locations?: string[] | null): NormalizedLocation => {
    if (!locations || locations.length === 0) {
        return { shortLabel: 'Remote', fullLabel: 'Remote', cities: [], isRemote: true };
    }

    const rawTokens = locations.flatMap(l => l.split(',')).map(t => t.trim().toLowerCase()).filter(Boolean);
    const REMOTE_ALIASES = ['remote', 'work from home', 'wfh', 'pan india', 'anywhere'];

    if (rawTokens.some(t => REMOTE_ALIASES.includes(t))) {
        return { shortLabel: 'Remote', fullLabel: 'Remote', cities: [], isRemote: true };
    }

    const cities: string[] = [];
    let state: string | undefined;

    rawTokens.forEach(t => {
        const mappedState = CITY_TO_STATE[t];
        const formatted = t.charAt(0).toUpperCase() + t.slice(1);
        if (mappedState) {
            cities.push(formatted);
            if (!state) state = mappedState;
        } else {
            cities.push(formatted);
        }
    });

    const uniqueCities = Array.from(new Set(cities));
    const label = uniqueCities[0] ?? 'Various Locations';

    return {
        shortLabel: uniqueCities.length > 1 ? `${label} +${uniqueCities.length - 1}` : label,
        fullLabel: uniqueCities.join(', '),
        cities: uniqueCities,
        isRemote: false,
    };
};

// ── Date Normalization ────────────────────────────────────────────────────────

function toLocalInputString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
}

export const normalizeExpiry = (text: string): string | undefined => {
    const patterns = [
        /(?:apply\s*by|last\s*date(?:\s*to\s*apply)?|deadline)\s*[:-]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,9}(?:\s+\d{4})?)/i,
        /(?:apply\s*before)\s*[:-]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,9}(?:\s+\d{4})?)/i,
        /(?:apply\s*by|last\s*date|deadline)\s*[:-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (!m) continue;
        const raw = m[1];
        if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(raw)) {
            const parts = raw.replace(/-/g, '/').split('/').map(Number);
            if (parts.length === 3) {
                const [d, mo, y] = parts;
                const year = y < 100 ? 2000 + y : y;
                const date = new Date(year, mo - 1, d, 23, 59, 0, 0);
                if (!Number.isNaN(date.getTime())) return toLocalInputString(date);
            }
            continue;
        }
        
        // Month name parsing
        const cleaned = raw.trim().replace(/(\d+)(st|nd|rd|th)/gi, '$1');
        const dMatch = cleaned.match(/(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?/);
        if (dMatch) {
            const day = Number(dMatch[1]);
            const month = MONTH_INDEX[dMatch[2].toLowerCase()];
            if (Number.isFinite(day) && month !== undefined) {
                const year = dMatch[3] ? Number(dMatch[3]) : new Date().getFullYear();
                const date = new Date(year, month, day, 23, 59, 0, 0);
                return toLocalInputString(date);
            }
        }
    }
    return undefined;
};

/**
 * Legacy Alias: Normalizes salary input for display.
 */
export const normalizeSalaryInput = normalizeSalaryString;

// ── Ingestion Pipeline Alignment ─────────────────────────────────────────────

/**
 * Maps ParsedJob output from extraction layer into a Domain Opportunity layout template.
 */
export function normalizeOpportunity(raw: ParsedJob): Partial<Opportunity> {
    return {
        title: raw.title || '',
        company: raw.company || '',
        requiredSkills: raw.skills || [],
        locations: raw.locations || [],
        workMode: raw.workMode,
        allowedPassoutYears: raw.allowedPassoutYears || [],
        salaryRange: raw.salaryRange,
    };
}
