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
    JWT_SECRET: z.string().optional(),
    JWT_ACCESS_SECRET: z.preprocess(
        (val) => (typeof val === 'string' && val ? val : process.env.JWT_SECRET || ''),
        z.string().default('')
    ),
    JWT_REFRESH_SECRET: z.preprocess(
        (val) => (typeof val === 'string' && val ? val : process.env.JWT_SECRET || ''),
        z.string().default('')
    ),
    JWT_ADMIN_SECRET: z.preprocess(
        (val) => (typeof val === 'string' && val ? val : process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || ''),
        z.string().default('')
    ),
    INGESTION_SECRET: z.string().optional(),
    INGESTION_URL: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    FRONTEND_URLS: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    APP_MODE: appModeSchema,
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    ENABLE_EMAIL_SENDING: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    ENABLE_PUSH_NOTIFICATIONS: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    ENABLE_TELEGRAM_BROADCAST: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    ENABLE_SOCIAL_POSTING: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    ENABLE_CRON_TASKS: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    ENABLE_INGESTION: z.preprocess((val) => parseBooleanEnv(val, true), z.boolean().default(true)),
    REDIS_ENABLED: z.preprocess(
        (val) => parseBooleanEnv(val, true),
        z.boolean().default(true)
    ),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(customEnv?: Record<string, unknown>): Env {
    const result = envSchema.safeParse(customEnv || process.env);
    if (!result.success) {
        console.error('Invalid environment variables:', result.error.format());
        throw new Error('Invalid environment variables');
    }
    _env = result.data;
    return _env;
}

export const env = new Proxy({} as Env, {
    get(_target, prop: string) {
        if (!_env) {
            _env = validateEnv();
        }
        return _env[prop as keyof Env];
    }
});
