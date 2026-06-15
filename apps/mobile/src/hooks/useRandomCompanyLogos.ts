import { useState, useEffect } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { useFeedStore, getLogoCacheKey } from '@/store/useFeedStore';
import { storage } from '@/utils/storage';
import axios from 'axios';
import { COMPANIES_METADATA_URL } from '@/config/api';

const COMPANIES_CACHE_KEY = 'ff_companies_metadata_v1';

export function getLocalCompanyLogos(): string[] {
    const privateOpps = useFeedStore.getState().privateCachedItems || [];
    const govtOpps = useFeedStore.getState().govtCachedItems || [];
    const opportunities = [...privateOpps, ...govtOpps];
    const logos = new Set<string>();

    // 1. Gather actual direct companyLogoUrl values and local cache paths from opportunities
    for (const opp of opportunities) {
        if (opp.companyLogoUrl) {
            logos.add(opp.companyLogoUrl);
        }

        const cacheKey = getLogoCacheKey(opp);
        const cachedUri = storage.getString(`logo_${cacheKey}`);
        if (cachedUri && !cachedUri.startsWith('name_')) {
            logos.add(cachedUri);
        }
    }

    // 2. Add logos from cached companies.json metadata
    try {
        const cachedCompaniesStr = storage.getString(COMPANIES_CACHE_KEY);
        if (cachedCompaniesStr) {
            const companies = JSON.parse(cachedCompaniesStr);
            if (Array.isArray(companies)) {
                companies.forEach(c => {
                    if (c.logo_url) logos.add(c.logo_url);
                });
            }
        }
    } catch {}

    let logoArray = Array.from(logos).filter(Boolean);

    if (logoArray.length === 0) {
        // Initial seed of guaranteed Indian company logos to prevent completely blank grid before companies.json finishes loading
        const initialSeed = ['tcs.com', 'infosys.com', 'wipro.com', 'accenture.com', 'ibm.com', 'cognizant.com', 'capgemini.com', 'techmahindra.com', 'zoho.com', 'freshworks.com', 'flipkart.com', 'paytm.com'];
        logoArray = initialSeed.map(domain => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    }

    // Repeat the logos until we have a healthy pool for the rotation animation (e.g. 120 items)
    const poolSize = 120;
    const finalPool: string[] = [];
    while (finalPool.length < poolSize) {
        finalPool.push(...logoArray);
    }

    return finalPool.slice(0, poolSize).sort(() => 0.5 - Math.random());
}

export function useRandomCompanyLogos() {
    const [logos, setLogos] = useState<string[]>(getLocalCompanyLogos);
    const cachedItems = useFeedStore(state => state.cachedItems);

    useEffect(() => {
        let mounted = true;

        const fetchCompanies = async () => {
            try {
                const res = await axios.get(COMPANIES_METADATA_URL, { timeout: 5000 });
                if (res.data && Array.isArray(res.data)) {
                    storage.set(COMPANIES_CACHE_KEY, JSON.stringify(res.data));
                    if (mounted) {
                        const next = getLocalCompanyLogos();
                        setLogos(next);
                        if (next.length > 0) {
                            void ExpoImage.prefetch(next).catch(() => {});
                        }
                    }
                }
            } catch (e) {
                // Ignore failure
            }
        };

        fetchCompanies();

        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const next = getLocalCompanyLogos();
        setLogos(next);
        if (next.length > 0) {
            void ExpoImage.prefetch(next).catch(() => {});
        }
    }, [cachedItems]);

    // Prefetch the initial pool on first mount
    useEffect(() => {
        if (logos.length > 0) {
            void ExpoImage.prefetch(logos).catch(() => {});
        }
    }, []);

    return logos;
}
