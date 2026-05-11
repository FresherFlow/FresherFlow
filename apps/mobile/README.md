# FresherFlow Mobile (Expo)

Current status: active MVP development.

## Run

```bash
npm install
npm run start --workspace=apps/mobile
```

## API configuration

Use one of:

- `EXPO_PUBLIC_API_URL` environment variable (preferred)
- `expo.extra.apiUrl` in `app.json`

Fallback is `https://api.fresherflow.in`.

Example:

```bash
$env:EXPO_PUBLIC_API_URL="http://192.168.1.100:5000"
npm run start --workspace=apps/mobile
```

## Implemented now

- OTP login flow (`/api/auth/otp/send`, `/api/auth/otp/verify`)
- Session bootstrap with `/api/auth/me`
- Feed from real API (`/api/opportunities`)
- Offline cache for feed and opened details
- Saved jobs persisted in AsyncStorage

## Notes

- API auth is cookie-based; mobile depends on server CORS + cookie behavior.
- If login works but session does not persist after app restart, backend needs explicit mobile token endpoints.
