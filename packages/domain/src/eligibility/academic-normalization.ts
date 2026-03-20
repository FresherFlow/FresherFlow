// @fresherflow/domain — Academic Normalization
// Shared across matching and parsing.

import {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
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

/**
 * Normalizes a string into a searchable token (no special chars, lowercase).
 */
export function normalizeAcademicToken(value: string | null | undefined): string {
    if (!value) return '';
    return normalizeForToken(String(value));
}

/**
 * Normalizes display text for academic fields.
 */
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

const COURSE_TOKEN_SET = new Set(
    ALL_COURSE_OPTIONS.map((value) => normalizeAcademicToken(value))
);
const SPECIALIZATION_TOKEN_SET = new Set(
    ALL_SPECIALIZATION_OPTIONS.map((value) => normalizeAcademicToken(value))
);

function isKnownCourse(value: string): boolean {
    const token = normalizeAcademicToken(value);
    return !!token && COURSE_TOKEN_SET.has(token);
}

function isKnownSpecialization(value: string): boolean {
    const token = normalizeAcademicToken(value);
    return !!token && SPECIALIZATION_TOKEN_SET.has(token);
}

/**
 * Keeps education buckets clean by routing tokens to their correct fields.
 */
export function normalizeEducationBuckets(
    coursesInput: Array<string | null | undefined> | undefined,
    specializationsInput: Array<string | null | undefined> | undefined
): { allowedCourses: string[]; allowedSpecializations: string[] } {
    const candidateCourses = normalizeCourseArray(coursesInput);
    const candidateSpecializations = normalizeSpecializationArray(specializationsInput);

    const normalizedCourses: string[] = [];
    const normalizedSpecializations: string[] = [];

    for (const value of candidateCourses) {
        if (isKnownCourse(value)) {
            normalizedCourses.push(value);
            continue;
        }
        if (isKnownSpecialization(value)) {
            normalizedSpecializations.push(value);
        }
    }

    for (const value of candidateSpecializations) {
        if (isKnownSpecialization(value)) {
            normalizedSpecializations.push(value);
            continue;
        }
        if (isKnownCourse(value)) {
            normalizedCourses.push(value);
        }
    }

    return {
        allowedCourses: normalizeCourseArray(normalizedCourses),
        allowedSpecializations: normalizeSpecializationArray(normalizedSpecializations),
    };
}

import { DEGREE_SPECIALIZATIONS } from '../profile/constants.js';

/**
 * Gets allowed specializations for a course name.
 */
export function getSpecializations(course: string): string[] {
    const normalizedCourse = normalizeCourseName(course);
    return DEGREE_SPECIALIZATIONS[normalizedCourse] ?? DEGREE_SPECIALIZATIONS.default;
}

/**
 * Checks if two academic values match after normalization.
 */
export function academicValuesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
    const leftToken = normalizeAcademicToken(normalizeCourseName(left) || normalizeSpecializationName(left));
    const rightToken = normalizeAcademicToken(normalizeCourseName(right) || normalizeSpecializationName(right));
    if (!leftToken || !rightToken) return false;
    return leftToken === rightToken;
}

/**
 * Sanitizes single-value profile education fields with same bucket rules.
 */
export function normalizeProfileEducation(
    courseInput: string | null | undefined,
    specializationInput: string | null | undefined
): { course: string; specialization: string } {
    const { allowedCourses, allowedSpecializations } = normalizeEducationBuckets(
        [courseInput],
        [specializationInput]
    );

    return {
        course: allowedCourses[0] || '',
        specialization: allowedSpecializations[0] || '',
    };
}
