import { useState, useEffect, useCallback } from 'react';
import { getFirebaseDatabaseUrl } from '../config/firebase';

let databaseInstance: any;

function getDb() {
  if (databaseInstance !== undefined) return databaseInstance;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(getFirebaseDatabaseUrl());
  } catch (error) {
    console.warn('[useLiveUserLinks] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export interface UserLink {
  id: string;
  url: string;
  userId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
}

export function useLiveUserLinks() {
  const [links, setLinks] = useState<UserLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const database = getDb();
    if (!database) {
      setIsLoading(false);
      return;
    }

    const linksRef = database.ref('/user_links');

    const handleValueChange = (snapshot: any) => {
      const val = snapshot.val();
      if (!val) {
        setLinks([]);
      } else {
        const list: UserLink[] = [];
        Object.keys(val).forEach((key) => {
          const item = val[key];
          list.push({
            id: key,
            url: item.url ?? '',
            userId: item.userId,
            status: item.status ?? 'pending',
            createdAt: item.createdAt ?? new Date().toISOString(),
            processedAt: item.processedAt,
          });
        });
        // Sort by newest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLinks(list);
      }
      setIsLoading(false);
    };

    setIsLoading(true);
    linksRef.on('value', handleValueChange);

    return () => {
      linksRef.off('value', handleValueChange);
    };
  }, []);

  const createUserLink = useCallback(async (url: string, userId?: string) => {
    const database = getDb();
    if (!database) {
      throw new Error('Firebase Database unavailable');
    }
    const linksRef = database.ref('/user_links');
    const newRef = linksRef.push();
    await newRef.set({
      url,
      userId: userId || 'anonymous',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }, []);

  const updateUserLinkStatus = useCallback(async (id: string, status: 'approved' | 'rejected') => {
    const database = getDb();
    if (!database) {
      throw new Error('Firebase Database unavailable');
    }
    const linkRef = database.ref(`/user_links/${id}`);
    await linkRef.update({
      status,
      processedAt: new Date().toISOString(),
    });
  }, []);

  return {
    links,
    isLoading,
    createUserLink,
    updateUserLinkStatus,
  };
}
