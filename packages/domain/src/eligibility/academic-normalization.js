"use strict";
// @fresherflow/domain — Academic Normalization
// Shared across matching and parsing.
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAcademicToken = normalizeAcademicToken;
exports.normalizeAcademicValue = normalizeAcademicValue;
exports.normalizeCourseName = normalizeCourseName;
exports.normalizeSpecializationName = normalizeSpecializationName;
exports.normalizeCourseArray = normalizeCourseArray;
exports.normalizeSpecializationArray = normalizeSpecializationArray;
exports.normalizeEducationBuckets = normalizeEducationBuckets;
exports.getSpecializations = getSpecializations;
exports.academicValuesMatch = academicValuesMatch;
exports.normalizeProfileEducation = normalizeProfileEducation;
const constants_1 = require("@fresherflow/constants");
const NON_ALPHANUMERIC = /[^a-z0-9]/g;
const MULTI_SPACE = /\s+/g;
function normalizeForToken(value) {
    return value.toLowerCase().replace(NON_ALPHANUMERIC, '');
}
function normalizeDisplay(value) {
    return value.replace(MULTI_SPACE, ' ').trim();
}
/**
 * Normalizes a string into a searchable token (no special chars, lowercase).
 */
function normalizeAcademicToken(value) {
    if (!value)
        return '';
    return normalizeForToken(String(value));
}
/**
 * Normalizes display text for academic fields.
 */
function normalizeAcademicValue(value) {
    if (!value)
        return '';
    return normalizeDisplay(String(value));
}
function normalizeCourseName(value) {
    return (0, constants_1.normalizeCourseName)(normalizeAcademicValue(value));
}
function normalizeSpecializationName(value) {
    return (0, constants_1.normalizeSpecializationName)(normalizeAcademicValue(value));
}
function normalizeCourseArray(values) {
    return (0, constants_1.normalizeCourseArray)((values || []).map((value) => normalizeAcademicValue(value)));
}
function normalizeSpecializationArray(values) {
    return (0, constants_1.normalizeSpecializationArray)((values || []).map((value) => normalizeAcademicValue(value)));
}
const COURSE_TOKEN_SET = new Set(constants_1.ALL_COURSE_OPTIONS.map((value) => normalizeAcademicToken(value)));
const SPECIALIZATION_TOKEN_SET = new Set(constants_1.ALL_SPECIALIZATION_OPTIONS.map((value) => normalizeAcademicToken(value)));
function isKnownCourse(value) {
    const token = normalizeAcademicToken(value);
    return !!token && COURSE_TOKEN_SET.has(token);
}
function isKnownSpecialization(value) {
    const token = normalizeAcademicToken(value);
    return !!token && SPECIALIZATION_TOKEN_SET.has(token);
}
/**
 * Keeps education buckets clean by routing tokens to their correct fields.
 */
function normalizeEducationBuckets(coursesInput, specializationsInput) {
    const candidateCourses = normalizeCourseArray(coursesInput);
    const candidateSpecializations = normalizeSpecializationArray(specializationsInput);
    const normalizedCourses = [];
    const normalizedSpecializations = [];
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
const constants_2 = require("../profile/constants");
/**
 * Gets allowed specializations for a course name.
 */
function getSpecializations(course) {
    const normalizedCourse = normalizeCourseName(course);
    return constants_2.DEGREE_SPECIALIZATIONS[normalizedCourse] ?? constants_2.DEGREE_SPECIALIZATIONS.default;
}
/**
 * Checks if two academic values match after normalization.
 */
function academicValuesMatch(left, right) {
    const leftToken = normalizeAcademicToken(normalizeCourseName(left) || normalizeSpecializationName(left));
    const rightToken = normalizeAcademicToken(normalizeCourseName(right) || normalizeSpecializationName(right));
    if (!leftToken || !rightToken)
        return false;
    return leftToken === rightToken;
}
/**
 * Sanitizes single-value profile education fields with same bucket rules.
 */
function normalizeProfileEducation(courseInput, specializationInput) {
    const { allowedCourses, allowedSpecializations } = normalizeEducationBuckets([courseInput], [specializationInput]);
    return {
        course: allowedCourses[0] || '',
        specialization: allowedSpecializations[0] || '',
    };
}
