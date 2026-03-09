import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().optional(),
    DATABASE_URL: z.string(),
    DIRECT_DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    FRONTEND_URL: z.string().optional(),
    FRONTEND_URLS: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    APP_MODE: z.enum(['user', 'admin', 'all']).default('all'),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
