import { useEffect, useState } from 'react';
import { database } from '@/lib/api/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { ActionType } from '@fresherflow/types';

export interface FirebaseTrackerItem {
  status: ActionType;
  updatedAt: number;
}

export type FirebaseTrackerMap = Record<string, FirebaseTrackerItem>;

const LOCAL_TRACKER_KEY = 'ff_local_tracker_v1';
const LEGACY_TRACKER_KEYS = ['ff_tracker_jobs', 'tracker_jobs', 'fresherflow_tracker_jobs'];

function getLocalTracker(): FirebaseTrackerMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_TRACKER_KEY);
    let map: FirebaseTrackerMap = raw ? JSON.parse(raw) : {};

    for (const key of LEGACY_TRACKER_KEYS) {
      try {
        const legacyRaw = window.localStorage.getItem(key);
        if (legacyRaw) {
          const legacyParsed = JSON.parse(legacyRaw);
          if (typeof legacyParsed === 'object' && legacyParsed !== null) {
            map = { ...legacyParsed, ...map };
          }
        }
      } catch {
        // ignore
      }
    }
    return map;
  } catch {
    return {};
  }
}

function saveLocalTracker(map: FirebaseTrackerMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_TRACKER_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function useFirebaseTracker(userId: string | undefined) {
  const [trackerMap, setTrackerMap] = useState<FirebaseTrackerMap>(getLocalTracker);
  const [loading, setLoading] = useState(false);

  // Sync state with local storage on mount
  useEffect(() => {
    const localData = getLocalTracker();
    if (Object.keys(localData).length > 0) {
      setTrackerMap((prev) => ({ ...localData, ...prev }));
    }
  }, []);

  // Firebase Realtime DB subscription for background sync
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const trackerRef = ref(database, `/users/${userId}/tracker`);

    const unsubscribe = onValue(trackerRef, (snapshot) => {
      const remoteVal = (snapshot.val() || {}) as FirebaseTrackerMap;
      setTrackerMap((prev) => {
        const merged = { ...getLocalTracker(), ...prev, ...remoteVal };
        saveLocalTracker(merged);
        return merged;
      });
      setLoading(false);
    }, (error) => {
      if (process.env.NODE_ENV === 'development' && !error?.message?.includes('permission_denied')) {
        console.warn('[useFirebaseTracker] Subscription failed:', error);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const writeTrackerItem = async (opportunityId: string, status: ActionType) => {
    const newItem: FirebaseTrackerItem = {
      status,
      updatedAt: Date.now(),
    };

    // 1. Local-first optimistic update (0ms UI latency)
    setTrackerMap((prev) => {
      const updated = { ...prev, [opportunityId]: newItem };
      saveLocalTracker(updated);
      return updated;
    });

    // 2. Background sync to Firebase RTDB
    if (userId) {
      try {
        const itemRef = ref(database, `/users/${userId}/tracker/${opportunityId}`);
        await set(itemRef, newItem);
      } catch {
        // Local state remains intact if remote sync fails temporarily
      }
    }
  };

  const removeTrackerItem = async (opportunityId: string) => {
    // 1. Local-first optimistic delete
    setTrackerMap((prev) => {
      const updated = { ...prev };
      delete updated[opportunityId];
      saveLocalTracker(updated);
      return updated;
    });

    // 2. Background sync delete to Firebase RTDB
    if (userId) {
      try {
        const itemRef = ref(database, `/users/${userId}/tracker/${opportunityId}`);
        await remove(itemRef);
      } catch {
        // Local state remains intact
      }
    }
  };

  return {
    trackerMap,
    loading,
    writeTrackerItem,
    removeTrackerItem,
  };
}
