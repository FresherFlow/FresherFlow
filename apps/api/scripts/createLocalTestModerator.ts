/**
 * createLocalTestModerator.ts
 *
 * LOCAL-ONLY test moderator provisioning for V1 validation.
 *
 * - This is a CLI script, NOT an HTTP route: zero production attack surface.
 * - HARD-FAILS unless ALL safety gates pass (local NODE_ENV, explicit opt-in
 *   flag, local database host, no hosting indicators). See assertLocalGate().
 * - The moderator authenticates through the NORMAL admin TOTP login
 *   (POST /api/admin/auth/login/totp). This script never mints, prints, or
 *   stores JWTs; the only secret ever printed is the one-time TOTP otpauth
 *   payload the operator must enroll.
 * - Only the minimal MODERATOR AccessRole is assigned. Any SUPER_ADMIN
 *   mapping on the disposable user is removed, and the final effective
 *   permission set is verified to equal exactly the MODERATOR set before
 *   credentials are shown.
 * - Removal: run with --revoke <email> (same gates apply).
 *
 * Usage (from apps/api):
 *   NODE_ENV=development ALLOW_LOCAL_TEST_ACCOUNTS=true ADMIN_EMAIL=<addr> \
 *     npx tsx scripts/createLocalTestModerator.ts --email <addr>
 *   npx tsx scripts/createLocalTestModerator.ts --revoke <addr>
 */

import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { generateSecret, generateURI } from 'otplib';
import prisma from '../src/infrastructure/database/prisma';
import { seedRbac } from './seedRbac';

// Best-effort local env loading. Never creates or commits env files; shell
// env always wins because dotenv does not override existing variables.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const DISPOSABLE_DOMAIN = '@local.test';
const TOTP_ISSUER = 'FresherFlow Admin';

function refuse(reason: string): never {
    throw new Error(`REFUSED: ${reason}`);
}

interface LocalGate {
    dbHost: string;
}

/**
 * Fail-closed environment check. Every condition must hold; the first
 * violation aborts before any database read or write.
 */
function assertLocalGate(): LocalGate {
    const hostingIndicators = [
        'VERCEL_ENV',
        'VERCEL',
        'RENDER',
        'RENDER_SERVICE_NAME',
        'RAILWAY_ENVIRONMENT',
        'FLY_APP_NAME',
        'HEROKU_APP_NAME',
    ].filter((key) => process.env[key]);
    if (hostingIndicators.length > 0) {
        refuse(
            `hosting indicator(s) present (${hostingIndicators.join(', ')}). ` +
            `This script is local-only and refuses to run on hosted infrastructure.`,
        );
    }

    const nodeEnv = process.env.NODE_ENV ?? '(unset)';
    if (nodeEnv !== 'development' && nodeEnv !== 'local') {
        refuse(
            `NODE_ENV=${nodeEnv}. Require NODE_ENV=development (or local). ` +
            `Refusing to provision test accounts in any other environment.`,
        );
    }

    if (process.env.ALLOW_LOCAL_TEST_ACCOUNTS !== 'true') {
        refuse(
            `ALLOW_LOCAL_TEST_ACCOUNTS is not 'true'. Set ALLOW_LOCAL_TEST_ACCOUNTS=true ` +
            `explicitly in your local shell to opt in to disposable test accounts.`,
        );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        refuse('DATABASE_URL is unset. Refusing to run without a known database target.');
    }
    let host: string;
    try {
        host = new URL(databaseUrl).hostname.toLowerCase();
    } catch {
        refuse('DATABASE_URL is not a parseable URL. Refusing to run against an unknown target.');
    }
    if (!host || !LOCAL_DB_HOSTS.has(host)) {
        refuse(
            `DATABASE_URL host '${host || '(empty)'}' is not local. Only ` +
            `(${Array.from(LOCAL_DB_HOSTS).join(', ')}) are allowed; refusing to touch ` +
            `a potentially shared or production database (e.g. Neon).`,
        );
    }

    return { dbHost: host };
}

function assertDisposableEmail(email: string): string {
    const normalized = email.trim().toLowerCase();
    if (!normalized.endsWith(DISPOSABLE_DOMAIN)) {
        refuse(
            `email '${email}' is not a disposable test address. Only *${DISPOSABLE_DOMAIN} ` +
            `addresses may be provisioned or revoked by this script.`,
        );
    }
    return normalized;
}

/**
 * The normal admin TOTP login (routes/admin/auth.ts POST /login/totp) only
 * accepts the ADMIN_EMAIL identity. The disposable moderator must therefore
 * BE the local ADMIN_EMAIL, otherwise the operator could never log in
 * through the normal flow — and this script will not invent a bypass.
 */
function assertAdminEmailMatches(email: string): void {
    const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
    if (!adminEmail) {
        refuse(
            'ADMIN_EMAIL is unset. Set ADMIN_EMAIL to the disposable moderator address ' +
            `(${email}) in your local environment so the normal TOTP login accepts it.`,
        );
    }
    if (adminEmail !== email) {
        refuse(
            `ADMIN_EMAIL (${adminEmail}) does not match the disposable moderator (${email}). ` +
            `Set ADMIN_EMAIL=${email} locally so the normal admin TOTP login accepts this identity.`,
        );
    }
}

async function getEffectivePermissionKeys(userId: string): Promise<Set<string>> {
    const rows = await prisma.$queryRaw<{ key: string }[]>`
        SELECT DISTINCT p."key" AS "key"
        FROM "Permission" p
        JOIN "AccessRolePermission" arp ON arp."permissionId" = p.id
        JOIN "UserAccessRole" uar ON uar."roleId" = arp."roleId"
        WHERE uar."userId" = ${userId}
    `;
    return new Set(rows.map((r) => r.key));
}

function parseArgs(argv: string[]): { email?: string; revoke?: string; help: boolean } {
    const out: { email?: string; revoke?: string; help: boolean } = { help: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--help' || arg === '-h') out.help = true;
        else if (arg === '--email') out.email = argv[++i];
        else if (arg === '--revoke') out.revoke = argv[++i];
        else if (arg.startsWith('--email=')) out.email = arg.slice('--email='.length);
        else if (arg.startsWith('--revoke=')) out.revoke = arg.slice('--revoke='.length);
    }
    return out;
}

function printHelp(): void {
    console.log(`Local-only test moderator provisioning (V1 validation).

Create:
  NODE_ENV=development ALLOW_LOCAL_TEST_ACCOUNTS=true ADMIN_EMAIL=<addr> \\
    npx tsx scripts/createLocalTestModerator.ts --email <addr>
  (<addr> must end with ${DISPOSABLE_DOMAIN}; omit --email for an auto address.)

Authenticate (normal flow, no bypass):
  POST /api/admin/auth/login/totp  { "email": "<addr>", "code": "<6-digit>" }
  Enroll the printed otpauth URI in an authenticator app first.

Revoke (same safety gates apply):
  npx tsx scripts/createLocalTestModerator.ts --revoke <addr>

Gates: NODE_ENV=development|local, ALLOW_LOCAL_TEST_ACCOUNTS=true,
DATABASE_URL on localhost/127.0.0.1/::1, no hosting indicators,
ADMIN_EMAIL == disposable address.`);
}

async function createModerator(rawEmail: string | undefined): Promise<void> {
    const gate = assertLocalGate();
    const email =
        rawEmail && rawEmail.trim() ? assertDisposableEmail(rawEmail) : `v1mod+${Date.now().toString(36)}${DISPOSABLE_DOMAIN}`;
    assertDisposableEmail(email);
    assertAdminEmailMatches(email);

    console.log(`[local-test-moderator] gates passed (db host: ${gate.dbHost}). Ensuring RBAC seed...`);
    await seedRbac();

    const moderatorRole = await prisma.accessRole.findUnique({
        where: { name: 'MODERATOR' },
        include: { permissions: { include: { permission: true } } },
    });
    if (!moderatorRole) refuse('MODERATOR AccessRole missing even after seed. Aborting.');
    const superAdminRole = await prisma.accessRole.findUnique({ where: { name: 'SUPER_ADMIN' } });
    const expectedKeys = new Set(moderatorRole.permissions.map((m) => m.permission.key));

    const existing = await prisma.user.findUnique({ where: { email } });
    let userId: string;
    if (existing) {
        console.log(`[local-test-moderator] reusing existing disposable user ${existing.id}.`);
        const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
                role: 'ADMIN',
                fullName: existing.fullName ?? 'Local Test Moderator (disposable)',
                status: 'ACTIVE',
                trustLevel: existing.trustLevel === 'BANNED' ? 'NEW' : undefined,
                isAnonymous: false,
            },
            select: { id: true },
        });
        userId = updated.id;
    } else {
        const created = await prisma.user.create({
            data: {
                email,
                fullName: 'Local Test Moderator (disposable)',
                role: 'ADMIN',
                isAnonymous: false,
                status: 'ACTIVE',
                referralCode: `LOCALMOD_${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
                profile: { create: {} },
            },
            select: { id: true },
        });
        userId = created.id;
        console.log(`[local-test-moderator] created disposable user ${userId}.`);
    }

    // Enable TOTP for the disposable identity (mirrors the completed state of
    // POST /admin/auth/totp/verify). The operator enrolls the printed otpauth
    // URI, then logs in through the NORMAL POST /login/totp flow.
    const secret = generateSecret();
    const otpauth = generateURI({ issuer: TOTP_ISSUER, label: email, secret });
    await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: secret, isTwoFactorEnabled: true },
    });

    // Least-privilege enforcement: drop any SUPER_ADMIN mapping, keep ONLY
    // the MODERATOR mapping.
    if (superAdminRole) {
        await prisma.userAccessRole.deleteMany({ where: { userId, roleId: superAdminRole.id } });
    }
    await prisma.userAccessRole.upsert({
        where: { userId_roleId: { userId, roleId: moderatorRole.id } },
        create: { userId, roleId: moderatorRole.id, assignedBy: 'LOCAL_TEST_SCRIPT' },
        update: {},
    });

    const effective = await getEffectivePermissionKeys(userId);
    const missing = Array.from(expectedKeys).filter((k) => !effective.has(k));
    const extra = Array.from(effective).filter((k) => !expectedKeys.has(k));
    if (missing.length > 0 || extra.length > 0) {
        // Roll back our own mapping; never hand out credentials for a
        // mis-scoped identity.
        await prisma.userAccessRole.deleteMany({ where: { userId, roleId: moderatorRole.id } });
        refuse(
            `effective permission set mismatch (missing: ${missing.join(', ') || 'none'}; ` +
            `extra: ${extra.join(', ') || 'none'}). Rolled back the MODERATOR mapping; ` +
            `no credentials issued. Run --revoke ${email} to clean up.`,
        );
    }

    console.log(`[local-test-moderator] MODERATOR assigned and verified. Effective keys (${effective.size}):`);
    for (const key of Array.from(effective).sort()) console.log(`  - ${key}`);
    console.log('');
    console.log('ONE-TIME TOTP enrollment (will not be shown again; store in your authenticator app now):');
    console.log(`  otpauth URI: ${otpauth}`);
    console.log(`  secret: ${secret}`);
    console.log('');
    console.log('Next: log in through the NORMAL admin flow:');
    console.log(`  POST /api/admin/auth/login/totp  { "email": "${email}", "code": "<6-digit from app>" }`);
    console.log(`When finished: npx tsx scripts/createLocalTestModerator.ts --revoke ${email}`);
}

async function revokeModerator(rawEmail: string | undefined): Promise<void> {
    const gate = assertLocalGate();
    if (!rawEmail || !rawEmail.trim()) {
        refuse('--revoke requires an email argument: --revoke <addr>. Nothing was changed.');
    }
    const email = assertDisposableEmail(rawEmail);
    console.log(`[local-test-moderator] gates passed (db host: ${gate.dbHost}). Revoking ${email}...`);

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!existing) {
        refuse(`no user found for ${email}. Nothing was changed.`);
    }

    const removed = await prisma.userAccessRole.deleteMany({ where: { userId: existing.id } });
    await prisma.user.update({
        where: { id: existing.id },
        data: { status: 'DEACTIVATED', isTwoFactorEnabled: false, totpSecret: null },
    });
    console.log(
        `[local-test-moderator] revoked ${email}: removed ${removed.count} role mapping(s), ` +
        `status=DEACTIVATED, TOTP disabled. The row is kept for audit; re-run create to rotate.`,
    );
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }
    if (args.revoke !== undefined) {
        await revokeModerator(args.revoke);
        return;
    }
    await createModerator(args.email);
}

main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    });
