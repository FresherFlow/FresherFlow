'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { growthApi } from '@/lib/api/client';
import { AuthContext } from './AuthContext';
import { ADMIN_WEB_HOST, APP_WEB_HOST } from '@/lib/runtimeConfig';

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

    const isInstallEligibleHost = useMemo(() => {
        if (typeof window === 'undefined') return false;
        const host = window.location.hostname.toLowerCase();
        return host === APP_WEB_HOST || host === ADMIN_WEB_HOST || host === 'cdn.fresherflow.in' || host === 'localhost' || host === '127.0.0.1';
    }, []);

    // 1. Initial detection and PWA mode tracking
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const installed = detectInstalled();

        // Use timeout to avoid sync state updates during mount
        const timer = window.setTimeout(() => {
            setIsInstalled(installed);
            setBannerDismissed(readBoolean(BANNER_DISMISSED_KEY));
            setVisitCount(readNumber(VISIT_COUNT_KEY, 0));
        }, 0);

        if (installed && !readBoolean(STANDALONE_TRACKED_KEY)) {
            // PWA tracking disabled since moving to mobile app
            // void growthApi.trackEvent('OPENED_STANDALONE', 'pwa_install').catch(() => {});
            setBoolean(STANDALONE_TRACKED_KEY, true);
        }

        return () => window.clearTimeout(timer);
    }, []);

    // 2. Increment visit count once per authenticated session
    const hasIncrementedCount = useRef(false);
    useEffect(() => {
        if (!user?.id || typeof window === 'undefined' || hasIncrementedCount.current) return;
        hasIncrementedCount.current = true;

        const nextCount = readNumber(VISIT_COUNT_KEY, 0) + 1;
        setNumber(VISIT_COUNT_KEY, nextCount);

        const timer = window.setTimeout(() => {
            setVisitCount(nextCount);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [user?.id]);

    // 3. PWA Event listeners
    useEffect(() => {
        if (typeof window === 'undefined' || !isInstallEligibleHost) return;

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            deferredPromptRef.current = event as BeforeInstallPromptEvent;
            setHasPromptEvent(true);
            // PWA tracking disabled since moving to mobile app
            // void growthApi.trackEvent('INSTALL_PROMPT_SHOWN', 'pwa_install').catch(() => {});
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
    }, [isInstallEligibleHost]);

    const dismissBanner = useCallback(() => {
        setBannerDismissed(true);
        setBoolean(BANNER_DISMISSED_KEY, true);
    }, []);

    const promptInstall = useCallback(async (source?: 'navbar' | 'banner') => {
        if (source) {
            // PWA tracking disabled since moving to mobile app
            // void growthApi.trackEvent('INSTALL_PROMPT_SHOWN', source).catch(() => {});
        }

        if (typeof window !== 'undefined' && !isInstallEligibleHost) {
            window.location.href = `https://${APP_WEB_HOST}/dashboard?install=1`;
            return false;
        }

        if (!deferredPromptRef.current) return false;

        const promptEvent = deferredPromptRef.current;
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;

        deferredPromptRef.current = null;
        setHasPromptEvent(false);

        if (choice.outcome === 'accepted') {
            // PWA tracking disabled since moving to mobile app
            // await growthApi.trackEvent('INSTALL_ACCEPTED', 'pwa_install').catch(() => {});
            setBannerDismissed(true);
            setBoolean(BANNER_DISMISSED_KEY, true);
            return true;
        }

        return false;
    }, [isInstallEligibleHost]);

    const canInstall = isInstallEligibleHost && hasPromptEvent && !isInstalled;
    const showBanner = Boolean(user) && canInstall && !bannerDismissed && visitCount >= 3;

    const contextValue = useMemo(() => ({
        canInstall,
        isInstalled,
        showBanner,
        dismissBanner,
        promptInstall,
    }), [canInstall, isInstalled, showBanner, dismissBanner, promptInstall]);

    return (
        <InstallPromptContext.Provider value={contextValue}>
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
