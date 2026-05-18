import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

/**
 * Persister for React Query using MMKV for ultra-fast startup with cached data.
 * Complies with Rule 5: "keeping data in the local-first cache".
 */
export const queryPersister = createSyncStoragePersister({
  storage: {
    setItem: (key, value) => {
      storage.set(key, value);
    },
    getItem: (key) => {
      const value = storage.getString(key);
      return value === undefined ? null : value;
    },
    removeItem: (key) => {
      storage.delete(key);
    },
  },
});
