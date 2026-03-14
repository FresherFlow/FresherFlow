import { Router, Request, Response, NextFunction } from 'express';
import { parseJobText } from '@fresherflow/parser';

const router = Router();

/**
 * POST /api/admin/opportunities/parse
 * Parse raw job text and return structured fields.
 */
router.post('/parse', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ message: 'Text is required' });
        const parsed = parseJobText(text);
        res.json({ parsed });
    } catch (error) {
        next(error);
    }
});

export default router;
