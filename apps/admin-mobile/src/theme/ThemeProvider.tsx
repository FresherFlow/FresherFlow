import React, { createContext, useContext, useState, useCallback, JSX } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useColorScheme } from 'react-native';
import { themes, spacing, roundness, DEFAULT_THEMES } from './index';
import type { ThemeColors, ThemeMode, Theme } from './index';

type ThemeContextType = {
    mode: ThemeMode;
    colors: ThemeColors;
    spacing: typeof spacing;
    roundness: typeof roundness;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
    currentTheme: Theme;
    availableThemes: Theme[];
    setCurrentTheme: (themeId: string) => void;
    addCustomTheme: (theme: any) => void;
    updateCustomTheme: (theme: any) => void;
    deleteCustomTheme: (themeId: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    colors: themes.dark,
    spacing,
    roundness,
    toggle: () => { },
    setMode: () => { },
    currentTheme: DEFAULT_THEMES[0],
    availableThemes: DEFAULT_THEMES,
    setCurrentTheme: () => { },
    addCustomTheme: () => { },
    updateCustomTheme: () => { },
    deleteCustomTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const systemScheme = useColorScheme();
    const [fallbackMode, setModeState] = useState<ThemeMode>(
        systemScheme === 'light' ? 'light' : 'dark'
    );

    const { settings, updateSetting } = useSettings();

    // Use mmkv settings or fallback to useColorScheme
    const mode = settings ? (settings.enableDarkMode ? 'dark' : 'light') : fallbackMode;

    const availableThemes = React.useMemo(() => {
        const baseThemes = [themes.dark, themes.light];
        if (!settings?.customThemes) return baseThemes;
        return [...baseThemes, ...settings.customThemes.map((t: any) => ({
            ...t,
            colors: {
                ...themes.dark,
                primary: t.colors.primary,
                secondary: t.colors.secondary,
                accent: t.colors.primary,
                background: t.colors.darkBackground,
            }
        }))];
    }, [settings]);

    const currentTheme = React.useMemo(() => {
        if (!settings?.themeId) return themes[mode];
        return availableThemes.find((t: any) => t.id === settings.themeId) || themes[mode];
    }, [availableThemes, settings, mode]);

    const toggle = useCallback(() => {
        if (updateSetting) updateSetting('enableDarkMode', !settings.enableDarkMode);
        else setModeState(m => (m === 'dark' ? 'light' : 'dark'));
    }, [updateSetting, settings]);

    const setMode = useCallback((m: ThemeMode) => {
        if (updateSetting) updateSetting('enableDarkMode', m === 'dark');
        else setModeState(m);
    }, [updateSetting]);

    const setCurrentTheme = (id: string) => updateSetting && updateSetting('themeId', id);

    const addCustomTheme = (themeData: any) => {
        if (!updateSetting) return;
        const newTheme = {
            id: `custom_${Date.now()}`,
            name: themeData.name,
            colors: {
                primary: themeData.colors.primary,
                secondary: themeData.colors.secondary,
                darkBackground: themeData.colors.darkBackground || themeData.colors.background,
            },
            isEditable: true,
        };
        updateSetting('customThemes', [...(settings.customThemes || []), newTheme]);
        updateSetting('themeId', newTheme.id);
    };

    const updateCustomTheme = (themeData: any) => {
        if (!updateSetting) return;
        const updated = (settings.customThemes || []).map((t: any) => {
            if (t.id === themeData.id) {
                return {
                    ...t,
                    name: themeData.name,
                    colors: {
                        primary: themeData.colors.primary,
                        secondary: themeData.colors.secondary,
                        darkBackground: themeData.colors.darkBackground || themeData.colors.background,
                    }
                };
            }
            return t;
        });
        updateSetting('customThemes', updated);
    };

    const deleteCustomTheme = (themeId: string) => {
        if (!updateSetting) return;
        const updated = (settings.customThemes || []).filter((t: any) => t.id !== themeId);
        updateSetting('customThemes', updated);
        if (settings.themeId === themeId) {
            updateSetting('themeId', 'command_dark');
        }
    };

    return (
        <ThemeContext.Provider
            value={{
                mode,
                colors: currentTheme.colors || themes[mode],
                spacing,
                roundness,
                toggle,
                setMode,
                currentTheme: currentTheme as Theme,
                availableThemes: availableThemes as Theme[],
                setCurrentTheme,
                addCustomTheme,
                updateCustomTheme,
                deleteCustomTheme
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
