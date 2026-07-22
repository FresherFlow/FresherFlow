# FresherFlow Mobile — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for building and modifying the mobile app (`apps/mobile`).

For monorepo-wide rules, architecture, and shared patterns, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) App Snapshot

- Framework: React Native with Expo (Expo Router / custom navigation)
- Language: TypeScript (strict)
- Styling: Custom theme tokens — `src/theme/index.ts`
- Auth: Firebase Auth via Context + SecureStore
- Data: CDN bootstrap feed (R2) + API (`packages/api-client`) + MMKV cache
- Deploy: EAS Build (Android APK + OTA updates)

## 2) Architecture (Do Not Bypass)

### Layers

- **Screens** (`src/screens/`): Full-screen components per feature domain
- **Navigation** (`src/navigation/`): Stack/tab navigators
- **Hooks** (`src/hooks/`): Data fetching and mutation hooks wrapping `api-client`
- **Store** (`src/store/`): Persistent app state (MMKV-backed)
- **Contexts** (`src/contexts/`): Auth, profile, theme — React Context only
- **Utils** (`src/utils/`): Helpers, cache logic, CDN signature

### State and data rules

- Feed data flows through `syncModule.ts` only — do not bypass it.
- All API calls go through `packages/api-client` typed functions — never raw `fetch`.
- Local persistence uses MMKV (`src/utils/storage.ts`) — never AsyncStorage.
- Auth state lives in `src/contexts/AuthContext` — do not duplicate it in screens.
- Scoring (`calculateOpportunityMatch`) runs client-side after feed download — never server-side.

## 3) Initialization & Configuration Map

**Read this before searching the codebase.** These are the exact files where key things are set up.

| What | File | Notes |
|---|---|---|
| Auth state (user session, JWT) | `src/store/useAuthStore.ts` | Zustand store backed by MMKV. Source of truth for logged-in user |
| Feed state (downloaded jobs) | `src/store/useFeedStore.ts` | Zustand store holding scored feed items |
| App preferences | `src/store/useAppPreferencesStore.ts` | Sector, filters, notification prefs |
| Notification state | `src/store/useNotificationStore.ts` | Push token, permission status |
| Theme context | `src/contexts/ThemeContext.tsx` | Dark/light mode — wraps the whole app |
| Toast/snackbar | `src/contexts/ToastContext.tsx` | Global toast messages |
| UI context | `src/contexts/UIContext.tsx` | Sheet open/close states |
| Feed sync entry | `src/utils/cache/syncModule.ts` | `syncFeed()` — version check → fetch → score → cache |
| MMKV storage util | `src/utils/storage.ts` | `storage.set()`, `storage.getString()` etc |
| Auth token key | `src/store/useAuthStore.ts` | `ff_auth_token_v1` in MMKV |
| Anon ID key | `src/store/useAuthStore.ts` | `ff_anon_user_id` in MMKV |
| CDN signature utility | `src/utils/cdnSignature.ts` | `generateCdnSignature()` — required for signed R2 URLs |
| Root navigator | `src/navigation/RootNavigator.tsx` | Top-level routing — auth vs main stack |
| Navigation types | `src/navigation/types.ts` | All stack param lists |
| API client base URL | `packages/api-client/src/config.ts` | Reads `EXPO_PUBLIC_API_URL` → falls back to `localhost:5000` |

### Environment Variables (mobile)

| Variable | Where used | Required |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL | Yes (production) |
| `EXPO_PUBLIC_CDN_URL` | Bootstrap feed CDN base | Yes |
| `EXPO_PUBLIC_CDN_SIGN_KEY` | CDN signed URL key | Yes |

### MMKV Storage Keys (do not rename without migration)

| Key | What it stores |
|---|---|
| `ff_auth_token_v1` | JWT access token |
| `ff_anon_user_id` | Anonymous session ID |
| `ff_feed_cache_v1` | Cached bootstrap feed JSON |
| `ff_feed_version` | Last known feed version number |

---

## 4) Key Feature Areas and Files

### Screens by domain

| Domain | Path |
|---|---|
| Auth | `src/screens/auth/` |
| Feed / Discovery | `src/screens/feed/` |
| Onboarding | `src/screens/onboarding/` |
| Profile | `src/screens/profile/` |
| Settings | `src/screens/settings/` |
| Social | `src/screens/social/` |
| Resources | `src/screens/resources/` |

### Navigation

- Root navigator: `src/navigation/RootNavigator.tsx` — **high risk, edit carefully**
- Tab navigator: `src/navigation/TabNavigator.tsx`
- Auth stack: `src/navigation/AuthStack.tsx`

### Feed sync (critical path)

- `src/utils/cache/syncModule.ts` — version check → signed URL → fetch → score → cache
- `src/utils/cache/offlineCache.ts` — MMKV read/write for feed data
- `src/utils/cdnSignature.ts` — CDN signature generation (never expose unsigned R2 URLs)

### Theme

Read [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) before touching any UI.

- All tokens: `src/theme/index.ts` — `theme.colors`, `theme.spacing`, `theme.roundness`, `theme.elevation`
- Alpha utility: `alpha(color, opacity)` from `src/theme/index.ts`

## 5) Standard Workflows

### Add a new screen

1. Create component in `src/screens/<domain>/<ScreenName>.tsx`.
2. Default export is the screen component — receives navigation props via typed stack.
3. Add route type in `src/navigation/types.ts`.
4. Wire into the correct navigator in `src/navigation/`.
5. Handle loading, error, and empty states — all three, always.

### Add a new hook

1. Create `src/hooks/use<Name>.ts`.
2. Wrap typed function from `packages/api-client` — never raw fetch.
3. Return `{ data, loading, error }` shape consistently.

### Modify the feed sync flow

1. Read `src/utils/cache/syncModule.ts` fully before touching it.
2. Do not add blocking synchronous work inside `fetchRawFeed` or `scoreAndCacheFeed`.
3. Test with both cold start (no cache) and warm start (cached feed) scenarios.
4. Logo prefetch (`triggerLogoPrefetch`) runs after feed is cached — keep it non-blocking.

## 6) Performance Guardrails

- Do not block the JS thread. All heavy work (scoring, logo resolution) must be async.
- Feed download happens at most once per session — check MMKV cache and version first.
- Logo prefetch runs in batches of 5 — do not increase concurrency without testing.
- Use `@shopify/flash-list` for any list with more than ~20 items — never `FlatList` for feed.
- Do not run `calculateOpportunityMatch` synchronously on the main thread for large feeds — batch with `requestAnimationFrame` if needed.

## 7) High-Risk Files (Edit Carefully)

- `src/navigation/RootNavigator.tsx` — routing structure; regressions crash the app on launch
- `src/utils/cache/syncModule.ts` — feed sync; regressions break offline mode entirely
- `src/utils/cache/offlineCache.ts` — MMKV schema; key renames break cached data for existing installs
- `src/contexts/AuthContext.tsx` — auth state; regressions log users out

## 8) Mobile-Specific Post-Change Checks

Run `pnpm typecheck` + `pnpm build` (see root AGENTS.md). Then also:

- Verify cold start (clear app data) and warm start (cached state) both work.
- Verify loading and error states render for any screen that fetches data.
- Verify navigation back/forward works for any new screen.
- For feed changes: verify both PRIVATE and GOVERNMENT sector flows.
