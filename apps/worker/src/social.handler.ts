import { IncomingMessage, ServerResponse } from "node:http";
import { logger } from "@fresherflow/logger";
import { getQueue, QUEUE_NAMES } from "@fresherflow/queue";

// ─── Config ───────────────────────────────────────────────────────────────────

const WORKER_SECRET = process.env.WORKER_SECRET ?? '';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function isAuthorized(req: IncomingMessage): boolean {
    return req.headers["x-worker-secret"] === WORKER_SECRET;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

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

// ─── POST /social/schedule ────────────────────────────────────────────────────
// Enqueues a BullMQ delayed job. The job fires at scheduledAt (ms unix timestamp).
// Body: { platform: 'telegram' | 'x' | 'linkedin', text: string, scheduledAt: number }

export async function handleSchedule(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    let body: { platform?: string; text?: string; scheduledAt?: number };
    try {
        body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
    }

    const { platform, text, scheduledAt } = body;
    if (!platform || !text || !scheduledAt) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "platform, text and scheduledAt are required" }));
        return;
    }
    if (scheduledAt <= Date.now()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "scheduledAt must be in the future" }));
        return;
    }

    const delay = scheduledAt - Date.now();

    try {
        const queue = getQueue(QUEUE_NAMES.broadcast);
        const job = await queue.add(
            "scheduled-social",
            { platform, text },
            { delay, removeOnComplete: true, removeOnFail: 500 },
        );
        logger.info("[social:schedule] Enqueued delayed job", { platform, jobId: job.id, scheduledAt: new Date(scheduledAt).toISOString() });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, jobId: job.id }));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[social:schedule] Failed to enqueue", { platform, error: msg });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
    }
}

// ─── DELETE /social/schedule ──────────────────────────────────────────────────
// Cancels a scheduled BullMQ post.
// Body: { jobId: string }

export async function handleCancelSchedule(
    req: IncomingMessage,
    res: ServerResponse,
): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    let body: { jobId?: string };
    try {
        body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
    }

    const { jobId } = body;
    if (!jobId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "jobId is required" }));
        return;
    }

    try {
        const queue = getQueue(QUEUE_NAMES.broadcast);
        const job = await queue.getJob(jobId);
        if (job) {
            await job.remove();
            logger.info("[social:cancel-schedule] Cancelled job successfully", { jobId });
        } else {
            logger.warn("[social:cancel-schedule] Job not found to cancel (might have fired already)", { jobId });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[social:cancel-schedule] Failed to cancel", { jobId, error: msg });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: msg }));
    }
}
