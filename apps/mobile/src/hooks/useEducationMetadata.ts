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

  const metadata: EducationMetadata = { ...localFallback };
  if (data) {
      metadata.educationLevels = mergeUnique(localFallback.educationLevels, data.educationLevels);
      
      metadata.courses = { ...localFallback.courses };
      if (data.courses) {
          for (const [level, courses] of Object.entries(data.courses)) {
              metadata.courses[level] = mergeUnique(metadata.courses[level], courses);
          }
      }

      metadata.specializations = { ...localFallback.specializations };
      if (data.specializations) {
          for (const [course, specs] of Object.entries(data.specializations)) {
              const normalizedCourse = normalize(course);
              const existingKey = Object.keys(metadata.specializations).find(k => normalize(k) === normalizedCourse);
              
              if (existingKey) {
                  metadata.specializations[existingKey] = mergeUnique(metadata.specializations[existingKey], specs);
              } else {
                  metadata.specializations[course] = mergeUnique([], specs);
              }
          }
      }
  }

  const sortOptions = (options: string[]) => {
      const anyOptions: string[] = [];
      const otherOptions: string[] = [];
      const rest: string[] = [];

      options.forEach(opt => {
          const lower = opt.toLowerCase();
          if (lower.startsWith('any')) {
              anyOptions.push(opt);
          } else if (lower === 'other') {
              otherOptions.push(opt);
          } else {
              rest.push(opt);
          }
      });

      return [...anyOptions.sort(), ...rest.sort(), ...otherOptions];
  };

  for (const level of Object.keys(metadata.courses)) {
      metadata.courses[level] = sortOptions(metadata.courses[level]);
  }
  for (const course of Object.keys(metadata.specializations)) {
      metadata.specializations[course] = sortOptions(metadata.specializations[course]);
  }

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
