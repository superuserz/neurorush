# NeuroRush

A hypercasual mobile-first game platform with real-time leaderboards and Google Sign-In.

**Live app:** https://neurorush-app.vercel.app  
**API:** https://backend-tau-kohl-64.vercel.app

---

## Repository structure

```
neurorush/
├── app/        Expo React Native app (web export → Vercel)
└── backend/    Next.js 16 API (Route Handlers → Vercel)
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile / Web | Expo SDK 54, Expo Router (file-based), React Native |
| Animations | React Native Reanimated v3 |
| State | Zustand + AsyncStorage |
| Backend | Next.js 16 App Router (Route Handlers) |
| Database | MongoDB Atlas (Mongoose) |
| Cache / rate-limit | Upstash Redis |
| Auth | Google Sign-In (`@react-native-google-signin/google-signin`, native; GIS on web) + JWT (90-day) |
| Deployment | Vercel (both projects, separate) |

---

## Local development

### Prerequisites

- Node 20+
- npm 10+
- Expo CLI (`npm i -g expo`)

### Frontend — `app/`

```bash
cd app
npm install

# Run web dev server (uses .env.local for overrides)
npx expo start --web

# To hit local backend instead of production:
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --web
```

**Key env vars (`app/.env.production` — committed, public values only):**

```
EXPO_PUBLIC_API_URL=https://backend-tau-kohl-64.vercel.app
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>
```

> `.env.local` is git-ignored. Use it only for local overrides and never put secrets there.

### Backend — `backend/`

```bash
cd backend
npm install

# Create backend/.env.local with:
# MONGODB_URI=mongodb+srv://...  (encode @ as %40 in password)
# JWT_SECRET=...
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...

npx next dev        # starts on http://localhost:3000
```

---

## Deployment

Both projects deploy independently to Vercel.

### Deploy the frontend (Expo web export)

```bash
cd app

# Build the static web export
npx expo export --platform web --output-dir dist --clear

# Deploy to production
npx vercel --prod
```

> Always run from `app/` so that `vercel.json` is picked up correctly.  
> **Never** run `npx vercel dist --prod` — that deploys the folder as a new project.

### Deploy the backend (Next.js)

```bash
cd backend
npx vercel --prod
```

### Set Vercel environment variables

```bash
# Backend project
vercel env add MONGODB_URI       production
vercel env add JWT_SECRET        production
vercel env add UPSTASH_REDIS_REST_URL   production
vercel env add UPSTASH_REDIS_REST_TOKEN production
vercel env add GOOGLE_WEB_CLIENT_ID     production

# Frontend project (if not using .env.production file)
vercel env add EXPO_PUBLIC_API_URL              production
vercel env add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID production
vercel env add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID production
```

---

## Important commands

### Development

```bash
# Frontend
npx expo start --web            # dev server (hot reload)
npx expo start --web --clear    # clear Metro cache first

# Backend
npx next dev                    # Next.js dev server
npx next build                  # production build check
```

### Production build & deploy

```bash
# Full frontend release
cd app && npx expo export --platform web --output-dir dist --clear && npx vercel --prod

# Full backend release
cd backend && npx vercel --prod
```

### Useful Vercel CLI

```bash
vercel ls                       # list recent deployments
vercel inspect <url>            # inspect a deployment
vercel logs <url>               # tail logs
vercel env ls                   # list env vars for current project
vercel rollback                 # roll back to the previous deployment
```

### MongoDB (Atlas shell / Compass)

```
Collection: users   — userId, googleId, username, email, avatar, coins, xp, highScore
Collection: scores  — userId, username, score, combo, accuracy, rounds, coins, mode, createdAt
```

---

## Google Sign-In setup

Three OAuth client IDs are needed — one per platform.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. **Web** client (used by the web export and as the backend `audience`):
   - Type: *Web application*
   - Authorized JavaScript Origins: `https://neurorush-app.vercel.app`, `http://localhost:8081`
3. **iOS** client (used by the native iOS app):
   - Type: *iOS*
   - Bundle ID: `com.pixelbyte.neurorush`
4. **Android** client (used by the native Android app):
   - Type: *Android*
   - Package name: `com.pixelbyte.neurorush`
   - SHA-1 fingerprint: get from `eas credentials` for your build profile
5. Set env vars:
   - `app/.env.production` → `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `backend/.env.local` (and Vercel) → `GOOGLE_WEB_CLIENT_ID` (same value as web client ID)
6. Set the reversed iOS client ID in `app/app.json` under the `@react-native-google-signin/google-signin` plugin's `iosUrlScheme` (format: `com.googleusercontent.apps.<hash>-<digits>`).
7. **Native builds require an EAS dev build** — `@react-native-google-signin/google-signin` does not work in Expo Go.

---

## Game modes

| Mode | Description |
|---|---|
| **Trivia Blitz** | Answer trivia questions by tapping correct bubbles — 60 s rounds |
| **Galactic Battle** | Shoot enemies and survive bosses across escalating stages |
| **Daily Challenge** | One curated category per day with a special reward |

Scores submit to the leaderboard when a user is signed in with Google.

---

## Environment variable reference

### Backend (`backend/.env.local` — **never commit**)

| Variable | Description |
|---|---|
| `MONGODB_URI` | Atlas connection string (encode `@` in password as `%40`) |
| `JWT_SECRET` | Secret for signing 90-day JWTs |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST token |
| `GOOGLE_WEB_CLIENT_ID` | Google Web OAuth client ID — used as the `audience` when verifying ID tokens |
| `ADMIN_SECRET` | Optional — protects the `/api/admin/clear` endpoint |

### Frontend (`app/.env.production` — committed, public values)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend base URL (baked into bundle at build time) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Web OAuth client ID — required for web sign-in and to issue ID tokens on native |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google iOS OAuth client ID — required for iOS native sign-in |
