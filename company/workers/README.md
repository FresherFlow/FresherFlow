# Workers

Repeatable jobs an agent or a schedule can run.

A worker is a **repeatable sequence**: the same inputs, the same steps, the same
output every time. If it needs judgement on each run, it is a skill, not a worker.

## What exists

| Worker | Lives at | Runs on |
|---|---|---|
| Background jobs | `apps/worker`, started via `pnpm start:worker` | BullMQ queues backed by Redis |
| Discovery | `scripts/job-discovery` | `.github/workflows/job-discovery.yml`, `ats-discovery.yml` |
| Processing | `scripts/job-processor` | `.github/workflows/process-jobs.yml` |
| Search sweeps | `scripts/search` | `.github/workflows/search-sweep.yml` |
| Liveness and dead links | `scripts/sweeper` | `.github/workflows/job-sweeper.yml` |
| SEO audit | `scripts/seo-audit` | run on demand |
| Scheduled jobs | `apps/api/src/cron` | `.github/workflows/cron.yml` |

## The queues

Defined in `packages/queue/src/index.ts:13-18`, deliberately collapsed to save
Redis connections:

| Queue | Combines |
|---|---|
| `notifications` | email, push |
| `broadcast` | Telegram, social |
| `internal` | cron, ingestion |
| `scraper` | scraper |

`packages/queue/src/index.ts:26-30` lists the queues the worker consumes:
`notifications`, `broadcast`, `internal`. **`scraper` is defined but not in
`WORKER_QUEUE_NAMES`**, so confirm the intended owner before relying on it.

## Rules that apply to every worker

- Heavy work runs in a BullMQ worker, never in a request handler (`AGENTS.md`, app boundaries).
- Feed regeneration starts from admin or publish flows, never from a public frontend route.
- Run the pipeline in dry-run or test mode before any production upload.
- A worker that writes multi-table state uses `prisma.$transaction`.

### Worker spec format

Every worker added here needs a contract, so the next agent does not guess where
it stops. Same five fields used for the content roles:

```md
# <worker name>

- owns:        the one decision or side effect this worker is responsible for
- reads:       the inputs it may use
- returns:     the exact artifact or state change it produces
- must not:    work that belongs to another worker, or to a human
- done when:   the observable condition that means the run finished

## Trigger

Schedule, queue name, or manual command.

## Failure behaviour

What happens on a partial run. Anything that can double-post, double-charge, or
double-notify must be idempotent, and the spec must say how.
```
