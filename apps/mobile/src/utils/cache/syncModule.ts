import { Opportunity, Profile } from '@fresherflow/types';
import axios from 'axios';
import { BOOTSTRAP_FEED_URL, FEED_VERSION_URL, GOVERNMENT_FEED_URL } from '@/config/api';
import { generateCdnSignature, generateVersionedCdnSignature } from '@/utils/cdnSignature';
import { calculateOpportunityMatch } from '@fresherflow/domain';
import { saveFeedCache } from '@/utils/cache/offlineCache';
import { getString, setString, storage } from '@/utils/storage';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { storage as coreStorage } from '@repo/frontend-core';

const fsWithDir = FileSystem as any;

const RESOLVED_IDS_KEY = 'ff_logo_resolved_ids_v1';

const _loadResolvedIds = (): Set<string> => {
    try {
        const raw = getString(RESOLVED_IDS_KEY);
        if (raw) return new Set<string>(JSON.parse(raw));
    } catch {}
    return new Set<string>();
};

const resolvedIds: Set<string> = _loadResolvedIds();

const _persistResolvedIds = () => {
    try {
        setString(RESOLVED_IDS_KEY, JSON.stringify(Array.from(resolvedIds)));
    } catch {}
};

const cacheLogo = (key: string, value: string) => {
    try {
        storage.set(key, value);
        const rawKeys = storage.getString('ff_logo_cache_keys_v1');
        const keys = rawKeys ? JSON.parse(rawKeys) : [];
        if (!keys.includes(key)) {
            keys.push(key);
            storage.set('ff_logo_cache_keys_v1', JSON.stringify(keys));
        }
    } catch {}
    try {
        void coreStorage.setItem(key, value);
    } catch {}
};

export const getLogoCacheKey = (opp: Opportunity): string => {
    const name = opp.company;
    const website = opp.companyWebsite;
    const logoUrl = opp.companyLogoUrl;
    const applyLink = opp.applyLink;
    const normalizedName = (name || '').toLowerCase().trim();
    const cleanName = normalizedName.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const candidates: string[] = [];
    
    if (logoUrl) {
        candidates.push(`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}size=80`);
    }
    
    const websiteDomain = website ? getRootDomain(website) : null;
    const applyDomain = applyLink ? getRootDomain(applyLink) : null;
    const knownDomain = BRAND_DOMAINS[cleanName] ||
        Object.entries(BRAND_DOMAINS).find(([key]) => cleanName.includes(key))?.[1];
        
    const domainsToTry = Array.from(new Set([
        websiteDomain,
        applyDomain,
        knownDomain,
        !knownDomain && cleanName.length > 2 && cleanName.length < 15 && !cleanName.includes(' ') ? `${cleanName}.com` : null
    ].filter((d): d is string => !!d)));
    
    domainsToTry.forEach(d => {
        candidates.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
        candidates.push(`https://logo.clearbit.com/${d}`);
        candidates.push(`https://icons.duckduckgo.com/ip3/${d}.ico`);
    });
    
    if (candidates.length === 0) return `name_${normalizedName}`;
    return candidates.join('|');
};

export const OfflineSyncModule = {
    async fetchRawFeed(sector: 'PRIVATE' | 'GOVERNMENT'): Promise<{ opportunities: Opportunity[], timestamp: number } | null> {
        try {
            const isGovt = sector === 'GOVERNMENT';
            let feedVersion = '';
            
            try {
                const versionRes = await axios.get(FEED_VERSION_URL, {
                    timeout: 3000,
                    headers: { 'Cache-Control': 'no-cache' }
                });
                if (versionRes.data?.version) feedVersion = versionRes.data.version;
            } catch (e) {
                if (__DEV__) console.warn('[mobile] Failed to fetch feed version, using timestamp:', e);
                feedVersion = Math.floor(Date.now() / 300000).toString();
            }

            const signaturePath = isGovt ? '/government-feed.json' : '/bootstrap-feed.min.json';
            const signatureParams = feedVersion
                ? generateVersionedCdnSignature(signaturePath, feedVersion)
                : generateCdnSignature(signaturePath);
                
            const baseUrl = isGovt ? GOVERNMENT_FEED_URL : BOOTSTRAP_FEED_URL;
            const signedUrl = 'v' in signatureParams
                ? `${baseUrl}?v=${signatureParams.v}&sig=${signatureParams.sig}`
                : `${baseUrl}?t=${signatureParams.t}&sig=${signatureParams.sig}`;

            const response = await axios.get(signedUrl, {
                timeout: 5000,
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (response.data?.opportunities) {
                return {
                    opportunities: response.data.opportunities as Opportunity[],
                    timestamp: response.data.timestamp || Date.now()
                };
            }
        } catch (e) {
            const errMsg = (e as Error).message;
            if (__DEV__) console.warn('[OfflineSyncModule] Feed fetch failed:', errMsg);
            throw e;
        }
        return null;
    },

    async scoreAndCacheFeed(opportunities: Opportunity[], profile: Profile | null, sector: 'PRIVATE' | 'GOVERNMENT'): Promise<Opportunity[]> {
        // Normalize opportunity types
        const normalizedOpportunities = opportunities.map(job => {
            if (job.governmentJobDetails) {
                return { ...job, type: 'GOVERNMENT' as any };
            }
            return job;
        });

        // Filter opportunities based on active sector
        const sectorFilteredOpportunities = normalizedOpportunities.filter(job => {
            const isGovtJob = !!job.governmentJobDetails;
            if (sector === 'GOVERNMENT') return isGovtJob;
            return !isGovtJob;
        });

        const hasProfileData = profile && (
            (profile.skills && profile.skills.length > 0) ||
            (profile.preferredCities && profile.preferredCities.length > 0) ||
            (profile.interestedIn && profile.interestedIn.length > 0) ||
            profile.educationLevel
        );

        const scoredOpportunities = sectorFilteredOpportunities.map(job => {
            const rawJob = { ...job } as any;
            delete rawJob.matchScore;
            delete rawJob.matchReason;
            delete rawJob.isEligible;
            
            // Bypass scoring for Government Jobs or incomplete profiles
            if (sector === 'GOVERNMENT' || !hasProfileData) {
                return rawJob as Opportunity;
            }

            const match = calculateOpportunityMatch(profile, rawJob);
            return {
                ...rawJob,
                matchScore: match.score > 0 ? match.score : undefined,
                matchReason: match.score > 0 ? match.reason : undefined,
                isEligible: match.isEligible
            };
        });

        if (scoredOpportunities.length > 0) {
            await saveFeedCache(scoredOpportunities, sector);
        }

        return scoredOpportunities;
    },

    async triggerLogoPrefetch(opportunities: Opportunity[]) {
        const toResolve = opportunities.filter(o => !resolvedIds.has(o.id));
        if (toResolve.length === 0) return;
        
        toResolve.forEach(o => resolvedIds.add(o.id));
        _persistResolvedIds();
        
        if (__DEV__) console.log(`[OfflineSyncModule] Logo engine: resolving ${toResolve.length} items...`);
        
        // Process in batches of 5 to avoid network/bridge congestion
        for (let i = 0; i < toResolve.length; i += 5) {
            const chunk = toResolve.slice(i, i + 5);
            
            await Promise.all(chunk.map(async (opp) => {
                try {
                    const cacheKey = getLogoCacheKey(opp);
                    const isNameFallback = cacheKey.startsWith('name_');
                    const candidates = isNameFallback ? [] : cacheKey.split('|');
                    if (candidates.length === 0) return;

                    const cachedValue = storage.getString(`logo_${cacheKey}`);
                    if (cachedValue) {
                        if (cachedValue.startsWith('file://')) {
                            try {
                                const fileInfo = await fsWithDir.getInfoAsync(cachedValue);
                                if (fileInfo.exists) {
                                    void ExpoImage.prefetch([cachedValue]).catch(() => {});
                                    return;
                                }
                            } catch (e) {}
                        } else {
                            void ExpoImage.prefetch([cachedValue]).catch(() => {});
                            return;
                        }
                    }

                    // Sequentially ping candidates to find the first working high-res logo
                    for (const url of candidates) {
                        try {
                            const response = await axios.get(url, {
                                timeout: 2500,
                                responseType: 'arraybuffer',
                                headers: { 'Accept': 'image/*' }
                            });

                            if (response.status === 200 && response.data) {
                                let isGoogle = false;
                                try {
                                    const hostname = new URL(url).hostname.toLowerCase();
                                    isGoogle = hostname === 'google.com' || hostname.endsWith('.google.com');
                                } catch {}
                                if (isGoogle && (response.data as ArrayBuffer).byteLength < 1000) {
                                    continue;
                                }

                                if (Platform.OS === 'web' || !fsWithDir.documentDirectory) {
                                    cacheLogo(`logo_${cacheKey}`, url);
                                    void ExpoImage.prefetch([url]).catch(() => {});
                                    break;
                                }

                                const ext = url.split('?')[0].split('.').pop()?.substring(0, 4) || 'png';
                                const safeKey = cacheKey.replace(/[^a-z0-9]/gi, '_');
                                const localUri = `${fsWithDir.documentDirectory}logo_${safeKey}.${ext}`;

                                try {
                                    const { uri } = await fsWithDir.downloadAsync(url, localUri);
                                    cacheLogo(`logo_${cacheKey}`, uri);
                                    void ExpoImage.prefetch([uri]).catch(() => {});
                                } catch (e) {
                                    cacheLogo(`logo_${cacheKey}`, url);
                                    void ExpoImage.prefetch([url]).catch(() => {});
                                }
                                break;
                            }
                        } catch {
                            // Try next candidate
                        }
                    }
                } catch (err) {
                    if (__DEV__) console.warn('[OfflineSyncModule] Logo engine pre-resolution skipped for opportunity:', err);
                }
            }));
        }
        if (__DEV__) console.log('[OfflineSyncModule] Logo engine finished.');
    },

    async cleanupOrphanedLogos(cachedItems: Opportunity[]) {
        try {
            if (cachedItems.length === 0 || Platform.OS === 'web' || !fsWithDir.documentDirectory) return;
            
            const activeKeys = new Set<string>();
            cachedItems.forEach(opp => {
                activeKeys.add(`logo_${getLogoCacheKey(opp)}`);
            });

            const rawKeys = storage.getString('ff_logo_cache_keys_v1');
            const logoKeys: string[] = rawKeys ? JSON.parse(rawKeys) : [];
            
            const validFileUris = new Set<string>();
            const remainingKeys: string[] = [];
            
            for (const key of logoKeys) {
                if (!activeKeys.has(key)) {
                    storage.delete(key);
                    try {
                        void coreStorage.removeItem(key);
                    } catch {}
                } else {
                    const uri = storage.getString(key);
                    if (uri && uri.startsWith('file://')) {
                        validFileUris.add(uri);
                    }
                    remainingKeys.push(key);
                }
            }
            
            storage.set('ff_logo_cache_keys_v1', JSON.stringify(remainingKeys));
            
            const files = await fsWithDir.readDirectoryAsync(fsWithDir.documentDirectory);
            const logoFiles = (files as string[]).filter((f: string) => f.startsWith('logo_'));
            let deleted = 0;
            
            for (const file of logoFiles) {
                const uri = `${fsWithDir.documentDirectory}${file}`;
                if (!validFileUris.has(uri)) {
                    await fsWithDir.deleteAsync(uri, { idempotent: true });
                    deleted++;
                }
            }
            if (__DEV__ && deleted > 0) {
                console.log(`[OfflineSyncModule] GC removed ${deleted} orphaned logos.`);
            }
        } catch (e) {
            if (__DEV__) console.warn('[OfflineSyncModule] Logo cleanup failed:', e);
        }
    }
};
