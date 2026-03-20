import { getStatusLabel } from '@/features/admin/opportunities/listUtils';
import { getOpportunityPath } from '@fresherflow/domain';
import { Opportunity, OpportunityType } from '@fresherflow/types';

export const getStatusBadgeClass = (opp: Opportunity & { expiredAt?: string | Date | null; deletedAt?: string | Date | null }) => {
    const label = getStatusLabel(opp);
    if (label === 'DELETED') return 'bg-slate-100 text-slate-700 ring-slate-300';
    if (label === 'EXPIRED') return 'bg-orange-50 text-orange-700 ring-orange-600/10';
    if (label === 'ARCHIVED') return 'bg-rose-50 text-rose-700 ring-rose-600/10';
    if (label === 'LIVE') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    return 'bg-slate-50 text-slate-600 ring-slate-500/10';
};

export const getPublicOpportunityHref = (opp: { id: string; slug?: string | null; type?: Opportunity['type'] }) =>
    getOpportunityPath(opp.type as OpportunityType, opp.slug || opp.id);

export const getPublicOpportunityUrl = (opp: { id: string; slug?: string | null; type?: Opportunity['type'] }) => {
    const configuredOrigin =
        process.env.NEXT_PUBLIC_SITE_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || 'https://fresherflow.in';
    const origin = /localhost|127\.0\.0\.1/i.test(configuredOrigin)
        ? 'https://fresherflow.in'
        : configuredOrigin;
    return `${origin}${getPublicOpportunityHref(opp)}`;
};

export type SocialOpportunity = Pick<Opportunity, 'id' | 'slug' | 'type' | 'title' | 'company' | 'locations' | 'allowedPassoutYears' | 'allowedCourses' | 'allowedDegrees'>;

export const getEducationSummary = (opp: SocialOpportunity) => {
    const courses = (opp.allowedCourses || []).map((item) => String(item).trim()).filter(Boolean);
    if (courses.length > 0) return courses.slice(0, 3).join(', ');
    const degrees = (opp.allowedDegrees || []).map((item) => String(item).trim()).filter(Boolean);
    if (degrees.length > 0) return degrees.join(', ');
    return 'Any Graduate';
};

export const buildSocialCaption = (opp: SocialOpportunity) => {
    const normalizedLocations = (opp.locations || []).map((value: string) => String(value).trim()).filter(Boolean);
    const locationLine = normalizedLocations.length > 1 ? normalizedLocations.join(' | ') : (normalizedLocations[0] || 'Remote');
    const years = Array.isArray(opp.allowedPassoutYears)
        ? [...opp.allowedPassoutYears].filter((year: number) => Number.isFinite(year)).sort((a: number, b: number) => a - b)
        : [];
    const batch = years.length > 0 ? years.join(', ') : 'Any';
    const locationTag = normalizedLocations.length === 1
        ? `#${normalizedLocations[0].replace(/[^a-zA-Z0-9]/g, '')}Jobs`
        : '';
    const hashtags = ['#FresherJobs', locationTag, '#FresherFlow'].filter(Boolean).join(' ');

    return [
        `${opp.title} - at ${opp.company}`,
        `location: ${locationLine}`,
        '',
        `Batch: ${batch}`,
        `Education: ${getEducationSummary(opp)}`,
        '',
        `Apply: ${getPublicOpportunityUrl(opp)}`,
        '',
        hashtags,
    ].join('\n');
};





