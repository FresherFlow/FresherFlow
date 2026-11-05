/**
 * Ready-to-fill `create_listing` payloads, exposed through the
 * `get_listing_template` tool.
 *
 * These are the API's write contract (`category`, `driveDetails`, `salaryRange`,
 * `stipend`), NOT the admin form's paste-JSON dialect (`type`, `walkInDetails`,
 * `salaryAmount`). `opportunitySchema` is a closed object, so the admin keys are
 * silently discarded: an agent that copies the admin template publishes a
 * walk-in with no drive details and a job with no salary. The verbatim admin
 * reference is kept in `apps/mcp/templates/listing-templates.md`.
 *
 * Every field here is accepted by `opportunitySchema`
 * (`apps/api/src/utils/validation.ts`); adding a key that is not in that schema
 * is a silent no-op, so change the schema first.
 */

export type ListingTemplateKind = 'JOB' | 'INTERNSHIP' | 'WALKIN';

const EMPTY_EDUCATION = {
  allowedDegrees: ['DEGREE'],
  allowedCourses: [] as string[],
  allowedSpecializations: [] as string[],
  allowedPassoutYears: [] as number[],
};

const templates: Record<ListingTemplateKind, () => Record<string, unknown>> = {
  JOB: () => ({
    category: 'job',
    title: '',
    company: '',
    companyWebsite: '',
    description: '',
    ...EMPTY_EDUCATION,
    requiredSkills: [],
    locations: [],
    workMode: 'ONSITE',
    experienceMin: 0,
    experienceMax: 0,
    salaryRange: '',
    salaryPeriod: 'YEARLY',
    employmentTypes: '',
    jobFunction: '',
    incentives: '',
    selectionProcess: '',
    notesHighlights: '',
    applyLink: '',
    customSlug: '',
    expiresAt: '',
    applicationDetails: null,
  }),

  INTERNSHIP: () => ({
    category: 'internship',
    title: '',
    company: '',
    companyWebsite: '',
    description: '',
    ...EMPTY_EDUCATION,
    requiredSkills: [],
    locations: [],
    workMode: 'HYBRID',
    experienceMin: 0,
    experienceMax: 0,
    salaryRange: '',
    stipend: '',
    salaryPeriod: 'MONTHLY',
    employmentTypes: 'Internship',
    jobFunction: '',
    incentives: '',
    selectionProcess: '',
    notesHighlights: '',
    applyLink: '',
    customSlug: '',
    expiresAt: '',
    applicationDetails: null,
  }),

  WALKIN: () => ({
    category: 'walk-in',
    title: '',
    company: '',
    companyWebsite: '',
    description: '',
    ...EMPTY_EDUCATION,
    requiredSkills: [],
    locations: [],
    experienceMin: 0,
    experienceMax: 0,
    salaryRange: '',
    stipend: '',
    salaryPeriod: 'MONTHLY',
    employmentTypes: '',
    jobFunction: '',
    incentives: '',
    selectionProcess: '',
    notesHighlights: '',
    customSlug: '',
    expiresAt: '',
    // Both `driveDetails` (the contract) and the flattened aliases the create
    // path reads are filled in; `driveDetails` wins when they disagree.
    driveDetails: {
      dateRange: '',
      timeRange: '',
      reportingTime: '',
      dates: [],
      venueAddress: '',
      venueLink: '',
      city: '',
      requiredDocuments: [],
      contactPerson: '',
      contactPhone: '',
    },
    applicationDetails: null,
  }),
};

/** A fresh, fully mutable copy of the template for one kind of listing. */
export function getListingTemplate(kind: ListingTemplateKind): Record<string, unknown> {
  return templates[kind]();
}

/** The content rules an agent needs to fill that payload properly. */
export const LISTING_TEMPLATE_RULES: Record<string, string> = {
  contractNotAdminForm:
    'Use `category` ("job", "internship", "walk-in"), `driveDetails` and `salaryRange`/`stipend`. '
    + 'The admin form\'s paste-JSON dialect uses `type`, `walkInDetails` and `salaryAmount`; '
    + 'those keys are NOT in the API schema and are silently dropped.',

  requiredFields:
    'title, company and requiredSkills are required. Any listing that is not a walk-in also needs '
    + 'applyLink (or sourceLink).',

  description:
    'At least 80–90% of all useful job information belongs in description: role overview, '
    + 'responsibilities, requirements, eligibility, experience, preferred qualifications, '
    + 'certifications and role expectations. Use \\n for new lines and "**Heading**" for section '
    + 'headings. Never use /n.',

  notesHighlights:
    'Only genuine callouts: shift timing, bond, immediate joiner, own laptop, PPO, walk-in details, '
    + 'joining deadline, mandatory relocation. Never responsibilities, requirements, skills or '
    + 'qualifications. Keep it under 25% of the description.',

  skills:
    'All technologies, tools, languages and frameworks belong in requiredSkills. Do not repeat the '
    + 'list as a "Skills Required" section in description; mention a skill there only when the JD '
    + 'calls it mandatory or central, phrased naturally.',

  incentives:
    'Only real benefits (insurance, shift allowance, cab, meals, bonus, PPO, learning/certification '
    + 'support, flexible work). Check the posting before leaving it empty; never copy culture '
    + 'statements.',

  salary:
    'Populate salaryRange/stipend only from an explicit figure. "Competitive", "as per standards", '
    + '"best in industry" and similar are not salary — leave both empty.',

  experience:
    'experienceMin/experienceMax only when stated or directly derivable. Never infer from skills, '
    + 'seniority labels or stack complexity. "Preferred" and internships do not raise the minimum.',

  locations:
    'City names only (["Noida"], ["Hyderabad"]). Add state/country only when no city is mentioned. '
    + 'Never guess a location.',

  education:
    'allowedDegrees is the level bucket only (TENTH, INTER, DIPLOMA, DEGREE, PG); allowedCourses is '
    + 'the degree (B.Tech, B.Sc); allowedSpecializations is the branch (Computer Science). '
    + 'allowedPassoutYears is exact years, e.g. [2025, 2026].',

  applicationDetails:
    'For a direct redirect to applyLink use null — not an object with empty strings. Use '
    + '{"method":"FORM","platform":"Google Forms","estimatedMinutes":15,"requiredItems":["Resume"]} '
    + 'only when a form or assessment is actually involved. method is DIRECT, FORM or ASSESSMENT.',

  dates:
    'expiresAt: YYYY-MM-DDTHH:mm or a full ISO timestamp. driveDetails.dates: ["YYYY-MM-DD"]. '
    + 'dateRange/timeRange are display text; reportingTime is HH:mm (24-hour).',

  applyLink:
    'Use the direct application URL when one exists, not the careers homepage. For email '
    + 'applications, put the address and what to send (resume only, or resume + cover letter) in '
    + 'the description.',

  company:
    'The actual hiring company from the posting. Never "One of our clients", "Confidential", a job '
    + 'board name or a staffing partner.',

  noGuessing:
    'Never infer, estimate or generate a value the posting does not state. Prefer an empty field '
    + 'over a guessed one, and report what is missing to the user.',
};

/** Every kind, in the order the tool lists them. */
export const LISTING_TEMPLATE_KINDS: ListingTemplateKind[] = ['JOB', 'INTERNSHIP', 'WALKIN'];
