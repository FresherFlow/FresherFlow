import { useState, useEffect } from 'react';
import { getFirebaseDatabaseUrl } from '../config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[useLiveJobStats] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export interface JobStats {
  views: number;
  applied: number;
}

export function useLiveJobStats(jobId: string | undefined): JobStats {
  const [stats, setStats] = useState<JobStats>({ views: 0, applied: 0 });

  useEffect(() => {
    if (!jobId) {
      setStats({ views: 0, applied: 0 });
      return;
    }

    const database = getDb();
    if (!database) return;

    const statsRef = database.ref(`/stats/${jobId}`);

    const handleValueChange = (snapshot: any) => {
      const val = snapshot.val();
      setStats({
        views: val?.views ?? 0,
        applied: val?.applied ?? 0,
      });
    };

    statsRef.on('value', handleValueChange);

    return () => {
      statsRef.off('value', handleValueChange);
    };
  }, [jobId]);

  return stats;
}
