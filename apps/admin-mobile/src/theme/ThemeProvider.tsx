import React, { JSX, createContext, useCallback, useContext, useMemo } from 'react';
import { DEFAULT_THEMES, builtInThemes, roundness, spacing, type Theme, type ThemeColors, type ThemeMode } from './index';
import { useSettings, type AppSettings } from '../features/settings/hooks';
import { UIThemeContext, type ThemeColors as UIThemeColors } from '@repo/ui';
import { typography, type Typography } from './typography';
import { componentSizes, type ComponentSizes } from './componentSizes';

type StoredCustomTheme = {
    id: string;
    name: string;
    mode?: ThemeMode;
    colors: {
        primary: string;
        secondary: string;
        darkBackground?: string;
    };
    isEditable: boolean;
};

type EditableThemeInput = {
    id?: string;
    name: string;
    mode?: ThemeMode;
    colors: {
        primary: string;
        secondary: string;
        darkBackground?: string;
    };
};

type ThemeContextType = {
    mode: ThemeMode;
    colors: ThemeColors;
    spacing: typeof spacing;
    roundness: typeof roundness;
    typography: Typography;
    sizes: ComponentSizes;
    isReady: boolean;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
    currentTheme: Theme;
    availableThemes: Theme[];
    settings: AppSettings;
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    setCurrentTheme: (themeId: string) => void;
    addCustomTheme: (theme: EditableThemeInput) => void;
    updateCustomTheme: (theme: EditableThemeInput) => void;
    deleteCustomTheme: (themeId: string) => void;
};

const buildTheme = (theme: StoredCustomTheme, fallbackMode: ThemeMode): Theme => {
    const mode = theme.mode ?? fallbackMode;
    const base = mode === 'light' ? builtInThemes.slate_light : builtInThemes.nuvio_dark;
    const background = theme.colors.darkBackground || base.colors.background;

    return {
        id: theme.id,
        name: theme.name,
        mode,
        isEditable: true,
        colors: {
            ...base.colors,
            primary: theme.colors.primary,
            secondary: theme.colors.secondary,
            accent: theme.colors.primary,
            background,
            darkBackground: background,
            surface: base.colors.surface,
            surfaceMuted: base.colors.surfaceMuted,
        },
    };
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const { settings, updateSetting, isLoaded } = useSettings();
    const mode: ThemeMode = settings.enableDarkMode ? 'dark' : 'light';

    const availableThemes = useMemo(() => {
        const baseThemes = DEFAULT_THEMES;
        const customThemes = (settings.customThemes ?? []).map((theme) => buildTheme(theme, mode));
        return [...baseThemes, ...customThemes];
    }, [mode, settings.customThemes]);

    const fallbackTheme = mode === 'dark' ? builtInThemes.nuvio_dark : builtInThemes.slate_light;

    const currentTheme = useMemo(() => {
        if (!settings.themeId) {
            return fallbackTheme;
        }

        return availableThemes.find((theme) => theme.id === settings.themeId) ?? fallbackTheme;
    }, [availableThemes, fallbackTheme, settings.themeId]);

    const setMode = useCallback((nextMode: ThemeMode) => {
        updateSetting('enableDarkMode', nextMode === 'dark');

        const currentThemeIsBuiltIn = !currentTheme.isEditable;
        if (currentThemeIsBuiltIn) {
            updateSetting('themeId', nextMode === 'dark' ? 'nuvio_dark' : 'slate_light');
        }
    }, [currentTheme.isEditable, updateSetting]);

    const toggle = useCallback(() => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    }, [mode, setMode]);

    const setCurrentTheme = useCallback((themeId: string) => {
        updateSetting('themeId', themeId);
        const selectedTheme = availableThemes.find((theme) => theme.id === themeId);
        if (selectedTheme) {
            updateSetting('enableDarkMode', selectedTheme.mode === 'dark');
        }
    }, [availableThemes, updateSetting]);

    const addCustomTheme = useCallback((themeData: EditableThemeInput) => {
        const newTheme: StoredCustomTheme = {
            id: `custom_${Date.now()}`,
            name: themeData.name.trim(),
            mode: themeData.mode ?? mode,
            colors: {
                primary: themeData.colors.primary,
                secondary: themeData.colors.secondary,
                darkBackground: themeData.colors.darkBackground,
            },
            isEditable: true,
        };

        updateSetting('customThemes', [...(settings.customThemes ?? []), newTheme]);
        updateSetting('themeId', newTheme.id);
        updateSetting('enableDarkMode', (newTheme.mode ?? mode) === 'dark');
    }, [mode, settings.customThemes, updateSetting]);

    const updateCustomTheme = useCallback((themeData: EditableThemeInput) => {
        const nextThemes = (settings.customThemes ?? []).map((theme) => {
            if (theme.id !== themeData.id) {
                return theme;
            }

            return {
                ...theme,
                name: themeData.name.trim(),
                mode: themeData.mode ?? theme.mode ?? mode,
                colors: {
                    primary: themeData.colors.primary,
                    secondary: themeData.colors.secondary,
                    darkBackground: themeData.colors.darkBackground,
                },
            };
        });

        updateSetting('customThemes', nextThemes);
    }, [mode, settings.customThemes, updateSetting]);

    const deleteCustomTheme = useCallback((themeId: string) => {
        const nextThemes = (settings.customThemes ?? []).filter((theme) => theme.id !== themeId);
        updateSetting('customThemes', nextThemes);

        if (settings.themeId === themeId) {
            updateSetting('themeId', mode === 'dark' ? 'nuvio_dark' : 'slate_light');
        }
    }, [mode, settings.customThemes, settings.themeId, updateSetting]);

    return (
        <ThemeContext.Provider
            value={{
                mode,
                colors: currentTheme.colors,
                spacing,
                roundness,
                typography,
                sizes: componentSizes,
                isReady: isLoaded,
                toggle,
                setMode,
                currentTheme,
                availableThemes,
                settings,
                updateSetting,
                setCurrentTheme,
                addCustomTheme,
                updateCustomTheme,
                deleteCustomTheme,
            }}
        >
            <UIThemeContext.Provider value={{
                colors: currentTheme.colors as unknown as UIThemeColors,
                spacing,
                roundness,
            }}>
                {children}
            </UIThemeContext.Provider>
        </ThemeContext.Provider>
    );
}

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
