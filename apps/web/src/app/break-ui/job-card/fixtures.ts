import {
    EducationLevel,
    EmploymentType,
    GovernmentApplicationStatus,
    LinkHealth,
    OpportunityCategory,
    OpportunitySourceKind,
    OpportunityStatus,
    RecruitmentMethod,
    Sector,
    WorkMode,
} from '@fresherflow/types';
import type { GovernmentJobDetails, Opportunity } from '@fresherflow/types';

/**
 * Fixtures for the `break-ui` job-card harness at `/break-ui/job-card`.
 *
 * Every worst-case value here is one a real listing can carry: either the
 * longest value the write path accepts, or a shape a scraper produces from a
 * real page. Nothing is random filler.
 */

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function makeJob(over: Partial<Opportunity> & { id: string }): Opportunity {
    return {
        slug: over.id,
        category: OpportunityCategory.EMPLOYMENT,
        employmentTypes: [EmploymentType.FULL_TIME],
        sector: Sector.PRIVATE,
        sourceKind: OpportunitySourceKind.SCRAPED,
        status: OpportunityStatus.PUBLISHED,
        title: 'Software Engineer',
        company: 'Acme',
        description: '',
        allowedDegrees: [EducationLevel.DEGREE],
        allowedCourses: [],
        allowedPassoutYears: [],
        requiredSkills: [],
        locations: ['Bengaluru, Karnataka, India'],
        workMode: WorkMode.ONSITE,
        linkHealth: LinkHealth.HEALTHY,
        verificationFailures: 0,
        lastVerifiedAt: new Date(NOW).toISOString(),
        postedAt: new Date(NOW - 2 * DAY).toISOString(),
        sharesCount: 0,
        savesCount: 0,
        clicksCount: 0,
        commentsCount: 0,
        trendingScore: 0,
        postedByUserId: 'break-ui-fixture',
        adminId: 'break-ui-fixture',
        ...over,
    };
}

/** Kind data: short names, one line title, every optional field filled. */
export const DEMO_JOBS: Opportunity[] = [
    makeJob({
        id: 'demo-1',
        title: 'Frontend Developer',
        company: 'Zoho',
        companyWebsite: 'https://www.zoho.com',
        locations: ['Chennai, Tamil Nadu, India'],
        workMode: WorkMode.HYBRID,
        salaryRange: '₹4.5 – 6 LPA',
        requiredSkills: ['React', 'TypeScript', 'CSS'],
        allowedDegrees: [EducationLevel.DEGREE],
        allowedCourses: ['B.Tech/B.E'],
        allowedPassoutYears: [2025, 2026],
    }),
    makeJob({
        id: 'demo-2',
        title: 'Graduate Trainee Engineer',
        company: 'Tata Consultancy Services',
        companyWebsite: 'https://www.tcs.com',
        locations: ['Pune, Maharashtra, India'],
        salaryRange: '₹3.36 LPA',
        requiredSkills: ['Java', 'SQL'],
        applyLink: 'https://www.tcs.com/careers',
    }),
    makeJob({
        id: 'demo-3',
        title: 'Data Analyst Intern',
        company: 'Freshworks',
        companyWebsite: 'https://www.freshworks.com',
        employmentTypes: [EmploymentType.INTERNSHIP],
        locations: ['Chennai, Tamil Nadu, India'],
        workMode: WorkMode.REMOTE,
        stipend: '₹25,000 / month',
        requiredSkills: ['Python', 'SQL', 'Excel'],
    }),
];

/**
 * Worst case. Row order matters: the first cards are what is on screen, so the
 * different failures are spread across rows 1–7 rather than stacked in one.
 */
export const WORST_JOBS: Opportunity[] = [
    // 1 — longest title the contribute form accepts, a long German company with
    //     no resolvable logo, a long salary string, and more skills than fit.
    makeJob({
        id: 'worst-long-title',
        title:
            'Senior Product Design Engineer, Platform Infrastructure — Bengaluru / Hyderabad / Remote (India) — Immediate Joining, 2026 Batch',
        company: 'Nordwind Industries Holdings Deutschland GmbH',
        companyWebsite: undefined,
        locations: ['Bengaluru, Karnataka, India', 'Hyderabad, Telangana, India', 'Remote'],
        workMode: WorkMode.HYBRID,
        salaryRange: '₹12,50,000 – ₹18,75,000 per annum + ESOPs + relocation allowance',
        requiredSkills: [
            'TypeScript',
            'React',
            'Next.js',
            'GraphQL',
            'PostgreSQL',
            'Docker',
            'Kubernetes',
            'AWS',
            'Terraform',
            'site-reliability-engineering-and-observability-platforms',
            'Design Systems',
            'Accessibility',
            'Performance',
            'Node.js',
        ],
        allowedDegrees: [EducationLevel.DEGREE, EducationLevel.PG],
        allowedCourses: [
            'B.Tech/B.E',
            'M.Tech/M.E',
            'B.Sc Computer Science',
            'MCA',
            'B.Des Interaction Design',
            'M.Des',
        ],
        allowedPassoutYears: [2024, 2025, 2026, 2027],
        postedAt: new Date(NOW - 412 * DAY).toISOString(),
    }),

    // 2 — emoji-first company (initials come from `w[0]`, which is half a
    //     surrogate pair), one-letter title, no logo, no salary, no mode.
    makeJob({
        id: 'worst-emoji',
        title: 'J',
        company: '👩🏽‍💻 Priya Labs',
        companyLogoUrl: 'https://logo.clearbit.com/this-domain-does-not-exist.example.com',
        locations: [],
        workMode: undefined,
        allowedDegrees: [],
        allowedCourses: [],
        requiredSkills: ['Go'],
        applyLink: undefined,
    }),

    // 3 — RTL company, Vietnamese diacritics in the title, and a 31-character
    //     unbreakable German compound as another company.
    makeJob({
        id: 'worst-rtl',
        title: 'Đặng Thị Ngọc Hân — Kỹ sư phần mềm nhúng, làm việc tại Hà Nội',
        company: 'نور الهدى عبد الرحمن',
        locations: ['Thiruvananthapuram, Kerala, India'],
        salaryRange: 'Thoả thuận',
    }),
    makeJob({
        id: 'worst-compound',
        title: 'Benachrichtigungseinstellungen',
        company: 'Benachrichtigungseinstellungen',
        requiredSkills: ['Benachrichtigungseinstellungen'],
        locations: ['Bengaluru, Karnataka, India'],
    }),

    // 4 — government listing. `governmentJobDetails` carries `vacancyCount`
    //     in the type, but the meta strip reads `totalVacancies`.
    makeJob({
        id: 'worst-govt',
        title: 'Assistant Section Officer (Group B Non-Gazetted), Ministry of Home Affairs',
        company: 'Staff Selection Commission (SSC)',
        sector: Sector.GOVERNMENT,
        employmentTypes: [EmploymentType.FULL_TIME],
        locations: ['New Delhi, Delhi, India', 'Mumbai, Maharashtra, India'],
        allowedDegrees: [EducationLevel.DEGREE],
        governmentJobDetails: {
            vacancyCount: 1284000,
            // `totalVacancies` is not on `GovernmentJobDetails` — the meta strip
            // reads it anyway, which is the drift this fixture exposes.
            ...({ totalVacancies: 1284000 } as Partial<GovernmentJobDetails>),
            payScale: 'Level 7 (₹44,900 – ₹1,42,400) plus DA, HRA and transport allowance',
            applicationStatus: GovernmentApplicationStatus.CLOSED,
            jobCategory: ['SSC'],
        },
    }),

    // 5 — walk-in with a long date range, a full postal venue, and a distance
    //     far past the point where "1,284 km" stops being useful.
    makeJob({
        id: 'worst-walkin',
        title: 'Walk-in Drive — Customer Support Associate (Voice & Non-Voice)',
        company: 'Concentrix',
        recruitmentMethod: RecruitmentMethod.WALK_IN,
        locations: ['Chennai, Tamil Nadu, India'],
        ...({ distanceKm: 1284 } as Partial<Opportunity>),
        driveDetails: {
            dates: [],
            dateRange: '12 November 2026 – 26 November 2026, 9:30 AM – 6:00 PM IST (Monday to Saturday)',
            timeRange: '9:30 AM – 6:00 PM',
            venueAddress:
                'Concentrix Campus, Block C, 4th Floor, DLF IT Park, 1/124 Shivaji Gardens, Mount Poonamallee Road, Manapakkam, Chennai 600089',
            venueLink: 'https://maps.google.com/?q=13.0234,80.1567',
            latitude: 13.0234,
            longitude: 80.1567,
            reportingTime: '9:30 AM',
            requiredDocuments: ['Resume', 'Aadhaar'],
        },
    }),

    // 6 — markup and a newline in a single-line field, plus a missing title.
    makeJob({
        id: 'worst-escaping',
        title: '<script>alert(1)</script> & **bold** Line one\nLine two',
        company: '&amp; Sons <b>LLP</b>',
        description: '',
    }),
    makeJob({
        id: 'worst-missing-title',
        title: '   ',
        company: '',
        locations: [],
        requiredSkills: [],
        allowedDegrees: [],
        allowedCourses: [],
        postedAt: 'not-a-date',
        expiresAt: new Date(NOW - 30 * DAY).toISOString(),
    }),
];
