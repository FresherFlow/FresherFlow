import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSectorStore } from '@/store/useSectorStore';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';
import { getString, setString } from '@/utils/storage';

import { RootStackParamList } from './types';
export type { RootStackParamList };

import { MainTabNavigator } from './MainTabNavigator';
import { AuthStack } from './stacks/AuthStack';
import { DiscoveryStack } from './stacks/DiscoveryStack';
import { ProfileStack } from './stacks/ProfileStack';
import { SocialStack } from './stacks/SocialStack';
import { SettingsStack } from './stacks/SettingsStack';
import { ResourcesStack } from './stacks/ResourcesStack';

const Stack = createNativeStackNavigator<RootStackParamList>();

// --- Full app stack (anonymous + authenticated users) ---
// Auth is a modal inside here — guest users can navigate to it contextually.
const AppStack = ({ initialRouteName = 'Main' }: { initialRouteName?: keyof RootStackParamList }) => (
  <Stack.Navigator
    screenOptions={{ 
      headerShown: false, 
      animation: 'none' 
    }}
    initialRouteName={initialRouteName}
  >
    <Stack.Screen name="Main" component={MainTabNavigator} />
    {AuthStack(Stack)}
    {DiscoveryStack(Stack)}
    {ProfileStack(Stack)}
    {SocialStack(Stack)}
    {SettingsStack(Stack)}
    {ResourcesStack(Stack)}
  </Stack.Navigator>
);

/**
 * AppNavigator replaces the old AuthGate logic.
 * It uses a unified AppStack, allowing contextually pushed screens (like Auth/ChooseUsername)
 * to coexist peacefully with the navigation history.
 */
const AppLoading = () => {
  const { currentTheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={currentTheme.colors.primary} />
    </View>
  );
};

export const AppNavigator = () => {
  const { isSkipLoaded } = useAuthStore();
  const { sector, hasHydrated: sectorHydrated, hydrate: hydrateSector } = useSectorStore();
  const { hasHydrated: prefsHydrated, hydrate: hydratePrefs } = useAppPreferencesStore();
  
  // Default to null so we block rendering until we know for sure
  const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    hydrateSector();
    hydratePrefs();
    // Read onboarding flag synchronously from MMKV (migrated from AsyncStorage)
    const val = getString('ff_onboarding_completed');
    if (val !== null && val !== undefined) {
      setIsOnboardingCompleted(val === 'true');
    } else {
      // Async fallback for users who set the flag before the MMKV migration
      AsyncStorage.getItem('ff_onboarding_completed').then((asyncVal) => {
        setIsOnboardingCompleted(asyncVal === 'true');
        // Migrate to MMKV for future reads
        if (asyncVal !== null) setString('ff_onboarding_completed', asyncVal);
      }).catch(() => setIsOnboardingCompleted(false));
    }
  }, [hydrateSector, hydratePrefs]);

  // Block rendering until auth store, sector, prefs, and onboarding state are resolved
  if (!isSkipLoaded || !sectorHydrated || !prefsHydrated || isOnboardingCompleted === null) {
    return <AppLoading />;
  }

  let initialRouteName: keyof RootStackParamList = 'Main';
  if (!isOnboardingCompleted) {
    initialRouteName = 'Onboarding';
  } else if (!sector) {
    initialRouteName = 'SectorSelection';
  }

  return <AppStack initialRouteName={initialRouteName} />;
};
