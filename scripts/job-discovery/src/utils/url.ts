import crypto from 'node:crypto';
import { CDN_SECRET, CDN_URL } from '../config.js';

// Helper to sign the CDN URL
export function signUrl(pathname: string): string {
    if (!CDN_SECRET) throw new Error("CDN_SIGNATURE_SECRET is missing");
    const t = Math.floor(Date.now() / 1000);
    const message = `${pathname}:${t}`;
    const sig = crypto.createHmac('sha256', CDN_SECRET).update(message).digest('hex');
    return `${CDN_URL}${pathname}?t=${t}&sig=${sig}`;
}

// Strip query parameters for normalized comparison
export function normalizeUrl(urlStr: string): string {
    try {
        const url = new URL(urlStr);
        const path = url.pathname.replace(/\/$/, '');
        
        // Aggressive normalization for Workday URLs
        if (url.hostname === 'myworkdayjobs.com' || url.hostname.endsWith('.myworkdayjobs.com')) {
            const parts = path.split('/');
            const lastPart = parts[parts.length - 1];
            return `${url.hostname}/${lastPart}`.toLowerCase();
        }
        
        return `${url.origin}${path}`.toLowerCase();
    } catch {
        return urlStr.split('?')[0].replace(/\/$/, '').toLowerCase();
    }
}

// Strip search/tracking query params from known ATS URLs before visiting them.
export function sanitizeAtsUrl(rawUrl: string): string {
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.toLowerCase();

        // Workday — strip search query + all tracking params, keep only path
        if (host === 'myworkdayjobs.com' || host === 'myworkdaysite.com' || host.endsWith('.myworkdayjobs.com') || host.endsWith('.myworkdaysite.com')) {
            const clean = new URL(rawUrl);
            const keepParams = ['locationCountry', 'Country']; // Workday filters that are part of job identity
            const toDelete: string[] = [];
            clean.searchParams.forEach((_, key) => {
                if (!keepParams.includes(key)) toDelete.push(key);
            });
            toDelete.forEach(k => clean.searchParams.delete(k));
            return clean.toString();
        }

        // All others — strip common tracking params only
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
            'ss', 'cmpid', 'trid', 'rsid', 'src', 'feedId', 'board', 'source', 'sort_by', 'pid', 'start'];
        const clean = new URL(rawUrl);
        trackingParams.forEach(k => clean.searchParams.delete(k));
        return clean.toString();
    } catch {
        return rawUrl;
    }
}
