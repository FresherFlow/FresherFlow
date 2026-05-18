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

export type ThemeMode = 'dark' | 'light';

export interface Theme {
    id: string;
    name: string;
    mode: ThemeMode;
    colors: ThemeColors;
    isEditable: boolean;
}

export const darkColors: ThemeColors = {
    background: '#020404',
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceMuted: 'rgba(255, 255, 255, 0.03)',
    primary: '#2d9cdb',
    secondary: '#FF6B6B',
    accent: '#00BFBF',
    text: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(255, 255, 255, 0.12)',
    muted: 'rgba(255, 255, 255, 0.38)',
    error: '#CF6679',
    success: '#03DAC6',
    warning: '#FFB74D',
    info: '#64B5F6',
    overlay: 'rgba(2, 4, 4, 0.7)',
    darkBackground: '#020404',
    inverseText: '#000000',
};

export const lightColors: ThemeColors = {
    background: '#f4f7fb',
    surface: '#ffffff',
    surfaceMuted: '#eef3fa',
    primary: '#274f8f',
    secondary: '#d6e4fb',
    accent: '#356ff3',
    text: '#111c2e',
    textMuted: '#5b6d88',
    border: '#d6dfec',
    muted: '#e8eef7',
    error: '#cf4758',
    success: '#1f9660',
    warning: '#b77914',
    info: '#1f78d1',
    overlay: 'rgba(17, 28, 46, 0.14)',
    inverseText: '#FFFFFF',
};

export const builtInThemes: Record<string, Theme> = {
    nuvio_dark: {
        id: 'nuvio_dark',
        name: 'Nuvio Dark',
        mode: 'dark',
        colors: darkColors,
        isEditable: false,
    },
    ocean_blue: {
        id: 'ocean_blue',
        name: 'Ocean Blue',
        mode: 'dark',
        colors: {
            ...darkColors,
            primary: '#3498db',
            secondary: '#2ecc71',
            background: '#0a192f',
            darkBackground: '#0a192f',
        },
        isEditable: false,
    },
    sunset: {
        id: 'sunset',
        name: 'Sunset',
        mode: 'dark',
        colors: {
            ...darkColors,
            primary: '#ff7e5f',
            secondary: '#feb47b',
            background: '#1a0f0b',
            darkBackground: '#1a0f0b',
        },
        isEditable: false,
    },
    slate_light: {
        id: 'slate_light',
        name: 'Slate Light',
        mode: 'light',
        colors: lightColors,
        isEditable: false,
    },
};

export const DEFAULT_THEMES: Theme[] = Object.values(builtInThemes);

export const spacing = {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
} as const;

export const roundness = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
} as const;

export const elevation = {
    sm: 2,
    md: 6,
    lg: 12,
} as const;
