import { Router, Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ParsedJob } from '@fresherflow/types';

const router = Router();

type ParserModule = {
    parseJobText: (text: string) => ParsedJob;
};

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
) => Promise<ParserModule>;

const parserModulePromise: Promise<ParserModule> = dynamicImport(
    pathToFileURL(path.resolve(process.cwd(), '../../packages/parser/dist/index.js')).href
);

/**
 * POST /api/admin/opportunities/parse
 * Parse raw job text and return structured fields.
 */
router.post('/parse', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Text is required' });
        const { parseJobText } = await parserModulePromise;
        const parsed = parseJobText(text);
        res.json({ parsed });
    } catch (error) {
        next(error);
    }
});

export default router;
