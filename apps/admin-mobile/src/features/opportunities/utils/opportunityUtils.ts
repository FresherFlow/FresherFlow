import type { Opportunity } from '@fresherflow/types';

export const isOpportunityExpired = (opp: { expiresAt?: string | Date | null; expiredAt?: string | Date | null }): boolean => {
    if (opp.expiredAt) return true;
    if (!opp.expiresAt) return false;
    return new Date(opp.expiresAt).getTime() <= Date.now();
};

export const getStatusLabel = (
    opp: Opportunity & { expiredAt?: string | Date | null; deletedAt?: string | Date | null },
): 'DELETED' | 'ARCHIVED' | 'EXPIRED' | 'LIVE' | string => {
    if (opp.deletedAt) return 'DELETED';
    if (opp.status === 'ARCHIVED') return 'ARCHIVED';
    if (isOpportunityExpired(opp)) return 'EXPIRED';
    if (opp.status === 'PUBLISHED') return 'LIVE';
    return opp.status;
};

export const getOpportunityStatusColor = (status: string) => {
    switch (status) {
        case 'DELETED':
            return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' }; // Slate
        case 'EXPIRED':
            return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' }; // Orange
        case 'ARCHIVED':
            return { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' }; // Rose / Pink
        case 'LIVE':
        case 'PUBLISHED':
            return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }; // Emerald / Green
        case 'DRAFT':
            return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' }; // Light Slate
        default:
            return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
    }
};

export type SocialOpportunity = Pick<
    Opportunity,
    'id' | 'slug' | 'type' | 'title' | 'company' | 'locations' | 'allowedPassoutYears' | 'allowedCourses' | 'allowedDegrees'
>;

export const getEducationSummary = (opp: SocialOpportunity): string => {
    const courses = (opp.allowedCourses || []).map((item) => String(item).trim()).filter(Boolean);
    if (courses.length > 0) return courses.slice(0, 3).join(', ');
    const degrees = (opp.allowedDegrees || []).map((item) => String(item).trim()).filter(Boolean);
    if (degrees.length > 0) return degrees.join(', ');
    return 'Any Graduate';
};

export function getTypePrefix(type?: string): string {
    if (!type) return '/opportunities';
    const t = type.toUpperCase();
    if (t === 'JOB') return '/jobs';
    if (t === 'INTERNSHIP') return '/internships';
    if (t === 'WALKIN') return '/walk-ins';
    return '/opportunities';
}

export const getPublicOpportunityUrl = (opp: { id: string; slug?: string | null; type?: Opportunity['type'] }): string => {
    const prefix = getTypePrefix(opp.type);
    const suffix = opp.slug || opp.id;
    return `https://fresherflow.in${prefix}/${suffix}`;
};

export const buildSocialCaption = (opp: SocialOpportunity): string => {
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
