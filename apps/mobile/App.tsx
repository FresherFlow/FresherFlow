import React, { useState } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BrandIntroLoader } from './src/components/BrandIntroLoader';
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

// Configure API client using same pattern as admin-mobile
configureClient(API_URL, secureStorage);
console.log(`[mobile] API_URL resolved to: ${API_URL}`);



// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NotificationSubscriber = ({ children }: { children: any }) => {
  const { user } = useUserAuth();
  return <NotificationProvider userId={user?.id}>{children}</NotificationProvider>;
};

const AppContent = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { currentTheme } = useTheme();

  const isDark = currentTheme.mode === 'dark';
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
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
        <NavigationContainer linking={linking} theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
      )}
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationSubscriber>
          <SavedProvider>
            <ThemeProvider>
              <ToastProvider>
                <UIProvider>
                  <UIThemeContext.Provider value={theme}>
                    <AppContent />
                  </UIThemeContext.Provider>
                </UIProvider>
              </ToastProvider>
            </ThemeProvider>
          </SavedProvider>
        </NotificationSubscriber>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
