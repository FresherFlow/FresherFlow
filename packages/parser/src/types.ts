import { SalaryPeriod, ParsedJob } from '@fresherflow/types';

/** Shared output types for the @fresherflow/parser package. */
export type { ParsedJob };

export interface NormalizedSalary {
    min?: number;
    max?: number;
    period: SalaryPeriod;
    /** Human-readable e.g. "6-8 LPA" or "₹25k/month" */
    range?: string;
}
