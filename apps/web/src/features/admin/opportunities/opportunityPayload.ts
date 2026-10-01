import { kindToAdminCategory, type OpportunityKind } from './formUtils';

type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
type SalaryPeriod = 'YEARLY' | 'MONTHLY';

export type OpportunityFormValues = {
    type: OpportunityKind;
    title: string;
    company: string;
    companyWebsite: string;
    companyLogoUrl: string;
    description: string;
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    passoutYears: number[];
    passoutYearMin: string;
    passoutYearMax: string;
    allowedAvailability: string;
    requiredSkills: string;
    locations: string;
    workMode: WorkMode;
    salaryRange: string;
    salaryAmount: string;
    salaryPeriod: SalaryPeriod;
    stipend: string;
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
    govtCategory: string;
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
    sourceLastCheckedAt: string;
    extractionConfidence: string;
    examName: string;
    notificationIssuedDate: string;
    categoryVacanciesJson: string;
    cadreDetailsJson: string;
    postPreferencesJson: string;
    serviceBondJson: string;
    reservationDetailsJson: string;
    referenceLinksJson: string;
    cutOffMarksJson: string;
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

const toCsvList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value !== 'string') return [];
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};


/**
 * Reads the first numeric run out of a free-text field.
 *
 * The previous implementation stripped every character outside `[0-9.]` and ran
 * `parseFloat` on the remains, which read "5-10" as 5.10 and "1e5" as 15.
 * Matching the first `-?\d+(\.\d+)?` run instead keeps "₹5,00,000" → 500000 and
 * "10 LPA" → 10, while reading "5-10" as 5 and refusing non-numeric text.
 */
const toNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (!match) return undefined;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const toFloat = (value: string) => toNumber(value);

/** Integer variant. Returns `undefined` rather than NaN, which JSON.stringify would send as `null`. */
const toInt = (value: string) => {
    const parsed = toNumber(value);
    return parsed === undefined ? undefined : Math.trunc(parsed);
};


const getOrdinalNum = (n: number) => {
    if (n <= 0) return String(n);
    // 11th/12th/13th break the last-digit rule, and the old `n > 10 && n < 14`
    // guard only caught two-digit values — 111 rendered as "111st". Test the
    // last two digits so 111 becomes 111th.
    const lastTwo = n % 100;
    if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
    const suffix = ['th', 'st', 'nd', 'rd'][n % 10 < 4 ? n % 10 : 0];
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
    const parsedHours = parseInt(hourPart, 10);
    if (!Number.isFinite(parsedHours) || !minutePart) return '';
    const ampm = parsedHours >= 12 ? 'PM' : 'AM';
    const hours = parsedHours % 12 || 12;
    return `${hours}:${minutePart} ${ampm}`;
};

const formatSalaryRange = (amount: string, period: SalaryPeriod) => {
    const raw = toNumber(amount);
    if (raw === undefined || raw === 0) return '';
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

/**
 * Parses one of the 21 government `*Json` textareas.
 *
 * Throws a located message rather than the raw `JSON.parse` error: these fields
 * are indistinguishable in the form, so "Unexpected token } at position 5" left
 * the admin with no way to tell which box to fix. The caller wraps
 * `buildOpportunityPayload` in a try/catch and surfaces this as a toast.
 */
const parseJsonInput = <T,>(value: string): T | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
        return JSON.parse(trimmed) as T;
    } catch {
        const preview = trimmed.length > 40 ? `${trimmed.slice(0, 40)}…` : trimmed;
        throw new Error(
            `Invalid JSON in a detail field starting with "${preview}". Fix the JSON syntax and submit again.`
        );
    }
};

export const buildOpportunityPayload = (values: OpportunityFormValues): Record<string, unknown> => {
    // Independent taxonomy dimensions (v2): the admin API resolves `category`
    // onto category/recruitmentMethod/employmentTypes internally, reads
    // `driveDetails` (not `walkInDetails`), and treats `governmentJobDetails`
    // presence as the government signal (`opportunitySchema` rejects a
    // `government` category value, so govt travels via details + `sector`).
    const isGovt = values.isGovernmentJob || values.type === 'GOVERNMENT';
    const kind: OpportunityKind = isGovt ? 'GOVERNMENT' : values.type;
    const walkInEndDate = values.endDate || values.startDate;
    const derivedWalkInExpiry = kind === 'WALKIN' ? toEndOfDayIso(walkInEndDate) : undefined;
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
        category: kindToAdminCategory(kind),
        ...(isGovt ? { sector: 'GOVERNMENT' } : {}),
        title: values.title,
        company: values.company,
        companyWebsite: values.companyWebsite || null,
        companyLogoUrl: values.companyLogoUrl || null,
        description: values.description,
        allowedDegrees: values.allowedDegrees,
        allowedCourses: values.allowedCourses,
        allowedSpecializations: values.allowedSpecializations,
        allowedPassoutYears: values.passoutYears,
        passoutYearMin: toInt(values.passoutYearMin) ?? null,
        passoutYearMax: toInt(values.passoutYearMax) ?? null,
        allowedAvailability: values.allowedAvailability ? toCsvList(values.allowedAvailability) : [],
        requiredSkills: toCsvList(values.requiredSkills),
        locations: toCsvList(values.locations),
        workMode: kind === 'WALKIN' ? undefined : (values.workMode || null),
        salaryRange: values.salaryRange || formatSalaryRange(values.salaryAmount, values.salaryPeriod) || null,
        salaryPeriod: values.salaryPeriod || null,
        stipend: values.stipend || null,
        employmentTypes: values.employmentType?.trim() || (kind === 'INTERNSHIP' ? 'INTERNSHIP' : null),
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
        applicationDetails: isGovt ? null : {
            method: values.appMethod,
            platform: (values.appMethod !== 'DIRECT' && values.appPlatform) ? values.appPlatform : undefined,
            estimatedMinutes: (values.appMethod !== 'DIRECT' && (toInt(values.appDuration) ?? 0) > 0) ? toInt(values.appDuration) : undefined,
            requiredItems: (values.appMethod !== 'DIRECT') ? values.appRequiredItems : undefined,
        }
    };

    if (kind === 'WALKIN') {
        const autoDateRange = formatDateRange(values.startDate, values.endDate);
        // `formatTime` returns '' for a blank input, so the old template literal
        // was always at least " - ". That made `autoTimeRange` permanently
        // truthy and the manually typed `walkInTimeRange` unreachable, so an
        // admin who filled only the free-text range still saved " - ". Join only
        // the parts that exist.
        const autoTimeRange = [formatTime(values.startTime), formatTime(values.endTime)]
            .filter(Boolean)
            .join(' - ');
        payload.driveDetails = {
            dateRange: autoDateRange || values.walkInDateRange || undefined,
            timeRange: autoTimeRange || values.walkInTimeRange || undefined,
            venueAddress: values.venueAddress,
            venueLink: values.venueLink || undefined,
            reportingTime: autoTimeRange || undefined,
            // Only echo the end date when it differs from the start, otherwise a
            // single-day drive shipped `["2026-02-02", "2026-02-02"]`.
            dates: values.startDate
                ? (walkInEndDate && walkInEndDate !== values.startDate
                    ? [values.startDate, walkInEndDate]
                    : [values.startDate])
                : undefined,
            requiredDocuments: toCsvList(values.requiredDocuments),
            contactPerson: values.contactPerson || undefined,
            contactPhone: values.contactPhone || undefined,
        };
    }

    if (isGovt) {
        payload.governmentJobDetails = {
            department: values.governmentDepartment || undefined,
            organization: values.governmentOrganization || undefined,
            recruitingBody: values.recruitingBody || undefined,
            applicationStatus: values.applicationStatus || undefined,
            governmentLevel: values.governmentLevel || undefined,
            vacancyNature: values.vacancyNature || undefined,
            jobCategory: toCsvList(values.jobCategory),
            govtCategory: values.govtCategory || undefined,
            examName: values.examName || undefined,
            postName: values.postName || undefined,
            notificationIssuedDate: values.notificationIssuedDate || undefined,
            categoryVacancies: parseJsonInput(values.categoryVacanciesJson),
            cadreDetails: parseJsonInput(values.cadreDetailsJson),
            postPreferences: parseJsonInput(values.postPreferencesJson),
            serviceBond: parseJsonInput(values.serviceBondJson),
            reservationDetails: parseJsonInput(values.reservationDetailsJson),
            referenceLinks: parseJsonInput(values.referenceLinksJson),
            cutOffMarks: parseJsonInput(values.cutOffMarksJson),
            officialWebsiteUrl: values.officialWebsiteUrl || undefined,
            officialNotificationUrl: values.officialNotificationUrl || undefined,
            advertisementNumber: values.advertisementNumber || undefined,
            applicationMode: values.applicationMode || undefined,
            vacancyCount: toInt(values.vacancyCount),
            vacancyBreakdown: parseJsonInput(values.vacancyBreakdownJson),
            applicationFee: values.applicationFee || undefined,
            applicationFeeDetails: parseJsonInput(values.applicationFeeJson),
            ageMin: toInt(values.ageMin),
            ageMax: toInt(values.ageMax),
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
            sourceLastCheckedAt: values.sourceLastCheckedAt || undefined,
            extractionConfidence: toFloat(values.extractionConfidence),
            notificationPdfUrl: values.notificationPdfUrl || undefined,
            admitCardUrl: values.admitCardUrl || undefined,
            resultUrl: values.resultUrl || undefined,
            answerKeyUrl: values.answerKeyUrl || undefined,
            syllabusUrl: values.syllabusUrl || undefined,
            previousPapersUrl: values.previousPapersUrl || undefined,
            basicPay: toInt(values.basicPay),
            payLevel: values.payLevel || undefined,
            allowances: toCsvList(values.allowances),
        };
    } else {
        payload.governmentJobDetails = null;
    }

    return payload;
};
