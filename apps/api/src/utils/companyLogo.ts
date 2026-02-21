export function extractDomain(url?: string | null): string | null {
    if (!url) return null;
    try {
        const { hostname } = new URL(url);
        return hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }
}

export function generateCompanyLogoUrl(website?: string | null): string | null {
    const domain = extractDomain(website);
    return domain ? `https://logo.clearbit.com/${domain}` : null;
}
