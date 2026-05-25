import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Requests push notification permissions and retrieves the Expo Push Token.
 * Also configures the default notification channel for Android devices.
 * 
 * @returns {Promise<string | null>} The Expo Push Token or null if failed/simulator.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use a physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Notification permission was not granted.');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[Push] Warning: EAS Project ID not found in Expo configuration.');
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    
    console.log('[Push] Successfully obtained Expo Push Token:', token);

    if (Platform.OS === 'android') {
      // 1. Matches / Opportunities Channel (High Importance, Sound & Banner)
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'Job Opportunities',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F71',
      });

      // 2. Deadlines / Expiring Channel (Max Importance, Persistent Alert)
      await Notifications.setNotificationChannelAsync('deadlines', {
        name: 'Application Deadlines',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FFFF0000',
      });

      // 3. Community / Social Channel (Default Importance, Quiet)
      await Notifications.setNotificationChannelAsync('community', {
        name: 'Social & Community',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#FF00FF00',
      });

      // 4. Fallback Default Channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    return token;
  } catch (error) {
    console.error('[Push] Error registering for push notifications:', error);
    return null;
  }
}
