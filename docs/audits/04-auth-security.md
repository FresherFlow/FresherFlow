# Audit 04 — Auth, session, route protection

Read-only. Scope: `apps/web/src/proxy.ts` (the Next 16 `middleware.ts`
equivalent), `lib/auth`, `features/auth`, `app/(auth)`, `app/(admin)`, and
every auth guard and redirect.

**There is no `middleware.ts`.** The matcher lives in `apps/web/src/proxy.ts:13`
(`export default function middleware`). All references below are to that file.

| Severity | Count |
|---|---:|
| CRITICAL | 4 |
| HIGH | 5 |
| MEDIUM | 5 |
| LOW | 3 |
| FINE (correct, do not touch) | 5 |

---

## 1. CRITICAL — 13 admin API route handlers have no authentication

None of these read `cookies()`, validate an admin token, or check a session.
The only gate is `withRateLimit` (`lib/server/rateLimit.ts:29`), keyed on an IP
hash (`:20-27`) — trivially bypassed by rotating IPs.

| Route | Methods | What it does unauthenticated |
|---|---|---|
| `api/admin/discovery/stats/route.ts:44` | GET | reads the ingestion DB, returns counts |
| `api/admin/discovery/targets/route.ts:23` | GET | crawler target config |
| `api/admin/discovery/runs/route.ts:32` | GET | run history |
| `api/admin/discovery/plugins/route.ts:26` | GET | plugin config |
| `api/admin/discovery/jobs/route.ts:84-86` | GET / **PATCH** / **DELETE** | `PATCH` runs `UPDATE discovered_jobs SET status = $1 WHERE id = $2` at `:57` with the id from the request body (`:48`); `DELETE` at `:64-80` |
| `api/admin/discovery/jobs/process/route.ts:38` | POST | triggers ingestion using the server-side `INGESTION_SECRET` (`:23`) |
| `api/admin/discovery/push/route.ts:365-366` | **GET and POST** | GET performs a write — creates/updates opportunities and flips `processed_jobs` status (`:338`, `:346`) |
| `api/admin/discovery/jobs/processed/route.ts:68-69` | GET / PATCH | |
| `api/admin/social/send/route.ts:66` | POST | posts to Telegram/X/LinkedIn using `WORKER_SECRET` (`:47`) |
| `api/admin/social/schedule/route.ts:91-92` | POST / DELETE | queue jobs |
| `api/admin/social/platforms/route.ts:40` | GET | |
| `api/admin/social/worker-health/route.ts:34` | GET | |
| `api/admin/ingestion/[...path]/route.ts:48-77` | GET/POST/PUT/DELETE | **open proxy.** Attaches `Authorization: Bearer ${INGESTION_SECRET}` on the outbound leg (`:25`), so the upstream is authenticated — the inbound browser request is not |
| `api/admin/bootstrap-feed/route.ts:20` | POST | |

Grep for `requireAdmin|adminAccessToken|401|403` across `app/api/admin` returns
**no files**.

**Why the proxy does not save it:** `proxy.ts:130` sends `/api/admin/*` to
`handleAuth`, which has no `/api` branch, and `proxy.ts:138` tests
`startsWith('/admin')` — not `/api/admin`. These paths miss both gates.

The admin *pages* are also pure client shells: `app/(admin)/admin/users/page.tsx:7`
and `opportunities/edit/[id]/page.tsx:7` render a `*Client` directly, and
`AdminLayoutClient.tsx:102` is the sole 401 check.

---

## 2. CRITICAL — access and refresh tokens in `localStorage`

Four keys, plaintext, mirrored at `lib/api/core.ts:23-27`:

| Key | Written | Read |
|---|---|---|
| `ff_user_access_token_v1` | `core.ts:179-191` | `core.ts:193-205`, Bearer injection `:406-418` |
| `ff_user_refresh_token_v1` | `core.ts:179-191` | `core.ts:517` (`X-Refresh-Token` header) |
| `ff_admin_access_token_v1` | `core.ts:213-217` | `core.ts:421-426` |
| `ff_auth_token_v1` | `core.ts:186` | `packages/api-client/src/apiClient.ts:71-77` |

The app also maintains its own HttpOnly cookie session, so a readable copy of
the same credentials exists in parallel. Any XSS on the origin exfiltrates a
long-lived, refreshable session — precisely what the HttpOnly cookie prevents.

`clearAllClientCaches` (`AuthContext.tsx:80-99`) does **not** clear these keys
(it removes `ff_cached_session_v1`, `ff_user_*`, `USER_*`), so logout leaves
live tokens in `localStorage` unless `clearUserTokens()` runs.

There is no admin HttpOnly cookie in the web app. The `adminAccessToken` cookie
the proxy checks (`proxy.ts:139`) is set by the API; web never writes it.

---

## 3. CRITICAL — every route guard is client-side only

| Location | Mechanism | Server enforcement |
|---|---|---|
| `ProfileGate.tsx:24-33` (`AuthGate`) | `router.push` in a `useEffect` | none — `serverApiClient` forwards cookies and relies on the API 401 |
| `ProfileGate.tsx:71-89` (`UsernameGate`) | same | none |
| `ProfileGate.tsx:49,102` | renders `<div className="opacity-0 pointer-events-none">{children}</div>` | **children mount and run effects in the DOM.** Only visual hiding; `pointer-events-none` is bypassable by dispatching events directly |
| `AdminLayoutClient.tsx:102-118` | renders a 401 `ErrorState` | none |
| `AdminLayoutClient.tsx:127-157` | moderator 403 / `router.replace` | none |
| `ModerationGate.tsx:19-22`, `:42-59` | `AuthGate` + empty state | none |
| `HomeAuthGuard.tsx:11-15` | `router.replace` | none |
| `moderation/moderationAuth.ts:21-52` | permission check from `authApi.myPermissions()` | comment at `:19` concedes "this is navigation gating only" |
| `useUnreadNotifications.ts:36` | `document.cookie.includes('ff_logged_in=true')` | n/a (read-only) |

---

## 4. CRITICAL — CSRF is bypassed on every web mutation

`apps/api/src/middleware/csrf.ts` has a real defence: it requires
`X-Requested-From` in `['fresherflow-web','fresherflow-client']` for unsafe
methods (`:47-57`) **and** validates `Origin` against an allowlist (`:60-74`).
The web client sets the header at `core.ts:402` and `core.ts:515`.

The bypass is in the same file:

```ts
// apps/api/src/middleware/csrf.ts:40-44
```
Any request carrying an `Authorization: Bearer` header skips **both** the header
check and the Origin check. The web app attaches a Bearer on every call
(`core.ts:416-418`, `:423-425`), sourced from `localStorage`. So every web
mutation exits CSRF validation.

Two smaller bypasses in the same file: `x-api-key` matching `INTERNAL_API_SECRET`
(`:33-38`, MEDIUM), and GET/HEAD/OPTIONS always passing (`:19-21`).

`core.ts:365-374` (`shouldIncludeCredentials`) sends `credentials:'include'` for
every non-GET, and for public GETs when a session cookie **or** a localStorage
token exists — so a logged-in user sends cookies to public feed reads, defeating
the shared-cache intent.

**Cookie-authenticated mutations in the web app with no origin check:**
`api/auth/logout/route.ts:26` and every `/api/admin/**` handler in §1.

`api/revalidate/route.ts:168` is secret-guarded — FINE.

Note: `lib/api/client.ts:38,51,69` call `/api/auth/logout/all`,
`/api/auth/logout/others`, `/api/auth/account`. **Those routes do not exist in
`apps/web`** — only `api/auth/logout` does. They 404 today, so the exposure is
currently inert (design HIGH, live impact LOW).

---

## 5. HIGH — `ff_logged_in` is a trust boundary on a client-writable cookie

`AuthContext.tsx:118` and `LoginForm.tsx:140` set it with `path=/`,
`max-age=7776000` (90 days), `SameSite=Lax`, conditional `Secure`, and
**`httpOnly: false`** — by design, it is a UI hint.

But `config/auth.ts:29,41` treats it as proof of login, and the proxy's
user-path gate accepts it in place of the real token. Any script can set
`ff_logged_in=true` to satisfy the proxy and to make `AuthContext.tsx:300` skip
the Firebase handshake path.

`verifyOtp` (`AuthContext.tsx:511-546`) calls `setUserTokens` then
`setClientSessionHints()` at `:516`, which is where the cookie is set.

---

## 6. HIGH — `/moderator` is not covered by any server gate

Matcher: `proxy.ts:151-155` — `"/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"`

| Route group | Status |
|---|---|
| `(admin)/admin/*` | proxy-gated at `proxy.ts:138`, but on cookie **presence** only; the real check is client-side |
| `(moderator)/moderator/*` | **unprotected by the proxy.** `paths.ts` has no `/moderation` or `/moderator` entry and `isUserPath` does not include it. Only `ModerationGate.tsx:19` |
| `(user)/*` | gated via `isUserPath`, but `/notifications`, `/feedback`, `/referral`, `/followed-companies` are **not** in `USER_PATHS` (`paths.ts:1-9`). All four are `permanentRedirect` stubs, so impact is low |
| `(auth)/*` | `isAuthPath` (`paths.ts:36-43`) covers `/login /signup /register /choose-username /auth/*`. **`/onboarding`, `/logout`, `/join` are absent.** `/join` is in `isPublicPath` (`:82`) so it is skipped; `/onboarding` is `force-dynamic` + client `AuthGate` only |
| `api/admin/**` | **not covered** — see §1 |

**Matcher weakness:** the negative lookahead `.*\..*` excludes any path
containing a period, and `proxy.ts:33-37` also treats `pathname.includes('.')` as
an asset. So `/admin/opportunities/edit/abc.def` bypasses the proxy entirely.
No known live route contains a dot, so this is latent.

---

## 7. HIGH — 11 competing "is logged in" implementations

| Location | Accepts |
|---|---|
| `config/auth.ts:29`, `:41` | `ff_logged_in` |
| `proxy.ts:139-140` | `accessToken` cookie **or** `ff_logged_in` |
| `AuthContext.tsx:300` | `ff_logged_in` **or the string** `accessToken` |
| `AuthContext.tsx:462`, `:475`, `:488` | various |
| `core.ts:369-373` | adds the two localStorage tokens |
| `AdminContext.tsx:115` | `ff_admin_logged_in` **or** the admin localStorage token |
| `AdminLayoutClient.tsx:102` | client-side check |
| `useUnreadNotifications.ts:36` | `document.cookie.includes(...)` |
| `HeadInjections.tsx:37` | |
| `moderationAuth.ts:21-52` | API permission response |

**A request can pass the proxy and still be treated as anonymous.** These can
and do disagree.

Other duplicate groups that can disagree:

| Concept | Sites | Divergence |
|---|---|---|
| Cookie clearing | `AuthContext.tsx:101-112`, `core.ts:140-150`, `AuthContext.tsx:239-246`, `AdminContext.tsx:297-300` | differing option sets — `AuthContext.tsx:244` adds `SameSite=Lax` on the third write, the others do not |
| Protected-endpoint classification | `core.ts:261-293`, `core.ts:295-305`, `server-client.ts:27-36` | `core.ts:276` includes `/api/jobs`; `server-client.ts` does not, so the same URL is cached differently depending on which client issued it |
| `/moderation` vs `/moderator` | `moderatorAccess.ts:72`, `(moderator)/moderator/page.tsx:10-16` vs the served path `/moderator` | **every moderation link 404s** — see doc 01 §8 |

---

## 8. Auth flow correctness

**Redirect validation is correct and should be kept.**
`paths.ts:62-68` `isSafeInternalRedirect` requires a leading `/`, rejects `//`,
rejects `/login` and `/logout`. Used at `LoginForm.tsx:77`,
`LogoutClient.tsx:16`, `onboarding-content.tsx:78-79`,
`redirect-handoff.tsx:22`, `config/auth.ts:50`, `AuthContext.tsx:247`.
**No open redirect found.**

**Parameter name mismatch (LOW).** Several call sites emit `?next=` —
`SignalsPanel.tsx:65`, `InterviewExperiences.tsx:39`,
`ApplicationUpdates.tsx:37`, `WalkinTrustStrip.tsx:128`, `PostJobForm.tsx:147`
— but every reader calls `searchParams.get('redirect')` (`LoginForm.tsx:73`,
`LogoutClient.tsx:13`, `config/auth.ts:47`). Those links silently drop the
destination.

**Login bounce (FINE).** `config/auth.ts:37-55` bounces signed-in users off
`/login`, guarded by `isExpiredFlow` (`:42`) and by excluding `/choose-username`
from `AUTH_ENTRY_PATHS` (`paths.ts:52`, comment `:48-51`).

**401 refresh (FINE).** `core.ts:506-593` — singleton mutex at `:377`/`:508`,
retried with the new token at `:565-572`. Refresh token sent both as a cookie and
as `X-Refresh-Token` (`:517`). On explicit 401/403 it clears tokens and
dispatches `fresherflow-unauthorized` (`:585`), handled at
`AuthContext.tsx:445-456`. Two clearing paths can fire (`:526-528`, `:581-583`) —
idempotent.

**`AuthContext.tsx:455`** does a full `window.location.replace('/login?expired=…')`,
so the proxy's `isExpiredFlow` check (`:42`) prevents a bounce-back. FINE.

**Dead code.** `ProfileGate.tsx:112` re-exports `UsernameGate` as `ProfileGate`;
nothing uses it, and `apps/web/AGENTS.md` forbids it (LOW).

---

## 9. Session-dependent caching — FINE, no issue

- `(public)/u/[username]/page.tsx:9` `revalidate = 60` calls a public endpoint
  through `serverApiClient`, and `shouldBypassCache` (`server-client.ts:27-36`)
  does not list `/api/public`, so no cookies are read (guarded at `:52`). No
  session dependency.
- `(public)/u/page.tsx:4` `revalidate = 3600` — public index.
- `jobs/page.tsx:9` `revalidate = false` (static shell) while the client subtree
  mounts `UsernameGate` that branches on `user`. Static shell, per-user client
  branch — no cross-user bake.
- `proxy.ts:130` explicitly skips `handleAuth` for public paths "because cookie
  reads bust edge cache" — a deliberate and correct trade-off, documented in
  code.

**No route reads the session and is statically cached.**

---

## Correct as-is — do not "fix" these

- `isSafeInternalRedirect` — single source, correctly reused in 6 places
- The 401 refresh singleton and its idempotent double-clear
- `api/revalidate` secret comparison
- `dev/layout.tsx:9` `notFound()` in production
- `proxy.ts:130`'s deliberate public-path skip, and its stated reason
