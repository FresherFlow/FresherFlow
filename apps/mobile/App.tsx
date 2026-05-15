import React, { useState } from 'react';
import './src/config/firebaseApp';
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

import { 
    UserAuthProvider as AuthProvider, 
    NotificationProvider, 
    SavedProvider,
    secureStorage,
    useUserAuth 
} from '@repo/frontend-core';
import { linking } from './src/config/linking';
import { configureClient } from '@fresherflow/api-client';
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
import { IdentityManager } from './src/utils/identity';

// Initialize Identity & Auth
void IdentityManager.initialize();
void AuthManager.initialize();

// Configure API client
configureClient(API_URL, secureStorage);

import { useAuthStore, AuthManager } from './src/store/useAuthStore';
import { useAuthHandshake } from './src/hooks/useAuthHandshake';

// Bridges mobile store identity to shared context
const IdentitySync = ({ children }: { children: React.ReactNode }) => {
  const { anonSessionId, setAnonSessionId } = useUserAuth();
  const mobileAnonId = useAuthStore(s => s.anonSessionId);

  React.useEffect(() => {
    if (mobileAnonId && mobileAnonId !== anonSessionId) {
      setAnonSessionId?.(mobileAnonId);
    }
  }, [mobileAnonId, anonSessionId, setAnonSessionId]);

  return <>{children}</>;
};

// Notification Subscriber bridge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NotificationSubscriber = ({ children }: { children: any }) => {
  const { user } = useUserAuth();
  return <NotificationProvider userId={user?.id}>{children}</NotificationProvider>;
};

const AppContent = () => {
  useAuthHandshake(); // Background handshake logic
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentTheme } = useTheme();

  const isDark = currentTheme.mode === 'dark';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { user, isLoading } = useUserAuth();

  React.useEffect(() => {
    if (!isLoading && user && !user.username && !user.isAnonymous) {
      // Force redirect to ChooseUsername if missing
      const timer = setTimeout(() => {
        if (navigationRef.isReady()) {
           navigationRef.reset({
             index: 0,
             routes: [{ name: 'ChooseUsername' }],
           });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.username, user?.id, user?.isAnonymous, isLoading]);

  // Handle push notification clicks
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    if (lastNotificationResponse) {
      const data = lastNotificationResponse.notification.request.content.data;
      if (data?.jobId) {
        void markLocalAlertAsRead(data.jobId as string);
      }
      if (data?.url && typeof data.url === 'string') {
        void Linking.openURL(data.url);
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
        <>
          <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
          <OfflineBanner />
          <GlobalActionSheet />
        </>
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
                      <AuthProvider>
                        <IdentitySync>
                          <NotificationSubscriber>
                            <SavedProvider>
                              <BottomSheetModalProvider>
                                <AppContent />
                              </BottomSheetModalProvider>
                            </SavedProvider>
                          </NotificationSubscriber>
                        </IdentitySync>
                      </AuthProvider>
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
