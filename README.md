# YuMi

YuMi is the codebase developed for the Web Development Project course. It is a campus local guide that helps users discover and review places, allows vendors to manage and claim locations, and provides administrators with moderation and ownership workflows.

The project models the lifecycle of community-managed location data: submissions, validation, approvals, ownership claims, access requests, disputes, appeals, notifications, audit logs, and trust records.

## Main Features

- Map-based place discovery, search, bookmarks, reviews, and contributions
- Vendor registration, location ownership claims, products, and edit suggestions
- Location access requests, ownership disputes, and appeals
- Admin management for locations, claims, reports, categories, users, and audit logs
- Notifications, trust events, image uploads, email, and OTP verification

## Project Structure

| Path | Application |
| --- | --- |
| `apps/api` | NestJS REST API with MongoDB |
| `apps/mobile` | Expo and React Native mobile application |
| `apps/web` | Next.js administration application |
| `packages/shared` | Shared TypeScript contracts and utilities |

## Technology

TypeScript, NestJS, MongoDB, Expo, React Native, Next.js, Material UI, Supabase Storage, and Goong Maps.

## Prerequisites

Install the following tools before setting up the project:

- Node.js 20 or later
- npm 10 or later
- MongoDB running locally, or a MongoDB connection string
- Supabase project for file storage
- Goong Maps API key
- Expo tooling for mobile development
- Android Studio for Android emulator/device builds
- Xcode for iOS builds, if you are working on macOS

Check your Node and npm versions:

```bash
node --version
npm --version
```

## 1. Install Dependencies

From the repository root, install all workspace dependencies:

```bash
npm install
```

This installs dependencies for the API, web app, mobile app, and shared package.

## 2. Configure Environment Variables

Create local, untracked environment files. Never commit environment files or credentials.

### API Environment

Create the API environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Update `apps/api/.env`:

```env
PORT=9999
VERBOSE=1
MONGODB_URL=mongodb://127.0.0.1:27017/wdp301
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
PASSWORD_RESET_CODE_SECRET=replace-with-a-long-random-secret
ESMS_API_KEY=
ESMS_SECRET_KEY=
ESMS_BRANDNAME=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=avatars
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=YuMi <no-reply@example.com>
```

Required for local startup:

- `MONGODB_URL`
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `PASSWORD_RESET_CODE_SECRET`

Optional local integrations:

- `ESMS_API_KEY`, `ESMS_SECRET_KEY`, and `ESMS_BRANDNAME` are only required for production SMS OTP delivery. In local development, OTP codes are logged to the API console.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required for password reset email delivery.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` are required for Supabase-backed image uploads.

### Mobile Environment

Create the mobile environment file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Default mobile values:

```env
EXPO_PUBLIC_BASE_URL=http://localhost:9999/api
EXPO_PUBLIC_MAP_API=
EXPO_PUBLIC_VERBOSE=1
```

Use these API URLs depending on where the app runs:

- Android emulator: `http://10.0.2.2:9999/api`
- iOS simulator: `http://localhost:9999/api`
- Physical device: `http://<your-computer-LAN-IP>:9999/api`

Example for a physical device:

```env
EXPO_PUBLIC_BASE_URL=http://192.168.1.20:9999/api
EXPO_PUBLIC_VERBOSE=1
```

### Web Environment

The web app uses this default API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:9999/api
```

If you need to override it, create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:9999/api
NEXT_PUBLIC_VERBOSE=1
```

## 3. Start MongoDB

If MongoDB is installed locally, make sure the service is running before starting the API.

The default local connection string is:

```env
mongodb://127.0.0.1:27017/wdp301
```

You can also use MongoDB Atlas by replacing `MONGODB_URL` in `apps/api/.env`.

## 4. Reset Demo Data

Configure `apps/api/.env` so `MONGODB_URL` points to a database named
exactly `demo`, then run:

```bash
npm run demo:reset --workspace=api
```

The command refuses every other database name. It removes existing documents
in `demo` while preserving collection indexes, rebuilds the complete demo
dataset, and prints the available accounts and workflow scenarios. All demo
accounts use the shared password `Demo@123456`.

## 5. Run the Applications

Run everything from the repository root:

```bash
npm run dev
```

This starts:

- API server on `http://localhost:9999/api`
- Swagger API docs on `http://localhost:9999/api/docs`
- Admin web app on `http://localhost:3001`
- Expo mobile development server

Run applications individually:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

You can also run:

```bash
npm run android
npm run ios
npm run web
```

## 6. Build and Test

Build the shared package:

```bash
npm run build --workspace=@wdp301/shared
```

Build the API:

```bash
npm run build --workspace=api
```

Build the web app:

```bash
npm run build --workspace=web
```

Run all available workspace tests:

```bash
npm test
```

Run tests for a single workspace:

```bash
npm test --workspace=api
npm test --workspace=web
npm test --workspace=mobile
```

## Troubleshooting

### API Cannot Connect to MongoDB

Check that MongoDB is running and that `MONGODB_URL` in `apps/api/.env` is correct.

### Web or Mobile Cannot Reach the API

Confirm that the API is running on port `9999`.

For physical mobile devices, `localhost` points to the phone, not your computer. Set `EXPO_PUBLIC_BASE_URL` to your computer's LAN IP address.

### Authentication Fails After Login

Check that these secrets are present in `apps/api/.env`:

```env
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
PASSWORD_RESET_CODE_SECRET=...
```

Restart the API after changing environment variables.

### Image Upload Fails

Configure Supabase in `apps/api/.env`:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=avatars
```

Make sure the storage bucket exists in Supabase.

### Password Reset Email Fails

Configure Resend in `apps/api/.env`:

```env
RESEND_API_KEY=...
RESEND_FROM_EMAIL=YuMi <no-reply@example.com>
```

### SMS OTP Does Not Send Locally

Local development does not send paid SMS messages. OTP codes are printed in the API console unless `NODE_ENV=production`.
