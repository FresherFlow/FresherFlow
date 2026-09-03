'use client';

import { useState, useCallback } from 'react';

interface GeolocationState {
    latitude: number | null;
    longitude: number | null;
    loading: boolean;
    error: string | null;
    permissionDenied: boolean;
    requested: boolean;
}

const CACHE_KEY = 'ff:geolocation';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function readCachedLocation(): { lat: number; lng: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
        if (Date.now() - (parsed.ts || 0) > CACHE_TTL_MS) return null;
        return { lat: parsed.lat, lng: parsed.lng };
    } catch {
        return null;
    }
}

function writeCachedLocation(lat: number, lng: number): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lng, ts: Date.now() }));
    } catch { /* ignore */ }
}

/**
 * Browser geolocation hook with manual request.
 * Does NOT auto-prompt — user must click a button to request location.
 * Coordinates are cached in localStorage for 10 minutes.
 */
export function useGeolocation() {
    const [state, setState] = useState<GeolocationState>(() => {
        const cached = readCachedLocation();
        if (cached) {
            return { latitude: cached.lat, longitude: cached.lng, loading: false, error: null, permissionDenied: false, requested: true };
        }
        return { latitude: null, longitude: null, loading: false, error: null, permissionDenied: false, requested: false };
    });

    const requestLocation = useCallback(() => {
        if (state.loading) return;

        // Use cached if fresh
        const cached = readCachedLocation();
        if (cached) {
            setState(prev => ({ ...prev, latitude: cached.lat, longitude: cached.lng, loading: false, requested: true }));
            // Still do a background refresh
        }

        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, loading: false, error: 'Geolocation not supported', requested: true }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, requested: true }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                writeCachedLocation(latitude, longitude);
                setState({ latitude, longitude, loading: false, error: null, permissionDenied: false, requested: true });
            },
            (err) => {
                const denied = err.code === err.PERMISSION_DENIED;
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: denied ? 'Location permission denied' : 'Unable to get location',
                    permissionDenied: denied,
                    requested: true,
                }));
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_TTL_MS }
        );
    }, [state.loading]);

    const clearLocation = useCallback(() => {
        localStorage.removeItem(CACHE_KEY);
        setState({ latitude: null, longitude: null, loading: false, error: null, permissionDenied: false, requested: false });
    }, []);

    return { ...state, requestLocation, clearLocation };
}
