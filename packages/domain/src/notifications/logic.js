"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_JOB_DISPATCH_DATE_FORMAT = void 0;
exports.getDispatchDateBucket = getDispatchDateBucket;
exports.buildFrontendUrl = buildFrontendUrl;
/**
 * Pure Domain logic for notifications
 */
exports.NEW_JOB_DISPATCH_DATE_FORMAT = 'en-CA';
function getDispatchDateBucket(date = new Date()) {
    return date.toLocaleDateString(exports.NEW_JOB_DISPATCH_DATE_FORMAT, { timeZone: 'Asia/Kolkata' });
}
function buildFrontendUrl(frontendUrl, path) {
    const origin = frontendUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${origin}${cleanPath}`;
}
