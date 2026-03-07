import React, { createContext, useContext, useState, useCallback, JSX } from 'react';
import { useColorScheme } from 'react-native';
import { themes, spacing, roundness } from './index';
import type { ThemeColors, ThemeMode } from './index';

type ThemeContextType = {
    mode: ThemeMode;
    colors: ThemeColors;
    spacing: typeof spacing;
    roundness: typeof roundness;
    toggle: () => void;
    setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    colors: themes.dark,
    spacing,
    roundness,
    toggle: () => { },
    setMode: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>(
        systemScheme === 'light' ? 'light' : 'dark'
    );

    const toggle = useCallback(
        () => setModeState(m => (m === 'dark' ? 'light' : 'dark')),
        []
    );
    const setMode = useCallback((m: ThemeMode) => setModeState(m), []);

    return (
        <ThemeContext.Provider
            value={{ mode, colors: themes[mode], spacing, roundness, toggle, setMode }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = (): ThemeContextType => useContext(ThemeContext);
