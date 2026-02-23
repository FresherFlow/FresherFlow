type OpportunityType = 'JOB' | 'INTERNSHIP' | 'WALKIN';
type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
type SalaryPeriod = 'YEARLY' | 'MONTHLY';

export type OpportunityFormValues = {
    type: OpportunityType;
    title: string;
    company: string;
    companyWebsite: string;
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
    venueAddress: string;
    walkInDateRange: string;
    walkInTimeRange: string;
    venueLink: string;
    requiredDocuments: string;
    contactPerson: string;
    contactPhone: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
};

const toCsvList = (value: string) =>
    value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);


const toFloat = (value: string) => {
    if (!value) return undefined;
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
};


const getOrdinalNum = (n: number) => {
    if (n <= 0) return String(n);
    const suffix = ['th', 'st', 'nd', 'rd'][(n > 10 && n < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)];
    return `${n}${suffix}`;
};

const formatDateRange = (start: string, end: string) => {
    if (!start) return '';
    const startDate = new Date(start);
    const startMonth = startDate.toLocaleString('en-IN', { month: 'short' });
    const startDay = getOrdinalNum(startDate.getDate());

    if (!end || start === end) return `${startDay} ${startMonth}`;

    const endDate = new Date(end);
    const endMonth = endDate.toLocaleString('en-IN', { month: 'short' });
    const endDay = getOrdinalNum(endDate.getDate());

    if (startMonth === endMonth) return `${startDay} - ${endDay} ${startMonth}`;
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

const formatTime = (value: string) => {
    if (!value) return '';
    const [hourPart, minutePart] = value.split(':');
    let hours = parseInt(hourPart, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutePart} ${ampm}`;
};

const formatSalaryRange = (amount: string, period: SalaryPeriod) => {
    const raw = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (!raw || Number.isNaN(raw)) return '';
    if (period === 'YEARLY') return `${raw} LPA`;
    return `${raw.toLocaleString('en-IN')}/month`;
};

const toEndOfDayIso = (value: string) => {
    if (!value) return undefined;
    const date = new Date(`${value}T23:59:59`);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
};

export const buildOpportunityPayload = (values: OpportunityFormValues): Record<string, unknown> => {
    const walkInEndDate = values.endDate || values.startDate;
    const derivedWalkInExpiry = values.type === 'WALKIN' ? toEndOfDayIso(walkInEndDate) : undefined;
    const payload: Record<string, unknown> = {
        type: values.type,
        title: values.title,
        company: values.company,
        companyWebsite: values.companyWebsite || undefined,
        description: values.description,
        allowedDegrees: values.allowedDegrees,
        allowedCourses: values.allowedCourses,
        allowedSpecializations: values.allowedSpecializations,
        allowedPassoutYears: values.passoutYears,
        requiredSkills: toCsvList(values.requiredSkills),
        locations: toCsvList(values.locations),
        workMode: values.type === 'WALKIN' ? undefined : values.workMode,
        salaryRange: values.salaryRange || formatSalaryRange(values.salaryAmount, values.salaryPeriod) || undefined,
        salaryPeriod: values.salaryPeriod,
        employmentType: values.employmentType || undefined,
        incentives: values.incentives || undefined,
        jobFunction: values.jobFunction || undefined,
        selectionProcess: values.selectionProcess || undefined,
        notesHighlights: values.notesHighlights || undefined,
        experienceMin: toFloat(values.experienceMin),
        experienceMax: toFloat(values.experienceMax),
        applyLink: values.type === 'WALKIN' ? undefined : values.applyLink,
        expiresAt: values.expiresAt || derivedWalkInExpiry || undefined,
    };

    if (values.type === 'WALKIN') {
        const autoDateRange = formatDateRange(values.startDate, values.endDate);
        const autoTimeRange = `${formatTime(values.startTime)} - ${formatTime(values.endTime)}`;
        payload.walkInDetails = {
            dateRange: autoDateRange || values.walkInDateRange || undefined,
            timeRange: autoTimeRange || values.walkInTimeRange || undefined,
            venueAddress: values.venueAddress,
            venueLink: values.venueLink || undefined,
            reportingTime: autoTimeRange || undefined,
            dates: values.startDate ? [values.startDate, walkInEndDate || values.startDate] : undefined,
            requiredDocuments: toCsvList(values.requiredDocuments),
            contactPerson: values.contactPerson || undefined,
            contactPhone: values.contactPhone || undefined,
        };
    }

    return payload;
};
