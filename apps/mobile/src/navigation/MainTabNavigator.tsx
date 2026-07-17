import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet, Pressable, Text } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Compass, PlusCircle, Bookmark, User } from 'lucide-react-native';
import { haptic } from '@/utils/haptics';
import { ScreenErrorBoundary } from '@/system/components/ScreenErrorBoundary';

import FeedScreen from '@/screens/feed/FeedScreen';
import ExploreScreen from '@/screens/feed/ExploreScreen';
import GovtFeedScreen from '@/screens/feed/GovtFeedScreen';
import GovtExploreScreen from '@/screens/feed/GovtExploreScreen';
import ShareScreen from '@/screens/social/ShareScreen';
import SavedScreen from '@/screens/feed/SavedScreen';
import SettingsScreen from '@/screens/profile/SettingsScreen';
import AppearanceScreen from '@/screens/settings/AppearanceScreen';
import AppPreferencesScreen from '@/screens/settings/AppPreferencesScreen';
import BottomNavPreferencesScreen from '@/screens/settings/BottomNavPreferencesScreen';
import FeedTabsPreferencesScreen from '@/screens/settings/FeedTabsPreferencesScreen';
import AccountManageScreen from '@/screens/settings/AccountManageScreen';

import { useTheme } from '@/contexts/ThemeContext';
import { useUI } from '@/contexts/UIContext';
import { useSectorStore } from '@/store/useSectorStore';
import { useAppPreferencesStore } from '@/store/useAppPreferencesStore';

import { RootStackParamList } from './types';
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

export const MainTabNavigator = () => {
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
