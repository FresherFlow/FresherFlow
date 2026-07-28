import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Candidate Profile on FresherFlow';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

type Props = {
    params: Promise<{ username: string }>;
};

export default async function Image({ params }: Props) {
    const { username } = await params;
    const formattedUsername = username ? `@${username}` : '@candidate';
    const initial = username ? username[0].toUpperCase() : 'C';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
                    color: '#ffffff',
                    padding: '60px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    position: 'relative',
                }}
            >
                {/* Background ambient glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: -100,
                        right: -100,
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
                    }}
                />

                {/* Top bar: Brand */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 900,
                                fontSize: '24px',
                            }}
                        >
                            FF
                        </div>
                        <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                            FresherFlow
                        </span>
                    </div>

                    <div
                        style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            padding: '8px 20px',
                            borderRadius: '999px',
                            color: '#818cf8',
                            fontSize: '18px',
                            fontWeight: 700,
                        }}
                    >
                        Candidate Profile
                    </div>
                </div>

                {/* Main Content: Avatar + User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px', zIndex: 10 }}>
                    <div
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '32px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '54px',
                            fontWeight: 900,
                            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        {initial}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1px' }}>
                            {formattedUsername}
                        </div>
                        <div style={{ fontSize: '24px', color: '#94a3b8', fontWeight: 500 }}>
                            Verified Candidate on FresherFlow Platform
                        </div>
                    </div>
                </div>

                {/* Footer bar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingTop: '24px',
                        zIndex: 10,
                    }}
                >
                    <span style={{ fontSize: '20px', color: '#cbd5e1', fontWeight: 600 }}>
                        fresherflow.in/u/{username}
                    </span>
                    <span style={{ fontSize: '18px', color: '#6366f1', fontWeight: 700 }}>
                        Connect & Hire Freshers Directly
                    </span>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
