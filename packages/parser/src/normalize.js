"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSalary = normalizeSalary;
exports.normalizeExpiry = normalizeExpiry;
/**
 * Normalization functions — convert raw strings into typed, structured values.
 * Now delegates to @fresherflow/domain to ensure consistency.
 */
const domain_1 = require("@fresherflow/domain");
/**
 * Normalize a salary string or extract structured salary from raw job text.
 */
function normalizeSalary(text) {
    const result = (0, domain_1.normalizeSalary)(text);
    return {
        min: result.min,
        max: result.max,
        period: result.period,
        range: result.range,
    };
}
/**
 * Extract and normalize an application deadline date from raw job text.
 */
function normalizeExpiry(text) {
    return (0, domain_1.normalizeExpiry)(text);
}
