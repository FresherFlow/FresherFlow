import fs from 'node:fs';
import path from 'node:path';

/**
 * Serve a file from `public/` as a `data:` URI for satori (`next/og`
 * ImageResponse).
 *
 * satori fetches every remote `<img src>` it renders. Building the OG cards
 * against `${SITE_URL}/...` coupled static generation to the live domain: a
 * paused production deployment answered with `503` + `text/plain`, and satori
 * logged `Can't load image …: Unsupported image type: unknown` for every
 * asset it could not decode (the cards rendered without the logo). Reading
 * the bytes we already ship removes the network hop — satori accepts data
 * URIs. Callers keep the absolute URL as a fallback for runtimes that have no
 * `public/` copy on disk (`output: 'standalone'`).
 *
 * Server-only: must never be imported from client components.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
};

const dataUriCache = new Map<string, string>();

/**
 * Read `public/<publicPath>` and return a `data:` URI, or `null` when the
 * file cannot be read (missing file, unknown extension, or a runtime without
 * a `public/` directory). `publicPath` is always a caller-owned literal,
 * never user input.
 */
export function getOgAssetSrc(publicPath: string): string | null {
    const relative = publicPath.replace(/^\/+/, '');

    // Defensive: only plain relative paths under public/ are readable.
    if (!relative || relative.includes('..') || path.isAbsolute(relative)) {
        return null;
    }

    const cached = dataUriCache.get(relative);
    if (cached) {
        return cached;
    }

    const mime = MIME_BY_EXTENSION[path.extname(relative).toLowerCase()];
    if (!mime) {
        return null;
    }

    try {
        const bytes = fs.readFileSync(path.join(process.cwd(), 'public', relative));
        const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
        dataUriCache.set(relative, dataUri);
        return dataUri;
    } catch {
        return null;
    }
}
