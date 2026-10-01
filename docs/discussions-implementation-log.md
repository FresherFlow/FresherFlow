# Per-job discussions: implementation log

Status: **implemented, not yet verified by compiler** (terminal access was revoked
partway through the session; only Task 1 was ever typechecked, and it passed).

This document records what was audited, what was decided, what was built, what is
still open, and exactly which files changed.

---

## 1. Objective

Two asks, plus follow-on ideas the user approved:

1. **Job page chat** — per-job discussion as a chat interface (FAB + panel, like a
   site chat widget) instead of a section dumped into the page.
2. **Discussions inbox** — a full page where each "conversation" is a **job**
   (later also a **company**), not a person.
3. Approved follow-ons: cost cutting, company-level threads, retention loop,
   growth/SEO — and UI details (bubble sides, names, window size, count/FAB signal).

The explicit constraint from the user: **do not un-hide or depend on Rooms.**
Rooms stays paused. Nothing here touches `COMMUNITY_UI_ENABLED` or the community
feed.

---

## 2. Audit findings (what already existed)

| Layer | Finding |
|---|---|
| **Firebase RTDB** | The **live** comment plane. `/comments/{jobId}/{pushKey} = { text, createdAt, user }`. Written by mobile (`apps/mobile/src/utils/firebaseCommentsDb.ts`), moderated from web admin (`FeedbackClient.tsx`, `OverviewTab.tsx` read `/comments`), and named in `firebase/README.md` as an existing rules dependency. |
| **API / Postgres** | A **separate** comment system exists: `apps/api/src/routes/community/jobs.ts` (`/api/jobs/:id/comments`, votes, signals, comment-counts) plus `community.service.ts`. This is the path the orphaned web `DiscussionSection` used — **not** what the apps actually write today. |
| **Web** | The per-job discussion UI was **gone**: `features/jobs/components/discussion/DiscussionSection.tsx` was orphaned (nothing imported it), the job detail page rendered no discussion, and `JobCard` linked "Discuss" to a dead `#discussion` anchor. `COMMUNITY_UI_ENABLED = false` paused sidebar/hero/community surfaces. |
| **Mobile** | Fully alive: `CommentSection` on `JobDetailScreen` / `GovtJobDetailScreen` via `useComments` → Firebase RTDB, with an offline MMKV queue. |

**Key correction made mid-session:** the first pass assumed the Express
`/api/jobs/:id/comments` route was the live plane. It is not. Everything was
rebuilt against **Firebase RTDB**, confirmed from source.

**Second correction:** mobile gates comment reads on auth
(`if (isAnonymous) setComments([])`) and the `/comments` rules are not
guest-readable. Web now mirrors that gate.

---

## 3. Decisions and rationale

| Decision | Why |
|---|---|
| **Firebase RTDB, not the API** | It is the plane mobile writes and admin moderates. The `architecture` skill also lists comments as an RTDB client write plane. |
| **Auth-gated reads** | Matches mobile; avoids `permission_denied` for guests. Guests get a sign-in invitation. |
| **Adapt `shadcn-admin`, do not copy** | The reference `features/chats/index.tsx` was already adapted once in-repo (`rooms/RoomPosts.tsx`). Taken: two-pane list+thread, day grouping, own/other bubble alignment, top composer. Dropped: fake `convo.json`, `date-fns`, lucide icons, Phone/Video/attachment buttons. Rebuilt on `@/ui` primitives + semantic tokens. |
| **Dock, not inline section** | The job page is ISR/SEO. A floating dock keeps the public thread off the crawlable content path and stops pushing Apply below the fold. |
| **Index node for counts** | A full-thread listener per job-page mount just to render a badge was the burn. |
| **`DiscussionForumPosting`, not `FAQPage`** | A flat comment list has answers with **no questions**. Synthesizing Q/A pairs is fabricated structured data and a Google manual-action risk. |
| **`runTransaction` for the index** | Web and mobile both write it; a transaction cannot lose an increment. No Cloud Function needed for counts. |

---

## 4. Data model

```
/comments/{jobId}/{pushKey}            = { text, createdAt (ISO), user: { id, fullName, username, avatarUrl } }
/commentIndex/{jobId}                  = { count, lastActivityAt (ms), lastText, lastAuthor }

/companyComments/{companySlug}/{pushKey}   = same comment shape
/companyCommentIndex/{companySlug}         = same index shape
```

- Reads are bounded: the thread is subscribed with `limitToLast(50)` (newest
  slice, since push keys sort chronologically).
- The badge subscribes to `/…Index/{id}/count` only — one number.
- Index is bumped on post (`+1`, plus preview fields) and delete (`-1`, floor 0).

---

## 5. What was built

### 5.1 Foundation — `useJobComments.ts` (rewritten as the generic thread layer)

Despite the file name, it is thread-generic. Exports:

- `jobCommentsPath`, `jobIndexPath`, `companyCommentsPath`, `companyIndexPath`
- `useThreadCount(indexPath, enabled)` — tiny badge subscription
- `useThreadComments(commentsPath, indexPath, enabled, subscribe)` — `subscribe`
  is the cost control; the thread listener only exists while a panel is open
- `postComment` / `deleteComment` — write the comment, then transact the index

### 5.2 Chat UI — `JobDiscussionChat.tsx`

Shared by dock and inbox.

- Own messages right (`justify-end`, `bg-primary/10`, `rounded-br-sm`); others left
  (`bg-muted/50`, `rounded-bl-sm`). Ownership = `comment.user.id === currentUserId`.
- Author name above each bubble (`fullName || username || 'Fresher'`), `You` for own,
  avatar (image or initials) for others, `h:mm` time, day dividers.
- Composer: `Textarea` + `Post` chip. Enter posts, Shift+Enter adds a line.
- Signed-out visitors see a centered sign-in invitation, never an empty/erroring thread.
- Delete appears only on your own comments.

### 5.3 Dock — `JobDiscussionDock.tsx`

One shared `DiscussionDock` surface with two entry points:

- `JobDiscussionDock({ opportunityId, jobTitle })` → mounted in
  `OpportunityDetailClient`.
- `CompanyDiscussionDock({ companySlug, companyName })` → mounted on the company page.

Panel is `min(92vw, 380px)` wide; thread body `min(60vh, 420px)` tall. FAB shows
the count (99+ cap) and **pulses once** (`animate-ping`, `motion-reduce:animate-none`)
when the count rises — never on initial load. Opens on `?discuss=1`.

`JobCard`'s Discuss link now points to `?discuss=1` instead of the dead `#discussion`.

### 5.4 Inbox — `/discussions`

- `app/(public)/discussions/page.tsx` — ISR 60. Merges both indexes; resolves job
  titles from the feed for only the ids that appear; titles company threads from
  the slug.
- `features/discussions/DiscussionsClient.tsx` — two-pane list → thread, search,
  mobile back button, empty states.
- The footer's pre-existing `/discussions` link now resolves.
- Sidebar: a new `discussionsFeed` nav id (`/discussions`) added to the registry
  and wired into **Jobs → Discover**. The old `discussions` row (paused
  `/community?tab=discussions`) stays hidden.

### 5.5 Company threads

Company threads live on `/companyComments/{slug}` and survive listing expiry —
the thing a per-job thread cannot do. Mounted fixed-position on the company page
so it never affects that page's grid.

### 5.6 SEO — `DiscussionForumPosting`

- `features/jobs/domain/jobDiscussionSeo.ts` — reads `/commentIndex/{jobId}`
  (skip if 0), then the newest 10 comments; try/catch → null.
- `generateOpportunityJsonLd(opportunity, discussion?)` appends a
  `DiscussionForumPosting` node: `headline`, `text`, `url`, `datePublished`,
  `author`, `interactionStatistic` (count), `comment[]` with authors/dates.
- The job page passes it only for live listings; null leaves the JSON-LD
  byte-identical to before.

### 5.7 Mobile parity

`apps/mobile/src/utils/firebaseCommentsDb.ts` now bumps `/commentIndex/{jobId}`
via `.transaction()` on post and delete, so web counts never drift from mobile
activity.

### 5.8 Ask-a-question composer and real FAQ schema

A thread now holds two kinds of post:

```
{ text, createdAt, user }                       # plain comment (unchanged)
{ text, createdAt, user, kind: 'QUESTION' }     # a question
{ text, createdAt, user, parentId: <question> } # an explicit answer
```

Both new fields are optional, so every comment mobile writes, and every comment
written before this existed, stays valid and reads as a plain reply.

- Composer has an **Ask a question** toggle; questions post with `kind: 'QUESTION'`.
- A question shows a `Question` badge and an **Answer** action; the composer then
  carries an `Answering: …` chip and posts with `parentId`.
- Answers render the question text as a quoted line.
- SEO now emits a truthful `FAQPage`, but **only** for questions that have an
  explicit `parentId` answer, and **only** because the job page server-renders
  that same Q&A visibly — Google requires FAQ content to be on the page.
  A question with no answer is never emitted.

---

## 6. Cost strategy (Firebase RTDB)

| Before | After |
|---|---|
| Job page opened a full `/comments/{jobId}` listener on mount for a badge | Badge reads `/commentIndex/{jobId}/count` (one number) |
| Whole thread downloaded whenever mounted | Thread subscribes only while the panel is open |
| Unbounded thread download | `limitToLast(50)` |
| Inbox read the whole `/comments` root server-side | Inbox reads the two small index roots |

Not yet done (optional further cuts): unsubscribe on tab-hidden via the Page
Visibility API; `limitToLast` on the company thread is the same 50 by design.

---

## 7. Known gaps

1. **Retention loop is built for web, not yet for mobile** (see §8). Web posts
   follow the thread and trigger the fanout; a mobile post does neither.
2. Mobile can not yet start a **company** thread — only job comments.
3. Guest users see no count (by design; the index is auth-gated).
4. A thread written before the index existed is invisible in the inbox until it is
   next touched. The index is a convenience, never the thread body.
5. Thread reads are capped at 50; very long threads lose the oldest from the UI
   (not from the database).

---

## 8. Retention loop

Notifications are a **Prisma/Postgres** model; comments are Firebase RTDB.
`apps/api` already depends on `firebase-admin`, so the server reads the follower
set itself.

Implemented (web side):

1. On post, the client writes `/commentFollows/{job|company}/{threadId}/{userId} = true`
   (best-effort, alongside the index transaction and the fanout call).
2. `POST /api/discussions/comment-activity` (`commentsWriteLimiter`, `requireAuth`,
   Zod body `{ threadKind, threadId, commentId, excerpt }`) calls
   `notifyThreadFollowers` and returns `{ notified }`.
3. `notifyThreadFollowers` (`community.service.ts`) reads
   `/commentFollows/{threadKind}/{threadId}` with the admin SDK, excludes the
   author, and writes one `Notification` per follower with
   `prisma.notification.createMany`.

Hardening details, all deliberate:

- **No `opportunityId` in the request body.** For a job thread the thread id *is*
  the opportunity id, so the server resolves it itself via
  `prisma.opportunity.findUnique`; a client-supplied id would be an unvalidated
  foreign key on `Notification.opportunityId`. Company threads write `null`.
- **Stale follower ids are filtered.** `/commentFollows` is client-writable, so it
  can name ids that no longer exist. `Notification.userId` is a foreign key and
  `createMany` is one batch, so a single bad id would abort every row. The service
  resolves recipients with `prisma.user.findMany` first and writes only real users.
- **Fanout is capped at 500** recipients per comment.
- **`commentId` is `null`.** It is a foreign key to `OpportunityComment` (the
  Postgres comment table); a Firebase comment id cannot go there. It travels in
  `payload` as `{ threadKind, threadId, firebaseCommentId, excerpt }`
  (excerpt sliced to 140).
- **`NotificationType.COMMENT_REPLY` is reused**, so **no schema migration** is needed.
- **Whole fanout is best-effort.** Any failure logs and returns `{ notified: 0 }`;
  it never fails the comment the author already posted.
- **Thread-aware notification rows.** Web reads `threadKind`/`threadId` from the
  payload and deep-links to the right thread (`/jobs/{slug}?discuss=1` or
  `/companies/{slug}?discuss=1`) instead of dropping the user on a generic list.

Tests: `apps/api/src/__tests__/discussions.test.ts` covers 401 unauthenticated,
401 anonymous, 400 validation, empty follows, self-exclusion, unknown-follower
filtering, per-follower fanout payload, server-side opportunity resolution
(client-supplied id ignored), company threads writing `null`, the 500 cap, and
fail-safe degradation. (Written this session; not executed — see §10.)

Not done yet:

- **Mobile does not follow or trigger fanout.** A mobile post neither joins the
  follower set nor calls the endpoint, so mobile activity does not notify anyone.
  Fixing it means a follow write in `firebaseCommentsDb` plus a `discussionsApi`
  method on `@fresherflow/api-client` called from `useComments`.
- **No unread UI.** `lastActivityAt` (index) vs a local `lastReadAt` is designed
  but not rendered anywhere.

---

## 9. Files changed

**Web**

| File | Change |
|---|---|
| `features/jobs/hooks/useJobComments.ts` | Rewritten as generic thread layer + index |
| `features/jobs/components/discussion/JobDiscussionChat.tsx` | New |
| `features/jobs/components/discussion/JobDiscussionDock.tsx` | New (job + company dock) |
| `features/jobs/domain/jobDiscussionSeo.ts` | New |
| `features/jobs/domain/opportunitySeo.ts` | `DiscussionForumPosting` node |
| `features/jobs/components/detail/OpportunityDetailClient.tsx` | Mount job dock |
| `features/jobs/components/JobCard/JobCard.tsx` | Discuss link → `?discuss=1` |
| `features/discussions/types.ts` | New |
| `features/discussions/getDiscussionConversations.ts` | New (both indexes) |
| `features/discussions/DiscussionsClient.tsx` | New |
| `features/navigation/navRegistry.ts` | `discussionsFeed` id |
| `features/navigation/navSpaces.ts` | Wired into Jobs → Discover |
| `app/(public)/discussions/page.tsx` | New |
| `app/(public)/jobs/[slug]/page.tsx` | Pass discussion to JSON-LD |
| `app/(public)/companies/[slug]/page.tsx` | Mount company dock |
| `features/notifications/notificationItems.ts` | Thread-aware `COMMENT_REPLY` title + deep-link `href` |
| `features/notifications/components/NotificationsDropdown.tsx` | Route by `item.href` first |
| `features/jobs/tabs/NotificationsTab.tsx` | Route by `item.href` first |

**API**

| File | Change |
|---|---|
| `routes/community/discussionActivity.ts` | New-activity endpoint (new) |
| `infrastructure/services/community/community.service.ts` | `notifyThreadFollowers` fanout (hardened) |
| `index.ts` | Mount `/api/discussions` |
| `src/__tests__/discussions.test.ts` | Fanout endpoint tests (new, unrun) |
| `packages/types/src/index.ts` | `CommunityNotification.payload` thread fields |

**Mobile**

| File | Change |
|---|---|
| `apps/mobile/src/utils/firebaseCommentsDb.ts` | Index bump on post/delete |

---

## 10. Verification status

- **Task 1** (hook, chat, dock, mount, JobCard link): `pnpm --filter ./apps/web
  typecheck` ran clean (**exit 0**) before terminal access was revoked.
- **Everything after that** (Task 2, foundation rework, company threads, SEO,
  inbox unify, mobile parity, retention fanout, web notification deep-links):
  **manually reviewed only. No compiler run.**
- `apps/api/src/__tests__/discussions.test.ts` is written but **has not been
  executed**. Expected run once terminal access returns:
  `pnpm --filter ./apps/web typecheck`, `pnpm --filter ./apps/api typecheck`,
  `pnpm --filter ./apps/api test`.
- Nothing was staged or committed.
