// ─── Palettes (ported from web globals.css) ──────────────────────────────

export type ThemeColors = {
  background: string;
  surface: string;
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
};

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors & { darkBackground?: string };
  isEditable: boolean;
}

export const light: ThemeColors = {
  background: '#dfe6ef',
  surface: '#ffffff',
  primary: '#111827',
  secondary: '#f0f3f7',
  accent: '#3b5fd1',
  text: '#111827',
  textMuted: '#3e4d66',
  border: '#a9bbd4',
  muted: '#c8d4e4',
  error: '#e03535',
  success: '#1a8a52',
  warning: '#f59e0b',
};

export const dark: ThemeColors = {
  background: '#0d1117',
  surface: '#181f2e',
  primary: '#d4dce8',
  secondary: '#1e2535',
  accent: '#3b5fd1',
  text: '#d4dce8',
  textMuted: '#8b9ab5',
  border: '#222c3e',
  muted: '#1d2535',
  error: '#e06060',
  success: '#3db87a',
  warning: '#f5b840',
};

export const themes = { light, dark };

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'command_dark',
    name: 'Command Dark',
    colors: dark,
    isEditable: false,
  },
  {
    id: 'slate_light',
    name: 'Slate Light',
    colors: light,
    isEditable: false,
  },
];

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const roundness = { sm: 4, md: 8, lg: 12, xl: 20, full: 9999 } as const;

// Backwards-compat static export — screens using `theme.colors.*` get dark palette
export const theme = { colors: dark, spacing, roundness };
