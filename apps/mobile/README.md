# FresherFlow Mobile

React Native + Expo user-facing mobile app.

- **State**: Zustand + MMKV (persistent, no AsyncStorage)
- **Feed**: CDN bootstrap feed (Cloudflare R2), version-checked, MMKV-cached offline
- **Auth**: Firebase Auth + JWT via SecureStore
- **Lists**: `@shopify/flash-list` for feed performance
- **Animations**: `react-native-reanimated`, `moti`

## Run locally

```bash
pnpm dev:mobile
```

Press `a` for Android emulator, `i` for iOS simulator.

## Environment

```bash
cp .env.example .env
```

Minimum required: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CDN_URL`.

## Structure

```
src/
├── screens/        # Full-screen components per domain (auth, feed, profile, settings...)
├── navigation/     # Stack and tab navigators, route types
├── hooks/          # Data fetching hooks wrapping api-client
├── store/          # Zustand state slices (auth, feed, preferences, notifications)
├── contexts/       # Auth, theme, toast, UI contexts
├── utils/
│   ├── cache/      # Feed sync — syncModule.ts, offlineCache.ts (critical path)
│   └── cdnSignature.ts
└── theme/          # Design tokens — colors, spacing, typography, elevation
```

## Feed sync (critical path)

Feed flows through `src/utils/cache/syncModule.ts` only:
version check → signed CDN URL → fetch → score → MMKV cache.

Do not bypass this. See `apps/mobile/AGENTS.md` before modifying.
