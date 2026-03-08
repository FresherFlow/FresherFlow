"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDomain = extractDomain;
exports.generateCompanyLogoUrl = generateCompanyLogoUrl;
function extractDomain(url) {
    if (!url)
        return null;
    try {
        const { hostname } = new URL(url);
        return hostname.toLowerCase().replace(/^www\./, '');
    }
    catch {
        return null;
    }
}
function generateCompanyLogoUrl(website) {
    const domain = extractDomain(website);
    return domain ? `https://logo.clearbit.com/${domain}` : null;
}
