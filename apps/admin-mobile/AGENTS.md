# FresherFlow admin mobile agent guide

This file is for AI coding agents working in `apps/admin-mobile`. Read the root `AGENTS.md` first.

## App profile

| Concern | Value |
|---|---|
| Framework | Expo and React Native |
| Language | TypeScript, strict mode |
| Audience | Internal FresherFlow operators |
| Auth | Firebase Auth and admin API role checks |
| Purpose | Review, moderate, approve, reject, publish, and regenerate operational data |
| Distribution | Internal EAS builds |

Read `DESIGN_SYSTEM.md` before UI changes.

## Architecture

| Path | Owns |
|---|---|
| `src/features/` | Admin feature modules |
| `src/navigation/` | Navigation and route typing |
| `src/hooks/` | API-backed admin hooks |
| `src/context/` | Auth and app context |
| `src/theme/` | Colors, spacing, typography, component sizes |

All API calls go through `packages/api-client`. Do not call raw admin URLs from screens.

## Production operations rules

Admin actions can affect public data.

- Confirm destructive actions before execution
- Confirm publish and regenerate actions before execution
- Show the target count or item name before bulk actions
- Disable action controls while requests are in flight
- Make duplicate taps idempotent or blocked
- Roll back optimistic UI on failure
- Surface server failure messages without exposing internals
- Keep audit logging on the server for admin mutations

Destructive actions include reject, delete, ban, unpublish, bulk update, feed regenerate, and publish if it changes public state.

## Publish and regenerate safety

- Publish only approved opportunities
- Regenerate feed only through protected admin endpoints
- Do not regenerate from local client data
- Show confirmation before publish, bulk publish, or feed regenerate
- Display last known status after the action completes
- Treat duplicate publish requests as safe retries
- Do not show success until the API confirms the operation

## Data source distinctions

Keep operational counts clear.

| Data | Source |
|---|---|
| Admin queue counts | API admin endpoints |
| Pending review counts | API moderation endpoints |
| Public feed counts | Generated feed or API feed status endpoint |
| Caption previews | Caption feature or API caption endpoint |
| Telegram delivery state | API notification or publish response |

Do not mix public feed counts with admin queue counts. Do not infer publish success from caption generation.

## Auth and authorization

- Firebase login is not enough; API must confirm admin role
- Admin-only endpoints must return `403` for non-admin users
- Clear admin session state on logout
- Do not store or log admin tokens
- Do not expose admin-only data in public mobile app code

## Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL |
| `EXPO_PUBLIC_ADMIN_API_URL` | Optional separate admin API base |
| `EXPO_PUBLIC_USE_SEPARATE_ADMIN_API` | Optional admin routing flag |

Expo client code may read only `EXPO_PUBLIC_*`. Never commit env files.

## Key feature areas

| Domain | Path | Purpose |
|---|---|---|
| Auth | `src/features/auth/` | Admin login |
| Dashboard | `src/features/dashboard/` | Operational overview |
| Moderation | `src/features/moderation/` | Review, approve, reject |
| Opportunities | `src/features/opportunities/` | Manage published opportunities |
| Pending | `src/features/pending/` | Pending review queue |
| Captions | `src/features/captions/` | Caption generation and review |
| Users | `src/features/users/` | User management |
| Settings | `src/features/settings/` | Admin preferences |

## Theme rules

Use existing tokens:

| Concern | File |
|---|---|
| Colors | `src/theme/colors.ts` |
| Spacing and radius | `src/theme/dimensions.ts` |
| Typography | `src/theme/typography.ts` |
| Component sizes | `src/theme/componentSizes.ts` |

Do not hardcode colors or invent status colors. Use established success, warning, error, urgent, and brand tokens.

## Standard workflow

### Add an admin screen

1. Add the screen under the owning feature folder
2. Add typed route params
3. Wire the screen into navigation
4. Use typed API client wrappers
5. Add loading, error, and empty states
6. Add confirmation for destructive or public-state-changing actions

### Add an admin action

1. Confirm the API endpoint exists and requires admin auth
2. Add or reuse the typed API client wrapper
3. Wire the action through a hook or feature service
4. Disable duplicate submissions while pending
5. Show confirmation for destructive or public-state-changing actions
6. Verify server audit logging remains enabled

## High-risk files

| File | Risk |
|---|---|
| `src/navigation/` | Launch and route regressions |
| `src/context/` | Admin auth regressions |
| Publish and moderation features | Public data correctness |
| Caption features | Operator workflow and notification quality |

## Security rules

- Do not log admin tokens, Firebase tokens, or authorization headers
- Parse URLs before opening or trusting hostnames
- Keep destructive actions behind confirmation
- Keep admin-only data behind API role checks
- Do not cache sensitive admin lists in long-lived public storage

## Validation

For admin mobile changes, run:

```bash
pnpm --filter ./apps/admin-mobile typecheck
pnpm --filter ./apps/admin-mobile build
```

Also verify:

- Non-admin users cannot access admin routes
- Confirmation appears before destructive and publish actions
- Loading, error, and empty states render
- Duplicate taps do not submit duplicate operations
- Counts come from the correct source
