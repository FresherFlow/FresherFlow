import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';

const project_id = process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '') || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '');
const client_email = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, '');
const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n');

/**
 * Whether this deployment actually holds a service-account credential.
 *
 * The Admin SDK never fails fast when it lacks one. An app initialised without
 * a `credential` falls back to Application Default Credentials, which probes the
 * GCE metadata server (`169.254.169.254`) and retries with backoff. On a
 * non-GCE host that probe never answers, so the read stays pending for roughly
 * a minute before rejecting:
 *
 *   @firebase/database: FIREBASE WARNING: {"code":"app/invalid-credential",
 *   "message":"Could not load the default credentials"}
 *
 * `try/catch` does not help — nothing has thrown yet. A server component that
 * reads RTDB during `next build` therefore overruns the 60s per-page export
 * budget, gets retried three times, and takes the whole build down:
 *
 *   Failed to build /(public)/jobs/[slug]/page after 3 attempts.
 *   Export encountered an error, exiting the build.
 *
 * Callers must therefore ask before they read. See `requireAdminDatabase()`.
 */
export const hasAdminCredentials = Boolean(project_id && client_email && private_key);

const apps = getApps();
let app: App;

if (apps.length === 0) {
    if (hasAdminCredentials) {
        app = initializeApp({
            credential: cert({
                projectId: project_id,
                clientEmail: client_email,
                privateKey: private_key,
            }),
            databaseURL: `https://${project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    } else {
        const pid = project_id || 'fresherflow-dev-staging';
        if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = pid;
        app = initializeApp({
            projectId: pid,
            databaseURL: `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    }
} else {
    app = apps[0];
}

export const auth = getAuth(app);
export default app;

/**
 * The admin RTDB handle, or `null` when this deployment holds no credential.
 *
 * Returning `null` — rather than a handle that hangs — is the entire point.
 * Every RTDB read on the server belongs behind this, so a deployment without
 * admin credentials degrades to a fallback in microseconds instead of stalling
 * a build for minutes. A client-facing deployment holding no service-account
 * key is the expected case, not an error.
 */
export function requireAdminDatabase(): Database | null {
    if (!hasAdminCredentials) return null;
    return getDatabase(app);
}
