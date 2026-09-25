# Opportunity Taxonomy — Research Notes

**Status:** reference material, not yet a decision
**Scope:** what public ATS/board schemas actually model, so our `Opportunity` taxonomy is grounded rather than invented.

## 1. What the major systems separate

**Greenhouse** — job/posting ID, internal job ID, title, requisition ID, location, URL, content, departments, offices, custom metadata; education structures (degrees, disciplines, schools).

**Lever** — title, location + multiple locations, team, department, **commitment** (full-time / part-time / internship), level, tags, salary, apply URLs, requisition codes, **workplaceType** (onsite/remote/hybrid).

**Ashby** — title, primary + secondary locations, department, team, workplace type, employment type, published date, apply URL, status, compensation (salary **+ equity + bonus**).

**SmartRecruiters** — company, industry, department, function, experienceLevel, typeOfEmployment, location (incl. remote + lat/lng), customField, jobAd (company description / job description / qualifications / additional information), active.

**Teamtailor** — remote-status, employment-type (full-time, part-time, contract, temporary, apprenticeship, internship, volunteer), employment-level, department, role, recruiter, locations[], salary, start-date, end-date, custom fields.

**LinkedIn** — company, job title, workplace type, location, job function, employment type (full-time, part-time, contract, temporary, volunteer, internship), company industry, seniority level, skills, screening questions.

**Oracle Recruiting** — organization, business unit, department, legal employer, primary location, workplace, job family, job function, education level, job shift, full/part-time, job type, management level, salary, work dates, selection process, screening questions; primary + other work locations.

**iCIMS** — Job Profile with additional locations, location, assessment type, salary/bill rate, bonus, many custom fields.

**Wellfound** — role, location, salary, equity, work type, experience, company stage/size, remote preferences; distinguishes **company location** from **where the company hires remotely from**.

**Dice** — skills/title, location, work setting (remote/hybrid/on-site), employment type, distance.

**Internshala** (India-relevant) — profile, location, work from home, part-time, stipend, salary, start date, duration, internship with job offer.


## 2. Conclusions from the research

1. `INTERNSHIP` is an **employment arrangement** in every major ATS (Lever, Teamtailor, LinkedIn, Dice) — not a top-level type.
2. `GOVERNMENT` is a **sector**, not a type.
3. `WALK_IN` is a **delivery/recruitment method**, not a type.
4. `OFF_CAMPUS` / `ON_CAMPUS` / `POOL_CAMPUS` are **India-specific** recruitment taxonomy — not present in any major ATS schema. They are ours to define.
5. `REMOTE` / `ONSITE` / `HYBRID` is the most consistent dimension across all systems.
6. Compensation needs salary + stipend + equity + bonus, not one range.
7. Location is two concepts: **where the work is** vs **where remote applicants may reside**.
8. Serious systems use a **structured core + extensible data**, not one giant type enum.

## 3. Candidate model (from research)

```
Opportunity
├── identity       id, title, source, externalId, sourceUrl, applyUrl
├── classification category, employmentType, sector, recruitmentMethod, workMode, experienceLevel
├── organization   company, department, function, industry
├── location       workLocations[], applicantLocationRequirements[]
├── eligibility    education, courses, specializations, passoutYears, skills, experience
├── compensation   salary, stipend, equity, bonus
├── application    start, deadline, process
├── event          optional drive/event details
├── specialized    governmentDetails?
└── provenance     sourceExternalId, sourceUpdatedAt, firstSeenAt, rawPayload
```

### The four critical dimensions

| Question | Dimension |
|---|---|
| What is the opportunity? | `category` |
| What is the employment? | `employmentType` |
| How is recruitment done? | `recruitmentMethod` |
| Where is the work? | `workMode` |

Plus `sector` (government/private/NGO/startup/academic) and `experienceLevel` (separate from `experienceMin/Max`).

### Mappings that replace old enum values

- `INTERNSHIP` → `category=EMPLOYMENT, employmentType=INTERNSHIP`
- `GOVERNMENT` → `sector=GOVERNMENT, category=EMPLOYMENT|GOVERNMENT_EXAM`
- `WALK_IN` → `recruitmentMethod=WALK_IN`
- Off-campus drive → `recruitmentMethod=OFF_CAMPUS`
- Fresher/senior → `experienceLevel` + experience range

## 4. What to keep from the current schema

- `allowedDegrees` / `allowedCourses` / `allowedSpecializations` / `allowedPassoutYears` / `requiredSkills` as GIN-indexed arrays — correct, keep structured.
- `WalkInDetails` lat/lng/city/reportingTime — real filterable/sortable facts, keep as columns.
- `GovernmentJobDetails` — legitimately domain-specific; Oracle/iCIMS prove large specialized models are normal.
- `RawOpportunity.rawPayload` — good foundation for an aggregator.

## Sources

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever Developer](https://hire.lever.co/developer/documentation)
- [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api)
- [SmartRecruiters Objects](https://developers.smartrecruiters.com/docs/objects)
- [Teamtailor API](https://partner.teamtailor.com/job_boards/)
- [LinkedIn Recruiter Help](https://www.linkedin.com/help/recruiter/answer/a415045)
- [Oracle Job Requisition Fields](https://docs.oracle.com/en/cloud/saas/talent-management/faush/info-about-job-requisition-fields.html)
- [iCIMS Job Profile](https://developer-community.icims.com/applications/applicant-tracking/ats-data-models/job-profile)
- [Wellfound Search](https://help.wellfound.com/article/777-setting-up-a-search)
- [Dice Search](https://www.dice.com/support/candidate-help/finding-a-job/searching-for-jobs-on-dice.html)
- [Freshersworld Categories](https://www.freshersworld.com/jobs/categories)
- [Unstop](https://unstop.com/)
- [Google Job Posting Structured Data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)

**Freshersworld** — IT/software, government, internship, diploma, research, defence, BPO, part-time, banking, walk-in, teaching, startup, scholarships, apprenticeship, work-from-home, contingent.

**Unstop** — jobs, internships, government jobs/internships, scholarships, competitions, hackathons, workshops/webinars, conferences, college festivals.

**Google `JobPosting` structured data** — supports full-time, part-time, contractor, temporary, intern, volunteer, per-demon, other; **permits multiple employment types**; distinguishes physical job location from geographic areas where remote applicants may reside.
