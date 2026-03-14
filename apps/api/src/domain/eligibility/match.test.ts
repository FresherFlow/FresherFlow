import { checkEligibility, sortOpportunitiesWithWalkinsFirst, rankOpportunitiesForUser } from './match';
import { Opportunity, Profile, OpportunityType, OpportunityStatus, EducationLevel, WorkMode, Availability, LinkHealth } from '@fresherflow/types';

describe('Eligibility Matching Engine', () => {
    const mockProfile: Profile = {
        id: 'profile-1',
        userId: 'user-1',
        interestedIn: [OpportunityType.JOB],
        preferredCities: ['Bangalore'],
        workModes: [WorkMode.REMOTE],
        availability: Availability.IMMEDIATE,
        skills: ['React', 'Node.js'],
        gradYear: 2024,
        gradCourse: 'B.Tech',
        gradSpecialization: 'Computer Science',
        pgCourse: null,
        pgSpecialization: null,
        pgYear: null,
        tenthYear: 2020,
        twelfthYear: 2022,
        educationLevel: EducationLevel.DEGREE,
        completionPercentage: 100,
    };

    const mockOpp: Opportunity = {
        id: 'opp-1',
        title: 'Software Engineer',
        company: 'Tech Corp',
        description: 'Great job',
        type: OpportunityType.JOB,
        locations: ['Bangalore'],
        requiredSkills: ['React'],
        allowedDegrees: [EducationLevel.DEGREE],
        allowedCourses: [],
        allowedPassoutYears: [2024],
        postedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        status: OpportunityStatus.PUBLISHED,
        workMode: WorkMode.REMOTE,
        adminId: 'admin-1',
        slug: 'software-engineer',
        linkHealth: LinkHealth.HEALTHY,
        verificationFailures: 0,
        lastVerifiedAt: new Date(),
    };

    test('should match eligible user', () => {
        const result = checkEligibility(mockOpp, mockProfile);
        expect(result.eligible).toBe(true);
    });

    test('should fail if degree does not match', () => {
        const result = checkEligibility(
            { ...mockOpp, allowedDegrees: [EducationLevel.PG] },
            mockProfile
        );
        expect(result.eligible).toBe(false);
        expect(result.failedRules).toContain('DEGREE_MATCH');
    });

    test('should fail if passout year does not match', () => {
        const result = checkEligibility(
            { ...mockOpp, allowedPassoutYears: [2023] },
            mockProfile
        );
        expect(result.eligible).toBe(false);
        expect(result.failedRules).toContain('PASSOUT_YEAR_MATCH');
    });

    test('should not fail eligibility if skills do not overlap', () => {
        const result = checkEligibility(
            { ...mockOpp, requiredSkills: ['Python'] },
            mockProfile
        );
        expect(result.eligible).toBe(true);
        expect(result.failedRules).not.toContain('SKILLS_MATCH');
        expect(result.warnings?.some((warning) => warning.includes('skills'))).toBe(true);
    });

    test('should provide warnings for soft rules like location', () => {
        const result = checkEligibility(
            { ...mockOpp, locations: ['Pune'] },
            mockProfile
        );
        expect(result.eligible).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings?.[0]).toContain('Pune');
    });

    test('should match PG course even if UG course is different', () => {
        const pgProfile: Profile = {
            ...mockProfile,
            educationLevel: EducationLevel.PG,
            gradCourse: 'BSc',
            pgCourse: 'MCA',
            pgYear: 2025,
        };

        const result = checkEligibility(
            {
                ...mockOpp,
                allowedDegrees: [],
                allowedCourses: ['MCA'],
                allowedPassoutYears: [2025],
            },
            pgProfile
        );

        expect(result.eligible).toBe(true);
    });
});

describe('Sorting Logic', () => {
    const opps = [
        { id: '1', type: 'FULL_TIME', postedAt: '2024-01-01' },
        { id: '2', type: 'WALKIN', postedAt: '2024-01-02' },
        { id: '3', type: 'FULL_TIME', postedAt: '2024-01-03' },
    ];
 
    test('should sort walk-ins first, then by date', () => {
        const sorted = sortOpportunitiesWithWalkinsFirst(opps);
        expect(sorted[0].id).toBe('2'); // Walk-in
        expect(sorted[1].id).toBe('3'); // Newest Full-time
        expect(sorted[2].id).toBe('1'); // Oldest Full-time
    });
});

describe('Relevance Ranking v2', () => {
    const profile: Profile = {
        id: 'profile-rank',
        userId: 'user-rank',
        completionPercentage: 100,
        educationLevel: EducationLevel.DEGREE,
        tenthYear: 2020,
        twelfthYear: 2022,
        gradCourse: 'B.Tech',
        gradSpecialization: 'Computer Science',
        gradYear: 2024,
        pgCourse: null,
        pgSpecialization: null,
        pgYear: null,
        interestedIn: [OpportunityType.JOB, OpportunityType.INTERNSHIP],
        preferredCities: ['Bangalore', 'Hyderabad'],
        workModes: [WorkMode.REMOTE, WorkMode.HYBRID],
        availability: Availability.IMMEDIATE,
        skills: ['React', 'TypeScript', 'SQL']
    };

    const now = Date.now();

    const highFit: Opportunity = {
        id: 'high-fit',
        slug: 'high-fit',
        type: OpportunityType.JOB,
        status: OpportunityStatus.PUBLISHED,
        title: 'Frontend Engineer',
        company: 'Acme',
        description: 'Build frontend',
        allowedDegrees: [EducationLevel.DEGREE],
        allowedCourses: ['B.Tech'],
        allowedPassoutYears: [2024],
        requiredSkills: ['React', 'TypeScript'],
        locations: ['Bangalore'],
        workMode: WorkMode.REMOTE,
        experienceMin: 0,
        experienceMax: 1,
        linkHealth: LinkHealth.HEALTHY,
        verificationFailures: 0,
        lastVerifiedAt: new Date(now - 30 * 60 * 1000),
        postedAt: new Date(now - 2 * 60 * 60 * 1000),
        expiresAt: new Date(now + 2 * 24 * 60 * 60 * 1000),
        adminId: 'admin-1'
    };

    const lowFit: Opportunity = {
        id: 'low-fit',
        slug: 'low-fit',
        type: OpportunityType.JOB,
        status: OpportunityStatus.PUBLISHED,
        title: 'Senior Backend Engineer',
        company: 'Acme',
        description: 'Build backend',
        allowedDegrees: [EducationLevel.PG],
        allowedCourses: ['MBA'],
        allowedPassoutYears: [2020],
        requiredSkills: ['Go', 'Kubernetes'],
        locations: ['Delhi'],
        workMode: WorkMode.ONSITE,
        experienceMin: 3,
        experienceMax: 6,
        linkHealth: LinkHealth.HEALTHY,
        verificationFailures: 0,
        lastVerifiedAt: new Date(now - 30 * 60 * 1000),
        postedAt: new Date(now - 20 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(now + 20 * 24 * 60 * 60 * 1000),
        adminId: 'admin-1'
    };

    test('should rank high-fit opportunity above low-fit opportunity', () => {
        const ranked = rankOpportunitiesForUser([lowFit, highFit], profile);
        expect(ranked[0].opportunity.id).toBe('high-fit');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    test('should expose explainable score breakdown for each ranked opportunity', () => {
        const ranked = rankOpportunitiesForUser([highFit], profile);
        expect(ranked[0].breakdown).toBeDefined();
        expect(ranked[0].breakdown.skills).toBeGreaterThan(0);
        expect(ranked[0].breakdown.location).toBeGreaterThan(0);
        expect(ranked[0].breakdown.experience).toBeGreaterThan(0);
    });
});
