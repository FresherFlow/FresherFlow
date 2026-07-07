import crypto from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { prisma } from "@fresherflow/database";
import { logger } from "@fresherflow/logger";
import { SocialPlatform, SocialPostStatus, OpportunityStatus } from "@prisma/client";

// ─── Config ───────────────────────────────────────────────────────────────────

const CDN_URL   = process.env.NEXT_PUBLIC_CDN_URL  || "https://cdn.fresherflow.in";
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.in";
const CDN_SECRET    = process.env.CDN_SIGNATURE_SECRET || "";
const WORKER_SECRET = process.env.WORKER_SECRET        || "";

const ACTIVE_PLATFORMS: SocialPlatform[] = [SocialPlatform.X, SocialPlatform.LINKEDIN];

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function isAuthorized(req: IncomingMessage): boolean {
    if (!WORKER_SECRET) {
        logger.warn("[social] WORKER_SECRET not set — endpoint is unprotected");
        return true;
    }
    return req.headers["x-worker-secret"] === WORKER_SECRET;
}

// ─── Caption builder (mirrors apps/api/src/infrastructure/services/social/caption.service.ts)
// Kept here to avoid cross-app imports (workspace boundary rule).

interface CaptionInput {
    title: string;
    company: string;
    type: string;
    locations: string[];
    applyLink: string;
    salaryRange?: string | null;
}

const HASHTAGS: Record<SocialPlatform, string> = {
    X:        "#Hiring #Fresher #Jobs",
    LINKEDIN: "#Hiring #FresherJobs #Careers #JobOpening",
    FACEBOOK: "#Hiring #Jobs #FreshersHiring",
};

const MAX_CAPTION_LENGTH: Record<SocialPlatform, number> = {
    X:        260,
    LINKEDIN: 2800,
    FACEBOOK: 2000,
};

function buildCaption(input: CaptionInput, platform: SocialPlatform): string {
    const { title, company, type, locations, applyLink, salaryRange } = input;
    const locationText = locations.slice(0, 3).join(" / ");
    const salary = salaryRange ? `\u{1F4B0} ${salaryRange}` : "";
    const tags   = HASHTAGS[platform];
    const footer = `\n\n\u{1F517} Apply: ${applyLink}\n\n${tags}`;
    const header = [
        `\u{1F680} ${title} @ ${company}`,
        `\u{1F4C2} ${type} | \u{1F4CD} ${locationText}`,
        salary,
    ].filter(Boolean).join("\n");

    const maxLen = MAX_CAPTION_LENGTH[platform];
    if (header.length + footer.length <= maxLen) return header + footer;
    const avail = maxLen - footer.length - 3;
    if (avail > 20) return header.slice(0, avail) + "..." + footer;
    const minFooter = `\n\n\u{1F517} Apply: ${applyLink}`;
    const minAvail  = maxLen - minFooter.length - 3;
    if (minAvail > 10) return header.slice(0, minAvail) + "..." + minFooter;
    return `\u{1F517} Apply: ${applyLink}`.slice(0, maxLen);
}

// ─── CDN helpers ─────────────────────────────────────────────────────────────

function signCdnUrl(pathname: string): string {
    if (!CDN_SECRET) return `${CDN_URL}${pathname}`;
    const t   = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac("sha256", CDN_SECRET).update(`${pathname}:${t}`).digest("hex");
    return `${CDN_URL}${pathname}?t=${t}&sig=${sig}`;
}

interface CdnOpportunity {
    id: string;
    slug: string;
    title: string;
    company: string;
    type: string;
    locations?: string[];
    salaryRange?: string;
}

async function fetchCdnFeed(): Promise<{ opportunities: CdnOpportunity[] }> {
    const { default: axios } = await import("axios");
    const res = await axios.get(signCdnUrl("/bootstrap-feed.min.json"), { timeout: 15000 });
    return res.data;
}

// ─── POST /social/seed ────────────────────────────────────────────────────────
// Reads CDN feed → inserts PENDING SocialPost rows for new, still-live jobs.
// Idempotent: dedupeKey prevents duplicates.

export async function handleSeed(res: ServerResponse): Promise<void> {
    let feed: { opportunities: CdnOpportunity[] };
    try {
        feed = await fetchCdnFeed();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[social:seed] CDN fetch failed", { error: msg });
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "CDN fetch failed", detail: msg }));
        return;
    }

    const opportunities = feed.opportunities ?? [];
    logger.info("[social:seed] Feed loaded", { total: opportunities.length });

    let seeded = 0;
    let skipped = 0;
    let stale = 0;

    for (const opp of opportunities) {
        if (!opp.id || !opp.slug) { skipped++; continue; }

        // Guard: only seed for opportunities that are still live in the DB
        const dbOpp = await prisma.opportunity.findFirst({
            where: {
                id: opp.id,
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: { id: true },
        });

        if (!dbOpp) { stale++; continue; }

        const shareUrl = `${SITE_URL}/${opp.slug}`;

        for (const platform of ACTIVE_PLATFORMS) {
            const dedupeKey = `${opp.id}:${platform}`;
            const caption   = buildCaption({
                title:       opp.title,
                company:     opp.company,
                type:        opp.type,
                locations:   opp.locations ?? [],
                applyLink:   shareUrl,
                salaryRange: opp.salaryRange,
            }, platform);

            try {
                await prisma.socialPost.upsert({
                    where:  { dedupeKey },
                    update: {},   // already exists → leave it alone (don't reset PUBLISHED → PENDING)
                    create: {
                        opportunityId: opp.id,
                        platform,
                        status:    SocialPostStatus.PENDING,
                        dedupeKey,
                        payload:   { text: caption },
                    },
                });
                seeded++;
            } catch {
                skipped++;
            }
        }
    }

    logger.info("[social:seed] Done", { seeded, skipped, stale });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, seeded, skipped, stale }));
}

// ─── POST /social/drain ───────────────────────────────────────────────────────
// Picks 1 oldest PENDING post → validates job is still live → posts it.
// If job is stale, cancels it and tries the next one (recursive).
// GHA calls this every 30 min.

export async function handleDrain(res: ServerResponse, depth = 0): Promise<void> {
    // Avoid infinite recursion if the entire queue is stale
    if (depth > 20) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ posted: false, reason: "too_many_stale_skips" }));
        return;
    }

    const post = await prisma.socialPost.findFirst({
        where:   { status: SocialPostStatus.PENDING },
        orderBy: { createdAt: "asc" },
        include: {
            opportunity: {
                select: {
                    id: true, slug: true, status: true,
                    deletedAt: true, expiresAt: true,
                },
            },
        },
    });

    if (!post) {
        logger.info("[social:drain] Queue empty");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ posted: false, reason: "nothing_pending" }));
        return;
    }

    // ── Expiry / removal guard ────────────────────────────────────────────────
    const opp       = post.opportunity;
    const isExpired = opp.expiresAt !== null && opp.expiresAt <= new Date();
    const isStale   =
        opp.status !== OpportunityStatus.PUBLISHED ||
        opp.deletedAt !== null ||
        isExpired;

    if (isStale) {
        await prisma.socialPost.update({
            where: { id: post.id },
            data:  {
                status:       SocialPostStatus.DISABLED,
                errorMessage: "Opportunity expired, archived, or removed before posting",
            },
        });
        logger.warn("[social:drain] Skipped stale opportunity", {
            opportunityId: opp.id,
            platform:      post.platform,
        });
        // Try next PENDING post in same drain call
        return handleDrain(res, depth + 1);
    }

    // ── Dispatch to the existing social processor ─────────────────────────────
    const { processSocialJob } = await import("@fresherflow/queue");

    // Minimal BullMQ-compatible job shape expected by processSocialJob
    const fakeJob = {
        id:           post.id,
        data:         { socialPostId: post.id },
        attemptsMade: post.retryCount,
    } as Parameters<typeof processSocialJob>[0];

    try {
        await processSocialJob(fakeJob);
        logger.info("[social:drain] Posted", { platform: post.platform, opportunityId: opp.id });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ posted: true, platform: post.platform, opportunityId: opp.id }));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[social:drain] Post failed", { platform: post.platform, error: msg });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ posted: false, reason: "post_failed", error: msg }));
    }
}
