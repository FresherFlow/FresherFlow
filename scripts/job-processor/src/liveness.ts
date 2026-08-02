export async function isJobLive(url: string): Promise<'LIVE' | 'DEAD' | 'UNKNOWN'> {
    try {
        const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
        });
        
        if (res.status === 404 || res.status === 410) {
            return 'DEAD';
        }
        
        // 200 OK, 301/302 Redirects usually mean it's live or handled by the site
        if (res.ok || res.status >= 300 && res.status < 400) {
            return 'LIVE';
        }
        
        return 'UNKNOWN';
    } catch (error) {
        // Timeout, connection refused, etc.
        console.warn(`[LIVENESS] Error checking ${url}: ${(error as Error).message}`);
        return 'UNKNOWN';
    }
}
