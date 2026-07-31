import { FieldWithProvenance } from './field-with-provenance.interface';

/**
 * Field-level merge policy used by the dedup engine (Spec 003 / FR-4).
 *
 * Given multiple `FieldWithProvenance<T>` candidates for the same field name,
 * the resolver picks (or synthesizes) the winning value. Keep
 * implementations pure and side-effect-free — they run inside the dedup
 * hot loop.
 */
export interface IMergeResolver {
  /**
   * Pick the winning candidate for a single field.
   *
   * @param fieldName e.g. "title", "company", "compensation", "description"
   * @param candidates non-empty array of provenanced values from N sources
   */
  merge<T>(
    fieldName: string,
    candidates: ReadonlyArray<FieldWithProvenance<T>>,
  ): FieldWithProvenance<T>;
}

/** DI token used to register the active merge resolver. */
export const MERGE_RESOLVER_TOKEN = 'MERGE_RESOLVER';
