import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');

const envSchema = z.object({
    NODE_ENV: nodeEnvSchema,
    PORT: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DIRECT_DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    FRONTEND_URL: z.string().optional(),
    FRONTEND_URLS: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    APP_MODE: z.enum(['user', 'admin', 'all']).default('all'),
}).superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'test' && !value.DATABASE_URL) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['DATABASE_URL'],
            message: 'Required',
        });
    }
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
