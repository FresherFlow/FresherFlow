---
name: fresherflow-job-extraction
description: Extract a job posting from any URL or pasted text and turn it into a verified, correctly populated FresherFlow listing using the FresherFlow MCP server. Use when adding, correcting or refreshing jobs, internships, walk-in drives or government vacancies on FresherFlow, or when asked to "add this job", "list this drive", "post this vacancy".
---

# FresherFlow job extraction

Turns a job posting into a stored, verified FresherFlow listing.

This skill owns **how to extract and what a good extraction looks like**. The
authoritative field contract lives in the backend and is read at runtime via
`get_listing_schema` — never from memory, never from this file.

## The one rule that matters

**A successful tool response does not mean the listing is correct.**

`create_listing` returning 201 only proves the API accepted the request. Fields
can be dropped, coerced or silently ignored. Always finish with
`get_listing` and check what was actually stored. Report from that response,
never from what you intended to send.

## Workflow

1. **Get the posting.** Fetch the URL or use the pasted text. If you cannot
   read the posting, say so — do not reconstruct it from the URL slug or a
   search result snippet.
2. **Read the contract.** Call `get_listing_schema`. Build the payload from
   what it returns. The schema is generated from the same validator the admin
   form uses, so it cannot drift from what the API accepts.
3. **Extract every supported field** using the rules below.
4. **Self-check before sending** — run the pre-flight checklist.
5. **Call `create_listing`.**
6. **Call `get_listing` and verify.** Compare the stored record against your
   payload. If something did not land, fix it with `update_listing` rather than
   reporting success.
7. **Report accurately.** Say what was stored and its real status.

## Choosing the tool

| User intent | Tool |
|---|---|
| "Add this job" / "post this drive" — a real listing | `create_listing` (available on a **moderator** connection only) |
| "Add this job" when this connection is not a moderator | `submit_opportunity` — saved as a **DRAFT** |
| "Correct this listing" / "update the salary" | `get_listing`, then `update_listing` (moderator only) |
| "Check what you stored" | `get_listing` |
| "What is already on the site?" | `get_jobs` |
| Anything at all, before building a payload | `get_listing_schema` |

`submit_opportunity` is **not** a smaller version of `create_listing`. On a
normal account it writes a draft that a moderator still has to publish, and an
account without the moderator role cannot reach `create_listing` at all.

## Status: the role decides

Check `whoami` before promising anything. `mcpRole` is `moderator` or `user`.

| Connection | `submit_opportunity` | `create_listing` default |
|---|---|---|
| moderator | published immediately | `PUBLISHED` |
| user | saved as `DRAFT`, not live | not available |

On a moderator connection, `create_listing` publishes immediately and fires
alerts and feed regeneration — pass `DRAFT` only when the user asked for it to
be staged. On a user connection, the job is a draft no matter what: say that
plainly instead of implying it is live.

Never tell a user a listing is live unless a tool response reports
`published: true`.

## Field rules

### Always required

`title`, `company`, `requiredSkills`.

Additionally, **anything that is not a walk-in needs `applyLink` or
`sourceLink`**. Without one the call fails with a validation error. Put the
canonical application URL in `applyLink` and the posting you read in
`sourceLink`; the API mirrors one into the other.

### `category` decides more than one thing

`category` is a legacy alias that resolves into two separate dimensions:

| `category` | Effect |
|---|---|
| `walk-in` | sets `recruitmentMethod: WALK_IN` |
| `internship` | appends the `INTERNSHIP` employment type |
| `job` (default) | `OpportunityCategory: EMPLOYMENT` |

### Walk-in drives

Set `category: "walk-in"` **and** a `driveDetails` object. `driveDetails` needs
`venueAddress` — without it the drive is silently skipped and you end up with an
ordinary listing.

Capture when you can: `dates` (array) or `dateRange` (text), `timeRange`,
`reportingTime`, `venueAddress`, `city`, `landmark`, `latitude`/`longitude`,
`transitInfo`, `requiredDocuments`, `contactPerson`, `contactPhone`.

### Government jobs

There is **no `government` category** — sending one is a validation error.

Send `category: "job"`, `sector: "GOVERNMENT"`, and a populated
`governmentJobDetails` object. The details block is what creates the government
record; `sector` alone does nothing.

Useful government fields: `advertisementNumber`, `department`, `recruitingBody`,
`postName`, `vacancyCount`, `vacancies[]`, `applicationStartDate`,
`applicationEndDate`, `applicationFee`, `eligibilityDetails`,
`requiredDocumentDetails[]`, `selectionStages[]`, `examPattern`,
`officialNotificationUrl`.

### `employmentTypes` is a string, not an array

It is free text: `"FULL_TIME, INTERNSHIP"` or `"FULL_TIME|INTERNATIONSHIP"`.
Values outside the enum are **dropped silently** — use exact enum values from
`get_listing_schema`.

### Salary

Prefer the structured fields over a display string:

- `salaryMin` / `salaryMax` — numbers
- `salaryPeriod` — `MONTHLY` or `YEARLY`
- `salaryRange` — human text (`"6-8 LPA"`)
- `stipend` — for paid internships

If the posting states a range, fill both `salaryMin` and `salaryMax`. If it
says only "unpaid" or gives no figure, leave them `null` — **never estimate or
infer a number**. A wrong salary is worse than a missing one.

For an internship quoted per month, set `salaryPeriod: "MONTHLY"`. For an LPA
figure set `YEARLY`.

### Eligibility

- `allowedDegrees` — enum only: `TENTH`, `INTER`, `DIPLOMA`, `DEGREE`, `PG`
- `allowedCourses` — free text (`"B.Tech / B.E."`)
- `allowedSpecializations` — free text
- `allowedPassoutYears` — years as numbers: `[2025, 2026]`
- `allowedAvailability` — `IMMEDIATE`, `DAYS_15`, `MONTH_1`

"Any graduate" means `allowedDegrees: ["DEGREE"]` and leave the rest empty.
"Final-year students only" means `allowedPassoutYears: [<current year>]`.

Do not widen eligibility the posting does not state. `"No experience required"`
means `experienceMin: 0`.

### `description`

Write it for a fresher deciding whether to apply. Minimum 10 characters, but a
one-line summary is a weak listing. Cover: what the role does, what the company
does, and what the candidate does next. Copy the posting's substance, do not
invent qualifications or benefits it does not mention.

## Pre-flight checklist

Before calling `create_listing` or `update_listing`:

- [ ] Called `get_listing_schema` first — no field names invented from memory
- [ ] `title`, `company`, `requiredSkills` present
- [ ] `applyLink` or `sourceLink` present, and is a real `http(s)` URL
- [ ] Every enum value is copied from the schema, not guessed
- [ ] Walk-in → `driveDetails` with `venueAddress`
- [ ] Government → `sector: "GOVERNMENT"` + `governmentJobDetails`
- [ ] No invented salary numbers
- [ ] No eligibility the posting does not state
- [ ] Nothing in the payload you cannot point to in the source

## Updating

`update_listing` is a **full replace, not a patch**. Anything you omit is
cleared. Always:

1. `get_listing` to read current values
2. Modify only what needs changing
3. Send the complete payload

If you skip step 1 and send a fragment, you will wipe the listing's salary,
skills and eligibility.

## Errors

| Error | Cause | Fix |
|---|---|---|
| `At least one sourceLink or applyLink is required` | Missing link, not a walk-in | Add a real application URL |
| `Duplicate listing detected by applyLink` | A live listing already uses that URL | Use `update_listing` on the returned id, or change the link |
| `An existing pending draft was updated` | Repeat submit of a pending job | Expected — verify with `get_listing` |
| `status must be one of: DRAFT, PUBLISHED, ARCHIVED` | You sent `EXPIRED` | Use `ARCHIVED` |
| `Unknown or missing API key` | MCP server lacks `INTERNAL_API_SECRET` | Fall back to `submit_opportunity`, and say the listing is only staged for review |

Report the error to the user plainly. Never describe a failed write as a
success, and never claim a field was saved without reading it back.

## Reference

| Concern | Source of truth |
|---|---|
| Field names, enums, required fields | `get_listing_schema` at runtime |
| Working payload examples | `apps/web/src/features/admin/opportunities/jsonTemplates.ts` |
| Aliases the admin bulk importer accepts | `apps/web/src/features/admin/opportunities/bulkImport.ts` |
| Server-side validation | `apps/api/src/utils/validation.ts` (`opportunitySchema`) |
| Write rules, duplicate handling | `apps/api/src/application/opportunity/listingWrite.ts` |