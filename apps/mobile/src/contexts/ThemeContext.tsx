import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme as staticTheme } from '../theme';

// ─── Dark Mode Base colors ───────────────────────────────────────────
const darkBaseColors = {
  primary: '#FFFFFF', // Changed from Blue to White
  secondary: '#FF6B6B',
  background: '#020404', // True black for OLED
  darkBackground: '#020404',
  surface: '#121212',
  surfaceMuted: '#0A0A0A',
  accent: '#FFFFFF', // Changed from Teal to White
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.12)',
  muted: 'rgba(255, 255, 255, 0.3)',
  error: '#FF5252',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#FFFFFF', // Changed from Blue to White
  overlay: 'rgba(13, 15, 20, 0.8)',
  inverseText: '#0F172A', // Dark text for light backgrounds
  glassBackground: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassMuted: 'rgba(255, 255, 255, 0.05)',
};

// ─── Light Mode Base colors ──────────────────────────────────────────
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
  inverseText: '#FFFFFF', // Light text for dark backgrounds
  glassBackground: 'rgba(255, 255, 255, 0.4)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  glassMuted: 'rgba(0, 0, 0, 0.05)',
};

// ─── Default tokens ───────────────────
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

export type ThemeColors = typeof darkBaseColors;

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

export const DEFAULT_THEMES: AppTheme[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    mode: 'dark',
    colors: darkBaseColors,
    spacing: DEFAULT_TOKENS.spacing,
    roundness: DEFAULT_TOKENS.roundness,
    elevation: DEFAULT_TOKENS.elevation,
    accent1: '#E0E4E8',
    accent2: '#FF6B6B',
  },
  {
    id: 'light',
    name: 'Light Mode',
    mode: 'light',
    colors: lightBaseColors,
    spacing: DEFAULT_TOKENS.spacing,
    roundness: DEFAULT_TOKENS.roundness,
    elevation: DEFAULT_TOKENS.elevation,
    accent1: '#1A1D23',
    accent2: '#FF6B6B',
  },
];

interface ThemeContextProps {
  themeMode: 'light' | 'dark' | 'system';
  currentTheme: AppTheme;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

const STORAGE_KEY = '@fresherflow:theme_preference';

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');

  // Calculate actual theme based on mode and system preference
  const activeTheme = useMemo(() => {
    const mode = themeMode === 'system' ? (systemColorScheme || 'dark') : themeMode;
    return DEFAULT_THEMES.find(t => t.id === mode) || DEFAULT_THEMES[0];
  }, [themeMode, systemColorScheme]);

  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(activeTheme);

  // Load saved preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeModeState(saved as 'light' | 'dark' | 'system');
      }
    }).catch(() => {});
  }, []);

  // Sync with activeTheme changes (including system theme changes)
  useEffect(() => {
    if (activeTheme.id !== currentTheme.id) {
       Object.assign(staticTheme.colors, activeTheme.colors);
       setCurrentThemeState(activeTheme);
    }
  }, [activeTheme, currentTheme.id]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    if (mode === themeMode) return;
    
    // Instant switch
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
    
    // Optional haptic feedback
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, currentTheme, setThemeMode }}>
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
