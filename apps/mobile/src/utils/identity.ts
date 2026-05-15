import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ANON_ID_KEY = 'ff_anon_user_id';

/**
 * Generates a simple UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Identity Manager
 * 
 * Handles persistent anonymous user identification for device-scoped tracking
 * and behavioral personalization.
 */
export const IdentityManager = {
  /**
   * Initializes the anonymous identity.
   * Checks SecureStore first (most persistent), then AsyncStorage (fallback),
   * or generates a new one.
   */
  async initialize(): Promise<string> {
    try {
      // 1. Check SecureStore (Best for survival across reinstalls)
      let id = await SecureStore.getItemAsync(ANON_ID_KEY);
      
      if (!id) {
        // 2. Check AsyncStorage (Backup)
        id = await AsyncStorage.getItem(ANON_ID_KEY);
      }

      if (!id) {
        // 3. Generate New
        id = generateUUID();
        
        // 4. Persist everywhere
        await Promise.all([
          SecureStore.setItemAsync(ANON_ID_KEY, id),
          AsyncStorage.setItem(ANON_ID_KEY, id)
        ]);
      } else {
        // Ensure both are in sync if only one was found
        await Promise.all([
          SecureStore.setItemAsync(ANON_ID_KEY, id),
          AsyncStorage.setItem(ANON_ID_KEY, id)
        ]);
      }

      return id;
    } catch (error) {
      console.warn('[IdentityManager] Failed to initialize identity:', error);
      return 'guest-fallback';
    }
  },

  /**
   * Retrieves the current anonymous ID synchronously from memory (after init)
   * or asynchronously if needed.
   */
  async getAnonId(): Promise<string> {
    return await IdentityManager.initialize();
  }
};
