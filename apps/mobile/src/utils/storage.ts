import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'fresherflow-storage',
});

/**
 * MMKV Helper: Get string or null
 */
export const getString = (key: string): string | null => {
  return storage.getString(key) ?? null;
};

/**
 * MMKV Helper: Set string
 */
export const setString = (key: string, value: string) => {
  storage.set(key, value);
};

/**
 * MMKV Helper: Get boolean or default
 */
export const getBoolean = (key: string, defaultValue = false): boolean => {
  return storage.getBoolean(key) ?? defaultValue;
};

/**
 * MMKV Helper: Set boolean
 */
export const setBoolean = (key: string, value: boolean) => {
  storage.set(key, value);
};

/**
 * MMKV Helper: Get JSON object
 */
export const getJSON = <T>(key: string): T | null => {
  const data = storage.getString(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
};

/**
 * MMKV Helper: Set JSON object
 */
export const setJSON = (key: string, value: unknown) => {
  storage.set(key, JSON.stringify(value));
};

/**
 * MMKV Helper: Delete key
 */
export const remove = (key: string) => {
  storage.delete(key);
};
