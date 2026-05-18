import { createContext, useContext } from 'react';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  muted: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
  darkBackground?: string;
  inverseText: string;
};

export type ThemeSpacing = {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
};

export type ThemeRoundness = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
};

export type ThemeContextType = {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  roundness: ThemeRoundness;
};

export const UIThemeContext = createContext<ThemeContextType | null>(null);

export const useUITheme = () => {
  const context = useContext(UIThemeContext);
  if (!context) {
    throw new Error('useUITheme must be used within UIThemeProvider');
  }
  return context;
};

export * from './theme/mobile-tokens';

export const alpha = (hexColor: string, opacity: number): string => {
    if (!hexColor.startsWith('#')) return hexColor;
    const normalized = hexColor.replace('#', '');
    if (normalized.length !== 6) return hexColor;
    const channel = (start: number) => Number.parseInt(normalized.slice(start, start + 2), 16);
    return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${opacity})`;
};

import { darkColors, spacing, roundness, elevation } from './theme/mobile-tokens';

export const theme = {
    colors: darkColors,
    spacing,
    roundness,
    elevation,
};
