import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Opportunity, SharedResource } from '@fresherflow/types';

const FEED_CACHE_KEY = 'ff_mobile_feed_cache_v1';
const DETAIL_CACHE_PREFIX = 'ff_mobile_detail_';
const SAVED_CACHE_KEY = 'ff_mobile_saved_v1';
const SAVED_RESOURCES_CACHE_KEY = 'ff_mobile_saved_resources_v1';

export interface FeedCachePayload {
  cachedAt: number;
  items: Opportunity[];
}

export async function saveFeedCache(items: Opportunity[]) {
  const payload: FeedCachePayload = { cachedAt: Date.now(), items };
  await AsyncStorage.setItem(FEED_CACHE_KEY, JSON.stringify(payload));
}

export async function readFeedCache(): Promise<FeedCachePayload | null> {
  const raw = await AsyncStorage.getItem(FEED_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FeedCachePayload;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveDetailCache(opportunity: Opportunity) {
  await AsyncStorage.setItem(
    `${DETAIL_CACHE_PREFIX}${opportunity.id}`,
    JSON.stringify(opportunity),
  );
}

export async function readDetailCache(id: string): Promise<Opportunity | null> {
  const raw = await AsyncStorage.getItem(`${DETAIL_CACHE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Opportunity;
  } catch {
    return null;
  }
}

export async function saveSavedJobs(items: Opportunity[]) {
  await AsyncStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(items));
}

export async function readSavedJobs(): Promise<Opportunity[]> {
  const raw = await AsyncStorage.getItem(SAVED_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Opportunity[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSavedResources(items: SharedResource[]) {
  await AsyncStorage.setItem(SAVED_RESOURCES_CACHE_KEY, JSON.stringify(items));
}

export async function readSavedResources(): Promise<SharedResource[]> {
  const raw = await AsyncStorage.getItem(SAVED_RESOURCES_CACHE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SharedResource[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
