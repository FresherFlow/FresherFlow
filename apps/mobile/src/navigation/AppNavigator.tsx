import React, { useRef, useEffect, useCallback } from 'react';
import { Platform, Animated, View, StyleSheet, Pressable, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Compass, PlusCircle, Bookmark, User } from 'lucide-react-native';
import { haptic } from '@/utils/haptics';
import { ScreenErrorBoundary } from '@/system/components/ScreenErrorBoundary';

import FeedScreen from '@/screens/feed/FeedScreen';
import ExploreScreen from '@/screens/feed/ExploreScreen';
import GovtFeedScreen from '@/screens/feed/GovtFeedScreen';
import GovtExploreScreen from '@/screens/feed/GovtExploreScreen';
import ShareScreen from '@/screens/social/ShareScreen';
import JobDetailScreen from '@/screens/discovery/JobDetailScreen';
import GovtJobDetailScreen from '@/screens/discovery/GovtJobDetailScreen';
import GovtVacancyDetailScreen from '@/screens/discovery/GovtVacancyDetailScreen';
import SkillSearchScreen from '@/screens/discovery/SkillSearchScreen';
import SavedScreen from '@/screens/feed/SavedScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import MySharesScreen from '@/screens/social/MySharesScreen';
import FollowedCompaniesScreen from '@/screens/profile/FollowedCompaniesScreen';
import AuthScreen from '@/screens/auth/AuthScreen';
import AppearanceScreen from '@/screens/settings/AppearanceScreen';
import AppPreferencesScreen from '@/screens/settings/AppPreferencesScreen';
import BottomNavPreferencesScreen from '@/screens/settings/BottomNavPreferencesScreen';
import FeedTabsPreferencesScreen from '@/screens/settings/FeedTabsPreferencesScreen';
import EditEducationScreen from '@/screens/profile/EditEducationScreen';
import EditSkillsScreen from '@/screens/profile/EditSkillsScreen';
import EditPreferencesScreen from '@/screens/profile/EditPreferencesScreen';
import EditDemographicsScreen from '@/screens/profile/EditDemographicsScreen';
import CareerProfileScreen from '@/screens/profile/CareerProfileScreen';
import DashboardScreen from '@/screens/profile/DashboardScreen';
import InviteScreen from '@/screens/social/InviteScreen';
import AccountManageScreen from '@/screens/settings/AccountManageScreen';
import NotificationsScreen from '@/screens/social/NotificationsScreen';
import ContributorProfileScreen from '@/screens/discovery/ContributorProfileScreen';
import CompanyScreen from '@/screens/discovery/CompanyScreen';
import AlertSettingsScreen from '@/screens/settings/AlertSettingsScreen';
import ApplicationTrackerScreen from '@/screens/settings/ApplicationTrackerScreen';
import FeedbackScreen from '@/screens/settings/FeedbackScreen';
import LegalScreen from '@/screens/settings/LegalScreen';
import ChooseUsernameScreen from '@/screens/auth/ChooseUsernameScreen';
import AboutScreen from '@/screens/settings/AboutScreen';
import OTAUpdatesScreen from '@/screens/settings/OTAUpdatesScreen';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';
import SectorSelectionScreen from '@/screens/auth/SectorSelectionScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prep Resources Screens
import { ResourcesDirectoryScreen } from '@/screens/resources/ResourcesDirectoryScreen';
import { ResourceGroupDetailScreen } from '@/screens/resources/ResourceGroupDetailScreen';
import { ResourceCollectionDetailScreen } from '@/screens/resources/ResourceCollectionDetailScreen';


import { useTheme } from '@/contexts/ThemeContext';
import { useUI } from '@/contexts/UIContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useSectorStore } from '@/store/useSectorStore';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getString, setString } from '@/utils/storage';

import { RootStackParamList } from './types';
export type { RootStackParamList };
import { alpha } from '@/theme';

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabIcon = React.memo(({ focused, color, IconComponent }: {
  focused: boolean;
  color: string;
  IconComponent: React.ElementType;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      bounciness: 0,
      speed: 40,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ scale: scaleAnim }],
    }}>
      <IconComponent color={color} size={focused ? 24 : 22} />
    </Animated.View>
  );
});

// Each tab is wrapped in its own ScreenErrorBoundary so a crash in one tab
// doesn't kill the entire app — users can still switch to other tabs.

// Stable wrapper components: The `component` prop on Stack.Screen MUST be a stable reference.
// If we passed `sector === 'GOVERNMENT' ? GovtFeedScreen : FeedScreen` directly to the component prop,
// React Navigation would unmount + remount the screen every time sector changes.
// Instead, these routers are always the same component reference and read sector internally.
const FeedRouter = (props: any) => {
  const { sector } = useSectorStore();
  return sector === 'GOVERNMENT' ? <GovtFeedScreen {...props} /> : <FeedScreen {...props} />;
};

const ExploreRouter = (props: any) => {
  const { sector } = useSectorStore();
  return sector === 'GOVERNMENT' ? <GovtExploreScreen {...props} /> : <ExploreScreen {...props} />;
};

const FeedStack = () => (
  <ScreenErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedList" component={FeedRouter} />
    </Stack.Navigator>
  </ScreenErrorBoundary>
);

const ExploreStack = () => (
  <ScreenErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreMain" component={ExploreRouter} />
    </Stack.Navigator>
  </ScreenErrorBoundary>
);

const ShareStack = () => (
  <ScreenErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ShareMain" component={ShareScreen} />
    </Stack.Navigator>
  </ScreenErrorBoundary>
);

const SavedStack = () => (
  <ScreenErrorBoundary>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SavedList" component={SavedScreen} />
    </Stack.Navigator>
  </ScreenErrorBoundary>
);

const ProfileStackNav = createNativeStackNavigator<RootStackParamList>();

const ProfileStack = () => (
  <ScreenErrorBoundary>
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <ProfileStackNav.Screen name="ProfileMain" component={SettingsScreen} />
      <ProfileStackNav.Screen name="Appearance" component={AppearanceScreen} />
      <ProfileStackNav.Screen name="AppPreferences" component={AppPreferencesScreen} />
      <ProfileStackNav.Screen name="BottomNavPreferences" component={BottomNavPreferencesScreen} />
      <ProfileStackNav.Screen name="FeedTabsPreferences" component={FeedTabsPreferencesScreen} />
      <ProfileStackNav.Screen name="AccountManage" component={AccountManageScreen} />
    </ProfileStackNav.Navigator>
  </ScreenErrorBoundary>
);

const CustomTabBar = React.memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { currentTheme } = useTheme();
  const { tabBarTranslateY, isKeyboardVisible } = useUI();

  const isDark = currentTheme.mode === 'dark';

  return (
    <Animated.View style={[
      styles.tabBarContainer,
      {
        transform: [{ translateY: tabBarTranslateY }],
        opacity: isKeyboardVisible ? 0 : 1,
        display: isKeyboardVisible ? 'none' : 'flex',
        backgroundColor: currentTheme.colors.background,
        borderTopWidth: 1,
        borderTopColor: isDark ? alpha(currentTheme.colors.text, 0.1) : alpha(currentTheme.colors.border, 0.2),
      },
    ]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Support hiding tabs by checking if tabBarButton is overridden to return null
          if (options.tabBarButton) {
            const renderBtn = options.tabBarButton;
            if (typeof renderBtn === 'function' && renderBtn({} as any) === null) {
              return null;
            }
          }

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              haptic.light();
              navigation.navigate(route.name);
            }
          };

          let Icon = Home;
          if (route.name === 'Explore') Icon = Compass;
          if (route.name === 'Share') Icon = PlusCircle;
          if (route.name === 'Saved') Icon = Bookmark;
          if (route.name === 'Profile') Icon = User;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              hitSlop={8}
            >
              <View>
                <TabIcon
                  focused={isFocused}
                  color={isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted}
                  IconComponent={Icon}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted },
              ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
});

const renderTabBar = (props: BottomTabBarProps) => <CustomTabBar {...props} />;

const TabNavigator = () => {
  const hiddenTabs = useAppPreferencesStore(s => s.hiddenTabs);
  
  return (
    <Tab.Navigator
      tabBar={renderTabBar}
      screenOptions={{ 
        headerShown: false,
        freezeOnBlur: true,
        lazy: false,
      }}
    >
      {/* Keep all screens always mounted to avoid remount cost when toggling visibility.
          Tab visibility is controlled by hiding the tab bar button instead of removing the screen. */}
      <Tab.Screen
        name="Feed"
        component={FeedStack}
        options={{
          tabBarLabel: 'Feed',
          tabBarButton: hiddenTabs.includes('Feed') ? () => null : undefined,
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreStack}
        options={{
          tabBarLabel: 'Explore',
          tabBarButton: hiddenTabs.includes('Explore') ? () => null : undefined,
        }}
      />
      <Tab.Screen
        name="Share"
        component={ShareStack}
        options={{
          tabBarLabel: 'Share',
          tabBarButton: hiddenTabs.includes('Share') ? () => null : undefined,
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedStack}
        options={{
          tabBarLabel: 'Saved',
          tabBarButton: hiddenTabs.includes('Saved') ? () => null : undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 80 : 64,
    elevation: 0,
    overflow: 'hidden',
  },
  tabBarInner: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 16 : 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedBadge: {
    position: 'absolute',
    top: -7,
    right: -12,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
});

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
    <Stack.Screen name="Main" component={TabNavigator} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="SectorSelection" component={SectorSelectionScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="GovtJobDetail" component={GovtJobDetailScreen} />
    <Stack.Screen name="GovtVacancyDetail" component={GovtVacancyDetailScreen} />
    <Stack.Screen name="SkillSearch" component={SkillSearchScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Invite" component={InviteScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EditEducation" component={EditEducationScreen} />
    <Stack.Screen name="EditSkills" component={EditSkillsScreen} />
    <Stack.Screen name="EditPreferences" component={EditPreferencesScreen} />
    <Stack.Screen name="EditDemographics" component={EditDemographicsScreen} />
    <Stack.Screen name="CareerProfile" component={CareerProfileScreen} />
    <Stack.Screen name="MyShares" component={MySharesScreen} />
    <Stack.Screen name="FollowedCompanies" component={FollowedCompaniesScreen} />
    <Stack.Screen name="ContributorProfile" component={ContributorProfileScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="CompanyDetail" component={CompanyScreen} />
    <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
    <Stack.Screen name="ApplicationTracker" component={ApplicationTrackerScreen} />
    <Stack.Screen name="Feedback" component={FeedbackScreen} />
    <Stack.Screen name="Legal" component={LegalScreen} />
    <Stack.Screen name="ProfileChooseUsername" component={ChooseUsernameScreen} />
    <Stack.Screen name="ChooseUsername" component={ChooseUsernameScreen} />
    <Stack.Screen name="OTAUpdates" component={OTAUpdatesScreen} />
    <Stack.Screen name="ResourcesDirectory" component={ResourcesDirectoryScreen} />
    <Stack.Screen name="ResourceGroupDetail" component={ResourceGroupDetailScreen} />
    <Stack.Screen name="ResourceCollectionDetail" component={ResourceCollectionDetailScreen} />
    {/* Auth is a contextual modal — anonymous users land here when they try an auth-gated action */}
    <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
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

