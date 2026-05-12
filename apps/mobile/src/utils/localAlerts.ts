import AsyncStorage from '@react-native-async-storage/async-storage';

const ALERT_PREFS_KEY = 'ff:alert_preferences';

export type AlertPreference = {
    enabled: boolean;
    emailEnabled: boolean;
    dailyDigest: boolean;
    closingSoon: boolean;
    minRelevanceScore: number;
    preferredHour: number;
    timezone: string;
};

export async function saveLocalAlertPrefs(prefs: AlertPreference): Promise<void> {
    try {
        await AsyncStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
        console.error('[localAlerts] Failed to save:', error);
    }
}

export async function getLocalAlertPrefs(): Promise<AlertPreference | null> {
    try {
        const raw = await AsyncStorage.getItem(ALERT_PREFS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error('[localAlerts] Failed to get:', error);
        return null;
    }
}
