# @fresherflow/plugins

> Ingestion adapters and scrapers for FresherFlow job discovery. Supports 47+ ATS platforms, job boards, and major company career portals targeted at India and India-eligible remote fresher hiring.

---

## ⚡ Inventory of Adapters & Ingestion Methods (47 Total)

### 1. ATS Platform Adapters (35)

| Provider | Adapter Class | Ingestion Method / Endpoint Pattern | Category | Target Scope |
|---|---|---|---|---|
| **Greenhouse** | `GreenhouseAdapter` | REST GET `api.greenhouse.io/v1/boards/{slug}/jobs?content=true` | Global ATS | Global / India Tech |
| **Lever** | `LeverAdapter` | REST GET `api.lever.co/v0/postings/{slug}?mode=json` | Global ATS | Global / India Tech |
| **Workday** | `WorkdayAdapter` | REST POST `https://{tenant}.{wdNumber}.myworkdayjobs.com/wml/views/{site}/search` | Enterprise ATS | MNC / GCC Tech Hubs |
| **Ashby** | `AshbyAdapter` | REST GET `api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true` | Startup ATS | Global / India Scaleups |
| **SmartRecruiters** | `SmartRecruitersAdapter` | REST GET `api.smartrecruiters.com/v1/companies/{slug}/postings` | Global ATS | Enterprise / MNCs |
| **Jobvite** | `JobviteAdapter` | REST GET `jobs.jobvite.com/Company/{slug}/jobs` | Enterprise ATS | US / India GCCs |
| **Workable** | `WorkableAdapter` | GraphQL / REST `workable.com/api/v1/accounts/{slug}/jobs` | Global ATS | Scaleups / Mid-market |
| **SAP SuccessFactors** | `SuccessFactorsAdapter` | OData API `career{tenant}.successfactors.com/sfcareer/jobreqsearch` | Enterprise ATS | IT Giants & GCCs |
| **Oracle Taleo** | `TaleoAdapter` | REST POST `https://{tenant}.taleo.net/careersection/{section}/jobsearch.json` | Enterprise ATS | IT Giants & GCCs |
| **Oracle ORC / CX** | `OracleAdapter` | REST GET `https://{tenant}.fa.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions` | Enterprise ATS | GCC Tech Hubs |
| **iCIMS** | `ICimsAdapter` | REST GET `https://{tenant}.icims.com/jobs/search?in_iframe=1` | Enterprise ATS | US / India GCCs |
| **Recruitee** | `RecruiteeAdapter` | REST GET `https://{slug}.recruitee.com/api/offers/` | Global ATS | Scaleups |
| **Darwinbox** | `DarwinboxAdapter` | Candidate API POST `https://{tenant}.darwinbox.in/ms/candidateapi/getJobList` | Indian ATS | Swiggy, Paytm, Zomato |
| **Keka** | `KekaAdapter` | Candidate API GET `https://{tenant}.keka.com/careers/api/mwf/careers/jobs` | Indian ATS | Indian Tech SMBs |
| **greytHR** | `GreythrAdapter` | Hire API GET `https://{tenant}.greythr.com/hire/api/career/published_jobs/` | Indian ATS | Indian SMBs |
| **HROne** | `HROneAdapter` | Recruitment API GET `https://api.hrone.hrone.cloud/api/recruitment/referralposting/v1` | Indian ATS | Indian Tech SMBs |
| **Freshteam** | `FreshteamAdapter` | Public REST GET `https://{tenant}.freshteam.com/api/job_postings` | Indian ATS | Freshworks / SMBs |
| **PeopleStrong** | `PeoplestrongAdapter` | Portal API GET `https://{tenant}.peoplestrong.com/api/candidate/job/list` | Indian ATS | Tata, Wipro, Godrej |
| **Zimyo** | `ZimyoAdapter` | ATS Widget API GET `https://ats.zimyo.work/ats/ats/widget/joblist2?id={slug}` | Indian ATS | Indian Startups |
| **Zoho Recruit** | `ZohoRecruitAdapter` | Careers JSON GET `https://{tenant}.zohorecruit.com/jobs/Careers` | Indian ATS | Zoho Ecosystem |
| **TurboHire** | `TurboHireAdapter` | Career API GET `https://api.turbohire.co/career/v1/jobs?company={slug}` | Indian ATS | Indian Enterprise |
| **Zwayam** | `ZwayamAdapter` | Jobs API GET `https://{tenant}.zwayam.com/api/jobs/list` | Indian ATS | Firstmerit / Staffing |
| **iSmartRecruit** | `ISmartRecruitAdapter` | Public API GET `https://www.ismartrecruit.com/api/v1/jobs?company={slug}` | Indian ATS | Staffing & SMBs |
| **PyjamaHR** | `PyjamaHRAdapter` | Public API GET `https://api.pyjamahr.com/v1/jobs?company_handle={slug}` | Indian ATS | Indian Tech Startups |
| **Ceipal** | `CeipalAdapter` | Job Portal API GET `https://jobportalapi.ceipal.com/v1/jobs?account_name={slug}` | Indian ATS | Staffing Agencies |
| **Recruit CRM** | `RecruitCrmAdapter` | Public REST GET `https://api.recruitcrm.io/v1/jobs?slug={slug}` | Indian ATS | Recruiting Agencies |
| **Recruiterflow** | `RecruiterflowAdapter` | Public REST GET `https://recruiterflow.com/api/v1/jobs?company={slug}` | Indian ATS | Executive Search |
| **Snaphunt** | `SnaphuntAdapter` | Public API GET `https://snaphunt.com/api/v1/jobs?company={slug}` | Indian ATS | APAC & India Startups |
| **Mercor** | `MercorAdapter` | AI API GET `https://api.mercor.com/v1/jobs?company={slug}` | AI ATS | AI Talent Platforms |
| **Eightfold.ai** | `EightfoldAdapter` | REST GET `https://{tenant}.eightfold.ai/api/apply/v2/jobs` | Enterprise AI | Microsoft, Nvidia, Zoom |
| **Phenom People** | `PhenomAdapter` | REST GET `https://{tenant}.phenompeople.com/api/jobs` | Enterprise AI | Boeing, Verizon, Honeywell |
| **Bullhorn** | `BullhornAdapter` | Public REST Search `https://public-rest{zone}.bullhornstaffing.com/rest-services/{corp}/search/JobOrder` | Staffing ATS | Randstad, Allegis, Experis |
| **BambooHR** | `BambooHRAdapter` | Careers List GET `https://{tenant}.bamboohr.com/careers/list` | SMB ATS | BrowserStack, Postman |
| **Personio** | `PersonioAdapter` | XML Feed GET `https://{tenant}.jobs.personio.de/xml` | EU ATS | European GCCs |
| **Breezy HR** | `BreezyHRAdapter` | JSON API GET `https://{tenant}.breezy.hr/json` | Global ATS | Tech Scaleups |

---

### 2. Job Board & Aggregator Adapters (10)

| Provider | Adapter Class | Ingestion Method / Extraction Mechanism | Category | Target Scope |
|---|---|---|---|---|
| **Wellfound (AngelList)** | `WellfoundAdapter` | Next.js `__NEXT_DATA__` JSON extraction (`props.pageProps.listings`) | Job Board | Startups (Seed to Series C) |
| **Hacker News (YC Jobs)** | `HackerNewsAdapter` | Firebase REST API (`/v0/jobstories.json` + `/v0/item/{id}.json`) | Job Board | YC Startups & Remote |
| **RemoteOK** | `RemoteOkAdapter` | JSON API GET `https://remoteok.com/api` | Job Board | Global Remote (India-eligible) |
| **WeWorkRemotely** | `WeWorkRemotelyAdapter` | RSS XML Feed `https://weworkremotely.com/remote-jobs.rss` | Job Board | Global Remote (India-eligible) |
| **Naukri** | `NaukriAdapter` | REST API `https://www.naukri.com/jobapi/v3/search` with `Nkparam` header | Job Board | India Fresher Hiring |
| **Internshala** | `InternshalaAdapter` | HTML Cheerio parsing `https://internshala.com/jobs` | Job Board | India Internships & Entry Jobs |
| **HasJob** | `HasjobAdapter` | Atom Feed GET `https://hasjob.co/feed` | Job Board | HasGeek / Indian Tech |
| **Indeed India** | `IndeedAdapter` | GraphQL API `https://in.indeed.com/api/jobs` | Job Board | India Entry Roles |
| **LinkedIn India** | `LinkedinAdapter` | Guest API `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` | Job Board | India Tech Hiring |
| **Glassdoor India** | `GlassdoorAdapter` | GraphQL API + CSRF `https://www.glassdoor.co.in/api/jobs` | Job Board | India Tech Hiring |

---

### 3. Direct Company Scrapers (5)

| Company | Adapter Class | Ingestion Method / Extraction Mechanism | Category | Target Scope |
|---|---|---|---|---|
| **Apple** | `AppleAdapter` | CSRF Handshake (`/api/v1/CSRFToken`) + REST POST `https://jobs.apple.com/api/v1/search` | Company Portal | Apple India Careers |
| **Uber** | `UberAdapter` | REST POST `https://www.uber.com/api/loadSearchJobsResults` | Company Portal | Uber India Tech Hub |
| **Meta** | `MetaAdapter` | Next.js `__NEXT_DATA__` JSON extraction (`metacareers.com/jobs`) | Company Portal | Meta Careers India |
| **Stripe** | `StripeAdapter` | Greenhouse API GET `boards-api.greenhouse.io/v1/boards/stripe/jobs?content=true` | Company Portal | Stripe India Engineering |
| **Google** | `GoogleAdapter` | REST GET `https://careers.google.com/api/v3/search/` | Company Portal | Google Careers India |

---

## 🛠️ Interface Contract & Extraction Rules

All adapters implement `AtsAdapter`:

```typescript
export interface AtsAdapter {
  providerName: string;
  fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]>;
}
```

### Extraction Standards
1. **Zero HTML Pollution**: All job descriptions pass through `htmlToPlainText()` to sanitize raw markup.
2. **Salary & Experience Normalization**: Raw salary/exp strings are enriched using `extractSalary()` and `extractExperience()`.
3. **Location Parsing**: Every location string is tagged with structured metadata (`raw`, `country`, `remote`).
