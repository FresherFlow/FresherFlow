import React, { useState, useMemo } from 'react';
import { View, Image, Text, Platform } from 'react-native';
import { useUITheme } from './theme';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';

interface Props {
    /** Company website URL, e.g. "https://google.com" */
    website?: string | null;
    /** Direct URL to the company logo image */
    logoUrl?: string | null;
    /** Application link to extract domain from */
    applyLink?: string | null;
    /** Company name — used to generate initials fallback */
    name: string;
    size?: number;
}

export const CompanyLogo = ({ website, name, logoUrl: explicitLogoUrl, applyLink, size = 40 }: Props) => {
    const { colors } = useUITheme();
    const [attemptIndex, setAttemptIndex] = useState(0);
    const [imgError, setImgError] = useState(false);

    const normalizedName = (name || '').toLowerCase().trim();
    const isTcsBrand = normalizedName.includes('tata consultancy services') || normalizedName.includes(' tcs') || normalizedName === 'tcs';

    const candidates = useMemo(() => {
        const urls: string[] = [];
        if (explicitLogoUrl) urls.push(`${explicitLogoUrl}${explicitLogoUrl.includes('?') ? '&' : '?'}size=80`);

        const websiteDomain = website ? getRootDomain(website) : null;
        const applyDomain = applyLink ? getRootDomain(applyLink) : null;
        
        const cleanName = normalizedName.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const knownDomain = BRAND_DOMAINS[cleanName] || 
            Object.entries(BRAND_DOMAINS).find(([key]) => cleanName.includes(key))?.[1];

        const domainsToTry = Array.from(new Set([
            websiteDomain,
            applyDomain,
            knownDomain,
            // Heuristic fallback: try company-name.com if no other domain is found
            !knownDomain && cleanName.length > 2 && cleanName.length < 15 && !cleanName.includes(' ') ? `${cleanName}.com` : null
        ].filter((d): d is string => !!d)));

        domainsToTry.forEach(d => {
            // Google Favicon (Best fallback, usually has high-res)
            urls.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
            // Clearbit (Cleanest logos when available)
            urls.push(`https://logo.clearbit.com/${d}`);
            // DuckDuckGo (Reliable)
            urls.push(`https://icons.duckduckgo.com/ip3/${d}.ico`);
        });

        return Array.from(new Set(urls));
    }, [explicitLogoUrl, website, applyLink, normalizedName]);

    const [currentSrc, setCurrentSrc] = useState<string | null>(null);

    // Global in-memory cache for instant resolution
    const memCache = useMemo(() => {
        const g = global as unknown as { _logoCache?: Map<string, string> };
        return g._logoCache || (g._logoCache = new Map<string, string>());
    }, []);

    // Cache key based on the candidates
    const cacheKey = useMemo(() => candidates.join('|'), [candidates]);

    React.useEffect(() => {
        let mounted = true;
        const initCache = async () => {
            // 1. Try memory cache first
            if (memCache.has(cacheKey)) {
                if (mounted) setCurrentSrc(memCache.get(cacheKey)!);
                return;
            }

            // 2. Try AsyncStorage (for offline persistence)
            if (Platform.OS !== 'web') {
                try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default; // eslint-disable-line @typescript-eslint/no-require-imports
                    const stored = await AsyncStorage.getItem(`logo_cache_${cacheKey}`);
                    if (stored && mounted) {
                        memCache.set(cacheKey, stored);
                        setCurrentSrc(stored);
                        return;
                    }
                } catch { /* ignore */ }
            }

            // 3. Fallback to first candidate
            if (mounted) {
                setAttemptIndex(0);
                setImgError(false);
                setCurrentSrc(candidates[0]);
            }
        };
        initCache();
        return () => { mounted = false; };
    }, [cacheKey, candidates, memCache]);

    const radius = Math.round(size * 0.25);

    const containerStyle = {
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: '#FFFFFF', // Force white background so transparent logos don't disappear in dark mode
        overflow: 'hidden' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.08)',
    };

    const handleLoadError = () => {
        if (attemptIndex < candidates.length - 1) {
            const nextIndex = attemptIndex + 1;
            setAttemptIndex(nextIndex);
            setCurrentSrc(candidates[nextIndex]);
        } else {
            setImgError(true);
        }
    };

    const handleLoadSuccess = (e: { nativeEvent: { source: { width: number } } }) => {
        // Handle Google's 16px fallback globe
        const { width } = e.nativeEvent.source;
        if (width <= 16 && width > 0 && currentSrc?.includes('google.com')) {
            handleLoadError();
            return;
        }

        // Cache the successful URL!
        if (currentSrc) {
            memCache.set(cacheKey, currentSrc);
            if (Platform.OS !== 'web') {
                void (async () => {
                    try {
                        const AsyncStorage = require('@react-native-async-storage/async-storage').default; // eslint-disable-line @typescript-eslint/no-require-imports
                        await AsyncStorage.setItem(`logo_cache_${cacheKey}`, currentSrc);
                    } catch { /* ignore */ }
                })();
            }
        }
    };

    if (currentSrc && !imgError) {
        return (
            <View style={containerStyle}>
                <Image
                    source={{ uri: currentSrc }}
                    style={{ width: size, height: size }}
                    resizeMode="contain"
                    onError={handleLoadError}
                    onLoad={handleLoadSuccess}
                />
            </View>
        );
    }

    if (isTcsBrand) {
        return (
            <View style={[containerStyle, { backgroundColor: '#005a9c', borderColor: '#005a9c' }]}>
                <Text style={{ color: '#fff', fontSize: Math.round(size * 0.3), fontWeight: '900' }}>TCS</Text>
            </View>
        );
    }

    return (
        <View style={[containerStyle, { backgroundColor: colors.surfaceMuted || colors.surface }]}>
            <Text style={{ 
                color: colors.primary, 
                fontSize: Math.round(size * 0.4), 
                fontWeight: '900' 
            }}>
                {name ? name.charAt(0).toUpperCase() : 'C'}
            </Text>
        </View>
    );
};
