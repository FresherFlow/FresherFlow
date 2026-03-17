/**
 * Normalization functions — convert raw strings into typed, structured values.
 */
import { NormalizedSalary } from './types';
import { SalaryPeriod } from '@fresherflow/types';
import { MONTH_INDEX } from './heuristics';

// ── Date / datetime helpers ───────────────────────────────────────────────────

function toLocalInputString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().slice(0, 16);
}

function parseDayMonth(input: string): Date | null {
    const cleaned = input.trim().replace(/(\d+)(st|nd|rd|th)/gi, '$1');
    const match = cleaned.match(/(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?/);
    if (!match) return null;
    const day = Number(match[1]);
    const month = MONTH_INDEX[match[2].toLowerCase()];
    if (!Number.isFinite(day) || month === undefined) return null;
    const now = new Date();
    const year = match[3] ? Number(match[3]) : now.getFullYear();
    const date = new Date(year, month, day, 23, 59, 0, 0);
    if (!match[3]) {
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - 14);
        if (date < threshold) date.setFullYear(year + 1);
    }
    return date;
}

// ── Salary ────────────────────────────────────────────────────────────────────

/**
 * Normalize a salary string or extract structured salary from raw job text.
 * Handles "6-8 LPA", "₹30,000/month", "Rs 25k per month", etc.
 */
export function normalizeSalary(text: string): NormalizedSalary {
    const textLower = text.toLowerCase();
    const period: SalaryPeriod =
        textLower.includes('per month') || textLower.includes('/ month') ||
        textLower.includes('monthly') || /\bpm\b/.test(textLower)
            ? SalaryPeriod.MONTHLY
            : SalaryPeriod.YEARLY;

    const lpaMatch = text.match(/([\d.]+)\s*(?:-|to)\s*([\d.]+)\s*(?:Lac|Lacs|LPA|L\.?P\.?A\.?|P\.A\.)/i);
    if (lpaMatch) {
        const min = parseFloat(lpaMatch[1]);
        const max = parseFloat(lpaMatch[2]);
        return { min, max, period: SalaryPeriod.YEARLY, range: `${min}-${max} LPA` };
    }

    const singleLpaMatch = text.match(/([\d.]+)\s*(?:Lac|Lacs|LPA|L\.?P\.?A\.?)/i);
    if (singleLpaMatch) {
        const val = parseFloat(singleLpaMatch[1]);
        return { min: val, period: SalaryPeriod.YEARLY, range: `${val} LPA` };
    }

    const monthlyMatch = text.match(/(?:₹|Rs\.?\s*)?(\d[\d,]+)(?:k)?\s*(?:\/\s*month|per\s*month|pm\b)/i);
    if (monthlyMatch) {
        const raw = monthlyMatch[1].replace(/,/g, '');
        const isK = monthlyMatch[0].toLowerCase().includes('k');
        const val = parseInt(raw) * (isK ? 1000 : 1);
        const kVal = val / 1000;
        return { 
            min: val, 
            period: SalaryPeriod.MONTHLY, 
            range: `${Number.isInteger(kVal) ? kVal.toFixed(0) : kVal.toFixed(1)}k/month` 
        };
    }

    return { period };
}

// ── Expiry date ───────────────────────────────────────────────────────────────

/**
 * Extract and normalize an application deadline date from raw job text.
 * Returns an ISO datetime string (local, no timezone suffix) if found.
 */
export function normalizeExpiry(text: string): string | undefined {
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
        const parsed = parseDayMonth(raw);
        if (parsed) return toLocalInputString(parsed);
    }
    return undefined;
}
