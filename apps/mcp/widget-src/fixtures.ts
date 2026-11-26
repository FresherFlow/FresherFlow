/** Real-shaped sample payloads shared by unit tests and the generated preview. */

const job = {
  id: 'opp-1', slug: 'software-engineer-intern', company: 'Amazon',
  title: 'Software Engineer Intern', locations: ['Bengaluru'],
  employmentTypes: ['INTERNSHIP'], workMode: 'HYBRID', category: 'JOB',
  recruitmentMethod: null, salaryRange: null, salaryPeriod: null,
  experienceMin: 0, experienceMax: 1, postedAt: '2026-11-20T00:00:00Z',
  expiresAt: '2026-12-20T00:00:00Z', applyLink: 'https://jobs.example.com/apply',
  requiredSkills: ['JavaScript', 'Python', 'SQL'], allowedDegrees: ['DEGREE'],
  url: 'https://fresherflow.in/jobs/software-engineer-intern',
};

export const cardsFixture = { jobs: [job, { ...job, id: 'opp-2', title: 'Data Scientist Intern', applyLink: 'https://other.example.com/apply' }], total: 9 };

export const detailFixture = {
  ...job,
  companyWebsite: 'https://amazon.example.com',
  companyLogoUrl: 'https://cdn.fresherflow.in/logos/amazon.png',
  description: 'Build and test software with an engineering team.',
  descriptionTruncated: false,
  allowedCourses: [], allowedSpecializations: [], allowedPassoutYears: [],
  driveDetails: null, governmentJobDetails: null,
};

export const companyFixture = {
  found: true,
  company: { name: 'Amazon', slug: 'amazon', url: 'https://amazon.example.com', logoUrl: 'https://cdn.fresherflow.in/logos/amazon.png' },
  pageUrl: 'https://fresherflow.in/companies/amazon',
  hasLiveJobs: true, total: 12, returned: 2, truncated: true,
  jobs: [job, { ...job, id: 'opp-3', title: 'Transportation Representative', employmentTypes: ['EMPLOYMENT'] }],
};

const submitted = {
  id: 'sub-1', title: 'Software Engineer Intern', company: 'Amazon',
  status: 'PUBLISHED', published: true,
  slug: 'software-engineer-intern', createdAt: '2026-11-20T00:00:00Z',
  applyUrl: 'https://jobs.example.com/apply', missingFields: [] as string[],
  rejectionReason: undefined as string | undefined,
};

export const submissionFixtures = {
  published: submitted,
  draft: { ...submitted, status: 'PENDING_REVIEW', published: false, slug: undefined },
  rejectedNoReason: { ...submitted, status: 'REJECTED', published: false, slug: undefined },
  merged: { ...submitted, status: 'MERGED', published: false },
  // A duplicate that belongs to someone else arrives via the public-listing
  // fallback: public fields only, no submission id.
  duplicateExistingLive: {
    status: 'PUBLISHED', published: true, slug: 'software-engineer-intern',
    title: 'Software Engineer Intern', company: 'Amazon',
  },
  errorNotFound: { message: 'Submission not found' },
  stalePublished: { ...submitted, status: 'PUBLISHED', published: false, stale: true },
};
