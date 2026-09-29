# Backend → CDN feed map

What the API **generates** and **publishes** to the CDN/R2 bucket, which logic
produces it, and the folder structure it writes into. Written by reading the
code, not by inspecting a live bucket.

Scope: `apps/api/src/infrastructure/services/opportunity/`.

---

## 1. The two-stage shape

There are no CDN writers. Everything is generated **from Postgres** in Node and
then uploaded.

```
Postgres
   │
   ├─ FeedGeneratorService.*        ← pure functions: query + map → plain object
   │                                 (no I/O, no upload)
   │
   ├─ StaticFeedService.refresh()   ← orchestration: calls the generators,
   │                                 serialises, writes to disk, uploads to R2
   │
   └─ MetadataService.*             ← taxonomy directories (companies, cities,
                                     skills, education, syllabus)
   ```

The split matters: `feedGenerator.service.ts` decides *what* a payload contains,
`staticFeed.service.ts` decides *where it goes*. Any payload can be produced
without touching R2, which is what makes the dev `FEED_SOURCE=db` path possible.

---

## 2. Generator functions — `feedGenerator.service.ts`

16 public generators. All `static async`, all return a plain object.

| Generator | Produces | Notes |
|---|---|---|
| `generateBootstrapFeed()` | Master superset of all live listings | The heavy one. Everything else is a slice or projection of it. |
| `generateFeedIndex()` | Light projection via `projectFeedIndex()` | Field list is `FEED_INDEX_FIELDS`. **Preferred read path.** |
| `generateGovernmentFeed()` | Government listings only | |
| `generateWalkinFeed()` | Walk-ins / campus drives | Filter: `recruitmentMethod = WALK_IN OR driveDetails IS NOT NULL`. |
| `generateExpiredFeed()` | Recently expired listings | A 404 fallback so a live URL does not hard-fail. |
| `generateOpportunityDetail(idOrSlug)` | One opportunity | Matches the `jobs/{id}.json` shard. |
| `generateCompaniesMetadata()` | Company directory | Also written by `MetadataService` at the R2 root. |
| `generateSkillsMetadata()` | Skill taxonomy | |
| `generateCompanyShards()` | Per-company slices | |
| `generateCategoryShards()` | Per-category slices | **DEAD — see §5.** |
| `generateSitemap()` | Sitemap XML | |
| `generateSitemapData()` | URL lists per section | Used by `generateStaticParams`. |
| `generateLinksFeed()` | Internal-link graph | |
| `generateStats()` | Public counters | Includes the walk-in count. |
| `generateTakenUsernames()` | Username deny-list | A name is unavailable if present. |
| `generateResourcesFeed()` | Resource collections | |

Two shared pieces feed most of the above:

- `getFeedSelectFields()` — one `select` reused by 7 generators.
- `FEED_INDEX_FIELDS` + `projectFeedIndex()` — the whitelist that makes
  `feed-index.json` lighter than the bootstrap feed.

**One source of truth per concern:** the bootstrap feed and the per-slice feeds
must not drift, so they all map through the same `mapFeedOpportunities()`.

---

## 3. Folder structure written to the bucket

`PUBLIC_ROOT` is resolved by `StorageService.getPublicRoot()`. Each generator
output lands in one of five subfolders, plus a root for the taxonomy files.

```
<R2 bucket>/
├── feeds/            8 objects
│   ├── bootstrap-feed.min.json
│   ├── feed-index.json
│   ├── government-feed.json
│   ├── walkins-feed.json
│   ├── expired-feed.min.json
│   ├── resources-feed.json
│   ├── links.min.json
│   └── syllabus.json
│
├── jobs/             1 object PER opportunity      ← the object-count driver
│   └── {id}.json
│
├── sitemaps/         11 objects
│   ├── sitemap.xml
│   ├── sitemap-index.xml
│   ├── sitemap-jobs.xml
│   ├── sitemap-walkins.xml
│   ├── sitemap-govt.xml
│   ├── sitemap-companies.xml
│   ├── sitemap-locations.xml
│   ├── sitemap-roles.xml
│   ├── sitemap-skills.xml
│   ├── sitemap-batches.xml
│   └── sitemap-data.json
│
├── meta/             4 objects
│   ├── feed-version.json         ← cache-buster + signature input
│   ├── stats.json
│   ├── taken-usernames.min.json
│   └── generated-hubs.json
│
├── companies/        directory is declared, never written
├── categories/       directory is declared, never written
│
└── (root)            4 taxonomy files, no folder prefix
    ├── companies.json           ← read by web + mobile
    ├── cities.json              ← read by web + mobile
    ├── skills.json              ← read by web + mobile
    └── education.json           ← read by web + mobile
```

The four root files are **not** leftovers from the folder migration. They have
no folder equivalent, and both clients read them from the CDN root
(`runtimeConfig.ts` `*_METADATA_URL`, mobile `config/api.ts`).

### Object-count formula

Fixed overhead is **27 objects** (8 feeds + 11 sitemaps + 4 meta + 4 root).
On top of that:

```
total objects = 29 + (number of PUBLISHED opportunities)
```

Because every publish fires `uploadSingleJob()`, the bucket grows by one object
per listing, forever, with no reaper in this codebase. That is the number worth
watching, not the feed sizes.

---

## 4. Write triggers

| Trigger | Path | Granularity |
|---|---|---|
| `StaticFeedService.refresh()` | Debounced ~5s, one DB query + one batch of uploads | All 27 fixed objects |
| `publish.service` → `uploadSingleJob()` | Fire-and-forget per publish | 1 object |
| `publish.service` → `MetadataService.appendOpportunityMetadata()` | Fire-and-forget per publish | Appends to root taxonomy files |
| `api/index.ts` feed routes | `FEED_SOURCE=db` only | Generated per request, nothing cached |

The `FEED_SOURCE=db` routes in `index.ts` bypass the bucket entirely and call
the generators directly, which is why local dev needs no R2 and no signature
secret.

---

## 5. Dead or wrong wiring

Found by reading the code. Each is a real defect, not a style note.

1. **`feeds/walkins-feed.json` has no reader.** Written on every refresh. The
   walk-in page reads `feed-index.json`, which already carries `driveDetails`.
   The byte-identical `feeds/walkins.json` alias was removed; the remaining
   object is still unread, so it remains a candidate for deletion.
2. **`generateCategoryShards()` is unreachable and broken.** Its only caller is
   `staticFeed.service.ts:128`, which is itself never called. It also queries
   `type: 'WALKIN'`, a column the taxonomy migration dropped.
3. **`companies/` and `categories/` directories are declared** in
   `staticFeed.service.ts` but nothing is ever written into them.
5. **`meta/generated-hubs.json` lists `/jobs/walkins`**, which 301s to
   `/drives` — a *different* hub from `/drives/walk-in`. Every sibling redirect
   points at `/drives/walk-in`; this one does not.
6. **`sitemaps/sitemap-walkins.xml` is filed under the same stale hub** and its
   entries point at `/jobs/{slug}`.
7. **`publicOpportunityCache.service.ts:57` maps the `hub-walkins` revalidation
   tag to `/jobs/walkins`**, so a walk-in publish invalidates a redirecting
   path instead of the page that actually changed.

Resolved during this pass:

- `feeds/walkins.json` (alias) — removed.
- Root `syllabus.json` — removed. `MetadataService` now reads and writes
  `feeds/syllabus.json`, so one dataset has one owner in one place.

---

## 6. Consumers — who reads what

| Object | Read by |
|---|---|
| `feeds/bootstrap-feed.min.json` | `apps/web` `cdnFeed._fetchBootstrapFeed`; `apps/mobile` `syncModule` |
| `feeds/feed-index.json` | `apps/web` `cdnFeed._fetchFeedIndex` — the preferred path |
| `feeds/government-feed.json` | `/govt` routes, `[city]` `generateStaticParams` |
| `feeds/expired-feed.min.json` | Detail pages, as a 404 fallback |
| `jobs/{id}.json` | Detail page + split-view pane, one object each |
| `sitemaps/sitemap-data.json` | `generateStaticParams` across route groups |
| `meta/feed-version.json` | `cdnFeed.fetchFeedVersion` — appended as `?v=` and signed |
| `meta/taken-usernames.min.json` | Username availability check |
| `feeds/walkins-feed.json` | **nothing** |
| `companies/`, `categories/` | **nothing** |

---

## 7. Relationship to the walk-in work

`driveDetails` is included in **both** `getFeedSelectFields()` and
`FEED_INDEX_FIELDS`, so a drive survives the projection into the light feed.
That is the only reason `/drives/walk-in` can render dates, venue and
coordinates at all.

The filters added for drive discovery (`nextDriveAt`, `driveCity`) are enforced
in **two** places, and both had to be changed together:

- `application/opportunity/filters.ts` → the search route
- `feedGenerator.service.ts` `generateFeedIndex()` / `generateWalkinFeed()` →
  the feed the drives page actually reads

Applying the rule to only one is how an expired drive ended up still visible on
the page while correctly hidden from search.

---

## 8. Reproducing this map

`apps/api/scripts/mapCdnFeeds.ts` calls every generator and reports record
count and byte size per key, then dumps each payload to
`apps/api/.feed-map/`. It needs `DATABASE_URL`:

```bash
pnpm --filter ./apps/api exec tsx scripts/mapCdnFeeds.ts
```

That script measures a live database. This document describes the code and does
not depend on it.
