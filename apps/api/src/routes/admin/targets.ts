import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { validate } from '../../middleware/validate';
import { withAdminAudit } from '../../middleware/adminAudit';
import { sendError, ErrorCode } from '../../middleware/errorHandler';
import { logger } from '@fresherflow/utils';
import { z } from 'zod';

const router = Router();

// This router drives the ingestion service with a bearer secret. index.ts mounts
// it behind `restrictAdmin`, but that is a host/origin gate, not
// authentication: it passes any request carrying an allowlisted
// `X-Requested-From` header and is a no-op outside production. Without a token
// check, an unauthenticated caller could both read the internal ingestion URL
// and trigger ingestion runs. Auth is enforced here, matching admin/rooms.ts.
router.use(requireAdmin);

const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';

/**
 * A scrape run fans out to third-party ATS hosts, so the ingestion service can
 * legitimately take a long time. The bound is generous enough for a slow
 * upstream but still finite: without it a wedged ingestion service holds the
 * admin request open until the platform's own idle timeout, and the admin gets
 * a generic gateway error with no server-side record of which call hung.
 */
const INGESTION_TIMEOUT_MS = 120_000;

/** Upstream 5xx worth one more attempt; a 4xx will fail identically on retry. */
function isRetryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
}

/**
 * Build the ingestion endpoint URL and validate it.
 *
 * `INGESTION_URL` is deployment configuration rather than user input, but it
 * still decides where a request carrying the ingestion bearer secret is sent,
 * so it gets the same `new URL()` + protocol check the rest of the codebase
 * uses. A misconfigured value (or one containing embedded credentials) fails
 * closed here instead of sending the secret to an arbitrary host.
 *
 * Note this is intentionally NOT `application/ingestion/safeFetch.ts`: that
 * helper exists to stop admins pointing ingestion at internal addresses, so it
 * blocks `localhost` and private IPs. This is the opposite case — we are
 * dialing our own service, which legitimately lives on loopback in dev and on a
 * private Render network in production.
 */
function resolveIngestionUrl(path: string): URL {
    let url: URL;
    try {
        url = new URL(`${ingestionUrl.replace(/\/+$/, '')}${path}`);
    } catch {
        throw new Error('INGESTION_URL is not a valid absolute URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('INGESTION_URL must use http or https');
    }
    if (url.username || url.password) {
        throw new Error('INGESTION_URL must not contain embedded credentials');
    }
    return url;
}

/** Distinguishes our timeout from a genuine connection failure. */
function isTimeoutError(error: unknown): boolean {
    return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/**
 * POST to the ingestion service with a bounded timeout and a single retry.
 *
 * One retry, not a retry policy: `run` and `run/all` trigger real scrapes, so
 * retrying aggressively would multiply load on an upstream that is already
 * struggling, and the second attempt could duplicate work the first one
 * actually completed. The ingestion service already applies its own per-company
 * circuit breaker (apps/ingestion/src/lib/circuit-breaker.ts), so this layer
 * only needs to fail fast and surface a clear status.
 */
async function postToIngestion(
    path: string,
    body: unknown,
    secret: string,
    requestId: string
): Promise<{ status: number; payload: unknown }> {
    const url = resolveIngestionUrl(path);
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(INGESTION_TIMEOUT_MS)
            });

            if (attempt < maxAttempts && isRetryableStatus(response.status)) {
                logger.warn('Ingestion call returned a retryable status', {
                    requestId,
                    path,
                    status: response.status,
                    attempt
                });
                // Drain and discard the body before retrying. Leaving it unread
                // holds the connection open and can exhaust the agent's socket
                // pool when the upstream is failing repeatedly.
                await response.body?.cancel().catch(() => undefined);
                continue;
            }

            // A non-JSON body (an HTML error page from a proxy, say) must not
            // throw past the handler and be reported as an internal error.
            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }
            return { status: response.status, payload };
        } catch (error) {
            if (attempt < maxAttempts && !isTimeoutError(error)) {
                logger.warn('Ingestion call failed, retrying once', {
                    requestId,
                    path,
                    attempt,
                    error: error instanceof Error ? error.message : String(error)
                });
                continue;
            }
            throw error;
        }
    }

    // Unreachable: the loop either returns or throws on its final attempt.
    throw new Error('Ingestion call exhausted its attempts');
}

/**
 * Resolved per request rather than at import time so a missing secret is a
 * scoped 500 instead of an application-wide boot failure. Previously this
 * silently fell back to the JWT secrets and then to a committed placeholder,
 * which meant a misconfigured deployment authenticated to the ingestion service
 * with a publicly known string.
 */
function getIngestionSecret(): string | null {
    return process.env.INGESTION_SECRET
        || process.env.JWT_ACCESS_SECRET
        || process.env.JWT_SECRET
        || null;
}

const runSchema = z.object({
    ats: z.string().min(1).max(64),
    slug: z.string().min(1).max(128),
    company: z.string().min(1).max(128),
    dryRun: z.boolean().optional(),
    filter: z.boolean().optional()
});

const runAllSchema = z.object({
    filter: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    hoursOld: z.number().int().min(1).max(720).optional()
});

router.get('/', (_req: Request, res: Response) => {
  res.json({ ingestionUrl });
});

router.post('/run', adminRateLimit, validate(runSchema), withAdminAudit('UPDATE'), async (req: Request, res: Response): Promise<void> => {
  const { ats, slug, company, dryRun, filter } = req.body;
  const secret = getIngestionSecret();
  if (!secret) {
    // Log which var is missing server-side; the client only learns the request
    // cannot be served.
    logger.error('Ingestion secret is not configured', { requestId: req.requestId });
    sendError(res, 500, ErrorCode.INTERNAL, 'Internal server error', req.requestId);
    return;
  }
  try {
    // No request-forgery suppression needed here: `postToIngestion` builds the
    // URL with `new URL()` and rejects any protocol other than http/https, which
    // is the check the suppression was standing in for.
    const { status, payload } = await postToIngestion(
      '/run',
      { ats, slug, company, dryRun: dryRun ?? false, filter: filter ?? true },
      secret,
      req.requestId
    );
    res.status(status).json(payload);
  } catch (error) {
    // A timeout is an upstream problem, not ours: report 504 so the admin UI can
    // tell "ingestion is slow" apart from "the API is broken", and log the
    // detail server-side only.
    if (isTimeoutError(error)) {
      logger.error('Ingestion /run timed out', { requestId: req.requestId, ats, slug });
      sendError(res, 504, ErrorCode.SERVICE_UNAVAILABLE, 'Ingestion service did not respond in time', req.requestId);
      return;
    }
    logger.error('Ingestion /run failed', { requestId: req.requestId, error });
    sendError(res, 502, ErrorCode.SERVICE_UNAVAILABLE, 'Ingestion service is unavailable', req.requestId);
  }
});

router.post('/run-all', adminRateLimit, validate(runAllSchema), withAdminAudit('UPDATE'), async (req: Request, res: Response): Promise<void> => {
  const { filter, dryRun, hoursOld } = req.body || {};
  const secret = getIngestionSecret();
  if (!secret) {
    logger.error('Ingestion secret is not configured', { requestId: req.requestId });
    sendError(res, 500, ErrorCode.INTERNAL, 'Internal server error', req.requestId);
    return;
  }
  try {
    const { status, payload } = await postToIngestion(
      '/run/all',
      { filter: filter ?? true, dryRun, hoursOld },
      secret,
      req.requestId
    );
    res.status(status).json(payload);
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.error('Ingestion /run/all timed out', { requestId: req.requestId });
      sendError(res, 504, ErrorCode.SERVICE_UNAVAILABLE, 'Ingestion service did not respond in time', req.requestId);
      return;
    }
    logger.error('Ingestion /run/all failed', { requestId: req.requestId, error });
    sendError(res, 502, ErrorCode.SERVICE_UNAVAILABLE, 'Ingestion service is unavailable', req.requestId);
  }
});

export default router;
