import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Compass, PlusCircle, Bookmark, User } from 'lucide-react-native';


import FeedScreen from '@/screens/feed/FeedScreen';
import ExploreScreen from '@/screens/feed/ExploreScreen';
import ShareScreen from '@/screens/social/ShareScreen';
import JobDetailScreen from '@/screens/discovery/JobDetailScreen';
import SkillSearchScreen from '@/screens/discovery/SkillSearchScreen';
import SavedScreen from '@/screens/feed/SavedScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import MySharesScreen from '@/screens/social/MySharesScreen';
import FollowedCompaniesScreen from '@/screens/profile/FollowedCompaniesScreen';
import AuthScreen from '@/screens/auth/AuthScreen';
import AppearanceScreen from '@/screens/settings/AppearanceScreen';
import EditEducationScreen from '@/screens/profile/EditEducationScreen';
import EditSkillsScreen from '@/screens/profile/EditSkillsScreen';
import EditPreferencesScreen from '@/screens/profile/EditPreferencesScreen';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '@/contexts/ThemeContext';
import { useUI } from '@/contexts/UIContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationStore } from '@/store/useNotificationStore';

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
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ scale: scaleAnim }]
    }}>
      <IconComponent color={color} size={focused ? 24 : 22} />
    </Animated.View>
  );
});

const FeedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FeedList" component={FeedScreen} />
  </Stack.Navigator>
);

const ExploreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExploreMain" component={ExploreScreen} />
  </Stack.Navigator>
);

const ShareStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ShareMain" component={ShareScreen} />
  </Stack.Navigator>
);

const SavedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SavedList" component={SavedScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="ProfileMain" component={SettingsScreen} />
    </Stack.Navigator>
);

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { currentTheme } = useTheme();
  const { tabBarTranslateY, isKeyboardVisible } = useUI();
  const unseenFeedCount = useNotificationStore(state => state.unseenFeedCount);
  useNotifications();

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
      }
    ]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
              navigation.navigate(route.name);
            }
          };

          let Icon = Home;
          if (route.name === 'Explore') Icon = Compass;
          if (route.name === 'Share') Icon = PlusCircle;
          if (route.name === 'Saved') Icon = Bookmark;
          if (route.name === 'Profile') Icon = User;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View>
                <TabIcon focused={isFocused} color={isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted} IconComponent={Icon} />
                {route.name === 'Feed' && unseenFeedCount > 0 ? (
                  <View style={[styles.feedBadge, { backgroundColor: currentTheme.colors.error }]}>
                    <Text style={[styles.feedBadgeText, { color: currentTheme.colors.background }]}>
                      {unseenFeedCount > 9 ? '9+' : unseenFeedCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[
                styles.tabLabel,
                { color: isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Feed" component={FeedStack} options={{ tabBarLabel: 'Feed' }} />
      <Tab.Screen name="Explore" component={ExploreStack} options={{ tabBarLabel: 'Explore' }} />
      <Tab.Screen name="Share" component={ShareStack} options={{ tabBarLabel: 'Share' }} />
      <Tab.Screen name="Saved" component={SavedStack} options={{ tabBarLabel: 'Saved' }} />
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
const AppStack = ({ initialRouteName = "Main" }: { initialRouteName?: keyof RootStackParamList }) => (
  <Stack.Navigator
    screenOptions={{ headerShown: false, animation: 'fade' }}
    initialRouteName={initialRouteName}
  >
    <Stack.Screen name="Main" component={TabNavigator} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="SkillSearch" component={SkillSearchScreen} />
    <Stack.Screen name="Appearance" component={AppearanceScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Invite" component={InviteScreen} />
    <Stack.Screen name="AccountManage" component={AccountManageScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EditEducation" component={EditEducationScreen} />
    <Stack.Screen name="EditSkills" component={EditSkillsScreen} />
    <Stack.Screen name="EditPreferences" component={EditPreferencesScreen} />
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
  const { isSyncing, isSkipLoaded } = useAuthStore();
  const [isOnboardingCompleted, setIsOnboardingCompleted] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem('ff_onboarding_completed').then((val) => {
      setIsOnboardingCompleted(val === 'true');
    }).catch(() => {
      setIsOnboardingCompleted(true);
    });
  }, []);

  if (!isSkipLoaded || isOnboardingCompleted === null) {
    return <AppLoading />;
  }

  return <AppStack initialRouteName={isOnboardingCompleted ? "Main" : "Onboarding"} />;
};
