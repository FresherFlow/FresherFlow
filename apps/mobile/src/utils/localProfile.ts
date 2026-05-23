import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '@fresherflow/types';
import { saveOnboardingProfile, readOnboardingSnapshot } from './onboardingState';

const PROFILE_KEY = 'ff:local_profile';
const PROFILE_PREFIX = 'ff:local_profile:';

export async function saveLocalProfile(profile: Profile, userId?: string): Promise<void> {
  try {
    const key = userId || profile.userId ? `${PROFILE_PREFIX}${userId || profile.userId}` : PROFILE_KEY;
    await AsyncStorage.setItem(key, JSON.stringify(profile));
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (userId || profile.userId) {
      saveOnboardingProfile(userId || profile.userId, profile);
    }
  } catch (error) {
    console.error('[localProfile] Failed to save:', error);
  }
}

export async function getLocalProfile(userId?: string): Promise<Profile | null> {
  try {
    if (userId) {
      const snapshot = readOnboardingSnapshot(userId);
      if (snapshot?.profile) return snapshot.profile;

      const scoped = await AsyncStorage.getItem(`${PROFILE_PREFIX}${userId}`);
      if (scoped) return JSON.parse(scoped);
    }

    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('[localProfile] Failed to get:', error);
    return null;
  }
}

export async function clearLocalProfile(userId?: string): Promise<void> {
  try {
    if (userId) {
      await AsyncStorage.removeItem(`${PROFILE_PREFIX}${userId}`);
    } else {
      await AsyncStorage.removeItem(PROFILE_KEY);
    }
  } catch {
    // ignore
  }
}
