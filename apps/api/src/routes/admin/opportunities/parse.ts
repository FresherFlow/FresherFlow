import { Router, Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ParsedJob } from '@fresherflow/types';
import { AppError } from '../../../middleware/errorHandler';

const router = Router();

type ParserModule = {
    parseJobText: (text: string) => ParsedJob;
};

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
) => Promise<ParserModule>;

let parserModulePromise: Promise<ParserModule> | null = null;

function getParserModule(): Promise<ParserModule> {
    if (!parserModulePromise) {
        const bundledParserPath = path.resolve(__dirname, '../../../_vendor/parser/index.js');
        parserModulePromise = dynamicImport(pathToFileURL(bundledParserPath).href);
    }

    return parserModulePromise;
}

/**
 * POST /api/admin/opportunities/parse
 * Parse raw job text and return structured fields.
 */
router.post('/parse', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Text is required' });
        const { parseJobText } = await getParserModule().catch(() => {
            throw new AppError('Parser module is unavailable on this deployment.', 503);
        });
        const parsed = parseJobText(text);
        res.json({ parsed });
    } catch (error) {
        next(error);
    }
});

export default router;
