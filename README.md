# YuMi

YuMi is the codebase developed for the Web Development Project course. It is a campus local guide that helps users discover and review places, allows vendors to manage and claim locations, and provides administrators with moderation and ownership workflows.

The project was built as a full-stack team application around three roles. Customers explore the map, contribute places, write reviews, and report inaccurate content. Vendors verify their accounts, claim or request access to locations, manage business information, and respond to customers. Administrators review submissions, resolve reports and ownership conflicts, and maintain the platform.

YuMi models the complete lifecycle of community-managed location data rather than a simple directory. Important actions move through validation, approval, dispute, and appeal stages, supported by notifications, audit logs, and trust records.

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

## Getting Started

Requirements:

- Node.js and npm
- MongoDB
- Supabase project for file storage
- Goong Maps API key

Install dependencies:

```bash
npm install
```

Create local, untracked environment files:

`apps/api/.env`

```env
PORT=9999
MONGODB_URL=
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
PASSWORD_RESET_CODE_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

`apps/mobile/.env`

```env
EXPO_PUBLIC_BASE_URL=http://localhost:9999/api
EXPO_PUBLIC_MAP_API=
EXPO_PUBLIC_VERBOSE=0
```

For an Android emulator, use `http://10.0.2.2:9999/api` as the API base URL. Never commit environment files or credentials.

Start all applications:

```bash
npm run dev
```

The API runs on `http://localhost:9999/api`, Swagger documentation is available at `http://localhost:9999/api/docs`, and the admin application runs on `http://localhost:3001`.

Run applications individually:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```
