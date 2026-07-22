import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { typography, Typography } from './typography';
import { componentSizes, ComponentSizes } from './componentSizes';
import { UIThemeContext } from '@repo/ui';

// ─── Premium Dark Colors ───────────────────────────────────────────
const getPremiumDarkColors = (isAmoled: boolean) => ({
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
  // Legacy admin mapping
  navbarIndicator: '#F5F7F8',
  white: '#FFFFFF',
  brands: {
    telegram: '#24A1DE',
    whatsapp: '#25D366',
    linkedin: '#0077B5',
  },
  urgent: {
    background: 'rgba(255, 82, 82, 0.1)',
    border: 'rgba(255, 82, 82, 0.2)',
    text: '#FF5252',
  },
  rating: {
    background: 'rgba(251, 191, 36, 0.1)',
    text: '#FBBF24',
  },
  // Semantic Tokens
  dividerSubtle: 'rgba(245, 247, 248, 0.05)',
  glassSubtle: 'rgba(245, 247, 248, 0.03)',
  overlaySubtle: isAmoled ? 'rgba(0, 0, 0, 0.7)' : 'rgba(13, 15, 20, 0.7)',
  // Static Translucent Tokens
  black: '#000000',
  blackTranslucent: 'rgba(0, 0, 0, 0.05)',
  blackOverlay: 'rgba(0, 0, 0, 0.5)',
  // Extracted Inline Colors
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  borderTranslucent: 'rgba(0, 0, 0, 0.05)',
  surfaceDarkSubtle: 'rgba(0,0,0,0.02)',
  whiteTranslucent20: 'rgba(255, 255, 255, 0.2)',
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
  navbarIndicator: '#3B82F6',
  white: '#FFFFFF',
  brands: {
    telegram: '#0088cc',
    whatsapp: '#25D366',
    linkedin: '#0077B5',
  },
  urgent: {
    background: '#FEF2F2',
    border: '#FECACA',
    text: '#EF4444',
  },
  rating: {
    background: '#FEF9C3',
    text: '#92400E',
  },
  // Semantic Tokens
  dividerSubtle: 'rgba(15, 23, 42, 0.05)',
  glassSubtle: 'rgba(15, 23, 42, 0.03)',
  overlaySubtle: 'rgba(15, 23, 42, 0.4)',
  // Static Translucent Tokens
  black: '#000000',
  blackTranslucent: 'rgba(0, 0, 0, 0.05)',
  blackOverlay: 'rgba(0, 0, 0, 0.5)',
  // Extracted Inline Colors
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  borderTranslucent: 'rgba(0, 0, 0, 0.05)',
  surfaceDarkSubtle: 'rgba(0,0,0,0.02)',
  whiteTranslucent20: 'rgba(255, 255, 255, 0.2)',
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

export type ThemeColors = typeof lightBaseColors;

export interface AppTheme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof DEFAULT_TOKENS.spacing;
  roundness: typeof DEFAULT_TOKENS.roundness;
  radius: typeof DEFAULT_TOKENS.roundness;
  elevation: typeof DEFAULT_TOKENS.elevation;
  typography: Typography;
  sizes: ComponentSizes;
  accent1: string;
  accent2: string;
}

interface ThemeContextProps {
  themeMode: 'light' | 'dark' | 'system';
  isAmoled: boolean;
  currentTheme: AppTheme;
  isReady: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleAmoled: (enabled: boolean) => void;
}

const THEME_STORAGE_KEY = '@fresherflow_admin:theme_preference';
const AMOLED_STORAGE_KEY = '@fresherflow_admin:amoled_preference';

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('dark'); 
  const [isAmoled, setIsAmoledState] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const activeTheme = useMemo(() => {
    const mode = themeMode === 'system' ? (systemColorScheme || 'dark') : themeMode;
    
    const colors = mode === 'dark' ? getPremiumDarkColors(isAmoled) : lightBaseColors;
    
    return {
        id: mode,
        name: mode === 'dark' ? (isAmoled ? 'AMOLED Dark' : 'Dark Mode') : 'Light Mode',
        mode: mode as 'light' | 'dark',
        colors: colors as ThemeColors,
        spacing: DEFAULT_TOKENS.spacing,
        roundness: DEFAULT_TOKENS.roundness,
        radius: DEFAULT_TOKENS.roundness,
        elevation: DEFAULT_TOKENS.elevation,
        typography,
        sizes: componentSizes,
        accent1: mode === 'dark' ? '#F5F7F8' : '#1A1D23',
        accent2: '#FF6B6B',
    };
  }, [themeMode, systemColorScheme, isAmoled]);

  const [currentTheme, setCurrentThemeState] = useState<AppTheme>(activeTheme);

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
        } finally {
            setIsReady(true);
        }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    if (activeTheme.id !== currentTheme.id || JSON.stringify(activeTheme.colors) !== JSON.stringify(currentTheme.colors)) {
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
    <ThemeContext.Provider value={{ themeMode, isAmoled, currentTheme, isReady, setThemeMode, toggleAmoled }}>
      <UIThemeContext.Provider value={{ 
        colors: currentTheme.colors as unknown as import('@repo/ui').ThemeColors, 
        spacing: currentTheme.spacing, 
        roundness: currentTheme.roundness 
      }}>
        <View style={{ flex: 1, backgroundColor: currentTheme.colors.background }}>
            {children}
        </View>
      </UIThemeContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  
  return {
    ...ctx,
    ...ctx.currentTheme,
    // Add explicitly if needed or to resolve conflicts
    mode: ctx.currentTheme.mode,
  };
}
