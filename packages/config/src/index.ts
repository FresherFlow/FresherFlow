import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'production']).default('development');
const appModeSchema = z.preprocess((value) => {
    if (typeof value !== 'string') return value;

    const normalized = value.trim().toLowerCase();
    if (!normalized) return 'all';
    if (normalized === 'user' || normalized === 'admin' || normalized === 'all') return normalized;
    if (['both', 'full', 'combined'].includes(normalized)) return 'all';

    const collapsed = normalized.replace(/[\s,_-]+/g, '');
    if (collapsed === 'useradmin' || collapsed === 'adminuser') return 'all';

    const tokens = normalized
        .split(/[\s,|+/]+/)
        .map((token) => token.trim())
        .filter(Boolean);

    if (tokens.includes('user') && tokens.includes('admin')) return 'all';

    return normalized;
}, z.enum(['user', 'admin', 'all']).default('all'));

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
    APP_MODE: appModeSchema,
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    ENABLE_EMAIL_SENDING: z.preprocess((value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.toLowerCase().trim();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        }
        return true; // Default to true if missing or unparseable
    }, z.boolean().default(true)),
    ENABLE_WORKER_QUEUE_HEALTH: z.preprocess((value) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.toLowerCase().trim();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        }
        return true; // Default to true if missing or unparseable
    }, z.boolean().default(true)),
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
