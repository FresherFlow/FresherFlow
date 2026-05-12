import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme as staticTheme } from '../theme';

// ─── Nuvio Base Colors ───────────────────────────────────────────
const getNuvioDarkColors = (isAmoled: boolean) => ({
  primary: '#F5F7F8',
  secondary: '#FF6B6B',
  background: isAmoled ? '#000000' : '#0D0D0D', 
  darkBackground: isAmoled ? '#000000' : '#0D0D0D',
  surface: isAmoled ? '#050505' : '#1A1A1A',
  surfaceMuted: isAmoled ? '#0A0A0A' : '#121212',
  accent: '#F5F7F8',
  text: '#F5F7F8',
  textMuted: 'rgba(245, 247, 248, 0.6)',
  border: isAmoled ? 'rgba(245, 247, 248, 0.08)' : 'rgba(245, 247, 248, 0.12)',
  muted: 'rgba(245, 247, 248, 0.3)',
  error: '#FF5252',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#D2E8F7',
  overlay: isAmoled ? 'rgba(0, 0, 0, 0.9)' : 'rgba(13, 15, 20, 0.8)',
  inverseText: '#0F172A',
  glassBackground: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassMuted: 'rgba(255, 255, 255, 0.05)',
});

const lightBaseColors = {
  primary: '#1A1D23',
  secondary: '#FF6B6B',
  background: '#F8FAFC',
  darkBackground: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  accent: '#3B82F6',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  muted: '#CBD5E1',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  overlay: 'rgba(15, 23, 42, 0.4)',
  inverseText: '#FFFFFF',
  glassBackground: 'rgba(255, 255, 255, 0.4)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  glassMuted: 'rgba(0, 0, 0, 0.05)',
};

const DEFAULT_TOKENS = {
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  roundness: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  elevation: {
    sm: 2,
    md: 6,
    lg: 12,
  },
};

export type ThemeColors = ReturnType<typeof getNuvioDarkColors>;

export interface AppTheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof DEFAULT_TOKENS.spacing;
  roundness: typeof DEFAULT_TOKENS.roundness;
  elevation: typeof DEFAULT_TOKENS.elevation;
  accent1: string;
  accent2: string;
}

interface ThemeContextProps {
  themeMode: 'light' | 'dark' | 'system';
  isAmoled: boolean;
  currentTheme: AppTheme;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleAmoled: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = '@fresherflow:theme_preference';
const AMOLED_STORAGE_KEY = '@fresherflow:amoled_preference';

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');
  const [isAmoled, setIsAmoledState] = useState(false);

  // Calculate actual theme based on mode, system preference, and amoled state
  const activeTheme = useMemo(() => {
    const mode = themeMode === 'system' ? (systemColorScheme || 'dark') : themeMode;
    
    const colors = mode === 'dark' ? getNuvioDarkColors(isAmoled) : (lightBaseColors as unknown as ThemeColors);
    
    return {
        id: mode,
        name: mode === 'dark' ? (isAmoled ? 'AMOLED Dark' : 'Dark Mode') : 'Light Mode',
        mode: mode as 'light' | 'dark',
        colors,
        spacing: DEFAULT_TOKENS.spacing,
        roundness: DEFAULT_TOKENS.roundness,
        elevation: DEFAULT_TOKENS.elevation,
        accent1: mode === 'dark' ? '#F5F7F8' : '#1A1D23',
        accent2: '#FF6B6B',
    };
  }, [themeMode, systemColorScheme, isAmoled]);

  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(activeTheme);

  // Load saved preference
  useEffect(() => {
    const loadPreferences = async () => {
        try {
            const [savedMode, savedAmoled] = await Promise.all([
                AsyncStorage.getItem(THEME_STORAGE_KEY),
                AsyncStorage.getItem(AMOLED_STORAGE_KEY)
            ]);

            if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
                setThemeModeState(savedMode as 'light' | 'dark' | 'system');
            }

            if (savedAmoled !== null) {
                setIsAmoledState(savedAmoled === 'true');
            }
        } catch (error) {
            console.error('Failed to load theme preferences:', error);
        }
    };
    loadPreferences();
  }, []);

  // Sync with activeTheme changes
  useEffect(() => {
    if (JSON.stringify(activeTheme.colors) !== JSON.stringify(currentTheme.colors) || activeTheme.id !== currentTheme.id) {
       Object.assign(staticTheme.colors, activeTheme.colors);
       setCurrentThemeState(activeTheme);
    }
  }, [activeTheme, currentTheme]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    if (mode === themeMode) return;
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleAmoled = (enabled: boolean) => {
    if (enabled === isAmoled) return;
    setIsAmoledState(enabled);
    AsyncStorage.setItem(AMOLED_STORAGE_KEY, enabled.toString()).catch(() => {});
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, isAmoled, currentTheme, setThemeMode, toggleAmoled }}>
      <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
          {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
