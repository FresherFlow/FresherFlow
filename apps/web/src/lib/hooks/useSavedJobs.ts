import { useEffect, useSyncExternalStore } from 'react';
import { database } from '@/lib/api/firebase';
import { ref, onValue, set } from 'firebase/database';

const LOCAL_SAVED_KEY = 'ff_local_saved_v1';
const LEGACY_KEYS = ['ff_saved_jobs', 'saved_jobs', 'fresherflow_saved_jobs'];

function getLocalSaved(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_SAVED_KEY);
    let map: Record<string, boolean> = raw ? JSON.parse(raw) : {};

    for (const key of LEGACY_KEYS) {
      try {
        const legacyRaw = window.localStorage.getItem(key);
        if (legacyRaw) {
          const legacyParsed = JSON.parse(legacyRaw);
          if (Array.isArray(legacyParsed)) {
            legacyParsed.forEach((id: string) => {
              if (typeof id === 'string') map[id] = true;
            });
          } else if (typeof legacyParsed === 'object' && legacyParsed !== null) {
            map = { ...legacyParsed, ...map };
          }
        }
      } catch {
        // ignore legacy key parsing error
      }
    }
    return map;
  } catch {
    return {};
  }
}

function saveLocalSaved(map: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

// In-memory module-level store for zero-latency, 100% synchronized state across all components
let sharedSavedJobsMap: Record<string, boolean> = getLocalSaved();
const listeners = new Set<() => void>();
const emptyMap: Record<string, boolean> = {};

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function setSharedSavedJobsMap(nextMap: Record<string, boolean>) {
  sharedSavedJobsMap = nextMap;
  saveLocalSaved(nextMap);
  notifyListeners();
}

// Listen to storage events across browser tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_SAVED_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        sharedSavedJobsMap = parsed;
        notifyListeners();
      } catch {
        // ignore
      }
    }
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return sharedSavedJobsMap;
}

function getServerSnapshot() {
  return emptyMap;
}

export function useSavedJobs(userId?: string) {
  const savedJobsMap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Firebase Realtime DB subscription for background sync
  useEffect(() => {
    if (!userId) return;

    const savedRef = ref(database, `/users/${userId}/savedJobs`);

    const unsubscribe = onValue(
      savedRef,
      (snapshot) => {
        const rawVal = snapshot.val();
        const remoteVal: Record<string, boolean> = {};
        if (Array.isArray(rawVal)) {
          rawVal.forEach((id) => {
            if (typeof id === 'string' && id) {
              remoteVal[id] = true;
            }
          });
        } else if (rawVal && typeof rawVal === 'object') {
          Object.entries(rawVal as Record<string, boolean>).forEach(([key, val]) => {
            if (val) {
              remoteVal[key] = true;
            }
          });
        }

        const currentLocal = getLocalSaved();
        const merged = { ...currentLocal, ...sharedSavedJobsMap, ...remoteVal };
        setSharedSavedJobsMap(merged);
      },
      (error) => {
        if (process.env.NODE_ENV === 'development' && !error?.message?.includes('permission_denied')) {
          console.warn('[useSavedJobs] Subscription failed:', error);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const toggleSavedJob = async (opportunityId: string) => {
    const isCurrentlySaved = !!sharedSavedJobsMap[opportunityId];

    // 1. Local-first optimistic update (0ms UI latency across all components)
    const updated = { ...sharedSavedJobsMap };
    if (isCurrentlySaved) {
      delete updated[opportunityId];
    } else {
      updated[opportunityId] = true;
    }
    setSharedSavedJobsMap(updated);

    // 2. Background sync to Firebase RTDB
    if (userId) {
      try {
        const savedRef = ref(database, `/users/${userId}/savedJobs`);
        await set(savedRef, updated);
      } catch {
        // Local state remains intact if remote sync fails temporarily
      }
    }
  };

  return {
    savedJobsMap,
    loading: false,
    toggleSavedJob,
  };
}

export const useFirebaseSaved = useSavedJobs;
