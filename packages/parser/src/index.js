"use strict";
/**
 * @fresherflow/parser — public API
 *
 * Sub-modules:
 *   types.ts      — ParsedJob, NormalizedSalary
 *   heuristics.ts — dictionaries, shared predicates
 *   extract.ts    — field extraction functions
 *   normalize.ts  — salary and date normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlParser = exports.normalizeExpiry = exports.normalizeSalary = exports.parseJobTextLite = exports.extractWalkInDetails = exports.extractJobFunction = exports.extractIncentives = exports.extractExperience = exports.extractWorkMode = exports.extractDegrees = exports.extractPassoutYears = exports.extractType = exports.extractCompany = exports.extractTitle = exports.extractLocations = exports.extractSkills = void 0;
exports.parseJobText = parseJobText;
// Re-export individual functions for targeted use
var extract_1 = require("./extract");
Object.defineProperty(exports, "extractSkills", { enumerable: true, get: function () { return extract_1.extractSkills; } });
Object.defineProperty(exports, "extractLocations", { enumerable: true, get: function () { return extract_1.extractLocations; } });
Object.defineProperty(exports, "extractTitle", { enumerable: true, get: function () { return extract_1.extractTitle; } });
Object.defineProperty(exports, "extractCompany", { enumerable: true, get: function () { return extract_1.extractCompany; } });
Object.defineProperty(exports, "extractType", { enumerable: true, get: function () { return extract_1.extractType; } });
Object.defineProperty(exports, "extractPassoutYears", { enumerable: true, get: function () { return extract_1.extractPassoutYears; } });
Object.defineProperty(exports, "extractDegrees", { enumerable: true, get: function () { return extract_1.extractDegrees; } });
Object.defineProperty(exports, "extractWorkMode", { enumerable: true, get: function () { return extract_1.extractWorkMode; } });
Object.defineProperty(exports, "extractExperience", { enumerable: true, get: function () { return extract_1.extractExperience; } });
Object.defineProperty(exports, "extractIncentives", { enumerable: true, get: function () { return extract_1.extractIncentives; } });
Object.defineProperty(exports, "extractJobFunction", { enumerable: true, get: function () { return extract_1.extractJobFunction; } });
Object.defineProperty(exports, "extractWalkInDetails", { enumerable: true, get: function () { return extract_1.extractWalkInDetails; } });
var lite_1 = require("./lite");
Object.defineProperty(exports, "parseJobTextLite", { enumerable: true, get: function () { return lite_1.parseJobTextLite; } });
var normalize_1 = require("./normalize");
Object.defineProperty(exports, "normalizeSalary", { enumerable: true, get: function () { return normalize_1.normalizeSalary; } });
Object.defineProperty(exports, "normalizeExpiry", { enumerable: true, get: function () { return normalize_1.normalizeExpiry; } });
var url_parser_1 = require("./url-parser");
Object.defineProperty(exports, "UrlParser", { enumerable: true, get: function () { return url_parser_1.UrlParser; } });
const extract_2 = require("./extract");
const normalize_2 = require("./normalize");
/**
 * Parse raw job text and return all structured fields.
 * This is the unified entry point for all apps: ingestion, API, and mobile.
 */
function parseJobText(text) {
    const textLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const textLower = text.toLowerCase();
    const type = (0, extract_2.extractType)(textLower);
    const locations = (0, extract_2.extractLocations)(text);
    const skills = (0, extract_2.extractSkills)(text, locations);
    const salary = (0, normalize_2.normalizeSalary)(text);
    const experience = (0, extract_2.extractExperience)(text);
    const workMode = (0, extract_2.extractWorkMode)(text);
    const walkIn = type === 'WALKIN' ? (0, extract_2.extractWalkInDetails)(text, textLines) : {};
    return {
        title: (0, extract_2.extractTitle)(textLines),
        company: (0, extract_2.extractCompany)(text),
        type,
        locations,
        skills,
        allowedPassoutYears: (0, extract_2.extractPassoutYears)(text),
        allowedDegrees: (0, extract_2.extractDegrees)(text),
        isFresherOnly: textLower.includes('fresher') || textLower.includes('freshers'),
        workMode,
        isRemote: workMode === 'REMOTE',
        jobFunction: (0, extract_2.extractJobFunction)(textLower),
        incentives: (0, extract_2.extractIncentives)(text),
        salaryPeriod: salary.period,
        salaryMin: salary.min,
        salaryMax: salary.max,
        salaryRange: salary.range,
        experienceMin: experience.min,
        experienceMax: experience.max,
        expiresAt: (0, normalize_2.normalizeExpiry)(text),
        description: text.trim().substring(0, 2000),
        ...walkIn,
    };
}
