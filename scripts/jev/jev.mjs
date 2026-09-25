#!/usr/bin/env node
/**
 * JEV wrapper - the only sanctioned way to call TypeSafe System One.
 *
 * The API key is read from the repo-root .env (or process env) and is
 * NEVER printed, logged, echoed, or returned in any output or error.
 *
 * Usage:
 *   node scripts/jev/jev.mjs --demo
 *   node scripts/jev/jev.mjs --file questions.json
 *   node scripts/jev/jev.mjs --body '{"state":"...","questions":{...}}'
 *   echo '{"state":"...","questions":{...}}' | node scripts/jev/jev.mjs
 *
 * Payload shape: { "state": <string|object|array>, "questions": { <id>: { "type": "noul"|"choice"|"score",
 *   "instructions": "...", "criteria": {...} } } }.  See scripts/jev/README.md.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KEY_NAMES = ["typesafe_api", "TYPESAFE_API", "TYPESAFE_API_KEY"];
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

const USAGE = `jev wrapper - typed judgments from JEV, key stays hidden

  node scripts/jev/jev.mjs --demo              smoke test
  node scripts/jev/jev.mjs --file <path>       payload JSON from file
  node scripts/jev/jev.mjs --body '<json>'     payload JSON inline
  (pipe) echo '<json>' | node scripts/jev/jev.mjs
  node scripts/jev/jev.mjs --help

Payload: { state, questions: { id: { type, instructions, criteria? } } }
Types: noul (yes/no), choice (pick one), score (graded levels)
Full guide: scripts/jev/README.md`;

function fail(msg) {
  process.stderr.write(`jev: ${msg}\n`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findKey() {
  for (const name of KEY_NAMES) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env"),
  ];
  for (const file of candidates) {
    try {
      const text = readFileSync(file, "utf8");
      for (const name of KEY_NAMES) {
        const m = text.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, "mi"));
        if (m) {
          const v = m[1].trim().replace(/^["']|["']$/g, "");
          if (v) return v;
        }
      }
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--body") out.body = argv[++i];
    else if (a === "--demo") out.demo = true;
    else if (a === "-h" || a === "--help") out.help = true;
    else fail(`unknown arg: ${a} (try --help)`);
  }
  return out;
}

function validate(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("payload must be a JSON object");
  if (payload.state === undefined || payload.state === null) fail("`state` is required");
  const qs = payload.questions;
  if (!qs || typeof qs !== "object" || Array.isArray(qs) || Object.keys(qs).length === 0) {
    fail("`questions` must be a non-empty object of typed questions");
  }
  for (const [id, q] of Object.entries(qs)) {
    if (!q || typeof q !== "object") fail(`question "${id}" must be an object`);
    if (!["noul", "choice", "score"].includes(q.type)) fail(`question "${id}": type must be noul|choice|score`);
    if (q.instructions === undefined) fail(`question "${id}": instructions required`);
    if ((q.type === "choice" || q.type === "score") && !q.criteria) {
      fail(`question "${id}": ${q.type} requires criteria`);
    }
    if (q.type === "score" && (!Array.isArray(q.criteria) || q.criteria.length < 2)) {
      fail(`question "${id}": score criteria needs >= 2 levels`);
    }
  }
}

async function evaluate(key, payload) {
  let last = "request failed";
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      last = `network error: ${e.message}`;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return await res.json();
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      /* ignore */
    }
    if (res.status === 429 || res.status === 529) {
      last = `HTTP ${res.status} (overloaded/rate-limited), retrying`;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    fail(`HTTP ${res.status}: ${detail}`);
  }
  fail(`${last} - giving up after retries`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  const key = findKey();
  if (!key) fail("no API key found. Add `typesafe_api=<key>` to .env at repo root (never commit it)");

  let payload;
  if (args.demo) {
    payload = {
      state: "Help! My payouts have been failing for 3 days.",
      questions: { is_urgent: { type: "noul", instructions: "Does this convey urgency?" } },
    };
  } else if (args.file) {
    payload = JSON.parse(readFileSync(args.file, "utf8"));
  } else if (args.body) {
    payload = JSON.parse(args.body);
  } else if (!process.stdin.isTTY) {
    const raw = readFileSync(0, "utf8").trim();
    if (!raw) fail("empty stdin - provide payload JSON or use --demo");
    payload = JSON.parse(raw);
  } else {
    fail("missing input. Use --file, --body, stdin pipe, or --demo (see --help)");
  }

  validate(payload);
  if (!payload.model) payload.model = MODEL;
  const out = await evaluate(key, payload);
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((e) => fail(e && e.message ? e.message : "unexpected error"));
