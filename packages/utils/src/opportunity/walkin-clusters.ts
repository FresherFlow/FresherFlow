/**
 * Curated Tech Cluster Geocoding Registry for Indian IT Hubs (Pilot: Hyderabad)
 */

export interface TechCluster {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}

export const HYDERABAD_TECH_CLUSTERS: TechCluster[] = [
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

export interface MatchedClusterResult {
  cluster: TechCluster;
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

/**
 * Matches a venue address or description to the nearest Hyderabad tech cluster
 */
export function matchHyderabadCluster(text: string): MatchedClusterResult {
  const lower = text.toLowerCase();

  for (const cluster of HYDERABAD_TECH_CLUSTERS) {
    for (const kw of cluster.keywords) {
      if (lower.includes(kw)) {
        return {
          cluster,
          latitude: cluster.latitude,
          longitude: cluster.longitude,
          mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${cluster.latitude},${cluster.longitude}`,
        };
      }
    }
  }

  // Fallback to central Hyderabad (HITEC City IT hub)
  const defaultCluster = HYDERABAD_TECH_CLUSTERS[0];
  return {
    cluster: defaultCluster,
    latitude: defaultCluster.latitude,
    longitude: defaultCluster.longitude,
    mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${defaultCluster.latitude},${defaultCluster.longitude}`,
  };
}
