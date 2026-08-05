import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler';

export function validate(schema: z.ZodSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
                return next(new AppError(messages.join(', '), 400));
            }
            next(error);
        }
    };
}

