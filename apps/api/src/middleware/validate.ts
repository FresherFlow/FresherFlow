import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler';

export function validate(schema: { parseAsync: (data: unknown) => Promise<unknown> }) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Use the parsed output so Zod defaults/coercion and strict stripping
            // are applied to downstream handlers.
            req.body = await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // One entry per failing field, plus the same list as a sentence.
                // An empty path means the body itself was rejected (e.g. not an
                // object), so it is reported as `body` rather than as "" measures.
                const details = error.issues.map((issue) => ({
                    field: issue.path.join('.') || 'body',
                    message: issue.message,
                }));
                const messages = details.map((detail) => `${detail.field}: ${detail.message}`);
                return next(new AppError(messages.join(', '), 400, details));
            }
            next(error);
        }
    };
}

