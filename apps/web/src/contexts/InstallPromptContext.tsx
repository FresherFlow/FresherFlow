'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { growthApi } from '@/lib/api/client';
import { AuthContext } from './AuthContext';

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallPromptContextValue = {
    canInstall: boolean;
    isInstalled: boolean;
    showBanner: boolean;
    dismissBanner: () => void;
    promptInstall: (source?: 'navbar' | 'banner') => Promise<boolean>;
};

const VISIT_COUNT_KEY = 'ff_install_visits';
const BANNER_DISMISSED_KEY = 'ff_install_banner_dismissed';
const STANDALONE_TRACKED_KEY = 'ff_opened_standalone_tracked';

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

function readNumber(key: string, fallback = 0) {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? Number(raw) : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
}

function setNumber(key: string, value: number) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, String(value));
}

function readBoolean(key: string) {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(key) === '1';
}

function setBoolean(key: string, value: boolean) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value ? '1' : '0');
}

function detectInstalled() {
    if (typeof window === 'undefined') return false;
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);
    return standaloneMode || iosStandalone;
}

export function InstallPromptProvider({ children }: { children: React.ReactNode }) {
    const authContext = useContext(AuthContext);
    const user = authContext?.user ?? null;
    const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
    const [hasPromptEvent, setHasPromptEvent] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [visitCount, setVisitCount] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const installed = detectInstalled();
        setIsInstalled(installed);
        setBannerDismissed(readBoolean(BANNER_DISMISSED_KEY));
        setVisitCount(readNumber(VISIT_COUNT_KEY, 0));

        if (installed && !readBoolean(STANDALONE_TRACKED_KEY)) {
            void growthApi.trackEvent('OPENED_STANDALONE', 'pwa_install');
            setBoolean(STANDALONE_TRACKED_KEY, true);
        }
    }, []);

    useEffect(() => {
        if (!user || typeof window === 'undefined') return;
        const nextCount = readNumber(VISIT_COUNT_KEY, 0) + 1;
        setNumber(VISIT_COUNT_KEY, nextCount);
        setVisitCount(nextCount);
    }, [user]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            deferredPromptRef.current = event as BeforeInstallPromptEvent;
            setHasPromptEvent(true);
            void growthApi.trackEvent('INSTALL_PROMPT_SHOWN', 'pwa_install');
        };

        const onAppInstalled = () => {
            setIsInstalled(true);
            setHasPromptEvent(false);
            deferredPromptRef.current = null;
        };

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onAppInstalled);
        };
    }, []);

    const dismissBanner = useCallback(() => {
        setBannerDismissed(true);
        setBoolean(BANNER_DISMISSED_KEY, true);
    }, []);

    const promptInstall = useCallback(async (_source?: 'navbar' | 'banner') => {
        if (!deferredPromptRef.current) return false;
        const promptEvent = deferredPromptRef.current;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        deferredPromptRef.current = null;
        setHasPromptEvent(false);

        if (choice.outcome === 'accepted') {
            await growthApi.trackEvent('INSTALL_ACCEPTED', 'pwa_install');
            setBannerDismissed(true);
            setBoolean(BANNER_DISMISSED_KEY, true);
            return true;
        }

        return false;
    }, []);

    const canInstall = hasPromptEvent && !isInstalled;
    const showBanner = Boolean(user) && canInstall && !bannerDismissed && visitCount >= 3;

    const value = useMemo<InstallPromptContextValue>(() => ({
        canInstall,
        isInstalled,
        showBanner,
        dismissBanner,
        promptInstall,
    }), [canInstall, dismissBanner, isInstalled, promptInstall, showBanner]);

    return (
        <InstallPromptContext.Provider value={value}>
            {children}
        </InstallPromptContext.Provider>
    );
}

export function useInstallPrompt() {
    const context = useContext(InstallPromptContext);
    if (!context) {
        throw new Error('useInstallPrompt must be used within InstallPromptProvider');
    }
    return context;
}
