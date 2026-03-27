# App Next Plan

Last updated: 2026-03-27

## Goal

This document captures the next practical work for FresherFlow after the recent stabilization, auth, worker, SEO, and admin fixes.

## Current State

The platform now has:
- stable public web routing across `fresherflow.in`, `app.fresherflow.in`, and `admin.fresherflow.in`
- API and worker separation for async work
- admin social and notification controls
- Telegram/social observability surfaces
- improved SEO and JobPosting structured data
- richer description rendering for opportunity pages

The next phase should focus less on firefighting and more on reliability, quality, and expansion readiness.

## Priority Order

1. Reliability and observability
2. Data quality and admin efficiency
3. Search and personalization quality
4. Growth loops and retention
5. New content verticals, including government jobs

## Phase 1: Reliability And Observability

### Objectives

- reduce silent failures
- make worker and delivery pipelines easier to debug
- move key production checks from reactive to proactive

### Work

- add explicit queued state for Telegram broadcasts and similar async jobs
- improve worker dashboards for queue depth, retries, and stuck jobs
- add error summaries for social, email, push, and Telegram delivery
- add more health surfaces for ingestion, cache invalidation, and sitemap generation
- add smoke tests for login, publish flow, and account pages
- add structured deploy checklists for web, API, and worker together

### Done When

- admin can see if a publish event was queued, sent, failed, or skipped
- common production failures can be diagnosed without digging through raw logs
- deploys can be verified in a few minutes with a repeatable checklist

## Phase 2: Data Quality And Admin Speed

### Objectives

- make opportunity quality more consistent
- reduce manual cleanup
- make admin entry safer and faster

### Work

- strengthen description formatting guidance and preview in admin
- improve company logo and metadata normalization
- add required-field checks by opportunity type before publish
- improve duplicate detection using source URL, apply URL, title, company, and date signals
- add admin warnings for stale links, missing salary, and weak location data
- add better bulk edit tools for category, salary, passout years, and expiry

### Done When

- fewer posts need cleanup after publish
- admin can see obvious metadata gaps before publishing
- duplicate and low-quality listings are caught earlier

## Phase 3: Search, Eligibility, And Feed Quality

### Objectives

- improve relevance and trust
- avoid misleading scores and noisy recommendations

### Work

- refine match score logic and explain score breakdown to users
- improve search filters for location, batch, work mode, company, and freshness
- improve related-jobs logic and dedupe similar listings in feeds
- add quality ranking for verified, fresh, and high-signal jobs
- improve account pages like saved jobs, actions, and alerts with clearer empty states

### Done When

- users trust the eligibility snapshot more
- search feels sharper and less repetitive
- key account pages are useful enough to revisit regularly

## Phase 4: Growth And Retention

### Objectives

- turn traffic into returning users
- increase direct and referral growth

### Work

- improve onboarding after signup and profile completion
- add profile-completion nudges tied to eligibility usefulness
- improve referral surfaces and friend-invite flows
- improve saved-job reminders and closing-soon alerts
- tighten SEO around role, company, and city pages
- add more structured growth reporting around install, signup, save, and apply

### Done When

- profile completion goes up
- returning sessions improve
- alerts and referrals drive measurable repeat traffic

## Phase 5: Content Expansion

### Objectives

- support more opportunity types without degrading trust

### Work

- government jobs plan and pilot
- apprenticeship and exam-driven opportunity support
- stronger event and deadline timeline support
- better source governance by content type

### Done When

- each new category has a clear operational model
- expansion does not lower quality of the main fresher feed

## Cross-Cutting Guardrails

- do not add new content categories without a source, verification, and expiry plan
- do not expand alerts without observability and dedupe protection
- do not fake salary, address, or eligibility data just to satisfy SEO tools
- prefer admin warnings and workflow controls over silent assumptions
- keep async side effects in worker flows, not inline in request handlers

## Suggested Immediate Sequence

1. Add queued status and better observability for Telegram and social posting
2. Improve admin data-quality warnings and publish validation
3. Tighten search and eligibility UX
4. Pilot government jobs with strict scope and manual review gates

