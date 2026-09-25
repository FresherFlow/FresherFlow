# Opportunity Taxonomy v2 — Decision & Plan

**Branch:** `feat/opportunity-taxonomy-v2`
**Status:** research + decisions locked, schema rewrite in progress
**Context:** zero users, zero jobs — free to rewrite, nothing to preserve.

## Why

`OpportunityType { JOB, INTERNSHIP, WALKIN, GOVERNMENT }` mixes three different axes
(what it is / how you attend / which sector). Every new concept needs: enum value +
migration + a new 1:1 detail table + a nullable relation. `WalkInDetails` = 18 columns,
`GovernmentJobDetails` = 90 columns. Off-campus drives, hackathons and scholarships
cannot be added cleanly.

## Decisions (locked)

Research saved in [`opportunity-taxonomy-research.md`](./opportunity-taxonomy-research.md).

### 1. Six independent dimensions (replaces OpportunityType)

| Dimension | Values |
|---|---|
| `category` | EMPLOYMENT, COMPETITION, SCHOLARSHIP, EDUCATION, EVENT |
| `employmentType` | FULL_TIME, PART_TIME, CONTRACT, TEMPORARY, FREELANCE, INTERNSHIP, APPRENTICESHIP, VOLUNTEER, PER_DIEM, OTHER — **array** (Google's schema allows multiple) |
| `recruitmentMethod` | REGULAR, OFF_CAMPUS, ON_CAMPUS, POOL_CAMPUS, WALK_IN, REFERRAL |
| `workMode` | ONSITE, HYBRID, REMOTE |
| `sector` | PRIVATE, GOVERNMENT, NGO, ACADEMIC, STARTUP |
| `experienceLevel` | ENTRY_LEVEL, INTERN, ASSOCIATE, MID, SENIOR, LEAD, EXECUTIVE — separate from `experienceMin/Max` |

OFF_CAMPUS / ON_CAMPUS / POOL_CAMPUS are India-specific — no major ATS has them. Ours to define.

### 2. Hybrid storage — the load-bearing decision

JEV said the enum split alone is only **0.53** (coin flip). Splitting the enum does NOT stop
migrations; the *storage pattern* does.

- Real indexed columns **only** where users filter or sort
- One `attributes Json` for the long tail → a new kind needs **no migration**
- Keep `GovernmentJobDetails` — Oracle/iCIMS prove large domain models are normal

### 3. College/institution targeting is first-class (JEV 0.84)

`eligibleInstitutions` — off-campus and pool-campus drives target named colleges, and users
want alerts when a drive targets their college. Cannot be a free-text tag.

### 4. Provenance on every opportunity (JEV 0.93)

FresherFlow is a community: people share opportunities as well as bots scraping them.
Every listing needs `sourceKind` (SCRAPED / USER_SUBMITTED / IMPORTED / PARTNER_FEED) and
trust signals, so a user can tell a community-submitted listing from a scraped one.
Note: today's `postedByUserId` is non-nullable, which wrongly forces a user on bot rows.

## Migration mapping (no data exists, for the record)

| Old | New |
|---|---|
| `type=JOB` | `category=EMPLOYMENT` |
| `type=INTERNSHIP` | `category=EMPLOYMENT, employmentType=[INTERNSHIP]` |
| `type=WALKIN` | `recruitmentMethod=WALK_IN` |
| `type=GOVERNMENT` | `sector=GOVERNMENT, category=EMPLOYMENT` |
| `workMode` | keep (ONSITE/HYBRID/REMOTE) |

## Keep from current schema

- `allowedDegrees`, `allowedCourses`, `allowedSpecializations`, `allowedPassoutYears`, `requiredSkills` — GIN arrays, correct as-is
- Walk-in lat/lng/city/reportingTime — real filterable facts
- `GovernmentJobDetails` — keep
- `RawOpportunity.rawPayload` — aggregator foundation
- Soft delete, link health, counters, `search_vector`

## Firecrawl — three concrete uses

1. `POST /scrape` replaces the Playwright fallback — 35/201 URLs (17%) are JS-rendered SPA
   shells (Wipro, Microsoft, Ultipro, Capgemini, Citi) that return nothing today.
2. `POST /parse` for government PDFs — the schema already stores `notificationPdfUrl`,
   `admitCardUrl`, `resultUrl`, `syllabusUrl`, `previousPapersUrl`. None are parsed today.
3. `POST /monitor` replaces daily liveness polling — the sweeper opens a full browser per URL per day.

Setup: `npx -y firecrawl-cli@latest init --all --browser`, then `firecrawl --status`.
Keyless tier covers scrape/search/parse.

## Progress log

- [x] Research across 13 public ATS/board schemas → `opportunity-taxonomy-research.md`
- [x] JEV decisions (0.53 / 0.84 / 0.93)
- [x] Branch `feat/opportunity-taxonomy-v2`
- [x] Rewrite enums in `schema.prisma` (6 dimensions replacing `OpportunityType`)
- [x] Rewrite `Opportunity` model (classification, provenance, event fields, `attributes Json`)
- [x] `WalkInDetails` → generic `DriveDetails`
- [x] `EventDetails` for competitions/hackathons
- [x] `Institution` + `OpportunityInstitution` for college targeting
- [x] `Profile.interestedIn`, `IngestionSource.defaultCategory`, `RawOpportunity.suggestedCategory`
- [x] `prisma validate` ✅ · `prisma generate` ✅
- [x] `packages/types` — enums.ts, index.ts (Opportunity + DTOs), schemas.ts (Zod) ✅ builds
- [ ] Fix downstream consumers (api / web / mobile / scripts)
- [ ] `prisma migrate dev` to create the migration

## Known downstream references still using the old shape

`git grep OpportunityType` hit ~30 files before this change. Known areas:
- `apps/api/src/routes/**` (public + admin opportunities, submit, feed, search)
- `apps/api/src/application/opportunity/{create,update}.ts`
- `apps/api/src/infrastructure/services/**` (opportunity, feedGenerator, walkin, fresherNeeds, profile, socialPost, community)
- `apps/api/src/cron/expiryCron.ts`, `apps/api/src/utils/{share,validation}.ts`, `apps/api/src/types/admin.ts`
- `apps/mobile/src/hooks/**`, `apps/mobile/src/screens/feed/**`
- `apps/api/src/__tests__/**`
- `apps/api/scripts/seedLeverSources.ts`

Also anything reading `walkInDetails` must move to `driveDetails`.

## Working rules for this branch

- One change at a time. No speculative extra files.
- Verify before reporting. Do not claim a build passed without running it.
- `packages/database/prisma/schema.prisma` is high-risk per root AGENTS.md.

