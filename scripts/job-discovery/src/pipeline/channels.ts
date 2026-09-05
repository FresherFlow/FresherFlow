import { DiscoveryState } from "@fresherflow/pipeline";
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
import { extractAtsBoard } from "@fresherflow/pipeline";
import { parseJobTextLite } from "@fresherflow/parser";
import * as cheerio from "cheerio";

let CHANNEL_LIST: string[] = [];

export async function loadChannelList(): Promise<string[]> {
  try {
    const res = await fetch(`${CDN_URL}/aggregators.json`);
    if (res.ok) {
      const data = await res.json();
      // New CDN format uses telegram_channels (old flat format used channel_list)
      const list = data?.telegram_channels ?? data?.channel_list;
      if (Array.isArray(list)) return list;
    }
  } catch {}

  console.warn(
    "No telegram_channels found in CDN aggregators.json. Skipping Channel discovery.",
  );
  return [];
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
    console.log(`\n=== Phase 3: Channel channels (SKIPPED via ENV) ===\n`);
    return;
  }
  CHANNEL_LIST = await loadChannelList();
  if (CHANNEL_LIST.length === 0) return;

  console.log(
    `\n=== Phase 3: Channel channel discovery (${CHANNEL_LIST.length} channels) ===\n`,
  );

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

  for (const channel of CHANNEL_LIST) {
    if (state.isTimeUp()) break;

    console.log(`Fetching channel: ${channel}`);
    let html = await fetchChannelPage(channel);
    if (!html) {
      console.log(`  -> Failed to fetch`);
      continue;
    }

    let posts = parseChannelPosts(html);
    console.log(`  Page 1: ${posts.length} posts`);
    for (const p of posts) {
      for (const url of p.urls) {
        allUrls.push({ url, channel, postText: p.text, postId: p.id });
      }
    }

    // Paginate (up to 2 more pages)
    let pageNum = 1;
    while (posts.length > 0 && pageNum < 3) {
      const firstMsgId = posts[0]?.id.split("/").pop();
      if (!firstMsgId) break;
      await new Promise((r) => setTimeout(r, 1500));
      html = await fetchChannelPage(channel, firstMsgId);
      if (!html) break;
      posts = parseChannelPosts(html);
      console.log(`  Page ${pageNum + 1}: ${posts.length} posts`);
      for (const p of posts) {
        for (const url of p.urls) {
          allUrls.push({ url, channel, postText: p.text, postId: p.id });
        }
      }
      pageNum++;
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  // Dedup by post ID (prevents reprocessing same TG post across runs)
  const seenPostIds = new Set<string>();
  const seenUrls = new Set<string>();
  const uniqueUrls = allUrls.filter((item) => {
    // Dedup by TG post ID
    if (item.postId && seenPostIds.has(item.postId)) return false;
    if (item.postId) seenPostIds.add(item.postId);
    // Dedup by URL
    if (seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });

  console.log(
    `\nCollected ${uniqueUrls.length} unique URLs from Channel sources.`,
  );

  // Step 2: Visit each URL with Playwright and extract real ATS links
  const context = await state.browser.newContext({
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

  let processed = 0,
    extracted = 0,
    skipped = 0;
  let page = await context.newPage();

  for (const item of uniqueUrls) {
    if (state.isTimeUp()) {
      console.log(`\n[Timeout] ⏱️ Halting Channel discovery.`);
      break;
    }

    // Skip URLs we already know
    const normalizedUrl = normalizeUrl(item.url);
    if (
      state.knownLinks.has(normalizedUrl) ||
      state.visited["__discovered_apply_links__"].includes(normalizedUrl)
    ) {
      skipped++;
      continue;
    }

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
      console.log(`  -> Skipping: Rejected by scorer (score ${scoreResult.score})`);
      processed++;
      continue;
    }

    if (isSeniorJob(title)) {
      console.log(`  -> Skipping: Senior job`);
      processed++;
      continue;
    }

    if (!isActualJob(title, { allowDriveTitles: true })) {
      if (hasFresherKeyword(title)) {
        // Keep it, might be relevant
      } else {
        console.log(`  -> Skipping: Not an actual job post`);
        processed++;
        continue;
      }
    }

    // Skip government jobs (SSC, UPSC, Railway, Banking, govt orgs)
    const govtPatterns =
      /\b(SSC|UPSC|RRB|Railway|Banking|IBPS|SBI|India Post|GDS|Constable|Sub.?Inspector|Forest Guard|Postal|government recruitment|govt recruitment|sarkari|central government|state government|public service commission|PSU|coal india|defense|army|navy|airforce)\b/i;
    if (govtPatterns.test(item.postText) || govtPatterns.test(title)) {
      console.log(`  -> Skipping: Government job`);
      processed++;
      continue;
    }

    // Visit wrapper page to get real ATS link (most TG posts link to wrappers)
    const siteDomain = new URL(item.url).hostname;
    let applyLink = item.url;

    await page.close().catch(() => {});
    page = await context.newPage();
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
      const extractedLink = await findActualApplyLink(
        page,
        context,
        siteDomain,
      );
      if (extractedLink) applyLink = extractedLink;
    } catch {}

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
      console.log(`  -> Skipping: Already seen`);
      processed++;
      continue;
    }

    state.knownLinks.add(normalizedApplyLink);
    // Also track wrapper URL to prevent re-queueing same post from different channels
    state.knownLinks.add(normalizedUrl);

    let isReview = true;
    if (isFresherJob(title)) isReview = false;
    else if (scoreResult.verdict === "HIGH") isReview = false;

    console.log(`  -> Queued: ${cleanApplyLink}`);
    state.candidateQueue.push({
      applyLink: cleanApplyLink,
      source: `channel-${item.channel}`,
      sourceType: "AGGREGATOR",
      aggregatorUrl: item.url,
      aggregatorTitle: title.trim(),
      isAggregatorReview: isReview,
      company: parsedCompany,
    });
    extracted++;
    processed++;
  }

  await page.close().catch(() => {});
  await context.close();

  console.log(
    `\n-> Channel Phase 3: ${extracted} queued, ${skipped} skipped (known), ${processed - extracted} failed extraction.\n`,
  );
}
