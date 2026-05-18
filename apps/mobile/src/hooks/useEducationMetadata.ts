import { useQuery } from '@tanstack/react-query';
import { EDUCATION_METADATA_URL } from '@/config/api';
import { 
    DIPLOMA_DEGREES, 
    UG_DEGREES, 
    PG_DEGREES, 
    DEGREE_SPECIALIZATIONS 
} from '@/utils/constants';

export interface EducationMetadata {
  educationLevels: string[];
  courses: Record<string, string[]>;
  specializations: Record<string, string[]>;
}

const localFallback: EducationMetadata = {
  educationLevels: ['DIPLOMA', 'DEGREE', 'PG'],
  courses: {
    DIPLOMA: DIPLOMA_DEGREES,
    DEGREE: UG_DEGREES,
    PG: PG_DEGREES,
  },
  specializations: DEGREE_SPECIALIZATIONS,
};

export function useEducationMetadata() {
  const { data, isLoading, error } = useQuery<EducationMetadata>({
    queryKey: ['educationMetadata'],
    queryFn: async () => {
      const response = await fetch(EDUCATION_METADATA_URL);
      if (!response.ok) throw new Error('Failed to fetch education metadata');
      return response.json();
    },
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });

  const metadata = data || localFallback;

  const getCoursesForLevel = (level: string): string[] => {
    return metadata.courses[level] || [];
  };

  const getSpecializationsForCourse = (course: string): string[] => {
    return metadata.specializations[course] || metadata.specializations['default'] || [];
  };

  return {
    educationLevels: metadata.educationLevels,
    getCoursesForLevel,
    getSpecializationsForCourse,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
