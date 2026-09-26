import { describe, expect, it } from 'vitest';
import { buildPaginationMeta, parsePagination } from './pagination';

describe('parsePagination', () => {
    it('returns defaults for missing params', () => {
        expect(parsePagination({})).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
    });

    it('parses page/limit and derives skip/take', () => {
        expect(parsePagination({ page: '3', limit: '10' })).toEqual({
            page: 3,
            limit: 10,
            skip: 20,
            take: 10,
        });
    });

    it('clamps limit to the maximum instead of allowing unbounded takes', () => {
        const parsed = parsePagination({ limit: '5000' });
        expect(parsed.limit).toBe(100);
        expect(parsed.take).toBe(100);
    });

    it('falls back to defaults on non-numeric input', () => {
        expect(parsePagination({ page: 'abc', limit: '-5' })).toEqual({
            page: 1,
            limit: 20,
            skip: 0,
            take: 20,
        });
    });
});

describe('buildPaginationMeta', () => {
    it('builds a consistent envelope', () => {
        expect(buildPaginationMeta(95, 2, 10)).toEqual({
            total: 95,
            page: 2,
            pageSize: 10,
            limit: 10,
            totalPages: 10,
        });
    });
});
