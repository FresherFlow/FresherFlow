import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Compass, PlusCircle, Bookmark, User } from 'lucide-react-native';


import FeedScreen from '@/screens/FeedScreen';
import ExploreScreen from '@/screens/ExploreScreen';
import ShareScreen from '@/screens/ShareScreen';
import JobDetailScreen from '@/screens/JobDetailScreen';
import SavedScreen from '@/screens/SavedScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import MySharesScreen from '@/screens/MySharesScreen';
import AuthScreen from '@/screens/AuthScreen';
import AppearanceScreen from '@/screens/AppearanceScreen';
import EditEducationScreen from '@/screens/EditEducationScreen';
import EditSkillsScreen from '@/screens/EditSkillsScreen';
import EditPreferencesScreen from '@/screens/EditPreferencesScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ReferralsScreen from '@/screens/ReferralsScreen';
import AccountManageScreen from '@/screens/AccountManageScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import ContributorProfileScreen from '@/screens/ContributorProfileScreen';
import CompanyScreen from '@/screens/CompanyScreen';
import AlertSettingsScreen from '@/screens/AlertSettingsScreen';
import ApplicationTrackerScreen from '@/screens/ApplicationTrackerScreen';
import FeedbackScreen from '@/screens/FeedbackScreen';
import LegalScreen from '@/screens/LegalScreen';

import { useTheme } from '@/contexts/ThemeContext';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { Opportunity } from '@fresherflow/types';
import { useNotifications } from '@/hooks/useNotifications';
import { useUI } from '@/contexts/UIContext';

export type RootStackParamList = {
  // Tab Roots
  Feed: undefined;
  Explore: undefined;
  Share: { url?: string } | undefined;
  Saved: undefined;
  Profile: undefined;

  // Stack Screens
  FeedList: undefined;
  ExploreMain: undefined;
  ShareMain: { url?: string } | undefined;
  SavedList: undefined;
  ProfileMain: undefined;
  JobDetail: { opportunity?: Opportunity; job?: Opportunity; opportunityId?: string };
  Auth: { prefilledEmail?: string } | undefined;
  Main: undefined;
  EditEducation: undefined;
  EditSkills: undefined;
  EditPreferences: undefined;
  Appearance: undefined;
  Dashboard: undefined;
  Referrals: undefined;
  AccountManage: undefined;
  Notifications: undefined;
  MyShares: undefined;
  ContributorProfile: { userId: string };
  CompanyDetail: { companyName: string; companyLogoUrl?: string; website?: string; currentJob?: Opportunity };
  AlertSettings: undefined;
  ApplicationTracker: undefined;
  Feedback: undefined;
  Legal: undefined;
};

const Tab = createBottomTabNavigator<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) {
        return color.replace(/[\d.]+\)$/g, `${opacity})`);
    }
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

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
        <Stack.Screen name="ProfileMain" component={ProfileScreen} />
        <Stack.Screen name="Referrals" component={ReferralsScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
    </Stack.Navigator>
);

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { currentTheme } = useTheme();
  const { tabBarTranslateY, isKeyboardVisible } = useUI();
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
              <TabIcon focused={isFocused} color={isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted} IconComponent={Icon} />
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
    badge: {
        position: 'absolute',
        top: 10,
        right: '25%',
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
});

export const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
      />
      <Stack.Screen name="Appearance" component={AppearanceScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Referrals" component={ReferralsScreen} />
      <Stack.Screen name="AccountManage" component={AccountManageScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="EditEducation" component={EditEducationScreen} />
      <Stack.Screen name="EditSkills" component={EditSkillsScreen} />
      <Stack.Screen name="EditPreferences" component={EditPreferencesScreen} />
      <Stack.Screen name="MyShares" component={MySharesScreen} />
      <Stack.Screen name="ContributorProfile" component={ContributorProfileScreen} />
      <Stack.Screen name="CompanyDetail" component={CompanyScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
      <Stack.Screen name="ApplicationTracker" component={ApplicationTrackerScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ presentation: 'modal' }}
        />
      ) : null}
    </Stack.Navigator>
  );
};
