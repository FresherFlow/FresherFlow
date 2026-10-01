# SEO project context — FresherFlow

Staged answers to the `/seo-project-setup` interview, plus the technical audit
and the evidence behind them. Every claim is sourced from this repo unless
marked **[NEEDS DECISION]**, which means it cannot be derived from code and only
you can answer it.

**Canonical home:** OpenSEO project context, at the URL in §1. Business overview,
positioning, competitors, key pages and the research log now live there. What
stays in this file is what the Context page cannot model: the technical audit,
the evidence, and the open questions.

**Status:** 2026-09-29. MCP authenticated, context written back, zero credits
spent. See §9.2 for the most consequential finding in this document.

---

## 1. MCP + project

**Connected and authenticated.** OAuth 2.1 with PKCE (S256), dynamic client
registration against `/api/auth/oauth2/register`, code exchanged at
`/api/auth/oauth2/token`. Token lifetime 24h, scope `offline_access mcp`.

- Server: `https://app.openseo.so/mcp` (hosted), registered in
  `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- Project: `dbbfddc6-69dc-491f-be33-1a818a255c5d` — "Default", fresherflow.in,
  market 2356 (IN) / en
- Context page: https://app.openseo.so/p/dbbfddc6-69dc-491f-be33-1a818a255c5d/context

**Now in OpenSEO context:** business overview, positioning, 6 competitors, 15 key
pages, research log.
**Still empty:** `current_goal`, `writing_preferences` — both need a human answer,
see the table at the end.

**Cost discipline: 208 credits, all untouched.** Everything here came from free
tools only (`whoami`, `list_projects`, `get_project_context`,
`update_project_context`, `list_reports`), plus source reading and live HTTP
fetches of the CDN. No keyword, volume, SERP, ranking or backlink tool was
called.

**Tooling note.** `.scratch/mcp.cjs` calls the MCP endpoint over Streamable HTTP
in Node, because Cline's own tool list only populates after a restart. Token and
PKCE material were deleted after use.

---

## 2. Site scope

| Surface | Value | Source |
|---|---|---|
| Canonical site | `fresherflow.in` | `apps/web/src/app/(public)/page.tsx:19-21` |
| Audience | India, English, single language | same |
| Stage | ~7 months old, pre-launch | `docs/product-audit.md:3,12` |
| Infra, **not** SEO surfaces | `api.fresherflow.in`, `cdn.fresherflow.in` | — |

Notes that matter for scoping:

- The site is **India-first and fresher-only**. The landing title is
  `"FresherFlow — Jobs, powered by freshers"` (`page.tsx:19`, em dash) and the
  description names off-campus jobs, internships and walk-ins explicitly
  (`page.tsx:20-21`). Generic job-board intent is not the target.
- A 301 ledger is already consolidating a legacy URL namespace — dozens of
  permanent redirects in `apps/web/next.config.ts:257-427`, covering
  `/internships`, `/remote`, `/walk-ins`, `/off-campus`, `/government-jobs`,
  `/skills`, `/roles`, `/locations`, `/opportunities`, `/moderation`, and
  `/batch`. So historical URLs exist and the taxonomy has already moved once.
  Any keyword work should assume the namespace is **not** frozen.
- Two robots classes are in force: `GPTBot` and `CCBot` are disallowed at `/`
  (`apps/web/src/app/robots.ts:55-62`). That is an LLM-search decision, already
  made — preserve it unless deliberately revisited.

---

## 3. Goals and metric

**[NEEDS DECISION] — this one I cannot answer for you.**

What I can tell you from the repo:

- `docs/product-audit.md:80` states the thesis: *"SEO as a moat — canonicals,
  sitemaps, structured data, board URLs with indexing discipline. Discoverability
  compounds."* So the intent is compounding discovery, not a campaign spike.
- The product loop is **discover → evaluate → apply → track → discuss**
  (`product-audit.md:75`). Signup sits between discover and apply, gated at the
  save/apply action. So the natural conversion event is a signup triggered from
  a job detail or board page.
- `product-audit.md:84` names the single biggest trust gap: **"alerts have
  settings but no visible delivery proof."** This matters directly for SEO
  conversion — an organic visitor who sets an alert and then sees nothing will
  not return, and the ranking compounds on return behaviour.

Decide three things:

1. **Primary metric** — signups, or something downstream (profile completions,
   saves, applications tracked).
2. **Which segment** — the repo does not say. Candidates the site actually
   serves: campus/off-campus seekers, walk-in drive seekers, government job
   seekers, internship seekers. Each implies a different keyword portfolio and
   they compete with different incumbents.
3. **Timeframe** — a launch milestone, a quarter, or an open horizon.

I would pick signups from `/jobs/*` and `/drives/*` as the default to confirm,
because those are the surfaces with the loop and the moat. But you own this call.

---

## 4. Positioning

Confirmed from the code, not drafted.

> **"Jobs, powered by freshers."** Off-campus jobs, internships and walk-ins for
> freshers in India, shared by the community and linked straight to official
> pages.

- Title: `app/(public)/page.tsx:19`
- Description: `app/(public)/page.tsx:20-21`
- App-store framing: *"Find jobs. Share opportunities. Help other freshers."*
  (`app/(public)/app/page.tsx:10,17`)

**The differentiator is India-specific campus recruitment that aggregators
under-serve:** walk-in drives with per-city pages, off-campus drives, government
notifications, and batch-year board URLs. That is the wedge. Generic ATS terms
are deliberately *not* the target — the taxonomy research
(`docs/opportunity-taxonomy-research.md:18-33`) shows every major ATS treats
`INTERNSHIP` as an employment arrangement, not a top-level type, so competing
on generic type taxonomy is unwinnable.

**One honesty constraint you should know about.** `product-audit.md:32` notes
the landing page *"hides a comparison section for claims not yet true."* If
positioning leans on community scale or verified listings, that claim must be
true before it goes in title tags or copy.

---

## 5. Competitors

**Partly derivable, partly not.** The repo names competitors in *research
context* (taxonomy benchmarking), not as a competitive set. I am **not** going
to claim these are who you lose searches to — that needs Search Console data or
a real answer from you.

Candidates present in the repo, by tier:

| Competitor | Why it appears | Source |
|---|---|---|
| **Freshersworld** | Closest shape: IT + government + internship + diploma + walk-in + teaching + startup + work-from-home. India, fresher, walk-in | `taxonomy-research.md:96,100` |
| **Unstop** | Jobs, internships, government jobs, scholarships, hackathons, workshops. India, fresher, student-events adjacency | `taxonomy-research.md:97,102` |
| **Internshala** | India internships, WFH, part-time, stipend, duration | `taxonomy-research.md:28` |
| **LinkedIn** | Generic benchmark for taxonomy, not fresher-specific. Loses on fresher intent, wins on branded/company queries | `taxonomy-research.md:18` |
| **Wellfound** | Remote/startup benchmark | `taxonomy-research.md:24` |
| Naukri, Indeed | **Not named anywhere in the repo.** Named here only because they are the obvious Indian job-board incumbents — treat as unverified | — |

**[NEEDS DECISION]:** confirm the real competitive set. Specifically, who do you
actually lose on walk-in and off-campus queries? Freshersworld and Unstop are
the two I would start from, on the evidence of what they index. But the honest
answer only comes from query data.

---

## 6. Key pages

From the route inventory and the audit in
`docs/audits/01-routing-metadata-seo.md`.

| Page | URL | Role |
|---|---|---|
| Jobs hub | `/jobs` | Primary organic entry |
| Job detail | `/jobs/[slug]` | Money page. `JobPosting` JSON-LD, ISR, `dynamicParams=true` |
| Internships | `/jobs/internships` | Spoke |
| Remote | `/jobs/remote` | Spoke |
| Full-time / part-time | `/jobs/full-time`, `/jobs/part-time` | Spokes |
| **Walk-ins** | `/drives/walk-in`, `/drives/walk-in/[city]` | **The moat.** Per-city pages, server-rendered venue, landmark, reporting time |
| **Off-campus** | `/drives/off-campus` | **The moat** |
| Government | `/govt`, `/govt/[slug]` | Spoke |
| Companies | `/companies`, `/companies/[slug]` | Hub + entity hub |
| Public profiles | `/u/[username]` | Long-tail, user-generated |
| Recruiters | `/recruiters` | B2B intent, different funnel |
| Browse directory | `/jobs/browse` | Role/city/skill/batch URL space |

**On the walk-in city pages — the map is not there yet.** The geo primitives
exist and are unused by the page: `walkinMapUtils.ts` has `latitude`/`longitude`,
`techCluster`, `getMapFallbackCenter`, and a Haversine `getDistanceKm`, and
`[city]/page.tsx:10` imports `getDriveDetails`. But the page renders drive
cards as text only — venue address, landmark, reporting time
(`[city]/page.tsx:229-250`). No map component, no embed, no distance sort.
Geo is the most defensible moat available here and the surface that would use
it is unbuilt. Worth noting for `/link-prospecting`: a proximity-sorted
"drives near me" tool is a linkable asset, and right now there is no
linkable asset at all.

Two more things to flag before this becomes a plan:

- **`/jobs/remote` has no OG or Twitter metadata** — it is the only hub of eight
  that does not (`01-routing-metadata-seo.md` §3). One-line fix, real shareability loss.
- **`/jobs/[slug]` calls `fetchFeedIndex` three times per request** and
  `/companies/[slug]` re-fetches company metadata outside the React `cache()`
  wrapper (`01-routing-metadata-seo.md` §7). This is the highest-traffic template
  on the site. Performance work here is SEO work.

---

## 7. Search Console

**[NEEDS DECISION] — I cannot answer this.** It is account state, not repo state.

Two things I did establish:

- `apps/web/src/app/robots.ts:64` advertises `${host}/sitemap.xml`, and
  `next.config.ts:234-256` rewrites both `/sitemap.xml` and `/sitemap-:name.xml`
  to `app/api/public/sitemap`. So the sitemap surface is wired.
- `docs/audits/03-data-fetching-caching.md` §4 notes `/resources` and
  `/api/public/sitemap` use `next.revalidate` with **no cache tag**, so they can
  only age out, never be invalidated on publish.

Answer one:

1. Is Search Console already connected on the OpenSEO Integrations page?
2. If not — do you want CSV exports, or should this be a later step?

Query data changes the answers above materially. Competitors, the segment to
target, and whether the taxonomy namespace should move again are all questions
that GSC resolves in an afternoon and guessing does not.

---

## 8. Content situation

Derived from the route inventory and `product-audit.md`.

**The blog has no post route.** `apps/web/src/app/(public)/blog/` contains
exactly one file, `page.tsx`, and it renders a single hardcoded launch post
(`product-audit.md:32`). No `[slug]` segment, no MDX, no CMS, no frontmatter.
For a site whose entire moat is fresher job data, this is the largest unbuilt
surface and the highest-leverage thing the project could add.

**No linkable assets exist.** No study, calculator, template, dataset, or
original-research page anywhere in the repo. `/link-prospecting` has nothing to
promote until one is built. The geo primitives in `walkinMapUtils.ts` are the
most obvious candidate: a proximity-sorted "walk-in drives near you" tool is
genuinely useful and genuinely linkable.

**Community surfaces are unproven as content.** Rooms, discussions, referrals,
and salary transparency are user-generated and moderated, with real long-tail
potential. Nothing in the repo indicates those pages carry unique indexable
prose — they are lists and threads.

**`/platforms` is a redirect**, not a page — `next.config.ts` sends it to
`/resources`, and `product-audit.md:32` calls it a duplicate of the resources
tab. Navigation dead weight, not an SEO problem.

---

## 9. Technical baseline

So later work does not redo what is already correct.

**Working, do not touch:**

- `app/robots.ts` — allow-listed public paths, blocked admin and auth routes,
  explicit allowances for social bots so OG images are not caught by the
  `/api` disallow, `GPTBot` and `CCBot` blocked at `/`.
- Rewrite-backed sitemaps. `next.config.ts:234-244` routes `/sitemap.xml` and
  `/sitemap-:name.xml` to `app/api/public/sitemap/route.ts`, which fetches
  pre-generated XML from the CDN and rewrites the origin to the request host.
  Sitemaps scale with the feed instead of being hardcoded. `max-age=86400`,
  edge `s-maxage=86400`, `stale-while-revalidate=3600`.
- One `Organization` JSON-LD node, emitted once from `app/layout.tsx:75-156`,
  with a comment recording that a duplicate conflicting node on the homepage was
  removed. `SITE_DESCRIPTION` exists to stop the description being pasted in
  five places.
- `generateOpportunityMetadata` and `generateOpportunityJsonLd` in
  `features/jobs/domain/opportunitySeo.ts`, shared by `/jobs/[slug]` and
  `/govt/[slug]`. The `JobPosting` node is thorough: `hiringOrganization`,
  `jobLocation`, `employmentType`, `directApply`, `skills`,
  `experienceRequirements`, `applicantLocationRequirements`, `baseSalary`,
  `qualifications`, plus a `postedAt + 90d` `validThrough` fallback.
- `lib/seo/seoMetrics.ts` — pixel-accurate title and description truncation
  calibrated to Google snippet limits, binary-search word-boundary cutting.
- Empty taxonomy boards render `noindex`, never a 404
  (`jobs/[slug]/page.tsx:206`).
- `X-Robots-Tag: noindex` on `/admin`, `/admin/*`, and the admin host
  (`next.config.ts:206-227`).

**Status as of 2026-09-29 (post-fix).** The audit
(`docs/audits/01-routing-metadata-seo.md`) is **stale** — it was read-only and
predates a large concurrent refactor. Re-verified against the current worktree
below. Items marked FIXED were closed by someone else before this pass
reached them; items marked FIXED HERE were closed in this pass.

| # | Finding | Status |
|---|---|---|
| 1 | Root `template` double-suffixes ~10 public pages | **FIXED** — hub titles dropped the brand suffix and rely on the template (`jobs/page.tsx:12`, `drives/*`, `govt/page.tsx:12`, `jobs/{internships,full-time,part-time}`) |
| 2 | Six public routes with no canonical, no robots, no OG | **FIXED HERE** — `resources/[id]`, `resources/company/[id]`, `resources/skill/[id]`, `community/[id]`, `community/rooms/[slug]`, `u/[username]` |
| 3 | `govt/[slug]` emits the breadcrumb graph twice | **FIXED** — one script at `govt/[slug]/page.tsx:190` |
| 4 | Three pages hardcode `https://fresherflow.in` | **FIXED** — `recruiters/layout.tsx:14-21`, `about/page.tsx:19-26`, `blog/page.tsx:10-17` all use relative canonicals |
| 5 | `jobs/browse` OG title ≠ document title | **FIXED** — both from `BROWSE_TITLE` (`browse/page.tsx:17,22,28,35`) |
| 6 | **`noindex` gap on the `(user)` group** | **FIXED HERE** — one `X-Robots-Tag` entry in `next.config.ts` covering all 11 top-level sections and their children |
| 7 | `robots.ts` allow-list is a no-op | **OPEN, deliberate** — `Allow` cannot narrow a wildcard group, so the allow-list documents intent only. Left as-is; it is not a defect to fix |
| 8 | `jobs/[slug]` calls `fetchFeedIndex` 5× | **NOT A DEFECT** — `cdnFeed.ts:429` already exports `fetchFeedIndex = cache(_fetchFeedIndex)`, so the call sites dedupe per request |
| 9 | `OpportunitiesFeedClient` `ItemList` in a client component | **OPEN** — the `/jobs` feed's structured data is still not in the server HTML |
| 10 | `walk-in/[city]` sets `dynamicParams = false` | **OPEN, deliberate** — a new city 404s until the next build. The in-source comment calls it bot cache-poisoning protection |

Also verified already fixed: the `/moderation` → `/moderator` 404 across
`ModerationNav.tsx`, `(moderator)/moderator/page.tsx`, and `moderatorAccess.ts`
(the redirect ledger backstops it at `next.config.ts:412-421`); the duplicate
homepage `Organization` node (`(public)/page.tsx:103`); the `global-error.tsx`
raw `error.message` leak. The audit is worth keeping for items 9 and 10 and
for the security cross-references, but it should not be treated as a
worklist.

**Still open and worth doing, in order:**

1. Nine `(user)/*/layout.tsx` files export `metadata` for routes that only
   308-redirect, and four of them are shadowed by page-level `metadata` that
   disagrees (`alerts/layout.tsx:4` says "Job Alerts & Notifications" while
   `alerts/page.tsx:5` says "Job Alerts"). Harmless for indexing now that the
   header is set, but it is dead code. The real fix is `next.config` redirects
   instead of route segments — that also skips constructing the
   `NavigationWrapper` tree to serve a body-less 308.
2. `ItemList` on `/jobs` (item 9 above) — the one structured-data gap left.
3. `/resources` and `/api/public/sitemap` use `next.revalidate` with no cache
   tag (`03-data-fetching-caching.md` §4), so they can only age out and never
   invalidate on publish.

### 9.1 Sitemap generator — two real bugs, both FIXED HERE

`apps/api/src/infrastructure/services/opportunity/staticFeed.service.ts` builds
the eight child sitemaps and the index, then uploads them to R2. The web app
just proxies `/sitemap.xml` to the CDN, so every bug here is invisible from
`apps/web`.

**Bug 1 — the sitemap advertised a redirect as a page.** `staticRoutes` listed
`/jobs/walkins`, and `sitemap-walkins.xml` led with it. But `next.config.ts`
301s `/jobs/walkins` → `/drives/walk-in`. Google was being handed a redirect in
a sitemap, and the destination hub was in the sitemap nowhere. Fixed both ways:
`/jobs/walkins` removed, `/drives/walk-in` added, and the walkins child now
leads with the real hub.

**Bug 2 — unescaped XML.** Every `<loc>` was built by string interpolation of
scraped values: slugs, company names, skill and city names. A company named
`Larsen & Toubro` or `AT&T` — both entirely real in India — put a raw `&` into
the XML. That is not well-formed, and an unparseable sitemap is **silently
dropped**, not reported: one such company name loses the entire child sitemap,
which for `sitemap-companies.xml` is every company page on the site. Added
`xmlLoc()` and applied it to all 14 interpolation sites. `&` is replaced first
so the later replacements cannot double-escape, and control characters are
stripped so a newline inside a scraped name cannot be read as the end of the
element. Verified against `Larsen & Toubro`, `AT&T`, `<script>`, `O'Brien`,
embedded newlines and tabs, plus a `fast-xml-parser` well-formedness check.

Neither bug is theoretical and neither would have shown up in any crawl of the
site itself, which is why no audit found them. **They are only visible by
reading the generator.**

**Also added to `staticRoutes`**, all of them live canonical 200s that were
missing: `/jobs/browse`, `/jobs/remote`, `/drives/walk-in`, `/companies`,
`/resources`, `/community`, `/recruiters`.

**Not applied — needs a publish.** The sitemaps are regenerated by the
admin/publish flow and uploaded to R2, per the repo rule that feed regeneration
starts from admin or publish. These changes reach Google only after that runs.
I did not trigger it.

### 9.2 The live sitemap is 100% `localhost` — the top finding

Observed 2026-09-29, directly from the CDN, not from source.

| Sitemap | Status | URLs | First `<loc>` |
|---|---|---|---|
| `sitemap.xml` (index) | 200 | 8 children | `http://localhost:3000/sitemap-jobs.xml` |
| `sitemap-jobs.xml` | 200 | 106 | `http://localhost:3000` |
| `sitemap-walkins.xml` | 200 | 8 | `http://localhost:3000/jobs/walkins` |
| `sitemap-companies.xml` | 200 | 47 | `http://localhost:3000/companies/kalyan-infotech` |
| `sitemap-skills.xml` | 200 | 12 | `http://localhost:3000/jobs/sql-jobs` |
| `sitemap-locations.xml` | 200 | 5 | `http://localhost:3000/jobs/bangalore-jobs` |
| `sitemap-batches.xml` | 200 | 2 | `http://localhost:3000/jobs/2025-batch` |
| `sitemap-govt.xml` | 200 | 2 | `http://localhost:3000/govt` |
| `sitemap-roles.xml` | 200 | 8 | `http://localhost:3000/jobs/software-engineer-jobs` |

**All 190 URLs across all eight files are `http://localhost:3000`.** Google
cannot fetch a single one. The sitemap has been contributing exactly nothing —
and doing so silently, because every file returns 200 and the publish run
reported success. Nothing in Search Console would have flagged it: a sitemap
full of unfetchable URLs is not an error, it is just ignored.

**Root cause.** `getPublicSiteUrl()` in `apps/api/src/utils/runtimeConfig.ts:75`
resolves from `PUBLIC_FRONTEND_URL || PUBLIC_WEB_URL || FRONTEND_URL`, and
falls back to `http://localhost:3000` when all three are unset. The published
sitemaps prove that fallback fired. `apps/api/.env.example:150-151` has
`PUBLIC_WEB_URL` and `PUBLIC_FRONTEND_URL` **commented out**, and
`.env.example:15` ships `FRONTEND_URL="http://localhost:3000"` — so a deploy
built from the example file gets the localhost fallback, and nothing warns.

**Why the web app could not repair it.** `app/api/public/sitemap/route.ts:36`
did `xml.replaceAll(SITE_URL, currentDomain)`. That only corrects a *correct*
production origin. `http://localhost:3000` is not `SITE_URL`, so the string was
never a match and it passed straight through to the crawler.

**Two fixes, defence in depth:**

1. `assertSitemapBaseUrl()` in the API refuses to generate sitemaps against an
   empty, unparseable, `localhost`, or private-IP origin. It throws, `refresh()`
   catches and logs, so the publish aborts and leaves the previous files in
   place. Loud failure beats silently publishing an unindexable sitemap.
2. The web route now also rewrites *any* absolute origin inside a `<loc>` to the
   requested domain, not just `SITE_URL`. Verified by fetching the real broken
   file from the CDN and running it through the rewrite: 106/106 URLs repaired,
   0 localhost left, 0 `http://` left. This also means the file **already on the
   CDN starts working as soon as the web app is deployed** — no publish needed
   for that half.

**Owner action, not code:** set `PUBLIC_FRONTEND_URL=https://fresherflow.in` on
the API deployment. Without it fix 1 will block every publish. The commented-out
lines in `.env.example:150-151` should be uncommented so the next person does not
repeat this. That is done.

### 9.3 Competitor code review — `scratch/repos`

Thirty-two repos are cloned locally. Ten are job boards, so the SEO question
"how do comparable products do this" can be answered from source rather than
guessed. Result: **almost none of them do it at all.**

| Repo | Has |
|---|---|
| `freehire` | A real sitemap system: index, 4 sub-sitemaps, keyset chunking, XML escaping, `robots.txt` |
| `opensource-job-portal` | A 3-line `robots.txt`, no sitemap |
| `OpenATS` | Only a `next.config.ts` |
| `ever-jobs`, `freehire`(other), `jobseek`, `OpenJobs`, `job-board-aggregator-main`, `CareerPulse` | Nothing |

**The comparison that matters is `freehire`**, and it is worth reading in full at
`scratch/repos/freehire/web/src/lib/sitemap.ts`. Three things FresherFlow should
steal, and one it already does better than:

1. **It derives the origin from the request, not from config.**
   `sitemap-pages.xml/+server.ts:16` builds every `<loc>` from `` `${url.origin}${path}` ``.
   The localhost bug is *structurally impossible* there, because there is no
   environment variable to get wrong. FresherFlow reads `getPublicSiteUrl()` in a
   separate service, uploads to R2, and serves it back through a proxy — three
   hops where the origin can drift. The guard in §9.2 is the mitigation for that
   architecture; `url.origin` is the way out of it.
2. **It gates on honest `lastmod`.** `sitemap.ts:89-92`: `lastmod` is left
   undefined when there is no real date, because "a guessed one teaches crawlers
   to ignore the field everywhere." FresherFlow currently stamps `staticDate`
   (today) on every static route on every publish, which is exactly that
   mistake — a daily lie that devalues the field.
3. **It puts its most citable pages in the sitemap on purpose.** The comment at
   `sitemap.ts:40-43` explains that `/open` and `/trends` carry the site's most
   linkable material and belong in the sitemap even when nothing links to them.
   That is the closest thing in any of the 32 repos to a linkable-asset strategy.
4. **FresherFlow is better in one place:** `freehire` has no origin validation at
   all, and no test for it. `apps/api` now has `assertSitemapBaseUrl()` plus a
   verified escaping test.

**The uncomfortable read:** none of these competitors is winning on SEO
engineering. That means the technical spine is table stakes in this category,
not an advantage, and the remaining differentiation has to come from content and
data — which is what recommendation 2 in the audit says.

**What I did not do:** no live competitor crawl, no ranking or backlink
comparison, no keyword data. That needs the OpenSEO MCP.

---

## 10. Recommended next workflow

`/seo-audit`, once the MCP is authenticated.

Not `/keyword-research` first. Picking seeds before the goal in §3 is settled
risks optimising the wrong pages, and the technical baseline in §9 is already
well documented, so the audit's real output is likely to be: which board URLs
actually get indexed, whether the sitemap covers the taxonomy families, and
what the `(user)` `noindex` posture looks like from outside.

**If the MCP stays unauthenticated**, the fallback is a code-only pass over the
seven defects in §9. Genuinely useful and free, but it optimises what already
works rather than what is missing.

---

## 11. Research log

- **2026-09-29 — project setup, repo-derived pass.** Inputs:
  `docs/product-audit.md`, `docs/audits/01-routing-metadata-seo.md`,
  `docs/opportunity-taxonomy-research.md`, `docs/launch-readiness.md`,
  `apps/web/src/app/{layout.tsx,robots.ts}`, `apps/web/next.config.ts`,
  `apps/web/src/app/api/public/sitemap/route.ts`,
  `apps/web/src/lib/seo/seoMetrics.ts`,
  `apps/web/src/app/(public)/**/page.tsx`. No credits spent — no live-data tool
  was available, so there is no volume, difficulty, SERP, backlink, or GSC
  evidence anywhere in this document. **Verdict:** the technical SEO spine is
  genuinely strong — rewrite-backed sitemaps, a shared `JobPosting` builder, one
  `Organization` node, 301 namespace consolidation, pixel-calibrated snippets.
  The gap is content, not plumbing: no blog route, no linkable asset, no named
  competitors, no stated goal. The site was **paused** for this pass, so no live
  crawl or SERP check was possible. Everything here is from source, and the site
  should be re-crawled before any of it is acted on.

- **2026-09-29 — indexing and metadata pass.** Closed the `(user)` `noindex`
  gap and added canonical/robots/OG to the six public routes that had none (see
  §9). Verified the header pattern against Next's bundled
  `next/dist/compiled/path-to-regexp` before shipping: it matches all 11 `(user)`
  sections and their children, and matches none of `/jobs`, `/admin`,
  `/drives`, `/community`, or `/u`. No credits spent. **Verdict:** the
  `noindex` fix is the only change here that was unambiguously wrong before and
  unambiguously right after. The metadata additions are defensive — they close
  a real canonical gap, but without Search Console there is no evidence any of
  these six routes have impressions, so this is correctness work, not recovery
  work. The audit this pass was based on turned out to be substantially stale:
  8 of its 10 items were already fixed by concurrent work. **Do not re-run it
  as a worklist.** `pnpm --filter ./apps/web build` compiles but fails type
  check on pre-existing, unrelated breakage in `features/jobs/domain/trackerState.ts`,
  `features/jobs/hooks/useCategoryPageState.ts`, and
  `features/jobs/tabs/AppliedTab.tsx` — 10 errors, all in files this pass did
  not touch, all in-flight work by another author. The files changed here
  typecheck clean.

- **2026-09-29 — sitemap generator pass.** Found and fixed two bugs in
  `apps/api/.../staticFeed.service.ts` — see §9.1. The sitemap was listing
  `/jobs/walkins`, which is a 301, while omitting `/drives/walk-in`, which is
  the page; and every `<loc>` was unescaped, so one company named `L&T` or
  `AT&T` anywhere in the feed would have made `sitemap-companies.xml`
  unparseable and silently dropped. No credits spent. **Verdict:** this is the
  highest-impact thing found in this entire engagement, and it was invisible
  from `apps/web` — the web app only proxies the CDN's XML, so the whole
  generation path had to be read directly. The lesson generalises: for a site
  whose SEO rests on a generated sitemap, the generator deserves the same
  scrutiny as the pages. Both fixes are in code only; the sitemaps on R2 are
  stale until the publish flow regenerates them, which I did not run.
  `pnpm --filter ./apps/api build` passes clean.

---

## 12. Where this is staged

This file: `docs/seo-project-context.md`.

Not staged, on purpose: the local OpenSEO folder (`gsc/`, `drafts/`,
`reports/`). Create it when the MCP is connected, or say so and I will.

Per the skill's own rule, project knowledge belongs in OpenSEO project context,
not on disk. This file is the temporary landing spot for the answers, not the
permanent home. Once `update_project_context` succeeds, delete this file rather
than maintaining two copies.

---

## Answers still owed

| # | Question | Status |
|---|---|---|
| 1 | Primary metric, segment, timeframe | **[NEEDS DECISION]** — §3 |
| 2 | Real competitive set | **[NEEDS DECISION]** — candidates in §5, unverified |
| 3 | Search Console connected? | **[NEEDS DECISION]** — §7 |
| 4 | Local OpenSEO folder | Deferred — your call |
| 5 | Writing preferences for SEO copy | **[NEEDS DECISION]** — below |
| 6 | Build a blog post route? | **[NEEDS DECISION]** — §8, a product call, not SEO |

### On writing preferences

`docs/templates.md` is a strong signal for *listing* copy — never infer, prefer
empty over guessed, city-only in the `locations` array — but that governs
operator-authored listing text, not SEO content. Still needed for anything an
agent writes:

- Person or institution voice
- Sentence length, reading level
- India-English conventions, or plain global English
- Whether to use "fresher" at all. The brand uses it heavily, so the keyword is
  load-bearing — but it is also the most awkward word to build a paragraph
  around. Worth an explicit ruling.
- Any words to avoid, especially around government job notifications and
  anything that reads as official endorsement

The other interview steps (scope, positioning, key pages, existing context, MCP,
technical baseline, content inventory) are answered from the repo above and do
not need you.
