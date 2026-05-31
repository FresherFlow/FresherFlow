# Firebase Deployment Notes

## Functions

Type-check from the repository root:

```powershell
pnpm firebase:functions:typecheck
```

Deploy only Functions:

```powershell
pnpm firebase:functions:deploy
```

The package targets Node.js 22.

## Realtime Database Rules

`database.rules.additions.json` contains only the new notification and contributor-leaderboard paths.

Merge these paths into the existing production RTDB rules in Firebase Console. Do not deploy the additions file as a complete ruleset: the mobile app already depends on existing `/comments`, `/stats`, and `/users` rules.

## Admin Mobile Prerequisite

Register the `in.fresherflow.admin` Android app in Firebase and add its own `google-services.json` before enabling the RNFirebase Expo plugins for the admin APK. Do not reuse the consumer app credential file.
