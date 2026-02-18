# TCS NQT + Notifications Priority Plan

## Goal
- Make FresherFlow the fastest place for students to track TCS NQT updates.
- Ensure every relevant user gets in-app alerts when matching opportunities are published.

## Why alerts looked empty
- New job alerts were strict (eligibility + score threshold), so many users got filtered out.
- Alerts only trigger at publish time; old posts do not auto-backfill.
- Users without explicit alert preference rows were previously skipped in cron-based flows.
- External push (browser/device push popups) is not implemented yet; current system is in-app alerts feed.

## TCS NQT content strategy
- Treat TCS NQT as a timeline-driven hiring campaign.
- Maintain one master listing and add timeline events instead of duplicate posts.
- Event types to use:
  - `NOTIFICATION`
  - `REG_START`
  - `REG_END`
  - `EXAM_DATE`
  - `RESULT`
  - `INTERVIEW`
  - `DOC_VERIFICATION`

## UX requirements for this campaign
- Show key dates at top (registration open/close, test date).
- Add a strong “Track Updates” CTA on the listing.
- Pin this listing in dashboard sections for active users.
- Update OG card copy with registration last date to boost social CTR.

## Backend changes (now)
- Broaden reminder delivery for timeline events:
  - `NOTIFICATION`, `REG_START`, `REG_END`, `EXAM_DATE`, `RESULT` bypass strict profile filtering.
- Keep strict filtering for normal role-specific event types.
- Add operator controls:
  - `POST /api/admin/system/alerts/run` (manual alert cycle trigger)
  - `POST /api/admin/system/alerts/backfill-new-jobs?hours=72&limit=100` (catch up missed NEW_JOB alerts)

## Immediate operations runbook
1. Publish/update TCS NQT master listing.
2. Add timeline events with exact official dates.
3. Run manual cycle: `POST /api/admin/system/alerts/run`.
4. Run catch-up for recent jobs: `POST /api/admin/system/alerts/backfill-new-jobs`.
5. Verify `/alerts` feed as a normal user account.

## Success checks
- Alert feed should no longer be empty for active users.
- Event reminder alerts should appear for TCS NQT milestones.
- New-job alerts should appear for relevant profiles even on low-confidence matches (limited fallback).

## Next step after reliability
- Implement true web push notifications (service-worker subscription + push delivery worker).
- Keep in-app feed as source of truth and push as a channel on top.
























Use this model:

Type: DRIVE (new category)
SubType: NQT
Brand: TCS
Lifecycle: Notification → Registration Open → Registration Close → Test Window → Results → Interview Phases
That avoids forcing it into Job/Internship/Walk-in.

What to build now (priority order)
Launch “Drive” as first-class content type
Add DRIVE in backend enum + filters + tabs.
Keep Job/Internship/Walk-in unchanged.
Show “Drive” cards with timeline, not salary-first layout.
TCS NQT as one master entity + events
One parent record: TCS All India NQT Hiring 2026
Child events:
REG_START = 18 Feb 2026
REG_END = 20 Mar 2026
EXAM_DATE = 10 Mar 2026 onwards
later: result/interview updates
No duplicate repost spam; update timeline events only.
Notification reliability (must-fix)
In-app: send reminders at T-7, T-3, T-1, same-day.
Banner on dashboard when a followed drive has upcoming event.
“Track this Drive” button on detail page.
Add admin “Run Alerts Now” button (manual trigger).
Dedicated Drive detail page UX
Sections:
Key dates (big)
Cadres/CTC table (Prime/Digital)
Eligibility (batch 2026/2025/2024, exp 0–2)
Official links (Apply/Login/Register)
Step-by-step application process
Helpdesk + fraud warning
CTA sticky: Track Updates + Go to Official Portal.
OG image for campaign shares
Template text:
TCS NQT 2026
Last Date: 20 Mar 2026
Test: 10 Mar 2026 onwards
Auto-generate from event dates so card stays updated.
Naming recommendation in app
Use label:

“Campus Drive” (user-friendly)
internal type: DRIVE
badge: TCS NQT
Immediate next implementation slice (today)
Add DRIVE type support (API + UI filters).
Create one seeded TCS NQT drive with timeline events.
Add Track Drive and event reminder alerts.
Add campaign OG card with dynamic last date.
If you want, I’ll start this now in that exact order and keep commits grouped by feature.