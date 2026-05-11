/**
 * Sentry observability for admin-mobile.
 *
 * This wrapper stays safe when the native package is missing, but it will
 * automatically use the real SDK when `@sentry/react-native` is installed.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const IS_PROD = process.env.NODE_ENV === 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentryModule: any;

function getSentry() {
    if (sentryModule !== undefined) return sentryModule;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        sentryModule = require('@sentry/react-native');
    } catch {
        sentryModule = null;
    }
    return sentryModule;
}

export function initSentry(): void {
    if (!SENTRY_DSN || !IS_PROD) return;
    try {
        const Sentry = getSentry();
        if (!Sentry) {
            console.log('[Sentry] DSN configured but package not installed yet.');
            return;
        }
        Sentry.init({
            dsn: SENTRY_DSN,
            tracesSampleRate: 0.2,
            enableNative: true,
            environment: 'production',
        });
    } catch (error) {
        console.warn('[Sentry] init failed', error);
    }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
    const Sentry = getSentry();
    if (!IS_PROD) {
        console.error('[Sentry stub] captureException:', error, context);
        return;
    }
    try {
        if (!Sentry) return;
        Sentry.captureException(error, { extra: context });
    } catch {
        // ignore instrumentation failures
    }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const Sentry = getSentry();
    if (!IS_PROD) {
        console.log(`[Sentry stub] captureMessage(${level}):`, message);
        return;
    }
    try {
        if (!Sentry) return;
        Sentry.captureMessage(message, level);
    } catch {
        // ignore instrumentation failures
    }
}

export function setUserContext(userId: string, email?: string): void {
    try {
        const Sentry = getSentry();
        if (!Sentry) return;
        Sentry.setUser({ id: userId, email });
    } catch {
        // ignore instrumentation failures
    }
}

export function clearUserContext(): void {
    try {
        const Sentry = getSentry();
        if (!Sentry) return;
        Sentry.setUser(null);
    } catch {
        // ignore instrumentation failures
    }
}
