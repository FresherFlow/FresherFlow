import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';
import { getLocalProfile } from './localProfile';
import { getLocalAlertPrefs } from './localAlerts';
import { calculateMatchScore } from './matchScoring';
import { getSeenIds } from './seenJobs';

const NOTIF_BADGE_KEY = 'ff:unseen_badge_count';

export async function diffAndNotify(freshJobs: Opportunity[]): Promise<number> {
  try {
    const seenIds = await getSeenIds();
    const profile = await getLocalProfile();
    const prefs = await getLocalAlertPrefs();

    // If notifications are disabled globally or no profile, return 0
    if (prefs && !prefs.enabled) return 0;
    
    // Simple diff: fresh jobs that haven't been seen yet
    const newUnseen = freshJobs.filter(job => {
      // 1. Not seen yet
      if (seenIds.has(job.id)) return false;
      
      // 2. Not expired
      if (job.expiresAt && new Date(job.expiresAt) < new Date()) return false;

      // 3. Client-side logic: Filter by relevance if profile exists
      if (profile) {
        const match = calculateMatchScore(profile, job);
        // Only notify if eligible and meets threshold
        const threshold = prefs?.minRelevanceScore ?? 45;
        if (!match.isEligible || match.score < threshold) return false;
      }
      
      return true;
    });

    const count = newUnseen.length;
    await AsyncStorage.setItem(NOTIF_BADGE_KEY, String(count));
    return count;
  } catch (error) {
    console.error('[localNotifications] Diff failed:', error);
    return 0;
  }
}

export async function getUnseenCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_BADGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function clearUnseenCount(): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_BADGE_KEY, '0');
  } catch {
    // ignore
  }
}
