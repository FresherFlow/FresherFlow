import { Opportunity, SalaryPeriod } from '@fresherflow/types';

/**
 * Formats salary or stipend based on period and available values.
 * Standardizes output to include "LPA" for yearly and "/month" for monthly.
 */
export const formatSalary = (opportunity: Opportunity): string | null => {
    const { salaryRange, salaryMin, salaryMax, salaryPeriod, stipend } = opportunity;
    
    // If it's an internship and stipend string exists, use it as primary
    if (opportunity.type === 'INTERNSHIP' && stipend) {
        if (!stipend.toLowerCase().includes('month') && !stipend.toLowerCase().includes('/m')) {
            return `${stipend}/month`;
        }
        return stipend;
    }

    const isYearly = salaryPeriod === SalaryPeriod.YEARLY || !salaryPeriod;

    // Helper to format numeric values (e.g., 600000 -> 6, 25000 -> 25k)
    const formatValue = (v: number) => {
        if (isYearly) {
            // Assume if > 10000 it's absolute, otherwise it's already in LPA
            const lpa = v >= 10000 ? v / 100000 : v;
            return lpa.toString().replace(/\.0$/, '');
        } else {
            // Monthly: 25000 -> 25k, 25 -> 25k (if we assume simplified entry)
            // But let's stay safe: only divide if >= 1000
            if (v >= 1000) return `${(v / 1000).toString().replace(/\.0$/, '')}k`;
            return v.toString();
        }
    };

    // 1. Prioritize numeric min/max if available for consistent formatting
    if (salaryMin || salaryMax) {
        let display = '';
        if (salaryMin && salaryMax && salaryMin !== salaryMax) {
            display = `${formatValue(salaryMin)}-${formatValue(salaryMax)}`;
        } else {
            display = formatValue(salaryMin || salaryMax || 0);
        }
        return isYearly ? `${display} LPA` : `${display}/month`;
    }

    // 2. Fallback to existing salaryRange string
    if (salaryRange) {
        const lower = salaryRange.toLowerCase();
        // If it already has units, return it
        if (lower.includes('lpa') || lower.includes('month') || lower.includes('/m')) {
            return salaryRange;
        }
        // Otherwise append based on period
        return isYearly ? `${salaryRange} LPA` : `${salaryRange}/month`;
    }

    return null;
};
