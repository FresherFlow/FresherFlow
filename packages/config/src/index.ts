import { z } from 'zod';

function parseBooleanEnv(value: unknown, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return defaultValue;
}

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
    JWT_ACCESS_SECRET: z.string().default(''),
    JWT_REFRESH_SECRET: z.string().default(''),
    FRONTEND_URL: z.string().optional(),
    FRONTEND_URLS: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    APP_MODE: appModeSchema,
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    ENABLE_EMAIL_SENDING: z.preprocess((value) => parseBooleanEnv(value, true), z.boolean().default(true)),
    ENABLE_WORKER_QUEUE_HEALTH: z.preprocess((value) => parseBooleanEnv(value, true), z.boolean().default(true)),
    ENABLE_WORKER_DEEP_HEALTH: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    ENABLE_PUSH_NOTIFICATIONS: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    ENABLE_TELEGRAM_BROADCAST: z.preprocess((value) => parseBooleanEnv(value, true), z.boolean().default(true)),
    ENABLE_SOCIAL_POSTING: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    ENABLE_LINK_VERIFICATION: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    ENABLE_INGESTION: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    ENABLE_CRON_TASKS: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
    REDIS_ENABLED: z.preprocess((value) => parseBooleanEnv(value, true), z.boolean().default(true)),
    IS_API: z.preprocess((value) => parseBooleanEnv(value, false), z.boolean().default(false)),
}).superRefine((value, ctx) => {


    if (value.NODE_ENV !== 'test' && value.IS_API) {
        if (!value.JWT_ACCESS_SECRET || value.JWT_ACCESS_SECRET === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['JWT_ACCESS_SECRET'],
                message: 'Required when running as API',
            });
        }
        if (!value.JWT_REFRESH_SECRET || value.JWT_REFRESH_SECRET === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['JWT_REFRESH_SECRET'],
                message: 'Required when running as API',
            });
        }
    }
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
