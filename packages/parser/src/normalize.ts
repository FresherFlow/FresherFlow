/**
 * Normalization functions — convert raw strings into typed, structured values.
 * Now delegates to @fresherflow/domain to ensure consistency.
 */
import { 
    normalizeSalary as domainNormalizeSalary, 
    normalizeExpiry as domainNormalizeExpiry 
} from '@fresherflow/domain';
import { NormalizedSalary } from './types.js';
import { SalaryPeriod } from '@fresherflow/types';

/**
 * Normalize a salary string or extract structured salary from raw job text.
 */
export function normalizeSalary(text: string): NormalizedSalary {
    const result = domainNormalizeSalary(text);
    return {
        min: result.min,
        max: result.max,
        period: result.period as unknown as SalaryPeriod,
        range: result.range,
    };
}

/**
 * Extract and normalize an application deadline date from raw job text.
 */
export function normalizeExpiry(text: string): string | undefined {
    return domainNormalizeExpiry(text);
}
