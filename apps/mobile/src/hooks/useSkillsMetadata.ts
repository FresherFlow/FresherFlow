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

  return {
    skills: data || COMMON_SKILLS,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
