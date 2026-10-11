import { describe, it, expect } from 'vitest';
import {
    applyDay,
    istDay,
    ledgerIdFor,
    type SourceHealthRecord,
} from './source-health.js';

function freshRecord(): SourceHealthRecord {
    return {
        id: 'site:Naukri',
        kind: 'site',
        name: 'Naukri',
        firstSeen: '2026-10-01',
        totalLinks: 0,
        totalJobs: 0,
        days: [],
    };
}

describe('source-health ledger merge', () => {
    it('accumulates a new day and bumps totals', () => {
        const rec = freshRecord();
        applyDay(rec, '2026-10-10', 'ok', 20, 5, 1);
        expect(rec.days).toHaveLength(1);
        expect(rec.totalLinks).toBe(20);
        expect(rec.totalJobs).toBe(5);
        expect(rec.days[0].review).toBe(1);
    });

    it('same-day re-save merges without double-counting totals', () => {
        const rec = freshRecord();
        applyDay(rec, '2026-10-10', 'ok', 20, 5, 1);
        applyDay(rec, '2026-10-10', 'ok', 10, 2, 0);
        expect(rec.days).toHaveLength(1);
        expect(rec.days[0].links).toBe(30);
        expect(rec.days[0].jobs).toBe(7);
        expect(rec.totalLinks).toBe(30);
        expect(rec.totalJobs).toBe(7);
    });

    it('worse fetch wins on same-day merge and keeps the error', () => {
        const rec = freshRecord();
        applyDay(rec, '2026-10-10', 'ok', 20, 5, 0);
        applyDay(rec, '2026-10-10', 'error', 0, 0, 0, 'timeout');
        expect(rec.days[0].fetch).toBe('error');
        expect(rec.days[0].err).toBe('timeout');
        // A later ok must not overwrite the recorded error.
        applyDay(rec, '2026-10-10', 'ok', 5, 1, 0);
        expect(rec.days[0].fetch).toBe('error');
        expect(rec.totalLinks).toBe(25);
    });

    it('caps day entries, oldest dropped first', () => {
        const rec = freshRecord();
        for (let i = 0; i < 130; i++) {
            const d = `2026-06-${String((i % 28) + 1).padStart(2, '0')}`;
            applyDay(rec, `${d}-x${i}`, 'ok', 1, 0, 0);
        }
        expect(rec.days.length).toBeLessThanOrEqual(120);
        // Totals still count everything ever applied.
        expect(rec.totalLinks).toBe(130);
    });

    it('istDay returns a YYYY-MM-DD calendar day', () => {
        expect(istDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('ledgerIdFor maps origins to stable ids', () => {
        expect(ledgerIdFor('greenhouse', 'ATS')).toBe('ats:greenhouse');
        expect(ledgerIdFor('Dorker', 'ATS')).toBe('ats:Dorker');
        expect(ledgerIdFor('channel-enggwave', 'AGGREGATOR')).toBe('channel:enggwave');
        expect(ledgerIdFor('Naukri', 'AGGREGATOR')).toBe('site:Naukri');
    });
});
