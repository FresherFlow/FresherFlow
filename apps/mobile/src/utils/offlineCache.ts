import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';

const FEED_CACHE_KEY = 'fresherflow_feed_cache';
const DETAIL_CACHE_PREFIX = 'fresherflow_detail_cache_';
const LAST_SYNC_KEY = 'fresherflow_last_sync_timestamp';

export const saveLastSyncTimestamp = async (timestamp: string) => {
    try {
        await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
        console.warn('Failed to save last sync timestamp', error);
    }
};

export const getLastSyncTimestamp = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch {
        return null;
    }
};

export interface FeedCache {
    items: Opportunity[];
    timestamp: number;
}

export const saveFeedCache = async (items: Opportunity[]) => {
    try {
        const cache: FeedCache = {
            items,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save feed cache', error);
    }
};

export const readFeedCache = async (): Promise<FeedCache | null> => {
    try {
        const data = await AsyncStorage.getItem(FEED_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read feed cache', error);
        return null;
    }
};

const SIMILAR_CACHE_PREFIX = 'fresherflow_similar_cache_';

export const saveDetailCache = async (opportunity: Opportunity) => {
    try {
        const cache = {
            ...opportunity,
            _cachedAt: Date.now()
        };
        await AsyncStorage.setItem(`${DETAIL_CACHE_PREFIX}${opportunity.id}`, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save detail cache', error);
    }
};

export const readDetailCache = async (id: string): Promise<Opportunity & { _cachedAt?: number } | null> => {
    try {
        const data = await AsyncStorage.getItem(`${DETAIL_CACHE_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read detail cache', error);
        return null;
    }
};

export interface SimilarCache {
    opportunities: Opportunity[];
    timestamp: number;
}

export const saveSimilarCache = async (opportunityId: string, opportunities: Opportunity[]) => {
    try {
        const cache: SimilarCache = {
            opportunities,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(`${SIMILAR_CACHE_PREFIX}${opportunityId}`, JSON.stringify(cache));
    } catch (error) {
        console.warn('Failed to save similar cache', error);
    }
};

export const readSimilarCache = async (opportunityId: string): Promise<SimilarCache | null> => {
    try {
        const data = await AsyncStorage.getItem(`${SIMILAR_CACHE_PREFIX}${opportunityId}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Failed to read similar cache', error);
        return null;
    }
};
