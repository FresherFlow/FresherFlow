/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { LINKS_FEED_URL } from '@/lib/runtimeConfig';

/// Edge runtime: faster cold starts than Node.js, lower timeout ceiling, optimised for ImageResponse.
export const runtime = 'edge';

export const alt = 'Job opportunity on FresherFlow';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type OpportunityDto = {
    id: string; slug?: string | null; title: string; company: string;
    type?: 'JOB' | 'INTERNSHIP' | 'WALKIN'; status?: string;
    locations?: string[]; expiresAt?: string | null; companyLogoUrl?: string | null;
    events?: Array<{ eventType: string; eventDate: string }>;
};

const truncate = (v: string, max: number) => v.length > max ? `${v.slice(0, max - 1)}\u2026` : v;
const getTypeLabel = (t?: string) => t === 'INTERNSHIP' ? 'INTERNSHIP' : t === 'WALKIN' ? 'WALK-IN' : 'JOB';
const getBadgeColors = (t?: string) => t === 'INTERNSHIP'
    ? { bg: 'rgba(124,58,237,0.22)', border: 'rgba(167,139,250,0.4)', color: '#c4b5fd' }
    : t === 'WALKIN'
        ? { bg: 'rgba(5,150,105,0.22)', border: 'rgba(52,211,153,0.4)', color: '#6ee7b7' }
        : { bg: 'rgba(37,99,235,0.22)', border: 'rgba(96,165,250,0.4)', color: '#93c5fd' };

const isCampusDrive = (o: OpportunityDto) => {
    const t = (o.title || '').toLowerCase();
    return t.includes('nqt') || t.includes('campus drive') ||
        (Array.isArray(o.events) && o.events.some(e => ['REG_START', 'REG_END', 'EXAM_DATE'].includes(e.eventType)));
};

const getDays = (d?: string | null) => {
    if (!d) return null;
    const t = new Date(d); if (isNaN(t.getTime())) return null;
    return Math.ceil((t.getTime() - Date.now()) / 86_400_000);
};

const urgencyLabel = (days: number | null) =>
    days == null ? null : days <= 0 ? 'Closing Today' : days <= 3 ? `Closing in ${days}d` : days <= 7 ? `${days} days left` : null;

// Edge runtime safe base64 logo fetcher (no timer leaks)
async function logoToDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
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
        return `data:${ct.split(';')[0]};base64,${btoa(binary)}`;
    } catch {
        return null;
    }
}

export default async function OpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    // append ?v=version so Next.js data cache treats it as a new URL when jobs are published.
    let opportunities: OpportunityDto[] = [];
    try {
        const { fetchFeedVersion } = await import('@/lib/api/cdnFeed');
        const version = await fetchFeedVersion();
        const res = await fetch(`${LINKS_FEED_URL}?v=${version}`, { 
            cache: 'force-cache',
            signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
            const data = await res.json() as { opportunities?: OpportunityDto[] };
            opportunities = data?.opportunities ?? [];
        }
    } catch { /* serve fallback */ }

    const opp = opportunities.find(o => o.id === slug || o.slug === slug) ?? null;

    const baseStyle: React.CSSProperties = {
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#020404', color: '#F5F7F8',
        padding: '52px 60px',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    };

    try {
        if (!opp || opp.status === 'EXPIRED') {
            const title = !opp ? 'Opportunity Preview' : 'Listing Archived';
            const sub = !opp ? 'This listing is unavailable.' : 'This opportunity has expired.';
            return new ImageResponse(
                <div style={baseStyle}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(245,247,248,0.4)' }}>FresherFlow</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.08 }}>{title}</div>
                        <div style={{ fontSize: 28, color: 'rgba(245,247,248,0.45)' }}>{sub}</div>
                    </div>
                    <div style={{ fontSize: 20, color: 'rgba(245,247,248,0.28)' }}>fresherflow.in</div>
                </div>,
                { ...size }
            );
        }

        const isDrive = isCampusDrive(opp);
        const typeLabel = isDrive ? 'CAMPUS DRIVE' : getTypeLabel(opp.type);
        const badge = getBadgeColors(isDrive ? undefined : opp.type);
        const title = truncate(opp.title || 'Opportunity', 65);
        const company = truncate(opp.company || 'Company', 34);
        const location = truncate((Array.isArray(opp.locations) ? opp.locations[0] : null) || 'India', 24);
        const urgency = urgencyLabel(getDays(opp.expiresAt));

        let finalLogoUrl = opp.companyLogoUrl;
        if (finalLogoUrl?.includes('logo.clearbit.com/')) {
            const domain = finalLogoUrl.split('logo.clearbit.com/')[1];
            finalLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        }
        const logoUrl = finalLogoUrl ? await logoToDataUrl(finalLogoUrl) : null;
        const titleSize = title.length > 52 ? 52 : title.length > 38 ? 62 : 74;

        return new ImageResponse(
            <div style={baseStyle}>

                {/* TOP: Company logo + FresherFlow branding */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt={company} 
                                width={100} 
                                height={100} 
                                style={{ borderRadius: 24, background: '#fff', objectFit: 'contain', padding: 10 }} 
                            />
                        ) : (
                            <div style={{ 
                                width: 100, 
                                height: 100, 
                                borderRadius: 24, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                background: 'linear-gradient(135deg, #1c1c1c 0%, #0c0c0c 100%)', 
                                border: '1px solid rgba(245,247,248,0.12)', 
                                fontSize: 44, 
                                fontWeight: 900,
                                color: badge.color
                            }}>
                                {company[0].toUpperCase()}
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 22, color: 'rgba(245,247,248,0.38)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hiring at</div>
                            <div style={{ fontSize: 48, fontWeight: 800, color: '#F5F7F8', letterSpacing: '-0.5px' }}>{company}</div>
                        </div>
                    </div>
                    
                    {/* CSS-Only Logo Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.12)', borderRadius: 12, padding: '10px 20px' }}>
                        <div style={{
                            display: 'flex',
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 900,
                            color: '#ffffff'
                        }}>
                            FF
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#F5F7F8' }}>FresherFlow</div>
                    </div>
                </div>

                {/* MIDDLE: Job title */}
                <div style={{ fontSize: titleSize, fontWeight: 900, lineHeight: 1.1, color: '#F5F7F8', letterSpacing: '-1px', maxWidth: '1080px' }}>
                    {title}
                </div>

                {/* BOTTOM: Type + location + urgency badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', borderRadius: 12, padding: '16px 28px', background: badge.bg, border: `1px solid ${badge.border}`, fontSize: 24, fontWeight: 700, letterSpacing: '0.07em', color: badge.color }}>
                        {typeLabel}
                    </div>
                    <div style={{ display: 'flex', borderRadius: 12, padding: '16px 28px', background: 'rgba(245,247,248,0.07)', border: '1px solid rgba(245,247,248,0.11)', fontSize: 24, fontWeight: 600, color: 'rgba(245,247,248,0.65)' }}>
                        📍 {location}
                    </div>
                    {urgency && (
                        <div style={{ display: 'flex', borderRadius: 12, padding: '16px 28px', background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.35)', fontSize: 24, fontWeight: 700, color: '#fca5a5' }}>
                            ⚡ {urgency}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 999, background: '#4ade80', display: 'flex' }} />
                        <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(245,247,248,0.32)' }}>Verified · fresherflow.in</div>
                    </div>
                </div>

            </div>,
            { ...size }
        );
    } catch {
        // Fallback: return a safe generic image if anything in the render crashes
        return new ImageResponse(
            <div style={baseStyle}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(245,247,248,0.4)' }}>FresherFlow</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.08 }}>Job Opportunity</div>
                    <div style={{ fontSize: 28, color: 'rgba(245,247,248,0.45)' }}>Find your next role on FresherFlow</div>
                </div>
                <div style={{ fontSize: 20, color: 'rgba(245,247,248,0.28)' }}>fresherflow.in</div>
            </div>,
            { ...size }
        );
    }
}
