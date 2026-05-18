import React, { useState } from 'react';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://placeholder@sentry.io/placeholder', // TODO: Update with real DSN before prod
  enableNative: true,
  tracesSampleRate: 1.0,
});
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AppNavigator, RootStackParamList } from './src/navigation/AppNavigator';
import { BrandIntroLoader } from './src/components/BrandIntroLoader';
import { OfflineBanner } from './src/system/components/OfflineBanner';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { markLocalAlertAsRead } from './src/utils/localNotifications';
import { getOpportunityAtomic, readDetailCache } from './src/utils/offlineCache';

// Register global cache reader for frontend-core offline action queue
(global as any).readJobDetailsFromCache = async (id: string) => {
  try {
    const job = await getOpportunityAtomic(id);
    if (job) return job;
    return await readDetailCache(id);
  } catch (e) {
    console.warn('[GlobalCache] Failed to read job details:', e);
    return null;
  }
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
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
import { useAuthHandshake } from './src/hooks/useAuthHandshake';
import { useEmailLinkSignIn } from './src/hooks/useEmailLinkSignIn';

// Configure API client
configureClient(API_URL, secureStorage, {
  onError: (err) => {
    if (err instanceof HttpError && err.status === 401) {
      const { isAuthenticated, triggerHandshake } = useAuthStore.getState();
      if (isAuthenticated) {
        console.log('[Auth] Detected 401 Unauthorized, triggering re-handshake...');
        triggerHandshake();
      }
    }
  }
});


// Auth Bridge: Maps Zustand auth state to shared Provider props
// This allows @repo/frontend-core providers to remain "pure" (prop-based) 
// while the mobile app remains "Zustand-first".
const AuthBridge = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  // We don't have a separate anonSessionId in mobile yet, 
  // but we pass it as null to satisfy the prop requirement.
  return (
    <NotificationProvider userId={user?.id}>
      <SavedProvider userId={user?.id} anonSessionId={null}>
        {/* @ts-expect-error - ReactNode version mismatch in monorepo */}
        {children}
      </SavedProvider>
    </NotificationProvider>
  );
};

const AppContent = () => {
  useAuthHandshake(); // Background handshake logic
  useEmailLinkSignIn(); // Listen and complete email magic link logins
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentTheme } = useTheme();

  const isDark = currentTheme.mode === 'dark';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { user, isSyncing: isLoading } = useAuthStore();

  React.useEffect(() => {
    // Initialize Google Sign-In & Firebase Auth listeners after native bridge boots
    void AuthManager.initialize();
  }, []);



  // Handle push notification clicks
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (lastNotificationResponse) {
      const data = lastNotificationResponse.notification.request.content.data;
      
      // Navigate based on structured data
      if (navigationRef.isReady()) {
          if (data?.jobId) {
            void markLocalAlertAsRead(data.jobId as string);
            navigationRef.navigate('JobDetail', { opportunityId: data.jobId as string });
          } else if (data?.userId) {
            navigationRef.navigate('ContributorProfile', { userId: data.userId as string });
          } else if (data?.screen) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            navigationRef.navigate(data.screen as any);
          } else if (data?.url && typeof data.url === 'string') {
            void Linking.openURL(data.url);
          }
      }
    }
  }, [lastNotificationResponse]);

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
        backgroundColor="transparent" 
        translucent={true}
      />
      {!isLoaded ? (
        <BrandIntroLoader onComplete={() => setIsLoaded(true)} />
      ) : (
        <FirstRunGate>
          <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
          <OfflineBanner />
          <GlobalActionSheet />
        </FirstRunGate>
      )}
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedRoot>
            <UIProvider>
              <ErrorBoundary>
                <QueryClientProvider client={queryClient}>
                  <ToastProvider>
                    <UIThemeContext.Provider value={theme}>
                          <AuthBridge>
                            <BottomSheetModalProvider>
                              <AppContent />
                            </BottomSheetModalProvider>
                          </AuthBridge>
                    </UIThemeContext.Provider>
                  </ToastProvider>
                </QueryClientProvider>
              </ErrorBoundary>
            </UIProvider>
          </ThemedRoot>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const ThemedRoot = ({ children }: { children: React.ReactNode }) => {
  const { currentTheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
      {children}
    </View>
  );
};
