/**
 * locationTaxonomy.ts
 *
 * Single Source of Truth for static fallback location mapping and metadata.
 * Derived structures are dynamically built at load time to prevent duplication.
 */

export const CITIES_METADATA_FALLBACK: Record<string, string[]> = {
  "Karnataka": ["Bengaluru", "Mysore", "Mangalore", "Hubli", "Belgaum"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Kolhapur", "Solapur", "Malegaon", "Nanded"],
  "Delhi NCR": ["Delhi", "Noida", "Gurugram", "Faridabad", "Ghaziabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Tirunelveli", "Tiruppur"],
  "Telangana": ["Hyderabad", "Warangal"],
  "West Bengal": ["Kolkata", "Durgapur", "Burdwan"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
  "Uttar Pradesh": ["Lucknow", "Agra", "Aligarh", "Bareilly", "Gorakhpur", "Jhansi", "Kanpur", "Mathura", "Meerut", "Moradabad", "Muzaffarnagar", "Varanasi"],
  "Punjab": ["Chandigarh", "Amritsar", "Jalandhar"],
  "Haryana": ["Panipat", "Yamunanagar"],
  "Kerala": ["Kochi", "Calicut", "Thiruvananthapuram"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Ujjain"],
  "Andhra Pradesh": ["Visakhapatnam", "Kurnool", "Vijayawada", "Chirala"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Ajmer", "Pali"],
  "Goa": ["Goa"],
  "Assam": ["Guwahati"],
  "Bihar": ["Patna", "Gaya"],
  "Chhattisgarh": ["Raipur", "Bhilai"],
  "Uttarakhand": ["Dehradun", "Haridwar"],
  "Jharkhand": ["Jamshedpur", "Dhanbad"],
  "Jammu & Kashmir": ["Srinagar"],
  "Odisha": ["Bhubaneswar", "Cuttack"]
};

// 1. Dynamically derived list of states
export const INDIAN_STATES: string[] = Object.keys(CITIES_METADATA_FALLBACK);

// 2. Dynamically derived set of lowercase states for fast matching
export const STATE_ALIASES: Set<string> = new Set(
  INDIAN_STATES.map(state => state.toLowerCase())
);

// 3. Dynamically derived flat list of all cities sorted alphabetically
export const INDIAN_CITIES: string[] = Object.values(CITIES_METADATA_FALLBACK)
  .flat()
  .sort();

// 4. Dynamically derived mapping of lowercase city name -> State name
export const CITY_TO_STATE: Record<string, string> = {};

for (const [state, cities] of Object.entries(CITIES_METADATA_FALLBACK)) {
  for (const city of cities) {
    CITY_TO_STATE[city.toLowerCase()] = state;
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
  sricity: 'Andhra Pradesh',
  'sri city': 'Andhra Pradesh',
  'sricity mill': 'Andhra Pradesh',
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

