# FresherFlow — Roadmap

> **Vision:** The most reliable source of entry-level jobs in India — jobs fetched directly from company career systems, not scraped from aggregators.
>
> The competitive moat is not the product. It's the data — a continuously maintained **Company → ATS Registry** that compounds in value every month.

---

## What's Live Today

- ✅ Web app (Next.js) with job feed, filters, company pages, opportunity detail
- ✅ Mobile app (React Native + Expo) with offline-capable CDN feed, push notifications
- ✅ Admin mobile app for moderation (approve / reject / publish)
- ✅ Bootstrap feed architecture — CDN-served JSON, version-checked, MMKV-cached on mobile
- ✅ Job discovery pipeline — ATS scraping + Playwright-based aggregators
- ✅ BullMQ background worker for publishing, notifications, feed regeneration
- ✅ Walk-in opportunity support
- ✅ Government jobs feed
- ✅ Job alerts (user subscriptions)
- ✅ Telegram broadcast channel integration

---

## Phase 1 — Data Engine Reliability 🔴 In Progress

*"I can reliably fetch and update jobs from hundreds of companies."*

The pipeline exists but needs to scale and harden.

- [ ] Company → ATS Registry — structured, verified, with ATS type per company
- [ ] ATS native API fetchers — Greenhouse, Lever, Ashby, Workday, SmartRecruiters
- [ ] ATS native API fetchers — SAP SuccessFactors, iCIMS, Taleo, BambooHR, DarwinBox
- [ ] Job normalization — single internal schema regardless of ATS source
- [ ] Deduplication — R2-backed fingerprinting, no Redis dependency
- [ ] URL validity checking — dead link detection before publish
- [ ] Scheduled sync — active companies re-checked every 15–30 min
- [ ] Ingestion pipeline: Supabase staging DB migration (keep Neon compute for users)

---

## Phase 2 — Job Intelligence 🟠 Next

*"Users get structured, trustworthy job information."*

- [ ] Skill extraction from job descriptions
- [ ] Eligibility extraction — batch year, degree, branch, CGPA
- [ ] Experience range parsing (0–2 years, fresher-only, etc.)
- [ ] Remote / Hybrid / On-site detection
- [ ] Salary range extraction where available
- [ ] Eligibility engine — filter feed by user's batch, degree, branch
- [ ] Job quality score — source freshness, salary present, URL valid, official page
- [ ] AI-generated summary per job — role, skills, eligibility, apply steps

---

## Phase 3 — Product Experience 🟡 Planned

*"Users keep coming back because the experience is better than anything else."*

### Mobile
- [ ] Twitter-style card feed UI
- [ ] Feature-first architecture migration (feed, explore, profile, auth as self-contained modules)
- [ ] Application tracker — Saved → Applied → OA → Interview → Offer
- [ ] Smart swipe actions on job cards
- [ ] Hiring Surge alerts — "Engineering at Flipkart ↑ 400% this week"

### Web
- [ ] Smart search — natural language: "Remote Java internship 2027 batch Hyderabad"
- [ ] Advanced filters — batch year, branch, location, role type, salary
- [ ] Similar jobs section on detail page
- [ ] Similar companies recommendations
- [ ] Company change feed — salary updated, location added, job closed

### Both
- [ ] Job Quality Score visible on cards and detail pages
- [ ] Eligibility badge — ✅ Eligible / ❌ Not eligible based on profile

---

## Phase 4 — Hiring Intelligence 🔵 Future

*"FresherFlow becomes a source of intelligence, not just listings."*

- [ ] Hiring Calendar — historical timeline per company (TCS NQT opens mid-August every year)
- [ ] Predictive hiring — "Amazon likely to open SDE-2027 hiring in 2 weeks"
- [ ] Campus Hiring Map — which companies visited which colleges
- [ ] Company Hiring DNA — avg openings/month, common stack, fresher-friendly score
- [ ] Hiring Surge detection and alerts
- [ ] "Notify me 7 days before [Company] usually opens hiring"
- [ ] Market reports — top hiring companies, fastest-growing employers, trending skills

---

## Phase 5 — AI Features 🟣 Future

*"Personalized career intelligence."*

- [ ] Personalized feed ranking based on profile + history
- [ ] AI career assistant — conversational job guidance
- [ ] Interview preparation — role-specific question sets
- [ ] Hiring Network Graph — Company → ATS → Jobs → Skills → Universities

---

## Phase 6 — Platform 🌐 Long Term

*"FresherFlow as infrastructure."*

- [ ] Public Hiring API — `GET /jobs`, `GET /companies`, `GET /skills`, `GET /calendar`
- [ ] ATS Registry API — license the Company → ATS mapping to other tools
- [ ] InternFlow — internship-specific product
- [ ] RemoteFlow — remote jobs product
- [ ] HiringIntel — analytics product for hiring teams and HR

---

*Last updated: 2026-07-22*
