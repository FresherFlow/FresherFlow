/**
 * locationTaxonomy.ts
 *
 * Single Source of Truth for static fallback location mapping and metadata.
 * Derived structures are dynamically built at load time to prevent duplication.
 */

import { State, City, Country } from 'country-state-city';
export { State, City, Country };

const indianStatesData = State.getStatesOfCountry('IN');
const indianCitiesData = City.getCitiesOfCountry('IN') || [];

// 1. Dynamically derived list of states
export const INDIAN_STATES: string[] = indianStatesData.map(s => s.name);

// 2. Dynamically derived set of lowercase states for fast matching
export const STATE_ALIASES: Set<string> = new Set(
  INDIAN_STATES.map(state => state.toLowerCase())
);

// 3. Dynamically derived flat list of all cities sorted alphabetically
export const INDIAN_CITIES: string[] = indianCitiesData.map(c => c.name).sort();

// 4. Dynamically derived mapping of lowercase city name -> State name
export const CITY_TO_STATE: Record<string, string> = {};
export const CITIES_METADATA_FALLBACK: Record<string, string[]> = {};

const stateCodeToName: Record<string, string> = {};
for (const state of indianStatesData) {
  stateCodeToName[state.isoCode] = state.name;
  CITIES_METADATA_FALLBACK[state.name] = [];
}
for (const city of indianCitiesData) {
  const stateName = stateCodeToName[city.stateCode];
  if (stateName) {
    CITY_TO_STATE[city.name.toLowerCase()] = stateName;
    CITIES_METADATA_FALLBACK[stateName].push(city.name);
  }
}

// Add some common legacy city aliases for compatibility
const ALIASES: Record<string, string> = {
  bangalore: 'Karnataka',
  bombay: 'Maharashtra',
  madras: 'Tamil Nadu',
  poona: 'Maharashtra',
  calcutta: 'West Bengal',
  trivandrum: 'Kerala',
  vizag: 'Andhra Pradesh',
  gurgaon: 'Haryana',
  cochin: 'Kerala',
  secunderabad: 'Telangana',
};

for (const [alias, state] of Object.entries(ALIASES)) {
  if (!CITY_TO_STATE[alias]) {
    CITY_TO_STATE[alias] = state;
  }
}

export function getStateForCity(city: string): string | undefined {
  if (!city) return undefined;
  const lower = city.trim().toLowerCase();
  return CITY_TO_STATE[lower];
}

export function isStateName(name: string): boolean {
  if (!name) return false;
  const lower = name.trim().toLowerCase();
  return STATE_ALIASES.has(lower);
}

