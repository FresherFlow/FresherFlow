/**
 * Job type classifications with multilingual aliases.
 * Mirrors the Python JobType enum values for compatibility.
 */
export enum JobType {
  FULL_TIME = 'fulltime',
  PART_TIME = 'parttime',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERNSHIP = 'internship',
  PER_DIEM = 'perdiem',
  NIGHTS = 'nights',
  OTHER = 'other',
  SUMMER = 'summer',
  VOLUNTEER = 'volunteer',
}

/**
 * Extended aliases for multilingual job type matching.
 * Used by `getJobTypeFromString()` to resolve localized job type labels.
 */
export const JOB_TYPE_ALIASES: Record<JobType, string[]> = {
  [JobType.FULL_TIME]: [
    'fulltime', 'períodointegral', 'estágio/trainee', 'cunormăîntreagă',
    'tiempocompleto', 'vollzeit', 'voltijds', 'tempointegral', '全职',
    'plnýúvazek', 'fuldtid', 'دوامكامل', 'kokopäivätyö', 'tempsplein',
    'πλήρηςαπασχόληση', 'teljesmunkaidő', 'tempopieno', 'heltid',
    'jornadacompleta', 'pełnyetat', '정규직', '100%', '全職', 'งานประจำ',
    'tamzamanlı', 'повназайнятість', 'toànthờigian',
  ],
  [JobType.PART_TIME]: ['parttime', 'teilzeit', 'částečnýúvazek', 'deltid'],
  [JobType.CONTRACT]: ['contract', 'contractor'],
  [JobType.TEMPORARY]: ['temporary'],
  [JobType.INTERNSHIP]: [
    'internship', 'prácticas', 'ojt(onthejobtraining)', 'praktikum', 'praktik',
  ],
  [JobType.PER_DIEM]: ['perdiem'],
  [JobType.NIGHTS]: ['nights'],
  [JobType.OTHER]: ['other'],
  [JobType.SUMMER]: ['summer'],
  [JobType.VOLUNTEER]: ['volunteer'],
};

/**
 * Resolve a raw string to a JobType enum value.
 */
export function getJobTypeFromString(value: string): JobType | null {
  const normalized = value.toLowerCase().replace(/[\s-]/g, '');
  for (const [jobType, aliases] of Object.entries(JOB_TYPE_ALIASES)) {
    if (aliases.includes(normalized)) {
      return jobType as JobType;
    }
  }
  return null;
}
