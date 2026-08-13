import { State, City } from 'country-state-city';
import { StructuredLocation } from '@fresherflow/types';
import { CITY_TO_STATE, isStateName } from '@fresherflow/constants';

// Load Indian states and cities once for case-insensitive fallback lookup
const statesInIndia = State.getStatesOfCountry('IN') || [];
const citiesInIndia = City.getCitiesOfCountry('IN') || [];

// Create lookup maps of lowercase name -> official object from country-state-city
const stateMap = new Map<string, typeof statesInIndia[0]>();
for (const state of statesInIndia) {
    stateMap.set(state.name.toLowerCase(), state);
}

const cityMap = new Map<string, typeof citiesInIndia[0]>();
for (const city of citiesInIndia) {
    cityMap.set(city.name.toLowerCase(), city);
}

/**
 * Clean, normalize, and resolve location names using the local taxonomy and country-state-city database.
 */
export function cleanAndResolveLocations(rawLocations: string[]): { locations: string[], structuredLocations: StructuredLocation[] } {
    if (!rawLocations || !Array.isArray(rawLocations)) return { locations: [], structuredLocations: [] };

    const parsedLocations: string[] = [];
    const structuredLocations: StructuredLocation[] = [];
    
    // To prevent duplicates
    const seenNames = new Set<string>();

    const addLocation = (name: string, structured: StructuredLocation) => {
        if (!seenNames.has(name.toLowerCase())) {
            seenNames.add(name.toLowerCase());
            parsedLocations.push(name);
            structuredLocations.push(structured);
        }
    };

    const allExtractedCities: {name: string, structured: StructuredLocation}[] = [];
    const allExtractedStates: {name: string, structured: StructuredLocation}[] = [];
    let hasSpecials = false;
    const fallbackRawTokens: string[] = [];

    for (const loc of rawLocations) {
        const trimmed = loc.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase();
        const parts = lower.split(/[,|;:\/]+/).map(p => p.trim()).filter(Boolean);

        let foundAnyKnown = false;

        for (let part of parts) {
            let subParts = [part];
            if (part.includes('-')) {
                if (!cityMap.has(part) && !CITY_TO_STATE[part]) {
                    subParts = part.split('-').map(p => p.trim()).filter(Boolean);
                }
            }

            for (const sp of subParts) {
                if (sp === 'india' || sp === 'in' || sp === 'india (in)') {
                    continue;
                }
                
                if (sp === 'remote' || sp === 'work from home' || sp === 'wfh') {
                    addLocation('Remote', { name: 'Remote', type: 'remote' });
                    hasSpecials = true;
                    foundAnyKnown = true;
                    continue;
                }
                if (sp === 'pan india' || sp === 'across india') {
                    addLocation('Pan India', { name: 'Pan India', country: 'IN', type: 'country' });
                    hasSpecials = true;
                    foundAnyKnown = true;
                    continue;
                }

                if (CITY_TO_STATE[sp]) {
                    const canonicalName = cityMap.get(sp)?.name || sp.replace(/\b\w/g, c => c.toUpperCase());
                    allExtractedCities.push({name: canonicalName, structured: { name: canonicalName, state: CITY_TO_STATE[sp], country: 'IN', type: 'city' }});
                    foundAnyKnown = true;
                    continue;
                }
                
                if (cityMap.has(sp)) {
                    const cityData = cityMap.get(sp)!;
                    const stateData = statesInIndia.find(s => s.isoCode === cityData.stateCode);
                    allExtractedCities.push({name: cityData.name, structured: { name: cityData.name, state: stateData?.name || cityData.stateCode, country: 'IN', type: 'city' }});
                    foundAnyKnown = true;
                    continue;
                }

                if (isStateName(sp)) {
                    const canonicalName = stateMap.get(sp)?.name || sp.replace(/\b\w/g, c => c.toUpperCase());
                    allExtractedStates.push({name: canonicalName, structured: { name: canonicalName, country: 'IN', type: 'state' }});
                    foundAnyKnown = true;
                    continue;
                }

                if (stateMap.has(sp)) {
                    const stateData = stateMap.get(sp)!;
                    allExtractedStates.push({name: stateData.name, structured: { name: stateData.name, country: 'IN', type: 'state' }});
                    foundAnyKnown = true;
                    continue;
                }

                const stateByCode = statesInIndia.find(s => s.isoCode.toLowerCase() === sp);
                if (stateByCode) {
                    allExtractedStates.push({name: stateByCode.name, structured: { name: stateByCode.name, country: 'IN', type: 'state' }});
                    foundAnyKnown = true;
                    continue;
                }
            }
        }

        if (!foundAnyKnown && !hasSpecials) {
            let cleanedRaw = trimmed.replace(/,\s*(india|in)\s*$/i, '');
            const capitalized = cleanedRaw.replace(/\b\w/g, c => c.toUpperCase());
            fallbackRawTokens.push(capitalized);
        }
    }

    // Process all aggregated cities
    const coveredStates = new Set<string>();
    for (const ec of allExtractedCities) {
        addLocation(ec.name, ec.structured);
        if (ec.structured.state) {
            coveredStates.add(ec.structured.state.toLowerCase());
        }
    }

    // Process all aggregated states
    for (const es of allExtractedStates) {
        // Only add the state if it's NOT covered by any city we found
        if (!coveredStates.has(es.name.toLowerCase())) {
            addLocation(es.name, es.structured);
        }
    }

    // If nothing at all was found, add fallbacks
    if (allExtractedCities.length === 0 && allExtractedStates.length === 0 && !hasSpecials) {
        if (fallbackRawTokens.length > 0) {
            // Check if the only tokens are 'India' or 'IN'
            const allAreIndia = fallbackRawTokens.every(l => {
                const lower = l.trim().toLowerCase();
                return lower === 'india' || lower === 'in';
            });
            if (allAreIndia) {
                addLocation('Pan India', { name: 'Pan India', country: 'IN', type: 'country' });
            } else {
                for (let raw of fallbackRawTokens) {
                    if (raw.toLowerCase() === 'india' || raw.toLowerCase() === 'in') {
                        addLocation('Pan India', { name: 'Pan India', country: 'IN', type: 'country' });
                    } else {
                        addLocation(raw, { name: raw, type: 'city' });
                    }
                }
            }
        }
    }

    return { locations: parsedLocations, structuredLocations };
}
