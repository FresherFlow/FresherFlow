import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { storage } from '@repo/frontend-core';
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
    isGovernment?: boolean;
}

export const CompanyLogo = ({ website, name, logoUrl: explicitLogoUrl, applyLink, size = 40, isGovernment }: Props) => {
    const { colors } = useUITheme();
    const [attemptIndex, setAttemptIndex] = useState(0);
    const [imgError, setImgError] = useState(false);

    const normalizedName = (name || '').toLowerCase().trim();
    const isTcsBrand = normalizedName.includes('tata consultancy services') || normalizedName.includes(' tcs') || normalizedName === 'tcs';

    const isGovDetected = useMemo(() => {
        if (isGovernment) return true;
        const nameClean = normalizedName;
        const hasGovKeyword = nameClean.includes('commission') || nameClean.includes('board') || nameClean.includes('police') || nameClean.includes('railway') || nameClean.includes('air force') || nameClean.includes('navy') || nameClean.includes('army') || nameClean.includes('ministry');
        const hasGovDomain = (website && (website.includes('.gov.in') || website.includes('.nic.in') || website.includes('tgprb.in') || website.includes('cdac.in'))) ||
                             (applyLink && (applyLink.includes('.gov.in') || applyLink.includes('.nic.in') || applyLink.includes('tgprb.in') || applyLink.includes('cdac.in')));
        return !!(hasGovKeyword || hasGovDomain);
    }, [isGovernment, normalizedName, website, applyLink]);

    const candidates = useMemo(() => {
        const urls: string[] = [];
        if (explicitLogoUrl) urls.push(`${explicitLogoUrl}${explicitLogoUrl.includes('?') ? '&' : '?'}size=80`);

        if (isGovDetected && !explicitLogoUrl) {
            // Check for acronym in parentheses: e.g. "Railway Recruitment Board (RRB)" -> "rrb"
            const match = name.match(/\(([a-zA-Z\s]+)\)/);
            if (match && match[1]) {
                const acronym = match[1].toLowerCase().trim();
                if (/^[a-z]+$/.test(acronym)) {
                    urls.push(`https://cdn.fresherflow.in/logos/${acronym}.png`);
                }
            } else {
                // Check if name itself is a short acronym
                const cleanName = name.toLowerCase().trim();
                if (/^[a-z]+$/.test(cleanName) && cleanName.length <= 6) {
                    urls.push(`https://cdn.fresherflow.in/logos/${cleanName}.png`);
                }
            }
            return urls;
        }

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
    }, [explicitLogoUrl, website, applyLink, name, normalizedName, isGovDetected]);

    // Global in-memory cache for instant resolution
    const memCache = useMemo(() => {
        const g = global as unknown as { _logoCache?: Map<string, string> };
        return g._logoCache || (g._logoCache = new Map<string, string>());
    }, []);

    // Cache key based on the candidates or name if no candidates
    const cacheKey = useMemo(() => {
        if (candidates.length === 0) return `name_${normalizedName}`;
        return candidates.join('|');
    }, [candidates, normalizedName]);

    const [currentSrc, setCurrentSrc] = useState<string | null>(() => memCache.get(cacheKey) || candidates[0] || null);
    const [prevCacheKey, setPrevCacheKey] = useState<string | null>(cacheKey);

    // Synchronous reset when company/cacheKey changes to avoid recycling artifacts
    // and provide instant cached resolution (the "use cached" request)
    if (cacheKey !== prevCacheKey) {
        setPrevCacheKey(cacheKey);
        setCurrentSrc(memCache.get(cacheKey) || candidates[0] || null);
        setAttemptIndex(0);
        setImgError(false);
    }

    React.useEffect(() => {
        let mounted = true;
        const initCache = async () => {
            // Memory cache check for instant resolution
            if (memCache.has(cacheKey)) {
                if (mounted) setCurrentSrc(memCache.get(cacheKey)!);
                return;
            }

            // Persistent storage check
            try {
                const persistent = await storage.getItem(`logo_${cacheKey}`);
                if (persistent && mounted) {
                    if (persistent.startsWith('file://')) {
                        try {
                            const fileInfo = await FileSystem.getInfoAsync(persistent);
                            if (fileInfo.exists) {
                                memCache.set(cacheKey, persistent);
                                setCurrentSrc(persistent);
                                return;
                            }
                        } catch {
                            // ignore file system errors, fall through
                        }
                    } else {
                        // Old remote URL
                        memCache.set(cacheKey, persistent);
                        setCurrentSrc(persistent);
                        return;
                    }
                }
            } catch (err) {
                console.warn('[CompanyLogo] Failed to read persistent logo cache:', err);
            }

            // Fallback to first candidate (expo-image will handle disk check automatically)
            if (mounted) {
                setAttemptIndex(0);
                setImgError(false);
                setCurrentSrc(candidates[0]);
            }
        };
        void initCache();
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


    if (currentSrc && !imgError) {
        return (
            <View style={containerStyle}>
                <Image
                    source={{ uri: currentSrc }}
                    style={{ width: size, height: size }}
                    contentFit="contain"
                    cachePolicy="disk"
                    onError={handleLoadError}
                    onLoad={(e: { source: { width: number; height: number } }) => {
                        // Google 16px globe check (fallback sentinel)
                        let isGoogle = false;
                        try {
                            if (currentSrc) {
                                const parsed = new URL(currentSrc);
                                const host = parsed.hostname.toLowerCase();
                                isGoogle = host === 'google.com' || host.endsWith('.google.com');
                            }
                        } catch {}

                        if (e.source.width <= 16 && isGoogle) {
                            handleLoadError();
                        } else {
                            memCache.set(cacheKey, currentSrc!);
                            
                            const fsWithDir = FileSystem as unknown as { documentDirectory?: string };
                            if (Platform.OS === 'web' || !fsWithDir.documentDirectory) {
                                void storage.setItem(`logo_${cacheKey}`, currentSrc!).catch(() => {});
                                return;
                            }
                            
                            if (currentSrc?.startsWith('file://')) {
                                return; // Already cached locally
                            }
                            
                            // Download for offline permanence
                            const ext = currentSrc?.split('?')[0].split('.').pop()?.substring(0, 4) || 'png';
                            const safeKey = cacheKey.replace(/[^a-z0-9]/gi, '_');
                            const localUri = `${fsWithDir.documentDirectory}logo_${safeKey}.${ext}`;
                            
                            FileSystem.downloadAsync(currentSrc!, localUri)
                                .then(({ uri }) => {
                                    memCache.set(cacheKey, uri);
                                    void storage.setItem(`logo_${cacheKey}`, uri);
                                })
                                .catch((err) => {
                                    console.warn('[CompanyLogo] Failed to download logo:', err);
                                    void storage.setItem(`logo_${cacheKey}`, currentSrc!);
                                });
                        }
                    }}
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
