import { SHARE_BASE_URL } from '@/lib/utils/runtimeConfig';

export type SharePlatform = 'instagram' | 'linkedin' | 'x' | 'telegram' | 'facebook' | 'other';

type ShareLinkOptions = {
    platform?: SharePlatform;
    source?: string;
    medium?: string;
    campaign?: string;
    ref?: string;
};

const PLATFORM_MEDIUM: Record<SharePlatform, string> = {
    instagram: 'bio',
    linkedin: 'post',
    x: 'post',
    telegram: 'channel',
    facebook: 'post',
    other: 'share',
};

function getConfiguredShareBase(): string {
    return process.env.NEXT_PUBLIC_SHARE_BASE_URL || SHARE_BASE_URL;
}

export function buildShareUrl(rawUrl: string, options: ShareLinkOptions = {}) {
    try {
        const url = new URL(rawUrl);
        const configuredShareBase = getConfiguredShareBase();

        try {
            const shareBase = new URL(configuredShareBase);
            // Force social share links onto one canonical host for consistent previews.
            url.protocol = shareBase.protocol;
            url.host = shareBase.host;
        } catch {
            // Ignore invalid share base and keep the source origin.
        }

        const platform = options.platform || 'other';

        url.searchParams.set('ref', options.ref || 'share');
        url.searchParams.set('source', options.source || 'opportunity_share');
        url.searchParams.set('utm_source', platform === 'other' ? 'fresherflow' : platform);
        url.searchParams.set('utm_medium', options.medium || PLATFORM_MEDIUM[platform]);
        url.searchParams.set('utm_campaign', options.campaign || 'opportunity_share');

        return url.toString();
    } catch {
        return rawUrl;
    }
}

/**
 * The canonical, tracking-free URL for a shared page. `buildShareUrl` stamps
 * `ref`/`source`/`utm_*` on the way out; anyone who re-shares a link they
 * received would otherwise copy the previous sharer's campaign params along
 * with it. Returns the input unchanged when it cannot be parsed.
 */
export function getCleanShareUrl(rawUrl: string) {
    try {
        const url = new URL(rawUrl);
        [
            'ref',
            'source',
            'medium',
            'campaign',
            'platform',
            'utm_source',
            'utm_medium',
            'utm_campaign',
        ].forEach((param) => url.searchParams.delete(param));
        return url.toString();
    } catch {
        return rawUrl;
    }
}

export function buildInviteUrl(rawOrigin: string, referralCode: string) {
    try {
        const code = referralCode.toUpperCase();
        const joinHost = process.env.NEXT_PUBLIC_JOIN_WEB_HOST || process.env.JOIN_WEB_HOST;
        if (joinHost) {
            return `https://${joinHost.replace(/^https?:\/\//i, '')}/${code}`;
        }

        const configuredShareBase = getConfiguredShareBase();
        let base = rawOrigin;
        try {
            const shareBase = new URL(configuredShareBase);
            base = shareBase.origin;
        } catch { /* keep rawOrigin */ }

        return `${base}/r/${code}`;
    } catch {
        return rawOrigin;
    }
}
