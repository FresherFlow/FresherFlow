export type JobSector = 'PRIVATE' | 'GOVERNMENT';

/**
 * Generates a scoped key based on the currently active sector.
 * Used for namespacing MMKV caches (e.g., feed, saved jobs, notifications).
 *
 * @param baseKey - The core key name (e.g., 'fresherflow_feed_index')
 * @param sector - The active job sector ('PRIVATE' or 'GOVERNMENT')
 * @returns The namespaced key (e.g., 'fresherflow_feed_index_private')
 */
export const getSectorKey = (baseKey: string, sector: JobSector): string => {
  return `${baseKey}_${sector.toLowerCase()}`;
};
