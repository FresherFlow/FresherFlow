"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSkills = normalizeSkills;
exports.normalizeSkill = normalizeSkill;
const constants_1 = require("@fresherflow/constants");
const SLASH_KEEP_TOKENS = new Set([
    'ci/cd',
    'tcp/ip',
    'c/c++',
    'agile/scrum',
]);
function splitByDelimiters(value) {
    const rawParts = value
        .split(/[,;|]+/g)
        .map((part) => part.trim())
        .filter(Boolean);
    const expanded = [];
    for (const part of rawParts) {
        const lowered = part.toLowerCase();
        if (SLASH_KEEP_TOKENS.has(lowered)) {
            expanded.push(part);
            continue;
        }
        if (part.includes('/')) {
            const slashParts = part
                .split('/')
                .map((token) => token.trim())
                .filter(Boolean);
            if (slashParts.length > 1) {
                expanded.push(...slashParts);
                continue;
            }
        }
        expanded.push(part);
    }
    return expanded;
}
function normalizeSkills(skills) {
    if (!Array.isArray(skills))
        return [];
    const flattened = skills.flatMap((skill) => splitByDelimiters(String(skill)));
    return (0, constants_1.normalizeSkillList)(flattened);
}
function normalizeSkill(skill) {
    if (!skill)
        return '';
    return (0, constants_1.normalizeSkillName)(String(skill));
}
