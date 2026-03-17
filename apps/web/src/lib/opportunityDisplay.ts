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
    value.replace(/,/g, '').replace(/\s+/g, ' ').trim();

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

    const lpaRangeMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)/i);
    if (lpaRangeMatch) {
        return `${lpaRangeMatch[1]}-${lpaRangeMatch[2]} LPA`;
    }

    const lpaMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)/i);
    if (lpaMatch) {
        const lpa = Number.parseFloat(lpaMatch[1]);
        return Number.isNaN(lpa) ? null : `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa} LPA`;
    }

    const kRangeMatch = value.match(/(\d+(?:\.\d+)?)(?:k)?\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*k(?:\s*\/?\s*(?:month|mo|monthly))?/i);
    if (kRangeMatch) {
        return `${kRangeMatch[1]}-${kRangeMatch[2]}k/month`;
    }

    const kMatch = value.match(/(\d+(?:\.\d+)?)\s*k(?:\s*\/?\s*(?:month|mo|monthly))?/i);
    if (kMatch) {
        const amount = Number.parseFloat(kMatch[1]);
        return Number.isNaN(amount) ? null : `${amount % 1 === 0 ? amount.toFixed(0) : amount}k/month`;
    }

    const numericMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
    if (numericMatch) {
        const min = Number.parseFloat(numericMatch[1]);
        const max = Number.parseFloat(numericMatch[2]);
        const monthlyHint = /month|monthly|\/\s*mo|per\s*month/i.test(value);
        if (monthlyHint) {
            return `${normalizeMonthly(min).replace('/month', '')}-${normalizeMonthly(max)}`;
        }
        return `${normalizeLpa(min).replace(' LPA', '')}-${normalizeLpa(max)}`;
    }

    const numeric = Number.parseFloat(value.replace(/[^\d.]/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) return null;

    const monthlyHint = /month|monthly|\/\s*mo|per\s*month/i.test(value);
    if (monthlyHint) return normalizeMonthly(numeric);
    return numeric >= 100000 ? normalizeLpa(numeric) : normalizeMonthly(numeric);
};

export const getOpportunityDisplaySalary = (opportunity: Opportunity): string | null => {
    // If salaryRange is already a human-readable string (e.g., "3 LPA", "6-8 LPA", "25k/month"),
    // prefer it directly — it was set by admin and is the source of truth.
    const rawRange = opportunity.salaryRange || opportunity.stipend;
    if (rawRange && typeof rawRange === 'string') {
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
            if (minVal <= 0 && maxVal <= 0 && opportunity.type === 'INTERNSHIP') return 'Unpaid';
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
    const cityLabel = primaryCity
        ? dedupedCities.length > 1
            ? `${primaryCity} +${dedupedCities.length - 1}`
            : primaryCity
        : undefined;

    const locationParts = [primaryCity, state, country].filter(Boolean) as string[];
    const fullLabel = dedupedCities.length > 1
        ? `${locationParts.join(', ')} (+${dedupedCities.length - 1} more)`
        : locationParts.join(', ');

    return {
        shortLabel: cityLabel
            ? state && dedupedCities.length === 1
                ? `${cityLabel}, ${state}`
                : cityLabel
            : state || country || rawTokens[0] || 'Remote',
        fullLabel: fullLabel || rawTokens.join(', ') || 'Remote',
        city: primaryCity,
        state,
        country: country || 'India',
        cities: dedupedCities,
        isRemote: false,
    };
};
