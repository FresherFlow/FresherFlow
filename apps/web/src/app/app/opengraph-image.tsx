import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

function resolveSiteOrigin(): string {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL ||
        (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

    const value = raw.trim();
    if (!value) return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
    if (/^https?:\/\//i.test(value)) return value.replace(/\/$/, '');
    return `https://${value.replace(/\/$/, '')}`;
}

export default function DownloadOpenGraphImage() {
    const siteOrigin = resolveSiteOrigin();
    const logoUrl = siteOrigin ? `${siteOrigin}/logo-white-optimized.png` : null;
    const screenshotUrl = siteOrigin ? `${siteOrigin}/screenshots/discover.png` : null;
    const displayHost = siteOrigin ? new URL(siteOrigin).hostname : 'fresherflow.in';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'row',
                    background: '#020404', // OLED pure black background
                    color: '#F5F7F8', // Bright text
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                    padding: '35px 60px',
                    boxSizing: 'border-box',
                }}
            >
                {/* Left Column (Copy and Call to Actions) */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '60%',
                        height: '100%',
                    }}
                >
                    {/* Brand Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt="FresherFlow logo"
                                width={40}
                                height={40}
                                style={{ display: 'flex', objectFit: 'contain' }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    width: 40,
                                    height: 40,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255, 255, 255, 0.12)',
                                    fontSize: 20,
                                    fontWeight: 900,
                                }}
                            >
                                FF
                            </div>
                        )}
                        <div style={{ display: 'flex', fontSize: 32, fontWeight: 800, letterSpacing: -0.2 }}>
                            FresherFlow
                        </div>
                    </div>

                    {/* Middle Copy */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 16,
                                fontWeight: 700,
                                letterSpacing: 1.2,
                                textTransform: 'uppercase',
                                color: 'rgba(245, 247, 248, 0.65)',
                            }}
                        >
                            VERIFIED JOBS & INTERNSHIPS
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                lineHeight: 1.15,
                                letterSpacing: -1.2,
                                fontSize: 62,
                                fontWeight: 900,
                            }}
                        >
                            <span style={{ display: 'flex' }}>Never Miss</span>
                            <span style={{ display: 'flex', color: '#ffffff' }}>
                                Off-Campus <span style={{ display: 'flex', marginLeft: 10 }}>Deadlines.</span>
                            </span>
                        </div>

                        {/* Bulleted trust points */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: 'rgba(245, 247, 248, 0.85)' }}>
                                <span style={{ display: 'flex', width: 6, height: 6, borderRadius: 999, background: '#4ade80' }} />
                                <span>Verified Listings Only</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: 'rgba(245, 247, 248, 0.85)' }}>
                                <span style={{ display: 'flex', width: 6, height: 6, borderRadius: 999, background: '#4ade80' }} />
                                <span>Direct Apply Links • No Spam</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA Block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div 
                            style={{ 
                                display: 'flex', 
                                fontSize: 16, 
                                fontWeight: 700, 
                                background: '#ffffff',
                                color: '#020404',
                                padding: '10px 20px',
                                borderRadius: 8,
                                letterSpacing: -0.1
                            }}
                        >
                            Get Android App
                        </div>
                        <div style={{ display: 'flex', fontSize: 16, fontWeight: 700, color: 'rgba(245, 247, 248, 0.4)' }}>
                            fresherflow.in/app
                        </div>
                    </div>
                </div>

                {/* Right Column (Phone Mockup) */}
                <div
                    style={{
                        display: 'flex',
                        width: '40%',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            position: 'relative',
                            width: '270px',
                            height: '560px',
                            borderRadius: '32px',
                            border: '5px solid #1f1f1f',
                            background: '#000000',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Camera/Speaker Notch Overlay */}
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '80px',
                                height: '18px',
                                background: '#1f1f1f',
                                borderBottomLeftRadius: '10px',
                                borderBottomRightRadius: '10px',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <div style={{ width: '30px', height: '2px', background: '#333333', borderRadius: '999px' }} />
                        </div>

                        {/* Screenshot image */}
                        {screenshotUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={screenshotUrl}
                                alt="App Screenshot"
                                width={270}
                                height={560}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'fill',
                                }}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
            headers: {
                'Cache-Control': 'public, immutable, max-age=31536000',
            },
        }
    );
}
