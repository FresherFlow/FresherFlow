# Government Jobs Plan

Last updated: 2026-03-27

## Goal

If FresherFlow starts posting government jobs, the platform needs a stricter operating model than private-sector jobs. Government recruitment is slower, more document-heavy, more correction-prone, and often includes multiple dates, category rules, fee rules, and official notices that change over time.

This document defines how to handle government jobs safely and realistically.

## Why Government Jobs Are Hard

- one recruitment item can have many deadlines and sub-events
- eligibility may depend on age, category, domicile, attempts, and certificate status
- source notices may be PDFs, scanned images, or changing portals
- applications often reopen, extend, or issue corrigenda
- location can mean posting zone, exam city, training center, or cadre, not just job city
- salary may be pay level, pay band, stipend, grade pay, or vague official language
- many users care more about dates and documents than about a simple apply link

## Product Positioning

FresherFlow should treat government jobs as a separate content model with stricter trust standards.

The platform should:
- surface verified, simplified, fresher-relevant government opportunities
- clearly distinguish them from private jobs and internships
- link users to official notices and application portals
- explain important dates and key eligibility in plain language

The platform should not:
- pretend to fully replace the official notification
- over-simplify category or age rules into a misleading “eligible / not eligible” badge
- auto-publish raw scraped government data without review

## Rollout Strategy

## Phase 1: Limited Pilot

Start with only high-signal categories:
- apprentice posts
- trainee and junior government roles
- public sector unit fresher jobs
- bank and rail entry-level roles
- state and central recruitment with clean official notices

Do not start with:
- highly complex multi-post notifications with dozens of roles
- defense posts with intricate medical/physical criteria
- highly scanned or OCR-unfriendly documents
- posts where the official source is unstable or ambiguous

## Data Model Changes Needed

Government jobs should not be forced into the exact same shape as private jobs.

We should add fields for:
- official notification URL
- official application URL
- conducting body
- recruitment board or department
- post name
- advertisement number or notification number
- application start date
- application end date
- correction window
- fee payment deadline
- exam date
- admit card date
- result date
- age min and max
- age relaxation notes
- category-wise reservation notes
- fee details
- official pay text
- pay level or scale
- posting scope
- exam mode
- selection stages
- required documents
- source verification status
- corrigendum or revision marker

Some of this can reuse `OpportunityEvent`, but government jobs likely need a stronger event and notice model.

## Taxonomy Plan

Government jobs should carry a dedicated classification layer.

At minimum:
- sector: `GOVERNMENT`
- body type: `CENTRAL`, `STATE`, `PSU`, `BANK`, `RAILWAY`, `DEFENSE`, `UNIVERSITY`, `COURT`, `PUBLIC_BOARD`
- recruitment type: `DIRECT`, `APPRENTICE`, `TRAINEE`, `EXAM`, `CONTRACT`

This classification should drive:
- UI badges
- filters
- SEO
- admin workflows
- alert logic

## Source Governance

Each government listing must have source confidence attached to it.

Accepted sources:
- official department sites
- official PDF notifications
- official application portals
- official press releases

Secondary sources may help discovery, but should not be publish sources:
- news portals
- Telegram channels
- coaching sites
- blog posts
- aggregator sites

Rule:
- do not publish a government job without at least one official source

## Ingestion Strategy

Government jobs need a different ingestion flow than regular private jobs.

Recommended pipeline:
1. discover opportunity from trusted source list or monitored portals
2. fetch official page and official PDF if present
3. extract normalized fields
4. mark uncertain fields as uncertain, not as guessed
5. create draft only
6. require admin review before publish

For PDFs:
- support PDF parsing as a first-class ingestion source
- retain raw extracted text for auditability
- preserve notification number and source URL
- store parse confidence if OCR is involved

## Verification Rules

Before publishing a government job, verify:
- official source exists and is reachable
- post title matches the notice
- important dates match the notice
- application URL matches the official source
- recruitment body is correct
- vacancy or post family is clearly identified
- pay or stipend text is copied accurately if available
- category or age relaxation rules are not simplified incorrectly

If any of the above is unclear:
- keep as draft
- require human review

## Admin Workflow

Government job admin flow should be stricter than the normal create form.

Recommended admin steps:
1. source intake
2. official notice verification
3. structured field extraction
4. date review
5. eligibility caution review
6. publish
7. follow-up monitoring for corrigenda or extensions

Admin UI should show:
- source links
- official notification number
- extracted dates
- confidence flags
- missing critical fields
- revision history

## Eligibility Handling

Do not reuse the normal “match score” model as-is for government jobs.

For government jobs, eligibility should be split into:
- definitely matched fields
- definitely missing fields
- cannot be determined automatically

Examples of “cannot be determined automatically”:
- category reservation
- domicile rules
- age relaxation
- experience certificate specifics
- language requirements
- physical standards
- attempt limits
- community certificate timing

UI wording should prefer:
- `Likely eligible`
- `Needs manual check`
- `Official notice required`

Avoid:
- `100% match`
- `Eligible` when major government-specific rules are unknown

## Dates And Timeline Handling

Government jobs need stronger timeline handling than regular listings.

Each listing should support:
- application open
- application close
- fee deadline
- correction window
- exam date
- admit card
- answer key
- result
- document verification
- interview
- joining or reporting

Rules:
- show upcoming date first
- keep all dates visible in a timeline
- allow date revisions without losing previous history
- mark revised dates clearly

## Expiry Rules

Government jobs should not expire the same way as private jobs.

Suggested logic:
- active until official application end date
- if exam/result stages continue, page may remain indexed as an informational page but not as “apply now”
- after recruitment closes, mark as closed rather than deleting context
- preserve historical timeline and official links

## SEO Plan

Government job pages should use dedicated metadata patterns.

Need:
- separate title templates
- official body in title and description
- notification number where useful
- valid `JobPosting` only when the page truly represents an active application opportunity

If the page becomes post-deadline informational content:
- reconsider whether `JobPosting` is still appropriate
- move toward article or informational structured data when necessary

## Alerts Strategy

Government jobs should have alert controls tuned carefully.

Useful alerts:
- new relevant official opening
- application deadline approaching
- correction window open
- admit card released
- exam date announced
- result announced

Avoid:
- noisy repeated reminders for every minor notice update

Use dedupe keys tied to:
- opportunity id
- event type
- official revision id or date

## Social Posting Strategy

Government jobs should not auto-post exactly like private jobs.

Recommended:
- no blind auto-posting during initial rollout
- require verified status before social push
- prefer concise, factual captions
- always include official source link
- never exaggerate vacancy or salary

## Risk Controls

Main risks:
- wrong dates
- wrong source
- misleading eligibility
- old notices treated as fresh opportunities
- unofficial links replacing official portals

Mitigations:
- draft-only ingestion
- review-required publish flow
- revision history
- source confidence tags
- explicit “official notice required” messaging

## Recommended Build Sequence

1. Add government-job taxonomy and draft-only source policy
2. Add official source fields and notification number support
3. Improve timeline model for multi-date recruitment flows
4. Add admin review checklist and confidence warnings
5. Pilot with PSU, banking, and apprentice roles only
6. Add user-facing government filters and cautionary eligibility UI
7. Expand only after quality review

## Launch Readiness Checklist

- official-source-only publish rule exists
- draft workflow is in place
- event timeline supports multiple recruitment dates
- eligibility UI can say “manual check required”
- admin can see source confidence and missing fields
- expiry/closure handling is correct
- social and alert rules are government-specific
- docs and ops checklists exist

## Recommendation

Government jobs are worth supporting, but only as a deliberate product track, not as a quick category toggle.

The safest path is:
- limited pilot
- stricter review
- better timeline support
- more conservative eligibility language

If we do that, government jobs can become a trust-building feature instead of a support burden.

