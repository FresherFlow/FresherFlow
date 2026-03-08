import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// Safely initialize MMKV only on native platforms
let mmkvInstance: any = null;
if (Platform.OS !== 'web') {
    try {
        const { MMKV } = require('react-native-mmkv');
        mmkvInstance = new MMKV({ id: 'admin-settings' });
    } catch (e) {
        console.warn('Failed to initialize MMKV', e);
    }
}

class SettingsEventEmitter {
    private listeners: (() => void)[] = [];
    addListener(listener: () => void) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    }
    emit() { this.listeners.forEach(listener => listener()); }
}

export const settingsEmitter = new SettingsEventEmitter();

export interface CustomThemeDef {
    id: string;
    name: string;
    colors: { primary: string; secondary: string; darkBackground: string };
    isEditable: boolean;
}

export interface AppSettings {
    enableDarkMode: boolean;
    themeId: string;
    customThemes: CustomThemeDef[];
    compactMetrics?: boolean;
    denseLists?: boolean;
    reduceMotion?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
    enableDarkMode: true,
    themeId: 'command_dark',
    customThemes: [],
    compactMetrics: false,
    denseLists: false,
    reduceMotion: false,
};

const SETTINGS_KEY = 'app_settings';

const storage = {
    getString: (key: string): string | undefined => {
        if (Platform.OS === 'web') {
            try {
                return window.localStorage.getItem(key) || undefined;
            } catch {
                return undefined;
            }
        }
        return mmkvInstance?.getString(key);
    },
    set: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            try {
                window.localStorage.setItem(key, value);
            } catch {
                // ignore
            }
        } else {
            mmkvInstance?.set(key, value);
        }
    }
};

export const useSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    const loadSettings = useCallback(() => {
        try {
            const stored = storage.getString(SETTINGS_KEY);
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
            }
        } catch {
            // ignore
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        loadSettings();
        return settingsEmitter.addListener(loadSettings);
    }, [loadSettings]);

    const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            storage.set(SETTINGS_KEY, JSON.stringify(next));
            settingsEmitter.emit();
            return next;
        });
    }, []);

    return { settings, updateSetting, isLoaded };
};
