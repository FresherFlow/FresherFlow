import { Role, User, Profile } from '@fresherflow/types';
import { profileApi, usernameApi } from '@fresherflow/api-client';
import { getJSON, setJSON, remove } from './storage';

type ProfileSyncKind = 'education' | 'preferences' | 'readiness' | 'demographics';

type SyncQueueItem =
  | { id: string; userId: string; firebaseUid?: string; kind: 'username'; username: string; createdAt: number }
  | { id: string; userId: string; firebaseUid?: string; kind: ProfileSyncKind; payload: Record<string, unknown>; createdAt: number };

export interface OnboardingSnapshot {
  user: User;
  profile: Profile | null;
  skipUsernameSetup: boolean;
  updatedAt: number;
}

const SNAPSHOT_PREFIX = 'ff:onboarding:user:';
const QUEUE_KEY = 'ff:onboarding:sync_queue';

const snapshotKey = (userId: string) => `${SNAPSHOT_PREFIX}${userId}`;

export function readOnboardingSnapshot(userId: string): OnboardingSnapshot | null {
  return getJSON<OnboardingSnapshot>(snapshotKey(userId));
}

export function writeOnboardingSnapshot(userId: string, patch: Partial<OnboardingSnapshot>): OnboardingSnapshot {
  const existing = readOnboardingSnapshot(userId);
  const fallbackUser: User = {
    id: userId,
    email: undefined,
    fullName: 'User',
    role: Role.USER,
    username: null,
    isAnonymous: false,
    createdAt: new Date().toISOString(),
    isOptimistic: true,
  };

  const next: OnboardingSnapshot = {
    user: patch.user || existing?.user || fallbackUser,
    profile: patch.profile !== undefined ? patch.profile : existing?.profile || null,
    skipUsernameSetup: patch.skipUsernameSetup ?? existing?.skipUsernameSetup ?? false,
    updatedAt: Date.now(),
  };

  setJSON(snapshotKey(userId), next);
  return next;
}

export function clearOnboardingSnapshot(userId: string) {
  remove(snapshotKey(userId));
}

export function saveOnboardingUser(user: User, skipUsernameSetup?: boolean) {
  writeOnboardingSnapshot(user.id, {
    user,
    profile: user.profile || readOnboardingSnapshot(user.id)?.profile || null,
    skipUsernameSetup,
  });
}

export function saveOnboardingProfile(userId: string, profile: Profile) {
  const existing = readOnboardingSnapshot(userId);
  writeOnboardingSnapshot(userId, {
    profile,
    user: existing?.user
      ? { ...existing.user, profile }
      : {
          id: userId,
          email: undefined,
          fullName: 'User',
          role: Role.USER,
          username: null,
          isAnonymous: false,
          createdAt: new Date().toISOString(),
          profile,
          isOptimistic: true,
        },
  });
}

function getQueue(): SyncQueueItem[] {
  return getJSON<SyncQueueItem[]>(QUEUE_KEY) || [];
}

function setQueue(items: SyncQueueItem[]) {
  setJSON(QUEUE_KEY, items);
}

export function enqueueUsernameClaim(userId: string, username: string, firebaseUid?: string) {
  // Deduplicate: remove any existing username claim for this user (by either ID)
  const queue = getQueue().filter(item => !(
    item.kind === 'username' &&
    (item.userId === userId || (firebaseUid && item.userId === firebaseUid))
  ));
  queue.push({
    id: `username:${userId}:${Date.now()}`,
    userId,
    firebaseUid,
    kind: 'username',
    username,
    createdAt: Date.now(),
  });
  setQueue(queue);
}

/** Remove a username claim from the queue (call after a successful background HTTP claim). */
export function removeUsernameClaim(userId: string, firebaseUid?: string) {
  const queue = getQueue().filter(item => !(
    item.kind === 'username' &&
    (item.userId === userId || (firebaseUid && item.userId === firebaseUid))
  ));
  setQueue(queue);
}

export function enqueueProfileSync(userId: string, kind: ProfileSyncKind, payload: Record<string, unknown>) {
  const queue = getQueue().filter(item => !(item.userId === userId && item.kind === kind));
  queue.push({
    id: `${kind}:${userId}:${Date.now()}`,
    userId,
    kind,
    payload,
    createdAt: Date.now(),
  });
  setQueue(queue);
}

function isPermanentSyncError(error: unknown, kind?: string) {
  const status = (error as { status?: number })?.status;
  // For username claims: 403 means "already claimed / cooldown" — the username IS set, so drop it
  if (kind === 'username' && status === 403) return true;
  // 401 = auth issue (token not ready yet or expired) — retry, don't drop
  // 408/429 = timeout / rate limit — retry
  // 400/404/422 = bad data — drop permanently
  const AUTH_ERRORS = [401];
  const TRANSIENT_ERRORS = [408, 429];
  if (!status || status >= 500) return false; // server error — retry
  if (AUTH_ERRORS.includes(status)) return false; // auth error — retry
  if (TRANSIENT_ERRORS.includes(status)) return false; // transient — retry
  return true; // 400, 403, 404, 422, etc — drop
}

const QUEUE_ITEM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function flushOnboardingSyncQueue(userId: string, firebaseUid?: string): Promise<number> {
  const queue = getQueue();
  const remaining: SyncQueueItem[] = [];
  let flushed = 0;
  const now = Date.now();

  for (const item of queue) {
    // Match by Postgres userId OR Firebase UID (stored at enqueue time)
    const isOwnItem =
      item.userId === userId ||
      (firebaseUid && (item.userId === firebaseUid || item.firebaseUid === firebaseUid)) ||
      (item.firebaseUid && item.firebaseUid === firebaseUid);

    if (!isOwnItem) {
      remaining.push(item);
      continue;
    }

    // Drop stale items to prevent queue bloat (older than 7 days)
    if (now - item.createdAt > QUEUE_ITEM_MAX_AGE_MS) {
      if (__DEV__) { console.warn('[onboardingState] Dropping stale sync item (>7 days):', item.kind) }
      continue;
    }

    try {
      if (item.kind === 'username') {
        await usernameApi.claim(item.username);
      } else if (item.kind === 'education') {
        await profileApi.updateEducation(item.payload as Parameters<typeof profileApi.updateEducation>[0]);
      } else if (item.kind === 'preferences') {
        await profileApi.updatePreferences(item.payload as Parameters<typeof profileApi.updatePreferences>[0]);
      } else if (item.kind === 'readiness') {
        await profileApi.updateReadiness(item.payload as Parameters<typeof profileApi.updateReadiness>[0]);
      } else if (item.kind === 'demographics') {
        await profileApi.updateDemographics(item.payload as Parameters<typeof profileApi.updateDemographics>[0]);
      }
      flushed += 1;
      if (__DEV__) { console.log('[onboardingState] Flushed sync item:', item.kind) }
    } catch (error) {
      if (isPermanentSyncError(error, item.kind)) {
        if (__DEV__) { console.warn('[onboardingState] Dropping permanent sync failure:', item.kind, (error as any)?.status) }
      } else {
        // Auth/network/server error — keep in queue for next flush
        if (__DEV__) { console.warn('[onboardingState] Keeping sync item for retry:', item.kind, (error as any)?.status) }
        remaining.push(item);
      }
    }
  }

  setQueue(remaining);
  return flushed;
}
