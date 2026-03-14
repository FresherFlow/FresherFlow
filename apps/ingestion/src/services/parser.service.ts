/**
 * @deprecated Use `@fresherflow/parser` instead.
 * This file is kept for backward compatibility during migration.
 * All logic has moved to packages/parser/src/index.ts
 */
import { parseJobText } from '@fresherflow/parser';
export type { ParsedJob as ParsedSignature } from '@fresherflow/parser';

export class ParserService {
    static parse(text: string) {
        return parseJobText(text);
    }
}

export const parse = parseJobText;
