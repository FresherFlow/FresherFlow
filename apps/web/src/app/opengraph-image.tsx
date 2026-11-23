import { ImageResponse } from 'next/og';
import { LedgerCard } from '@/lib/og/LedgerCard';
import { getOgAssetSrc } from '@/lib/utils/ogAssets';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export const dynamic = 'force-static';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
    // Prefer the bytes we ship in public/: satori fetches remote <img> srcs at
    // build time, and a 503 from the live domain made it log
    // "Unsupported image type: unknown". The URL stays as a fallback for
    // runtimes with no public/ directory on disk (output: 'standalone').
    // Use the exact mark the app header renders (LogoImage.tsx), not the stale
    // v2 export — one logo across the site and every social card.
    const logo =
        getOgAssetSrc('logo-white-optimized.png') ??
        (SITE_URL ? `${SITE_URL}/logo-white-optimized.png` : null);

    // A local build has SITE_URL=http://localhost:3000; never bake that into a
    // social card. Fall back to the public domain, as CaptionsTool does.
    const siteHost = SITE_URL ? new URL(SITE_URL).hostname : '';
    const host = !siteHost || siteHost === 'localhost' ? 'fresherflow.in' : siteHost;

    return new ImageResponse(
        <LedgerCard
            logo={logo}
            host={host}
            kicker="FRESHER JOBS · INTERNSHIPS · WALK-IN DRIVES"
            headline={['Your career,', 'One flow.']}
            subline="Find opportunities. Apply directly. Move forward."
            footerTag="NO FRESHER APPLIES BLIND"
        />,
        {
            ...size,
            headers: {
                'Cache-Control': 'public, immutable, max-age=31536000',
            },
        }
    );
}
