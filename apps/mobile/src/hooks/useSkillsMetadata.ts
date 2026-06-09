import { useQuery } from '@tanstack/react-query';
import { SKILLS_METADATA_URL } from '@/config/api';
import { COMMON_SKILLS } from '@/utils/constants';

export function useSkillsMetadata() {
  const { data, isLoading, error } = useQuery<string[]>({
    queryKey: ['skillsMetadata'],
    queryFn: async () => {
      const response = await fetch(SKILLS_METADATA_URL);
      if (!response.ok) throw new Error('Failed to fetch skills metadata');
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

  return {
    skills: data ? mergeUnique(COMMON_SKILLS, data) : COMMON_SKILLS,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
