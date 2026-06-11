import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/logger';
import fs from 'fs';
import path from 'path';

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
    events?: { eventType: string }[];
    expiresAt?: string | null;
    companyLogoUrl?: string | null;
};

const truncate = (v: string, max: number) => v.length > max ? `${v.slice(0, max - 1)}\u2026` : v;

const getTypeLabel = (t?: string) =>
    t === 'INTERNSHIP' ? 'INTERNSHIP' : t === 'WALKIN' ? 'WALK-IN' : 'JOB';

const getBadgeColors = (t?: string) => t === "INTERNSHIP"
  ? { bg: "rgba(124,58,237,0.22)", border: "rgba(167,139,250,0.4)", color: "#c4b5fd" }
  : t === "WALKIN"
  ? { bg: "rgba(5,150,105,0.22)", border: "rgba(52,211,153,0.4)", color: "#6ee7b7" }
  : { bg: "rgba(37,99,235,0.22)", border: "rgba(96,165,250,0.4)", color: "#93c5fd" };

const isCampusDrive = (o: OgOpportunity) => {
    const t = (o.title || "").toLowerCase();
    return t.includes("nqt") || t.includes("campus drive") ||
      (o.events || []).some(e => ["REG_START","REG_END","EXAM_DATE"].includes(e.eventType));
};

const getDays = (d?: string | null) => {
    if (!d) return null;
    const t = new Date(d);
    if (isNaN(t.getTime())) return null;
    return Math.ceil((t.getTime() - Date.now()) / 86_400_000);
};

const urgencyLabel = (days: number | null) =>
    days == null ? null : days <= 0 ? 'Closing Today' : days <= 3 ? `Closing in ${days}d` : days <= 7 ? `${days} days left` : null;

/** Fetch company logo and encode as data URL (Exactly as old Next.js Edge route). */
async function fetchLogoDataUrl(logoUrl: string): Promise<string | null> {
    try {
        let finalLogoUrl = logoUrl;
        if (finalLogoUrl.includes('logo.clearbit.com/')) {
            const domain = finalLogoUrl.split('logo.clearbit.com/')[1];
            finalLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(finalLogoUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return null;
        
        const ct = res.headers.get('content-type') || 'image/png';
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 50) return null; // allow small favicons, but reject empty
        const bytes = new Uint8Array(buf);
        const base64 = Buffer.from(bytes).toString('base64');
        return `data:${ct.split(';')[0]};base64,${base64}`;
    } catch {
        return null;
    }
}

export function getStaticOgImageUrl(opportunityId: string): string {
    return `${cdnBase}/og/${opportunityId}.png`;
}

export async function generateAndUploadOgImage(opportunity: OgOpportunity): Promise<string | null> {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
        logger.warn('[OgImage] R2 not configured, skipping OG image generation');
        return null;
    }

    try {
        const [{ default: satori }, { Resvg }] = await Promise.all([
            import('satori'),
            import('@resvg/resvg-js'),
        ]);

        const isDrive = isCampusDrive(opportunity);
        const typeLabel = isDrive ? "CAMPUS DRIVE" : getTypeLabel(opportunity.type);
        const badge = getBadgeColors(isDrive ? undefined : opportunity.type);
        const title = truncate(opportunity.title || 'Opportunity', 65);
        const company = truncate(opportunity.company || 'Company', 34);
        const location = truncate(
            (Array.isArray(opportunity.locations) && opportunity.locations.length > 0 ? opportunity.locations[0] : 'India'),
            24
        );
        const urgency = urgencyLabel(getDays(opportunity.expiresAt));
        const titleSize = title.length > 52 ? 52 : title.length > 38 ? 62 : 74;

        const logoDataUrl = opportunity.companyLogoUrl
            ? await fetchLogoDataUrl(opportunity.companyLogoUrl)
            : null;

        const ffLogoPath = path.join(process.cwd(), 'src', 'assets', 'images', 'logo.png');
        const ffLogoBuf = await fs.promises.readFile(ffLogoPath);
        const ffLogoBase64 = `data:image/png;base64,${ffLogoBuf.toString('base64')}`;

        // Build element exactly mirroring old design
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bottomBadges: any[] = [
            { type: 'div', props: { style: { display: 'flex', borderRadius: 12, padding: '16px 28px', background: badge.bg, border: `1px solid ${badge.border}`, fontSize: 24, fontWeight: 700, letterSpacing: '0.07em', color: badge.color }, children: typeLabel } },
            { type: 'div', props: { style: { display: 'flex', borderRadius: 12, padding: '16px 28px', background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.11)', fontSize: 24, fontWeight: 600, color: 'rgba(245,247,248,0.65)' }, children: location } }
        ];

        if (urgency) {
            bottomBadges.push({
                type: 'div', props: { style: { display: 'flex', borderRadius: 12, padding: '16px 28px', background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.35)', fontSize: 24, fontWeight: 700, color: '#fca5a5' }, children: urgency }
            });
        }

        bottomBadges.push({
            type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }, children: [
                { type: 'div', props: { style: { width: 12, height: 12, borderRadius: 999, background: '#4ade80', display: 'flex' } } },
                { type: 'div', props: { style: { fontSize: 22, fontWeight: 600, color: 'rgba(245,247,248,0.32)' }, children: 'Verified · fresherflow.in' } }
            ]}
        });

        const element = {
            type: 'div',
            props: {
                style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#020404', color: '#F5F7F8', padding: '52px 60px', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' },
                children: [
                    {
                        type: 'div', props: { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [
                            {
                                type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 20 }, children: [
                                    logoDataUrl ? {
                                        type: 'img', props: { src: logoDataUrl, width: 100, height: 100, style: { borderRadius: 24, background: '#fff', objectFit: 'contain', padding: 10 } }
                                    } : {
                                        type: 'div', props: { style: { width: 100, height: 100, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1c1c1c 0%, #0c0c0c 100%)', border: '1px solid rgba(245,247,248,0.12)', fontSize: 44, fontWeight: 900, color: badge.color }, children: company[0].toUpperCase() }
                                    },
                                    {
                                        type: 'div', props: { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [
                                            { type: 'div', props: { style: { fontSize: 22, color: 'rgba(245,247,248,0.38)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }, children: 'Hiring at' } },
                                            { type: 'div', props: { style: { fontSize: 48, fontWeight: 800, color: '#F5F7F8', letterSpacing: '-0.5px' }, children: company } }
                                        ] }
                                    }
                                ]}
                            },
                            {
                                type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.12)', borderRadius: 12, padding: '10px 20px' }, children: [
                                    { type: 'img', props: { src: ffLogoBase64, width: 28, height: 28, style: { borderRadius: 6, objectFit: 'contain' } } },
                                    { type: 'div', props: { style: { fontSize: 20, fontWeight: 700, color: '#F5F7F8' }, children: 'FresherFlow' } }
                                ]}
                            }
                        ]}
                    },
                    { type: 'div', props: { style: { fontSize: titleSize, fontWeight: 900, lineHeight: 1.1, color: '#F5F7F8', letterSpacing: '-1px', maxWidth: '1080px' }, children: title } },
                    { type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: bottomBadges } }
                ]
            }
        };

        const fontPathRegular = path.join(process.cwd(), 'src', 'assets', 'fonts', 'inter_regular.ttf');
        const fontPathBold = path.join(process.cwd(), 'src', 'assets', 'fonts', 'inter_bold.ttf');
        const regularFont = await fs.promises.readFile(fontPathRegular);
        const boldFont = await fs.promises.readFile(fontPathBold);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svg = await satori(element as any, {
            width: 1200,
            height: 630,
            fonts: [
                { name: 'ui-sans-serif', data: regularFont, weight: 400, style: 'normal' },
                { name: 'ui-sans-serif', data: regularFont, weight: 600, style: 'normal' },
                { name: 'ui-sans-serif', data: boldFont, weight: 700, style: 'normal' },
                { name: 'ui-sans-serif', data: boldFont, weight: 800, style: 'normal' },
                { name: 'ui-sans-serif', data: boldFont, weight: 900, style: 'normal' }
            ],
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

