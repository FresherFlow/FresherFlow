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

    for (const loc of rawLocations) {
        const trimmed = loc.trim();
        if (!trimmed) continue;

        const lower = trimmed.toLowerCase();

        // 1. Handle specials (Remote / Pan India)
        if (lower === 'remote' || lower === 'work from home' || lower === 'wfh') {
            addLocation('Remote', { name: 'Remote', type: 'remote' });
            continue;
        }
        if (lower === 'pan india' || lower === 'across india') {
            addLocation('Pan India', { name: 'Pan India', country: 'IN', type: 'country' });
            continue;
        }

        // 2. Try matching from canonical locationTaxonomy first (handles aliases)
        if (CITY_TO_STATE[lower]) {
            const stateName = CITY_TO_STATE[lower];
            // Find canonical city name by checking taxonomy, but wait, CITY_TO_STATE has lower -> State.
            // If it's an alias like "bangalore", what is the canonical name?
            // Wait, we need to map the lower case name to the canonical name. We don't have CITY_ALIASES explicitly exporting the original casing.
            // Let's use the country-state-city map to get the canonical case, or fallback to Capitalized case.
            const cityData = cityMap.get(lower);
            const canonicalName = cityData?.name || trimmed.replace(/\b\w/g, c => c.toUpperCase());
            addLocation(canonicalName, { name: canonicalName, state: stateName, country: 'IN', type: 'city' });
            continue;
        }

        if (isStateName(lower)) {
            // Find canonical state name
            const stateData = stateMap.get(lower);
            const canonicalName = stateData?.name || trimmed.replace(/\b\w/g, c => c.toUpperCase());
            addLocation(canonicalName, { name: canonicalName, country: 'IN', type: 'state' });
            continue;
        }

        // 3. Fallback to country-state-city (Tier 3 cities etc.)
        if (cityMap.has(lower)) {
            const cityData = cityMap.get(lower)!;
            const stateData = statesInIndia.find(s => s.isoCode === cityData.stateCode);
            addLocation(cityData.name, { name: cityData.name, state: stateData?.name || cityData.stateCode, country: 'IN', type: 'city' });
            continue;
        }

        if (stateMap.has(lower)) {
            const stateData = stateMap.get(lower)!;
            addLocation(stateData.name, { name: stateData.name, country: 'IN', type: 'state' });
            continue;
        }

        // 4. Fallback: Keep the capitalized raw value if it is completely unrecognized
        const capitalized = trimmed.replace(/\b\w/g, c => c.toUpperCase());
        addLocation(capitalized, { name: capitalized, type: 'city' }); // default to city if unknown
    }

    return { locations: parsedLocations, structuredLocations };
}
