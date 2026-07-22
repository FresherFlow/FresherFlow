import React, { useState } from 'react';
// import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enableScreens, enableFreeze } from 'react-native-screens';

enableScreens(true);
enableFreeze(true);

// Sentry.init({
//   dsn: 'https://e23ea3b19c0247d5f0366941f9e490c8@o4511002230849536.ingest.us.sentry.io/4511449039175680',
//   environment: process.env.APP_ENV || process.env.EXPO_PUBLIC_APP_ENV || 'development',
//   enableNative: true,
//   tracesSampleRate: 1.0,
// });
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { AppNavigator, RootStackParamList } from './src/navigation/AppNavigator';
import { BrandIntroLoader } from './src/system/components/BrandIntroLoader';
import { OfflineBanner } from './src/system/components/OfflineBanner';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import * as Linking from 'expo-linking';
import { useShallow } from 'zustand/react/shallow';
import axios from 'axios';
import { getOpportunityAtomic, readDetailCache } from './src/utils/cache/offlineCache';
import { useNotificationStore } from './src/store/useNotificationStore';
import { openExternalURL } from './src/utils/browser';
import * as SplashScreen from 'expo-splash-screen';
import { PremiumPopup } from './src/system/components/PremiumPopup';

// Keep the native splash screen visible until React Native is fully loaded and BrandIntroLoader renders
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Register global cache reader for frontend-core offline action queue
(global as any).readJobDetailsFromCache = async (id: string) => {
  try {
    const job = await getOpportunityAtomic(id);
    if (job) return job;
    return await readDetailCache(id);
  } catch (e) {
    if (__DEV__) { console.warn('[GlobalCache] Failed to read job details:', e) }
    return null;
  }
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import { 
    NotificationProvider, 
    SavedProvider,
    secureStorage,
} from '@repo/frontend-core';
import { linking } from './src/config/linking';
import { configureClient, HttpError } from '@fresherflow/api-client';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { UIProvider } from './src/contexts/UIContext';
import { UIThemeContext, theme } from '@repo/ui';
import { API_URL } from './src/config/api';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/config/queryClient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { GlobalActionSheet } from './src/system/components/GlobalActionSheet';
import { ErrorBoundary } from './src/system/components/ErrorBoundary';
import { FirstRunGate } from './src/system/components/FirstRunGate';

import { useAuthStore, AuthManager } from './src/store/useAuthStore';
import { useFeedStore } from './src/store/useFeedStore';
import { useSectorStore } from './src/store/useSectorStore';
import { useAuthHandshake } from './src/hooks/useAuthHandshake';
import { usePushToken } from './src/hooks/usePushToken';
import { useEmailLinkSignIn } from './src/hooks/useEmailLinkSignIn';

import { configureApiClientForSector } from './src/config/api';
import { getString } from './src/utils/storage';

// Configure API client initially based on stored sector or default to PRIVATE
const initialSector = getString('fresherflow_active_sector');
configureApiClientForSector(initialSector || 'PRIVATE');



import { getFirebaseDatabaseUrl } from './src/config/firebase';

// Auth Bridge: Maps Zustand auth state to shared Provider props
// This allows @repo/frontend-core providers to remain "pure" (prop-based) 
// while the mobile app remains "Zustand-first".
const AuthBridge = ({ children }: { children: React.ReactNode }) => {
  const { user, firebaseUser } = useAuthStore();
  // Subscribe to IDs only (not the full array) to avoid re-rendering the entire app tree
  // on every sync cycle (every 5min). SavedProvider only needs IDs for cross-referencing.
  const feedItemIds = useFeedStore(useShallow(state => state.cachedItems.map(i => i.id)));
  // RTDB paths are keyed by Firebase UID (auth.uid), NOT the Postgres UUID (user.id)
  const rtdbUserId = firebaseUser?.uid ?? user?.id;
  return (
    <NotificationProvider
      firebaseUserId={firebaseUser?.uid}
      firebaseDatabaseUrl={getFirebaseDatabaseUrl()}
    >
      <SavedProvider 
        userId={rtdbUserId} 
        anonSessionId={null} 
        firebaseDatabaseUrl={getFirebaseDatabaseUrl()}
        feedItems={feedItemIds as any}
      >
        {/* @ts-expect-error - ReactNode version mismatch in monorepo */}
        {children}
      </SavedProvider>
    </NotificationProvider>
  );
};


const AppContent = () => {
  useAuthHandshake(); // Background handshake logic
  usePushToken();     // Register FCM device token after login
  useEmailLinkSignIn(); // Listen and complete email magic link logins
  const [isLoaded, setIsLoaded] = useState(false);
  const pendingNavigationRef = React.useRef<{ screen: string; params: any } | null>(null);

  React.useEffect(() => {
    // Globally hydrate the sector store then feed on app start
    useSectorStore.getState().hydrate();
    void useFeedStore.getState().hydrate();


    
  }, []);

  const { currentTheme } = useTheme();

  const isDark = currentTheme.mode === 'dark';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { user, isSyncing: authLoading } = useAuthStore();
  const feedHydrated = useFeedStore(s => s.hasHydrated);
  const isLoading = authLoading || !feedHydrated;

  const { isUpdatePending } = Updates.useUpdates();

  React.useEffect(() => {
    // Initialize Google Sign-In & Firebase Auth listeners after native bridge boots
    void AuthManager.initialize();
  }, []);

  // OTA Updates: Listen for downloaded updates and prompt user to reload
  React.useEffect(() => {
    if (isLoaded) {
      // Fail-safe: Ensure the native splash screen is hidden once the main app is ready to mount
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoaded]);

  // OTA Updates: Defer a background check and download on startup
  React.useEffect(() => {
    if (!Updates.isEnabled) return;

    const timer = setTimeout(async () => {
      try {
        if (__DEV__) { console.log('[OTA] Running deferred startup update check...') }
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          if (__DEV__) { console.log('[OTA] Update available, fetching in background...') }
          await Updates.fetchUpdateAsync();
        }
      } catch (err) {
        if (__DEV__) { console.log('[OTA] Deferred startup update check skipped or failed:', err) }
      }
    }, 5000); // 5 seconds delay to allow UI/main thread to settle

    return () => clearTimeout(timer);
  }, []);

  // Handle push notification clicks
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (lastNotificationResponse) {
      const data = lastNotificationResponse.notification.request.content.data;
      
      const navigateOrQueue = (screen: string, params: any) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(screen as any, params);
        } else {
          if (__DEV__) { console.log('[Push] Navigation container not ready. Queueing cold-start deep link:', screen, params) }
          pendingNavigationRef.current = { screen, params };
        }
      };

      if (data?.jobId) {
        void useNotificationStore.getState().markRead(data.jobId as string);
        navigateOrQueue('JobDetail', { opportunityId: data.jobId as string });
      } else if (data?.userId) {
        navigateOrQueue('ContributorProfile', { userId: data.userId as string });
      } else if (data?.screen) {
        navigateOrQueue(data.screen as string, data.params || {});
      } else if (data?.url && typeof data.url === 'string') {
        void openExternalURL(data.url, currentTheme.colors);
      }
    }
  }, [lastNotificationResponse, currentTheme]);

  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: currentTheme.colors.background,
      card: currentTheme.colors.surface,
      text: currentTheme.colors.text,
      border: currentTheme.colors.border,
      primary: currentTheme.colors.primary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <StatusBar 
        style={isDark ? "light" : "dark"} 
      />
      <FirstRunGate onDismiss={() => {
        const { isAuthenticated } = useAuthStore.getState();
        if (!isAuthenticated && navigationRef.isReady()) {
          if (__DEV__) { console.log('[FirstRunGate] Onboarding complete. Triggering authentication modal.') }
          navigationRef.navigate('Auth', { isOnboarding: true });
        }
      }}>
        <NavigationContainer 
          ref={navigationRef} 
          linking={linking} 
          theme={navTheme}
          onReady={() => {
            if (pendingNavigationRef.current) {
              const { screen, params } = pendingNavigationRef.current;
              if (__DEV__) { console.log('[Push] Navigation container is ready. Draining cold-start deep link queue:', screen, params) }
              navigationRef.navigate(screen as any, params);
              pendingNavigationRef.current = null;
            }
          }}
        >
          <AppNavigator />
        </NavigationContainer>
        <OfflineBanner />
        <GlobalActionSheet />
      </FirstRunGate>

      {!isLoaded && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
          <BrandIntroLoader isLoading={isLoading} onComplete={() => setIsLoaded(true)} />
        </View>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedRoot>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
            <UIProvider>
              <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                  <ToastProvider>
                    <AuthBridge>
                      <BottomSheetModalProvider>
                        <AppContent />
                      </BottomSheetModalProvider>
                    </AuthBridge>
                  </ToastProvider>
                </QueryClientProvider>
              </ErrorBoundary>
            </UIProvider>
          </GestureHandlerRootView>
        </ThemedRoot>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const ThemedRoot = ({ children }: { children: React.ReactNode }) => {
  const { currentTheme } = useTheme();

  // Dynamically build a new UITheme context value so that React context detects the change and propagates it instantly
  const uiThemeValue = React.useMemo(() => ({
    colors: currentTheme.colors,
    spacing: currentTheme.spacing,
    roundness: currentTheme.roundness,
  }), [currentTheme.colors, currentTheme.spacing, currentTheme.roundness]);

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      <UIThemeContext.Provider value={uiThemeValue}>
        {children}
      </UIThemeContext.Provider>
    </View>
  );
};
