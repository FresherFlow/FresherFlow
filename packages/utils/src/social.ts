/** Explicit LinkedIn link-card fields. Buffer's LinkAttachmentInput takes
 *  `url: String!` plus nullable title/description/thumbnail — sending them
 *  explicitly beats relying on the scraper. */
export interface LinkedInCard {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
}

export interface LinkedInCardSource {
    id?: string;
    title?: string;
    company?: string;
    locations?: string[];
}

/** Builds the card from a posted opportunity. The thumbnail is the
 *  pre-generated static OG image (`/og/<opportunityId>.png`) the web app
 *  already emits as og:image. Skips the thumbnail unless the CDN base is a
 *  real https origin, so dev/staging values degrade to scraper fallback.
 *  Returns undefined when there is nothing factual to send. */
export function buildLinkedInCard(
    opportunity: LinkedInCardSource | null | undefined,
    cdnBaseUrl?: string,
): LinkedInCard | undefined {
    const title = opportunity?.title?.trim() ?? '';
    const company = opportunity?.company?.trim() ?? '';
    if (!title && !company) return undefined;

    const where = (opportunity?.locations ?? [])
        .filter((loc) => typeof loc === 'string' && loc.trim())
        .slice(0, 3)
        .join(' / ') || 'India';

    const card: LinkedInCard = {
        title: `${title}${company ? ` @ ${company}` : ''}`.slice(0, 200),
        description: `${title || 'Opening'}${company ? ` at ${company}` : ''} (${where}). Application link is in the post.`.slice(0, 300),
    };

    const base = (cdnBaseUrl ?? '').replace(/\/+$/, '');
    const id = opportunity?.id?.trim() ?? '';
    if (base.startsWith('https://') && id) {
        card.thumbnailUrl = `${base}/og/${id}.png`;
    }
    return card;
}

// ─── Post captions: ONE voice for every bot ─────────────────────────────
// Plain human sentences, no emoji, no hashtags. Every line answers a seeker
// question: what role, where, and WHERE the link goes. Naming the destination
// (Greenhouse, Workday, company website) sets the expectation before the tap.
// This is the voice posting on LinkedIn/X/Telegram today; every caption
// builder in the repo delegates here so the format can never drift again.

export interface SocialCaptionJob {
    title: string;
    applyLink: string;
    company?: string;
    locations?: string[];
}

export type SocialCaptionPlatform = 'x' | 'linkedin' | 'telegram' | 'facebook';

function captionLocationText(job: SocialCaptionJob): string {
    const locs = (job.locations || []).map((l) => String(l).trim()).filter(Boolean);
    if (locs.length === 0) return '';
    return locs.slice(0, 2).join(' / ') + (locs.length > 2 ? ' +' : '');
}

function captionHeadline(job: SocialCaptionJob): string {
    const company = (job.company || '').trim();
    const title = job.title.trim();
    const loc = captionLocationText(job);
    const where = loc ? ` (${loc})` : '';
    return company ? `${company} is hiring ${title}${where}` : `Hiring ${title}${where}`;
}

function captionTruncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 3).trimEnd() + '...' : text;
}

/** X counts every URL as a fixed 23 characters (t.co wrapping). */
function captionXLength(text: string): number {
    return text.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;
}

/** Builds the post text for one job on one platform.
 *  `applyDestination` is the caller-resolved ATS label ("Greenhouse",
 *  "the company website", or "" for a bare "Apply:"). Detection stays with
 *  the caller (parser-owned knowledge); this function is presentation only
 *  and never touches the network. */
export function buildSocialCaption(
    job: SocialCaptionJob,
    platform: SocialCaptionPlatform,
    applyDestination = '',
): string {
    const link = job.applyLink;
    const apply = applyDestination ? `Apply on ${applyDestination}:` : 'Apply:';

    if (platform === 'x') {
        const full = `${captionHeadline(job)}\n\n${apply}\n${link}`;
        if (captionXLength(full) <= 280) return full;
        const company = (job.company || '').trim();
        const title = job.title.trim();
        const noLoc = `${company ? `${company} is hiring ${title}` : `Hiring ${title}`}\n\n${apply}\n${link}`;
        if (captionXLength(noLoc) <= 280) return noLoc;
        return `${company ? `${company} is hiring ${captionTruncate(title, 60)}` : `Hiring ${captionTruncate(title, 60)}`}\n${apply}\n${link}`;
    }

    const company = (job.company || '').trim();
    const hook = company ? `${company} is hiring ${job.title.trim()}` : `Hiring ${job.title.trim()}`;
    const loc = captionLocationText(job);
    const where = loc ? `${loc} · ` : '';

    if (platform === 'linkedin') {
        return `${hook}.\n\n${where}${apply}\n${link}\n\nKnow someone looking? Tag them below.`;
    }

    // telegram / facebook / default (broadcast channel: no tag CTA, same clean body)
    return `${hook}.\n\n${where}${apply}\n${link}`;
}
