import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@fresherflow/types';

const PROFILE_KEY = 'ff:local_profile';

export async function saveLocalProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('[localProfile] Failed to save:', error);
  }
}

export async function getLocalProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('[localProfile] Failed to get:', error);
    return null;
  }
}

export async function clearLocalProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}
