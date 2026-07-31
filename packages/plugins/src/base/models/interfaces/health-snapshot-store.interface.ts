import { Site } from '../enums/site.enum';
import { SourceHealth } from './circuit-breaker.interface';

/**
 * Spec 005 / T09 / FR-8 — `IHealthSnapshotStore`.
 *
 * Persists per-site `SourceHealth` snapshots emitted by the
 * `HealthSnapshotCron` provider. A separate sibling interface
 * (mirroring the {@link import('./job-store.interface').IJobStore} /
 * {@link import('./job-store.interface').IJobObservationStore} split
 * Spec 004 / T01 introduced) because health snapshots and canonical
 * jobs have different lifecycles, different cardinality, different
 * retention policies:
 *
 *   - **Cardinality.** One canonical job is an O(N_jobs) row. One
 *     `SourceHealth` is an O(N_sites × ticks) row — at one tick
 *     per minute and ~120 sites, ~172 800 rows / day — different
 *     storage class.
 *   - **Lifecycle.** A canonical job is upserted (the canonical id
 *     is the durable key). A health snapshot is **append-only**:
 *     every minute's row is a distinct fact about the source's
 *     state at that instant. There is no "upsert" semantic.
 *   - **Retention.** Operators typically keep canonical jobs for
 *     months (history; analytics); health snapshots collapse into
 *     hourly / daily aggregates after ~7 days. A future
 *     `IHealthSnapshotStore` implementation may carry a TTL /
 *     compaction hook the canonical store doesn't need.
 *
 * Q-020 / Option A locks this design in. The alternative — extending
 * `IJobObservationStore` with a `putHealthSnapshot()` method — was
 * rejected because it forces every backend (memory / sqlite-drizzle
 * / postgres-prisma) to implement an unrelated method, and breaks
 * every existing test that stubs `IJobObservationStore`.
 *
 * `HEALTH_SNAPSHOT_STORE_TOKEN` is the DI token. Backends that
 * implement this contract bind themselves to the token explicitly
 * (no auto-wiring from `StoreModule.forActive` — that module wires
 * `JOB_STORE_TOKEN` + optionally `JOB_OBSERVATION_STORE_TOKEN`).
 * The cron `@Optional()`-injects this token and silently bypasses
 * when unbound (Spec 005 / FR-8's "best-effort" wording).
 *
 * @see {@link SourceHealth} — the per-site shape this store records.
 * @see {@link HEALTH_SNAPSHOT_STORE_TOKEN} — the DI token.
 */
export interface IHealthSnapshotStore {
  /**
   * Append a batch of `SourceHealth` snapshots, all sharing the
   * same logical "tick" timestamp.
   *
   * The implementation MUST treat the call as append-only —
   * NEVER replace or merge with existing rows for the same
   * `(site, ts)` tuple. Empty input MUST short-circuit
   * (`Promise.resolve({ inserted: 0 })`) without touching the
   * underlying backend.
   *
   * `ts` is the cron-tick timestamp. Passing it explicitly keeps
   * every row in one batch sharing a single timestamp even if the
   * `putBatch` call straddles a millisecond boundary.
   *
   * The promise resolves with `{ inserted }`; failures bubble as
   * rejections (the cron catches them and treats persistence as
   * best-effort per FR-8).
   *
   * Method name is `putBatch` rather than the symmetric `putAll`
   * because the in-memory reference backend implements *both* this
   * interface and {@link IJobObservationStore} on the same class,
   * and {@link IJobObservationStore.putAll} already exists with a
   * different signature `(canonicalJobId, observations)`. Renaming
   * here avoids method-overload ambiguity that TypeScript can't
   * disambiguate when the same class implements both interfaces.
   */
  putBatch(
    snapshots: ReadonlyArray<SourceHealth>,
    ts: Date,
  ): Promise<{ inserted: number }>;

  /**
   * Read every snapshot whose `ts` is `>=` `since`, optionally
   * capped at `options.limit`. Returns a flat array sorted
   * ascending by `(ts, site)`. Used by future analytics dashboards
   * to render "last-N-minutes" health rollups.
   *
   * `options.site`, when present, narrows the query to one site.
   * `options.limit` defaults to `1_000` and MUST be clamped at
   * `10_000` to prevent unbounded reads.
   *
   * Implementations MAY return an empty array when no rows match;
   * a missing `ts` window is NOT an error.
   */
  listSince(
    since: Date,
    options?: HealthSnapshotQuery,
  ): Promise<ReadonlyArray<HealthSnapshotRow>>;

  /**
   * Latest recorded snapshot for `site`, or `null` when the store
   * has never received one for that site. Used by future health
   * checks that want "last known state" over the full historical
   * window without paginating.
   */
  latest(site: Site): Promise<SourceHealth | null>;
}

/**
 * Optional query envelope for {@link IHealthSnapshotStore.listSince}.
 *
 * Both fields are advisory:
 *  - `site`: restrict to one source; omitted = every site.
 *  - `limit`: max rows; omitted = {@link HEALTH_SNAPSHOT_QUERY_DEFAULT_LIMIT}.
 *    Clamped at {@link HEALTH_SNAPSHOT_QUERY_MAX_LIMIT}.
 */
export interface HealthSnapshotQuery {
  readonly site?: Site;
  readonly limit?: number;
}

/**
 * Single row returned by {@link IHealthSnapshotStore.listSince}.
 * Pairs the recorded `ts` with the `SourceHealth` payload — clients
 * need both to render a time-series chart, but the unbatched API
 * (`latest(site)`) returns just the payload because the timestamp
 * is implicitly "now-ish" for the latest snapshot.
 */
export interface HealthSnapshotRow {
  readonly ts: Date;
  readonly health: SourceHealth;
}

/**
 * Default for `HealthSnapshotQuery.limit`. Tuned for typical
 * "last-1000-rows" dashboard queries; matches the
 * `JOB_STORE_QUERY_DEFAULT_LIMIT` precedent in Spec 004.
 */
export const HEALTH_SNAPSHOT_QUERY_DEFAULT_LIMIT = 1_000;

/**
 * Hard cap for `HealthSnapshotQuery.limit`. Implementations MUST
 * clamp larger values rather than reject them — cap-and-continue
 * is the operator-friendly behaviour. Matches the
 * `JOB_STORE_QUERY_MAX_LIMIT` precedent.
 */
export const HEALTH_SNAPSHOT_QUERY_MAX_LIMIT = 10_000;

/**
 * DI token used to register the active health-snapshot store.
 *
 * `StoreModule.forActive(...)` binds this token automatically when
 * (and only when) the active backend's runtime instance satisfies
 * {@link isHealthSnapshotStore}. Backends that don't implement the
 * contract (e.g. `SqliteDrizzleJobStore`, `PostgresPrismaJobStore`
 * as of run #27) leave the token unbound — the cron `@Optional()`-
 * injects it and silently bypasses, exactly matching Spec 005 /
 * FR-8's "best-effort" / "bypass when no store" wording.
 *
 * The token is bound to the SAME instance that satisfies
 * `JOB_STORE_TOKEN` whenever the backend implements both contracts
 * (the in-memory reference backend does). Co-resident binding keeps
 * the snapshot history aligned with canonical-row writes — there's
 * no separate connection pool, no separate transaction boundary,
 * no risk of divergence under partial-outage scenarios.
 *
 * Operators wanting a different backend for snapshots vs canonical
 * jobs (e.g. canonicals in Postgres, snapshots in Redis) MUST
 * register a separate provider explicitly and pass
 * `bindHealthSnapshotStore: false` to `StoreModule.forActive(...)`.
 */
export const HEALTH_SNAPSHOT_STORE_TOKEN = 'HEALTH_SNAPSHOT_STORE';

/**
 * Type guard for {@link IHealthSnapshotStore}. Used by
 * `StoreModule.forActive(...)` to decide at boot whether the active
 * `IJobStore` instance also satisfies the snapshot contract — and
 * therefore whether the {@link HEALTH_SNAPSHOT_STORE_TOKEN} provider
 * should be bound.
 *
 * Checks all three interface methods are present and callable. A
 * half-implementation (e.g. `putBatch` defined but `latest` missing)
 * is rejected so the cron never receives a partially-broken store.
 */
export function isHealthSnapshotStore(
  candidate: unknown,
): candidate is IHealthSnapshotStore {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const c = candidate as Partial<IHealthSnapshotStore>;
  return (
    typeof c.putBatch === 'function' &&
    typeof c.listSince === 'function' &&
    typeof c.latest === 'function'
  );
}
