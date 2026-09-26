import { describe, expect, it, beforeEach } from 'vitest';
import {
    getReadinessReport,
    getReadinessState,
    markDraining,
    markReady,
    resetReadiness,
} from '../utils/readiness';

/**
 * These cover the lifecycle contract only. No database is reachable from a unit
 * test, so the dependency probes legitimately report 'down' — which is exactly
 * the branch we want to assert: a process with a dead dependency must NOT be
 * advertised as ready.
 */
describe('readiness lifecycle', () => {
    beforeEach(() => {
        resetReadiness();
    });

    it('starts in the starting state and is not ready', async () => {
        expect(getReadinessState()).toBe('starting');

        const report = await getReadinessReport({ probeTimeoutMs: 50 });
        expect(report.ready).toBe(false);
        expect(report.state).toBe('starting');
        expect(report.reason).toBe('starting');
    });

    it('stays not-ready after markReady() while a dependency is down', async () => {
        markReady();

        const report = await getReadinessReport({ probeTimeoutMs: 50 });
        expect(report.state).toBe('ready');
        expect(report.ready).toBe(false);
        expect(report.reason).toBe('dependency_unavailable');
        expect(report.dependencies.database).toBe('down');
    });

    it('flips to draining and refuses to go back to ready', async () => {
        markReady();
        markDraining();

        expect(getReadinessState()).toBe('draining');

        const report = await getReadinessReport({ probeTimeoutMs: 50 });
        expect(report.ready).toBe(false);
        expect(report.reason).toBe('draining');

        // A late async initialiser must not resurrect a terminating process.
        markReady();
        expect(getReadinessState()).toBe('draining');
    });

    it('never leaks connection strings or error text in the report', async () => {
        const report = await getReadinessReport({ probeTimeoutMs: 50 });
        const serialised = JSON.stringify(report);

        expect(serialised).not.toMatch(/postgres(ql)?:\/\//i);
        expect(serialised).not.toMatch(/password|secret|dsn/i);
        expect(Object.keys(report.dependencies).sort()).toEqual(['database', 'redis']);
    });
});
