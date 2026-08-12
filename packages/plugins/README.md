# @fresherflow/plugins

ATS and job board adapter library for FresherFlow. Each adapter exposes a consistent `AtsAdapter` interface for listing and enriching job postings.

## ATS Adapters

Adapters that target specific ATS platforms. A `companyId` (slug) is required to target a specific company's board.

| Adapter | ATS Platform | Method | Notable Companies |
|---|---|---|---|
| `AshbyAdapter` | Ashby | REST API | Ramp, Figma, Linear, Vercel, Plaid |
| `BambooHRAdapter` | BambooHR | REST API (JSON) | BrowserStack, Postman, SoundCloud |
| `BreezyHRAdapter` | Breezy HR | REST API | Tech scaleups & SMBs |
| `BullhornAdapter` | Bullhorn | REST API | Staffing agencies (10K+ agencies) |
| `CeipalAdapter` | Ceipal | REST API (JSON) | IT staffing & workforce agencies |
| `ComeetAdapter` | Comeet | REST API | Tech startups & growth companies |
| `DarwinboxAdapter` | Darwinbox | Candidate API (POST) | Swiggy, Paytm, Zomato, Tata Elxsi |
| `EightfoldAdapter` | Eightfold.ai | REST API (PCSX/SmartApply) | Microsoft, Nvidia, Zoom, Micron |
| `FreshteamAdapter` | Freshworks Freshteam | REST API (Bearer/Public) | Freshworks ecosystem & SMBs |
| `GreenhouseAdapter` | Greenhouse | REST API | Airbnb, Coinbase, Datadog, DoorDash, HubSpot, Notion, Stripe |
| `GreythrAdapter` | greytHR | Hire API (GET) | Indian tech SMBs & mid-market |
| `HibobAdapter` | HiBob | REST API | Modern tech enterprises |
| `HROneAdapter` | HROne | Recruitment API (GET) | Indian tech SMBs & enterprises |
| `ICimsAdapter` | iCIMS | JSON gateway / REST API | UPS, Uber, Johnson & Johnson, Target |
| `ISmartRecruitAdapter` | iSmartRecruit | Public REST API | Staffing agencies & SMBs |
| `JobsoidAdapter` | Jobsoid | REST API | Startups & SMBs |
| `JobviteAdapter` | Jobvite | REST API | Logitech, Schneider Electric, Zappos |
| `KekaAdapter` | Keka | Candidate API (GET) | Indian tech SMBs |
| `LeverAdapter` | Lever | REST API | Netflix, Shopify, KPMG, Eventbrite, Atlassian |
| `MercorAdapter` | Mercor | AI API (GET) | AI talent platforms & startups |
| `OorwinAdapter` | Oorwin | REST API | IT services & staffing agencies |
| `OracleAdapter` | Oracle ORC / CX | REST API (JSON) | GCC tech hubs & enterprise Cloud users |
| `PeoplestrongAdapter` | PeopleStrong | Portal API (GET) | Tata, Wipro, Godrej, Mahindra |
| `PersonioAdapter` | Personio | XML Feed | European tech scaleups & GCCs |
| `PhenomAdapter` | Phenom People | REST API | 900+ enterprises (Boeing, Hilton, Nestle, Verizon) |
| `PyjamaHRAdapter` | PyjamaHR | Public REST API | Indian tech startups |
| `RecruitCrmAdapter` | Recruit CRM | Public REST API | Recruiting & executive search agencies |
| `RecruiteeAdapter` | Recruitee | REST API | High-growth startups & scaleups |
| `RecruiterflowAdapter` | Recruiterflow | Public REST API | Executive search & staffing agencies |
| `RipplingAdapter` | Rippling | REST API | Modern tech scaleups & startups |
| `SmartRecruitersAdapter` | SmartRecruiters | REST API | Visa, Bosch, LinkedIn, Skechers, Equinox |
| `SnaphuntAdapter` | Snaphunt | Public REST API | APAC & India tech startups |
| `SuccessFactorsAdapter` | SAP SuccessFactors | OData API + HTML fallback | Siemens, Accenture, Deloitte, EY |
| `TaleoAdapter` | Oracle Taleo | REST API (JSON) | JPMorgan Chase, PepsiCo, Intel, Cisco |
| `TeamtailorAdapter` | Teamtailor | REST API | Modern European & global tech companies |
| `TurboHireAdapter` | TurboHire | Career API (GET) | Indian enterprise & tech firms |
| `WorkableAdapter` | Workable | GraphQL / REST API | Sephora, Bain Capital, Forbes |
| `WorkdayAdapter` | Workday | CXS REST API (POST/GET) | Amazon, Salesforce, Target, Bank of America, Visa, Tesla |
| `ZimyoAdapter` | Zimyo | ATS Widget API (GET) | Indian startups & SMBs |
| `ZohoRecruitAdapter` | Zoho Recruit | Careers JSON GET | Zoho ecosystem & SMBs |
| `ZwayamAdapter` | Zwayam | Jobs API (GET) | Firstmerit & Indian staffing/enterprises |

## Board Adapters

Adapters that scrape or query public job boards directly.

| Adapter | Source | Method | Region |
|---|---|---|---|
| `BaytAdapter` | Bayt | HTML Scraper / REST | Middle East & South Asia |
| `GlassdoorAdapter` | Glassdoor | GraphQL API + CSRF | India / Global |
| `HackerNewsAdapter` | Hacker News (YC Jobs) | Firebase REST API | Global Remote |
| `HasjobAdapter` | HasJob | Atom RSS Feed | India |
| `IndeedAdapter` | Indeed | GraphQL API | India / Global |
| `InternshalaAdapter` | Internshala | HTML Cheerio Parsing | India |
| `LinkedinAdapter` | LinkedIn | Guest REST API | India / Global |
| `NaukriAdapter` | Naukri | REST API (`Nkparam`) | India |
| `RemoteOkAdapter` | RemoteOK | JSON API | Global Remote |
| `WellfoundAdapter` | Wellfound (AngelList) | Next.js JSON (`__NEXT_DATA__`) | Global Remote |
| `WeWorkRemotelyAdapter` | WeWorkRemotely | RSS XML Feed | Global Remote |

## Company-Specific Adapters

Direct integrations with major company career APIs.

| Adapter | Company | API | Method |
|---|---|---|---|
| `AmazonAdapter` | Amazon | Amazon Jobs API | REST POST |
| `AppleAdapter` | Apple | Apple Jobs API | REST POST (CSRF Handshake) |
| `GoogleAdapter` | Google | Google Careers API | REST GET |
| `IbmAdapter` | IBM | IBM Careers API | REST GET |
| `MetaAdapter` | Meta | Meta Careers | Next.js JSON (`__NEXT_DATA__`) |
| `MicrosoftAdapter` | Microsoft | Microsoft Careers API | REST GET |
| `NvidiaAdapter` | Nvidia | Enterprise Career Portal | REST POST / JSON |
| `StripeAdapter` | Stripe | Greenhouse Integration | REST GET |
| `UberAdapter` | Uber | Uber Careers API | REST POST |

## Interface

```typescript
export interface AtsAdapter {
  providerName: string;
  fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]>;
  fetchJobDetails?(job: AtsJob): Promise<string | undefined>;
}
```

## Usage

```typescript
import { GreenhouseAdapter } from '@fresherflow/plugins';

const adapter = new GreenhouseAdapter();
const jobs = await adapter.fetchJobs('airbnb', 'Airbnb');
```

## companyId Format

| ATS | companyId format | Example |
|---|---|---|
| Ashby | Company slug | `ramp` |
| BambooHR | Subdomain | `postman` |
| Breezy HR | Subdomain / Company handle | `breezy` |
| Bullhorn | Corp ID / Zone slug | `12345` |
| Ceipal | Account Name | `ceipal` |
| Comeet | Company UID / slug | `comeet` |
| Darwinbox | Subdomain | `tataelxsi` |
| Eightfold | Tenant slug | `microsoft` |
| Freshteam | Subdomain | `freshworks` |
| Greenhouse | Board token | `airbnb` |
| GreytHR | Subdomain | `greythr` |
| HiBob | Company slug | `hibob` |
| HROne | Subdomain / Tenant slug | `hrone` |
| iCIMS | Subdomain | `target` |
| iSmartRecruit | Company slug | `ismartrecruit` |
| Jobsoid | Company slug | `jobsoid` |
| Jobvite | Company slug | `logitech` |
| Keka | Subdomain / Tenant ID | `keka` |
| Lever | Company slug | `netflix` |
| Mercor | Company slug | `mercor` |
| Oorwin | Subdomain | `oorwin` |
| Oracle ORC | Host subdomain slug | `oraclecloud` |
| PeopleStrong | Subdomain | `tata` |
| Personio | Subdomain | `personio` |
| Phenom | Tenant slug | `boeing` |
| PyjamaHR | Company handle | `pyjamahr` |
| Recruit CRM | Company slug | `recruitcrm` |
| Recruitee | Subdomain / Account slug | `recruitee` |
| Recruiterflow | Company slug | `recruiterflow` |
| Rippling | Company slug | `rippling` |
| SmartRecruiters | Company identifier | `Visa` |
| Snaphunt | Company slug | `snaphunt` |
| SAP SuccessFactors | Tenant ID | `siemens` |
| Oracle Taleo | `tenant:careersection` | `jpmorgan:ex` |
| Teamtailor | Company handle | `teamtailor` |
| TurboHire | Company slug | `swiggy` |
| Workable | Account slug | `sephora` |
| Workday | `tenant:wd_number:boardName` | `tesla:5:Tesla` |
| Zimyo | Company ID / Widget Slug | `zimyo` |
| Zoho Recruit | Subdomain / Portal ID | `zohorecruit` |
| Zwayam | Subdomain | `zwayam` |
