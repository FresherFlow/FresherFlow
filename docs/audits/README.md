# Web audits — index and triage

Read-only deep audits of `apps/web/src` plus the packages it imports. Nine
independent passes, run against the current dirty worktree while another agent
was editing. **No audit edited any file.**

Companion doc: [`../duplication-audit.md`](../duplication-audit.md) — code that
exists more than once. These docs are about correctness, security, and risk.

| Doc | Domain | Headline |
|---|---|---|
| [`04-auth-security.md`](04-auth-security.md) | Auth, session, route protection | **4 CRITICAL.** 13 admin route handlers have no authentication |
| [`07-forms-validation-types.md`](07-forms-validation-types.md) | Forms, validation, type contract | **5 CRITICAL.** Form fields silently stripped before persistence |
| [`08-performance.md`](08-performance.md) | Runtime and rendering | 46% of source is `'use client'`; no virtualization anywhere |
| [`03-data-fetching-caching.md`](03-data-fetching-caching.md) | Transports and caching | 7 transports; 4 error parsers for one envelope |
| [`02-state-hooks.md`](02-state-hooks.md) | Hooks, state, effects | 2 BROKEN effects; 11 competing "is logged in" equivalents |
| [`01-routing-metadata-seo.md`](01-routing-metadata-seo.md) | App Router, metadata, JSON-LD | `/moderation` links all 404 after a route rename |
| [`06-design-system-a11y.md`](06-design-system-a11y.md) | Design system, accessibility | Global focus-ring removal; 23 unlabelled buttons |
| [`05-admin.md`](05-admin.md) | Admin surface | 3 status maps disagree on colour; ~900 dead lines |
| [`09-user-surfaces-tests.md`](09-user-surfaces-tests.md) | End-user surfaces, tests | "Selected" vs "Offered" in three places; 3 e2e files, 0 unit tests |

---

## Fix first — security, exploitable now

These are not style issues. Each is reachable by an unauthenticated or
lower-privileged caller.

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | **13 admin API route handlers have no authentication.** Only `withRateLimit` (IP-keyed, trivially rotated). Includes `PATCH`/`DELETE` writing SQL, and an open proxy to the ingestion service that attaches a server-held secret outbound | `apps/web/src/app/api/admin/**` | **FIXED** — admin JWT guard, see below |
| 2 | **Access + refresh tokens in `localStorage`**, plaintext, 90-day lifetime, alongside an HttpOnly cookie. Any XSS exfiltrates a refreshable session. Logout does not clear them by default | `lib/api/core.ts:23-27,179-191` | **CRITICAL** |
| 3 | **Every route guard is client-side only.** No server enforcement behind any of them. `ProfileGate` renders children with `opacity-0 pointer-events-none` — they mount and run effects in the DOM | `ProfileGate.tsx:49,102`, `AdminLayoutClient.tsx:102`, `ModerationGate.tsx:19` | **CRITICAL** |
| 4 | **CSRF bypassed on every web mutation.** The API skips both the header check and the Origin check when an `Authorization: Bearer` header is present. The web client attaches one on every call | `apps/api/src/middleware/csrf.ts:40-44` | **CRITICAL** |
| 5 | `ff_logged_in` is a non-HttpOnly, client-writable cookie treated as proof of login by the proxy and by `AuthContext`. Any script can set it | `AuthContext.tsx:118`, `config/auth.ts:29,41` | HIGH |
| 6 | `/moderator` is not in the proxy matcher at all, and not in `USER_PATHS`. Only a client gate | `proxy.ts:151-155`, `config/paths.ts:1-9` | HIGH |
| 7 | Admin opportunity write path is `any` end to end — `createOpportunity: (data: any)`, `updateOpportunity: (id, data: any)`. Nothing between the form and the socket is typed | `lib/api/admin.ts:140,189` | HIGH |
| 8 | 12 raw `href` sinks on scraped URLs bypass `toSafeOutboundUrl`, which exists but is used in only 5 places | `admin/**` — see doc 07 §3 | HIGH |
| 9 | `customSlug`, `sector`, `passoutYearMin/Max`, `allowedAvailability` are sent by the form, absent from the server Zod schema, and stripped before any handler runs | doc 07 §4 | HIGH |

---

## Fixed after this audit

**Fix-first row 1 — the admin API handlers authenticate now.** All 21 exported
handlers across the 14 files under `apps/web/src/app/api/admin/**` wrap their
handler in `withAdminAuth` (`apps/web/src/lib/server/adminAuth.ts`), keeping
`withRateLimit` outermost. (The audit's "13 handlers" counted route entries;
there are 14 files and 22 exports. One export is gone — see the last bullet.)

- The credential is the admin JWT the API issues on admin login, read from the
  HttpOnly `adminAccessToken` cookie or an `Authorization: Bearer` header, and
  verified with the shared `verifyAdminToken` (same `type`/`role` rules as the
  API's `requireAdmin`). Verification picks the credential, not its presence,
  so a stale cookie cannot shadow a valid Bearer token. It fails closed: unset
  secret, expired token, forged token and a user (non-admin) token all deny.
  Missing credential → 401; present-but-unverifiable → 403.
- Cookie-authenticated unsafe methods (`POST`/`PATCH`/`PUT`/`DELETE`) also
  require a same-origin `Origin` (or `Sec-Fetch-Site: same-origin`).
  `SameSite=Lax` still sends the cookie from sibling subdomains, so a valid
  session alone does not prove the browser meant to send the request. A Bearer
  credential is exempt — a cross-site page cannot attach a custom header — so
  staff tooling still works. That closes the cookie-authenticated half of §4 for
  these routes; the API's Bearer bypass at `csrf.ts:40-44` is unchanged.
- `discovery/push` no longer exports `GET`. `handlePush` creates and updates
  opportunities and flips `processed_jobs` status, so a write-on-GET was
  reachable by a cross-site top-level navigation (`SameSite=Lax` rides it and no
  safe method carries an origin check). Both callers already used `POST`.
- Deployment prerequisite: the web deployment must resolve the same admin secret
  the API signs with (`JWT_ADMIN_SECRET`, else `JWT_ACCESS_SECRET`, else
  `JWT_SECRET`). A mismatch locks admins out of these routes with 403 — fail
  closed, not open — and the guard logs one `MISCONFIGURED` line naming the
  fix. Documented in `apps/web/.env.example`.
- Not covered: account-status revocation and per-permission authorization, which
  stay in `apps/api` (`requireAdmin` / `requirePermission`).

Evidence at the time of writing: 50/50 checks in a temporary `tsx` harness that
called all 21 real exports with a real `NextRequest` (401 for every one) and
exercised the denial matrix (missing / forged / expired / user token, cross-site
`Origin`, sibling subdomain, `file://` origin, no `Origin` without Fetch
Metadata, Bearer exemption, unset secret), plus a live dev-server sweep —
`GET /api/admin/discovery/stats` → 401, `PATCH /api/admin/discovery/jobs` → 401,
`POST /api/admin/social/send` → 401, `GET /api/admin/bootstrap-feed` → 401,
`GET /api/admin/discovery/push` → 405, forged cookie → 403. `tsc --noEmit`
reports 0 errors under `apps/web/src`; ESLint stays at the 0-error / 97-warning
baseline.

---

## Then — user-visible correctness

| # | Finding | Where | Severity |
|---|---|---|---|
| 10 | Multi-skill filter returns **nothing**. Pass 1 `some`, pass 2 `every`, ANDed together | `filterOpportunities.ts` | **FIXED** in the duplication pass |
| 11 | No list is virtualized. `@tanstack/react-virtual` is a declared dependency with zero imports. 100 cards = 200 `useJobCardActions`, ~1,400 `CompanyLogo` hooks, 100 `ResizeObserver`s | doc 08 §2–3 | HIGH |
| 12 | `AuthContext` effect cleanup almost always sees `undefined` — `unsubscribe` is assigned inside an async `import().then()`. The `onAuthStateChanged` listener leaks, doubled under StrictMode | `AuthContext.tsx:467-505` | HIGH |
| 13 | `useOpportunityDetail` load effect both reads and writes `opp`, and depends on `opp?.id` — re-runs after every `setOpp`. No request-id guard, so a double invoke can resolve out of order | `useOpportunityDetail.ts:199-224` | HIGH |
| 14 | `useCategoryPageState` URL writer clears its debounce timer on every dep change but only re-arms when `changed` — a scheduled URL write is silently lost | `useCategoryPageState.ts:604-626` | HIGH |
| 15 | `isFirstRender` is broken under StrictMode — the second pass re-parses the URL into fresh arrays, rebuilding every filter identity and resetting scroll | `useCategoryPageState.ts:385` | HIGH |
| 16 | `useOpportunityDerivedState` freezes `now` at mount, so a long-lived detail pane shows past events as upcoming | `useOpportunityDerivedState.ts:17` | MEDIUM |
| 17 | `parseJsonInput` throws **outside** the submit `try` — one malformed JSON character gives the admin no toast, no spinner reset, and an unhandled rejection | `opportunityPayload.ts:188-192` | HIGH |
| 18 | `autoTimeRange` is always truthy, so `" - "` is persisted as the time range when both inputs are blank | `opportunityPayload.ts:259` | HIGH |
| 19 | "Selected" / "Offered" / `OFFERED` — the same user action has three names across detail, tracker, and card. "Interviewed" / "Interviewing" likewise | doc 09 §2 | MEDIUM |
| 20 | `formatOpportunityType` never matches and always falls through — `OPPORTUNITY_LABELS` still holds the old `JOB`/`WALKIN` values while `OPPORTUNITY_TYPES` moved to `OpportunityCategory` | `profile/preferences.ts:12-16` | MEDIUM |

---

## Then — the 404 that is shipping

| Finding | Where |
|---|---|
| Commit `73eb2ca9` renamed `(moderator)/moderation/` → `(moderator)/moderator/`. Every internal link still points at `/moderation` — 6 queue links, the whole `ModerationNav`, the moderator landing href, and the admin login redirect. There is no `/moderation` redirect. **The moderation hub and all six queues are unreachable by navigation** | doc 01 §8, doc 04 §7 |
| `/admin/telegram` and `/admin/alerts` have no sidebar entry and no inbound link | doc 05 §1 |
| Root `layout.tsx:70` sets `template: '%s \| FresherFlow'` and ~10 public pages already end in a pipe segment → double brand suffix | doc 01 §3 |
| Homepage ships **two conflicting `Organization` JSON-LD nodes** for the same entity | doc 01 §4 |
| `govt/[slug]` publishes the same breadcrumb graph **twice** | doc 01 §4 |
| 26 of 27 `aria-expanded` have no `aria-controls` | doc 06 §5 |
| `globals.css:152` removes focus rings globally; ~10 components add `focus:outline-none` with no replacement | doc 06 §6 |
| `SavedJobCard` does not use `toSafeOutboundUrl` — an unsanitised `applyLink` on the saved page | doc 01, doc 09 |

---

## Where the duplication pass already landed

Phase 1 + 2a are merged and unstaged. Typecheck: 0 errors in `src/` (only the
known `.next/types` moderator-route noise). Lint: 0 errors, 97 warnings,
unchanged baseline.

- 4-stage tracker options, legacy `PLANNING`/`ATTENDED` remap
- One `matchesSkills` (inclusive OR), one `matchesRoles`, one `matchesWorkMode`
- `saved` composes with other filters instead of short-circuiting
- `opportunityDetailHelpers.ts` + `detailInteractionUtils.ts` deleted
- Government detail view got its save button back
- 11 zero-importer files deleted

**Two open regressions** from that pass, and one from a concurrent agent:
- `FilterDropdownBar.tsx` was deleted without first porting its `next30Days`
  bucket and drive-radius panel into `JobFilterBar` — desktop on the
  `OpportunitiesFeedClient` route lost both, while the drawer still has them.
- `OpportunityDetailPane.tsx:155` renders a header save and also passes
  `handleToggleSave` to `GovernmentJobDetailView`, which now renders its own at
  `:849`. Two save buttons in the split-pane government view.

---

## Open questions for the team

1. **Which four tracker stages are canonical?** The duplication pass made
   `APPLIED / PLANNED / INTERVIEWED / SELECTED` the live set, but `REJECTED` is
   reachable from the tracker tab and has no option in the detail select. And
   `SELECTED` displays as "Selected" on the detail page and "Offered" in the
   tracker. Pick one vocabulary.
2. **"Saved Only" now hides expired saved listings.** That is what composition
   means, but it is a visible behaviour change.
3. **Skill-less listings are now kept** when a skills filter is active, matching
   the API. But facet counts are per-skill occurrences, so results can exceed the
   sum of the chips — the same pre-existing imprecision as location and year.
4. **Admin API handlers — done.** Item 1 in the table was the open,
   unauthenticated write path; it now authenticates (see "Fixed after this
   audit"). Everything else on this page still waits for a decision.
