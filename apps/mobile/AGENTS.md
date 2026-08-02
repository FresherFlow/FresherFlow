# FresherFlow mobile agent guide

This file is for AI coding agents working in `apps/mobile`. Read the root `AGENTS.md` first.

## App profile

| Concern | Value |
|---|---|
| Framework | Expo and React Native |
| Language | TypeScript, strict mode |
| Navigation | React Navigation with typed param lists |
| Storage | MMKV and SecureStore |
| Auth | Firebase Auth, JWT, SecureStore, MMKV-backed store |
| Data | CDN bootstrap feed, API client, offline cache |
| Lists | FlashList for large lists |

Read `DESIGN_SYSTEM.md` before UI changes.

## Architecture

| Path | Owns |
|---|---|
| `src/screens/` | Full-screen feature UI |
| `src/navigation/` | Root, stack, and tab navigators |
| `src/hooks/` | Data and mutation hooks |
| `src/store/` | MMKV-backed Zustand stores |
| `src/contexts/` | Auth, theme, toast, and UI context |
| `src/utils/cache/` | Feed sync and offline cache |
| `src/theme/` | Tokens and theme helpers |

Do not call raw backend URLs from screens. Use `packages/api-client` wrappers.

## Feed sync rules

`src/utils/cache/syncModule.ts` is the only feed path.

The feed flow is:

1. Check version
2. Build or request signed CDN URL
3. Fetch bootstrap feed
4. Score opportunities on device
5. Write MMKV cache
6. Update feed store
7. Trigger non-blocking logo prefetch

Rules:

- Do not bypass `syncModule.ts`
- Do not fetch the feed directly in screens
- Do not move match scoring to the API
- Do not rename MMKV keys without a migration
- Keep cold start and warm start behavior working
- Cache stale feed data for offline use when network fails
- Keep logo prefetch bounded and non-blocking

## Offline-first behavior

The app must remain useful without network.

- Read cached feed before showing a hard failure
- Show last synced state when available
- Queue or disable network-only actions with clear UI state
- Avoid clearing valid cache on partial sync failure
- Treat version check failure as recoverable when cached feed exists
- Do not block app launch on optional refresh work

## Auth and token storage

| Data | Storage |
|---|---|
| Firebase session | Firebase Auth |
| JWT access token | SecureStore or existing auth store path |
| Non-sensitive state | MMKV |
| Anonymous ID | MMKV |
| Push token | Existing notification store |

Rules:

- Never log tokens, cookies, authorization headers, or push tokens
- Keep auth source of truth in the existing auth store and context
- Do not store secrets in plain AsyncStorage
- Clear auth state and sensitive caches on logout
- Keep API client token injection centralized

## Navigation rules

- Define params in `src/navigation/types.ts`
- Use typed navigation props or typed hooks
- Add screens to the owning navigator, not always the root navigator
- Keep the root navigator focused on auth versus app gating
- Do not pass large objects through route params
- Use IDs or slugs in params, then read from store or API

## Lists and performance

- Use FlashList for feeds and lists over 20 rows
- Provide stable keys and estimated item size
- Avoid synchronous scoring or filtering of large feeds on the JS thread
- Batch expensive work with idle callbacks, timers, or frame boundaries
- Memoize list rows only when it reduces real rerenders
- Keep images lazy and cached through existing helpers

## Push and notification safety

- Ask permission before registering push tokens
- Submit tokens only through typed API wrappers
- Do not register duplicate tokens repeatedly
- Remove or mark invalid tokens on logout when supported
- Do not log push payloads with personal data
- Handle denied permissions without blocking the app

## Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base URL |
| `EXPO_PUBLIC_CDN_URL` | CDN feed base URL |
| `EXPO_PUBLIC_CDN_SIGN_KEY` | CDN signature input if used by existing client helper |

Expo client code may read only `EXPO_PUBLIC_*`. Never commit env files.

## Key files

| File | Purpose |
|---|---|
| `src/navigation/RootNavigator.tsx` | Auth and app routing gate |
| `src/navigation/types.ts` | Navigation param lists |
| `src/store/useAuthStore.ts` | Auth state |
| `src/store/useFeedStore.ts` | Feed state |
| `src/utils/cache/syncModule.ts` | Feed sync entry point |
| `src/utils/cache/offlineCache.ts` | MMKV feed cache |
| `src/utils/storage.ts` | Storage helper |
| `src/utils/cdnSignature.ts` | CDN signing helper |
| `src/theme/index.ts` | Theme tokens |

## Standard workflow

### Add a screen

1. Add screen component under the owning `src/screens/<domain>/` folder
2. Add route params to `src/navigation/types.ts`
3. Wire the screen into the owning navigator
4. Use existing theme tokens and components
5. Handle loading, error, and empty states
6. Verify navigation back behavior

### Change feed sync

1. Read `syncModule.ts` and `offlineCache.ts`
2. Preserve version check, signed URL, scoring, cache write, and store update order
3. Test cold start with empty cache
4. Test warm start with existing cache
5. Test network failure with existing cache

## Security rules

- Parse URLs with `new URL()` before hostname checks
- Do not use `Math.random()` for IDs, tokens, or security-sensitive values
- Do not log feed payloads, JWTs, push tokens, or user profile details
- Keep external links sanitized before opening
- Use typed API wrappers so auth headers stay centralized

## Validation

For mobile changes, run:

```bash
pnpm --filter ./apps/mobile typecheck
pnpm --filter ./apps/mobile build
```

Also verify:

- Cold start with no cache
- Warm start with cached feed
- Offline start with cached feed
- Loading, error, and empty states
- Navigation for new or changed screens
- Private and government sector feed flows when feed logic changes
