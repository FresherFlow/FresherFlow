# Listing templates (reference)

Saved verbatim so the templates live in the repo instead of in a chat window.

> **Two dialects — read this first.**
> These three payloads are the **admin form's "Paste JSON payload"** format. It is
> not the format the API writes. The admin UI converts it before saving:
>
> | Admin paste JSON | API `create_listing.payload` |
> |---|---|
> | `"type": "JOB" / "INTERNSHIP" / "WALKIN"` | `"category": "job" / "internship" / "walk-in"` |
> | `walkInDetails: { ... }` | `driveDetails: { ... }` |
> | `salaryAmount` | `salaryRange`, or `stipend` for internships |
> | `allowedPassoutYears` | `allowedPassoutYears` (same) |
>
> `opportunitySchema` (`apps/api/src/utils/validation.ts`) is a **closed**
> `z.object`, so the admin-only keys are dropped without an error. Through MCP,
> always start from `get_listing_template`, which returns the API-shaped payload.

---

## Important field meaning

- `allowedDegrees`: qualification level bucket only (`TENTH`, `INTER`, `DIPLOMA`, `DEGREE`, `PG`)
- `allowedCourses`: actual degree/specialization names (`B.Tech`, `B.Sc`, `Computer Science`, `Mechanical`)
- `allowedSpecializations`: branch/specialization names (`Computer Science`, `Information Technology`, `Mechanical`)
- `allowedPassoutYears`: exact eligible years, e.g. `[2023, 2024, 2025]`
- `experienceMin` / `experienceMax`: separate eligibility rule, not education

Example mapping: level `DEGREE`, course `B.Tech`, specialization `Computer Science`.

## Application details (JSON field)

- `method`: `DIRECT` (direct apply link), `FORM` (Google form / portal form), `ASSESSMENT` (coding or timed assessment)
- `platform`: e.g. `Google Forms`, `HackerRank`, `Mahindra Portal`
- `estimatedMinutes`: integer
- `requiredItems`: checklist, e.g. `["Resume", "10th Marksheet", "GitHub"]`

**Direct apply rule:** if the candidate is just redirected to `applyLink` and we
collect nothing, `applicationDetails` MUST be `null` — not an object with empty
strings.

```json
"applicationDetails": null
```

Google Form / portal example:

```json
"applicationDetails": {
  "method": "FORM",
  "platform": "Google Forms",
  "estimatedMinutes": 15,
  "requiredItems": ["Resume", "GitHub", "Portfolio"]
}
```

## Supported date/time formats

- `expiresAt`: ISO local datetime (`YYYY-MM-DDTHH:mm`) or ISO timestamp
- `startDate`, `endDate`: `YYYY-MM-DD`
- `startTime`, `endTime`: `HH:mm` (24-hour)
- `driveDetails.dates`: array of dates (`["YYYY-MM-DD", "YYYY-MM-DD"]`)

## Description formatting

- New lines are supported. Inside JSON, use `\n` — never `/n`.
- `**Heading**` for section headings, `**bold**` inline, `- ` for bullets.
- Short lines ending with `:` also render as headings.
- Raw HTML is not needed.

```json
{
  "description": "**Responsibilities**\n- Build frontend features\n- Work with APIs\n\n**Requirements**\n- React\n- TypeScript\n\nNote: Immediate joiners preferred."
}
```

Keep headings short (**Responsibilities**, **Requirements**, **Eligibility**), one
bullet per line, one blank line between sections. Check that line breaks survived
a paste. `selectionProcess`, `notesHighlights` and similar read best in short
sections too.

---

## Job (full-time)

```json
{
  "type": "JOB",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech"],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "workMode": "ONSITE",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "YEARLY",
  "employmentTypes": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "applyLink": "",
  "customSlug": "",
  "expiresAt": "",
  "applicationDetails": null
}
```

## Internship

```json
{
  "type": "INTERNSHIP",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech"],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "workMode": "HYBRID",
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "MONTHLY",
  "employmentTypes": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "applyLink": "",
  "customSlug": "",
  "expiresAt": "",
  "applicationDetails": null
}
```

## Walk-in

```json
{
  "type": "WALKIN",
  "title": "",
  "company": "",
  "companyWebsite": "",
  "description": "",
  "allowedDegrees": ["DEGREE"],
  "allowedCourses": ["B.Tech"],
  "allowedSpecializations": ["Computer Science"],
  "allowedPassoutYears": [],
  "requiredSkills": [],
  "locations": [],
  "experienceMin": 0,
  "experienceMax": 0,
  "salaryRange": "",
  "salaryAmount": "",
  "salaryPeriod": "MONTHLY",
  "employmentTypes": "",
  "jobFunction": "",
  "incentives": "",
  "selectionProcess": "",
  "notesHighlights": "",
  "customSlug": "",
  "expiresAt": "",
  "venueAddress": "",
  "venueLink": "",
  "dateRange": "",
  "timeRange": "",
  "requiredDocuments": [],
  "contactPerson": "",
  "contactPhone": "",
  "startDate": "",
  "endDate": "",
  "startTime": "10:00",
  "endTime": "13:00",
  "applicationDetails": null,
  "walkInDetails": {
    "dateRange": "",
    "timeRange": "",
    "reportingTime": "",
    "dates": ["", ""],
    "venueAddress": "",
    "venueLink": "",
    "requiredDocuments": [],
    "contactPerson": "",
    "contactPhone": ""
  }
}
```

## Notes

- Arrays can be comma-separated strings in many fields; arrays are preferred.
- For walk-ins the top-level fields and `walkInDetails` are both supported; if
  both are present `walkInDetails` wins.
- `salaryRange` and `salaryAmount` may be used together; `salaryRange` is kept as
  entered.

---

## Content distribution rules

### Description usage

- `description` must contain at least 80–90% of all useful job information.
- Anything important enough to mention — responsibility, qualification,
  requirement, preferred skill, technology, certification, role expectation —
  belongs in `description`, not `notesHighlights`.
- Use it for: role overview, responsibilities, requirements, eligibility,
  educational qualifications, experience requirements, preferred qualifications,
  domain knowledge, certifications, role expectations, work environment,
  selection process details.
- If in doubt, it goes in `description`.

### Notes / highlights usage

- `notesHighlights` must not exceed 25% of the size of `description`. If it is
  longer, the extraction is invalid and must be rewritten.
- It must never hold information that could materially affect a candidate's
  decision to apply. If removing it leaves the description incomplete, the
  content belongs in `description`.
- Allowed: shift timing, bond/service agreement, immediate joiner, own laptop,
  PPO opportunity, walk-in details, joining deadline, special eligibility
  restriction, unusual work condition, mandatory relocation.
- Not allowed: responsibilities, requirements, skills, technologies, preferred
  qualifications, experience preferences, educational requirements, domain
  knowledge, certifications, role expectations.
- Do not use it as an overflow section.

### Quality check

- `notesHighlights` longer than `description` means the extraction is wrong.

## Skills handling

- Do not duplicate skills between `requiredSkills` and `description`.
- Technologies, tools, languages, frameworks and platforms belong primarily in
  `requiredSkills`.
- Do not create a "Skills Required" section in `description` duplicating that list.
- Mention a skill in `description` only when the JD emphasizes it as mandatory,
  preferred, strongly desired or central — phrased naturally inside
  responsibilities or requirements.
- Avoid keyword stuffing; one skill should not appear repeatedly across
  `requiredSkills`, `description` and `notesHighlights`.

Bad: `"requiredSkills": ["Python", "FastAPI", "Azure", "Docker"]` with
`"description": "Skills Required: Python, FastAPI, Azure, Docker..."`

Good: same `requiredSkills`, with
`"description": "Develop scalable backend services and cloud-native applications. Strong Python expertise is considered important for success in this role."`

## Incentives handling

- Only real employee benefits, allowances, bonuses, insurance, reimbursements,
  perks or company-provided advantages.
- Do not leave `incentives` empty when the JD clearly mentions benefits.
- Examples: health/medical/accident insurance, shift allowance, cab facility,
  meal benefits, joining bonus, annual bonus, PPO, flexible work, learning
  programs, certification support, wellness benefits.
- Never copy generic culture statements.
- Before leaving it empty, check for: insurance, medical, accident cover, cab,
  shift allowance, bonuses, PPO, learning programs, certification support,
  flexible work, wellness, employee discounts, leave benefits.

## Description formatting preference

```
About the Role
...
Responsibilities
- ...
- ...
Requirements
- ...
- ...
Eligibility
- ...
- ...
Benefits
- ...
- ...
```

Avoid pushing meaningful content into `notesHighlights` when it belongs in one
of these sections.

## Salary handling

- If salary is not explicitly mentioned, leave `salaryRange` and
  `salaryAmount`/`stipend` empty.
- Never estimate from market standards, experience level, company reputation or
  similar roles.
- "Competitive salary", "as per company standards", "best in industry",
  "negotiable", "attractive package" are NOT figures.
- Only populate from an exact amount, range, stipend, CTC or compensation figure.

## Apply link handling

- Always give the direct application URL when available.
- Do not use a careers homepage when a direct application page exists.
- If email application is requested, use the job posting URL as `applyLink` and
  describe the email process in `description`.

## Email application jobs

- Put the email address in `description`, not `notesHighlights`.
- Say whether resume only, or resume + cover letter, is required.

## Experience handling

- Populate `experienceMin` / `experienceMax` only when stated or clearly
  derivable.
- Never infer from skills, responsibilities, seniority labels or stack
  complexity.
- "Preferred", "nice to have", internship experience or academic project
  experience does not raise the minimum.

## Company name handling

- Use the actual hiring company named in the JD.
- Never "One of our clients", "Confidential", a platform/job-board name, or a
  staffing partner, unless they are explicitly the employer.
- Verify the company from the posting before generating JSON.

## Extraction accuracy

- Never infer, assume, estimate or generate anything not stated in the JD.
- Leave missing fields empty. Do not derive salary, passout years, experience,
  benefits, selection process, work mode or eligibility.
- Prefer empty fields over guessed values.

## Location handling

- City only: `["Noida"]`, `["Hyderabad"]`.
- Never append state or country ("Hyderabad Telangana India",
  "Noida, Uttar Pradesh, India") — the frontend maps cities to states and full
  strings break the layout.
- State fallback only when no city is mentioned: `["Uttar Pradesh"]`.
- Never guess or estimate a location.

## Formatting for AI models and parsers

- Use `\n` for line breaks and bullets inside JSON string fields
  (`description`, `notesHighlights`, `selectionProcess`, ...).
- Do not use raw carriage returns inside JSON strings.
- Do not use `/n` — it renders as literal text.
- Break multiple highlights into separate `\n`-separated lines.
