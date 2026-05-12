import AsyncStorage from '@react-native-async-storage/async-storage';

const SEEN_KEY = 'ff:seen_job_ids';
const MAX_SEEN = 500; // rolling window, prune oldest

export async function markJobAsSeen(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(id)) return;
    
    // Add to end and keep only last 500
    const updated = [...seen, id].slice(-MAX_SEEN);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[seenJobs] Failed to mark as seen:', error);
  }
}

export async function getSeenIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (error) {
    console.error('[seenJobs] Failed to get seen IDs:', error);
    return new Set();
  }
}

export async function isJobSeen(id: string): Promise<boolean> {
  const seen = await getSeenIds();
  return seen.has(id);
}
