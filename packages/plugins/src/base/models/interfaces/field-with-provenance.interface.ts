import { Site } from '../enums/site.enum';

/**
 * A field value that carries the source it came from.
 *
 * Used by the dedup/merge layer (Spec 003) to preserve provenance after
 * collapsing N source-observations into one canonical record. The merge
 * resolver decides which `FieldWithProvenance<T>` wins per field.
 */
export interface FieldWithProvenance<T> {
  /** The actual field value. */
  readonly value: T;
  /** Site enum identifying the originating plugin. */
  readonly _source: Site;
  /** Source-local id (whatever the upstream platform calls it). */
  readonly _sourceId: string;
  /** ISO-8601 timestamp of when the value was observed. */
  readonly _observedAt: string;
}

/**
 * Helper to build a `FieldWithProvenance<T>` without repeating the shape.
 */
export function provenance<T>(
  value: T,
  source: Site,
  sourceId: string,
  observedAt: string = new Date().toISOString(),
): FieldWithProvenance<T> {
  return { value, _source: source, _sourceId: sourceId, _observedAt: observedAt };
}
