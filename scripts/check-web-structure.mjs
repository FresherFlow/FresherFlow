#!/usr/bin/env node
/**
 * Structural guard for apps/web — the checks CI runs in its "Check web structure" step.
 *
 * Enforces the import-direction rules in apps/web/AGENTS.md:
 *
 *   1. deadShims   files whose entire body is a single re-export. A shim is temporary by
 *                  construction and may live for at most one merged PR, so this count must
 *                  stay at 0. Barrels and framework conventions are not shims: an
 *                  `index.ts`, a re-export that aggregates several modules, the Next.js
 *                  image conventions, and the two barrels AGENTS.md names as permanent are
 *                  all excluded.
 *   2. backEdges   src/lib/** importing src/features/**. lib is infrastructure and must
 *                  not depend on product code.
 *   3. routeLeaks  app/<route>/_components|_hooks imported from outside that route. If two
 *                  routes need the file it belongs in src/features/.
 *   4. uiOutward   src/ui/** importing anything but itself, src/hooks, and lib/utils.
 *   5. isrTimers   a numeric `revalidate` on a public route, or on a feed read in
 *                  lib/api/cdnFeed.ts. Next takes the lowest revalidate on a route as
 *                  the route's ISR period, so one number there turns every visitor and
 *                  crawler into a full page render. Public pages are invalidated by
 *                  tag (see the policy comment in cdnFeed.ts), not by a clock.
 *
 * Usage:
 *   node scripts/check-web-structure.mjs          # report only, always exits 0
 *   node scripts/check-web-structure.mjs --gate   # fail when any count rises above the baseline
 *
 * The gate compares against scripts/web-structure-baseline.json. Counts may fall freely and
 * may never rise; lower a number (or delete the key) in the same PR that removes the
 * violation. A missing baseline file means there is nothing to compare against, so the gate
 * reports and passes rather than failing the build on a fresh checkout.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'apps', 'web', 'src');
const BASELINE_PATH = join(ROOT, 'scripts', 'web-structure-baseline.json');

const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', '__tests__', '__mocks__']);
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.d.ts'];

/** A file whose every statement is `export ... from`. */
const SHIM_LINE = /^export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"];?$/;

/** Next.js requires these to be thin re-exports of the sibling OG image. */
const FRAMEWORK_REEXPORT = /(?:twitter-image|opengraph-image|icon|apple-icon)\.(?:ts|tsx|js|jsx)$/;

/**
 * Barrels that apps/web/AGENTS.md names as permanent public APIs, so they are not shims:
 * "Barrels are permanent APIs and must be named as such (`src/ui/cn.ts`,
 * `src/lib/api/rateLimit.ts`)."
 */
const PERMANENT_BARRELS = new Set(['apps/web/src/ui/cn.ts', 'apps/web/src/lib/api/rateLimit.ts']);

/**
 * Public routes allowed to carry a numeric `revalidate`, and the ceiling for each.
 *
 * Profile data is the only content with no invalidation channel: no publish rebuild
 * busts a tag for it and nothing tells the web when a profile is saved, so `false`
 * would pin an edit until the next deploy. The ceiling is what stops those two files
 * from drifting back to a job-feed-style 60s timer.
 *
 * Job or feed data must never be added here — it has tags, so it has no excuse.
 */
const REVALIDATE_ALLOWLIST = new Map([
    ['apps/web/src/app/(public)/u/[username]/page.tsx', { max: 300, reason: 'profile page, no invalidation channel' }],
    ['apps/web/src/app/(public)/u/page.tsx', { max: 3600, reason: 'profile directory, no invalidation channel' }],
]);

/** `export const revalidate = 60` — the segment config that starts an ISR clock. */
const NUMERIC_REVALIDATE = /^export\s+const\s+revalidate\s*=\s*(\d+)\s*;?$/m;
const IMPORT_SPEC = /(?:^|[^.\w])(?:import|export)\s[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|(?:^|[\s;])import\s+['"]([^'"]+)['"]/g;

const toPosix = (value) => value.split(sep).join('/');
const isTestFile = (file) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(file);

function walk(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(join(dir, entry.name), out);
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
            out.push(join(dir, entry.name));
        }
    }
    return out;
}

function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\s+\/\/[^\n'"`]*$/gm, '');
}

function importSpecifiers(source) {
    const specs = new Set();
    for (const match of source.matchAll(IMPORT_SPEC)) {
        const spec = match[1] ?? match[2] ?? match[3];
        if (spec) specs.add(spec);
    }
    return [...specs];
}

/** Resolve an import specifier to a file on disk, or null for bare package imports. */
function resolveSpecifier(spec, fromFile) {
    const clean = spec.split('?')[0].split('#')[0];
    let base;
    if (clean.startsWith('@/')) base = join(SRC, clean.slice(2));
    else if (clean.startsWith('.')) base = resolve(dirname(fromFile), clean);
    else return null;

    const candidates = [base, ...EXTENSIONS.map((ext) => base + ext)];
    for (const ext of EXTENSIONS) {
        candidates.push(join(base, `index${ext}`));
    }
    for (const candidate of candidates) {
        try {
            if (statSync(candidate).isFile()) return candidate;
        } catch {
            // Not this one — try the next candidate.
        }
    }
    return null;
}

/** The route directory that owns a route-private file, or null when the file is not private. */
function routePrivateRoot(file) {
    const posix = toPosix(file);
    const idx = Math.min(
        ...[`/_components/`, `/_hooks/`].map((needle) => {
            const at = posix.indexOf(needle);
            return at === -1 ? Number.POSITIVE_INFINITY : at;
        })
    );
    return Number.isFinite(idx) ? posix.slice(0, idx + 1) : null;
}

function loadBaseline() {
    try {
        return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
        return null;
    }
}

const files = walk(SRC).filter((file) => !isTestFile(file));
const findings = { deadShims: [], backEdges: [], routeLeaks: [], uiOutward: [], isrTimers: [] };

for (const file of files) {
    const posix = toPosix(relative(ROOT, file));
    const source = readFileSync(file, 'utf8');
    const specs = importSpecifiers(source);

    const withoutComments = stripComments(source);

    if (posix.startsWith('apps/web/src/app/(public)/')) {
        const match = withoutComments.match(NUMERIC_REVALIDATE);
        if (match) {
            const allowed = REVALIDATE_ALLOWLIST.get(posix);
            const seconds = Number(match[1]);
            if (!allowed) {
                findings.isrTimers.push(
                    `${posix} → revalidate = ${seconds} (a clock on a public page re-renders it for every visitor and crawler)`,
                );
            } else if (seconds > allowed.max) {
                findings.isrTimers.push(
                    `${posix} → revalidate = ${seconds} exceeds the ceiling of ${allowed.max} (${allowed.reason})`,
                );
            }
        }
    }

    if (posix === 'apps/web/src/lib/api/cdnFeed.ts') {
        for (const match of withoutComments.matchAll(/revalidate\s*:\s*(\d+)/g)) {
            findings.isrTimers.push(
                `${posix} → revalidate: ${match[1]} on a feed read (this becomes the ISR period of every page that reads it)`,
            );
        }
    }

    const body = withoutComments
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    const reExports = body.map((line) => line.match(SHIM_LINE)).filter(Boolean);
    const sources = new Set(reExports.map((match) => match[1]));
    const isBarrel = /(?:^|\/)index\.(?:ts|tsx|js|jsx)$/.test(posix) || sources.size > 1;
    if (
        reExports.length === body.length &&
        body.length > 0 &&
        !isBarrel &&
        !FRAMEWORK_REEXPORT.test(posix) &&
        !PERMANENT_BARRELS.has(posix)
    ) {
        findings.deadShims.push(`${posix} → ${[...sources].join(', ')}`);
    }

    for (const spec of specs) {
        const target = resolveSpecifier(spec, file);
        if (!target) continue;
        const targetPosix = toPosix(relative(ROOT, target));

        if (posix.startsWith('apps/web/src/lib/') && targetPosix.startsWith('apps/web/src/features/')) {
            findings.backEdges.push(`${posix} → ${targetPosix}`);
        }

        const privateRoot = routePrivateRoot(target);
        if (privateRoot && !toPosix(file).startsWith(privateRoot)) {
            findings.routeLeaks.push(`${posix} → ${targetPosix}`);
        }

        if (posix.startsWith('apps/web/src/ui/')) {
            const allowed =
                targetPosix.startsWith('apps/web/src/ui/') ||
                targetPosix.startsWith('apps/web/src/hooks/') ||
                /^apps\/web\/src\/lib\/utils(\.|\/|$)/.test(targetPosix);
            if (!allowed) findings.uiOutward.push(`${posix} → ${targetPosix}`);
        }
    }
}

const counts = Object.fromEntries(
    Object.entries(findings).map(([key, list]) => [key, new Set(list).size])
);

console.log('Web structure check — apps/web/src');
for (const [key, count] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(12)} ${count}`);
}

if (process.argv.includes('--verbose')) {
    for (const [key, list] of Object.entries(findings)) {
        if (list.length === 0) continue;
        console.log(`\n${key}:`);
        for (const entry of [...new Set(list)].sort()) console.log(`  ${entry}`);
    }
}

if (!process.argv.includes('--gate')) {
    process.exit(0);
}

const baseline = loadBaseline();
if (!baseline) {
    console.log(`\nNo baseline at ${toPosix(relative(ROOT, BASELINE_PATH))} — reporting only.`);
    process.exit(0);
}

const regressions = Object.entries(counts).filter(([key, count]) => count > (baseline[key] ?? 0));
if (regressions.length > 0) {
    console.error('\nStructural regressions (counts may only go down):');
    for (const [key, count] of regressions) {
        console.error(`  ${key}: ${count} (baseline ${baseline[key] ?? 0})`);
    }
    console.error('\nRe-run with --verbose for the offending imports.');
    process.exit(1);
}

console.log('\nStructure gate passed.');
