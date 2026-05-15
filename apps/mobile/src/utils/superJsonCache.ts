import superjson from 'superjson';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Premium Cache Utility that preserves complex types (Dates, BigInts, etc.)
 * using SuperJSON serialization.
 * 
 * Uses AsyncStorage for high-performance non-sensitive bulk data.
 */
export const superJsonCache = {
    /**
     * Save data with type preservation
     */
    async setItem<T>(key: string, data: T): Promise<void> {
        try {
            const serialized = superjson.stringify(data);
            await AsyncStorage.setItem(key, serialized);
        } catch (error) {
            console.error(`[SuperJSON] Failed to cache item for key: ${key}`, error);
        }
    },

    /**
     * Retrieve and reconstruct original types
     */
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const value = await AsyncStorage.getItem(key);
            if (!value) return null;
            return superjson.parse<T>(value);
        } catch (error) {
            console.error(`[SuperJSON] Failed to parse item for key: ${key}`, error);
            return null;
        }
    },

    /**
     * Clean up cache
     */
    async removeItem(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    }
};
