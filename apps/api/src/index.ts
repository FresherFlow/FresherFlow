import dotenv from 'dotenv';
// Load environment variables immediately
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { observabilityMiddleware } from './middleware/observability';
import logger from './utils/logger';
import httpLogger from './middleware/httpLogger';

import { csrfGate } from './middleware/csrf';

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import opportunitiesRoutes from './routes/opportunities';
import actionsRoutes from './routes/actions';
import feedbackRoutes from './routes/feedback';
import appFeedbackRoutes from './routes/appFeedback';
import savedRoutes from './routes/saved';
import dashboardRoutes from './routes/dashboard';
import alertsRoutes from './routes/alerts';
import adminAuthRoutes from './routes/admin/auth';
import adminOpportunitiesRoutes from './routes/admin/opportunities';
import adminFeedbackRoutes from './routes/admin/feedback';
import adminAppFeedbackRoutes from './routes/admin/appFeedback';
import adminSystemRoutes from './routes/admin/system';
import adminAnalyticsRoutes from './routes/admin/analytics';
import adminTotpRoutes from './routes/admin/totp';
import healthRoutes from './routes/public/health';
import growthRoutes from './routes/public/growth';
import companyRoutes from './routes/public/companies';
import opportunityClickRoutes from './routes/public/opportunityClicks';
import emailIngestionRoutes from './routes/public/emailIngestion';
import cronRoutes from './routes/cron';

const app: Application = express();
const PORT = process.env.PORT || 5000;

function extractClientIp(req: express.Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const cfIp = req.headers['cf-connecting-ip'];
    const realIp = req.headers['x-real-ip'];

    const firstForwarded = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : undefined;

    const raw = (firstForwarded || (Array.isArray(cfIp) ? cfIp[0] : cfIp) || (Array.isArray(realIp) ? realIp[0] : realIp) || req.ip || 'unknown')
        .toString()
        .trim();

    // Normalize IPv6-mapped IPv4 (e.g. ::ffff:1.2.3.4)
    return raw.replace(/^::ffff:/, '');
}

// Lightweight Health Check (Zero-DB, Zero-Auth)
app.use('/api', healthRoutes);
app.use('/api/public/growth', growthRoutes);
app.use('/api/public', opportunityClickRoutes);
app.use('/api/ingestion', emailIngestionRoutes);
app.use('/api/cron', cronRoutes);

// Trust proxy for Render/Vercel/Load Balancers
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ============================================================================
// Sentry Error Monitoring (Disabled for first run)
// ============================================================================
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
}

// ============================================================================
// Middleware Setup
// ============================================================================

// Request ID (must be first for logging)
app.use(requestIdMiddleware);

// HTTP Request Logging (colorful!)
app.use(httpLogger);

// Security
app.use(helmet());

// Cookies
app.use(cookieParser());

// CORS - Allowlist for multiple environments (comma-separated)
const allowedOrigins = [
    ...(process.env.FRONTEND_URLS || '').split(',').map(origin => origin.trim()).filter(Boolean),
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// observabilityMiddleware
app.use(observabilityMiddleware);

// CSRF Protection (Gate)
app.use(csrfGate);

// Rate Limiting
// Rate Limiting - Stricter on auth routes
const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window (Relaxed for dev)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => extractClientIp(req),
    skip: (req) => req.path === '/api/auth/me' || req.path === '/api/admin/auth/me',
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
app.use('/api/auth/me', sessionCheckLimiter);
app.use('/api/admin/auth/me', sessionCheckLimiter);

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

app.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
});

// User routes
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/public/companies', companyRoutes);
app.use('/api/opportunities', feedbackRoutes);
app.use('/api/feedback', appFeedbackRoutes);

// Admin routes (isolated)
app.use('/api/admin/auth/totp', adminTotpRoutes);
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/opportunities', adminOpportunitiesRoutes);
app.use('/api/admin/feedback', adminFeedbackRoutes);
app.use('/api/admin/app-feedback', adminAppFeedbackRoutes);
app.use('/api/admin/system', adminSystemRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            path: req.path,
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

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
    logger.info(`Sentry: ${process.env.SENTRY_DSN ? 'Enabled' : 'Disabled'}`);

    // Start cron jobs - MIGRATED TO GITHUB ACTIONS
    // startExpiryCron();
    // startVerificationCron();
    // startAlertsCron();
    // startIngestionCron();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
    }
});

export default app;
