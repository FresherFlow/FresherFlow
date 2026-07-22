# FresherFlow Admin Mobile — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for building and modifying the admin mobile app (`apps/admin-mobile`).

For monorepo-wide rules, architecture, and shared patterns, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) App Snapshot

- Framework: React Native with Expo
- Language: TypeScript (strict)
- Styling: Custom theme — `src/theme/colors.ts`, `src/theme/dimensions.ts`, `src/theme/typography.ts`
- Auth: Firebase Auth (admin-only accounts)
- Purpose: Internal moderation — reviewing, approving, rejecting, publishing opportunities
- Deploy: EAS Build (internal distribution, not Play Store)

## 2) Architecture (Do Not Bypass)

### Layers

- **Features** (`src/features/`): Self-contained feature modules per admin domain
- **Navigation** (`src/navigation/`): Stack/tab navigators
- **Hooks** (`src/hooks/`): Data fetching wrapping `packages/api-client`
- **Contexts** (`src/context/`): Auth and theme
- **Theme** (`src/theme/`): All design tokens

### Data rules

- All API calls go through `packages/api-client` — never raw fetch.
- Admin actions (approve, reject, publish) call protected endpoints that require the `requireAuth` + admin role middleware.
- No CDN feed consumption in admin app — admin reads directly from the API/database.

## 3) Key Feature Areas and Files

### Features by domain

| Domain | Path | Purpose |
|---|---|---|
| Auth | `src/features/auth/` | Admin login |
| Dashboard | `src/features/dashboard/` | Overview stats |
| Moderation | `src/features/moderation/` | Review queue — approve/reject |
| Opportunities | `src/features/opportunities/` | Browse and manage published jobs |
| Pending | `src/features/pending/` | Pending jobs awaiting review |
| Captions | `src/features/captions/` | Telegram caption generation |
| Users | `src/features/users/` | User management |
| Settings | `src/features/settings/` | Admin app settings |

### Navigation

- Root navigator: `src/navigation/` — wire new feature screens here
- Add route types for every new screen before wiring

### Theme

Read [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) before touching any UI.

- Colors: `src/theme/colors.ts`
- Spacing & radius: `src/theme/dimensions.ts` (`SPACING`, `RADIUS`)
- Typography: `src/theme/typography.ts` (pre-composed `TextStyle` objects)
- Component sizes: `src/theme/componentSizes.ts`

## 4) Standard Workflows

### Add a new admin screen

1. Create feature folder `src/features/<domain>/` if it doesn't exist.
2. Add screen component `<ScreenName>Screen.tsx` inside the feature folder.
3. Add route type in navigation types file.
4. Wire into `src/navigation/`.
5. Handle loading, error, and empty states — all three, always.
6. Admin screens must show a confirmation dialog before any destructive action (reject, delete).

### Add a new moderation action

1. Ensure the API endpoint exists and is protected with `requireAuth` + admin check.
2. Add typed wrapper in `packages/api-client/src/`.
3. Wire into the relevant feature hook in `src/hooks/`.
4. Show optimistic UI update where possible, with rollback on error.
5. Log the action — admin actions are audit-logged server-side via `adminAudit.ts` middleware.

## 5) Admin-Specific Rules

- Every destructive action (reject, ban, delete) must show a confirmation dialog before executing.
- Status badges must use consistent colors: `colors.success` for approved/published, `colors.error` for rejected, `colors.warning` for pending/review.
- Use `colors.urgent.*` tokens for urgent job flags — do not improvise new colors.
- Use `colors.brands.*` for social/sharing buttons (Telegram, WhatsApp, LinkedIn).
- Admin app is internal only — no App Store optimizations needed, but crash-free is non-negotiable.

## 6) High-Risk Files (Edit Carefully)

- `src/navigation/` — routing structure; regressions crash on launch
- `src/context/` — auth context regressions log admins out
- Any file touching publish/approve/reject flow — moderation correctness is critical

## 7) Admin-Specific Post-Change Checks

Run `pnpm typecheck` + `pnpm build` (see root AGENTS.md). Then also:

- Verify confirmation dialogs appear before all destructive actions.
- Verify admin-only routes reject non-admin users.
- Verify loading and error states render for every screen that fetches data.
