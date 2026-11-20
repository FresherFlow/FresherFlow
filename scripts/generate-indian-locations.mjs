/**
 * Regenerates the checked-in location extracts used by shared packages.
 *
 * `country-state-city` ships every city on earth (~8 MB of coordinates). The
 * browser only ever needs Indian places plus country/state names, so the
 * taxonomy keeps small extracts instead of importing the package. That import
 * was landing in the shared web bundle through `@fresherflow/constants` and
 * `@fresherflow/utils`, so every page — including /jobs — downloaded the world
 * city database before rendering anything.
 *
 * Run after upgrading `country-state-city`:
 *
 *   node scripts/generate-indian-locations.mjs
 *
 * Only names and codes are written; coordinates and timezones are not used by
 * any consumer.
 */
import { writeFileSync } from 'node:fs';
import { State, City, Country } from 'country-state-city';

const BANNER = `/* eslint-disable */
// GENERATED FILE — do not edit by hand.
// Source: country-state-city 3.x.
// Regenerate with: node scripts/generate-indian-locations.mjs
//
// This file exists so the browser never bundles the world city database.
// Names and codes only; no coordinates, no timezones.
`;

const states = State.getStatesOfCountry('IN').map((state) => ({
  name: state.name,
  isoCode: state.isoCode,
}));

const cities = (City.getCitiesOfCountry('IN') ?? []).map((city) => ({
  name: city.name,
  stateCode: city.stateCode,
}));

const countries = Country.getAllCountries().map((country) => ({
  name: country.name,
  isoCode: country.isoCode,
}));

const foreignStates = (State.getAllStates() ?? [])
  .filter((state) => state.countryCode !== 'IN')
  .map((state) => state.name)
  .filter((name, index, all) => all.indexOf(name) === index);

const india = `${BANNER}
export interface IndianStateRecord {
  readonly name: string;
  readonly isoCode: string;
}

export interface IndianCityRecord {
  readonly name: string;
  readonly stateCode: string;
}

export const INDIAN_STATES_DATA: readonly IndianStateRecord[] = ${JSON.stringify(states)};

export const INDIAN_CITIES_DATA: readonly IndianCityRecord[] = ${JSON.stringify(cities)};
`;

const countryList = `${BANNER}
export interface CountryRecord {
  readonly name: string;
  readonly isoCode: string;
}

/** Every country, for recognising a country in a location string. */
export const COUNTRY_LIST: readonly CountryRecord[] = ${JSON.stringify(countries)};
`;

const foreignStatesFile = `${BANNER}
/**
 * State/province names outside India. Used by the ingestion location triage to
 * reject a listing tagged with a foreign state ("California", "Dubai", …).
 * Cities are deliberately NOT included: that is the 8 MB part.
 */
export const FOREIGN_STATE_NAMES: readonly string[] = ${JSON.stringify(foreignStates)};
`;

const targets = [
  ['../packages/constants/src/data/indianLocations.ts', india],
  ['../packages/constants/src/data/countries.ts', countryList],
  ['../packages/utils/src/eligibility/data/foreignStates.ts', foreignStatesFile],
];

for (const [path, body] of targets) {
  const target = new URL(path, import.meta.url);
  writeFileSync(target, body);
  console.log(`wrote ${target.pathname}`);
}
console.log(`states=${states.length} cities=${cities.length} countries=${countries.length} foreignStates=${foreignStates.length}`);
