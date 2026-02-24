import {
    normalizeCourseName as normalizeSharedCourseName,
    normalizeSpecializationName as normalizeSharedSpecializationName,
    normalizeCourseArray as normalizeSharedCourseArray,
    normalizeSpecializationArray as normalizeSharedSpecializationArray,
} from '@fresherflow/constants';

const NON_ALPHANUMERIC = /[^a-z0-9]/g;
const MULTI_SPACE = /\s+/g;

function normalizeForToken(value: string): string {
    return value.toLowerCase().replace(NON_ALPHANUMERIC, '');
}

function normalizeDisplay(value: string): string {
    return value.replace(MULTI_SPACE, ' ').trim();
}

export function normalizeAcademicToken(value: string | null | undefined): string {
    if (!value) return '';
    return normalizeForToken(String(value));
}

export function normalizeAcademicValue(value: string | null | undefined): string {
    if (!value) return '';
    return normalizeDisplay(String(value));
}

export function normalizeCourseName(value: string | null | undefined): string {
    return normalizeSharedCourseName(normalizeAcademicValue(value));
}

export function normalizeSpecializationName(value: string | null | undefined): string {
    return normalizeSharedSpecializationName(normalizeAcademicValue(value));
}

export function normalizeCourseArray(values: Array<string | null | undefined> | undefined): string[] {
    return normalizeSharedCourseArray((values || []).map((value) => normalizeAcademicValue(value)));
}

export function normalizeSpecializationArray(values: Array<string | null | undefined> | undefined): string[] {
    return normalizeSharedSpecializationArray((values || []).map((value) => normalizeAcademicValue(value)));
}

export function academicValuesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
    const leftToken = normalizeAcademicToken(normalizeCourseName(left) || normalizeSpecializationName(left));
    const rightToken = normalizeAcademicToken(normalizeCourseName(right) || normalizeSpecializationName(right));
    if (!leftToken || !rightToken) return false;
    return leftToken === rightToken;
}
