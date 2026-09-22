export function sanitizeSearchQuery(input: string): string {
    if (input.length > 10000) return input.slice(0, 10000);
    return input.replace(/[<>"']/g, '').trim();
}

export function buildPageParams(page: number, limit = 20) {
    return { page, limit };
}
