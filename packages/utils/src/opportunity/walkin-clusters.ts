/**
 * Curated Tech Cluster Geocoding Registry for Indian IT Hubs.
 *
 * Hyderabad was the only city with entries, so a Bengaluru or Pune drive was
 * scored as if it happened in Gachibowli: the cluster label was wrong, the pin
 * was 600 km off, and the city page it should have appeared on never got it.
 * Clusters are now keyed by city and a match returns null when the text does
 * not name a known locality, so an unrecognised venue stays unresolved instead
 * of being confidently placed.
 */

export interface TechCluster {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}

const HYDERABAD_CLUSTERS: TechCluster[] = [
  {
    id: 'HITEC_CITY',
    name: 'HITEC City / Mindspace',
    city: 'Hyderabad',
    latitude: 17.4474,
    longitude: 78.3762,
    keywords: ['hitec city', 'hitech city', 'cyber towers', 'mindspace', 'vst', 'inorbit', 'raheja it park', 'patrika nagar', 'silicon valley'],
  },
  {
    id: 'GACHIBOWLI',
    name: 'Gachibowli / Financial District',
    city: 'Hyderabad',
    latitude: 17.4401,
    longitude: 78.3489,
    keywords: ['gachibowli', 'financial district', 'dlf', 'waverock', 'q-city', 'qcity', 'nanakramguda', 'wipro circle', 'isb road', 'kokapet'],
  },
  {
    id: 'MADHAPUR',
    name: 'Madhapur',
    city: 'Hyderabad',
    latitude: 17.4483,
    longitude: 78.3915,
    keywords: ['madhapur', 'kavuri hills', 'image gardens', 'ayyappa society', '100 feet road', 'durgam cheruvu', 'vittal rao nagar'],
  },
  {
    id: 'KONDAPUR',
    name: 'Kondapur / Hafeezpet',
    city: 'Hyderabad',
    latitude: 17.4699,
    longitude: 78.3578,
    keywords: ['kondapur', 'hafeezpet', 'kothaguda', 'botanical garden', 'masjid banda', 'chirec avenue'],
  },
  {
    id: 'BEGUMPET',
    name: 'Begumpet / Somajiguda',
    city: 'Hyderabad',
    latitude: 17.4447,
    longitude: 78.4664,
    keywords: ['begumpet', 'somajiguda', 'prakash nagar', 'raj bhavan', 'punjagutta', 'panjagutta', 'ameerpet cross roads'],
  },
  {
    id: 'AMEERPET',
    name: 'Ameerpet / SR Nagar',
    city: 'Hyderabad',
    latitude: 17.4375,
    longitude: 78.4482,
    keywords: ['ameerpet', 'sr nagar', 'sanjeeva reddy nagar', 'mythrivanam', 'aditya enclave', 'balkampet'],
  },
  {
    id: 'UPPAL',
    name: 'Uppal / Pocharam',
    city: 'Hyderabad',
    latitude: 17.4065,
    longitude: 78.5691,
    keywords: ['uppal', 'pocharam', 'infosys sez', 'nsdl', 'ramanathapur', 'nagole', 'uppal tech park', 'genpact uppal'],
  },
  {
    id: 'SECUNDERABAD',
    name: 'Secunderabad',
    city: 'Hyderabad',
    latitude: 17.4399,
    longitude: 78.4983,
    keywords: ['secunderabad', 'marredpally', 'paradise', 'clock tower', 'trimulgherry', 'tarnaka'],
  },
];

const BENGALURU_CLUSTERS: TechCluster[] = [
  {
    id: 'BLR_WHITEFIELD',
    name: 'Whitefield / ITPL',
    city: 'Bengaluru',
    latitude: 12.9698,
    longitude: 77.7499,
    keywords: ['whitefield', 'itpl', 'iiit bangalore', 'prestige tech park', 'phoenix marketcity'],
  },
  {
    id: 'BLR_ELECTRONIC_CITY',
    name: 'Electronic City',
    city: 'Bengaluru',
    latitude: 12.8452,
    longitude: 77.6602,
    keywords: ['electronic city', 'ec phase 1', 'ec phase 2', 'silicon city'],
  },
  {
    id: 'BLR_MARATHAHALLI',
    name: 'Marathahalli / Outer Ring Road',
    city: 'Bengaluru',
    latitude: 12.9531,
    longitude: 77.7012,
    keywords: ['marathahalli', 'outer ring road', 'orr', 'kundalahalli', 'bellandur'],
  },
  {
    id: 'BLR_HEBBAL',
    name: 'Hebbal / Yelahanka',
    city: 'Bengaluru',
    latitude: 13.0358,
    longitude: 77.597,
    keywords: ['hebbal', 'yelahanka', 'airport road', 'manyata'],
  },
  {
    id: 'BLR_HSR',
    name: 'HSR Layout / Koramangala',
    city: 'Bengaluru',
    latitude: 12.9116,
    longitude: 77.6474,
    keywords: ['hsr layout', 'koramangala', 'indiranagar', 'domlur', 'ejipura'],
  },
];

const PUNE_CLUSTERS: TechCluster[] = [
  {
    id: 'PUN_HINJEWADI',
    name: 'Hinjewadi / Rajiv Gandhi Infotech Park',
    city: 'Pune',
    latitude: 18.5913,
    longitude: 73.7389,
    keywords: ['hinjewadi', 'rajiv gandhi infotech', 'rgip', 'tcs hinjewadi', 'infotech park'],
  },
  {
    id: 'PUN_KHARADI',
    name: 'Kharadi / EON',
    city: 'Pune',
    latitude: 18.5515,
    longitude: 73.9475,
    keywords: ['kharadi', 'eon', 'kalyani Nagar'.toLowerCase()],
  },
  {
    id: 'PUN_VIMAN',
    name: 'Viman Nagar',
    city: 'Pune',
    latitude: 18.5679,
    longitude: 73.9143,
    keywords: ['viman nagar', 'magarpatta', 'kalyani nagar'],
  },
  {
    id: 'PUN_WAKAD',
    name: 'Wakad',
    city: 'Pune',
    latitude: 18.5975,
    longitude: 73.7625,
    keywords: ['wakad', 'baner', 'sus road', 'mumbai pune highway'],
  },
];

const CHENNAI_CLUSTERS: TechCluster[] = [
  {
    id: 'MAA_OMR',
    name: 'OMR / Sholinganallur',
    city: 'Chennai',
    latitude: 12.8008,
    longitude: 80.2268,
    keywords: ['omr', 'sholinganallur', 'siruseri', 'tcs chennai', 'apollo tyres'],
  },
  {
    id: 'MAA_GUINDY',
    name: 'Guindy / Nungambakkam',
    city: 'Chennai',
    latitude: 13.0067,
    longitude: 80.2206,
    keywords: ['guindy', 'nungambakkam', 'tidel park', 'sandhiya'],
  },
  {
    id: 'MAA_WEST',
    name: 'Guindy West / Ambattur',
    city: 'Chennai',
    latitude: 13.0142,
    longitude: 80.1551,
    keywords: ['ambattur', 'guindy west', 't. nagar', 'porur'],
  },
];

const MUMBAI_CLUSTERS: TechCluster[] = [
  {
    id: 'BOM_POWAI',
    name: 'Powai / Hiranandani',
    city: 'Mumbai',
    latitude: 19.1176,
    longitude: 72.906,
    keywords: ['powai', 'hiranandani', 'iit bombay', 'powai plaza'],
  },
  {
    id: 'BOM_ANDHERI',
    name: 'Andheri / Chakala',
    city: 'Mumbai',
    latitude: 19.1136,
    longitude: 72.8697,
    keywords: ['andheri', 'chakala', 'marol', 'saki'],
  },
  {
    id: 'BOM_THANE',
    name: 'Thane / Airoli',
    city: 'Mumbai',
    latitude: 19.2183,
    longitude: 72.9781,
    keywords: ['thane', 'airoli', 'mindspace airoli'],
  },
];

const NCR_CLUSTERS: TechCluster[] = [
  {
    id: 'NCR_NOIDA',
    name: 'Noida / Sector 62',
    city: 'Noida',
    latitude: 28.5355,
    longitude: 77.391,
    keywords: ['noida', 'sector 62', 'sector 63', 'sector 135', 'greater noida'],
  },
  {
    id: 'NCR_GURUGRAM',
    name: 'Gurugram / Cyber City',
    city: 'Gurugram',
    latitude: 28.4595,
    longitude: 77.0266,
    keywords: ['gurugram', 'gurgaon', 'cyber city', 'dlf cyber city', 'sohna road'],
  },
  {
    id: 'NCR_FARIDABAD',
    name: 'Faridabad / Sector 59',
    city: 'Faridabad',
    latitude: 28.4089,
    longitude: 77.3178,
    keywords: ['faridabad', 'sector 59', 'sector 14'],
  },
];

const KOLKATA_CLUSTERS: TechCluster[] = [
  {
    id: 'CCU_SALTLAKE',
    name: 'Salt Lake / Sector V',
    city: 'Kolkata',
    latitude: 22.5807,
    longitude: 88.4209,
    keywords: ['salt lake', 'sector v', 'sector 5', 'mindree', 'tcs salt lake'],
  },
  {
    id: 'CCU_RAJARHAT',
    name: 'Rajarhat / New Town',
    city: 'Kolkata',
    latitude: 22.7554,
    longitude: 88.4864,
    keywords: ['rajarhat', 'new town', 'action area', 'dn block'],
  },
];

/** Every curated cluster, city-ordered for deterministic matching. */
export const TECH_CLUSTERS: TechCluster[] = [
  ...HYDERABAD_CLUSTERS,
  ...BENGALURU_CLUSTERS,
  ...PUNE_CLUSTERS,
  ...CHENNAI_CLUSTERS,
  ...MUMBAI_CLUSTERS,
  ...NCR_CLUSTERS,
  ...KOLKATA_CLUSTERS,
];

/** Cities that have curated locality coverage. */
export const CITIES_WITH_CLUSTERS: string[] = Array.from(
  new Set(TECH_CLUSTERS.map(c => c.city)),
);

/**
 * @deprecated Renamed. Use `matchTechCluster`, which resolves any supported city
 * and returns null for an unknown venue instead of assuming Hyderabad.
 */
export const HYDERABAD_TECH_CLUSTERS = HYDERABAD_CLUSTERS;

export interface MatchedClusterResult {
  cluster: TechCluster;
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

function toMatch(cluster: TechCluster): MatchedClusterResult {
  return {
    cluster,
    latitude: cluster.latitude,
    longitude: cluster.longitude,
    mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${cluster.latitude},${cluster.longitude}`,
  };
}

/**
 * Matches a venue address or description to a curated tech cluster in any
 * supported city.
 *
 * Returns null when the text names no known locality. The old matcher always
 * returned HITEC City, so every unrecognised venue in India was silently placed
 * in Hyderabad with confident-looking coordinates. A null keeps the drive
 * unplaced, which the UI handles, instead of drawing a pin in the wrong city.
 *
 * When the text names a city, only that city's clusters are considered, so
 * "Whitefield" resolves inside Bengaluru rather than against a same-named
 * locality elsewhere.
 */
export function matchTechCluster(text: string): MatchedClusterResult | null {
  const lower = (text || '').toLowerCase();
  if (!lower) return null;

  const namedCities = CITIES_WITH_CLUSTERS.filter(c => lower.includes(c.toLowerCase()));
  const scoped = namedCities.length > 0
    ? TECH_CLUSTERS.filter(c => namedCities.includes(c.city))
    : TECH_CLUSTERS;

  // Longest keyword first: 'rajiv gandhi infotech' must beat a bare 'infotech',
  // and 'outer ring road' must beat 'ring road'.
  const candidates = scoped
    .flatMap(cluster => cluster.keywords.map(kw => ({ cluster, kw })))
    .sort((a, b) => b.kw.length - a.kw.length);

  for (const { cluster, kw } of candidates) {
    if (lower.includes(kw)) return toMatch(cluster);
  }
  return null;
}

/**
 * @deprecated Use `matchTechCluster`. Kept for callers that still assume
 * Hyderabad, but it now delegates rather than defaulting to HITEC City, so a
 * caller that ignores the null will notice the missing coordinates.
 */
export function matchHyderabadCluster(text: string): MatchedClusterResult | null {
  return matchTechCluster(text);
}
