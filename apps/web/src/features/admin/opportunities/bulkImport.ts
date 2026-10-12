import { adminApi } from '@/lib/api/admin';
import { buildOpportunityPayload, type OpportunityFormValues } from './opportunityPayload';
import {
    normalizeEducationPayload,
    normalizePassoutYears,
    normalizeSalaryPeriodValue,
    normalizeWorkModeValue,
    toStringArray,
} from './formUtils';
import { typeParamToEnum } from '@/lib/opportunity/typeParam';
import { getErrorMessage } from '@/lib/utils/error';

/** One raw object from a pasted bulk array (template shape from docs/templates.md). */
export type BulkTemplateItem = Record<string, unknown>;

export const BULK_MAX_ITEMS = 100;
const SUBMIT_GAP_MS = 400;

const str = (value: unknown): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
};

const numStr = (value: unknown): string => {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    return '';
};

/** Strip ```json fences so chat-copied payloads parse. */
export function stripCodeFences(text: string): string {
    const lines = text.trim().split('\n');
    if (lines.length >= 2 && lines[0].trim().startsWith('```') && lines[lines.length - 1].trim().startsWith('```')) {
        return lines.slice(1, -1).join('\n').trim();
    }
    return text.trim();
}

export function parsePastedJson(text: string): { value: unknown; error?: undefined } | { value?: undefined; error: string } {
    const cleaned = stripCodeFences(text);
    if (!cleaned) return { error: 'Paste a JSON object or an array of objects first.' };
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        return { error: 'Pasted text must start with { or [. Copy only the JSON, without code fences or extra text.' };
    }
    try {
        return { value: JSON.parse(cleaned) as unknown };
    } catch {
        return { error: 'Invalid JSON: check brackets, commas and quotes.' };
    }
}

function normalizeKind(item: BulkTemplateItem): OpportunityFormValues['type'] {
    const raw = str(item.category ?? item.type);
    if (!raw) return 'JOB';
    const kind = typeParamToEnum(raw);
    if (kind === 'JOB' || kind === 'INTERNSHIP' || kind === 'WALKIN' || kind === 'GOVERNMENT') {
        return kind;
    }
    return 'JOB';
}

function splitExpiry(value: unknown): { expiryDate: string; expiryTime: string } {
    const raw = str(value).trim();
    if (!raw) return { expiryDate: '', expiryTime: '' };
    const [date = '', time = ''] = raw.split('T');
    return { expiryDate: date.trim(), expiryTime: time.trim() };
}

function mapAppDetails(item: BulkTemplateItem): Pick<OpportunityFormValues, 'appMethod' | 'appPlatform' | 'appDuration' | 'appRequiredItems'> {
    const details = item.applicationDetails;
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
        return { appMethod: 'DIRECT', appPlatform: '', appDuration: '', appRequiredItems: [] };
    }
    const record = details as Record<string, unknown>;
    const method = str(record.method).toUpperCase();
    return {
        appMethod: method === 'FORM' || method === 'ASSESSMENT' ? method : 'DIRECT',
        appPlatform: str(record.platform),
        appDuration: numStr(record.estimatedMinutes),
        appRequiredItems: toStringArray(record.requiredItems),
    };
}

/** Template JSON → the same form-values shape single create builds its payload from. */
export function mapTemplateToFormValues(item: BulkTemplateItem): OpportunityFormValues {
    const education = normalizeEducationPayload(item.allowedDegrees, item.allowedCourses, item.allowedSpecializations);
    const { expiryDate, expiryTime } = splitExpiry(item.expiresAt);
    const walkIn = (item.walkInDetails && typeof item.walkInDetails === 'object' && !Array.isArray(item.walkInDetails)
        ? item.walkInDetails as Record<string, unknown>
        : {}) as Record<string, unknown>;
    const employmentTypes = [
        ...toStringArray(item.employmentTypes),
        ...(item.employmentType ? [str(item.employmentType)] : []),
    ].filter(Boolean).join(', ');

    return {
        type: normalizeKind(item),
        title: str(item.title),
        company: str(item.company),
        companyWebsite: str(item.companyWebsite ?? (item as Record<string, unknown>).companyUrl),
        companyLogoUrl: str((item as Record<string, unknown>).companyLogoUrl),
        description: str(item.description),
        allowedDegrees: education.degrees,
        allowedCourses: education.courses,
        allowedSpecializations: education.specializations,
        passoutYears: normalizePassoutYears(item.allowedPassoutYears),
        passoutYearMin: '',
        passoutYearMax: '',
        allowedAvailability: '',
        requiredSkills: toStringArray(item.requiredSkills).join(', '),
        locations: toStringArray(item.locations).join(', '),
        workMode: normalizeWorkModeValue(item.workMode) ?? 'ONSITE',
        salaryRange: str(item.salaryRange),
        salaryAmount: str(item.salaryAmount),
        salaryPeriod: normalizeSalaryPeriodValue(item.salaryPeriod) ?? 'YEARLY',
        stipend: str((item as Record<string, unknown>).stipend),
        employmentType: employmentTypes,
        incentives: toStringArray(item.incentives).join(', '),
        jobFunction: str(item.jobFunction),
        selectionProcess: str(item.selectionProcess),
        notesHighlights: str(item.notesHighlights),
        isGovernmentJob: false,
        governmentTags: toStringArray((item as Record<string, unknown>).tags).join(', '),
        governmentDepartment: '',
        governmentOrganization: '',
        recruitingBody: '',
        applicationStatus: '',
        governmentLevel: '',
        vacancyNature: '',
        jobCategory: '',
        govtCategory: '',
        officialWebsiteUrl: '',
        officialNotificationUrl: '',
        advertisementNumber: '',
        postName: '',
        applicationMode: '',
        vacancyCount: '',
        vacancyBreakdownJson: '',
        applicationFee: '',
        applicationFeeJson: '',
        ageMin: '',
        ageMax: '',
        ageRelaxation: '',
        eligibilityDetailsJson: '',
        reservationNotes: '',
        importantInstructions: '',
        applicationStartDate: '',
        applicationEndDate: '',
        examDate: '',
        examDatesJson: '',
        admitCardDate: '',
        resultDate: '',
        selectionStages: '',
        governmentRequiredDocuments: '',
        governmentRequiredDocumentsJson: '',
        examCenters: '',
        examPatternJson: '',
        skillTestsJson: '',
        examStagesJson: '',
        importantDatesJson: '',
        qualificationDetailsJson: '',
        physicalStandardsJson: '',
        extraMetadataJson: '',
        feeBreakdownJson: '',
        ageRelaxationRulesJson: '',
        officialSourceVerified: false,
        sourceLastCheckedAt: '',
        extractionConfidence: '',
        examName: '',
        notificationIssuedDate: '',
        categoryVacanciesJson: '',
        cadreDetailsJson: '',
        postPreferencesJson: '',
        serviceBondJson: '',
        reservationDetailsJson: '',
        referenceLinksJson: '',
        cutOffMarksJson: '',
        notificationPdfUrl: '',
        admitCardUrl: '',
        resultUrl: '',
        answerKeyUrl: '',
        syllabusUrl: '',
        previousPapersUrl: '',
        basicPay: '',
        payLevel: '',
        allowances: '',
        experienceMin: numStr(item.experienceMin),
        experienceMax: numStr(item.experienceMax),
        sourceLink: str((item as Record<string, unknown>).sourceLink),
        applyLink: str(item.applyLink),
        expiryDate,
        expiryTime,
        venueAddress: str(item.venueAddress ?? walkIn.venueAddress),
        walkInDateRange: str(item.dateRange ?? walkIn.dateRange),
        walkInTimeRange: str(item.timeRange ?? walkIn.timeRange),
        venueLink: str(item.venueLink ?? walkIn.venueLink),
        requiredDocuments: toStringArray(item.requiredDocuments ?? walkIn.requiredDocuments).join(', '),
        contactPerson: str(item.contactPerson ?? walkIn.contactPerson),
        contactPhone: str(item.contactPhone ?? walkIn.contactPhone),
        startDate: str(item.startDate),
        endDate: str(item.endDate),
        startTime: str(item.startTime) || '10:00',
        endTime: str(item.endTime) || '13:00',
        customSlug: str((item as Record<string, unknown>).customSlug ?? (item as Record<string, unknown>).slug),
        ...mapAppDetails(item),
    };
}

export type BulkItemResult = {
    index: number;
    title: string;
    ok: boolean;
    message: string;
};

function validateItem(item: BulkTemplateItem, index: number): string | null {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return `Item ${index + 1} is not a JSON object.`;
    }
    if (!str(item.title)) return `Item ${index + 1} is missing title.`;
    if (!str(item.company)) return `Item ${index + 1} ("${str(item.title).slice(0, 40)}") is missing company.`;
    const kind = normalizeKind(item);
    if (kind !== 'WALKIN' && !str((item as Record<string, unknown>).sourceLink) && !str(item.applyLink)) {
        return `Item ${index + 1} ("${str(item.title).slice(0, 40)}") needs a sourceLink or applyLink.`;
    }
    return null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Create every item sequentially through the same payload + endpoint as single create. */
export async function bulkCreateOpportunities(
    items: BulkTemplateItem[],
    onProgress?: (done: number, total: number, currentTitle: string) => void,
): Promise<BulkItemResult[]> {
    const results: BulkItemResult[] = [];
    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const title = str(item?.title) || `Item ${index + 1}`;
        onProgress?.(index, items.length, title);
        const validationError = validateItem(item, index);
        if (validationError) {
            results.push({ index, title, ok: false, message: validationError });
            continue;
        }
        try {
            const payload = buildOpportunityPayload(mapTemplateToFormValues(item));
            await adminApi.createOpportunity(payload);
            results.push({ index, title, ok: true, message: 'Created.' });
        } catch (err: unknown) {
            results.push({ index, title, ok: false, message: getErrorMessage(err) });
        }
        if (index < items.length - 1) await sleep(SUBMIT_GAP_MS);
    }
    onProgress?.(items.length, items.length, '');
    return results;
}
