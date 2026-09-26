/**
 * Standardized offset pagination for list endpoints (Phase 2 data-access foundation).
 *
 * Every offset-paginated list endpoint parses `page`/`limit` through
 * `parsePagination` so bounds, defaults, and caps cannot drift per route.
 * Keyset/cursor pagination (public search) stays on its own contract.
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MAX_PAGE = 1000;

export interface ParsedPagination {
    page: number;
    limit: number;
    skip: number;
    take: number;
}

function toPositiveInt(value: unknown): number | undefined {
    if (typeof value === 'number') {
        return Number.isInteger(value) && value > 0 ? value : undefined;
    }
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return undefined;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Parse `page`/`limit` (or legacy `take`/`skip`) query params into a clamped
 * `{ page, limit, skip, take }` window. Invalid input falls back to defaults;
 * callers that must reject bad input should validate with Zod first.
 */
export function parsePagination(
    query: Record<string, unknown>,
    options: { defaultLimit?: number; maxLimit?: number; maxPage?: number } = {},
): ParsedPagination {
    const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
    const maxLimit = options.maxLimit ?? MAX_LIMIT;
    const maxPage = options.maxPage ?? MAX_PAGE;

    const rawLimit = toPositiveInt(query.limit ?? query.take) ?? defaultLimit;
    const rawPage = toPositiveInt(query.page) ?? DEFAULT_PAGE;

    const limit = Math.min(rawLimit, maxLimit);
    const page = Math.min(rawPage, maxPage);
    const skip = (page - 1) * limit;

    return { page, limit, skip, take: limit };
}

/**
 * Build the standard pagination envelope shared by list responses.
 *
 * `limit` and `pageSize` are aliases for the same value: older list routes
 * (e.g. admin ingestion `/runs`, `/raw`) emit `limit`, while this helper
 * historically emitted `pageSize`. Both keys are present so clients can rely
 * on one contract whichever route they call.
 */
export function buildPaginationMeta(total: number, page: number, limit: number): {
    total: number;
    page: number;
    pageSize: number;
    limit: number;
    totalPages: number;
} {
    const safeTotal = Math.max(0, total);
    const safeLimit = Math.max(1, limit);
    return {
        total: safeTotal,
        page,
        pageSize: safeLimit,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(safeTotal / safeLimit)),
    };
}
