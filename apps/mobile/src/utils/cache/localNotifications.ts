/**
 * localNotifications.ts
 *
 * Smart notification engine for FresherFlow.
 *
 * Design principles:
 *  1. Profile must be filled in — zero alerts before that.
 *  2. Eligibility is the primary filter. ALL eligible+matched jobs are saved to in-app
 *     alerts (bell icon) so the user can always see them. No job is lost.
 *  3. Only 1 OS push notification fires per sync (the best match). Closing-soon gets
 *     its own push if it's a different job. No spam.
 *  4. Company follows get top priority — user said "I care about this company".
 *  5. Prime time (7-9 AM, 6-9 PM) allows more pushes. Off-peak allows fewer.
 *  6. Every sent job is tracked; we never fire a push for the same job twice.
 *  7. If user already viewed a job, it is skipped even in the bell.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunity, Profile } from '@fresherflow/types';
import { getLocalProfile } from './localProfile';
import { getLocalAlertPrefs } from './localAlerts';
import { calculateMatchScore } from '../matchScoring';
import { getSeenIds } from './seenJobs';
import { getJSON, setJSON, getString, setString } from '../storage';
import { useAuthStore } from '@/store/useAuthStore';
import * as Notifications from 'expo-notifications';

import {
  getDripQueue,
  dequeueDripJob,
  enqueueDripJobs,
  shouldTriggerDrip,
  recordDripTrigger,
  AlertOpportunity
} from '../dripQueue';

export { AlertOpportunity };

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const NOTIF_BADGE_KEY     = 'ff:unseen_badge_count';
export const LOCAL_ALERTS_KEY = 'ff:local_alerts_list';
const SENT_ALERT_IDS_KEY  = 'ff:sent_alert_ids_v2';      // jobId → never re-fire
const NOTIF_DAY_KEY       = 'ff:notif_day';            // YYYY-MM-DD

const NOTIF_DAY_COUNT_KEY = 'ff:notif_day_count';      // pushes fired today
const LAST_OS_PUSH_KEY     = 'ff:last_os_push_timestamp';
const MAX_LOCAL_ALERTS    = 50;
const MAX_ALERTS_PER_SYNC = 10;                       // max new jobs to add to list at once
const CLOSING_WINDOW_MS   = 48 * 60 * 60 * 1000;  // 48h
const JOB_FRESHNESS_DAYS  = 7;
const OS_PUSH_COOLDOWN_MS = 4 * 60 * 60 * 1000;

// ─── Free-Time Windows (device local time) ────────────────────────────────────
// PRIME TIME: notifications preferred here, allow more per day
// OFF-PEAK: still allowed, but fewer — users can receive any time, just not spammed
const PRIME_WINDOWS = [
  { start: 7, end: 9 },    // Morning:  7 AM – 9 AM
  { start: 18, end: 21 },  // Evening:  6 PM – 9 PM
];
const PRIME_MAX_PER_DAY  = 6;  // can send up to 6 during prime time
const OFFPEAK_MAX_PER_DAY = 4; // still 4 allowed outside prime time

// Closing-soon bypasses all caps — always fires immediately (it's urgent)

function isPrimeTime(): boolean {
  const hour = new Date().getHours();
  return PRIME_WINDOWS.some(w => hour >= w.start && hour < w.end);
}

/**
 * How many pushes are we allowed to send today?
 * More during prime hours, less during off-peak.
 */
function getDailyCapForNow(): number {
  return isPrimeTime() ? PRIME_MAX_PER_DAY : OFFPEAK_MAX_PER_DAY;
}

// ─── Daily push cap helpers ───────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getTodayPushCount(): number {
  const day = getString(NOTIF_DAY_KEY);
  if (day !== getTodayStr()) return 0;
  return parseInt(getString(NOTIF_DAY_COUNT_KEY) || '0', 10);
}

function incrementTodayPushCount(): void {
  const today = getTodayStr();
  const day = getString(NOTIF_DAY_KEY);
  const count = day === today ? parseInt(getString(NOTIF_DAY_COUNT_KEY) || '0', 10) : 0;
  setString(NOTIF_DAY_KEY, today);
  setString(NOTIF_DAY_COUNT_KEY, String(count + 1));
}

function canFireOsPush(): boolean {
  if (getTodayPushCount() >= getDailyCapForNow()) return false;
  const lastPush = parseInt(getString(LAST_OS_PUSH_KEY) || '0', 10);
  return !lastPush || Date.now() - lastPush >= OS_PUSH_COOLDOWN_MS;
}

function recordOsPush(): void {
  setString(LAST_OS_PUSH_KEY, String(Date.now()));
  incrementTodayPushCount();
}

// ─── Sent-IDs registry ────────────────────────────────────────────────────────

async function getSentAlertIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SENT_ALERT_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set();
  }
}

async function markAsSent(ids: string[]): Promise<void> {
  try {
    const sent = await getSentAlertIds();
    ids.forEach(id => sent.add(id));
    const capped = [...sent].slice(-500); // prevent unbounded growth
    await AsyncStorage.setItem(SENT_ALERT_IDS_KEY, JSON.stringify(capped));
  } catch {
    // ignore
  }
}

// ─── Profile helpers ──────────────────────────────────────────────────────────

export function isProfileSetupComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  
  // Need education for gating (degree/batch matching)
  const hasEducation = !!(profile.educationLevel || profile.gradCourse || profile.gradSpecialization);
  
  // Need preferences for role/skill matching
  const hasPreferences = !!(
    (profile.skills && profile.skills.length > 0) ||
    (profile.interestedIn && profile.interestedIn.length > 0) ||
    (profile.preferredCities && profile.preferredCities.length > 0)
  );

  return hasEducation && hasPreferences;
}


// ─── Local alert types ────────────────────────────────────────────────────────

export interface LocalAlert {
  id: string;
  opportunity: AlertOpportunity;
  kind: 'NEW_JOB' | 'CLOSING_SOON' | 'FOLLOWED_COMPANY';
  sentAt: string;
  readAt: string | null;
}

type AlertKind = LocalAlert['kind'];

// ─── Fire a single scheduled push ────────────────────────────────────────────

async function firePush(
  job: AlertOpportunity | { count: number, kind: 'GROUPED' },
  kind: AlertKind | 'GROUPED',
): Promise<void> {
  let title: string;
  let body: string;
  let data: any = {};
  let companyLogoUrl: string | undefined;

  if (kind === 'GROUPED' && 'count' in job) {
    title = `You have ${job.count} new matches`;
    body = `We found ${job.count} new jobs that match your profile. Tap to see them.`;
    data = { screen: 'Notifications' };
  } else if (kind !== 'GROUPED' && 'id' in job) {
    if (kind === 'CLOSING_SOON') {
      const hoursLeft = Math.round(
        (new Date(job.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60)
      );
      const timeLabel = hoursLeft <= 1 ? 'under an hour' : `${hoursLeft}h`;
      title = `Closes in ${timeLabel}: ${job.company}`;
      body  = `${job.title} — apply before it's gone! (${job.matchScore}% match)`;
    } else if (kind === 'FOLLOWED_COMPANY') {
      title = `New role at ${job.company}`;
      body  = `${job.title} — a company you follow just posted this${job.matchScore ? ` (${job.matchScore}% match)` : ''}.`;
    } else {
      const hasScore = !!job.matchScore;
      const scoreLabel = job.matchScore! >= 85 ? 'Top match' : job.matchScore! >= 70 ? 'Great match' : 'New role';
      title = `${hasScore ? scoreLabel : 'New role'} at ${job.company}`;
      body  = `${job.title}${job.matchScore ? ` — ${job.matchScore}% profile match` : ''}`;
    }
    data = { jobId: job.id, companyLogoUrl: job.companyLogoUrl || undefined };
    companyLogoUrl = job.companyLogoUrl || undefined;
  } else {
    return;
  }

  const channelId = kind === 'CLOSING_SOON' ? 'deadlines' : 'matches';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      android: {
        channelId,
        smallIcon: '@drawable/notification_icon',
        largeIcon: companyLogoUrl,
      },
    } as any,
    trigger: null,
  });
}

// ─── Get followed company domains from cache ──────────────────────────────────

function getFollowedCompanyKeys(): Set<string> {
  const FOLLOWS_CACHE_KEY = 'fresherflow_follows_cache_v1';
  const cached = getJSON<{ companies?: string[] }>(FOLLOWS_CACHE_KEY);
  const keys = new Set<string>();
  (cached?.companies || []).forEach(c => keys.add(c.toLowerCase().trim()));
  return keys;
}

function jobMatchesFollowedCompany(job: Opportunity, followedKeys: Set<string>): boolean {
  if (followedKeys.size === 0) return false;
  const domain = job.companyWebsite
    ?.replace(/^https?:\/\/(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
    .trim();
  return !!(
    (domain && followedKeys.has(domain)) ||
    (job.company && followedKeys.has(job.company.toLowerCase().trim()))
  );
}

// ─── Main entry: called after every feed sync ─────────────────────────────────

export async function diffAndNotify(freshJobs: Opportunity[]): Promise<number> {
  try {
    const userId = useAuthStore.getState().user?.id;
    const [profile, prefs, seenIds, sentIds] = await Promise.all([
      getLocalProfile(userId),
      getLocalAlertPrefs(),

      getSeenIds(),
      getSentAlertIds(),
    ]);

    // Gate 1: global kill switch
    if (prefs && !prefs.enabled) return 0;

    // Gate 2: profile must be filled before any alerts fire
    if (!isProfileSetupComplete(profile)) return 0;

    const minScore     = prefs?.minRelevanceScore ?? 50;
    const now          = Date.now();
    const freshnessMs  = JOB_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
    const followedKeys = getFollowedCompanyKeys();

    // Buckets — priority order: followed company > high match > medium match > low match > closing soon
    const followedNew: AlertOpportunity[]   = [];  // followed company, new job today
    const highMatch: AlertOpportunity[]     = [];  // eligible + score >= 75, not seen
    const medMatch: AlertOpportunity[]      = [];  // eligible + score >= minScore, not seen
    const lowMatch: AlertOpportunity[]      = [];  // eligible + score < minScore, not seen
    const closingSoon: AlertOpportunity[]   = [];  // eligible + expiring in 48h + not seen

    for (const job of freshJobs) {
      // Never re-fire a notification for the same job
      if (sentIds.has(job.id)) continue;

      // Skip expired
      if (job.expiresAt && new Date(job.expiresAt).getTime() <= now) continue;

      const match = calculateMatchScore(profile, job);
      if (!match.isEligible) continue; // eligibility is mandatory

      const enriched: AlertOpportunity = {
        ...job,
        matchScore: match.score,
        matchReason: match.reason,
      };

      const postedAgo = now - new Date(job.postedAt).getTime();

      // ── CLOSING SOON: expiring within 48h, user hasn't viewed it ──────────
      if (
        prefs?.closingSoon !== false &&
        job.expiresAt &&
        !seenIds.has(job.id) &&
        new Date(job.expiresAt).getTime() - now <= CLOSING_WINDOW_MS
      ) {
        closingSoon.push(enriched);
        continue; // closing-soon jobs go only into that bucket
      }

      // Skip jobs that are stale for new-job alerts
      if (postedAgo > freshnessMs) continue;

      // User already viewed this job — no need to alert
      if (seenIds.has(job.id)) continue;

      // ── FOLLOWED COMPANY: job posted in last 24h by a company user follows ─
      if (
        jobMatchesFollowedCompany(job, followedKeys) &&
        postedAgo <= 24 * 60 * 60 * 1000 // only truly new posts
      ) {
        followedNew.push(enriched);
      } else if (match.score >= 75) {
        highMatch.push(enriched);
      } else if (match.score >= minScore) {
        medMatch.push(enriched);
      } else {
        lowMatch.push(enriched);
      }
    }

    // ── Sort each bucket by match score ───────────────────────────────────────
    const sortByScore = (a: AlertOpportunity, b: AlertOpportunity) =>
      (b.matchScore || 0) - (a.matchScore || 0);

    followedNew.sort(sortByScore);
    highMatch.sort(sortByScore);
    medMatch.sort(sortByScore);
    closingSoon.sort(
      (a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime()
    );

    const pushableQueue: Array<{ job: AlertOpportunity; kind: AlertKind }> = [
      ...followedNew.map(j => ({ job: j, kind: 'FOLLOWED_COMPANY' as AlertKind })),
      ...highMatch.map(j =>  ({ job: j, kind: 'NEW_JOB' as AlertKind })),
      ...medMatch.map(j =>   ({ job: j, kind: 'NEW_JOB' as AlertKind })),
    ];
    
    const silentQueue: Array<{ job: AlertOpportunity; kind: AlertKind }> = [
      ...lowMatch.map(j => ({ job: j, kind: 'NEW_JOB' as AlertKind }))
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // LIST LIMIT + DRIP QUEUE FOR OVERFLOW
    // ─────────────────────────────────────────────────────────────────────────
    const sentNow: string[] = [];
    const pushableToProcess: typeof pushableQueue = [];
    const silentToProcess: typeof silentQueue = [];
    const overflowToDrip: Array<{ job: AlertOpportunity; kind: AlertKind }> = [];
    
    let addedCount = 0;

    for (const item of pushableQueue) {
      if (addedCount < MAX_ALERTS_PER_SYNC) {
        pushableToProcess.push(item);
        addedCount++;
      } else {
        overflowToDrip.push(item);
      }
    }
    for (const item of silentQueue) {
      if (addedCount < MAX_ALERTS_PER_SYNC) {
        silentToProcess.push(item);
        addedCount++;
      } else {
        overflowToDrip.push(item);
      }
    }

    // Send the remaining jobs to the drip queue to be added later (e.g. 30 mins later)
    if (overflowToDrip.length > 0) {
      await enqueueDripJobs(
        overflowToDrip.map(({ job, kind }) => ({ ...job, _alertKind: kind } as AlertOpportunity))
      );
      // Mark them as sent so they aren't processed repeatedly as freshJobs (they are safe in drip queue now)
      overflowToDrip.forEach(({ job }) => sentNow.push(job.id));
    }
    let pushFiredCount = 0;

    // Step 1: Save ALL limited eligible jobs to in-app alerts list (no push yet)
    for (const { job, kind } of pushableToProcess) {
      await saveLocalAlerts([job], kind);
      sentNow.push(job.id);
    }
    for (const { job, kind } of silentToProcess) {
      await saveLocalAlerts([job], kind);
      sentNow.push(job.id);
    }
    for (const job of closingSoon) {
      await saveLocalAlerts([job], 'CLOSING_SOON');
      sentNow.push(job.id);
    }

    // Step 2: Fire at most 1 OS notification. Closing-soon wins priority.
    if (canFireOsPush()) {
      if (closingSoon.length > 0) {
        await firePush(closingSoon[0], 'CLOSING_SOON');
        recordOsPush();
        pushFiredCount++;
      } else if (pushableToProcess.length === 1) {
        const { job: heroJob, kind: heroKind } = pushableToProcess[0];
        await firePush(heroJob, heroKind);
        recordOsPush();
        pushFiredCount++;
      } else if (pushableToProcess.length > 1) {
        await firePush({ count: pushableToProcess.length, kind: 'GROUPED' }, 'GROUPED');
        recordOsPush();
        pushFiredCount++;
      }
    }

    // Step 4: Mark all as sent so we never re-process them
    if (sentNow.length > 0) {
      await markAsSent(sentNow);
    }

    // Step 5: Update badge = total new in-app alerts added (not just pushes)
    const totalNewAlerts = pushableToProcess.length + silentToProcess.length + closingSoon.length;
    if (totalNewAlerts > 0) {
      const current = await getUnseenCount();
      await AsyncStorage.setItem(NOTIF_BADGE_KEY, String(current + totalNewAlerts));
    }

    return pushFiredCount;
  } catch (error) {
    console.error('[localNotifications] diffAndNotify failed:', error);
    return 0;
  }
}

// ─── Drip: promote next queued match when cooldown passes ─────────────────────

export async function processNextDripAlertIfNeeded(): Promise<boolean> {
  try {
    const queue = await getDripQueue();
    if (queue.length === 0) return false;

    // Check 30-min cooldown between drips
    const trigger = await shouldTriggerDrip();
    if (!trigger) return false;

    const nextOpportunity = await dequeueDripJob();
    if (!nextOpportunity) return false;

    // If user already viewed this job while it sat in the queue — skip silently
    const seenIds = await getSeenIds();
    if (seenIds.has(nextOpportunity.id)) {
      await recordDripTrigger();
      return false;
    }

    // Respect dynamic daily cap (prime time = more, off-peak = fewer)
    if (getTodayPushCount() >= getDailyCapForNow()) {
      // Put it back in front of queue — try again next window
      await enqueueDripJobs([nextOpportunity]);
      return false;
    }

    const kind: AlertKind = (nextOpportunity as any)._alertKind || 'NEW_JOB';
    await saveLocalAlerts([nextOpportunity], kind);
    await markAsSent([nextOpportunity.id]);
    await recordDripTrigger();
    return true;
  } catch (error) {
    console.error('[localNotifications] Drip processing failed:', error);
    return false;
  }
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

export async function saveLocalAlerts(
  newJobs: AlertOpportunity[],
  kind: AlertKind = 'NEW_JOB'
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_ALERTS_KEY);
    const existing: LocalAlert[] = raw ? JSON.parse(raw) : [];
    const existingIds = new Set(existing.map(a => a.id));

    const newAlerts: LocalAlert[] = newJobs
      .filter(job => !existingIds.has(job.id))
      .map(job => ({
        id: job.id,
        opportunity: job,
        kind,
        sentAt: new Date().toISOString(),
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
    const parsed: LocalAlert[] = raw ? JSON.parse(raw) : [];
    // Filter out any accidentally saved invalid alerts to fix ghost badges
    return parsed.filter(a => a.opportunity?.matchReason !== 'Complete profile to see eligibility');

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

export async function markAllLocalAlertsAsRead(sector?: 'PRIVATE' | 'GOVERNMENT'): Promise<void> {
  try {
    const alerts = await getLocalAlerts();
    const updated = alerts.map(a => {
        if (!sector || a.opportunity.type === sector || (sector === 'PRIVATE' && a.opportunity.type !== 'GOVERNMENT')) {
            return { ...a, readAt: a.readAt || new Date().toISOString() };
        }
        return a;
    });
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
