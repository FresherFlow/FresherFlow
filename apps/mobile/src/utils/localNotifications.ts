import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity } from '@fresherflow/types';
import { getLocalProfile } from './localProfile';
import { getLocalAlertPrefs } from './localAlerts';
import { calculateMatchScore } from './matchScoring';
import { getSeenIds } from './seenJobs';
import * as Notifications from 'expo-notifications';

const NOTIF_BADGE_KEY = 'ff:unseen_badge_count';
const LOCAL_ALERTS_KEY = 'ff:local_alerts_list';
const MAX_LOCAL_ALERTS = 50;

export interface LocalAlert {
  id: string; // matches opportunity id
  opportunity: Opportunity;
  kind: 'NEW_JOB' | 'CLOSING_SOON';
  sentAt: string;
  readAt: string | null;
}

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

    if (newUnseen.length > 0) {
      await saveLocalAlerts(newUnseen);

      // Trigger actual local push notification
      if (newUnseen.length === 1) {
        const job = newUnseen[0];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "New Opportunity Matched! 🚀",
            body: `${job.company} just posted a ${job.title} role.`,
            data: { url: `fresherflow://opportunities/${job.id}`, jobId: job.id },
            sound: true,
          },
          trigger: null,
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${newUnseen.length} New Matches Found! 🔥`,
            body: `Check out new roles at ${newUnseen[0].company} and more.`,
            data: { url: `fresherflow://notifications` },
            sound: true,
          },
          trigger: null,
        });
      }
    }

    const currentCount = await getUnseenCount();
    const totalCount = currentCount + newUnseen.length;
    await AsyncStorage.setItem(NOTIF_BADGE_KEY, String(totalCount));
    
    return totalCount;
  } catch (error) {
    console.error('[localNotifications] Diff failed:', error);
    return 0;
  }
}

async function saveLocalAlerts(newJobs: Opportunity[]) {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ALERTS_KEY);
    const existing: LocalAlert[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(existing.map(a => a.id));

    // Sort new jobs by postedAt descending to ensure most recent is first in the list
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
        // Slight offset for sentAt to maintain stable sort order if detected in same batch
        sentAt: new Date(Date.now() - idx).toISOString(),
        readAt: null,
      }));

    if (newAlerts.length === 0) return;

    // Prepend new alerts and limit size
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
