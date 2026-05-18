const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const cache = {};
let isHydrated = false;
const hydrationListeners = [];

// Hydrate cache from AsyncStorage on boot
AsyncStorage.getAllKeys().then(keys => {
  if (!keys || keys.length === 0) {
    isHydrated = true;
    hydrationListeners.forEach(cb => cb());
    return;
  }
  AsyncStorage.multiGet(keys).then(pairs => {
    if (pairs) {
      pairs.forEach(([key, val]) => {
        if (val !== null) {
          cache[key] = val;
        }
      });
    }
    isHydrated = true;
    hydrationListeners.forEach(cb => cb());
  });
}).catch(err => {
  console.error('[Mock-MMKV] Hydration failed:', err);
  isHydrated = true;
});

class MMKV {
  constructor(config = {}) {
    this.prefix = config.id ? `${config.id}:` : '';
  }

  _getKey(key) {
    return this.prefix + key;
  }

  getString(key) {
    return cache[this._getKey(key)];
  }

  getBoolean(key) {
    const val = cache[this._getKey(key)];
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }

  getNumber(key) {
    const val = cache[this._getKey(key)];
    if (val === undefined) return undefined;
    const parsed = Number(val);
    return isNaN(parsed) ? undefined : parsed;
  }

  set(key, value) {
    const fullKey = this._getKey(key);
    const stringVal = String(value);
    cache[fullKey] = stringVal;
    AsyncStorage.setItem(fullKey, stringVal).catch(err => {
      console.error(`[Mock-MMKV] Failed to save key "${key}":`, err);
    });
  }

  delete(key) {
    const fullKey = this._getKey(key);
    delete cache[fullKey];
    AsyncStorage.removeItem(fullKey).catch(err => {
      console.error(`[Mock-MMKV] Failed to delete key "${key}":`, err);
    });
  }

  clearAll() {
    Object.keys(cache).forEach(key => {
      if (key.startsWith(this.prefix)) {
        delete cache[key];
        AsyncStorage.removeItem(key).catch(err => {});
      }
    });
  }
}

module.exports = {
  MMKV
};
