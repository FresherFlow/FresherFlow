# Audit 07 — Forms, validation, type contract

Read-only. Scope: `apps/web/src`, `packages/types`, `packages/api-client`,
`features/admin/opportunities`.

| Rating | Count |
|---|---:|
| CRITICAL | 5 |
| HIGH | 9 |
| MEDIUM | 3 |
| LOW (clean) | 2 |

---

## 1. CRITICAL — no form in the app uses a form library

`grep 'useForm|zodResolver|react-hook-form'` across all of `apps/web/src`
returns **two comment mentions** (`opportunityFormSchema.ts:8`,
`useOpportunityForm.ts:1634`). Every form is hand-rolled `useState` +
`onSubmit`.

The admin opportunity form ships a **complete Zod schema that has zero
importers** — `opportunityFormSchema.ts:20-162`, plus
`opportunityFormDefaults` at `:161-162`. All 5 grep hits are inside that file.
Its own doc comment (`:3-11`) admits the live store is still ~110 individual
`useState` calls.

| Form | File | Approach |
|---|---|---|
| Admin opportunity | `opportunities/components/OpportunityFormPage.tsx:194` | `buildOpportunityPayload` over ~110 states (`useOpportunityForm.ts:96-224`) |
| Timeline events | `.../TimelineSection.tsx` | `useState` |
| Admin JSON import | `OpportunityFormPage.tsx:146,180` | raw `JSON.parse` |
| Admin resources | `admin/components/AdminResourcesClient.tsx:615` | `useState` |
| Admin push | `admin/components/PushNotificationClient.tsx:84` | `useState` |
| Admin rooms | `app/(admin)/admin/rooms/RoomsClient.tsx:433` | `useState` |
| Admin feedback | `app/(admin)/admin/feedback/FeedbackClient.tsx` | `useState` |
| Login / OTP / claim | `app/(auth)/login/_components/LoginForm.tsx:407,427,459` | `useState` |
| 2FA ×3 | `app/(admin)/admin/login/_components/{TotpSignIn,TotpEnrolment,FirstRunSetup}.tsx` | `useState` |
| Profile ×5 | `features/profile/components/sections/*.tsx` | `useState` |
| Contribute / Post job | `ContributeSheet.tsx:935`, `PostJobForm.tsx:144` | `useState` |
| Saved search, salary report, referral, rooms, username claim, apply-to-hire, onboarding, live search | various | `useState` |

The one place a library is used correctly is
`hooks/adminOpportunitySearchParams.ts:25-59`, which Zod-validates raw URL
params with `.catch()` fallbacks. That is a query parser, not a form — but it is
the pattern the opportunity form should have matched.

---

## 2. CRITICAL — `parseJsonInput` throws outside the submit `try`

`features/admin/opportunities/opportunityPayload.ts:188-192`:

`parseJsonInput` calls `JSON.parse(trimmed) as T` with **no try/catch**.

It is called **19 times** (`opportunityPayload.ts:286-326`), once per `*Json`
textarea in `GovernmentJobSection.tsx`. `buildOpportunityPayload` is invoked at
`useOpportunityFormHandlers.ts:23`, which is **outside** the `try` that begins
at `:141`. The form's submit is `void handleSubmit(e)`
(`OpportunityFormPage.tsx:194`).

A single malformed JSON character therefore produces an unhandled promise
rejection: no toast, `setIsLoading(false)` never ran (`:138` never reached,
`:168` never runs), and the admin gets no indication of failure.

---

## 3. CRITICAL — four form fields are silently stripped before persistence

The server schema is a plain `z.object` with **no `.passthrough()`**
(`apps/api/src/utils/validation.ts:220`, closed at `:356`), and
`apps/api/src/middleware/validate.ts:10` replaces the body with the parsed
output. Unknown keys are removed before any handler runs.

| Field sent | Sent at | In `opportunitySchema`? | Consequence |
|---|---|---|---|
| `customSlug` | `opportunityPayload.ts:248` | **no** | read at `routes/admin/opportunities/create.ts:108,274,478` → always `undefined`; the admin's slug is discarded |
| `sector: 'GOVERNMENT'` | `:218` | **no** | read at `application/opportunity/create.ts:113` → always defaults to `'PRIVATE'` |
| `passoutYearMin` / `passoutYearMax` | `:228-229` | **no** | stripped; never persisted |
| `allowedAvailability` | `:230` | **no** | stripped; never persisted |
| `applicationMode` (string) | `:296` | key is `applicationModes: z.array(z.string())` at `validation.ts:267` | name **and** type mismatch → stripped |

**Other fields with no client validation at all**, so a value the form never
checked can be submitted: all 19 JSON textareas; `contactPhone`;
`experienceMin`/`Max`; `ageMin`/`ageMax`; `basicPay`; `vacancyCount`;
`extractionConfidence`; `appDuration`; `salaryAmount`; `venueLink`; the eight
government `*Url` fields; `walkInDateRange`/`walkInTimeRange`. Plus `title`,
`company`, and `description`, which the client never checks at all.

`description` in particular: the client only counts characters for a
completeness meter (`OpportunityFormPage.tsx:59`, `.trim().length > 0`), which is
not a gate. The server requires `min(10)` (`validation.ts:230`), and
`opportunityPayload.ts:222` sends the raw value — so an empty description is a
routine hard 400.

---

## 4. HIGH — payload builder correctness

| Issue | Where |
|---|---|
| `autoTimeRange` is always truthy. `formatTime` returns `''` for empty input (`:163`), but the template literal at `:259` is always a non-empty string. When both times are blank it is `" - "`, so `:262` and `:265` submit `timeRange: " - "` / `reportingTime: " - "` and never fall back to `values.walkInTimeRange` | `opportunityPayload.ts:259` |
| `toFloat` (`:133-137`) does `parseFloat(value.replace(/[^0-9.]/g, ''))`. `"1e5"` → `"15"` → `15`. `"5-10"` → `"5.10"` → `5.1`. Used for `experienceMin`/`Max` at `:243-244`; `formatSalaryRange` (`:172`) uses the same strip for `salaryAmount` | `opportunityPayload.ts:133-137` |
| Bare `parseInt`/`parseFloat` with no `Number.isFinite` guard: `passoutYearMin/Max` (`:228-229`), `vacancyCount` (`:297`), `ageMin/Max` (`:301-302`), `basicPay` (`:336`), `extractionConfidence` (`:329`). All produce `NaN`, which `JSON.stringify` serialises to `null` — **a garbage value is indistinguishable from a cleared one on the wire** | `opportunityPayload.ts` |
| Three conventions for "absent" in one file: `null` for top-level optionals (`:221-222,236-241,245-248`), `undefined` for every `governmentJobDetails` key (`:275-338`), and a literal `undefined` on an existing key (`workMode` at `:233`) | `opportunityPayload.ts` |
| `walkInDateRange`/`walkInTimeRange` silently dropped whenever the derived value wins (`:261-262`) | `opportunityPayload.ts:261` |
| Timezone-inconsistent parsing. `toEndOfDayIso` (`:181-186`) and the expiry block (`:208-214`) build `new Date("YYYY-MM-DDTHH:mm:ss")` = **local**; `formatDateRange` (`:146-160`) uses `new Date("YYYY-MM-DD")` = **UTC** | `opportunityPayload.ts` |
| `getOrdinalNum` (`:140-144`) yields `"111st"`, `"112nd"` for 3-digit values — the `n > 10 && n < 14` guard does not cover them | `opportunityPayload.ts:140` |
| `dates` emits a **duplicated two-element array** when only a start date exists (`:266`) | `opportunityPayload.ts:266` |
| `toCsvList` (`:121-130`) splits on `,` only, unlike `formUtils.ts:66` which splits on `/[,/|]/` — so `job|internship` text produces one element | `opportunityPayload.ts:121` |
| `salaryMin`/`salaryMax` exist in the server schema (`validation.ts:242-243`) but the web payload **never sends them** | `opportunityPayload.ts` |
| No `applicationStartDate` before `applicationEndDate` check on either side; both are plain strings (`validation.ts:278-279`). `driveDetails.dates` is `z.array(z.string())` with no ordering check (`:331`) | `apps/api/src/utils/validation.ts` |
| Client `DEGREE_ENUMS` (`formUtils.ts:409`) is `['DIPLOMA','DEGREE','PG']` — **narrower** than `EducationLevel` (`packages/types/src/enums.ts:171-177`, which also has `TENTH`, `INTER`), while the server validates against the full enum (`validation.ts:233`) | `formUtils.ts:409` |

---

## 5. HIGH — validation duplicated across four layers for the same fields

`sourceLink` / `applyLink` is checked in four places:
`useOpportunityFormHandlers.ts:17-21` (client, non-WALKIN only),
`opportunityFormSchema.ts:148-157` (dead), `apps/api/src/utils/validation.ts:255-256`,
and again at `routes/admin/opportunities/create.ts:66-68` and `:433-435`.

`title` and `company`: client validates **nothing**; server requires both
(`validation.ts:226-227`); `opportunityPayload.ts:219-220` sends them untrimmed.

URL fields: `companyWebsite` and `companyLogoUrl` get only `type="url"`
(`JobInfoSection.tsx:64,71`), no JS check. `opportunityPayload.ts:221-222` sends
`values.X || null`; the server requires `z.string().url()` **or** `''`
(`validation.ts:228-229`) — a scheme-less `wipro.com` 400s. Nine more URL fields
are plain `optionalText` and pass through untouched at
`opportunityPayload.ts:264,293-294,330-335`.

Integer/range: server `.int().nonnegative()` at `validation.ts:268,272-273,316`
and `estimatedMinutes: z.number().int().positive()` at `:215`; the client uses
bare `parseInt`/`parseFloat` with no guard, so `-5`, `1.5`, and non-numeric text
all pass.

Phone: `contactPhone` is a free-text `SmartInput`, never validated, sent raw at
`opportunityPayload.ts:269`; the server checks only `z.string()`
(`validation.ts:354`).

---

## 6. HIGH — sanitisation

**`dangerouslySetInnerHTML`, 11 sites. Only one carries user/API text, and it is
guarded:**

| Site | Guard |
|---|---|
| `features/jobs/components/detail/DescriptionSection.tsx:30` | **`sanitizeHtml()`** from `@repo/ui/utils/sanitize` (imported `:2`, applied `:18`) |
| `app/layout.tsx:131`, `features/shell/InlineScript.tsx:20` | static inline script |
| `jobs/[slug]/page.tsx:301`, `govt/[slug]/page.tsx:181,182`, `(public)/page.tsx:113`, `drives/walk-in/[city]/page.tsx:162`, `OpportunitiesFeedClient.tsx:331` | `JSON.stringify` of generated JSON-LD |
| `ui/chart.tsx:81` | chart internals |

**No unguarded user-text HTML sink exists.**

**But 12 raw `href` sinks bypass `toSafeOutboundUrl`**, which exists and is
correct (`lib/utils/safeOutboundUrl.ts:16`, `new URL()` + protocol check at
`:26-29`) but has only 5 call sites in 4 files:

- `admin/opportunities/columns.tsx:318,334` — `opp.applyLink || opp.sourceLink`
- `admin/opportunities/components/list/AdminOpportunityPreviewModal.tsx:111`
- `admin/discovery/DiscoveryWorkspace.tsx:371` — `job.apply_link`
- `admin/discovery/modals/PayloadModal.tsx:89`, `modals/DryRunModal.tsx:90`
- `admin/discovery/components/DiscoveredJobsTab.tsx:254`, `ProcessedJobsTab.tsx:376`, `OpportunityQueueTab.tsx:130`
- `admin/components/AdminResourcesClient.tsx:896` — `item.url`
- `admin/components/TelegramBroadcastPanel.tsx:228`

`formUtils.ts:308-315` `extractDomain` does use `new URL()` — correct.

**`includes()`-based hostname checks: none remain.** All four sites use
`new URL()` then `hostname ===` / `.endsWith('.')`:
`features/companies/utils/companySlugger.ts:62`,
`features/contribute/components/ContributeSheet.tsx:49`,
`app/api/colleges/search/route.ts:39`, `lib/config/hostResolution.ts:35`.
This rule is being followed — worth keeping.

---

## 7. HIGH — type contract drift

Local interfaces shadowing `packages/types`:

| Local | Site | vs package |
|---|---|---|
| `OpportunityDimensions` | `formUtils.ts:18-28` | **contradictory** — `category?: string \| null` widened from the enum; `employmentTypes?: Array<string\|null\|undefined> \| string \| null` contradicts `EmploymentType[]` (a `string` is impossible) |
| `DriveDetailsLike` | `formUtils.ts:30-40` | **narrower** — 9 fields; drops lat/lng/city/landmark which the server added at `validation.ts:341-346` |
| `ParsedJob` | `formUtils.ts:107-271` | no counterpart; carries **8 `any` fields** (`:219-227`, `:236-242`) |
| `TimelineEvent.eventType` | `formUtils.ts:285-293` | structurally identical to `enums.ts:212-221`, redeclared as a bare union instead of imported |
| `DuplicateOpportunity.status` | `formUtils.ts:273-283` | `string` vs the `OpportunityStatus` enum — contradictory |
| `WorkMode` / `SalaryPeriod` | `opportunityPayload.ts:3-4` | structurally identical to `enums.ts:179-188`, redeclared |
| `appMethod` | `opportunityPayload.ts:115` | third copy, also at `opportunityFormSchema.ts:18` and `validation.ts:213` |
| `OpportunityFormValues` vs `OpportunityFormData` | `opportunityPayload.ts:6-119` vs `opportunityFormSchema.ts:159` | two independent declarations of the same form, neither derived from the other |

**Casts that exist because the type is already known to be wrong:**

- `useOpportunityForm.ts:882-883,942-944,1081-1095,1180,1226` — `(data as any)`
  for `companyLogoUrl`, `slug`, `customSlug`, `skillTests`, `examStages`,
  `allowances`, `applicationDetails`. **All of these do exist on
  `packages/types`**, so the cast is the type being wrong, not the data.
- `useOpportunityForm.ts:370` — `(opp as unknown as Record<string, unknown>).employmentType`
- `formUtils.ts:44-45,52`, `searchUtils.ts:84`, `walkinMapUtils.ts:48,72,93,113,143,826`, `filterOpportunities.ts:60` — the same `as unknown as Record<string, unknown>` pattern
- `useProfileUpdateHandlers.ts:20` — `form: any` for the whole profile form
- `lib/api/admin.ts:140,189` — `createOpportunity: (data: any)`,
  `updateOpportunity: (id, data: any)`. **The entire opportunity write path is
  `any` end to end.**

---

## 8. HIGH — untyped boundaries

- `lib/api/server-client.ts:112` — `(text ? JSON.parse(text) : null) as T`.
  **Every server response in the app passes through this single unguarded
  assertion.**
- `opportunityPayload.ts:191` — `JSON.parse(trimmed) as T` on a generic never
  supplied and never validated (see §2)
- `OpportunityFormPage.tsx:146,180` — `applyJsonData(JSON.parse(text))`; a bare
  `any` flows straight into the form state machine
- `lib/api/core.ts:680` — bare `JSON.parse(text)`
- `useOpportunityForm.ts:279,339,669,764`, `useOpportunityFormHandlers.ts:143-144`,
  `useAdminOpportunityActions.ts:170`, `FeedbackClient.tsx:136`
- **localStorage, all `JSON.parse(...) as T` with no runtime shape check:**
  `AuthContext.tsx:61`, `AdminContext.tsx:48,82`,
  `cache/opportunitiesFeedCache.ts:89,103,117`, `cache/unreadCount.ts:48,61`,
  `cache/actionQueue.ts:46`, `cache/recentViewed.ts:18`,
  `useSavedJobs.ts:12,66`, `useFirebaseTracker.ts:20`,
  `ContributeSheet.tsx:97,107`, `RecentlyViewedRow.tsx:31,56`,
  `useProfileFilters.ts:72`, `useUnreadNotifications.ts:44`

**Contract mismatch at the event boundary:** `packages/api-client/src/admin/opportunities.ts:81`
types events as `{ id, type, note?, createdAt }[]`, but the form reads
`event.eventDate`, `event.title`, `event.notes`, `event.sourceLink`,
`event.eventType` (`useOpportunityForm.ts:673-676,718-722`) — **six fields the
asserted type does not have.** `addEvent`/`updateEvent` return `unknown`
(`:86,92`).

---

## 9. HIGH — enum and constant drift

- **`typeParamToEnum` is defined twice and has drifted.**
  `formUtils.ts:317-324` maps `employment`, `walk_in`, `government`, `govt`,
  `government-job`. `listUtils.ts:5-11` maps **none of those** — only
  `job/jobs`, `internship/internships`, `walk-in/walkin/walkins/walk-ins`. Two
  call sites on different code paths resolve the same query param differently.
- `WorkMode` in 4 places: `opportunityPayload.ts:3`,
  `opportunityFormSchema.ts:16`, `formUtils.ts:494`, `enums.ts:179-183`
- `SalaryPeriod` in 4: `opportunityPayload.ts:4`,
  `opportunityFormSchema.ts:17`, `formUtils.ts:481`, `enums.ts:185-188`
- `adminOpportunitySearchParams.ts:37` restates `LinkHealth`
  (`enums.ts:239-243`) instead of importing it
- `statuses.tsx:21-37` types `StatusOption.value: string`, and `LIVE`,
  `REJECTED`, `DELETED` (`:24,26,28`) are **not** `OpportunityStatus` values
  (`enums.ts:164-169`) but are passed as statuses to the API
- `STATUS_VARIANT` (`:39-50`) is keyed on strings including `VERIFIED`,
  `PENDING`, `PENDING_REVIEW`, which are in no status enum
- `kindToAdminCategory` (`formUtils.ts:91-95`) returns lowercase
  `'job' | 'internship' | 'walk-in'`, matching `validation.ts:222`'s inline
  `z.enum([...])`. Same set, two files, no shared constant

---

## 10. HIGH — optimistic updates

No `useOptimistic`, no TanStack `setQueryData` anywhere in `apps/web/src`.

- **`useSavedJobs.ts:165-186` — no rollback.** `setSharedSavedJobsMap(updated)`
  at `:175` flips the UI first; the Firebase write at `:181` sits in a `try`
  whose `catch` at `:182-184` is an **empty block** commented "Local state
  remains intact if remote sync fails temporarily". A rejected write leaves the
  UI showing server-rejected state indefinitely.
- `useFirebaseTracker.ts:152,171` — same local-first pattern.
- **`HelpfulButton.tsx:21-38` — correct.** Optimistic set at `:25-28`,
  `setOptimistic(null)` restores prior state in the `catch` at `:33`. **The only
  rollback in the app.**
- `AppSidebar.tsx:85` — `isAuthed` optimistically `true` before mount (nav only)
- `drives/walk-in/[city]/page.tsx:119` — renders optimistically when the CDN is
  down

---

## 11. HIGH — form accessibility

**Zero `aria-invalid`, zero `aria-describedby`, zero `role="alert"` anywhere
under `features/admin`.** Grep returns 5 hits: 4 `htmlFor` in the Smart*
primitives, 1 `aria-label` at `GovernmentJobSection.tsx:181`.

- `ui/Field.tsx:27-30` renders `description` as a bare `<div>` with **no `id`**;
  `:33-37` renders `error` as a bare `<div>` with **no `id`**.
  `SmartInput.tsx:33-40` passes only `id` to the `<input>`, so help and error
  text are never programmatically associated with the control that produces
  them.
- `SmartInput.tsx:37` forwards `required` to the DOM attribute.
  `ApplyLinkSection.tsx:28,36` pass `required={showUrlError}` — so the required
  marker appears only after a failed submit, and is applied to **both** fields
  even though only one is required (`:22`).
- The form's only error display is `ApplyLinkSection.tsx:42-47` — a sibling
  `<ErrorMessage>` with no `id`, no `role="alert"`, and no link to either input.
- `TimelineSection.tsx` uses `aria-label` on its four inputs rather than
  `<label>`.
- **Submit buttons that never disable:** `AdminResourcesClient.tsx:615`,
  `PushNotificationClient.tsx:84`, `RoomsClient.tsx:433`, `PostJobForm.tsx:144`,
  `ContributeSheet.tsx:935`, `LoginForm.tsx:407,427,459`. The opportunity form
  **does** disable correctly (`OpportunityFormPage.tsx:310-318`), but the
  underlying guard (`useOpportunityForm.ts:686`) runs only on click, so the
  button is clickable with an empty date/title.
- `SmartInput.tsx:2` imports `cn` and never uses it. `SmartSelect.tsx:67`
  computes `cn(!value && "", className)` — `!value && ""` is always `""`, so
  `cn` is a pass-through no-op. Both import from `@repo/ui/utils/cn` while the
  rest of admin imports `@/ui/cn` — **two `cn` homes**.
- `features/admin/ui/InlineEditableField.tsx` is a 5-line comment-only file.

---

## Clean — keep as-is

- No `includes()`-based hostname checks remain anywhere
- `DescriptionSection` is the only user-text HTML sink and it is sanitised
- `@ts-ignore` / `@ts-expect-error`: **zero** in `apps/web/src`
- `filterOpportunities` exported signatures unchanged by the duplication pass;
  consumers confirmed at `useCategoryPageState.ts:17-20`,
  `useOpportunitiesFeed.ts:20`, `CategoryPageView.tsx:7`,
  `OpportunitiesFeedClient.tsx:16`
