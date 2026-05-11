import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';

const FEED_CACHE_KEY = 'fresherflow_feed_cache';
const DETAIL_CACHE_PREFIX = 'fresherflow_detail_cache_';

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
    } catch (e) {
        console.warn('Failed to save feed cache', e);
    }
};

export const readFeedCache = async (): Promise<FeedCache | null> => {
    try {
        const data = await AsyncStorage.getItem(FEED_CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Failed to read feed cache', e);
        return null;
    }
};

export const saveDetailCache = async (opportunity: Opportunity) => {
    try {
        await AsyncStorage.setItem(`${DETAIL_CACHE_PREFIX}${opportunity.id}`, JSON.stringify(opportunity));
    } catch (e) {
        console.warn('Failed to save detail cache', e);
    }
};

export const readDetailCache = async (id: string): Promise<Opportunity | null> => {
    try {
        const data = await AsyncStorage.getItem(`${DETAIL_CACHE_PREFIX}${id}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.warn('Failed to read detail cache', e);
        return null;
    }
};
