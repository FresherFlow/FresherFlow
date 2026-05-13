import { Opportunity } from '@fresherflow/types';
import { SiteMode } from './siteMode';

export function isGovernmentOpportunity(opportunity: Partial<Opportunity> | null | undefined): boolean {
    if (!opportunity) return false;
    return Boolean(opportunity.governmentJobDetails);
}

export function matchesOpportunitySiteMode(
    opportunity: Partial<Opportunity> | null | undefined,
    mode: SiteMode
): boolean {
    const isGovt = isGovernmentOpportunity(opportunity);
    return mode === 'govt' ? isGovt : !isGovt;
}

export function filterOpportunitiesForSiteMode<T extends Partial<Opportunity>>(
    opportunities: T[],
    mode: SiteMode
): T[] {
    return opportunities.filter((opportunity) => matchesOpportunitySiteMode(opportunity, mode));
}
