import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme as staticTheme, alpha } from '../theme';

// ─── Nuvio Base Colors ───────────────────────────────────────────
const getNuvioDarkColors = (isAmoled: boolean) => {
  const primary = '#F5F7F8';
  const background = isAmoled ? '#000000' : '#0D0D0D';
  
  return {
    primary,
    secondary: '#FF6B6B',
    background,
    darkBackground: isAmoled ? '#000000' : '#0D0D0D',
    surface: isAmoled ? '#050505' : '#1A1A1A',
    surfaceMuted: isAmoled ? '#0A0A0A' : '#121212',
    accent: primary,
    text: primary,
    textMuted: alpha(primary, 0.6),
    border: isAmoled ? alpha(primary, 0.08) : alpha(primary, 0.12),
    muted: alpha(primary, 0.3),
    error: '#FF5252',
    success: '#4ADE80',
    warning: '#FBBF24',
    info: '#D2E8F7',
    overlay: isAmoled ? alpha('#000000', 0.9) : alpha('#0D0F14', 0.8),
    inverseText: '#0F172A',
    glassBackground: alpha('#FFFFFF', 0.03),
    glassBorder: alpha('#FFFFFF', 0.08),
    glassMuted: alpha('#FFFFFF', 0.05),
    // Semantic Tokens
    dividerSubtle: alpha(primary, 0.05),
    glassSubtle: alpha(primary, 0.03),
    overlaySubtle: isAmoled ? alpha('#000000', 0.7) : alpha('#0D0F14', 0.7),
    // Static Translucent Tokens
    blackTranslucent: alpha('#000000', 0.05),
    blackOverlay: alpha('#000000', 0.5),
    // Brand/Social Colors
    social: {
        linkedin: '#0077B5',
        twitter: '#1DA1F2',
        instagram: '#E4405F',
        facebook: '#1877F2',
        whatsapp: '#25D366',
        telegram: '#26A5E4',
    },
    // Semantic Accents
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    // Extracted Inline Colors
    shadowLight: 'rgba(0, 0, 0, 0.04)',
    shadowMedium: 'rgba(0, 0, 0, 0.08)',
    borderTranslucent: 'rgba(0, 0, 0, 0.05)',
    surfaceDarkSubtle: 'rgba(0,0,0,0.02)',
    whiteTranslucent20: 'rgba(255, 255, 255, 0.2)',
  };
};

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
  overlay: alpha('#0F172A', 0.4),
  inverseText: '#FFFFFF',
  glassBackground: alpha('#FFFFFF', 0.4),
  glassBorder: alpha('#000000', 0.05),
  glassMuted: alpha('#000000', 0.05),
  // Semantic Tokens
  dividerSubtle: alpha('#0F172A', 0.05),
  glassSubtle: alpha('#0F172A', 0.03),
  overlaySubtle: alpha('#0F172A', 0.4),
  // Static Translucent Tokens
  blackTranslucent: alpha('#000000', 0.05),
  blackOverlay: alpha('#000000', 0.5),
  // Brand/Social Colors
  social: {
      linkedin: '#0077B5',
      twitter: '#1DA1F2',
      instagram: '#E4405F',
      facebook: '#1877F2',
      whatsapp: '#25D366',
      telegram: '#26A5E4',
  },
  // Semantic Accents
  indigo: '#4f46e5',
  emerald: '#059669',
  amber: '#d97706',
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
