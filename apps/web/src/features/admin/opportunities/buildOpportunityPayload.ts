type OpportunityType = 'JOB' | 'INTERNSHIP' | 'WALKIN';
type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
type SalaryPeriod = 'YEARLY' | 'MONTHLY';

export type BuildOpportunityPayloadInput = {
    type: OpportunityType;
    title: string;
    company: string;
    companyWebsite: string;
    companyLogoUrl: string;
    description: string;
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    passoutYears: number[];
    requiredSkills: string;
    locations: string;
    workMode: WorkMode;
    salaryRange: string;
    salaryAmount: string;
    salaryPeriod: SalaryPeriod;
    employmentType: string;
    incentives: string;
    jobFunction: string;
    selectionProcess: string;
    notesHighlights: string;
    experienceMin: string;
    experienceMax: string;
    applyLink: string;
    expiresAt: string;
    startDate: string;
    endDate: string;
    venueAddress: string;
    venueLink: string;
    requiredDocuments: string;
    contactPerson: string;
    contactPhone: string;
    walkInDateRange: string;
    walkInTimeRange: string;
    autoDateRange: string;
    autoTimeRange: string;
};

const splitCsv = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);

const toNumberOrUndefined = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const formatSalaryRange = (amount: string, period: SalaryPeriod) => {
    const raw = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
    if (!raw || Number.isNaN(raw)) return '';
    if (period === 'YEARLY') {
        const lpa = raw >= 100000 ? raw / 100000 : raw;
        return `${Number.isInteger(lpa) ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
    }
    const kVal = raw >= 1000 ? raw / 1000 : raw;
    return `${Number.isInteger(kVal) ? kVal.toFixed(0) : kVal.toFixed(1)}k/month`;
};

export function buildOpportunityPayload(input: BuildOpportunityPayloadInput): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        type: input.type,
        title: input.title,
        company: input.company,
        companyWebsite: input.companyWebsite || undefined,
        companyLogoUrl: input.companyLogoUrl || undefined,
        description: input.description,
        allowedDegrees: input.allowedDegrees,
        allowedCourses: input.allowedCourses,
        allowedSpecializations: input.allowedSpecializations,
        allowedPassoutYears: input.passoutYears,
        requiredSkills: splitCsv(input.requiredSkills),
        locations: splitCsv(input.locations),
        workMode: input.type === 'WALKIN' ? undefined : input.workMode,
        salaryRange: input.salaryRange || formatSalaryRange(input.salaryAmount, input.salaryPeriod) || undefined,
        salaryPeriod: input.salaryPeriod,
        employmentType: input.employmentType || undefined,
        incentives: input.incentives || undefined,
        jobFunction: input.jobFunction || undefined,
        selectionProcess: input.selectionProcess || undefined,
        notesHighlights: input.notesHighlights || undefined,
        experienceMin: toNumberOrUndefined(input.experienceMin),
        experienceMax: toNumberOrUndefined(input.experienceMax),
        applyLink: input.type === 'WALKIN' ? undefined : (input.applyLink || undefined),
        expiresAt: input.expiresAt || undefined
    };

    if (input.type === 'WALKIN') {
        payload.walkInDetails = {
            dateRange: input.autoDateRange || input.walkInDateRange || undefined,
            timeRange: input.autoTimeRange || input.walkInTimeRange || undefined,
            venueAddress: input.venueAddress,
            venueLink: input.venueLink || undefined,
            reportingTime: input.autoTimeRange || undefined,
            dates: input.startDate ? [input.startDate, input.endDate || input.startDate] : undefined,
            requiredDocuments: splitCsv(input.requiredDocuments),
            contactPerson: input.contactPerson || undefined,
            contactPhone: input.contactPhone || undefined
        };
    }

    return payload;
}
