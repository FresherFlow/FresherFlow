import { JobType, CompensationInterval, getCompensationInterval, getJobTypeFromString } from '../../../base/models/index.js';

/**
 * Get job types from Indeed attribute list.
 */
export function getJobType(attributes: { label: string; key: string }[]): JobType[] | null {
  if (!attributes) return null;
  const types: JobType[] = [];
  for (const attr of attributes) {
    if (attr.key?.startsWith('job-types')) {
      const jt = getJobTypeFromString(attr.label);
      if (jt) types.push(jt);
    }
  }
  return types.length > 0 ? types : null;
}

/**
 * Extract compensation from Indeed API data.
 */
export function getCompensation(compensation: any): {
  interval: CompensationInterval | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: string | null;
} | null {
  if (!compensation) return null;

  const currencyCode = compensation.currencyCode ?? 'USD';

  // Try base salary first, then estimated
  const baseSalary = compensation.baseSalary ?? compensation.estimated?.baseSalary;
  if (!baseSalary) return null;

  const range = baseSalary.range;
  if (!range) return null;

  const interval = baseSalary.unitOfWork
    ? getCompensationInterval(baseSalary.unitOfWork)
    : null;

  return {
    interval,
    minAmount: range.min ?? null,
    maxAmount: range.max ?? null,
    currency: currencyCode,
  };
}

/**
 * Determine if an Indeed job is remote from attributes.
 */
export function isJobRemote(attributes: { label: string; key: string }[]): boolean {
  if (!attributes) return false;
  return attributes.some((attr) => attr.key === 'remotejob');
}
