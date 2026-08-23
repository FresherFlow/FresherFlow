export const CORE_SEARCH_KEYWORDS = [
  // 1. Core Engineering & Graduate Trainee
  'Software Engineer Fresher',
  'Software Developer Intern',
  'Associate Software Engineer',
  'Graduate Engineer Trainee',
  'Graduate Trainee Engineer',
  'Junior Software Engineer',
  'Entry Level Software Engineer',

  // 2. Full Stack, Frontend & Backend
  'Full Stack Developer Fresher',
  'Frontend Developer Intern',
  'Backend Developer Intern',
  'React Developer Fresher',
  'Node.js Developer Intern',
  'Web Development Intern',

  // 3. Languages & Mobile
  'Python Developer Fresher',
  'Java Developer Fresher',
  'C++ Developer Fresher',
  'Android Developer Intern',
  'Flutter Developer Intern',
  'iOS Developer Intern',

  // 4. Data, AI/ML & Analytics
  'Data Analyst Fresher',
  'Data Engineer Intern',
  'AI / ML Intern',
  'Machine Learning Engineer Fresher',
  'Generative AI Intern',

  // 5. Cloud, DevOps, QA & Security
  'QA / Automation Intern',
  'Software Test Engineer Fresher',
  'DevOps Engineer Fresher',
  'Cloud Engineer Intern',
  'Cyber Security Intern',

  // 6. Walk-in Drives Across Tech Hubs
  'Walkin Fresher',
  'Walk in Interview',
  'Walkin Drive',
  'Graduate Engineer Trainee Walkin',
  'Walkin Hyderabad',
  'Walkin Bangalore',
  'Walkin Pune',
  'Walkin Chennai',
];

export async function loadRolesFromCdn(): Promise<string[]> {
  try {
    const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || 'https://cdn.fresherflow.in').trim().replace(/\/$/, '');
    const res = await fetch(`${CDN_URL}/api/meta/roles.json`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const roles: string[] = await res.json();
      if (Array.isArray(roles) && roles.length > 0) {
        return roles.slice(0, 30);
      }
    }
  } catch {
    // Fallback
  }
  return CORE_SEARCH_KEYWORDS;
}
