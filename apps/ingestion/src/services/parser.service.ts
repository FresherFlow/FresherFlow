import { parseJobText } from '@fresherflow/parser';

/**
 * Bridge service for the ingestion app to use the shared @fresherflow/parser package.
 */
export class ParserService {
    static parse(text: string) {
        return parseJobText(text);
    }
}
