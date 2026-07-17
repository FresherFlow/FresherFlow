import crypto from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { prisma } from "@fresherflow/database";
import { logger } from "@fresherflow/logger";
import { SocialPlatform, SocialPostStatus, OpportunityStatus } from "@prisma/client";

// ─── Config ───────────────────────────────────────────────────────────────────

const CDN_URL   = process.env.NEXT_PUBLIC_CDN_URL  || "https://cdn.fresherflow.in";
const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.in";

const CDN_SECRET    = process.env.CDN_SIGNATURE_SECRET ?? '';
const WORKER_SECRET = process.env.WORKER_SECRET ?? '';


const ACTIVE_PLATFORMS: SocialPlatform[] = [SocialPlatform.X, SocialPlatform.LINKEDIN];

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function isAuthorized(req: IncomingMessage): boolean {
    return req.headers["x-worker-secret"] === WORKER_SECRET;
}

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

async function postToBuffer(channelId: string | undefined, text: string): Promise<string> {
    const apiKey = process.env.BUFFER_API_KEY;
    if (!apiKey) {
        throw new Error("Buffer API key is not configured. Set BUFFER_API_KEY in environment.");
    }
    if (!channelId) {
        throw new Error("Buffer Channel ID is not configured.");
    }
    const { default: axios } = await import("axios");

    const response = await axios.post('https://api.buffer.com', {
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              ... on PostActionSuccess {
                post {
                  id
                }
              }
              ... on MutationError {
                message
              }
            }
          }
        `,
        variables: {
            input: {
                channelId,
                text,
                schedulingType: 'automatic',
                mode: 'shareNow',
            },
        },
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 15000,
    });

    if (response.data?.errors) {
        throw new Error(`Buffer GraphQL Error (CreatePost): ${JSON.stringify(response.data.errors)}`);
    }

    const result = response.data?.data?.createPost;
    if (result?.message) {
        throw new Error(`Buffer CreatePost Error: ${result.message}`);
    }

    const postId = result?.post?.id;
    if (!postId) {
        throw new Error(`Failed to create Buffer Post: ${JSON.stringify(response.data)}`);
    }

    return postId;
}

// ─── GET /social/platforms ────────────────────────────────────────────────────
// Returns which social platforms are configured in the worker environment.
// Used by CaptionsTool to show live platform availability badges.

export function handlePlatforms(res: ServerResponse): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        telegram: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_PUBLIC_CHANNEL,
        x: !!process.env.BUFFER_API_KEY && !!process.env.BUFFER_X_CHANNEL_ID,
        linkedin: !!process.env.BUFFER_API_KEY && !!process.env.BUFFER_LINKEDIN_CHANNEL_ID,
    }));
}

// ─── POST /social/send ────────────────────────────────────────────────────────
// Directly posts a caption to a single platform. Called from admin CaptionsTool.
// Body: { platform: 'telegram' | 'x' | 'linkedin', text: string }

export async function handleSend(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    let body: { platform?: string; text?: string };
    try {
        body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
    }

    const { platform, text } = body;
    if (!platform || !text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "platform and text are required" }));
        return;
    }

    try {
        let result: string | null = null;

        if (platform === "telegram") {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            const channel = process.env.TELEGRAM_PUBLIC_CHANNEL;
            if (!botToken || !channel) throw new Error("Telegram not configured");
            const { default: axios } = await import("axios");
            const tgRes = await axios.post(
                `https://api.telegram.org/bot${botToken}/sendMessage`,
                { chat_id: channel, text, parse_mode: "HTML", disable_web_page_preview: false },
                { timeout: 15000 },
            );
            result = String(tgRes.data?.result?.message_id ?? "sent");
        } else if (platform === "x") {
            result = await postToBuffer(process.env.BUFFER_X_CHANNEL_ID, text);
        } else if (platform === "linkedin") {
            result = await postToBuffer(process.env.BUFFER_LINKEDIN_CHANNEL_ID, text);
        } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: `Unknown platform: ${platform}` }));
            return;
        }

        logger.info("[social:send] Posted", { platform, result });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, result }));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[social:send] Failed", { platform, error: msg });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
    }
}
