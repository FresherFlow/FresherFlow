import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { profileApi } from '@fresherflow/api-client';

export * from './toast/toast';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
  requestPushPermission: () => Promise<void>;
  showToast: (message: string, tone?: 'info' | 'success' | 'error') => void;
  toast: ToastPayload | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode, userId?: string }> = ({ children, userId }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const requestPushPermission = async () => {
    const token = await registerForPushNotificationsAsync();
    setExpoPushToken(token);
  };

  const showToast = (message: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, tone });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

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
    if (userId && expoPushToken) {
      void profileApi.registerPushToken(expoPushToken, 'expo')
        .catch((err: unknown) => console.warn('Failed to register push token with backend', err));
    }
  }, [userId, expoPushToken]);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification, requestPushPermission, showToast, toast }}>
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
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } else {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
    } catch (e) {
      console.warn('Could not get push token', e);
    }
  }

  return token;
}
