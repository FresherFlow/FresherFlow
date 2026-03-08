/**
 * Sentry observability for admin-mobile.
 *
 * SETUP STEPS:
 * 1. Install: npx expo install @sentry/react-native
 * 2. Run: npx @sentry/wizard@latest -i reactNative
 * 3. Set EXPO_PUBLIC_SENTRY_DSN in .env.local
 * 4. Uncomment the Sentry.init call below
 *
 * Until the package is installed this file exports no-op stubs
 * so the rest of the app can import from here safely.
 */

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Lazy initializer ─────────────────────────────────────────────────────────
// Called once from App.tsx before the root renders.
export function initSentry(): void {
    if (!SENTRY_DSN || !IS_PROD) return;
    try {
        // Uncomment after installing @sentry/react-native:
        // const Sentry = require('@sentry/react-native');
        // Sentry.init({
        //   dsn: SENTRY_DSN,
        //   tracesSampleRate: 0.2,
        //   enableNative: true,
        //   environment: 'production',
        //   integrations: [new Sentry.ReactNativeTracing()],
        // });
        console.log('[Sentry] DSN configured but package not yet installed — run: npx expo install @sentry/react-native');
    } catch (e) {
        console.warn('[Sentry] init failed', e);
    }
}

// ─── Manual capture helpers ───────────────────────────────────────────────────
export function captureException(error: unknown, context?: Record<string, unknown>): void {
    if (!IS_PROD) {
        console.error('[Sentry stub] captureException:', error, context);
        return;
    }
    try {
        // const Sentry = require('@sentry/react-native');
        // Sentry.captureException(error, { extra: context });
    } catch { /* ignore */ }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    if (!IS_PROD) {
        console.log(`[Sentry stub] captureMessage(${level}):`, message);
        return;
    }
    try {
        // const Sentry = require('@sentry/react-native');
        // Sentry.captureMessage(message, level);
    } catch { /* ignore */ }
}

export function setUserContext(_userId: string, _email?: string): void {
    try {
        // const Sentry = require('@sentry/react-native');
        // Sentry.setUser({ id: userId, email });
    } catch { /* ignore */ }
}

export function clearUserContext(): void {
    try {
        // const Sentry = require('@sentry/react-native');
        // Sentry.setUser(null);
    } catch { /* ignore */ }
}
