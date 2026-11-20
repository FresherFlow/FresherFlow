import './bootstrap';


import fs from 'fs';
import path from 'path';

import express, { Application, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { env } from '@fresherflow/utils';
import { logger, setupCleanLogging } from '@fresherflow/utils';
import { ensureDomainHost } from './middleware/ensureDomain';
import { getAdminHost, getRootDomainHost } from './utils/runtimeConfig';
// redis not used here
import { observabilityMiddleware } from './middleware/observability';
import httpLogger from './middleware/httpLogger';

setupCleanLogging();

import { csrfGate } from './middleware/csrf';

import { optionalAuth } from './middleware/auth';
// Import routes
import authRoutes from './routes/auth';
import authTwoFactorRoutes from './routes/authTwoFactor';
import authPasskeysRoutes from './routes/authPasskeys';
import profileRoutes from './routes/profile';
import opportunitiesRoutes from './routes/opportunities';
import actionsRoutes from './routes/actions';
import applicationsRoutes from './routes/applications';
import feedbackRoutes from './routes/feedback';
import appFeedbackRoutes from './routes/appFeedback';
import savedRoutes from './routes/saved';
import dashboardRoutes from './routes/dashboard';
import alertsRoutes from './routes/alerts';
import adminAuthRoutes from './routes/admin/auth';
import adminOpportunitiesRoutes from './routes/admin/opportunities';
import internalMcpListingRoutes from './routes/internal/mcp/listings';
import internalMcpContributionRoutes from './routes/internal/mcp/contributions';
import oauthRoutes from './routes/oauth';
import { mcpSurfaceAuth } from './middleware/mcpAccessToken';
import adminFeedbackRoutes from './routes/admin/feedback';
import adminAppFeedbackRoutes from './routes/admin/appFeedback';
import adminSystemRoutes from './routes/admin/system';
import adminAnalyticsRoutes from './routes/admin/analytics';
import adminTotpRoutes from './routes/admin/totp';
import adminSocialRoutes from './routes/admin/social';
import adminQueuesRoutes from './routes/admin/queues';
import adminPushRoutes from './routes/admin/push';
import adminUsersRoutes from './routes/admin/users';
import adminModeratorsRoutes from './routes/admin/moderators';
import adminAuditRoutes from './routes/admin/audit';
import adminReportsRoutes from './routes/admin/reports';
import adminCommunityRoutes from './routes/admin/community';
import adminModerationRoutes from './routes/admin/moderation';
import adminTrustRoutes from './routes/admin/trust';
import adminNotificationsRoutes from './routes/admin/notifications';
import adminRoomsRoutes from './routes/admin/rooms';
import adminTargetsRoutes from './routes/admin/targets';
import adminProfilesRoutes from './routes/admin/profiles';
import adminIngestionRoutes from './routes/admin/ingestion';
import healthRoutes from './routes/public/health';
import readyRoutes from './routes/public/ready';
import companyRoutes from './routes/public/companies';
import sitemapRoutes from './routes/public/sitemap';
import cronRoutes from './routes/cron';
import referralRoutes from './routes/referrals';
import contributorsRoutes from './routes/public/contributors';
import followsRoutes from './routes/follows';
import joblinksRoutes from './routes/public/joblinks';
import usernameRoutes from './routes/username';
import publicStatsRoutes from './routes/public/stats';
import resourcesRoutes from './routes/resources';
import deviceTokenRoutes from './routes/deviceToken';
import { StorageService } from './infrastructure/services/platform/storage.service';
import { StaticFeedService } from './infrastructure/services/opportunity/staticFeed.service';
import { initializeQueueListeners } from './infrastructure/services/alerts/push-notification.service';
import { installShutdownHandlers, markReady } from './utils/readiness';

import adminGovernmentJobsRoutes from './routes/admin/governmentJobs';
import adminResourcesRoutes from './routes/admin/resources';
import publicGovernmentJobsRoutes from './routes/public/governmentJobs';
import publicProfilesRoutes from './routes/public/profiles';
import expireJobsRoute from './routes/pipeline/expireJobs';
import pipelineRoutes from './routes/pipeline/index';
import organizationsRoutes, { inviteRouter } from './routes/organizations';
import recruiterCandidatesRoutes from './routes/recruiterCandidates';
import candidateInterestsRoutes from './routes/candidateInterests';
import candidateProjectsRoutes from './routes/candidateProjects';
import communityJobsRouter from './routes/community/jobs';
import communityNotificationsRouter from './routes/community/notifications';
import communityDiscussionActivityRouter from './routes/community/discussionActivity';
import communityUsersRouter from './routes/community/users';
import communityPostsRouter from './routes/community/communityPosts';
import communityInterviewsRouter from './routes/community/interviews';
import communityUpdatesRouter from './routes/community/updates';
import communityRoomsRouter from './routes/community/rooms';
import fresherNeedsRouter from './routes/fresherNeeds';
import ingestRouter from './routes/ingest';

const app: Application = express();
let isAppReady = false;
const PORT = env.PORT || 5000;
const APP_MODE = env.APP_MODE;
const isUserMode = APP_MODE === 'all' || APP_MODE === 'user';
const isAdminMode = APP_MODE === 'all' || APP_MODE === 'admin';
const rootDomainHost = getRootDomainHost();

function extractClientIp(req: express.Request): string {
    // `req.ip` is resolved through Express's explicitly configured trusted-proxy
    // chain. Reading forwarding headers directly lets callers forge a fresh
    // rate-limit key on every request. Bucket IPv6 clients by subnet to prevent
    // trivial address rotation from bypassing per-IP limits.
    const raw = (req.ip || req.socket.remoteAddress || 'unknown').trim().replace(/^::ffff:/, '');
    return raw === 'unknown' ? raw : ipKeyGenerator(raw);
}

// Trust proxy for Render/Vercel/Load Balancers
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Request ID (must be first for logging)
app.use(requestIdMiddleware);

// HTTP Request Logging (colorful!)
app.use(httpLogger);

// Security
app.use(helmet());

// Cookies

// codeql[js/missing-csrf-middleware]
// lgtm[js/missing-csrf-middleware]
app.use(cookieParser());

function normalizeOrigin(value: string): string | null {
    const trimmed = value.split(',')[0].trim();
    if (!trimmed) return null;
    try {
        return new URL(trimmed).origin;
    } catch {
        try {
            return new URL(`https://${trimmed}`).origin;
        } catch {
            return null;
        }
    }
}

// CORS allowlist:
// - explicit entries from env
// - safe defaults for local dev
// - optional wildcard for fresherflow subdomains in production
const configuredOrigins = [
    ...(env.FRONTEND_URLS || '').split(','),
    ...(env.FRONTEND_URL || '').split(','),
    'http://localhost:3000',
    'http://localhost:3001'
]
    .flatMap((value) => (value || '').split(','))
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

const allowedOrigins = new Set(configuredOrigins);
const allowManagedSubdomains = Boolean(rootDomainHost);

function isAllowedOrigin(origin: string): boolean {
    const normalized = normalizeOrigin(origin);
    if (!normalized) return false;
    if (allowedOrigins.has(normalized)) return true;

    try {
        const parsed = new URL(normalized);
        const host = parsed.hostname.toLowerCase();

        // Strictly allow localhost / 127.0.0.1 on ports 3000, 3001, or default ports for local development
        if (host === 'localhost' || host === '127.0.0.1') {
            const port = parsed.port;
            return port === '3000' || port === '3001' || port === '';
        }

        if (!allowManagedSubdomains || !rootDomainHost) return false;
        return parsed.protocol === 'https:' && (host === rootDomainHost || host.endsWith(`.${rootDomainHost}`));
    } catch {
        return false;
    }
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        logger.warn('CORS blocked request origin', { origin, mode: APP_MODE });
        return callback(null, false); // Return false instead of error to avoid crashing req
    },
    credentials: true,
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Refresh-Token',
        'X-Requested-With',
        'X-Requested-From',
        'X-Request-Id',
        'sentry-trace',
        'baggage',
        'Cache-Control',
        'Pragma'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'WWW-Authenticate'],
    maxAge: 3600 // Cache preflight for 1 hour
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// observabilityMiddleware
app.use(observabilityMiddleware);

// Lightweight Health Check (Zero-DB, Zero-Auth)
app.use('/api', healthRoutes);

// Readiness probe. Mounted BEFORE the isAppReady gate below on purpose: that
// gate answers 503 with a generic "Service initializing..." body, which is the
// opposite of what a probe needs. /ready has to run its own dependency check
// and report a structured verdict while the app is still starting up.
app.use('/api', readyRoutes);

// Readiness Middleware for all other routes
app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/api/health') return next();
    if (req.path === '/ready' || req.path === '/api/ready') return next();
    if (!isAppReady) {
        return res.status(503).json({ error: { message: 'Service initializing...' } });
    }
    next();
});

// Rate Limiting
const defaultLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // 200 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => extractClientIp(req),
    skip: (req) =>
        req.path === '/api/auth/me'
        || req.path === '/api/admin/auth/me'
        // MCP and OAuth already have dedicated per-user / per-route limiters
        // downstream. Counting them in this shared per-IP bucket lets retries
        // from one connection exhaust the budget of every other connection
        // behind the same egress IP, which surfaces as an unexplained 429.
        || req.path.startsWith('/api/internal/mcp/')
        || req.path.startsWith('/oauth/')
        || req.path === '/api/auth/refresh',
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: extractClientIp(req),
            path: req.path,
            requestId: req.requestId
        });
        res.status(429).json({
            error: {
                message: 'Too many requests, please try again later',
                requestId: req.requestId
            }
        });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 login attempts (Relaxed for dev)
    keyGenerator: (req) => extractClientIp(req),
    skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 registrations (Relaxed for dev)
    keyGenerator: (req) => extractClientIp(req)
});

// Session-check endpoints are called frequently by edge middleware and app bootstrap.
const sessionCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    keyGenerator: (req) => extractClientIp(req),
    standardHeaders: true,
    legacyHeaders: false
});

// Apply default rate limiting
app.use(defaultLimiter);
if (isUserMode) {
    app.use('/api/public/stats', publicStatsRoutes);
    app.use('/api/cron', cronRoutes);
    app.use('/api/pipeline', expireJobsRoute);
    // Phase 12 hiring pipelines. Mounted as a sibling on the same prefix:
    // expireJobsRoute owns its own job-expiry paths and is untouched, while this
    // router handles /organizations, /stages and /applications under it.
    app.use('/api/pipeline', pipelineRoutes);
}

// ============================================================================
// ============================================================================
// Middleware Setup
// ============================================================================

// CSRF Protection (Gate)
app.use(csrfGate);

// Rate Limiting moved up
if (isUserMode) {
    app.use('/api/auth/me', sessionCheckLimiter);
}
if (isAdminMode) {
    app.use('/api/admin/auth/me', sessionCheckLimiter);
}

// ============================================================================
// Routes
// ============================================================================

// Health check
app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Quiet fallback endpoints for bot hits that commonly target the API domain
app.get('/', (_req, res) => {
    res.status(200).send('FresherFlow API');
});

app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
});

app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /');
});

/**
 * Feed artifacts change on publish/expire, not on a clock, but these routes
 * regenerate from Postgres on every request. Without a shared cache window,
 * every visitor and every crawler becomes a full-table read. 60s matches the
 * db-mode revalidate default; stale-while-revalidate absorbs a burst without
 * making a request wait for the rebuild.
 */
const FEED_ARTIFACT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

/**
 * Serves a prebuilt artifact with the shared cache policy.
 * Returns false when the snapshot does not exist, so the caller can generate.
 * `headers` is passed to sendFile because express otherwise writes its own
 * `Cache-Control: public, max-age=0`, which defeats the point.
 */
function sendFeedArtifactFile(res: Response, filePath: string): boolean {
    if (!fs.existsSync(filePath)) return false;
    // Set it twice on purpose: the pre-set is what a caller sees if sendFile
    // bails, and `headers` wins over the `max-age=0` express would otherwise
    // derive from its default maxAge option.
    res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
    res.sendFile(filePath, {
        maxAge: 60_000,
        headers: { 'Cache-Control': FEED_ARTIFACT_CACHE_CONTROL },
    });
    return true;
}

/**
 * Read catalog artifacts that are maintained outside the opportunity tables.
 * R2 is the canonical copy in production; the checked-out public artifact is
 * a local-development fallback. Parsing before sending catches a broken object
 * instead of returning a successful response with an unusable payload.
 */
async function sendStoredJsonArtifact(res: Response, key: string, filePath: string): Promise<boolean> {
    const content = await StorageService.fetchFromR2(key) ?? StorageService.readLocalFile(filePath);
    if (content === null) return false;

    try {
        JSON.parse(content);
    } catch (error) {
        logger.error(`Stored feed artifact is not valid JSON: ${key}`, error);
        return false;
    }

    res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
    res.type('application/json').send(content);
    return true;
}

app.get('/feeds/bootstrap-feed.min.json', async (req, res) => {
    try {
        // FEED_SOURCE=db forces generation from Postgres on every request,
        // bypassing any cached static file. Postgres is the source of truth.
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'bootstrap-feed.min.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        // Generated live from Postgres
        const results = await StaticFeedService.generateBootstrapFeed();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);

        // Background refresh to (re)create the static file (CDN path only)
        if (!serveFromDb) StaticFeedService.scheduleRefresh();
    } catch (error) {
        logger.error('Failed to serve bootstrap feed', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/feeds/government-feed.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'government-feed.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;
        const results = await StaticFeedService.generateGovernmentFeed();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve government feed', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

// FEED_SOURCE=db read path: the same feeds the CDN serves, generated live
// from Postgres instead of a prebuilt snapshot.
app.get('/feeds/feed-index.json', async (_req, res) => {
    try {
        // Serve the snapshot when one exists. This route used to regenerate on
        // every request even in CDN mode, so the single most-requested feed was
        // also the most expensive one to answer.
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'feed-index.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        const results = await StaticFeedService.generateFeedIndex();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve feed index', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/feeds/expired-feed.min.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'expired-feed.min.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        const results = await StaticFeedService.generateExpiredFeed();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve expired feed', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/meta/feed-version.json', async (_req, res) => {
    // The web reader uses this sentinel in DB mode to skip version lookup. Keep
    // the route contract complete for other consumers and prevent intermediaries
    // from pinning the sentinel if the source mode changes during a rollout.
    if (process.env.FEED_SOURCE === 'db') {
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ version: 'db', stable: true });
    }

    try {
        const filePath = path.join(process.cwd(), 'public', 'meta', 'feed-version.json');
        if (await sendStoredJsonArtifact(res, 'meta/feed-version.json', filePath)) return;
        return res.status(503).json({ error: { message: 'Feed version unavailable' } });
    } catch (error) {
        logger.error('Failed to serve feed version', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/jobs/:id.json', async (req, res) => {
    try {
        const { id } = req.params;
        // id is a uuid or slug; reject anything else before it reaches the DB.
        if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
            return res.status(400).json({ error: { message: 'Invalid opportunity id' } });
        }

        const detail = await StaticFeedService.generateOpportunityDetail(id);
        if (!detail) {
            return res.status(404).json({ error: { message: 'Opportunity not found' } });
        }
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(detail);
    } catch (error) {
        logger.error('Failed to serve opportunity detail', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/companies.json', async (_req, res) => {
    try {
        const results = await StaticFeedService.generateCompaniesMetadata();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve companies metadata', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/skills.json', async (_req, res) => {
    try {
        const results = await StaticFeedService.generateSkillsMetadata();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve skills metadata', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

// These catalog files are maintained by ingestion metadata sync rather than
// derived from the Opportunity tables. Serve the canonical R2 artifact in
// FEED_SOURCE=db mode, with the checked-out copy available for local development.
app.get('/education.json', async (_req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'education.json');
        if (await sendStoredJsonArtifact(res, 'education.json', filePath)) return;
        return res.status(503).json({ error: { message: 'Education metadata unavailable' } });
    } catch (error) {
        logger.error('Failed to serve education metadata', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/cities.json', async (_req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'cities.json');
        if (await sendStoredJsonArtifact(res, 'cities.json', filePath)) return;
        return res.status(503).json({ error: { message: 'Cities metadata unavailable' } });
    } catch (error) {
        logger.error('Failed to serve cities metadata', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/meta/company-slug-history.json', async (_req, res) => {
    try {
        const filePath = path.join(process.cwd(), 'public', 'meta', 'company-slug-history.json');
        if (await sendStoredJsonArtifact(res, 'meta/company-slug-history.json', filePath)) return;
        // Slug history is durable state: an empty default could turn previously
        // indexed company URLs into 404s, so surface a missing artifact clearly.
        return res.status(503).json({ error: { message: 'Company history unavailable' } });
    } catch (error) {
        logger.error('Failed to serve company slug history', error);
        return res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/meta/stats.json', async (_req, res) => {
    try {
        const results = await StaticFeedService.generateStats();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve feed stats', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

// ---------------------------------------------------------------------------
// Remaining db-mode artifacts.
//
// The CDN is served from R2, so in cdn mode these routes only ever read the
// local snapshot (or 404 on a stateless deploy). FEED_SOURCE=db generates them
// from Postgres instead, which is what makes local development and a
// pre-CDN deployment work without any CDN dependency.
// ---------------------------------------------------------------------------

app.get('/feeds/links.min.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'links.min.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;
        const results = await StaticFeedService.generateLinksFeed();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve links feed', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/feeds/walkins-feed.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'feeds', 'walkins-feed.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;
        const results = await StaticFeedService.generateWalkinFeed();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve walk-ins feed', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/sitemaps/sitemap-data.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'sitemaps', 'sitemap-data.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;
        if (!serveFromDb) {
            return res.status(404).json({ error: { message: 'Sitemap data not found' } });
        }
        const results = await StaticFeedService.generateSitemapData();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve sitemap data', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/companies/:slug.json', async (req, res) => {
    try {
        const { slug } = req.params;
        if (!/^[a-zA-Z0-9-_]+$/.test(slug)) {
            return res.status(400).json({ error: { message: 'Invalid company slug' } });
        }

        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'companies', `${path.basename(slug)}.json`);
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        // Generating every company shard is a full catalogue grouping; only db
        // mode should ever pay for it on a request.
        if (!serveFromDb) {
            return res.status(404).json({ error: { message: 'Company shard not found' } });
        }

        const shards = await StaticFeedService.generateCompanyShards();
        const shard = shards.find((entry) => entry.slug === slug);
        if (!shard) {
            return res.status(404).json({ error: { message: 'Company shard not found' } });
        }
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(shard.data);
    } catch (error) {
        logger.error('Failed to serve company shard', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/companies-directory.min.json', async (_req, res) => {
    try {
        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'companies-directory.min.json');
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        // Generate the directory itself. This used to fall back to
        // generateBootstrapFeed(), which returns a feed object where every
        // consumer expects a company array — a wrong-shape 200 that parses.
        const results = await StaticFeedService.generateCompaniesMetadata();
        res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
        res.json(results);
    } catch (error) {
        logger.error('Failed to serve companies directory', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get('/categories/:id.json', async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent path traversal using a strict alphanumeric check
        if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
            return res.status(400).json({ error: { message: 'Invalid category ID' } });
        }

        const serveFromDb = process.env.FEED_SOURCE === 'db';
        const filePath = path.join(process.cwd(), 'public', 'categories', `${path.basename(id)}.json`);
        if (!serveFromDb && sendFeedArtifactFile(res, filePath)) return;

        if (serveFromDb) {
            const shards = await StaticFeedService.generateCategoryShards();
            const shard = shards.find((entry) => entry.id === id);
            if (shard) {
                res.setHeader('Cache-Control', FEED_ARTIFACT_CACHE_CONTROL);
                return res.json(shard.data);
            }
        }

        res.status(404).json({ error: { message: 'Category shard not found' } });
    } catch (error) {
        logger.error('Failed to serve category shard', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

app.get(/^\/(sitemaps\/)?sitemap.*\.xml$/, async (req, res) => {
    try {
        const sitemapName = path.basename(req.path) || 'sitemap.xml';
        // Prevent path traversal with a strict filename check
        if (!/^sitemap[a-zA-Z0-9-_]*\.xml$/.test(sitemapName)) {
            res.status(400).send('Invalid sitemap name');
            return;
        }

        const filePath = path.join(process.cwd(), 'public', 'sitemaps', path.basename(sitemapName));
        if (fs.existsSync(filePath)) {
            res.type('application/xml').send(fs.readFileSync(filePath, 'utf-8'));
            return;
        }

        // Fallback for primary sitemaps
        if (sitemapName === 'sitemap.xml' || sitemapName === 'sitemap-index.xml') {
            const xml = await StaticFeedService.generateSitemap();
            res.type('application/xml').send(xml);
            return;
        }

        res.status(404).send('Sitemap not found');
    } catch (error) {
        logger.error('Failed to serve sitemap', error);
        res.status(500).json({ error: { message: 'Internal server error' } });
    }
});

// Full-payload listing API for the FresherFlow MCP server, gated on the
// internal service key rather than an admin session: `opportunity.create` and
// `opportunity.edit` are SUPER_ADMIN-only, so routing MCP writes through the
// admin router would mean the MCP server holding super-admin credentials.
// Mounted outside the mode split because it is infrastructure, not a
// user-facing feature, and it is unreachable without INTERNAL_API_SECRET.
// Credential: an OAuth 2.1 bearer token from a signed-in user (which sets
// req.userId, so the RBAC checks below apply unchanged) or the first-party
// service key for pipeline scripts. `mcpSurfaceAuth` owns that choice.
app.use(
    '/api/internal/mcp',
    mcpSurfaceAuth,
    internalMcpListingRoutes,
    // Contributor + moderator tools (whoami, own submissions, review queue).
    internalMcpContributionRoutes,
);

// OAuth 2.1 authorization server for AI clients: discovery documents, dynamic
// client registration, consent, token exchange and revocation. Serves both
// `/.well-known/*` and `/oauth/*` from this router.
//
// The app-wide CORS allowlist above is for the website's own origins. OAuth is
// a cross-origin protocol surface: discovery, DCR and token requests come from
// wherever the AI client runs, and there is no fixed list of those hosts.
// Reflect the caller's Origin here instead — exactly what the Cloudflare OAuth
// provider in the reference implementation does. These endpoints grant nothing
// on their own: code exchange still needs PKCE and the registered redirect URI.
app.use(
    ['/.well-known', '/oauth'],
    cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['WWW-Authenticate'],
        maxAge: 3600,
    }),
);
app.use(oauthRoutes);

if (isUserMode) {
    app.use('/api/auth/register', registerLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth', authRoutes);
    app.use('/api/auth/2fa', authTwoFactorRoutes);
    app.use('/api/auth/passkeys', authPasskeysRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/opportunities', optionalAuth, opportunitiesRoutes);
    app.use('/api/actions', actionsRoutes);
    app.use('/api/applications', applicationsRoutes);
    app.use('/api/saved', savedRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/alerts', alertsRoutes);
    app.use('/api/public/companies', companyRoutes);
    app.use('/api/public/sitemap', sitemapRoutes);
    app.use('/api/public', joblinksRoutes);
    app.use('/api/opportunities', feedbackRoutes);
    app.use('/api/feedback', appFeedbackRoutes);
    app.use('/api/referrals', referralRoutes);
    app.use('/api/public/referrals', referralRoutes);
    app.use('/api/public/contributors', contributorsRoutes);
    app.use('/api/follows', followsRoutes);
    app.use('/api/username', usernameRoutes);
    app.use('/api/resources', resourcesRoutes);
    app.use('/api/device-token', deviceTokenRoutes);
    app.use('/api/public/government-jobs', publicGovernmentJobsRoutes);
    app.use('/api/public/profiles', publicProfilesRoutes);
    // Invite acceptance is mounted first so `/invites/*` is matched before the
    // organization router's `/:id` patterns can claim those paths.
    app.use('/api/organizations', inviteRouter);
    app.use('/api/organizations', organizationsRoutes);
    app.use('/api/recruiter', recruiterCandidatesRoutes);
    app.use('/api/interests', candidateInterestsRoutes);
    app.use('/api/candidate/projects', candidateProjectsRoutes);
    app.use('/api/jobs', communityJobsRouter);
    app.use('/api/discussions', communityDiscussionActivityRouter);
    app.use('/api/notifications', communityNotificationsRouter);
    app.use('/api/users', communityUsersRouter);
    app.use('/api/community', communityPostsRouter);
    app.use('/api/interviews', communityInterviewsRouter);
    app.use('/api/updates', communityUpdatesRouter);
    app.use('/api/rooms', communityRoomsRouter);
    app.use('/api', fresherNeedsRouter);
    app.use('/api/ingest', ingestRouter);
}

if (isAdminMode) {
    const adminDomain = getAdminHost();
    const restrictAdmin = ensureDomainHost(adminDomain);

    app.use('/api/admin/auth/totp', restrictAdmin, adminTotpRoutes);
    app.use('/api/admin/auth/login', authLimiter, restrictAdmin, adminAuthRoutes);
    app.use('/api/admin/auth', restrictAdmin, adminAuthRoutes);
    app.use('/api/admin/opportunities', restrictAdmin, adminOpportunitiesRoutes);
    app.use('/api/admin/feedback', restrictAdmin, adminFeedbackRoutes);
    app.use('/api/admin/app-feedback', restrictAdmin, adminAppFeedbackRoutes);
    app.use('/api/admin/system', restrictAdmin, adminSystemRoutes);
    app.use('/api/admin/analytics', restrictAdmin, adminAnalyticsRoutes);
    app.use('/api/admin/social-posts', restrictAdmin, adminSocialRoutes);
    app.use('/api/admin/queues', restrictAdmin, adminQueuesRoutes);
    app.use('/api/admin/push', restrictAdmin, adminPushRoutes);
    app.use('/api/admin/users', restrictAdmin, adminUsersRoutes);
    app.use('/api/admin/moderators', restrictAdmin, adminModeratorsRoutes);
    app.use('/api/admin/audit', restrictAdmin, adminAuditRoutes);
    app.use('/api/admin/reports', restrictAdmin, adminReportsRoutes);
    app.use('/api/admin/community', restrictAdmin, adminCommunityRoutes);
    app.use('/api/admin/moderation', restrictAdmin, adminModerationRoutes);
    app.use('/api/admin/trust', restrictAdmin, adminTrustRoutes);
    app.use('/api/admin/notifications', restrictAdmin, adminNotificationsRoutes);
    app.use('/api/admin/rooms', restrictAdmin, adminRoomsRoutes);
    app.use('/api/admin/government-jobs', restrictAdmin, adminGovernmentJobsRoutes);
    app.use('/api/admin/resources', restrictAdmin, adminResourcesRoutes);
    app.use('/api/admin/targets', restrictAdmin, adminTargetsRoutes);
    app.use('/api/admin/profiles', restrictAdmin, adminProfilesRoutes);
    app.use('/api/admin/ingestion', restrictAdmin, adminIngestionRoutes);
}

// ============================================================================
// Error Handling
// ============================================================================

// Explicit API and feed routes must win over static files. A checked-out feed
// snapshot must not shadow FEED_SOURCE=db and return stale bytes before the
// source-aware handlers above can run.
app.use(express.static('public'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
            requestId: req.requestId
        }
    });
});

// Sentry error handler (must be BEFORE other error handlers)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Central error handler (must be last)
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API mode: ${APP_MODE}`);
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
    logger.info(`Sentry: ${process.env.SENTRY_DSN ? 'Enabled' : 'Disabled'}`);

    // A missing cookie domain is not fatal to the API, but it silently splits
    // the session between the web host and this API host: the web proxy never
    // sees the API's cookies, so protected routes bounce to /login and the MCP
    // handoff loops between /login and /oauth/authorize. Say it once at boot
    // instead of letting users discover it.
    if (process.env.NODE_ENV === 'production') {
        void import('./utils/runtimeConfig').then(({ getCookieDomain }) => {
            if (!getCookieDomain()) {
                logger.error(
                    '[auth] No cookie domain resolved. Set AUTH_COOKIE_DOMAIN to your registrable domain, '
                    + 'dot-prefixed, or set PUBLIC_FRONTEND_URL. Without it the web app and the API do not share the session '
                    + 'cookie, so MCP sign-in loops between /login and /oauth/authorize and every protected '
                    + 'web route bounces back to /login.',
                );
            }
        });
    }

    // Start background services asynchronously
    initializeBackgroundServices().catch((err) => {
        logger.error('Failed to initialize background services', err);
    });
});

server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
        logger.error(
            `Port ${PORT} is already in use. Another API process is still running and holding the port. ` +
            `Stop it first (pnpm kill:port), then restart. Exiting.`
        );
    } else {
        logger.error('HTTP server error', err);
    }
    process.exit(1);
});

async function initializeBackgroundServices() {
    try {
        // 1. Firebase Admin SDK
        const { initializeFirebase } = await import('./lib/firebase');
        await initializeFirebase();
        
        // 2. Sentry Error Monitoring
        if (env.SENTRY_DSN) {
            Sentry.init({
                dsn: env.SENTRY_DSN,
                environment: env.NODE_ENV,
                tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
            });
        }
        
        // 3. BullMQ Listeners
        try {
            initializeQueueListeners();
        } catch (err) {
            logger.warn('Queue listeners initialization skipped or failed', err);
        }

        isAppReady = true;
        markReady();
        logger.info('Background services initialized successfully. Service is ready.');
    } catch (err) {
        logger.error('Critical failure in background initialization', err);
        // We still set it to true to allow degraded service if needed,
        // or you could leave it false to keep returning 503 depending on requirements.
        // Let's set it to true so the API isn't completely dead.
        isAppReady = true;
        markReady();
    }
}

// Graceful shutdown.
// The drain contract lives in `src/utils/readiness.ts` (shared with the
// `/api/ready` probe): first flip to draining so the load balancer stops
// sending work, then stop accepting new connections while in-flight requests
// finish, then release Redis and the Prisma pool. The watchdog in `shutdown()`
// bounds the whole sequence by SHUTDOWN_TIMEOUT_MS (default 10s).
installShutdownHandlers({
    stopHttp: () =>
        new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    logger.error('Error closing HTTP server', err);
                    reject(err);
                    return;
                }
                logger.info('HTTP server closed');
                resolve();
            });
        }),
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
    }
});

export default app;


