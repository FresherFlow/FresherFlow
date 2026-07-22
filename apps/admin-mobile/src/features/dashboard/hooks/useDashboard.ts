import { useState, useEffect, useCallback } from 'react';
import { getFirebaseDatabaseUrl } from '../../../config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[useDashboard] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export interface DashboardStats {
  totalUsers: number;
  totalViews: number;
  totalApplies: number;
  totalComments: number;
  loading: boolean;
  isConnected: boolean;
  connect: () => void;
}

export function useDashboard(): DashboardStats {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalViews: 0,
    totalApplies: 0,
    totalComments: 0,
    loading: false, // Start false since we wait for connect
    isConnected: false,
  });

  const connect = useCallback(() => {
    if (stats.isConnected) return;
    
    setStats(prev => ({ ...prev, loading: true }));
    const database = getDb();
    
    if (!database) {
      setStats(prev => ({ ...prev, loading: false }));
      return;
    }

    const globalRef = database.ref('/stats/global');
    const statsRef = database.ref('/stats');
    const commentsRef = database.ref('/comments');

    let totalUsers = 0;
    let totalViews = 0;
    let totalApplies = 0;
    let totalComments = 0;

    const updateStats = () => {
      setStats({
        totalUsers,
        totalViews,
        totalApplies,
        totalComments,
        loading: false,
        isConnected: true
      });
    };

    const handleGlobal = (snapshot: any) => {
      const data = snapshot.val();
      totalUsers = data?.downloads || 0;
      updateStats();
    };

    const handleStats = (snapshot: any) => {
      const data = snapshot.val();
      let viewsCount = 0;
      let appliesCount = 0;
      if (data) {
        Object.entries(data).forEach(([key, item]: [string, any]) => {
          if (key !== 'global' && item) {
            viewsCount += item.views || 0;
            appliesCount += item.applied || 0;
          }
        });
      }
      totalViews = viewsCount;
      totalApplies = appliesCount;
      updateStats();
    };

    const handleComments = (snapshot: any) => {
      const data = snapshot.val();
      let commentsCount = 0;
      if (data) {
        Object.values(data).forEach((jobComments: any) => {
          if (jobComments && typeof jobComments === 'object') {
            commentsCount += Object.keys(jobComments).length;
          }
        });
      }
      totalComments = commentsCount;
      updateStats();
    };

    globalRef.on('value', handleGlobal);
    statsRef.on('value', handleStats);
    commentsRef.on('value', handleComments);

    // Initial update to clear loading if no data immediately fires
    updateStats();
  }, [stats.isConnected]);

  // We intentionally don't cleanup in useEffect since we want listeners to stay active once connected
  // in a real app we might cleanup on unmount, but for a global admin dashboard, keeping it alive is fine.

  return { ...stats, connect };
}

