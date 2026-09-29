/**
 * Seeds walk-in drives covering every `DriveDetails` field, so the drive
 * surfaces can be inspected against realistic data instead of hand-crafted
 * JSON.
 *
 * The important part is coverage of the *axes* the product actually filters
 * on, not just the fields:
 *
 *  - Cities and clusters, so the map no longer looks Hyderabad-only and the
 *    per-city coordinate fallbacks are exercised.
 *  - Dates spread across today / this week / next 30 days, so every option in
 *    the When filter returns something different.
 *  - Two drives in the *same* city more than 5 km apart, so the Distance
 *    filter visibly excludes something.
 *  - One drive with all dates already past, which must disappear from the feed
 *    now that `nextDriveAt` is enforced. If it still shows, that filter is
 *    broken.
 *  - Varied `requiredDocuments`, so the per-drive checklist renders each
 *    drive's own list rather than the shared default.
 *
 * Idempotent: re-running updates the same rows by slug instead of duplicating.
 *
 * Run with the API's tsx, from apps/api:
 *   pnpm tsx scripts/seedWalkins.ts
 * Pass --purge to delete these seeds first.
 */
import prisma from '../src/infrastructure/database/prisma';
import { OpportunityStatus, RecruitmentMethod, EmploymentType } from '@fresherflow/types';

const SEED_PREFIX = 'seed-walkin-';

function atLocalHour(daysFromNow: number, hour: number, minute = 0): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d;
}

/** Inclusive range of days from today, as `Date[]` at 10:00 local. */
function dayRange(fromOffset: number, toOffset: number): Date[] {
    const out: Date[] = [];
    for (let i = fromOffset; i <= toOffset; i++) out.push(atLocalHour(i, 10));
    return out;
}

type Seed = {
    slugKey: string;
    title: string;
    company: string;
    companyWebsite: string;
    role: string;
    city: string;
    clusterName: string;
    latitude: number;
    longitude: number;
    venueAddress: string;
    landmark?: string;
    transitInfo?: string;
    dates: Date[];
    dateRange: string;
    timeRange: string;
    reportingTime: string;
    requiredDocuments: string[];
    contactPerson?: string;
    contactPhone?: string;
    selectionProcess?: string;
    salaryRange?: string;
    skills: string[];
};

const SEEDS: Seed[] = [
    {
        // Today, central Bengaluru. Inside a tight radius.
        slugKey: 'blr-whitefield-analyst-today',
        title: 'Walk-in Drive - Data Analyst (Fresher)',
        company: 'Northwind Analytics',
        companyWebsite: 'https://northwind.example.com',
        role: 'Data Analyst',
        city: 'Bengaluru',
        clusterName: 'Whitefield',
        latitude: 12.9698,
        longitude: 77.7499,
        venueAddress: 'Prestige Tech Park, Outer Ring Road, Whitefield, Bengaluru 560066',
        landmark: 'Near Forum Value Mall',
        transitInfo: '5 min walk from Whitefield (Metro) station',
        // Today and tomorrow. Spans two days on purpose: if the seed runs after
        // 10:00 local, a today-only drive has already had its moment and would
        // be correctly hidden by `nextDriveAt`, leaving nothing to inspect
        // under the "Today" filter.
        dates: dayRange(0, 1),
        dateRange: '2-day drive, starting today',
        timeRange: '9:30 AM - 12:30 PM',
        reportingTime: '9:30 AM',
        requiredDocuments: [
            'Updated Resume (2 hard copies)',
            'Govt. Photo ID Proof (Aadhaar / PAN)',
            'Degree Certificate or Provisional Certificate',
        ],
        contactPerson: 'TA Desk',
        contactPhone: '+91 80 4000 1000',
        selectionProcess: 'Written Aptitude Test > Group Discussion > Face-to-Face Interview',
        salaryRange: '4-6 LPA',
        skills: ['SQL', 'Excel', 'Power BI'],
    },
    {
        // Same city, far away. Excluded by a 10 km radius.
        slugKey: 'blr-hebbal-support-far',
        title: 'Walk-in Drive - Support Associate (Fresher)',
        company: 'Kalyan Infotech',
        companyWebsite: 'https://kalyan.example.com',
        role: 'Support Associate',
        city: 'Bengaluru',
        clusterName: 'Hebbal',
        latitude: 13.0358,
        longitude: 77.597,
        venueAddress: 'Manyata Tech Park, Hebbal, Bengaluru 560045',
        landmark: 'Opposite Godrej Air',
        transitInfo: '10 min walk from Yeshwanthpur (Metro) station',
        dates: dayRange(0, 1),
        dateRange: '2-day drive',
        timeRange: '10:00 AM - 1:00 PM',
        reportingTime: '10:00 AM',
        requiredDocuments: [
            'Updated Resume (2 hard copies)',
            'Class 10 Marksheet (DOB proof)',
        ],
        contactPerson: 'Recruitment Team',
        selectionProcess: 'Direct In-person Interview',
        salaryRange: '2.8-3.6 LPA',
        skills: ['Customer Support', 'MS Office'],
    },
    {
        // Pune, this week.
        slugKey: 'pune-hinjewadi-fresher-dev',
        title: 'Walk-in Drive - Software Engineer (Fresher)',
        company: 'Sahyadri Software',
        companyWebsite: 'https://sahyadri.example.com',
        role: 'Software Engineer',
        city: 'Pune',
        clusterName: 'Hinjewadi',
        latitude: 18.5913,
        longitude: 73.7389,
        venueAddress: 'Rajiv Gandhi Infotech Park, Hinjewadi Phase 2, Pune 411057',
        landmark: 'Near DLF IT Park',
        transitInfo: '8 min walk from Hinjewadi Phase 2 (Metro) station',
        dates: dayRange(2, 4),
        dateRange: '3-day drive',
        timeRange: '9:00 AM - 12:00 PM',
        reportingTime: '9:00 AM',
        requiredDocuments: [
            'Updated Resume (3 hard copies)',
            'Govt. Photo ID Proof',
            '10th, 12th & Degree Marksheets',
            '3 Passport Size Photographs',
        ],
        contactPerson: 'Campus Team',
        contactPhone: '+91 20 6700 2000',
        selectionProcess: 'Coding Test > Technical Interview > HR Interview',
        salaryRange: '5.5-8 LPA',
        skills: ['Java', 'DSA', 'SQL'],
    },
    {
        // Chennai, next 30 days only.
        slugKey: 'chn-omr-fresher-bpo',
        title: 'Walk-in Drive - International Voice Process',
        company: 'Saravathi Global Services',
        companyWebsite: 'https://saravathi.example.com',
        role: 'International Voice Process',
        city: 'Chennai',
        clusterName: 'OMR',
        latitude: 12.8008,
        longitude: 80.2268,
        venueAddress: 'DLF IT Park, Rajiv Gandhi Salai, Sholinganallur, Chennai 600119',
        landmark: 'Near Chennai One Mall',
        transitInfo: '3 min walk from Sholinganallur (Metro) station',
        dates: dayRange(18, 22),
        dateRange: '5-day drive later this month',
        timeRange: '11:00 AM - 3:00 PM',
        reportingTime: '11:00 AM',
        requiredDocuments: [
            'Updated Resume (2 hard copies)',
            'Aadhaar Card (original + photocopy)',
        ],
        contactPerson: 'Walk-in Coordinator',
        salaryRange: '2.4-3.2 LPA',
        skills: ['Communication', 'BPO'],
    },
    {
        // Hyderabad, exercises the pre-existing Hyderabad cluster table.
        slugKey: 'hyd-gachibowli-fresher-qa',
        title: 'Walk-in Drive - QA Engineer (Fresher)',
        company: 'Deccan Cloudworks',
        companyWebsite: 'https://deccancloud.example.com',
        role: 'QA Engineer',
        city: 'Hyderabad',
        clusterName: 'Gachibowli',
        latitude: 17.4401,
        longitude: 78.3489,
        venueAddress: 'Wipro Circle, Financial District, Nanakramguda, Hyderabad 500032',
        landmark: 'Opposite Botanical Garden metro station',
        transitInfo: '2 min walk from Nanakramguda (Metro) station',
        dates: dayRange(1, 3),
        dateRange: '3-day drive',
        timeRange: '9:00 AM - 1:00 PM',
        reportingTime: '9:00 AM',
        requiredDocuments: [
            'Updated Resume (2 hard copies)',
            'Govt. Photo ID Proof (Aadhaar / PAN)',
            'Provisional Degree Certificate',
            '2 Passport Size Photos',
        ],
        contactPerson: 'Talent Acquisition',
        contactPhone: '+91 40 4000 5000',
        selectionProcess: 'Aptitude Test > Lab Assessment > HR Interview',
        salaryRange: '4-5.5 LPA',
        skills: ['Manual Testing', 'Selenium', 'SQL'],
    },
    {
        // No dates left. Must NOT appear in the feed.
        slugKey: 'mum-powai-expired-walkin',
        title: 'Walk-in Drive - Business Analyst (expired)',
        company: 'Konkan Consulting',
        companyWebsite: 'https://konkan.example.com',
        role: 'Business Analyst',
        city: 'Mumbai',
        clusterName: 'Powai',
        latitude: 19.1176,
        longitude: 72.906,
        venueAddress: 'Hiranandani Business Park, Powai, Mumbai 400076',
        landmark: 'Near Hiranandani Gardens',
        transitInfo: '12 min walk from IIT Bombay (Metro) station',
        // 10 days in the past: exercises the "hide a walk-in whose dates have
        // all passed" rule. If this shows on /drives/walk-in, that is a bug.
        dates: dayRange(-10, -8),
        dateRange: 'Earlier this month',
        timeRange: '10:00 AM - 1:00 PM',
        reportingTime: '10:00 AM',
        requiredDocuments: ['Updated Resume (2 hard copies)'],
        salaryRange: '6-8 LPA',
        skills: ['SQL', 'Tableau'],
    },
];

function buildOpportunity(s: Seed, now: Date) {
    const slug = `${SEED_PREFIX}${s.slugKey}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const upcoming = s.dates.filter((d) => d.getTime() >= now.getTime()).sort((a, b) => a.getTime() - b.getTime());
    return {
        slug,
        title: s.title,
        company: s.company,
        companyWebsite: s.companyWebsite,
        description:
            `${s.company} is conducting an on-campus walk-in drive for ${s.role} roles. ` +
            `Report by ${s.reportingTime} on the drive dates with the documents listed below. ` +
            `This is seeded local data used to inspect the drive surfaces.`,
        locations: [s.city],
        workMode: 'ONSITE' as const,
        salaryRange: s.salaryRange ?? null,
        salaryPeriod: 'YEARLY' as const,
        employmentTypes: [EmploymentType.FULL_TIME],
        jobFunction: 'Operations',
        requiredSkills: s.skills,
        tags: ['walk-in', s.city.toLowerCase()],
        experienceMin: 0,
        experienceMax: 1,
        allowedDegrees: [],
        allowedCourses: [],
        allowedSpecializations: [],
        allowedPassoutYears: [],
        applyLink: s.companyWebsite,
        status: OpportunityStatus.PUBLISHED,
        recruitmentMethod: RecruitmentMethod.WALK_IN,
        postedAt: now,
        publishedAt: now,
        updatedAt: now,
        // A live listing must not itself be expired; the past-dated drive is
        // hidden by `nextDriveAt`, not by `expiresAt`, so both paths are
        // exercised independently.
        expiresAt: new Date(now.getTime() + 45 * 86_400_000),
        expiredAt: null,
        deletedAt: null,
        // Denormalised discovery columns, mirroring what the API writes.
        nextDriveAt: upcoming[0] ?? null,
        driveCity: s.city,
    };
}

function buildDriveDetails(s: Seed) {
    const now = new Date();
    const upcoming = s.dates.filter((d) => d.getTime() >= now.getTime()).sort((a, b) => a.getTime() - b.getTime());
    const last = s.dates[s.dates.length - 1];
    return {
        dates: s.dates,
        dateRange: s.dateRange,
        timeRange: s.timeRange,
        venueAddress: s.venueAddress,
        venueLink: `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`,
        latitude: s.latitude,
        longitude: s.longitude,
        clusterName: s.clusterName,
        city: s.city,
        reportingTime: s.reportingTime,
        requiredDocuments: s.requiredDocuments,
        contactPerson: s.contactPerson ?? null,
        contactPhone: s.contactPhone ?? null,
        expiryDate: last,
        landmark: s.landmark ?? null,
        transitInfo: s.transitInfo ?? null,
        selectionProcess: s.selectionProcess ?? null,
    };
}

async function purge() {
    const { count } = await prisma.opportunity.deleteMany({
        where: { slug: { startsWith: SEED_PREFIX } },
    });
    console.log(`purged ${count} seeded walk-in(s)`);
}

async function main() {
    const now = new Date();
    if (process.argv.includes('--purge')) {
        await purge();
        return;
    }

    for (const s of SEEDS) {
        const data = buildOpportunity(s, now);
        const driveDetails = buildDriveDetails(s);
        const slug = data.slug;

        // DriveDetails is 1:1 on opportunityId, so upsert the opportunity by
        // slug and then upsert the relation against its id.
        const opp = await prisma.opportunity.upsert({
            where: { slug },
            create: data,
            update: data,
        });

        await prisma.driveDetails.upsert({
            where: { opportunityId: opp.id },
            create: { ...driveDetails, opportunityId: opp.id },
            update: driveDetails,
        });

        console.log(
            `seeded ${opp.company} — ${s.role} — ${s.city}/${s.clusterName} — ` +
            `nextDriveAt=${data.nextDriveAt ? data.nextDriveAt.toISOString() : 'none (past)'}`
        );
    }

    const total = await prisma.opportunity.count({ where: { slug: { startsWith: SEED_PREFIX } } });
    console.log(`\ndone. ${total} seeded walk-in(s). Prefix: ${SEED_PREFIX}`);
    console.log('To view locally set FEED_SOURCE=db in apps/web/.env.local, then start the API and web.');
}

main()
    .catch((err) => {
        console.error('seed failed:', err instanceof Error ? err.message : err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        // The `pg` pool keeps a `min` connection count warm, so the event loop
        // stays alive after a successful seed and the script never returns.
        process.exit(process.exitCode ?? 0);
    });
