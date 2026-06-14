import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export * from './toast/toast';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface ToastPayload {
    message: string;
    tone: 'info' | 'success' | 'error';
}

interface NotificationContextType {
  nativePushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  requestPushPermission: () => Promise<void>;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => void;
  toast: ToastPayload | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type FirebaseDatabase = {
  ref(path: string): {
    set(value: unknown): Promise<void>;
  };
};

let databaseInstance: FirebaseDatabase | null | undefined;

function getDb(databaseUrl?: string): FirebaseDatabase | null {
  if (databaseInstance !== undefined) return databaseInstance;
  if (!databaseUrl) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebase = require('@react-native-firebase/app').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(databaseUrl) as FirebaseDatabase;
  } catch (error) {
    console.warn('[NotificationProvider] Firebase Database unavailable:', error);
    databaseInstance = null;
  }

  return databaseInstance;
}

function getTokenKey(token: string): string {
  return token.replace(new RegExp('[.#$\\[\\]/]', 'g'), '_');
}

export const NotificationProvider: React.FC<{
  children: React.ReactNode,
  firebaseUserId?: string,
  firebaseDatabaseUrl?: string
}> = ({ children, firebaseUserId, firebaseDatabaseUrl }) => {
  const [nativePushToken, setNativePushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPushPermission = async () => {
    const token = await registerForPushNotificationsAsync();
    setNativePushToken(token);
  };

  const showToast = useCallback((message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    // Defer to avoid cascading renders warning
    setTimeout(() => {
      void requestPushPermission();
    }, 0);

    notificationListener.current = Notifications.addNotificationReceivedListener((notificationValue: Notifications.Notification) => {
      setNotification(notificationValue);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
      console.log('User interacted with notification', response);
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (firebaseUserId && nativePushToken && firebaseDatabaseUrl) {
      const db = getDb(firebaseDatabaseUrl);
      if (!db) return;

      void db.ref(`/users/${firebaseUserId}/pushTokens/${getTokenKey(nativePushToken)}`).set({
        token: nativePushToken,
        platform: Platform.OS,
        provider: Platform.OS === 'android' ? 'fcm' : 'apns',
        updatedAt: Date.now(),
      }).catch((err: unknown) => console.warn('Failed to register Firebase push token', err));
    }
  }, [firebaseDatabaseUrl, firebaseUserId, nativePushToken]);

  return (
    <NotificationContext.Provider value={{ nativePushToken, notification, requestPushPermission, showToast, toast }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }

    try {
      token = String((await Notifications.getDevicePushTokenAsync()).data);
    } catch (e) {
      console.warn('Could not get push token', e);
    }
  }

  return token;
}
