/**
 * Social Auto-Post - Local Test Runner
 *
 * This script is no longer responsible for posting.
 * All posting logic lives in:  apps/worker/src/social.handler.ts
 *
 * In production, GitHub Actions calls the worker directly:
 *   POST $WORKER_URL/social/seed   -- called after job discovery
 *   POST $WORKER_URL/social/drain  -- called every 30 min
 *
 * This script is kept for local testing of the worker endpoints.
 * Usage:
 *   WORKER_URL=http://localhost:5001 WORKER_SECRET=test tsx index.ts seed
 *   WORKER_URL=http://localhost:5001 WORKER_SECRET=test tsx index.ts drain
 */

import axios from "axios";

const WORKER_URL    = process.env.WORKER_URL    || "http://localhost:5001";
const WORKER_SECRET = process.env.WORKER_SECRET || "";
const command       = process.argv[2] as "seed" | "drain" | undefined;

if (!command || !["seed", "drain"].includes(command)) {
    console.error("Usage: tsx index.ts <seed|drain>");
    process.exit(1);
}

async function main() {
    console.log(`[social-autopost] Calling worker: POST ${WORKER_URL}/social/${command}`);
    try {
        const res = await axios.post(
            `${WORKER_URL}/social/${command}`,
            {},
            {
                headers: { "x-worker-secret": WORKER_SECRET },
                timeout: 60000,
            }
        );
        console.log(`[social-autopost] Response (${res.status}):`, JSON.stringify(res.data, null, 2));
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            console.error("[social-autopost] Request failed:", err.response?.status, err.response?.data ?? err.message);
        } else {
            console.error("[social-autopost] Unexpected error:", err);
        }
        process.exit(1);
    }
}

main();
