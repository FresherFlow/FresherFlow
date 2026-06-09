import { useQuery } from '@tanstack/react-query';
import { CITIES_METADATA_URL } from '@/config/api';

export type CitiesData = Record<string, string[]>;

const localFallback: CitiesData = {
  "Karnataka": ["Bangalore", "Mysore", "Mangalore", "Hubli", "Belgaum"],
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

export function useCitiesMetadata() {
  const { data, isLoading, error } = useQuery<CitiesData>({
    queryKey: ['citiesMetadata'],
    queryFn: async () => {
      const response = await fetch(CITIES_METADATA_URL);
      if (!response.ok) throw new Error('Failed to fetch cities metadata');
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\./g, '');

  const mergeUnique = (local: string[] = [], remote: string[] = []) => {
      const seen = new Set(local.map(normalize));
      const merged = [...local];
      for (const item of remote) {
          const normalized = normalize(item);
          if (!seen.has(normalized)) {
              seen.add(normalized);
              merged.push(item.trim());
          }
      }
      return merged;
  };

  const citiesData: CitiesData = { ...localFallback };
  if (data) {
      for (const [state, cityList] of Object.entries(data)) {
          citiesData[state] = mergeUnique(citiesData[state], cityList);
      }
  }

  // Flatten the cities and sort them alphabetically for forms
  const cities = Object.values(citiesData).flat().sort();

  // Helper function to resolve the State name for a given City
  const getStateForCity = (city: string): string | null => {
    for (const [state, list] of Object.entries(citiesData)) {
      if (list.includes(city)) return state;
    }
    return null;
  };

  return {
    citiesData,
    cities,
    getStateForCity,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
