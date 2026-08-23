/**
 * Pure Domain logic for notifications
 */
export const NEW_JOB_DISPATCH_DATE_FORMAT = 'en-CA';

export function getDispatchDateBucket(date = new Date()): string {
    return date.toLocaleDateString(NEW_JOB_DISPATCH_DATE_FORMAT, { timeZone: 'Asia/Kolkata' });
}

export function buildFrontendUrl(frontendUrl: string, path: string) {
    const origin = frontendUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${cleanPath}`;
}
