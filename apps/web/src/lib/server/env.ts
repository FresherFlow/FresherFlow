/**
 * Server-only environment, read exactly once.
 *
 * This is the single home for every `process.env` name the server side reads.
 * Route handlers, proxy helpers and server-only libs import a named constant
 * from here instead of touching `process.env` directly, so a setting has one
 * name, one precedence rule and one place to change.
 *
 * Mirrors the reference pattern in `bluesky-social-app/src/env/common.ts`: the
 * env module is the only file that reads the environment, and every consumer
 * imports a typed constant.
 *
 * Never import this from a Client Component. These are server-only names; Next
 * does not inline them into the browser bundle, so they would read as
 * `undefined` and silently misconfigure the client.
 */

/** Trim, and strip the surrounding quotes some deployments store in the value. */
function clean(value: string | undefined): string {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function cleanUrl(value: string | undefined): string {
  return clean(value).replace(/\/+$/, '');
}

// ── Ingestion service ────────────────────────────────────────────────────────
// Precedence preserved from the three call sites that used to repeat it:
// `INGESTION_SERVICE_URL`, then `NEXT_PUBLIC_INGESTION_URL`, then the bare
// `INGESTION_URL` alias.
export const INGESTION_URL = cleanUrl(
  process.env.INGESTION_SERVICE_URL ||
  process.env.NEXT_PUBLIC_INGESTION_URL ||
  process.env.INGESTION_URL,
);

export const INGESTION_SECRET = clean(
  process.env.INGESTION_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET,
);

/** Developer fallback for the ingestion service; never used in production. */
export const LOCAL_INGESTION_URL = 'http://localhost:3005';

// ── Social worker proxy ──────────────────────────────────────────────────────
export const WORKER_URL = clean(process.env.WORKER_URL);
export const WORKER_SECRET = clean(process.env.WORKER_SECRET);

// ── Auth cookies ─────────────────────────────────────────────────────────────
/** Shared parent-domain cookie scope. Unset means host-only cookies. */
export const COOKIE_DOMAIN = clean(process.env.COOKIE_DOMAIN) || undefined;

/**
 * Whether any admin JWT signing secret is configured.
 *
 * Detection only — the secret itself is never read here. Matches the precedence
 * in `packages/utils/src/auth.ts` (`JWT_ADMIN_SECRET`, else `JWT_ACCESS_SECRET`,
 * else `JWT_SECRET`). Keep the two in sync.
 */
export const HAS_ADMIN_SIGNING_SECRET = [
  process.env.JWT_ADMIN_SECRET,
  process.env.JWT_ACCESS_SECRET,
  process.env.JWT_SECRET,
].some((value) => typeof value === 'string' && value.trim().length > 0);

// ── ISR revalidation webhook ─────────────────────────────────────────────────
export const REVALIDATE_SECRET_TOKEN = clean(process.env.REVALIDATE_SECRET_TOKEN);

// ── Cloudflare R2 (server-side JSON reads) ───────────────────────────────────
export const R2_ENDPOINT = clean(process.env.R2_ENDPOINT);
export const R2_ACCESS_KEY_ID = clean(process.env.R2_ACCESS_KEY_ID);
export const R2_SECRET_ACCESS_KEY = clean(process.env.R2_SECRET_ACCESS_KEY);
export const R2_BUCKET_NAME = clean(process.env.R2_BUCKET_NAME);

/** True only when the full read credential set is present. */
export const HAS_R2_READ = Boolean(
  R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME,
);

// ── Basic auth on cap./disco. subdomains ─────────────────────────────────────
export const BASIC_AUTH_USER = clean(process.env.BASIC_AUTH_USER);
export const BASIC_AUTH_PASSWORD = clean(process.env.BASIC_AUTH_PASSWORD);

// ── Firebase Admin ───────────────────────────────────────────────────────────
export const FIREBASE_ADMIN_PROJECT_ID =
  clean(process.env.FIREBASE_PROJECT_ID) ||
  clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
export const FIREBASE_ADMIN_CLIENT_EMAIL = clean(process.env.FIREBASE_CLIENT_EMAIL);
export const FIREBASE_ADMIN_PRIVATE_KEY = clean(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');

/** True only when a usable service-account credential is present. */
export const HAS_FIREBASE_ADMIN_CREDENTIALS = Boolean(
  FIREBASE_ADMIN_PROJECT_ID && FIREBASE_ADMIN_CLIENT_EMAIL && FIREBASE_ADMIN_PRIVATE_KEY,
);
