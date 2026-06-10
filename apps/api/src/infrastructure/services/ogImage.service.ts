import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/logger';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';
const cdnBase = process.env.R2_CDN_BASE_URL || 'https://cdn.fresherflow.in';

const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

type OgOpportunity = {
    id: string;
    title: string;
    company: string;
    type?: string;
    locations?: string[];
    expiresAt?: string | null;
    companyLogoUrl?: string | null;
};

const truncate = (v: string, max: number) => v.length > max ? `${v.slice(0, max - 1)}\u2026` : v;

const getTypeLabel = (t?: string) =>
    t === 'INTERNSHIP' ? 'INTERNSHIP' : t === 'WALKIN' ? 'WALK-IN' : 'JOB';

const getBadgeColor = (t?: string) =>
    t === 'INTERNSHIP' ? '#c4b5fd' : t === 'WALKIN' ? '#6ee7b7' : '#93c5fd';

const getDays = (d?: string | null) => {
    if (!d) return null;
    const t = new Date(d);
    if (isNaN(t.getTime())) return null;
    return Math.ceil((t.getTime() - Date.now()) / 86_400_000);
};

const urgencyLabel = (days: number | null) =>
    days == null ? null : days <= 0 ? 'Closing Today' : days <= 3 ? `Closing in ${days}d` : days <= 7 ? `${days} days left` : null;

/** Fetch company logo and encode as data URL. Returns null on any failure. */
async function fetchLogoDataUrl(logoUrl: string): Promise<string | null> {
    try {
        let url = logoUrl;
        if (url.includes('logo.clearbit.com/')) {
            const domain = url.split('logo.clearbit.com/')[1];
            url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (!/image\/(png|jpe?g|webp|gif)/.test(ct)) return null;
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 500 || buf.byteLength > 65536) return null;
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1024) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 1024));
        }
        return `data:${ct.split(';')[0]};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch {
        return null;
    }
}

/** Returns the public CDN URL for a given opportunity's OG image. */
export function getStaticOgImageUrl(opportunityId: string): string {
    return `${cdnBase}/og/${opportunityId}.png`;
}

/** Generates an OG PNG for the given opportunity and uploads it to R2. */
export async function generateAndUploadOgImage(opportunity: OgOpportunity): Promise<string | null> {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
        logger.warn('[OgImage] R2 not configured, skipping OG image generation');
        return null;
    }

    try {
        // Lazy-load heavy deps so they don't bloat cold starts of other routes
        const [{ default: satori }, { Resvg }] = await Promise.all([
            import('satori'),
            import('@resvg/resvg-js'),
        ]);

        const title = truncate(opportunity.title || 'Opportunity', 65);
        const company = truncate(opportunity.company || 'Company', 34);
        const location = truncate(
            (Array.isArray(opportunity.locations) ? opportunity.locations[0] : null) || 'India',
            24
        );
        const typeLabel = getTypeLabel(opportunity.type);
        const badgeColor = getBadgeColor(opportunity.type);
        const urgency = urgencyLabel(getDays(opportunity.expiresAt));
        const titleSize = title.length > 52 ? 52 : title.length > 38 ? 62 : 74;

        const logoDataUrl = opportunity.companyLogoUrl
            ? await fetchLogoDataUrl(opportunity.companyLogoUrl)
            : null;

        // Build JSX element tree (plain object — satori doesn't need React)
        const element = {
            type: 'div',
            props: {
                style: {
                    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', background: '#020404', color: '#F5F7F8',
                    padding: '52px 60px',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Roboto, Helvetica, Arial',
                },
                children: [
                    // TOP ROW
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
                            children: [
                                // Company logo + name
                                {
                                    type: 'div',
                                    props: {
                                        style: { display: 'flex', alignItems: 'center', gap: '20px' },
                                        children: [
                                            logoDataUrl ? {
                                                type: 'img',
                                                props: {
                                                    src: logoDataUrl,
                                                    width: 100, height: 100,
                                                    style: { borderRadius: '24px', background: '#fff', objectFit: 'contain', padding: '10px' },
                                                },
                                            } : {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        width: '100px', height: '100px', borderRadius: '24px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: 'linear-gradient(135deg, #1c1c1c 0%, #0c0c0c 100%)',
                                                        border: '1px solid rgba(245,247,248,0.12)',
                                                        fontSize: '44px', fontWeight: 900, color: badgeColor,
                                                    },
                                                    children: company[0].toUpperCase(),
                                                },
                                            },
                                            {
                                                type: 'div',
                                                props: {
                                                    style: { display: 'flex', flexDirection: 'column', gap: '6px' },
                                                    children: [
                                                        { type: 'div', props: { style: { fontSize: '22px', color: 'rgba(245,247,248,0.38)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }, children: 'Hiring at' } },
                                                        { type: 'div', props: { style: { fontSize: '48px', fontWeight: 800, color: '#F5F7F8', letterSpacing: '-0.5px' }, children: company } },
                                                    ],
                                                },
                                            },
                                        ],
                                    },
                                },
                                // FresherFlow badge
                                {
                                    type: 'div',
                                    props: {
                                        style: { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.12)', borderRadius: '12px', padding: '10px 20px' },
                                        children: [
                                            { type: 'div', props: { style: { display: 'flex', width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#ffffff' }, children: 'FF' } },
                                            { type: 'div', props: { style: { fontSize: '20px', fontWeight: 700, color: '#F5F7F8' }, children: 'FresherFlow' } },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                    // TITLE
                    { type: 'div', props: { style: { fontSize: `${titleSize}px`, fontWeight: 900, lineHeight: 1.1, color: '#F5F7F8', letterSpacing: '-1px', maxWidth: '1080px' }, children: title } },
                    // BOTTOM BADGES
                    {
                        type: 'div',
                        props: {
                            style: { display: 'flex', alignItems: 'center', gap: '16px' },
                            children: [
                                { type: 'div', props: { style: { display: 'flex', borderRadius: '12px', padding: '16px 28px', background: 'rgba(37,99,235,0.22)', border: `1px solid rgba(96,165,250,0.4)`, fontSize: '24px', fontWeight: 700, letterSpacing: '0.07em', color: badgeColor }, children: typeLabel } },
                                { type: 'div', props: { style: { display: 'flex', borderRadius: '12px', padding: '16px 28px', background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.11)', fontSize: '24px', fontWeight: 600, color: 'rgba(245,247,248,0.65)' }, children: `📍 ${location}` } },
                                ...(urgency ? [{ type: 'div', props: { style: { display: 'flex', borderRadius: '12px', padding: '16px 28px', background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.35)', fontSize: '24px', fontWeight: 700, color: '#fca5a5' }, children: `⚡ ${urgency}` } }] : []),
                                { type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }, children: [{ type: 'div', props: { style: { width: '12px', height: '12px', borderRadius: '999px', background: '#4ade80', display: 'flex' } } }, { type: 'div', props: { style: { fontSize: '22px', fontWeight: 600, color: 'rgba(245,247,248,0.32)' }, children: 'Verified · fresherflow.in' } }] } },
                            ],
                        },
                    },
                ],
            },
        };

        const svg = await satori(element as Parameters<typeof satori>[0], {
            width: 1200,
            height: 630,
            fonts: [],
        });

        const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
        const pngBuffer = resvg.render().asPng();

        const key = `og/${opportunity.id}.png`;
        await s3.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: pngBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000, immutable',
        }));

        const url = getStaticOgImageUrl(opportunity.id);
        logger.info('[OgImage] Uploaded static OG image to R2', { opportunityId: opportunity.id, url });
        return url;
    } catch (err) {
        logger.error('[OgImage] Failed to generate/upload OG image', {
            opportunityId: opportunity.id,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}
