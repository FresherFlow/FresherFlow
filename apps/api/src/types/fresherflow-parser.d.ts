declare module '@fresherflow/parser' {
    import type { ParsedJob } from '@fresherflow/types';

    export function parseJobText(text: string): ParsedJob;
}
