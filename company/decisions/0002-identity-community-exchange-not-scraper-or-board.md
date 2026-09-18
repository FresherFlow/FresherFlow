# 0002 — FresherFlow is a community exchange, not a scraper or a job board

- **Status:** proposed
- **Date:** 2026-09-16
- **Owner:** repository owner (needs a human decision, see Review)
- **Supersedes:** none (corrects the framing in `ROADMAP.md` and `company/README.md`; it does not replace a numbered decision)
- **Superseded by:** none

## Context

Two documents currently define FresherFlow's identity in a way that no longer
matches what the codebase is doing:

- `ROADMAP.md:3-5`: "The most reliable source of entry-level jobs in India —
  jobs fetched directly from company career systems" and "The competitive moat
  is not the product. It's the data — a continuously maintained **Company → ATS
  Registry**."
- `company/README.md:16-19`: same framing ("Jobs come from company career pages
  and ATS systems directly... The moat is not the product. It is a continuously
  maintained Company → ATS Registry").

What the worktree actually shows (verified 2026-09-16):

- The current work is a community layer: `apps/web/src/app/(public)/community/`,
  `apps/web/src/features/community/`, `apps/api/src/routes/community/` are
  untracked/new, with `apps/api/src/infrastructure/services/community.service.ts`
  (2,193 lines) providing real Postgres-backed comments, votes, job **signals**
  (APPLIED / INTERVIEWED / OFFER / CLOSED / INCORRECT —
  `community.service.ts:175-182`), guest + member `submitJob`
  (`community.service.ts:664`), and reports.
- `apps/api/src/infrastructure/services/fresherNeeds.service.ts` adds the
  referral request board, salary reports (offer transparency with aggregate
  stats), and per-company hubs (drives + interview experiences + salaries +
  trust signals).
- MCP and ingest routes (`apps/mcp/`, `apps/api/src/routes/ingest/`,
  `mcpSubmit.ts`) accept jobs from community members and tools — supply comes
  from people, not from us monitoring thousands of ATS sites.
- Recent commits walked away from scraping infrastructure as the product:
  "remove LLM from job processor", "reject aggregator/govt/listing URLs as
  jobs", "push passed jobs to Google Sheet", "add topic boards and discussion,
  community landing, and post-job flow". The discovery/processor scripts still
  exist but as candidate feeders into curation, not as the moat.
- The landing page has stated the truth all along:
  `apps/web/src/app/(public)/page.tsx:19` — "FresherFlow — Jobs, powered by
  freshers"; `:21` — "shared by the community, linked straight to official
  pages."

The trigger for this decision: an agent session repeatedly re-derived a
"job board" and then an "ATS scraping engine" identity from `ROADMAP.md` and
`company/README.md`, and benchmarked the product against Naukri's listing
volume. Both framings are wrong for what is being built, and the monitoring-
everything-at-scale approach was explicitly rejected by the owner as
infeasible for a team at our size.

## Decision

Not yet made — proposed by an agent. Recommendation below.

**Recommendation:** FresherFlow is a **community exchange for entry-level
hiring**: freshers share real jobs with each other (official links), verify
them together (signals, reports), and help each other get hired (referrals,
real salary reports, interview experiences, per-company hubs). The
discovery/ATS pipeline is demoted to a **candidate feeder** that submits into
the community/curation flow. The ATS Registry is not the moat; the
**community trust layer** is — users report a dead link the moment they hit
it, which no scraper can replicate at our scale.

Identity one-liner: *freshers share real jobs, verify them together, and help
each other get hired.*

## Options considered

| Option | Cost | Why not (for the losers) |
|---|---|---|
| A. Keep the ATS-Registry moat framing | Requires building and operating monitoring infra across hundreds→thousands of ATS systems to be honest; owner judged this infeasible at our size ("tier-4 app" resources) | |
| B. Reframe as a general job board | Puts us in direct inventory competition with Naukri/LinkedIn, whose business model is listing volume we cannot and should not match | |
| C. Community exchange identity, pipeline as feeder (recommended) | Requires community health (seeding, moderation, responsiveness) to be treated as core product work, not a side feature | — |

## Consequences

- `ROADMAP.md` and `company/README.md` must be rewritten to match (the
  enforcement section lists the exact spots).
- Success metrics change from inventory metrics (jobs count, company coverage)
  to community metrics: posts/week, referral responses, salary reports,
  signals per job, report-to-fix latency.
- Comparisons to Naukri's 1-lakh listings become a category error to be
  corrected in docs and copy: we compete on trust, freshness, and
  peer-help, not volume.
- The discovery pipeline stays but its roadmap items (1,000+ companies,
  native ATS fetchers) become feeder capacity work, not the strategic core.
- Reversal cost is low: this is a documentation/decision change; no code moves.

## How it will be enforced

After acceptance, these files must agree with this decision:

```bash
grep -rn "most reliable source\|ATS Registry\|moat is not the product" ROADMAP.md company/README.md
```

must return no unqualified claims that the ATS Registry is the moat.
`company/README.md` "What we do" and `ROADMAP.md` vision/Phase-1 framing get
rewritten to the community-exchange identity with the pipeline as feeder.
Landing copy (`page.tsx:19,21`) already agrees.

## Review

Needs a human decision before any guide file is edited; an agent may not mark
its own proposal accepted. Reopen if the owner re-commits to scraping-scale
coverage as the strategic core, or if community supply proves unable to
sustain the feed without the pipeline taking the leading role.
