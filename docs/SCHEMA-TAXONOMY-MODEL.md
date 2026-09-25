# Opportunity Taxonomy Model — locked proposal

**Status:** Proposed / locked by product. Not yet implemented.
**Date:** 2026-09-25
**Scope:** Replace the mixed-purpose `OpportunityType` enum with orthogonal, data-driven
dimensions so new concepts (off-campus, on-campus, apprenticeship, …) can be added as
**data rows** instead of schema changes.

> This document is the source of truth for the target model. It supersedes prior ad-hoc
> additions to `OpportunityType`. See "Known issues to resolve before implementation" at
> the end — those must be settled before any code is written.

---

## 1. Core principle

Enums are code. Taxonomies are data.

- **Open / growing vocabularies → database tables.** Adding a value is an `INSERT`.
- **Closed / never-growing sets → enums.** (Lifecycle status, work mode.)

This is what makes the model future-proof: adding `ON_CAMPUS` later must not require a
migration, a deploy, or a new field, and must not duplicate an existing value.

---

## 2. New lookup models

```prisma
model OpportunityType {
  id          String   @id @default(cuid())
  code        String   @unique   // JOB | INTERNSHIP | GOVERNMENT
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}

model RecruitmentMethod {
  id          String   @id @default(cuid())
  code        String   @unique   // REGULAR | OFF_CAMPUS | WALK_IN | ON_CAMPUS | POOL_CAMPUS
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}

model EmploymentType {
  id          String   @id @default(cuid())
  code        String   @unique   // FULL_TIME | PART_TIME | CONTRACT | APPRENTICESHIP
  name        String
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}
```

`WorkMode` stays as the existing enum — it is stable enough to remain closed.

---

## 3. Updated `Opportunity`

```prisma
model Opportunity {
  // ... keep everything already present ...

  // === Taxonomy (new FKs) ===
  typeId              String?
  recruitmentMethodId String?
  employmentTypeId    String?

  type                OpportunityType    @relation(fields: [typeId], references: [id])
  recruitmentMethod   RecruitmentMethod  @relation(fields: [recruitmentMethodId], references: [id])
  employmentTypeRel   EmploymentType     @relation(fields: [employmentTypeId], references: [id])

  // Old enum columns are kept temporarily for dual-write / gradual migration,
  // then dropped after backfill. (See "Known issues" — field naming must be resolved.)

  // === Campus support (new) ===
  isPoolCampus        Boolean @default(false)
  colleges            OpportunityCollege[]

  // === Long-tail only ===
  attributes          OpportunityAttribute[]

  // ... rest of existing fields & indexes ...
}
```

### First-class filterable fields (unchanged)

`workMode`, `salaryMin/Max/Range/Period`, `stipend`, `experienceMin/Max`, `locations`,
`structuredLocations`, `allowedDegrees`, `allowedCourses`, `allowedSpecializations`,
`allowedPassoutYears`, `passoutYearMin/Max`, `requiredSkills`, `tags`.

### Specialized 1:1 relations (unchanged)

`walkInDetails`, `governmentJobDetails`.

---

## 4. Supporting models

```prisma
model OpportunityAttribute {
  id            String   @id @default(cuid())
  opportunityId String
  key           String   // bond_years | notice_period_days | event_code | special_requirement | ...
  value         String
  dataType      String   @default("string") // string | number | boolean | date | json
  createdAt     DateTime @default(now())

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)

  @@unique([opportunityId, key])
  @@index([key])
  @@index([opportunityId])
}

model College {
  id        String   @id @default(cuid())
  name      String
  code      String?
  city      String?
  state     String?
  country   String   @default("India")
  createdAt DateTime @default(now())

  opportunities OpportunityCollege[]

  @@index([name])
  @@index([city, state])
}

model OpportunityCollege {
  opportunityId String
  collegeId     String
  isPrimary     Boolean @default(false)

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  college     College     @relation(fields: [collegeId], references: [id], onDelete: Cascade)

  @@id([opportunityId, collegeId])
  @@index([collegeId])
}
```

---

## 5. Seed data (run once)

```sql
-- OpportunityType
INSERT INTO "OpportunityType" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'JOB', 'Job', 1),
  (gen_random_uuid(), 'INTERNSHIP', 'Internship', 2),
  (gen_random_uuid(), 'GOVERNMENT', 'Government', 3);

-- RecruitmentMethod
INSERT INTO "RecruitmentMethod" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'REGULAR', 'Regular', 1),
  (gen_random_uuid(), 'OFF_CAMPUS', 'Off Campus', 2),
  (gen_random_uuid(), 'WALK_IN', 'Walk-in', 3),
  (gen_random_uuid(), 'ON_CAMPUS', 'On Campus', 4),
  (gen_random_uuid(), 'POOL_CAMPUS', 'Pool Campus', 5);

-- EmploymentType
INSERT INTO "EmploymentType" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'FULL_TIME', 'Full Time', 1),
  (gen_random_uuid(), 'PART_TIME', 'Part Time', 2),
  (gen_random_uuid(), 'CONTRACT', 'Contract', 3),
  (gen_random_uuid(), 'APPRENTICESHIP', 'Apprenticeship', 4);
```

---

## 6. Migration strategy (safe)

1. Add the three lookup tables + `OpportunityAttribute` + College tables (fully additive).
2. Add the new nullable FK columns on `Opportunity`.
3. Backfill existing rows:
   - Map old `OpportunityType` enum → new `typeId`
   - Map old recruitment values → new `recruitmentMethodId`
   - Map legacy free-text `employmentType` → new `employmentTypeId`
4. Dual-write for 1–2 releases.
5. Switch all queries / filters to the new FKs.
6. Drop the old enum columns once confident.

---

## 7. Final mental model (locked)

```
Opportunity
├── type              → WHAT  (JOB / INTERNSHIP / GOVERNMENT)
├── recruitmentMethod → HOW   (REGULAR / OFF_CAMPUS / WALK_IN / ON_CAMPUS / POOL_CAMPUS)
├── employmentType    → ARRANGEMENT
├── workMode          → WHERE
├── first-class filter fields (salary, experience, location, eligibility…)
├── WalkInDetails?           (when method = WALK_IN)
├── GovernmentJobDetails?    (when type = GOVERNMENT)
├── colleges[]               (when method = ON_CAMPUS or POOL_CAMPUS)
└── attributes[]             (rare / source-specific only)
```

---

## 8. Known issues to resolve before implementation

These are review findings, not part of the locked proposal. They should be decided
before the first line of code.

1. **Naming collision (blocking).** The proposal defines a Prisma **model** named
   `OpportunityType` while an **enum** `OpportunityType` already exists in
   `schema.prisma`, and `OpportunityType` is imported as a type in ~160 places from
   `@fresherflow/types`. Prisma model and enum names must be unique, and the generated
   client would export a model type with the same name. Also, the snippet defines a
   relation field `type` while the plan says to keep the old `type` enum column — two
   fields cannot share the name `type`. Proposed fix: name the lookup model
   `OpportunityKind` (or `ListingType`) and give the relation a distinct field name
   (`kind`), keeping `type` only as the temporary legacy enum.

2. **Model differs from the agreed 5-dimension table.** `Sector` is absent, and
   `INTERNSHIP` remains in the "WHAT" axis while `EmploymentType` omits it. This is
   defensible (a government listing and an internship can be treated as listing *kinds*),
   but it is a deliberate re-decision and should be recorded as such, because filters must
   then be unambiguous: is "internships" filtered on `type` or `employmentType`?

3. **Off-campus drive shape is unaddressed.** `colleges[]` covers on-campus, but an
   off-campus drive still needs dates, venue, reporting time, and required documents —
   which currently only exist on `WalkInDetails`. Generalise `WalkInDetails` into
   `DriveDetails` (reused by walk-in / off-campus / on-campus) rather than adding a
   parallel `CampusDetails` later.

4. **Campus tables contradict the MVP decision.** `College` / `OpportunityCollege` /
   `isPoolCampus` add surfaces for on-campus, which was explicitly declared out of scope
   for the public MVP. Either drop them or mark them clearly deferred.

5. **`OpportunityAttribute` is EAV.** Flexible but type-unsafe and awkward to index or
   filter. Restrict it to non-filterable, source-specific data only; anything queryable
   belongs in a real column.

6. **Missing integration rules.** The following are absent from the plan and are the
   usual reasons taxonomy migrations fail:
   - Cached feeds (R2 bootstrap object, mobile MMKV) cannot join — they must carry
     taxonomy **codes**, not foreign-key IDs.
   - Taxonomy edits are reference-data changes and must invalidate ISR / feed caches.
   - Existing indexed URLs (`/jobs/walkins`, `/jobs/internships`, `?type=walkin`) need
     redirects when filters move to dimension params.
   - `Profile.interestedIn` (`OpportunityType[]`) is multi-valued and needs a
     `ProfilePreference` join shape, not a single FK.

7. **Minor.**
   - Seed uses `gen_random_uuid()` against columns declared `@default(cuid())` —
     pick one id strategy.
   - Add a check that a taxonomy `code` is unique **across** taxonomies (a registry
     assertion), so a value can never again live in two dimensions.
   - Migration step 3 must normalise legacy free-text `employmentType`
     (`"Full Time"`, `"INTERNSHIP"`, …) before mapping; the mapping is potentially lossy.

---

# Revision 2 — conflict-free migration plan

**Status:** Proposed. Supersedes §3 field naming and §6 migration ordering.
**Change:** Rename the conflicting enums *first* so the model names become free, then add
the lookup models. This removes the Prisma name collision identified in §8.1.

## Step 1 — Rename the conflicting enums first

```prisma
enum OpportunityTypeLegacy {
  JOB
  INTERNSHIP
  WALKIN
  GOVERNMENT
}

enum RecruitmentMethodLegacy {
  REGULAR
  OFF_CAMPUS
  WALKIN
}
```

Update schema references:

```prisma
// In Opportunity
 type               OpportunityTypeLegacy
 recruitmentMethod  RecruitmentMethodLegacy @default(REGULAR)

// In Profile
 interestedIn       OpportunityTypeLegacy[]

// In IngestionSource
 defaultType        OpportunityTypeLegacy @default(JOB)

// In RawOpportunity
 suggestedType      OpportunityTypeLegacy?
```

Run `prisma migrate dev --name rename_legacy_enums`.

## Step 2 — Add the new lookup models (names are now free)

```prisma
model OpportunityType {
  id          String   @id @default(cuid())
  code        String   @unique   // JOB | INTERNSHIP | GOVERNMENT
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}

model RecruitmentMethod {
  id          String   @id @default(cuid())
  code        String   @unique   // REGULAR | OFF_CAMPUS | WALK_IN | ON_CAMPUS | POOL_CAMPUS
  name        String
  description String?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}

model EmploymentType {
  id          String   @id @default(cuid())
  code        String   @unique   // FULL_TIME | PART_TIME | CONTRACT | FREELANCE | APPRENTICESHIP
  name        String
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  opportunities Opportunity[]
}
```

## Step 3 — Add supporting models + new columns on Opportunity

`OpportunityAttribute`, `College`, `OpportunityCollege` as in §4, plus:

```prisma
// Inside Opportunity (additive only)
typeId              String?
recruitmentMethodId String?
employmentTypeId    String?

typeRel              OpportunityType?    @relation(fields: [typeId], references: [id])
recruitmentMethodRel RecruitmentMethod? @relation(fields: [recruitmentMethodId], references: [id])
employmentTypeRel    EmploymentType?     @relation(fields: [employmentTypeId], references: [id])

isPoolCampus        Boolean @default(false)
colleges            OpportunityCollege[]
attributes          OpportunityAttribute[]
```

## Step 4 — Seed the lookup tables

```sql
INSERT INTO "OpportunityType" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'JOB', 'Job', 1),
  (gen_random_uuid(), 'INTERNSHIP', 'Internship', 2),
  (gen_random_uuid(), 'GOVERNMENT', 'Government', 3);

INSERT INTO "RecruitmentMethod" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'REGULAR', 'Regular', 1),
  (gen_random_uuid(), 'OFF_CAMPUS', 'Off Campus', 2),
  (gen_random_uuid(), 'WALK_IN', 'Walk-in', 3),
  (gen_random_uuid(), 'ON_CAMPUS', 'On Campus', 4),
  (gen_random_uuid(), 'POOL_CAMPUS', 'Pool Campus', 5);

INSERT INTO "EmploymentType" (id, code, name, "sortOrder") VALUES
  (gen_random_uuid(), 'FULL_TIME', 'Full Time', 1),
  (gen_random_uuid(), 'PART_TIME', 'Part Time', 2),
  (gen_random_uuid(), 'CONTRACT', 'Contract', 3),
  (gen_random_uuid(), 'FREELANCE', 'Freelance', 4),
  (gen_random_uuid(), 'APPRENTICESHIP', 'Apprenticeship', 5);
```

## Step 5 — Backfill existing rows

```sql
-- Map old enum → new typeId
UPDATE "Opportunity" o
SET "typeId" = ot.id
FROM "OpportunityType" ot
WHERE ot.code = o.type::text
  AND o.type::text IN ('JOB', 'INTERNSHIP', 'GOVERNMENT');

-- Special handling for old WALKIN type → keep as JOB + WALK_IN method
UPDATE "Opportunity" o
SET "typeId" = (SELECT id FROM "OpportunityType" WHERE code = 'JOB'),
    "recruitmentMethodId" = (SELECT id FROM "RecruitmentMethod" WHERE code = 'WALK_IN')
WHERE o.type::text = 'WALKIN';

-- Map recruitmentMethod
UPDATE "Opportunity" o
SET "recruitmentMethodId" = rm.id
FROM "RecruitmentMethod" rm
WHERE rm.code = REPLACE(o."recruitmentMethod"::text, 'WALKIN', 'WALK_IN');
```

## Step 6 — Application code changes

- Prefer `typeId` / `recruitmentMethodId` / `employmentTypeId` everywhere.
- Read legacy enum columns only as a temporary fallback.
- Do **not** drop the legacy enums until every query and write path has switched.

## Summary of the safe path

1. Rename conflicting enums → `*Legacy`
2. Add new lookup models (names now free)
3. Add new nullable FKs + College + Attribute tables
4. Seed + backfill
5. Switch application code
6. Drop legacy enums later

---

# Review of Revision 2

Revision 2 correctly solves the naming collision (§8.1) by renaming first and reusing the
name. It is technically sound on that point. The following were found on review.

### R2-1 — BLOCKING: Step 5 backfill order silently converts walk-ins to REGULAR

Statement 2 sets `recruitmentMethodId = WALK_IN` for `type = 'WALKIN'` rows, but leaves
the legacy `recruitmentMethod` column untouched (still `'REGULAR'`, its default).

Statement 3 then runs for **all** rows and recomputes `recruitmentMethodId` from
`REPLACE(o."recruitmentMethod"::text, 'WALKIN', 'WALK_IN')`. For walk-in rows that
evaluates to `'REGULAR'`, so it **overwrites the WALK_IN value set by statement 2**.

Result: every walk-in silently becomes REGULAR. Fix by running the generic mapping
first and the specific case last, or by excluding walk-ins from statement 3:

```sql
UPDATE "Opportunity" o
SET "recruitmentMethodId" = rm.id
FROM "RecruitmentMethod" rm
WHERE rm.code = REPLACE(o."recruitmentMethod"::text, 'WALKIN', 'WALK_IN')
  AND o.type::text <> 'WALKIN';   -- do not clobber the specific mapping below
```

### R2-2 — GAP: `employmentTypeId` is never backfilled

Step 3 adds `employmentTypeId`, but no statement in Step 5 populates it. Every row ends
with `employmentTypeId = NULL` while legacy free-text `employmentType` keeps its values.
A normalising backfill is required (case-insensitive match on `FULL TIME`/`PART TIME`/
`CONTRACT`/`INTERNSHIP`/…), with unmatched values recorded rather than silently dropped.

### R2-3 — `RecruitmentMethodLegacy` is dead weight; revert instead

The `RecruitmentMethod` enum only exists as an uncommitted addition to this repo. It has
no production data and no consumers. Renaming it to `RecruitmentMethodLegacy` creates a
permanent legacy type for nothing. Revert/delete it instead, and keep only
`OpportunityTypeLegacy` as the genuine legacy enum.

### R2-4 — Still no Sector; a government internship remains unrepresentable

`GOVERNMENT` stays inside the `OpportunityType` model, so `type` holds one value and a
"government internship" cannot be expressed. This was §8.2 and is unresolved. Acceptable
only as an explicit product decision.

### R2-5 — Off-campus still has no drive shape

`College` / `OpportunityCollege` address on-campus. Off-campus drives still have no home
for dates/venue/reporting time/documents. Generalise `WalkInDetails` → `DriveDetails`.

### R2-6 — Minor

- Step 1 renames the **Prisma** enum, but `@fresherflow/types` keeps exporting an enum
  named `OpportunityType` with `REMOTE`/`HACKATHONS`. The drift is renamed, not removed.
- Every `import { OpportunityType as DbOpportunityType } from '@fresherflow/database'`
  (and `@prisma/staging-client` in `apps/api/scripts/seedLeverSources.ts`) must be updated
  in Step 6, or the build breaks.
- Seed still mixes `gen_random_uuid()` with `id String @default(cuid())` — pick one.
- Renaming an enum for the sole purpose of freeing its name costs repo-wide churn.
  Naming the lookup model `OpportunityKind` and leaving `OpportunityType` alone avoids
  that churn entirely and keeps the legacy enum's name meaningful.
