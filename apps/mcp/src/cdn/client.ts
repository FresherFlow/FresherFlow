/**
 * Public catalog transport — CDN only.
 *
 * Every read here is anonymous and free: public files on the CDN edge. There is
 * no token, no signing, no version query. Account data never comes from this
 * module; it comes from `src/api/`, which costs an API call and is authoritative.
 */

const DEFAULT_MAX_BYTES = 12 * 1024 * 1024;

/** Resolve the catalog origin from configuration; there is no code default. */
export function resolveCatalogBase(baseUrl: string | undefined): URL {
    let base: URL;
    try {
        base = new URL((baseUrl ?? '').trim());
    } catch {
        throw new Error('Public catalog is not configured.');
    }
    const localHttp = base.protocol === 'http:'
        && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
    if ((base.protocol !== 'https:' && !localHttp)
        || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
        throw new Error('Public catalog configuration is invalid.');
    }
    return base;
}

export async function readCatalogJson(response: Response, maxBytes = DEFAULT_MAX_BYTES): Promise<unknown> {
    if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('application/json')) {
        await response.body?.cancel();
        throw new Error('Public catalog returned an unexpected content type.');
    }
    const length = Number(response.headers.get('content-length'));
    if (Number.isFinite(length) && length > maxBytes) {
        await response.body?.cancel();
        throw new Error('Public catalog response is too large');
    }
    if (!response.body) throw new Error('Public catalog response is empty');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    let bytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > maxBytes) { await reader.cancel(); throw new Error('Public catalog response is too large'); }
            chunks.push(decoder.decode(value, { stream: true }));
        }
    } finally { reader.releaseLock(); }
    chunks.push(decoder.decode());
    return JSON.parse(chunks.join('')) as unknown;
}

export type CatalogFetchOptions = {
    maxBytes?: number;
    timeoutMs?: number;
    /** Return null on 404 instead of throwing, for a per-entity file. */
    optional?: boolean;
};

export async function fetchCatalogJson(
    path: string,
    base: URL,
    { maxBytes = DEFAULT_MAX_BYTES, timeoutMs = 10_000, optional = false }: CatalogFetchOptions = {},
): Promise<unknown | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(new URL(path, base), {
            signal: controller.signal,
            redirect: 'manual',
            headers: { Accept: 'application/json' },
        });
        if (response.status === 404 && optional) {
            await response.body?.cancel();
            return null;
        }
        if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`Public catalog request failed (${response.status}).`);
        }
        return await readCatalogJson(response, maxBytes);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new Error('Public catalog request timed out.');
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
