import type { Opportunity } from '@fresherflow/types';

const HIDDEN_SALARY_PATTERNS = [
    /not\s*disclosed/i,
    /as\s+per\s+company/i,
    /as\s+per\s+industry/i,
    /industry\s+standard/i,
    /best\s+in\s+industry/i,
    /negotiable/i,
];

const INDIA_ALIASES = new Set(['india', 'bharat']);
const REMOTE_ALIASES = new Set([
    'remote',
    'work from home',
    'wfh',
    'pan india',
    'anywhere',
]);

const STATE_ALIASES = new Set([
    'andhra pradesh',
    'arunachal pradesh',
    'assam',
    'bihar',
    'chhattisgarh',
    'goa',
    'gujarat',
    'haryana',
    'himachal pradesh',
    'jharkhand',
    'karnataka',
    'kerala',
    'madhya pradesh',
    'maharashtra',
    'manipur',
    'meghalaya',
    'mizoram',
    'nagaland',
    'odisha',
    'punjab',
    'rajasthan',
    'sikkim',
    'tamil nadu',
    'telangana',
    'tripura',
    'uttar pradesh',
    'uttarakhand',
    'west bengal',
    'andaman and nicobar islands',
    'chandigarh',
    'dadra and nagar haveli and daman and diu',
    'delhi',
    'jammu and kashmir',
    'ladakh',
    'lakshadweep',
    'puducherry',
]);

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

type SalaryPrimitive = string | number | null | undefined;

export interface ParsedOpportunityLocation {
    shortLabel: string;
    fullLabel: string;
    city?: string;
    state?: string;
    country?: string;
    cities: string[];
    isRemote: boolean;
}

const toTitleCase = (value: string): string =>
    value
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');

const sanitizeSalaryToken = (value: string): string =>
    value.replace(/,/g, '').replace(/₹|rs\.?|inr/gi, '').replace(/\s+/g, ' ').trim();

const normalizeLpa = (value: number): string => {
    const lpa = Number((value / 100000).toFixed(1));
    return `${Number.isInteger(lpa) ? lpa.toFixed(0) : lpa} LPA`;
};

const normalizeMonthly = (value: number): string => {
    if (value < 1000) return `${Math.round(value)}/month`;
    const kVal = value / 1000;
    return `${Number.isInteger(kVal) ? kVal.toFixed(0) : kVal.toFixed(1)}k/month`;
};

export const normalizeSalaryInput = (raw?: SalaryPrimitive): string | null => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') {
        if (raw <= 0) return null;
        return raw >= 100000 ? normalizeLpa(raw) : normalizeMonthly(raw);
    }

    const value = sanitizeSalaryToken(raw);
    if (!value) return null;
    if (HIDDEN_SALARY_PATTERNS.some((pattern) => pattern.test(value))) return null;

    const lpaRangeMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)/i);
    if (lpaRangeMatch) {
        return `${lpaRangeMatch[1]}-${lpaRangeMatch[2]} LPA`;
    }

    const lpaMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)/i);
    if (lpaMatch) {
        const lpa = Number.parseFloat(lpaMatch[1]);
        return Number.isNaN(lpa) ? null : `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa} LPA`;
    }

    const kRangeMatch = value.match(/(\d+(?:\.\d+)?)(?:k)?\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)\s*k(?:\s*\/?\s*(?:month|mo|monthly))?/i);
    if (kRangeMatch) {
        return `${kRangeMatch[1]}-${kRangeMatch[2]}k/month`;
    }

    const kMatch = value.match(/(\d+(?:\.\d+)?)\s*k(?:\s*\/?\s*(?:month|mo|monthly))?/i);
    if (kMatch) {
        const amount = Number.parseFloat(kMatch[1]);
        return Number.isNaN(amount) ? null : `${amount % 1 === 0 ? amount.toFixed(0) : amount}k/month`;
    }

    const numericMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)/);
    if (numericMatch) {
        const min = Number.parseFloat(numericMatch[1]);
        const max = Number.parseFloat(numericMatch[2]);
        let monthlyHint = /month|monthly|\/\s*mo|per\s*month/i.test(value);
        
        // Auto-detect monthly for government/generic ranges without LPA hint
        const hasLpaHint = /lpa|lac|lakh/i.test(value);
        if (!monthlyHint && !hasLpaHint) {
             if (min >= 5000 && min <= 300000) {
                 monthlyHint = true;
             }
        }

        if (monthlyHint) {
            return `${normalizeMonthly(min).replace('/month', '')}-${normalizeMonthly(max)}`;
        }
        return `${normalizeLpa(min).replace(' LPA', '')}-${normalizeLpa(max)}`;
    }

    // Safely extract the first standalone number instead of stripping all non-digits
    const firstNumMatch = value.match(/(?:\D|^)(\d+(?:\.\d+)?)(?:\D|$)/);
    if (!firstNumMatch) return null;
    const numeric = Number.parseFloat(firstNumMatch[1]);
    
    if (Number.isNaN(numeric) || numeric <= 0) return null;

    let monthlyHint = /month|monthly|\/\s*mo|per\s*month/i.test(value);
    const hasLpaHint = /lpa|lac|lakh/i.test(value);
    
    if (!monthlyHint && !hasLpaHint) {
         if (numeric >= 5000 && numeric <= 300000) {
             monthlyHint = true;
         }
    }

    if (monthlyHint) return normalizeMonthly(numeric);
    return numeric >= 100000 ? normalizeLpa(numeric) : normalizeMonthly(numeric);
};

export const getOpportunityDisplaySalary = (opportunity: Opportunity): string | null => {
    // If salaryRange is already a human-readable string (e.g., "3 LPA", "6-8 LPA", "25k/month"),
    // prefer it directly — it was set by admin and is the source of truth.
    const rawRange = opportunity.salaryRange || opportunity.stipend;
    if (rawRange && typeof rawRange === 'string') {
        const isGovt = Boolean((opportunity as any).governmentJobDetails) || (opportunity as any).type === 'GOVERNMENT';
        if (isGovt) {
            let cleaned = rawRange;
            
            // If the parenthesis actually contains the monetary value (₹, Rs), extract it!
            const moneyInParens = cleaned.match(/\(([^)]*(?:₹|Rs|LPA|lakh|\d{4,})[^)]*)\)/i);
            
            // But only extract it if the outside DOES NOT contain the monetary value, 
            // OR if the inside explicitly has currency symbols while the outside doesn't.
            const outsideText = cleaned.replace(/\s*\([^)]*\)/g, '');
            const outsideHasMoney = /₹|Rs|\d{4,}/i.test(outsideText);
            const insideHasCurrency = moneyInParens ? /₹|Rs|LPA|lakh/i.test(moneyInParens[1]) : false;

            if (moneyInParens && insideHasCurrency && !/₹|Rs/i.test(outsideText)) {
                cleaned = moneyInParens[1].trim(); // Extract "Rs. 25,500 - Rs. 1,51,100"
            } else {
                cleaned = outsideText.trim(); // Strip "(Level 10 Pay Matrix)"
            }

            // If it's a compound string with slashes, take the part with the salary
            if (cleaned.includes('/')) {
                const parts = cleaned.split('/');
                const moneyPart = parts.find(p => /₹|Rs|\d{4,}/i.test(p));
                if (moneyPart) cleaned = moneyPart.trim();
            }

            if (cleaned.length > 42) {
                cleaned = cleaned.substring(0, 39).trim() + '...';
            }
            return cleaned;
        }
        const normalized = normalizeSalaryInput(rawRange);
        if (normalized) return normalized;
    }

    // Otherwise fall back to numeric salaryMin / salaryMax fields
    const salaryPeriod = opportunity.salaryPeriod === 'MONTHLY' ? 'MONTHLY' : 'YEARLY';
    const sMin = opportunity.salaryMin ?? opportunity.salary?.min ?? null;
    const sMax = opportunity.salaryMax ?? opportunity.salary?.max ?? null;

    if (sMin !== null || sMax !== null) {
        const minVal = sMin ?? null;
        const maxVal = sMax ?? null;

        if (minVal !== null && maxVal !== null) {
            if (minVal <= 0 && maxVal <= 0) {
                if (opportunity.type === 'INTERNSHIP') return 'Unpaid';
                return 'Not disclosed';
            }

            if (minVal === maxVal) return salaryPeriod === 'MONTHLY' ? normalizeMonthly(minVal) : normalizeLpa(minVal);

            if (salaryPeriod === 'MONTHLY') {
                return `${normalizeMonthly(minVal).replace('/month', '')}-${normalizeMonthly(maxVal)}`;
            } else {
                return `${normalizeLpa(minVal).replace(' LPA', '')}-${normalizeLpa(maxVal)}`;
            }
        }
        if (minVal !== null) return salaryPeriod === 'MONTHLY' ? normalizeMonthly(minVal) : normalizeLpa(minVal);
        if (maxVal !== null) return `Up to ${salaryPeriod === 'MONTHLY' ? normalizeMonthly(maxVal) : normalizeLpa(maxVal)}`;
    }

    return null;
};

const splitLocationTokens = (locations: string[]): string[] => {
    const tokens = locations
        .flatMap((value) => value.split(','))
        .map((token) => token.trim())
        .filter(Boolean);

    return Array.from(new Set(tokens));
};

export const parseOpportunityLocation = (locations?: string[] | null): ParsedOpportunityLocation => {
    const source = Array.isArray(locations) ? locations.filter(Boolean) : [];
    if (source.length === 0) {
        return {
            shortLabel: 'Remote',
            fullLabel: 'Remote',
            country: 'India',
            cities: [],
            isRemote: true,
        };
    }

    const rawTokens = splitLocationTokens(source);
    const normalizedTokens = rawTokens.map((token) => token.toLowerCase());

    if (normalizedTokens.some((token) => REMOTE_ALIASES.has(token))) {
        return {
            shortLabel: 'Remote',
            fullLabel: 'Remote',
            country: 'India',
            cities: [],
            isRemote: true,
        };
    }

    let country: string | undefined;
    let state: string | undefined;
    const cities: string[] = [];

    rawTokens.forEach((token) => {
        const normalized = token.toLowerCase();
        if (INDIA_ALIASES.has(normalized)) {
            country = 'India';
            return;
        }

        if (STATE_ALIASES.has(normalized)) {
            state = toTitleCase(token);
            return;
        }

        const mappedState = CITY_TO_STATE[normalized];
        if (mappedState) {
            cities.push(toTitleCase(token));
            if (!state) state = mappedState;
            return;
        }

        cities.push(toTitleCase(token));
    });

    const dedupedCities = Array.from(new Set(cities));
    const primaryCity = dedupedCities[0];
    const cityLabel = dedupedCities.length > 0
        ? dedupedCities.join(', ')
        : undefined;

    let shortLabel = 'Remote';
    if (cityLabel) {
        if (dedupedCities.length === 1) {
            shortLabel = state ? `${primaryCity}, ${state}` : primaryCity;
        } else if (dedupedCities.length === 2) {
            shortLabel = dedupedCities.join(', ');
        } else {
            shortLabel = `${primaryCity} +${dedupedCities.length - 1}`;
        }
    } else {
        shortLabel = state || country || rawTokens[0] || 'Remote';
    }

    return {
        shortLabel,
        fullLabel: cityLabel ? [cityLabel, state, country].filter(Boolean).join(', ') : (state || country || 'Remote'),
        city: primaryCity,
        state,
        country: country || 'India',
        cities: dedupedCities,
        isRemote: false,
    };
};
