import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity, Profile } from '@fresherflow/types';
import { getLocalProfile } from './localProfile';
import { getLocalAlertPrefs } from './localAlerts';
import { calculateMatchScore } from './matchScoring';
import { getSeenIds } from './seenJobs';
import * as Notifications from 'expo-notifications';
import { 
  getDripQueue, 
  dequeueDripJob, 
  enqueueDripJobs, 
  shouldTriggerDrip, 
  recordDripTrigger,
  AlertOpportunity
} from './dripQueue';

export { AlertOpportunity };

const NOTIF_BADGE_KEY = 'ff:unseen_badge_count';
export const LOCAL_ALERTS_KEY = 'ff:local_alerts_list';
const MAX_LOCAL_ALERTS = 50;

export interface LocalAlert {
  id: string; // matches opportunity id
  opportunity: AlertOpportunity;
  kind: 'NEW_JOB' | 'CLOSING_SOON';
  sentAt: string;
  readAt: string | null;
}

/**
 * Checks if the user profile setup has at least one critical selection
 */
export function isProfileSetupComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return !!(
    (profile.skills && profile.skills.length > 0) ||
    (profile.preferredCities && profile.preferredCities.length > 0) ||
    (profile.interestedIn && profile.interestedIn.length > 0) ||
    profile.educationLevel
  );
}

export async function diffAndNotify(freshJobs: Opportunity[]): Promise<number> {
  try {
    const seenIds = await getSeenIds();
    const profile = await getLocalProfile();
    const prefs = await getLocalAlertPrefs();

    // If notifications are disabled globally, return 0
    if (prefs && !prefs.enabled) return 0;
    
    // If the profile setup is incomplete (anonymous/profiling stage),
    // we do NOT burst any live notifications from the CDN JSON feed.
    if (!isProfileSetupComplete(profile)) {
      return 0;
    }

    const minScoreThreshold = prefs?.minRelevanceScore ?? 45;

    // Filter opportunities that match the user's completed profile
    const matchedJobs: AlertOpportunity[] = [];
    
    for (const job of freshJobs) {
      // 1. Not seen yet
      if (seenIds.has(job.id)) continue;
      
      // 2. Not expired
      if (job.expiresAt && new Date(job.expiresAt) < new Date()) continue;

      // 3. Match score filtering
      const match = calculateMatchScore(profile, job);
      if (match.isEligible && match.score >= minScoreThreshold) {
        matchedJobs.push({
          ...job,
          matchScore: match.score,
          matchReason: match.reason,
        });
      }
    }

    if (matchedJobs.length > 0) {
      // Sort matched opportunities by score descending to get highest match
      const sortedMatched = [...matchedJobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      
      // Pick the single highest match as the "Hero Match" to show immediately
      const heroJob = sortedMatched[0];
      const remainingJobs = sortedMatched.slice(1);

      // Save hero match instantly
      await saveLocalAlerts([heroJob]);

      // Trigger push notification for the Hero Match
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "New AI Match Found! 🚀",
          body: `${heroJob.company} has a new ${heroJob.title} role (${heroJob.matchScore}% Match).`,
          data: { url: `fresherflow://opportunities/${heroJob.id}`, jobId: heroJob.id },
          sound: true,
        },
        trigger: null,
      });

      // Queue the remaining matched jobs to be "dripped" staggered over time
      if (remainingJobs.length > 0) {
        await enqueueDripJobs(remainingJobs);
      }
    }

    // Always attempt to process any queued drip alerts that are ready
    await processNextDripAlertIfNeeded();

    const currentCount = await getUnseenCount();
    const updatedCount = currentCount + (matchedJobs.length > 0 ? 1 : 0);
    await AsyncStorage.setItem(NOTIF_BADGE_KEY, String(updatedCount));
    
    return updatedCount;
  } catch (error) {
    console.error('[localNotifications] Diff failed:', error);
    return 0;
  }
}

/**
 * Checks the drip queue and promotes the next matched alert if the cooldown has elapsed.
 */
export async function processNextDripAlertIfNeeded(): Promise<boolean> {
  try {
    const queue = await getDripQueue();
    if (queue.length === 0) return false;

    const trigger = await shouldTriggerDrip();
    if (!trigger) return false;

    const nextOpportunity = await dequeueDripJob();
    if (!nextOpportunity) return false;

    // Promote queued opportunity to a live local alert
    await saveLocalAlerts([nextOpportunity]);
    await recordDripTrigger();

    // Trigger OS local push notification
    const scoreText = nextOpportunity.matchScore ? ` (${nextOpportunity.matchScore}% Match)` : '';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New Matched Job Alert! 🎯",
        body: `Matches your profile: ${nextOpportunity.title} at ${nextOpportunity.company}${scoreText}.`,
        data: { url: `fresherflow://opportunities/${nextOpportunity.id}`, jobId: nextOpportunity.id },
        sound: true,
      },
      trigger: null,
    });

    return true;
  } catch (error) {
    console.error('[localNotifications] Drip processing failed:', error);
    return false;
  }
}

export async function saveLocalAlerts(newJobs: AlertOpportunity[]) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ALERTS_KEY);
    const existing: LocalAlert[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(existing.map(a => a.id));

    const sortedNewJobs = [...newJobs].sort((a, b) => {
      const dateA = new Date(a.postedAt || 0).getTime();
      const dateB = new Date(b.postedAt || 0).getTime();
      return dateB - dateA;
    });

    const newAlerts: LocalAlert[] = sortedNewJobs
      .filter(job => !existingIds.has(job.id))
      .map((job, idx) => ({
        id: job.id,
        opportunity: job,
        kind: 'NEW_JOB',
        sentAt: new Date(Date.now() - idx).toISOString(),
        readAt: null,
      }));

    if (newAlerts.length === 0) return;

    const updated = [...newAlerts, ...existing].slice(0, MAX_LOCAL_ALERTS);
    await AsyncStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[localNotifications] Failed to save local alerts', e);
  }
}

export async function getLocalAlerts(): Promise<LocalAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markLocalAlertAsRead(id: string): Promise<void> {
  try {
    const alerts = await getLocalAlerts();
    const updated = alerts.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a);
    await AsyncStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function markAllLocalAlertsAsRead(): Promise<void> {
  try {
    const alerts = await getLocalAlerts();
    const updated = alerts.map(a => ({ ...a, readAt: new Date().toISOString() }));
    await AsyncStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function deleteLocalAlert(id: string): Promise<void> {
  try {
    const alerts = await getLocalAlerts();
    const updated = alerts.filter(a => a.id !== id);
    await AsyncStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
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
