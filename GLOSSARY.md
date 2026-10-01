# FresherFlow glossary

Domain vocabulary, derived from the code. Where a term looks self-evident but isn't,
the source line is given so you can check the definition rather than trust it.

This file is the home for **what our nouns mean**. Types and enums live in
`packages/database/prisma/schema.prisma`; shared request/response types live in
`packages/types/src/index.ts`. Neither is a substitute for this file: they record
what the data *is*, this records what we *mean* by it.

A term earns an entry only if it settles a disagreement — it tells you where a
function belongs, or which of two names to use. If adding a term wouldn't change a
decision, leave it out.

---

## The core noun

**Opportunity** — the single published unit. Jobs, walk-in drives, government
posts, competitions, scholarships, hackathons and events are all Opportunities,
differentiated by independent dimensions rather than by a type tag
(`schema.prisma:678`).

Everything a user sees is an Opportunity, and everything a fetcher produces becomes
one. This is why "job" is dangerous as a domain word — see *Job* below.

### Taxonomy v2 — the six dimensions

`schema.prisma:44-47` states the rule:

> Replaces the old mixed-axis `OpportunityType { JOB, INTERNSHIP, WALKIN,
> GOVERNMENT }`. These are independent dimensions, so adding a new concept
> (hackathon, off-campus drive, scholarship) never needs a new enum value.

The dimensions, on the Opportunity row (`schema.prisma:694-699`):

| Dimension | Field | Type | Values |
|---|---|---|---|
| Category | `category` | `OpportunityCategory` | `EMPLOYMENT`, `COMPETITION`, `SCHOLARSHIP`, `EDUCATION`, `EVENT` |
| Employment type | `employmentTypes` | `EmploymentType[]` | incl. `INTERNSHIP`, `APPRENTICESHIP`, `FULL_TIME`, `VOLUNTEER` |
| Recruitment method | `recruitmentMethod` | `RecruitmentMethod?` | `REGULAR`, `ON_CAMPUS`, `OFF_CAMPUS`, `POOL_CAMPUS`, `WALK_IN`, `REFERRAL` |
| Work mode | `workMode` | `WorkMode?` | `ONSITE`, `HYBRID`, `REMOTE` |
| Sector | `sector` | `Sector` | `PRIVATE`, `GOVERNMENT`, `NGO`, `ACADEMIC`, `STARTUP`, `OTHER` |
| Experience level | `experienceLevel` | `ExperienceLevel?` | `ENTRY_LEVEL`, `INTERN`, `ASSOCIATE`, `MID`, … |

**The rule that follows:** these are independent, so a question like "is this a
walk-in?" is answered from `recruitmentMethod` + `driveDetails`, and never from
`category`. `employmentTypes` is an array because "sources can publish more than
one" (`schema.prisma:695`).

**Walk-in** — an Opportunity that a person attends in person. Two signals, either
is sufficient (`staticFeed.service.ts:26-29`):

```ts
const isWalkinRow = (opp: unknown): boolean => {
    const row = (opp ?? {}) as FeedRow;
    return row.recruitmentMethod === RecruitmentMethod.WALK_IN || Boolean(row.driveDetails);
};
```

**Drive** — a walk-in with a place and time. Backed by `DriveDetails`
(`schema.prisma:970`): `venueAddress` is required, plus `dates[]`, `reportingTime`,
`requiredDocuments`, and optional `city`, `clusterName`, `latitude`/`longitude`.
`recruitmentMethod` is null when the Opportunity is not drive-based
(`schema.prisma:696`).

Note `nextDriveAt` and `driveCity` on the Opportunity row are **mirrors**, not
sources. They exist because `DriveDetails.dates` is an unsized `DateTime[]` that
Postgres cannot index for range containment, so "drives in the next 7 days" had to
load every row into Node (`schema.prisma:782-800`). When they disagree,
`DriveDetails` wins.

**Government job** — `sector === GOVERNMENT` **or** a `GovernmentJobDetails` row
(`staticFeed.service.ts:31-34`). Two government vocabularies that are not
interchangeable:

- `governmentLevel` — `CENTRAL`, `STATE`, `PSU`, `LOCAL`, `OTHER` (who employs)
- `domain` — recruiting domain, e.g. `BANKING`, `DEFENCE`. Explicitly *not* level
  (`schema.prisma:1104`)
- `govtCategory` — the canonical filterable sub-category, e.g. `UPSC`, `SSC`,
  `Banking`, `Railways`, `State PSC`. `examName` is free text and must not be used
  for this (`schema.prisma:1106-1111`)

**Job** — *not a domain type.* There is no `Job` entity; there is an Opportunity
that happens to be `category: EMPLOYMENT`. Job-shaped words in legacy code
(`routes/opportunities.ts`, `features/jobs/`) are historical, not normative. Prefer
Opportunity except where a module is genuinely about ATS vendor pages, in which case
say *ATS job page* (defined under Pipeline).

**Fresher** — someone at the start of a career, not a duration. The scorer encodes
it as signals rather than a flag: `TITLE_FIRST_PREFERENCE` treats
`intern`/`internship`/`apprentice`/`trainee` as target roles
(`packages/utils/src/eligibility/scorer.ts:29-30`). Notably, drive words are *not*
a negative signal, because "real fresher drives are titled exactly that"
(`scorer.ts:16-19`).


---

## Feed and distribution

**Shard** — one pre-rendered JSON file behind the CDN, generated from the database
and read instead of querying it. Named "Distributed Static Data Shards" for
discovery, decoupled from the live API for performance and cost
(`staticFeed.service.ts:121-123`).

The shard families, by path (`staticFeed.service.ts` path constants):

- **Bootstrap feed** — `feeds/bootstrap-feed.min.json`, the first payload a
  visitor gets. Plus `feed-index.json` (per-type index) and `feed-version.json`
  (cache-bust token).
- **Targeted feeds** — `government-feed.json`, `walkins-feed.json`,
  `expired-feed.min.json`, `resources-feed.json`, `links.min.json`
- **Per-entity shards** — `jobs/{id}.json`, `categories/{id}.json`,
  `companies/{slug}.json`. One shard per entity, so a single job page costs one
  CDN read instead of a query.

**Lean row** — the reduced Opportunity shape used in list contexts (feeds, feed
proxies, public listings) as opposed to the full detail shape. Used to describe
both the selected DB fields and the serialised output; the two must agree or the
CDN and the API will disagree about what a row contains.

**R2** — Cloudflare R2, the S3-compatible object store holding the shards. Reached
via an `S3Client` built lazily from `R2_ENDPOINT` and friends, and null-safe when
those are absent (`storage.service.ts:14-36`). Shards are also written to local
`public/` first so they can be inspected without a network round trip.

**Feed refresh** — regenerating shards. Debounced, because rapid admin actions
collapse into one DB read and one upload (`staticFeed.service.ts:40-42`,
`FEED_REFRESH_DEBOUNCE_MS`, default 5000ms).

---

## Pipeline and ingestion

**Discovery** — finding candidate URLs, before anything is known about their
content. Produces *candidates*, not Opportunities. Entry point
`scripts/job-discovery/index.ts`; a run is `startRun()` … `finishRun()` and is
bounded by `DISCOVERY_TIMEOUT_MINUTES`.

**Candidate** — a URL that survived discovery and is awaiting verification. Not yet
an Opportunity. Can be discarded at any stage.

**Verification** — deciding whether a candidate is a real, live, relevant job page.
`JobCheckResult.status` is one of `live`, `expired`, `review`, `failed`
(`packages/pipeline/src/core/verifier.ts:8-14`).

Two pure guards inside verification, both exported for tests:

- **Generic portal title** — the page is a careers/search portal, not a job. Catches
  "Search for Jobs | Thomson Reuters", not just the bare string, by normalising the
  pipe suffix first (`verifier.ts:29-42`).
- **Listing downgrade** — a requisition redirected onto a listing/search page must
  not be saved as the job. Same-URL tracking rewrites pass through untouched
  (`verifier.ts:44-54`).

**Live** — the Opportunity's source page still shows the job. Verdicts come from
three implementations that should agree: a cheap HEAD precheck, a Playwright load,
and `EXPIRED_REGEXES` (one array, shared).

**Expired** — `expiresAt`/`expiredAt` on the row (`schema.prisma:780-781`).
Distinct from *live*: a page can be live while the Opportunity is closed.

**Job identity** — a per-item identifier for **logging only**. Explicitly "never for
dedup/discard" (`packages/pipeline/src/ats/job-identity.ts:17-24`). Three kinds, in
preference order: `ats` (`provider:jobId`), `url` (canonical `normalizeUrl`),
`fallback` (`company|title|location`, all normalised).

**Dedup key** — the identity used to decide two rows are the same Opportunity.
`sourceExternalId` ("id in the upstream ATS/feed, for stable dedupe",
`schema.prisma:703`) is the stable one. *Do not reuse `buildJobIdentity` for this* —
it is a logging aid, and its `fallback` branch is a different scheme.

**Normalisation** — collapsing the many spellings of one thing to a canonical form
before comparison: URLs, company names, job titles, locations, course and
specialization names, academic tokens. Applied at the point of comparison, and
sensitive to *which* normaliser runs (see *Drift* below).

**Rule engine** — deterministic, explainable eligibility checks. Every rule has a
name and a reason (`packages/utils/src/eligibility/rules.ts:1-2`), e.g.
`DEGREE_MATCH`. Distinct from *scoring*, which is weighted and yields a signal trace.

**Scoring** — weighted signals for how well an Opportunity targets freshers, from
`evaluateTitle` / `scoreJobDescription`, versioned by `ENGINE_VERSION` and
`WEIGHTS_VERSION` (`scorer.ts:12-13`) so a score change stays attributable.

**Eligibility** — whether a *specific profile* may apply, as opposed to how relevant
an Opportunity is in general. Uses the DB-filterable fields: `allowedDegrees`,
`allowedCourses`, `allowedSpecializations`, `allowedPassoutYears`, `requiredSkills`
(`schema.prisma:708-716`).

**ATS** — applicant tracking system: the vendor system a listing lives in (iCAMS,
Greenhouse, SmartRecruiters, Ceipal). *ATS job page* is a legitimate use of "job",
because it names a page type, not an Opportunity.

**Channel** — a non-ATS discovery source (Telegram, links, dorking), as opposed to
an ATS or an aggregator.

---

## Trust and provenance

**Source kind** — how the listing entered: `SCRAPED`, `USER_SUBMITTED`,
`IMPORTED`, `PARTNER_FEED` (`schema.prisma:108-113`). Lets a user tell a community
submission from a bot scrape, and drives trust scoring.

**Trust score** — a float, default **50** meaning *unknown*, not *untrustworthy*
(`schema.prisma:769-773`).

**Trust level** — the discrete verification state on a listing. Deliberately not
`UserTrustLevel`: `BANNED`/`CONTRIBUTOR`/`MODERATOR` describe a person, and a
listing has its own verification state (`schema.prisma:774-776`).

**Provenance** — `sourceKind` + `sourceExternalId` + `sourceLink` + `firstSeenAt`.
Community submissions and scrapers share one table; source kind is what
distinguishes them.

---

## Two rules that are easy to get wrong

**Salary is a projection.** `salaryMin`/`salaryMax`/`salaryRange` on the
Opportunity are a denormalised projection of the first `SALARY`
`OpportunityCompensation` row, written by the same save path, purely so the feed can
filter without a join. If they disagree, the component rows win and the scalar
fields are stale — never the reverse (`schema.prisma:730-734`). `stipend` and
`incentives` are display-only by the same rule.

**`attributes` is the long tail.** A new kind-specific field needs a relation only
when it needs real SQL filtering or joins; everything else goes in `attributes`
(`schema.prisma:758-766`).

---

## Drift

Definitions here that the code does not currently honour. Each is a real gap, not
a description of intent.

**`buildJobIdentity` does not reuse `canonicalKey`.** Its doc comment claims it
reuses "the SAME company|title|location identity as plugins' canonicalKey …
reusing the parser normalizers instead of a parallel implementation"
(`job-identity.ts:21-23`). It does not: it composes the parser normalisers itself,
and `packages/plugins/src/common/canonical-key.ts` is unreachable from that
package's entry point, so the shared implementation is dead. The comment describes
a reuse that never happens. Until this is resolved, treat *dedup key* and *job
identity* as two different schemes on purpose, not by oversight.

**`opp.type` no longer exists.** Any predicate testing it evaluates false forever.
This is what emptied `sitemap-walkins.xml` and sent government jobs to `/jobs/`
URLs; the post-mortem lives in a comment at `staticFeed.service.ts:10-17` rather
than being prevented structurally. See the Walk-in and Government job entries above
for the correct predicates.

**Classification has no single home.** "Is this a walk-in?" is answered in at least
four places — `staticFeed.service.ts`, `feedGenerator.service.ts`,
`apps/mobile/src/utils/cache/syncModule.ts`, and `walkinMapUtils` — which is why
the drift above was possible. Root `AGENTS.md` designates `packages/domain` as the
home for rules of this kind; **that package does not exist yet.**

**Three liveness implementations.** `isJobLive` exists in
`packages/pipeline/src/core/verifier.ts`, again in `scripts/sweeper/index.ts`, and
a third HEAD-only variant in `scripts/job-processor/src/liveness.ts` (live, via a
dynamic import at `job-processor/index.ts:169`). All three write the same
`EXPIRED` state. The DNS-error block is copy-pasted between the first two
verbatim (`sweeper/index.ts:52-56` ≡ `verifier.ts:64-68`). `EXPIRED_REGEXES` is the
correctly shared model: one array, imported by both.

