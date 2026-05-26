# Monorepo Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a pnpm monorepo with NestJS API, Next.js 15 web, Expo mobile, and a shared TypeScript package — all cloud-backed (MongoDB Atlas + Supabase storage).

**Architecture:** Single pnpm workspace at the repo root with `apps/*` and `packages/*` globs. Each app is initialized with its official CLI, then libraries are installed workspace-wide via pnpm. The shared package exports raw TypeScript source consumed directly by each app's compiler.

**Tech Stack:** pnpm 9+, Node 20 LTS, NestJS 10, Next.js 15, Expo SDK 52, TypeScript 5, concurrently

---

## File Map

### Root
- Create: `pnpm-workspace.yaml`
- Create: `package.json`

### apps/api (NestJS)
- Create via CLI: `apps/api/` (all NestJS scaffold files)
- Delete: `apps/api/src/app.controller.ts`
- Delete: `apps/api/src/app.controller.spec.ts`
- Delete: `apps/api/src/app.service.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`
- Create: `apps/api/src/modules/` (empty dir)
- Create: `apps/api/src/common/guards/`
- Create: `apps/api/src/common/decorators/`
- Create: `apps/api/src/common/filters/`
- Create: `apps/api/src/common/interceptors/`
- Create: `apps/api/src/config/`
- Create: `apps/api/.env.example`

### apps/web (Next.js 15)
- Create via CLI: `apps/web/` (all Next.js scaffold files)
- Create: `apps/web/src/components/`
- Create: `apps/web/src/lib/`
- Create: `apps/web/src/hooks/`
- Create: `apps/web/src/types/`
- Create: `apps/web/.env.example`

### apps/mobile (Expo)
- Create via CLI: `apps/mobile/` (Expo Router default template)
- Create: `apps/mobile/src/components/`
- Create: `apps/mobile/src/hooks/`
- Create: `apps/mobile/src/services/`
- Create: `apps/mobile/src/types/`
- Create: `apps/mobile/.env.example`

> **Note:** Expo Router requires `app/` at the project root — cannot be moved to `src/app/`. Other dirs (components, hooks, services, types) live under `src/`.

### packages/shared
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/constants/index.ts`

### Placeholders
- Create: `.claude/CLAUDE.md`
- Create: `.agents/rules/.gitkeep`

---

## Task 1: Initialize Monorepo Root

**Files:** `package.json`, `pnpm-workspace.yaml`

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Save to: `pnpm-workspace.yaml`

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "wdp301",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm dev:api\" \"pnpm dev:web\" \"pnpm dev:mobile\"",
    "dev:api": "pnpm --filter api start:dev",
    "dev:web": "pnpm --filter web dev",
    "dev:mobile": "pnpm --filter mobile start"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

Save to: `package.json`

- [ ] **Step 3: Install root devDependencies**

```powershell
pnpm install
```

Expected: `node_modules/` created at root, `pnpm-lock.yaml` created.

- [ ] **Step 4: Verify concurrently is available**

```powershell
npx concurrently --version
```

Expected: prints a version number like `9.x.x`.

---

## Task 2: Initialize NestJS API

**Files:** `apps/api/` (entire directory via CLI)

- [ ] **Step 1: Create apps/ directory**

```powershell
New-Item -ItemType Directory -Force apps
```

- [ ] **Step 2: Run NestJS CLI**

```powershell
cd apps
npx @nestjs/cli@latest new api --package-manager pnpm --skip-git --strict --skip-install
cd ..
```

Expected: `apps/api/` created with `src/`, `package.json`, `tsconfig.json`, `nest-cli.json`.

- [ ] **Step 3: Install API libraries**

```powershell
pnpm --filter api add @nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs @nestjs/config @nestjs/swagger swagger-ui-express class-validator class-transformer helmet @nestjs/throttler @supabase/supabase-js
```

- [ ] **Step 4: Install API type definitions**

```powershell
pnpm --filter api add -D @types/passport-jwt @types/bcryptjs
```

- [ ] **Step 5: Run pnpm install to sync workspace**

```powershell
pnpm install
```

---

## Task 3: Restructure NestJS src/

**Files:** `apps/api/src/app.module.ts`, `apps/api/src/main.ts`, various new directories

- [ ] **Step 1: Delete example controller and service**

```powershell
Remove-Item apps/api/src/app.controller.ts
Remove-Item apps/api/src/app.controller.spec.ts
Remove-Item apps/api/src/app.service.ts
```

- [ ] **Step 2: Create folder structure**

```powershell
New-Item -ItemType Directory -Force apps/api/src/modules
New-Item -ItemType Directory -Force apps/api/src/common/guards
New-Item -ItemType Directory -Force apps/api/src/common/decorators
New-Item -ItemType Directory -Force apps/api/src/common/filters
New-Item -ItemType Directory -Force apps/api/src/common/interceptors
New-Item -ItemType Directory -Force apps/api/src/config
```

- [ ] **Step 3: Rewrite app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
  ],
})
export class AppModule {}
```

Save to: `apps/api/src/app.module.ts`

- [ ] **Step 4: Rewrite main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('WDP301 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
```

Save to: `apps/api/src/main.ts`

- [ ] **Step 5: Create .env.example**

```
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/wdp301
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Save to: `apps/api/.env.example`

- [ ] **Step 6: Verify API compiles**

```powershell
pnpm --filter api build
```

Expected: `dist/` created, no TypeScript errors.

---

## Task 4: Initialize Next.js Web

**Files:** `apps/web/` (via CLI), additional src/ directories

- [ ] **Step 1: Run create-next-app**

```powershell
cd apps
npx create-next-app@latest web --typescript --app --src-dir --no-tailwind --import-alias "@/*"
cd ..
```

When prompted for any remaining options, accept defaults. Expected: `apps/web/` created with `src/app/`, `package.json`, `tsconfig.json`.

- [ ] **Step 2: Create additional src/ directories**

```powershell
New-Item -ItemType Directory -Force apps/web/src/components
New-Item -ItemType Directory -Force apps/web/src/lib
New-Item -ItemType Directory -Force apps/web/src/hooks
New-Item -ItemType Directory -Force apps/web/src/types
```

- [ ] **Step 3: Install web libraries**

```powershell
pnpm --filter web add @mui/material @mui/icons-material @emotion/react @emotion/styled axios react-hook-form @hookform/resolvers zod jose @goongmaps/goong-js dayjs clsx
```

- [ ] **Step 4: Sync workspace**

```powershell
pnpm install
```

- [ ] **Step 5: Create .env.example**

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Save to: `apps/web/.env.example`

- [ ] **Step 6: Configure transpilePackages for shared**

Open `apps/web/next.config.ts` and update to:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@wdp301/shared'],
};

export default nextConfig;
```

This tells Next.js to compile the shared package's TypeScript source directly.

- [ ] **Step 7: Verify web compiles**

```powershell
pnpm --filter web build
```

Expected: `.next/` created, no TypeScript errors.

---

## Task 5: Initialize Expo Mobile

**Files:** `apps/mobile/` (via CLI), src/ directories

- [ ] **Step 1: Run create-expo-app**

```powershell
cd apps
npx create-expo-app@latest mobile
cd ..
```

Expected: `apps/mobile/` created with Expo Router template (includes `app/`, `package.json`, `app.json`).

- [ ] **Step 2: Create src/ directories**

```powershell
New-Item -ItemType Directory -Force apps/mobile/src/components
New-Item -ItemType Directory -Force apps/mobile/src/hooks
New-Item -ItemType Directory -Force apps/mobile/src/services
New-Item -ItemType Directory -Force apps/mobile/src/types
```

- [ ] **Step 3: Install Expo-managed libraries**

Run from inside `apps/mobile/` so `expo install` can resolve SDK compatibility.

> **Note:** `expo-router` is already included in the default Expo template — do not install it again.

```powershell
cd apps/mobile
npx expo install expo-location expo-image-picker expo-secure-store @react-native-async-storage/async-storage react-native-maps
cd ../..
```

- [ ] **Step 4: Install pnpm-managed libraries**

```powershell
pnpm --filter mobile add axios react-hook-form @hookform/resolvers zod nativewind
pnpm --filter mobile add -D tailwindcss
```

- [ ] **Step 5: Configure nativewind**

Create `apps/mobile/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

Create `apps/mobile/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Add the CSS import to `apps/mobile/app/_layout.tsx` (or the root layout file). Open the file and add at the top:

```typescript
import '../global.css';
```

- [ ] **Step 6: Configure babel for nativewind**

Open `apps/mobile/babel.config.js` and update to:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

- [ ] **Step 7: Create .env.example**

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Save to: `apps/mobile/.env.example`

- [ ] **Step 8: Sync workspace**

```powershell
pnpm install
```

---

## Task 6: Initialize Shared Package

**Files:** `packages/shared/package.json`, `tsconfig.json`, `src/`

- [ ] **Step 1: Create packages/ directory**

```powershell
New-Item -ItemType Directory -Force packages/shared/src/types
New-Item -ItemType Directory -Force packages/shared/src/constants
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@wdp301/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

Save to: `packages/shared/package.json`

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

Save to: `packages/shared/tsconfig.json`

- [ ] **Step 4: Create src/types/index.ts**

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
```

Save to: `packages/shared/src/types/index.ts`

- [ ] **Step 5: Create src/constants/index.ts**

```typescript
export const APP_NAME = 'WDP301';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;
```

Save to: `packages/shared/src/constants/index.ts`

- [ ] **Step 6: Create src/index.ts**

```typescript
export * from './types';
export * from './constants';
```

Save to: `packages/shared/src/index.ts`

---

## Task 7: Wire Shared Package

**Files:** `apps/api/package.json`, `apps/web/package.json`, `apps/mobile/package.json`

- [ ] **Step 1: Add shared as dependency in all apps**

```powershell
pnpm --filter api add @wdp301/shared@workspace:*
pnpm --filter web add @wdp301/shared@workspace:*
pnpm --filter mobile add @wdp301/shared@workspace:*
```

- [ ] **Step 2: Sync workspace**

```powershell
pnpm install
```

- [ ] **Step 3: Verify shared types resolve in API**

Open `apps/api/src/app.module.ts` and add a temporary import at the top (do not save permanently — just verify):

```typescript
import type { ApiResponse } from '@wdp301/shared';
```

Run:

```powershell
pnpm --filter api build
```

Expected: compiles without errors. Remove the test import after confirming.

---

## Task 8: Create Placeholder Files

**Files:** `.claude/CLAUDE.md`, `.agents/rules/.gitkeep`

- [ ] **Step 1: Create .claude/ placeholder**

```powershell
New-Item -ItemType Directory -Force .claude/commands
```

Create `.claude/CLAUDE.md` with content:

```markdown
# WDP301 Project

<!-- Add project-specific Claude instructions here -->
```

- [ ] **Step 2: Create .agents/ placeholder**

```powershell
New-Item -ItemType Directory -Force .agents/rules
New-Item -ItemType File -Force .agents/rules/.gitkeep
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full workspace install**

```powershell
pnpm install
```

Expected: no errors, all workspace packages linked.

- [ ] **Step 2: Verify API starts**

Open a new terminal and run:

```powershell
pnpm dev:api
```

Expected: output contains `[Nest] ... Application is running on: http://[::1]:3000`.

If `MONGODB_URI` is not set, NestJS will throw on startup — that is expected at this stage. The key check is that TypeScript compiled and bootstrap ran. Copy `.env.example` to `.env` and fill in your MongoDB Atlas URI to test a full start.

- [ ] **Step 3: Verify web starts**

```powershell
pnpm dev:web
```

Expected: Next.js dev server starts at `http://localhost:3001` (or 3000 if api is not running). Browser shows default Next.js page.

- [ ] **Step 4: Verify mobile starts**

```powershell
pnpm dev:mobile
```

Expected: Expo Metro bundler starts, QR code shown. App loads on device/emulator via Expo Go.

- [ ] **Step 5: Run all together**

```powershell
pnpm dev
```

Expected: concurrently starts all three with color-coded output labels.
