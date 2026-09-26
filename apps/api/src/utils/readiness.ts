import prisma from '../infrastructure/database/prisma';
import { redis } from '@fresherflow/database';

/**
 * Readiness / lifecycle state for the API process.
 *
 * WHY a separate module: readiness is a shared contract between the HTTP probe
 * (`/ready`) and the shutdown path (SIGTERM handling in `src/index.ts`). Keeping
 * the state here means the probe and the shutdown handler cannot drift, and it
 * lets us test the lifecycle without booting an Express app.
 *
 * Nothing here may change the behaviour of `GET /health` or `GET /health/deep`
 * in `src/routes/public/health.ts` — production monitoring depends on them.
 */

export type ReadinessState = 'starting' | 'ready' | 'draining';

export type DependencyStatus = 'up' | 'down';

/** Per-dependency probe result. Deliberately carries NO error details. */
export type ProbeResult = {
    status: DependencyStatus;
    /** Round-trip time of the probe in ms. */
    latencyMs: number;
};

export type ReadinessReport = {
    state: ReadinessState;
    /** True only when state === 'ready' AND every required dependency is up. */
    ready: boolean;
    /** Process uptime in seconds. */
    uptimeSeconds: number;
    /** Epoch-time at which this report was produced. */
    checkedAt: string;
    dependencies: {
        database: DependencyStatus;
        redis: DependencyStatus;
    };
    /**
     * Coarse, non-identifying reason the service is not ready. Safe to return
     * to a load balancer: never contains hostnames, DSNs or raw error text.
     */
    reason?: 'starting' | 'draining' | 'dependency_unavailable';
};

export type ReadinessOptions = {
    /**
     * Hard ceiling on a single probe. A readiness check that hangs is worse
     * than one that fails: the orchestrator needs a fast 503 to stop sending
     * traffic while the underlying client is stuck in a socket read.
     */
    probeTimeoutMs?: number;
};

const DEFAULT_PROBE_TIMEOUT_MS = Number(process.env.READINESS_PROBE_TIMEOUT_MS ?? 2000);

/**
 * Shutdown budget. The platform sends SIGTERM, then SIGKILL after a grace
 * window. We must be answering /ready with 503 and releasing connections
 * inside that window, so everything after the first signal is bounded by this.
 */
const DEFAULT_SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10000);

let state: ReadinessState = 'starting';

/**
 * process.on('...') handler state. Node has no "listener attached" query, so we
 * track it ourselves — otherwise a second install of the signal handlers would
 * run the drain twice and the second run would close already-closed clients.
 */
let signalHandlersInstalled = false;

export function getReadinessState(): ReadinessState {
    return state;
}

export function isReady(): boolean {
    return state === 'ready';
}

/**
 * Flip to 'ready'. Called once background services have initialised.
 * Idempotent; a call after a drain starts is ignored so a late async
 * initialiser cannot resurrect a process that is already terminating.
 */
export function markReady(): void {
    if (state === 'draining') return;
    state = 'ready';
}

/**
 * Flip to 'draining'. Probes start failing immediately, which is what pulls
 * this instance out of the load balancer's rotation BEFORE we stop accepting
 * new work. Idempotent.
 */
export function markDraining(): void {
    state = 'draining';
}

/** Test helper: reset to the pre-boot state without restarting the process. */
export function resetReadiness(): void {
    state = 'starting';
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`readiness probe timed out: ${label}`));
        }, timeoutMs);
        // Do not keep the event loop alive purely for a probe timer.
        timer.unref?.();
        work.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

export async function probeDatabase(timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): Promise<ProbeResult> {
    const startedAt = Date.now();
    try {
        // `SELECT 1` is the cheapest statement that still proves the pool can
        // hand out a working connection; a cached result would defeat the point.
        await withTimeout(prisma.$queryRaw`SELECT 1`, timeoutMs, 'database');
        return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch {
        // The error is intentionally swallowed. The real cause (DSN, auth,
        // pool exhaustion) belongs in the log layer, never in an unauthenticated
        // HTTP response body.
        return { status: 'down', latencyMs: Date.now() - startedAt };
    }
}

export async function probeRedis(timeoutMs = DEFAULT_PROBE_TIMEOUT_MS): Promise<ProbeResult> {
    const startedAt = Date.now();
    try {
        await withTimeout(redis.ping(), timeoutMs, 'redis');
        return { status: 'up', latencyMs: Date.now() - startedAt };
    } catch {
        return { status: 'down', latencyMs: Date.now() - startedAt };
    }
}

/**
 * Build the full readiness report.
 *
 * WHY the probes run in parallel: serially the check takes the SUM of both
 * timeouts, which on a degraded instance doubles the window in which the
 * orchestrator still routes traffic at a process that cannot serve it.
 */
export async function getReadinessReport(
    options: ReadinessOptions = {}
): Promise<ReadinessReport> {
    const timeoutMs = options.probeTimeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;

    const [database, cache] = await Promise.all([
        probeDatabase(timeoutMs),
        probeRedis(timeoutMs),
    ]);

    const dependencies = { database: database.status, redis: cache.status };
    const dependenciesUp = database.status === 'up' && cache.status === 'up';

    let reason: ReadinessReport['reason'];
    if (state === 'starting') reason = 'starting';
    else if (state === 'draining') reason = 'draining';
    else if (!dependenciesUp) reason = 'dependency_unavailable';

    return {
        state,
        ready: state === 'ready' && dependenciesUp,
        uptimeSeconds: Math.round(process.uptime()),
        checkedAt: new Date().toISOString(),
        dependencies,
        ...(reason ? { reason } : {}),
    };
}

export type ShutdownHandle = {
    /** Ask the HTTP server to stop accepting connections and drain in-flight requests. */
    stopHttp?: () => Promise<void>;
    /** Close the Redis client. */
    closeRedis?: () => Promise<void>;
    /** Disconnect the Prisma pool. */
    closeDatabase?: () => Promise<void>;
};

const defaultHandles = (): Required<ShutdownHandle> => ({
    // stopHttp is supplied by src/index.ts, which owns the `server` handle.
    // Left as a no-op here so this module never reaches into module scope it
    // does not own.
    stopHttp: async () => {},
    closeRedis: async () => {
        await redis.quit().catch(() => redis.disconnect());
    },
    closeDatabase: async () => {
        await prisma.$disconnect();
    },
});

/**
 * The graceful shutdown contract, in one place.
 *
 * Order matters and is not arbitrary:
 *  1. mark draining -> /ready flips to 503, the load balancer stops sending work
 *  2. stop HTTP     -> no NEW requests; in-flight ones get to finish
 *  3. close Redis   -> stop publishing queue work
 *  4. close Postgres-> flush the pool last, so anything still writing is not
 *                      cut off mid-transaction
 *
 * A watchdog exits the process even if a close hangs, because an orchestrator
 * SIGKILL mid-write is strictly worse than an early, clean exit.
 */
export async function shutdown(
    handles: ShutdownHandle = {},
    timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS
): Promise<void> {
    markDraining();

    const { stopHttp, closeRedis, closeDatabase } = { ...defaultHandles(), ...handles };

    const watchdog = setTimeout(() => {
        // exit(1): a forced exit after the grace window tells the orchestrator
        // that shutdown did not complete cleanly, so it can be flagged.
        process.exit(1);
    }, timeoutMs);
    watchdog.unref?.();

    try {
        await stopHttp();
        await closeRedis();
        await closeDatabase();
    } catch {
        // Swallow: we are already exiting, and one failed close must not
        // prevent the remaining handles from being released.
    } finally {
        clearTimeout(watchdog);
    }
}

/**
 * Wire SIGTERM/SIGINT to `shutdown`. Idempotent.
 *
 * SIGINT is handled identically to SIGTERM: in a container a Ctrl-C from
 * `docker run -it` must drain exactly like a platform restart, and having the
 * two paths differ is how you get a stuck process in local dev.
 */
export function installShutdownHandlers(handles: ShutdownHandle = {}): void {
    if (signalHandlersInstalled) return;
    signalHandlersInstalled = true;

    const handle = (_signal: NodeJS.Signals) => {
        void shutdown(handles)
            .catch(() => undefined)
            .then(() => process.exit(0));
    };

    process.on('SIGTERM', handle);
    process.on('SIGINT', handle);
}
