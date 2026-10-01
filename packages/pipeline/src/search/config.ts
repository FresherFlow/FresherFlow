import { fetchJsonWithRetry } from '../utils/resilient-json.js';
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
  const CDN_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL || 'https://cdn.fresherflow.in').trim().replace(/\/$/, '');
  // Keyword list is an optimisation — the hardcoded CORE_SEARCH_KEYWORDS below is
  // a complete fallback, so an unavailable roles.json must never abort the sweep.
  const res = await fetchJsonWithRetry<string[]>(`${CDN_URL}/api/meta/roles.json`, {
    label: 'roles.json',
    attempts: 2,
    timeoutMs: 8000,
    validate: (data) => Array.isArray(data),
  });
  if (res.ok && res.data.length > 0) {
    return res.data.slice(0, 30);
  }
  if (!res.ok) {
    console.warn(`[Roles] roles.json unavailable (${res.reason}); using built-in keyword list.`);
  }
  return CORE_SEARCH_KEYWORDS;
}
