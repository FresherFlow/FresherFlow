/**
 * @deprecated Use `@fresherflow/parser` instead.
 * This file is kept for backward compatibility during migration.
 * All logic has moved to packages/parser/src/index.ts
 */
type ParsedJob = Record<string, unknown>;

type ParserApi = {
    parseJobText: (text: string) => ParsedJob;
    extractSkills: (text: string, locations?: string[]) => string[];
    extractLocations: (text: string) => string[];
    normalizeSalary: (text: string) => unknown;
};

// Use runtime resolution here so utils does not need parser's built typings to exist first.
// That keeps clean Turbo builds stable on Linux deploy environments.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const parser = require('@fresherflow/parser') as ParserApi;

export const parseJobText = parser.parseJobText;
export const extractSkills = parser.extractSkills;
export const extractLocations = parser.extractLocations;
export const normalizeSalary = parser.normalizeSalary;
export type { ParsedJob };
