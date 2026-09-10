import { DiscoveryState } from "@fresherflow/pipeline";
import { withTimeout, AGGREGATOR_RULES } from "@fresherflow/pipeline";
import {
  normalizeUrl,
  sanitizeAtsUrl,
  CDN_URL,
} from "@fresherflow/pipeline";
import {
  scoreJobDescription,
  hasFresherKeyword,
  isActualJob,
  isFresherJob,
  isSeniorJob,
} from "@fresherflow/utils";
import { logDecision } from "@fresherflow/pipeline";
import { findActualApplyLink } from "@fresherflow/pipeline";
import { isRejectedApplyUrl } from "@fresherflow/pipeline";
import { extractAtsBoard, buildJobIdentity } from "@fresherflow/pipeline";
import { parseJobTextLite } from "@fresherflow/parser";
import * as cheerio from "cheerio";
import { maybeCheckpointState } from "./storage.js";

// Persisted per-channel cursor: highest t.me post id already seen. Stored inside
// state.visited so it rides the same R2/GitHub-cache state as site visited lists.
const CHANNEL_CURSORS_KEY = "__channel_cursors__";

function loadChannelCursors(
  state: DiscoveryState,
): Map<string, number> {
  const map = new Map<string, number>();
  const raw = state.visited[CHANNEL_CURSORS_KEY] || [];
  for (const entry of raw) {
    const eq = entry.indexOf("=");
    if (eq > 0) {
      const id = parseInt(entry.slice(eq + 1), 10);
      if (!Number.isNaN(id)) map.set(entry.slice(0, eq), id);
    }
  }
  return map;
}

function saveChannelCursor(
  state: DiscoveryState,
  cursors: Map<string, number>,
) {
  state.visited[CHANNEL_CURSORS_KEY] = Array.from(cursors.entries()).map(
    ([channel, id]) => `${channel}=${id}`,
  );
}

// "enggwave/4004" -> 4004. t.me DOM lists posts oldest-first, so the newest
// post id on a page is the max numeric id.
function postIdNum(postId: string): number {
  const last = postId.split("/").pop() || "";
  const n = parseInt(last, 10);
  return Number.isNaN(n) ? 0 : n;
}

export async function loadChannelList(): Promise<{
  channels: string[];
  priorityChannels: string[];
}> {
  try {
    const res = await fetch(`${CDN_URL}/aggregators.json`);
    if (res.ok) {
      const data = await res.json();
      // New CDN format uses telegram_channels (old flat format used channel_list)
      const channels = data?.telegram_channels ?? data?.channel_list;
      if (Array.isArray(channels)) {
        const priorityChannels = Array.isArray(data?.priority_channels)
          ? (data.priority_channels as unknown[]).filter(
              (c): c is string => typeof c === "string",
            )
          : [];
        return { channels, priorityChannels };
      }
    }
  } catch {}

  console.warn(
    "No telegram_channels found in CDN aggregators.json. Skipping Channel discovery.",
  );
  return { channels: [], priorityChannels: [] };
}

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/g;
  const raw = text.match(urlRegex) || [];
  const cleaned: string[] = [];
  for (let u of raw) {
    // eslint-disable-next-line no-misleading-character-class
    u = u.replace(/[\u{1F000}-\u{1FFFF}\u2500-\u27BF\u{1D400}-\u{1D7FF}\uFE00-\uFE0F\u200D]/gu, "");
    u = u.replace(/[.,;:!?]+$/, "");
    u = u.replace(
      /(Land|Share|WhatsApp|Join|Follow|proFirst|proSlow|Telegram)$/i,
      "",
    );
    u = u.replace(/(Share|WhatsApp|Join)(?=[/?#]|$)/gi, "");
    try {
      new URL(u);
      cleaned.push(u);
    } catch {
      for (let i = u.length - 1; i > 10; i--) {
        try {
          new URL(u.slice(0, i));
          cleaned.push(u.slice(0, i));
          break;
        } catch {}
      }
    }
  }
  return [...new Set(cleaned)].filter((u) => u.length > 10);
}

function isChannelJobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const skipHosts = [
      "whatsapp.com",
      "aratt.ai",
      "t.me",
      "telegram.org",
      "instagram.com",
      "facebook.com",
      "twitter.com",
      "x.com",
      "youtube.com",
      "linkedin.com",
      "bit.ly",
      "tinyurl.com",
      "openinapp.co",
      "linktr.ee",
      "youtu.be",
      "telegram.me",
      "telegram.dog",
      "meet.google.com",
    ];
    if (skipHosts.some((h) => host === h || host.endsWith("." + h)))
      return false;
    const pathname = u.pathname.toLowerCase();
    if (pathname.includes("/channel/") || pathname.includes("/group/"))
      return false;
    const nonJobPatterns = [
      "/interview-questions",
      "/resume-",
      "/cover-letter",
      "/aptitude-",
      "/hr-email",
      "/tools",
      "/guide",
      "/syllabus",
      "/salary-",
      "/walk-in-interview",
      "/companies-hiring",
      "/recruitment-process",
      "/genc-guide",
      "/nth-guide",
      "/ase-guide",
      "/analyst-guide",
      "/fresher-guide",
      "/privacy",
      "/about",
      "/contact",
      "/faq",
      "/terms",
      "/cookie",
      "/web-stories",
      "/sponsor",
    ];
    if (nonJobPatterns.some((p) => pathname.includes(p))) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchChannelPage(
  channel: string,
  before?: string,
): Promise<string | null> {
  const url = before
    ? `https://t.me/s/${channel}?before=${before}`
    : `https://t.me/s/${channel}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(AGGREGATOR_RULES.channelFetchTimeout),
    });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

function parseChannelPosts(
  html: string,
): { id: string; text: string; urls: string[] }[] {
  const $ = cheerio.load(html);
  const posts: { id: string; text: string; urls: string[] }[] = [];
  $(".tgme_widget_message_wrap").each((_, el) => {
    const msgEl = $(el).find(".tgme_widget_message");
    const dataPost = msgEl.attr("data-post") || "";
    const text = $(el).find(".tgme_widget_message_text").text().trim();
    if (!text) return;
    const urls = extractUrlsFromText(text).filter(isChannelJobUrl);
    if (urls.length === 0) return;
    posts.push({ id: dataPost, text, urls });
  });
  return posts;
}

export async function discoverChannelJobs(state: DiscoveryState) {
  if (process.env.SKIP_CHANNELS === "true") {
    console.log(`\n=== 📡 Phase 3: Channel discovery (SKIPPED via ENV) ===\n`);
    return;
  }
  const { channels, priorityChannels } = await loadChannelList();
  if (channels.length === 0) return;

  // Build priority-first iteration list: priority channels that also appear in
  // telegram_channels, in declared priority order, then all remaining channels
  // in original order. Channels not in priority_channels are NEVER treated
  // differently than today (same pagination, same visit order).
  const prioritySet = new Set(priorityChannels);
  const seenOrder = new Set<string>();
  const priorityFirst: string[] = [];
  for (const p of priorityChannels) {
    if (channels.includes(p) && !seenOrder.has(p)) {
      priorityFirst.push(p);
      seenOrder.add(p);
    }
  }
  for (const ch of channels) {
    if (!seenOrder.has(ch)) {
      priorityFirst.push(ch);
      seenOrder.add(ch);
    }
  }

  console.log(
    `\n=== 📡 Phase 3: Telegram channel discovery (${channels.length} channels) ===\n`,
  );

  const matchedPriority = priorityFirst.filter((c) => prioritySet.has(c));
  if (matchedPriority.length > 0) {
    const shown = matchedPriority.slice(0, 4).join(", ");
    const more =
      matchedPriority.length > 4 ? ` (+${matchedPriority.length - 4} more)` : "";
    console.log(
      `⭐ Priority channels (${matchedPriority.length}): ${shown}${more}`,
    );
  }

  if (!state.browser) {
    throw new Error("Browser is not initialized in DiscoveryState");
  }

  // Step 1: Collect all URLs from Channel posts (HTTP only, no Playwright)
  const allUrls: {
    url: string;
    channel: string;
    postText: string;
    postId: string;
  }[] = [];

  const channelCursors = loadChannelCursors(state);
  // Per-channel post-id frontier fetched this run. cursorReady means the fetched
  // window is contiguous back to the old cursor (or it is a first run), so after
  // Step 2 processes every new post we can safely persist newestFetched as the
  // new cursor without skipping any unhandled posts.
  const newestFetched = new Map<string, number>();
  const oldestFetched = new Map<string, number>();
  const cursorReady = new Set<string>();

  for (const channel of priorityFirst) {
    if (state.isTimeUp()) break;
    maybeCheckpointState(state);

    console.log(`📡 Fetching channel: ${channel}`);
    let html = await fetchChannelPage(channel);
    if (!html) {
      console.log(`  ❌ Failed to fetch channel page.`);
      continue;
    }

    let posts = parseChannelPosts(html);
    console.log(`  📄 Page 1: ${posts.length} posts`);

    const cursor = channelCursors.get(channel) ?? 0;
    const firstPageMaxId = posts.reduce(
      (max, p) => Math.max(max, postIdNum(p.id)),
      0,
    );
    // Cursor: post ids increase over time. If the newest post on page 1 is
    // older than the last post we processed, this channel has nothing new.
    if (firstPageMaxId > 0 && firstPageMaxId <= cursor) {
      console.log(`  ⏭️  No new posts since #${cursor} — skipping.`);
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    // First run (no cursor yet): whole fetched window is new; safe to persist
    // the newest id as cursor after Step 2 processes it.
    if (cursor === 0 && posts.length > 0) cursorReady.add(channel);

    const trackFetchedWindow = (postsList: typeof posts) => {
      for (const p of postsList) {
        const n = postIdNum(p.id);
        if (n <= 0) continue;
        newestFetched.set(channel, Math.max(newestFetched.get(channel) ?? 0, n));
        oldestFetched.set(
          channel,
          Math.min(oldestFetched.get(channel) ?? Infinity, n),
        );
      }
    };

    const collectNewPosts = (postsList: typeof posts) => {
      for (const p of postsList) {
        // Only collect posts newer than the cursor (older ones were processed
        // in a previous run — no need to re-fetch/re-visit them).
        if (postIdNum(p.id) <= cursor) continue;
        for (const url of p.urls) {
          allUrls.push({ url, channel, postText: p.text, postId: p.id });
        }
      }
    };
    trackFetchedWindow(posts);
    collectNewPosts(posts);

    // Paginate older (up to 2 more pages) until a page is entirely older than
    // the cursor — everything further back was already processed in a past run.
    let pageNum = 1;
    while (posts.length > 0 && pageNum < 3) {
      const firstMsgId = posts[0]?.id.split("/").pop();
      if (!firstMsgId) break;
      await new Promise((r) => setTimeout(r, 1500));
      html = await fetchChannelPage(channel, firstMsgId);
      if (!html) break;
      posts = parseChannelPosts(html);
      console.log(`  📄 Page ${pageNum + 1}: ${posts.length} posts`);
      const olderMaxId = posts.reduce(
        (max, p) => Math.max(max, postIdNum(p.id)),
        0,
      );
      trackFetchedWindow(posts);
      // Reached posts from the last run — everything older is already handled,
      // so the window is contiguous back to the cursor and we can stop here.
      if (olderMaxId > 0 && olderMaxId <= cursor) {
        cursorReady.add(channel);
        break;
      }
      collectNewPosts(posts);
      pageNum++;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  // Dedup by post ID (prevents reprocessing same TG post across runs)
  const seenPostIds = new Set<string>();
  const seenUrls = new Set<string>();
  const uniqueUrls: typeof allUrls = [];
  for (const item of allUrls) {
    // Dedup by TG post ID (same post shared across channels = same ID)
    if (item.postId && seenPostIds.has(item.postId)) continue;
    if (item.postId) seenPostIds.add(item.postId);
    // Dedup by normalized URL (same job post found via different channel posts)
    const normUrl = normalizeUrl(item.url);
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);
    uniqueUrls.push(item);
  }

  console.log(
    `\n📥 Collected ${uniqueUrls.length} unique URLs from channels.`,
  );

  // Step 2: Visit each URL with Playwright and extract real ATS links
  // (parallel worker pool over a shared queue)
  const WORKERS = Math.min(4, Math.max(1, parseInt(process.env.CHANNEL_CONCURRENCY || "3", 10)));

  let processed = 0,
    extracted = 0,
    skipped = 0;
  const httpGate = { attempted: 0, positive: 0, negative: 0, uncertain: 0 };
  let next = 0;
  const take = () => uniqueUrls[next++] ?? null;

  const runWorker = async () => {
    const context = await state.browser!.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await context.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    let page = await context.newPage();
    try {
      while (true) {
        const item = take();
        if (!item) break;
        if (state.isTimeUp()) {
          console.log(`\n[Timeout] ⏱️ Halting Channel discovery.`);
          break;
        }

        // Skip if a parallel source (aggregator/dorker) already claimed this URL during
        // this run. knownLinks is in-memory only — wrapper/post URLs must never be
        // persisted into the apply-links bucket (that would poison cross-run dedupe).
        const normalizedUrl = normalizeUrl(item.url);
        if (state.knownLinks.has(normalizedUrl)) {
          skipped++;
          continue;
        }
        // Claim NOW (in-memory only) so other parallel workers skip this URL while
        // we're still visiting it.
        state.knownLinks.add(normalizedUrl);

    // Parse structured Channel post text directly (no Playwright)
        const parsed = parseJobTextLite(item.postText);
        const title = parsed.title || item.postText.slice(0, 100);
        const parsedCompany = parsed.company || "";

        const scoreResult = scoreJobDescription(title, item.postText, { skipDriveBlocker: true });
        logDecision(scoreResult, item.url, "Channel");

        // Phase-1 wrapper-title check: only skip on REAL negative evidence (score < 0 =
        // senior/experienced signals). Score 0 / unknown drive titles ("TCS Mass Hiring")
        // pass through flagged for review — the fresher decision happens on the actual
        // apply page in the verifier. Never kill on drive words here.
        if (scoreResult.verdict === "REJECT" && scoreResult.score < 0) {
          console.log(`❌ Skipped: not fresher-friendly (score ${scoreResult.score})`);
          processed++;
          continue;
        }

        if (isSeniorJob(title)) {
          console.log(`👨‍💼 Skipped: senior role`);
          processed++;
          continue;
        }

        if (!isActualJob(title, { allowDriveTitles: true })) {
          if (hasFresherKeyword(title)) {
            // Keep it, might be relevant
          } else {
            console.log(`🚫 Skipped: not a job post`);
            processed++;
            continue;
          }
        }

        // Skip government jobs (SSC, UPSC, Railway, Banking, govt orgs)
        const govtPatterns =
          /\b(SSC|UPSC|RRB|Railway|Banking|IBPS|SBI|India Post|GDS|Constable|Sub.?Inspector|Forest Guard|Postal|government recruitment|govt recruitment|sarkari|central government|state government|public service commission|PSU|coal india|defense|army|navy|airforce)\b/i;
        if (govtPatterns.test(item.postText) || govtPatterns.test(title)) {
          console.log(`🏛️  Skipped: government job`);
          processed++;
          continue;
        }

        // Visit wrapper page to get real ATS link (most TG posts link to wrappers)
        const siteDomain = new URL(item.url).hostname;
        let applyLink = item.url;
        let extractedLink: string | null = null;

        // HTTP pre-gate (additive): cheap static fetch before any browser work.
        // POSITIVE -> applyLink + extractedLink set, skip browser. NEGATIVE
        // (definitive 404/410) -> skip browser AND queueing. UNCERTAIN ->
        // fall through to the browser path unchanged. Missing ATS evidence in
        // static HTML is UNCERTAIN, never NEGATIVE.
        let httpGateReason = "UNCERTAIN_BROWSER_FALLTHROUGH";
        let httpGateResolved = false;
        httpGate.attempted++;
        if (extractAtsBoard(item.url)) {
          applyLink = item.url;
          extractedLink = item.url;
          httpGateReason = "DIRECT_ATS";
          httpGateResolved = true;
          httpGate.positive++;
        } else {
          const httpCtrl = new AbortController();
          const httpTimer = setTimeout(() => httpCtrl.abort(), 8000);
          try {
            const httpRes = await fetch(item.url, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
              redirect: "follow",
              signal: httpCtrl.signal,
            });
            if (httpRes.status === 404 || httpRes.status === 410) {
              httpGateReason = "DEFINITIVE_404";
              httpGate.negative++;
              console.log(`http_gate=${httpGateReason} ${item.url}`);
              processed++;
              continue;
            }
            if (!httpRes.ok) {
              httpGateReason = `UNCERTAIN_NON_200_${httpRes.status}`;
              httpGate.uncertain++;
            } else {
              const finalUrl = httpRes.url || item.url;
              if (extractAtsBoard(finalUrl)) {
                applyLink = finalUrl;
                extractedLink = finalUrl;
                httpGateReason = "ATS_RESOLVED";
                httpGateResolved = true;
                httpGate.positive++;
              } else {
                const contentType = httpRes.headers.get("content-type") || "";
                if (!contentType.includes("text/html")) {
                  httpGateReason = "UNCERTAIN_CONTENT_TYPE";
                  httpGate.uncertain++;
                } else {
                  const staticHtml = await httpRes.text();
                  const $static = cheerio.load(staticHtml);
                  let resolvedAts: string | null = null;
                  $static("a[href]").each((_, el) => {
                    if (resolvedAts) return;
                    const rawHref = $static(el).attr("href");
                    if (!rawHref) return;
                    try {
                      const abs = new URL(rawHref, finalUrl).toString();
                      if (extractAtsBoard(abs)) resolvedAts = abs;
                    } catch {}
                  });
                  if (resolvedAts) {
                    applyLink = resolvedAts;
                    extractedLink = resolvedAts;
                    httpGateReason = "ATS_RESOLVED";
                    httpGateResolved = true;
                    httpGate.positive++;
                  } else {
                    httpGateReason = "UNCERTAIN_NO_ATS_HREF";
                    httpGate.uncertain++;
                  }
                }
              }
            }
          } catch (httpErr) {
            httpGateReason =
              httpErr instanceof Error && httpErr.name === "AbortError"
                ? "UNCERTAIN_TIMEOUT"
                : "UNCERTAIN_FETCH_ERROR";
            httpGate.uncertain++;
          } finally {
            clearTimeout(httpTimer);
          }
        }
        console.log(`http_gate=${httpGateReason} ${item.url}`);

        if (!httpGateResolved) {
          if (await withTimeout(page.close().catch(() => {}), AGGREGATOR_RULES.pageCloseTimeout) === null) {
            console.log(`  ⚠️ page.close() stuck >${AGGREGATOR_RULES.pageCloseTimeout / 1000}s — abandoning page`);
          }
          const freshPage = await withTimeout(context.newPage(), AGGREGATOR_RULES.pageCreateTimeout);
          if (!freshPage) {
            console.log(`  ⚠️ context.newPage() stuck >${AGGREGATOR_RULES.pageCreateTimeout / 1000}s — skipping ${item.url}`);
            processed++;
            continue;
          }
          page = freshPage;
          try {
            await page.goto(item.url, {
              waitUntil: "domcontentloaded",
              timeout: 20000,
            });
            await page
              .waitForSelector("article, .post-body, .entry-content, main, .post", {
                timeout: 8000,
              })
              .catch(() => {});
            await page.waitForTimeout(500);
            extractedLink = await findActualApplyLink(
              page,
              context,
              siteDomain,
            );
            if (extractedLink) applyLink = extractedLink;
          } catch {}
        }

        // Aggregator site posts / govt portals / listing pages must never become
        // jobs — only real apply links get queued. If extraction found nothing and
        // the wrapper URL itself is such a page, skip it (don't post the wrapper).
        if (!extractedLink && isRejectedApplyUrl(item.url)) {
          console.log(
            `🚫 Skipped: wrapper is an aggregator/govt/listing page (${item.url})`,
          );
          processed++;
          continue;
        }

        const boardMatch = extractAtsBoard(applyLink);
        if (boardMatch) {
          const { provider, boardId } = boardMatch;
          if (!state.atsRegistry[provider]) state.atsRegistry[provider] = {};
          if (!state.atsRegistry[provider]![boardId]) {
            let guessedName = boardId;
            const atMatch = title.match(/ at (.+)$/i) || title.match(/ by (.+)$/i);
            if (atMatch) {
              guessedName = atMatch[1].trim();
            } else if (boardId.startsWith("http")) {
              try {
                guessedName = new URL(boardId).hostname.split(".")[0];
                guessedName =
                  guessedName.charAt(0).toUpperCase() + guessedName.slice(1);
              } catch {}
            }
            state.atsRegistry[provider]![boardId] = guessedName;
            state.registryModified = true;
            console.log(
              `  🌟 Discovered NEW ATS board from Channel! ${provider}: ${boardId} (${guessedName})`,
            );
          }
        } else {
          try {
            const urlObj = new URL(applyLink);
            const baseDomain = urlObj.origin;
            const lowerUrl = applyLink.toLowerCase();
            if (/career|job|workday|opportunit/i.test(lowerUrl)) {
              state.discoveredCareers.add(baseDomain);
            } else {
              state.discoveredRemaining.add(baseDomain);
            }
          } catch {}
        }

        const cleanApplyLink = sanitizeAtsUrl(applyLink);
        const normalizedApplyLink = normalizeUrl(cleanApplyLink);

        if (
          state.knownLinks.has(normalizedApplyLink) ||
          state.visited["__discovered_apply_links__"].includes(normalizedApplyLink)
        ) {
          console.log(`♻️ Skipped: already seen`);
          processed++;
          continue;
        }
        state.knownLinks.add(normalizedApplyLink);
        state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
        if (state.visited["__discovered_apply_links__"].length > 50000) {
          state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
        }

        let isReview = true;
        if (isFresherJob(title)) isReview = false;
        else if (scoreResult.verdict === "HIGH") isReview = false;

        console.log(`📥 Queued: ${cleanApplyLink}`);
        const channelIdentity = buildJobIdentity({ applyLink: cleanApplyLink, company: parsedCompany, title });
        state.candidateQueue.push({
          applyLink: cleanApplyLink,
          source: `channel-${item.channel}`,
          sourceType: "AGGREGATOR",
          aggregatorUrl: item.url,
          aggregatorTitle: title.trim(),
          isAggregatorReview: isReview,
          company: parsedCompany,
          jobIdentityKind: channelIdentity.kind,
          jobIdentity: channelIdentity.value,
        });
        console.log(`job_identity=${channelIdentity.kind}:${channelIdentity.value}`);
        extracted++;
        processed++;
      }
    } finally {
      if (await withTimeout(page.close().catch(() => {}), AGGREGATOR_RULES.pageCloseTimeout) === null) {
        console.log(`  ⚠️ channel-teardown page.close() stuck >${AGGREGATOR_RULES.pageCloseTimeout / 1000}s — abandoning`);
      }
      if (await withTimeout(context.close(), AGGREGATOR_RULES.contextCloseTimeout) === null) {
        console.log(`  ⚠️ channel-teardown context.close() stuck >${AGGREGATOR_RULES.contextCloseTimeout / 1000}s — abandoning`);
      }
    }
  };

  const workers = Array.from(
    { length: uniqueUrls.length === 0 ? 0 : Math.min(WORKERS, uniqueUrls.length) },
    () => runWorker(),
  );
  await Promise.all(workers);

  // Persist channel cursors so the next run collects only strictly-new posts.
  // cursorReady = fetched window is contiguous back to the old cursor (or first
  // run), so newestFetched is safe to store. Without this, every run replays
  // the full 3-page window (~760 revisits, ~1h wasted): knownLinks is
  // in-memory only and can never dedup across runs.
  try {
    for (const ch of cursorReady) {
      const n = newestFetched.get(ch) ?? 0;
      if (n > 0) channelCursors.set(ch, Math.max(channelCursors.get(ch) ?? 0, n));
    }
    saveChannelCursor(state, channelCursors);
  } catch {}

  // Per-channel yield: count queued jobs per channel from the candidateQueue.
  const channelYield: Record<string, number> = {};
  for (const item of state.candidateQueue) {
    if (item.source && item.source.startsWith('channel-')) {
      const ch = item.source.slice('channel-'.length);
      channelYield[ch] = (channelYield[ch] || 0) + 1;
    }
  }
  if (Object.keys(channelYield).length > 0) {
    console.log('\n📊 Per-channel yield (queued jobs):');
    const sorted = Object.entries(channelYield).sort((a, b) => b[1] - a[1]);
    for (const [ch, count] of sorted) {
      console.log(`  ${ch.padEnd(30)} ${count} job(s)`);
    }
  }

  // Priority yield: count how many times each priority channel contributed
  // URLs to the allUrls collector after dedup (post-id + normalized URL).
  if (prioritySet.size > 0) {
    const priorityYield: Record<string, number> = {};
    for (const item of uniqueUrls) {
      if (prioritySet.has(item.channel)) {
        priorityYield[item.channel] = (priorityYield[item.channel] || 0) + 1;
      }
    }
    const entries = Object.entries(priorityYield).filter(([, c]) => c > 0);
    if (entries.length > 0) {
      console.log('\n⭐ Priority yield (URLs seen):');
      const sorted = entries.sort((a, b) => b[1] - a[1]);
      for (const [ch, count] of sorted) {
        console.log(`  ${ch.padEnd(30)} ${count} URL(s)`);
      }
    }
  }

  console.log(
    `\n✅ Channel Phase 3: ${extracted} queued, ${skipped} skipped (known), ${processed - extracted} no apply link.\n`,
  );
  console.log(
    `http_gate funnel: attempted=${httpGate.attempted} positive=${httpGate.positive} negative=${httpGate.negative} uncertain=${httpGate.uncertain}`,
  );
}
