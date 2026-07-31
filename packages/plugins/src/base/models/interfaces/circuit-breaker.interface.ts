import { Site } from '../enums/site.enum';

/**
 * Circuit-breaker state machine (Spec 005 / FR-1, FR-2).
 *
 * The three classical states:
 *   - `closed`    — calls flow through; failures are tallied. Default state.
 *   - `open`      — calls are short-circuited with `ERR_SOURCE_CIRCUIT_OPEN`
 *                   until {@link CircuitPolicy.cooldownMs} has elapsed.
 *   - `half-open` — a bounded number of probe calls
 *                   ({@link CircuitPolicy.halfOpenProbes}) flow through.
 *                   First success → `closed`; first failure → `open` again.
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Policy knobs applied per `Site` breaker. Concrete defaults live in
 * {@link DEFAULT_CIRCUIT_POLICY} (Constitution Article 6 §2 / Q-003 option A).
 *
 * A plugin author may override the policy by implementing
 * `getCircuitBreakerPolicy(): CircuitPolicy` on its scraper service —
 * see Spec 005 / FR-3 and T08.
 */
export interface CircuitPolicy {
  /** Consecutive failures before transitioning `closed → open`. */
  readonly failureThreshold: number;
  /** Milliseconds spent in `open` before allowing a probe (`half-open`). */
  readonly cooldownMs: number;
  /** Probe attempts allowed in `half-open` before re-opening on failure. */
  readonly halfOpenProbes: number;
  /** Stats rolling-window length in milliseconds (default `60_000`). */
  readonly rollingWindowMs: number;
}

/**
 * Per-site health snapshot returned by {@link ICircuitBreakerService.health}
 * and `/api/sources/health` (Spec 005 / FR-5).
 *
 * `successRate` and `p95LatencyMs` are computed over the rolling window
 * defined by the breaker's policy. `lastError`, when present, captures the
 * most recent failure metadata for operator triage.
 */
export interface SourceHealth {
  readonly site: Site;
  readonly state: CircuitState;
  /** 0..1 over the rolling window. `1` for an idle window. */
  readonly successRate: number;
  /** Milliseconds. `0` for an idle window. */
  readonly p95LatencyMs: number;
  readonly lastError?: SourceHealthError;
  /** Echoes {@link CircuitPolicy.rollingWindowMs} for client convenience. */
  readonly windowMs: number;
}

/** Compact error projection embedded in {@link SourceHealth}. */
export interface SourceHealthError {
  readonly code: string;
  readonly message: string;
  /** ISO-8601 timestamp. */
  readonly at: string;
}

/**
 * Public service interface exposed by `packages/plugin/src/circuit-breaker`.
 *
 * The interceptor (`CircuitBreakerInterceptor`) and the aggregator
 * (`JobsAggregator`) both consume this interface so that the underlying
 * implementation (currently a hand-rolled state machine, see Q-012) is
 * fully replaceable per AGENTS.md §0.2.
 */
export interface ICircuitBreakerService {
  /**
   * Run `fn` under the breaker for `site`.
   *
   * Behaviour:
   *  - `closed` / `half-open` → invokes `fn`. Throws whatever `fn` throws,
   *    after recording the outcome.
   *  - `open` → short-circuits with an error whose `code` is
   *    `ERR_SOURCE_CIRCUIT_OPEN` *without* invoking `fn`.
   *
   * Returns the same value `fn` resolved with on success.
   */
  exec<T>(site: Site, fn: () => Promise<T>): Promise<T>;

  /** Current state for `site`. Lazily creates a breaker if none exists. */
  state(site: Site): CircuitState;

  /** Snapshot of `site`'s rolling-window stats. */
  health(site: Site): SourceHealth;

  /** Force `site`'s breaker into `open`. Ops/admin path (FR-7). */
  forceOpen(site: Site): void;

  /** Force `site`'s breaker back to `closed` and reset stats. */
  forceReset(site: Site): void;

  /** All breakers' health snapshots — used by the `/api/sources/health` route. */
  list(): SourceHealth[];

  /**
   * Override the default policy for `site`. Idempotent — a later call
   * replaces the prior policy. Used by T08 to honour
   * `getCircuitBreakerPolicy()` from plugin services at registration.
   */
  setPolicy(site: Site, policy: CircuitPolicy): void;
}

/**
 * Default policy — Spec 005 / FR-2 / Constitution Article 6 §2 / Q-003 option A.
 *
 *   - 5 consecutive failures → `open`
 *   - 30 s cooldown
 *   - 1 probe attempt in `half-open`
 *   - 60 s rolling stats window
 */
export const DEFAULT_CIRCUIT_POLICY: CircuitPolicy = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenProbes: 1,
  rollingWindowMs: 60_000,
};

/**
 * Error code raised when {@link ICircuitBreakerService.exec} short-circuits
 * because the breaker is `open`. Aggregators must catch and skip the source
 * (Spec 005 / FR-4).
 */
export const ERR_SOURCE_CIRCUIT_OPEN = 'ERR_SOURCE_CIRCUIT_OPEN';

/** DI token used to register the active circuit-breaker service. */
export const CIRCUIT_BREAKER_TOKEN = 'CIRCUIT_BREAKER';

/**
 * Optional contract a source plugin's scraper service may implement to
 * override {@link DEFAULT_CIRCUIT_POLICY} for its own `Site`. Honoured by
 * `CircuitBreakerService.bindFromPlugins()` (Spec 005 / FR-3 / T08).
 */
export interface ICircuitBreakerPolicyProvider {
  getCircuitBreakerPolicy(): CircuitPolicy;
}

/** Type guard for {@link ICircuitBreakerPolicyProvider}. */
export function hasCircuitBreakerPolicy(
  candidate: unknown,
): candidate is ICircuitBreakerPolicyProvider {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as ICircuitBreakerPolicyProvider).getCircuitBreakerPolicy === 'function'
  );
}
