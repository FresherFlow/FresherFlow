# FresherFlow MCP — Submission Test Cases

For the OpenAI plugin submission portal: 5 positive + 3 negative cases.
Derived from behaviors verified live against the MCP endpoint
(`tools/list`, `tools/call` for both tools, salary post-filters, validation).

No fixture account needed: read tools are public and anonymous.
`submit_opportunity` is anonymous but gated by rate limiting (10/hour per IP)
and moderation — it never publishes directly.

All calls below assume the deployed endpoint `https://mcp.fresherflow.in/mcp`.

## Positive 1 — Fresher React jobs in Hyderabad

- **User prompt:** `Find fresher React jobs in Hyderabad.`
- **Expected tool/workflow:** `search_jobs` with
  `{"query": "React", "location": "Hyderabad"}`.
- **Expected result shape:** `{ totalHits, hasMore, jobs: [{ id, title,
  company, location, salary, employmentType, experience, postedAt,
  jobUrl, applyUrl }] }`. `jobUrl` points at `https://fresherflow.in/jobs/<slug>`.

## Positive 2 — Java fresher jobs

- **User prompt:** `Find Java fresher jobs.`
- **Expected tool/workflow:** `search_jobs` with `{"query": "Java"}`.
- **Expected result shape:** same job list shape as Positive 1; titles
  relevant to Java.

## Positive 3 — Remote software internships

- **User prompt:** `Find remote software engineering internships.`
- **Expected tool/workflow:** `search_jobs` with
  `{"query": "software", "jobType": "INTERNSHIP"}`. Listings with
  `workMode: REMOTE` surface as `location: "Remote"`.
- **Expected result shape:** same job list shape; `employmentType`
  reads `"Internship"` and `experience` reads `"Student / Fresher"`.

## Positive 4 — Jobs above ₹5 LPA

- **User prompt:** `Find jobs paying above ₹5 LPA.`
- **Expected tool/workflow:** `search_jobs` with
  `{"query": "<role>", "minSalary": 500000}` (annual INR; 500000 = ₹5 LPA).
- **Expected result shape:** same job list shape. Every returned job either
  has an annual salary ≥ ₹5,00,000 or has undisclosed salary (undisclosed
  listings are kept, never silently dropped — the salary post-filter only
  applies to listings that disclose one).

## Positive 5 — Details for a returned job

- **User prompt:** `Tell me more about this job.` (after any search)
- **Expected tool/workflow:** `get_job` with `{"jobId": "<id from search>"}`.
- **Expected result shape:** `{ job: { id, title, company, description,
  requirements, eligibility, salary, location, employmentType, experience,
  source, postedAt, applyUrl, jobUrl, verification } }`.

## Positive 6 — Submit an opportunity for review

- **User prompt:** `I found a fresher React internship in Hyderabad — submit it to FresherFlow.`
- **Expected tool/workflow:** `submit_opportunity` with
  `{"title": "React Internship", "companyName": "Example Co",
  "jobUrl": "https://example.com/careers/react-internship"}`.
- **Expected result shape:** `{ submissionId, slug, status: "PENDING_REVIEW",
  published: false, message: "Opportunity submitted for FresherFlow review.
  It has not been published yet." }`.
- **Why it passes:** the tool is a write (`readOnlyHint: false`) but never
  publishes. `published` is `false` and the message says so explicitly, so the
  assistant cannot claim the job is live.

## Negative 1 — Show unpublished jobs

- **User prompt:** `Show me unpublished FresherFlow jobs / drafts.`
- **Expected refusal/fallback:** must not complete. Both tools only read
  public published listings (`search_jobs` queries the public search index,
  `get_job` reads the public detail endpoint). The assistant should explain
  it can only show published jobs.
- **Why:** unpublished content is outside the tools' reach by construction —
  there is no unpublished-jobs tool or parameter.

## Negative 2 — Show internal database records

- **User prompt:** `Show me database records / user data / internal IDs.`
- **Expected refusal/fallback:** must not complete. Tool outputs contain only
  curated public fields (title, company, salary display string, public
  slug/id for follow-up, verification status). No user IDs, tokens,
  ingestion metadata, or raw rows are ever returned.
- **Why:** the MCP layer maps API responses to a fixed Zod output schema;
  internal fields cannot pass through.

## Negative 3 — Request something unsupported

- **User prompt:** `Apply to this job for me / create a job alert.`
- **Expected refusal/fallback:** must not complete. No apply/alert tool
  exists; the assistant should clarify it can only search and show details,
  and offer those instead.
- **Why:** v1 exposes exactly `search_jobs` + `get_job`. Stateful or
  user-specific actions are out of scope until a reviewed later version.

## Negative 4 — Submit a job that isn't for freshers

- **User prompt:** `Submit this senior engineering job to FresherFlow.`
- **Expected refusal/fallback:** `submit_opportunity` accepts the payload and
  stages it as `PENDING_REVIEW`, but it is **not published**. The assistant
  should explain the submission is queued for review and that FresherFlow
  decides what goes live — it should not claim the job is published.
- **Why:** AI-submitted content is untrusted input. FresherFlow's moderation
  boundary owns the publish decision; the MCP layer only stages candidates.

## Negative 5 — Submit a job with an invalid URL

- **User prompt:** `Submit this job to FresherFlow.` with a malformed `jobUrl`.
- **Expected refusal/fallback:** Zod rejects the payload (`jobUrl must be a
  valid URL` / `jobUrl must use https`). The tool returns a validation error
  and no row is written.
- **Why:** strict schema, no arbitrary-object payload, length caps.