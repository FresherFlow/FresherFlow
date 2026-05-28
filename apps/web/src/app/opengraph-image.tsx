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

export default function OpenGraphImage() {
    const siteOrigin = resolveSiteOrigin();
    const logoUrl = siteOrigin ? `${siteOrigin}/logo-white-optimized.png` : null;
    const displayHost = siteOrigin ? new URL(siteOrigin).hostname : 'fresherflow';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    position: 'relative',
                    background: 'linear-gradient(132deg, #051126 0%, #0a234c 58%, #0f2f63 100%)',
                    color: '#ffffff',
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: -180,
                        right: -180,
                        width: 560,
                        height: 560,
                        borderRadius: 9999,
                        background: 'radial-gradient(circle, rgba(97, 165, 255, 0.22) 0%, rgba(97, 165, 255, 0.0) 72%)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: -220,
                        left: -260,
                        width: 660,
                        height: 660,
                        borderRadius: 9999,
                        background: 'radial-gradient(circle, rgba(44, 106, 220, 0.2) 0%, rgba(44, 106, 220, 0.0) 72%)',
                    }}
                />

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        width: '100%',
                        height: '100%',
                        padding: '46px 54px 40px',
                        position: 'relative',
                        zIndex: 2,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={logoUrl}
                                    alt="FresherFlow logo"
                                    width={50}
                                    height={50}
                                    style={{ display: 'flex', objectFit: 'contain' }}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: 'flex',
                                        width: 50,
                                        height: 50,
                                        borderRadius: 14,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.12)',
                                        fontSize: 24,
                                        fontWeight: 900,
                                    }}
                                >
                                    FF
                                </div>
                            )}
                            <div style={{ display: 'flex', fontSize: 38, fontWeight: 850, letterSpacing: 0.4 }}>FresherFlow</div>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                border: '1px solid rgba(190, 221, 255, 0.62)',
                                borderRadius: 999,
                                padding: '10px 18px',
                                background: 'rgba(8, 24, 52, 0.55)',
                                fontSize: 20,
                                fontWeight: 760,
                                letterSpacing: 1,
                            }}
                        >
                            FRESHERS FIRST
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div
                            style={{
                                display: 'flex',
                                fontSize: 23,
                                fontWeight: 700,
                                letterSpacing: 1.6,
                                textTransform: 'capitalize',
                                color: '#ffffff',
                            }}
                        >
                            India + Remote - Verified Openings
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                lineHeight: 1,
                                letterSpacing: -1.1,
                                fontSize: 94,
                                fontWeight: 900,
                            }}
                        >
                            <span style={{ display: 'flex' }}>Verified Jobs</span>
                            <span style={{ display: 'flex', color: '#ffffff', fontWeight: 900, letterSpacing: -1.2 }}>
                                ONLY for <span style={{ display: 'flex', marginLeft: 14, color: '#9ad8ff' }}>Freshers</span>
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                fontSize: 34,
                                fontWeight: 700,
                                color: 'rgba(241, 248, 255, 0.95)',
                                marginTop: -4,
                            }}
                        >
                            Daily updates - direct apply links - no fake listings
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderRadius: 14,
                            background: 'rgba(8, 24, 52, 0.28)',
                            padding: '14px 16px',
                        }}
                    >
                        <div style={{ display: 'flex', fontSize: 40, fontWeight: 850, color: '#ffffff' }}>{displayHost}</div>
                        <div style={{ display: 'flex', fontSize: 22, color: 'rgba(226, 239, 255, 0.95)', marginLeft: 16 }}>
                            Built for students and fresh graduates
                        </div>
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
