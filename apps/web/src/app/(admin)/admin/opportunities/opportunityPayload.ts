type OpportunityType = 'JOB' | 'INTERNSHIP' | 'WALKIN';
type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
type SalaryPeriod = 'YEARLY' | 'MONTHLY';

export type OpportunityFormValues = {
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
    isGovernmentJob: boolean;
    governmentTags: string;
    governmentDepartment: string;
    governmentOrganization: string;
    recruitingBody: string;
    applicationStatus: string;
    governmentLevel: string;
    vacancyNature: string;
    jobCategory: string;
    officialWebsiteUrl: string;
    officialNotificationUrl: string;
    advertisementNumber: string;
    postName: string;
    applicationMode: string;
    vacancyCount: string;
    vacancyBreakdownJson: string;
    applicationFee: string;
    applicationFeeJson: string;
    ageMin: string;
    ageMax: string;
    ageRelaxation: string;
    eligibilityDetailsJson: string;
    reservationNotes: string;
    importantInstructions: string;
    applicationStartDate: string;
    applicationEndDate: string;
    examDate: string;
    examDatesJson: string;
    admitCardDate: string;
    resultDate: string;
    selectionStages: string;
    governmentRequiredDocuments: string;
    governmentRequiredDocumentsJson: string;
    examCenters: string;
    examPatternJson: string;
    skillTestsJson: string;
    examStagesJson: string;
    importantDatesJson: string;
    qualificationDetailsJson: string;
    physicalStandardsJson: string;
    extraMetadataJson: string;
    feeBreakdownJson: string;
    ageRelaxationRulesJson: string;
    officialSourceVerified: boolean;
    notificationPdfUrl: string;
    admitCardUrl: string;
    resultUrl: string;
    answerKeyUrl: string;
    syllabusUrl: string;
    previousPapersUrl: string;
    basicPay: string;
    payLevel: string;
    allowances: string;
    experienceMin: string;
    experienceMax: string;
    sourceLink: string;
    applyLink: string;
    expiryDate: string;
    expiryTime: string;
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
    customSlug: string;
    appMethod: 'DIRECT' | 'FORM' | 'ASSESSMENT';
    appPlatform: string;
    appDuration: string;
    appRequiredItems: string[];
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
    if (period === 'YEARLY') {
        const lpa = raw >= 100000 ? raw / 100000 : raw;
        return `${Number.isInteger(lpa) ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
    }
    return `${raw.toLocaleString('en-IN')}/month`;
};

const toEndOfDayIso = (value: string) => {
    if (!value) return undefined;
    const date = new Date(`${value}T23:59:59`);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString();
};

const parseJsonInput = <T,>(value: string): T | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return JSON.parse(trimmed) as T;
};

export const buildOpportunityPayload = (values: OpportunityFormValues): Record<string, unknown> => {
    const walkInEndDate = values.endDate || values.startDate;
    const derivedWalkInExpiry = values.type === 'WALKIN' ? toEndOfDayIso(walkInEndDate) : undefined;
    const normalizedSourceLink = values.sourceLink.trim();
    const normalizedApplyLink = values.applyLink.trim();

    let expiresAtPayload: string | null = null;
    if (values.expiryDate) {
        const timePart = values.expiryTime ? values.expiryTime : '23:59';
        const dateObj = new Date(`${values.expiryDate}T${timePart}`);
        if (!isNaN(dateObj.getTime())) {
            expiresAtPayload = dateObj.toISOString();
        }
    }

    const payload: Record<string, unknown> = {
        type: values.type,
        title: values.title,
        company: values.company,
        companyWebsite: values.companyWebsite || null,
        companyLogoUrl: values.companyLogoUrl || null,
        description: values.description,
        allowedDegrees: values.allowedDegrees,
        allowedCourses: values.allowedCourses,
        allowedSpecializations: values.allowedSpecializations,
        allowedPassoutYears: values.passoutYears,
        requiredSkills: toCsvList(values.requiredSkills),
        locations: toCsvList(values.locations),
        workMode: values.type === 'WALKIN' ? undefined : (values.workMode || null),
        salaryRange: values.salaryRange || formatSalaryRange(values.salaryAmount, values.salaryPeriod) || null,
        salaryPeriod: values.salaryPeriod || null,
        employmentType: values.employmentType || null,
        incentives: values.incentives || null,
        jobFunction: values.jobFunction || null,
        selectionProcess: values.selectionProcess || null,
        notesHighlights: values.notesHighlights || null,
        tags: values.isGovernmentJob ? toCsvList(values.governmentTags) : [],
        experienceMin: toFloat(values.experienceMin) ?? null,
        experienceMax: toFloat(values.experienceMax) ?? null,
        sourceLink: normalizedSourceLink || null,
        applyLink: normalizedApplyLink || normalizedSourceLink || null,
        expiresAt: expiresAtPayload || derivedWalkInExpiry || null,
        customSlug: values.customSlug || null,
        applicationDetails: values.isGovernmentJob ? null : {
            method: values.appMethod,
            platform: (values.appMethod !== 'DIRECT' && values.appPlatform) ? values.appPlatform : undefined,
            estimatedMinutes: (values.appMethod !== 'DIRECT' && values.appDuration && parseInt(values.appDuration, 10) > 0) ? parseInt(values.appDuration, 10) : undefined,
            requiredItems: (values.appMethod !== 'DIRECT') ? values.appRequiredItems : undefined,
        }
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

    if (values.isGovernmentJob) {
        payload.governmentJobDetails = {
            department: values.governmentDepartment || undefined,
            organization: values.governmentOrganization || undefined,
            recruitingBody: values.recruitingBody || undefined,
            applicationStatus: values.applicationStatus || undefined,
            governmentLevel: values.governmentLevel || undefined,
            vacancyNature: values.vacancyNature || undefined,
            jobCategory: toCsvList(values.jobCategory),
            officialWebsiteUrl: values.officialWebsiteUrl || undefined,
            officialNotificationUrl: values.officialNotificationUrl || undefined,
            advertisementNumber: values.advertisementNumber || undefined,
            applicationMode: values.applicationMode || undefined,
            vacancyCount: values.vacancyCount ? parseInt(values.vacancyCount, 10) : undefined,
            vacancyBreakdown: parseJsonInput(values.vacancyBreakdownJson),
            applicationFee: values.applicationFee || undefined,
            applicationFeeDetails: parseJsonInput(values.applicationFeeJson),
            ageMin: values.ageMin ? parseInt(values.ageMin, 10) : undefined,
            ageMax: values.ageMax ? parseInt(values.ageMax, 10) : undefined,
            ageRelaxation: values.ageRelaxation || undefined,
            eligibilityDetails: parseJsonInput(values.eligibilityDetailsJson),
            reservationNotes: values.reservationNotes || undefined,
            importantInstructions: values.importantInstructions || undefined,
            applicationStartDate: values.applicationStartDate || undefined,
            applicationEndDate: values.applicationEndDate || undefined,
            examDate: values.examDate || undefined,
            examDates: parseJsonInput(values.examDatesJson),
            admitCardDate: values.admitCardDate || undefined,
            resultDate: values.resultDate || undefined,
            selectionStages: toCsvList(values.selectionStages),
            requiredDocuments: toCsvList(values.governmentRequiredDocuments),
            requiredDocumentDetails: parseJsonInput(values.governmentRequiredDocumentsJson),
            seoTags: toCsvList(values.governmentTags),
            examCenters: toCsvList(values.examCenters),
            examPattern: parseJsonInput(values.examPatternJson),
            skillTests: parseJsonInput(values.skillTestsJson),
            examStages: parseJsonInput(values.examStagesJson),
            importantDates: parseJsonInput(values.importantDatesJson),
            qualificationDetails: parseJsonInput(values.qualificationDetailsJson),
            physicalStandards: parseJsonInput(values.physicalStandardsJson),
            extraMetadata: parseJsonInput(values.extraMetadataJson),
            feeBreakdown: parseJsonInput(values.feeBreakdownJson),
            ageRelaxationRules: parseJsonInput(values.ageRelaxationRulesJson),
            officialSourceVerified: values.officialSourceVerified || undefined,
            notificationPdfUrl: values.notificationPdfUrl || undefined,
            admitCardUrl: values.admitCardUrl || undefined,
            resultUrl: values.resultUrl || undefined,
            answerKeyUrl: values.answerKeyUrl || undefined,
            syllabusUrl: values.syllabusUrl || undefined,
            previousPapersUrl: values.previousPapersUrl || undefined,
            basicPay: values.basicPay ? parseInt(values.basicPay, 10) : undefined,
            payLevel: values.payLevel || undefined,
            allowances: toCsvList(values.allowances),
        };
    } else {
        payload.governmentJobDetails = null;
    }

    return payload;
};
