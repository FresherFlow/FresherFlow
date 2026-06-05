import { OpportunityType } from '@fresherflow/types';

export type SharePlatform = 'telegram' | 'linkedin' | 'x' | 'instagram' | 'facebook' | 'other';

const PLATFORM_MEDIUM: Record<SharePlatform, string> = {
    telegram: 'channel',
    linkedin: 'post',
    x: 'post',
    instagram: 'bio',
    facebook: 'post',
    other: 'share',
};

type BuildSocialOpportunityUrlArgs = {
    frontendOrigin: string;
    slug: string;
    platform: SharePlatform;
    type?: OpportunityType;
    campaign?: string;
    source?: string;
    ref?: string;
};

export function buildSocialOpportunityUrl({
    frontendOrigin,
    slug,
    platform,
    type,
    campaign = 'job_share',
    source = 'opportunity_share',
    ref = 'social',
}: BuildSocialOpportunityUrlArgs) {
    let path = `/${slug}`;
    
    if (type === OpportunityType.JOB) path = `/${slug}`;
    else if (type === OpportunityType.INTERNSHIP) path = `/${slug}`;
    else if (type === OpportunityType.WALKIN) path = `/${slug}`;

    const url = new URL(path, frontendOrigin);
    url.searchParams.set('ref', ref);
    url.searchParams.set('source', source);
    url.searchParams.set('utm_source', platform);
    url.searchParams.set('utm_medium', PLATFORM_MEDIUM[platform]);
    url.searchParams.set('utm_campaign', campaign);
    return url.toString();
}
