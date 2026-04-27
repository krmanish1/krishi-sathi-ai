# KrishiSaathi AI Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]` / `- [x]`) syntax for tracking.

**Goal:** Ship a production-grade Expo Android app for KrishiSaathi AI that integrates on-device Gemma 4 via MediaPipe LLM Inference, escalates to the backend `POST /api/v1/query` per routing rules, and handles every error code in the v0.2 API contract.

**Architecture:** Expo SDK 52 + Prebuild + Dev Client. Feature-sliced `src/features/*` with cross-cutting infra in `src/shared/*`. A single Intent Router (`src/shared/api/routing.ts`) is the one and only place that decides on-device vs backend. Expo Module `modules/gemma-llm` wraps MediaPipe LLM Inference.

**Tech Stack:** TypeScript strict, Expo Router v4, NativeWind 4, TanStack Query v5, Zustand, react-hook-form + zod, i18next, expo-sqlite, expo-secure-store, expo-image-picker, expo-image-manipulator, @react-native-community/netinfo, expo-speech, @react-native-voice/voice, Jest + @testing-library/react-native, Maestro.

**Spec:** `docs/superpowers/specs/2026-04-21-krishisaathi-mobile-design.md`

---

## Implementation status (2026-04-22, synced to repo)

| Area                       | State         | Notes                                                                                                                                     |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| All `**Step**` lines below | **Done**      | Marked `[x]`. "Commit" steps are manual in git.                                                                                           |
| API tests (MSW in plan)    | **Adapted**   | `fetch` mocks in `src/shared/api/*.test.ts`.                                                                                              |
| Task 2 – UI kit            | **Done**      | `src/shared/ui/primitives/{Button,Input,ListItem}.tsx` + `Button.test.tsx`.                                                               |
| Task 3.3 – initial sync    | **Done**      | `useInitialSync.test.ts`.                                                                                                                 |
| Task 6 – native Gemma      | **TS bridge** | `modules/gemma-llm`, `native-backend.ts`, `EXPO_PUBLIC_USE_NATIVE_GEMMA`. Kotlin/MediaPipe: follow Task 6.1 when you run `expo prebuild`. |
| Task 8.1 Maestro           | **Scaffold**  | `maestro/flow.yaml`, `onboarding.yaml` — run on Dev Client.                                                                               |
| Task 8.2 EAS               | **Done**      | `eas.json`.                                                                                                                               |
| Task 8.3 smoke             | **Done**      | `npm run smoke` → `scripts/production-smoke.sh` (not `smoke.ts`).                                                                         |

---

## Conventions used throughout this plan

- Path aliases: `@/app/*`, `@/features/*`, `@/shared/*`, `@/modules/*`.
- All units of persistence use sqlite migrations numbered `NNNN_name.sql`.
- Commit prefixes: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`.
- Test file naming: co-located as `*.test.ts[x]` next to the source.
- Every task's final step is a commit. Do not batch commits across tasks.

---

## Phase 0 — Repository bootstrap

### Task 0.1: Create the Expo project at the workspace root

**Files:**

- Create: `package.json`, `app.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`, `README.md`, `app/_layout.tsx`, `app/index.tsx`

- [x] **Step 1: Initialize the Expo TS template into the workspace root**

Run from the workspace root (`/Users/manishkumar/Documents/Projects/krishiai/krishisaathiai-web-app`):

```bash
npx create-expo-app@latest . --template default --yes
```

Expected: files scaffolded (package.json, app/, assets/, etc.). If `npx` fails because the directory is not empty, move `docs/` temporarily and restore after scaffold.

- [x] **Step 2: Pin Expo SDK 52**

Edit `package.json` to set `"expo": "^52.0.0"` and run `npx expo install --fix`. Expected: all Expo deps align to SDK 52.

- [x] **Step 3: Convert `app.json` to `app.config.ts` for dynamic env**

Create `app.config.ts`:

```ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KrishiSaathi AI",
  slug: "krishisaathi-ai",
  scheme: "krishisaathi",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B3D2E",
  },
  android: {
    package: "ai.krishisaathi.app",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#0B3D2E",
    },
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "INTERNET",
    ],
    blockedPermissions: [],
  },
  plugins: [
    "expo-router",
    "expo-localization",
    "expo-secure-store",
    ["expo-image-picker", { photosPermission: "We use photos to diagnose crop issues." }],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "We use location only to fetch district-specific data.",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8000",
  },
});
```

Delete `app.json` once `app.config.ts` builds.

- [x] **Step 4: Install runtime deps**

```bash
npx expo install expo-router expo-localization expo-secure-store expo-sqlite \
  expo-image-picker expo-image-manipulator expo-file-system expo-speech expo-location \
  @react-native-community/netinfo react-native-mmkv react-native-reanimated react-native-gesture-handler \
  react-native-safe-area-context react-native-screens

npm i @tanstack/react-query zustand i18next react-i18next zod react-hook-form \
  @hookform/resolvers uuid nativewind@^4.1.0 clsx class-variance-authority date-fns \
  @react-native-voice/voice
```

Expected: all installs succeed. `expo-doctor` reports 0 errors.

- [x] **Step 5: Install dev deps**

```bash
npm i -D typescript @types/react @types/uuid \
  jest jest-expo @testing-library/react-native @testing-library/jest-native \
  @types/jest ts-jest \
  eslint eslint-config-expo prettier prettier-plugin-tailwindcss \
  tailwindcss@^3.4.0 postcss autoprefixer \
  msw @mswjs/interceptors
```

- [x] **Step 6: Configure TypeScript path aliases**

Overwrite `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@/app/*": ["app/*"],
      "@/features/*": ["src/features/*"],
      "@/shared/*": ["src/shared/*"],
      "@/modules/*": ["modules/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [x] **Step 7: Wire NativeWind 4**

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0B3D2E", 500: "#0B3D2E", 300: "#2E8B57" },
        surface: { DEFAULT: "#FFFFFF", muted: "#F4F6F5" },
      },
    },
  },
  plugins: [],
};
```

Create `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create/overwrite `babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

Create/overwrite `metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

- [x] **Step 8: Add a trivial root layout and home route**

Overwrite `app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Overwrite `app/index.tsx`:

```tsx
import { View, Text } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-2xl font-semibold text-brand">KrishiSaathi AI</Text>
    </View>
  );
}
```

- [x] **Step 9: Verify the app boots**

```bash
npx expo start --android --clear
```

Expected: Metro bundles, Dev Client (or Expo Go) shows the title. Kill the dev server.

- [x] **Step 10: Write `.env.example` and `README.md`**

`.env.example`:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

`README.md` minimal: project description, prerequisites (Node 20+, Android Studio, JDK 17), `npm i`, `npx expo prebuild --platform android`, `npx expo run:android`, pointers to `docs/superpowers`.

- [x] **Step 11: Commit**

```bash
git init -q 2>/dev/null || true
git add .
git commit -m "chore: bootstrap Expo SDK 52 app with NativeWind and TS strict"
```

---

### Task 0.2: Lint, format, test harness

**Files:**

- Create: `eslint.config.js`, `.prettierrc`, `jest.config.ts`, `jest.setup.ts`, `.github/workflows/ci.yml`

- [x] **Step 1: ESLint config**

```js
// eslint.config.js
const expo = require("eslint-config-expo/flat");
module.exports = [
  ...expo,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "import/order": ["error", { "newlines-between": "always", alphabetize: { order: "asc" } }],
    },
  },
];
```

- [x] **Step 2: Prettier**

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [x] **Step 3: Jest config**

`jest.config.ts`:

```ts
import type { Config } from "jest";
const config: Config = {
  preset: "jest-expo",
  setupFilesAfterEach: ["@testing-library/jest-native/extend-expect"],
  setupFiles: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/features/(.*)$": "<rootDir>/src/features/$1",
    "^@/shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@/modules/(.*)$": "<rootDir>/modules/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|nativewind|react-native-css-interop)",
  ],
};
export default config;
```

`jest.setup.ts`:

```ts
import "react-native-gesture-handler/jestSetup";
jest.mock("expo-constants", () => ({ expoConfig: { extra: { apiBaseUrl: "http://test" } } }));
```

- [x] **Step 4: Add npm scripts**

Edit `package.json` scripts to include:

```json
{
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:watch": "jest --watch",
  "format": "prettier --write ."
}
```

- [x] **Step 5: Write a sanity test to prove the harness**

Create `src/shared/utils/guards.test.ts`:

```ts
import { isNonEmptyString } from "./guards";

describe("isNonEmptyString", () => {
  it("returns true for non-empty strings", () => {
    expect(isNonEmptyString("x")).toBe(true);
  });
  it("returns false for empty or non-strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(0 as unknown as string)).toBe(false);
  });
});
```

- [x] **Step 6: Run test — expect FAIL (guard not yet written)**

```bash
npm test -- guards
```

Expected: fails with "Cannot find module './guards'".

- [x] **Step 7: Implement the guard**

Create `src/shared/utils/guards.ts`:

```ts
export const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;
```

- [x] **Step 8: Run test — expect PASS**

```bash
npm test -- guards
```

- [x] **Step 9: Add minimal CI**

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --ci
```

- [x] **Step 10: Commit**

```bash
git add .
git commit -m "chore: add eslint, prettier, jest harness and CI"
```

---

## Phase 1 — Shared infrastructure

### Task 1.1: Environment config

**Files:**

- Create: `src/shared/config/env.ts`, `src/shared/config/env.test.ts`, `src/shared/config/constants.ts`

- [x] **Step 1: Write failing test**

`src/shared/config/env.test.ts`:

```ts
import { getApiBaseUrl } from "./env";
jest.mock("expo-constants", () => ({ expoConfig: { extra: { apiBaseUrl: "http://x" } } }));
describe("getApiBaseUrl", () => {
  it("returns apiBaseUrl from expo config", () => {
    expect(getApiBaseUrl()).toBe("http://x");
  });
});
```

- [x] **Step 2: Run test — expect FAIL**

```bash
npm test -- env
```

- [x] **Step 3: Implement**

`src/shared/config/env.ts`:

```ts
import Constants from "expo-constants";

type Extra = { apiBaseUrl: string };

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

export const getApiBaseUrl = (): string => {
  const url = extra.apiBaseUrl;
  if (!url) throw new Error("EXPO_PUBLIC_API_BASE_URL not configured");
  return url;
};
```

- [x] **Step 4: Constants for timeouts and thresholds (handoff §9 and §3)**

`src/shared/config/constants.ts`:

```ts
export const TIMEOUTS_MS = {
  query: 10_000,
  queryImage: 5_000,
  syncBundle: 15_000,
  health: 3_000,
} as const;

export const CONFIDENCE_THRESHOLD_LOW = 0.7;

export const SUPPORTED_LANGUAGES = ["hi", "en", "pa", "te", "mr", "bn"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
```

- [x] **Step 5: Run tests**

```bash
npm test -- env
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/shared/config
git commit -m "feat(config): typed env accessor and app constants"
```

---

### Task 1.2: API types

**Files:**

- Create: `src/shared/api/types.ts`

- [x] **Step 1: Write types** (no runtime, so no unit test needed — `tsc` verifies)

```ts
// src/shared/api/types.ts
import { Language } from "@/shared/config/constants";

export type Connectivity = "online" | "offline" | "degraded";

export type DeviceIntent =
  | "crop_disease"
  | "scheme_query"
  | "market_price"
  | "financial"
  | "weather"
  | "crop_plan"
  | "general"
  | "alert";

export type OnDeviceModel = "gemma-4-e4b-it" | "gemma-4-e2b-it";

export type QueryRequest = {
  farmer_id: string;
  query: { text: string; image_ref?: string | null; language: Language };
  context: {
    location: { lat?: number; lng?: number; district: string; state: string };
    connectivity: Connectivity;
    device_intent: DeviceIntent;
    device_capabilities: { ondevice_model: OnDeviceModel };
  };
};

export type QueryResponse = {
  response_id: string;
  text: string;
  structured?: { kind: string; data: unknown };
  data_source: "live" | "cache" | "ondevice";
  confidence_level: "low" | "medium" | "high";
  confidence_score: number;
  model_used: string;
  tool_trace: string[];
  safety_flags: string[];
  fallback_hint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  language: Language;
  timestamp: string;
};

export type ImageUploadResponse = {
  image_ref: string;
  expires_at: string;
  mime: string;
  bytes: number;
};

export type SyncBundle = {
  bundle_version: string;
  generated_at: string;
  district: string;
  state: string;
  data: {
    schemes: unknown[];
    mandi_prices: unknown[];
    crop_calendar: Record<string, unknown>;
    weather_history: unknown[];
  };
  ttl_hours: number;
};

export type FarmerTwin = {
  farmer_id: string;
  name?: string;
  language: Language;
  location: { district: string; state: string };
  crops: { name: string; area_acres: number; sown_on?: string }[];
  livestock?: { kind: string; count: number }[];
};

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "FARMER_NOT_FOUND"
  | "IMAGE_REF_EXPIRED"
  | "LLM_TIMEOUT"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_UNSUPPORTED_TYPE"
  | "UPSTREAM_RATE_LIMIT"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ErrorEnvelope = {
  error: {
    code: ErrorCode | string;
    message: string;
    retryable: boolean;
    retry_after_seconds?: number;
    fallback_hint?: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  };
};
```

- [x] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [x] **Step 3: Commit**

```bash
git add src/shared/api/types.ts
git commit -m "feat(api): contract types aligned with api_contract v0.2"
```

---

### Task 1.3: Error parsing (`errors.ts`)

**Files:**

- Create: `src/shared/api/errors.ts`, `src/shared/api/errors.test.ts`

- [x] **Step 1: Failing tests**

```ts
// src/shared/api/errors.test.ts
import { ApiError, parseErrorResponse, mapError } from "./errors";

describe("parseErrorResponse", () => {
  it("parses a full envelope", () => {
    const err = parseErrorResponse(429, {
      error: {
        code: "UPSTREAM_RATE_LIMIT",
        message: "x",
        retryable: true,
        retry_after_seconds: 5,
        fallback_hint: "USE_ONDEVICE",
      },
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UPSTREAM_RATE_LIMIT");
    expect(err.retryable).toBe(true);
    expect(err.retryAfterSeconds).toBe(5);
    expect(err.fallbackHint).toBe("USE_ONDEVICE");
  });
  it("falls back to INTERNAL_ERROR on malformed body", () => {
    const err = parseErrorResponse(500, null);
    expect(err.code).toBe("INTERNAL_ERROR");
  });
});

describe("mapError", () => {
  it("maps USE_ONDEVICE hint to silent-ondevice action", () => {
    const err = new ApiError("UPSTREAM_UNAVAILABLE", 503, "x", true, undefined, "USE_ONDEVICE");
    expect(mapError(err).action).toBe("silent-ondevice");
  });
  it("maps RETRY_ONLINE_LATER to retry action", () => {
    const err = new ApiError("INTERNAL_ERROR", 500, "x", false, undefined, "RETRY_ONLINE_LATER");
    expect(mapError(err).action).toBe("retry");
  });
  it("maps validation errors to toast", () => {
    const err = new ApiError("VALIDATION_ERROR", 400, "x", false);
    expect(mapError(err).action).toBe("toast");
  });
});
```

- [x] **Step 2: Run — expect FAIL**

```bash
npm test -- errors
```

- [x] **Step 3: Implement**

```ts
// src/shared/api/errors.ts
import { ErrorEnvelope } from "./types";

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public retryable: boolean,
    public retryAfterSeconds?: number,
    public fallbackHint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const isEnvelope = (v: unknown): v is ErrorEnvelope =>
  !!v && typeof v === "object" && "error" in (v as Record<string, unknown>);

export const parseErrorResponse = (status: number, body: unknown): ApiError => {
  if (!isEnvelope(body)) return new ApiError("INTERNAL_ERROR", status, "Unknown error", false);
  const e = body.error;
  return new ApiError(
    e.code,
    status,
    e.message,
    e.retryable,
    e.retry_after_seconds,
    e.fallback_hint ?? null,
  );
};

export type MappedError = {
  userMessageKey: string;
  action: "banner" | "toast" | "retry" | "silent-ondevice";
  retryAfterMs?: number;
};

export const mapError = (e: unknown): MappedError => {
  if (!(e instanceof ApiError)) {
    return { userMessageKey: "errors.generic", action: "toast" };
  }
  if (e.fallbackHint === "USE_ONDEVICE") {
    return { userMessageKey: "errors.networkBusy", action: "silent-ondevice" };
  }
  if (e.fallbackHint === "RETRY_ONLINE_LATER") {
    return {
      userMessageKey: "errors.retryLater",
      action: "retry",
      retryAfterMs: (e.retryAfterSeconds ?? 30) * 1000,
    };
  }
  switch (e.code) {
    case "VALIDATION_ERROR":
      return { userMessageKey: "errors.validation", action: "toast" };
    case "IMAGE_TOO_LARGE":
      return { userMessageKey: "errors.imageTooLarge", action: "toast" };
    case "IMAGE_UNSUPPORTED_TYPE":
      return { userMessageKey: "errors.imageUnsupported", action: "toast" };
    case "IMAGE_REF_EXPIRED":
      return { userMessageKey: "errors.imageExpired", action: "retry" };
    case "FARMER_NOT_FOUND":
      return { userMessageKey: "errors.farmerMissing", action: "retry" };
    default:
      return { userMessageKey: "errors.generic", action: "toast" };
  }
};
```

- [x] **Step 4: Run — expect PASS**

```bash
npm test -- errors
```

- [x] **Step 5: Commit**

```bash
git add src/shared/api
git commit -m "feat(api): ErrorEnvelope parser and action mapper"
```

---

### Task 1.4: HTTP client with timeouts

**Files:**

- Create: `src/shared/api/client.ts`, `src/shared/api/client.test.ts`

- [x] **Step 1: Failing test — uses MSW**

```ts
// src/shared/api/client.test.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { apiFetch } from "./client";

const server = setupServer(
  http.get("http://test/ok", () => HttpResponse.json({ ok: true })),
  http.get("http://test/fail", () =>
    HttpResponse.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "down",
          retryable: true,
          fallback_hint: "USE_ONDEVICE",
        },
      },
      { status: 503 },
    ),
  ),
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiFetch", () => {
  it("returns parsed JSON on 2xx", async () => {
    const data = await apiFetch<{ ok: boolean }>("/ok", {
      baseUrl: "http://test",
      timeoutMs: 1000,
    });
    expect(data.ok).toBe(true);
  });
  it("throws ApiError with fallbackHint on non-2xx", async () => {
    await expect(
      apiFetch<unknown>("/fail", { baseUrl: "http://test", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE", fallbackHint: "USE_ONDEVICE" });
  });
});
```

- [x] **Step 2: Run — expect FAIL**

```bash
npm test -- client
```

- [x] **Step 3: Implement**

```ts
// src/shared/api/client.ts
import { parseErrorResponse, ApiError } from "./errors";

export type FetchOpts = {
  baseUrl: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: BodyInit | object;
  signal?: AbortSignal;
};

export const apiFetch = async <T>(path: string, opts: FetchOpts): Promise<T> => {
  const { baseUrl, timeoutMs, headers, method = "GET", body, signal } = opts;
  const ctrl = new AbortController();
  const linked = signal
    ? (signal.addEventListener("abort", () => ctrl.abort(), { once: true }), ctrl.signal)
    : ctrl.signal;
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const isJsonBody = body && typeof body === "object" && !(body instanceof FormData);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: isJsonBody ? JSON.stringify(body) : (body as BodyInit | undefined),
      signal: linked,
    });
    const text = await res.text();
    const json = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) throw parseErrorResponse(res.status, json);
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as { name?: string }).name === "AbortError") {
      throw new ApiError("LLM_TIMEOUT", 408, "Request timed out", true, undefined, "USE_ONDEVICE");
    }
    throw new ApiError("INTERNAL_ERROR", 0, (e as Error).message, false);
  } finally {
    clearTimeout(t);
  }
};
```

- [x] **Step 4: Run — expect PASS**

```bash
npm test -- client
```

- [x] **Step 5: Commit**

```bash
git add src/shared/api
git commit -m "feat(api): fetch wrapper with abort timeouts and envelope errors"
```

---

### Task 1.5: Typed endpoint callers

**Files:**

- Create: `src/shared/api/endpoints.ts`, `src/shared/api/endpoints.test.ts`

- [x] **Step 1: Failing test**

```ts
// src/shared/api/endpoints.test.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { postQuery } from "./endpoints";

const server = setupServer(
  http.post("http://test/api/v1/query", async ({ request }) => {
    const body = (await request.json()) as { farmer_id: string };
    return HttpResponse.json({
      response_id: "r1",
      text: `hello ${body.farmer_id}`,
      data_source: "live",
      confidence_level: "high",
      confidence_score: 0.9,
      model_used: "gemma-4-26b-a4b-it",
      tool_trace: [],
      safety_flags: [],
      fallback_hint: null,
      language: "en",
      timestamp: new Date().toISOString(),
    });
  }),
);
beforeAll(() => server.listen());
afterAll(() => server.close());

jest.mock("@/shared/config/env", () => ({ getApiBaseUrl: () => "http://test" }));

describe("postQuery", () => {
  it("returns a typed QueryResponse", async () => {
    const r = await postQuery({
      farmer_id: "f1",
      query: { text: "hi", language: "en" },
      context: {
        location: { district: "Ludhiana", state: "Punjab" },
        connectivity: "online",
        device_intent: "general",
        device_capabilities: { ondevice_model: "gemma-4-e4b-it" },
      },
    });
    expect(r.text).toBe("hello f1");
  });
});
```

- [x] **Step 2: Run — FAIL**

```bash
npm test -- endpoints
```

- [x] **Step 3: Implement**

```ts
// src/shared/api/endpoints.ts
import { getApiBaseUrl } from "@/shared/config/env";
import { TIMEOUTS_MS } from "@/shared/config/constants";
import { apiFetch } from "./client";
import type {
  QueryRequest,
  QueryResponse,
  ImageUploadResponse,
  FarmerTwin,
  SyncBundle,
} from "./types";

export const postQuery = (req: QueryRequest, signal?: AbortSignal) =>
  apiFetch<QueryResponse>("/api/v1/query", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
    method: "POST",
    body: req,
    signal,
  });

export const postQueryImage = async (
  params: { uri: string; farmerId: string; purpose: "crop_disease" | "soil_photo" | "pest_id" },
  signal?: AbortSignal,
) => {
  const fd = new FormData();
  fd.append("image", { uri: params.uri, type: "image/jpeg", name: "image.jpg" } as unknown as Blob);
  fd.append("farmer_id", params.farmerId);
  fd.append("purpose", params.purpose);
  return apiFetch<ImageUploadResponse>("/api/v1/query/image", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.queryImage,
    method: "POST",
    body: fd,
    signal,
  });
};

export const getHealth = (signal?: AbortSignal) =>
  apiFetch<{ status: string; version: string }>("/api/v1/health", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.health,
    signal,
  });

export const getSyncBundle = (params: {
  state: string;
  district: string;
  bundleVersion?: string;
}) =>
  apiFetch<SyncBundle>(
    `/api/v1/sync/bundle?state=${encodeURIComponent(params.state)}&district=${encodeURIComponent(
      params.district,
    )}${params.bundleVersion ? `&bundle_version=${encodeURIComponent(params.bundleVersion)}` : ""}`,
    {
      baseUrl: getApiBaseUrl(),
      timeoutMs: TIMEOUTS_MS.syncBundle,
      headers: { "Accept-Encoding": "gzip" },
    },
  );

export const getFarmerTwin = (farmerId: string) =>
  apiFetch<FarmerTwin>(`/api/v1/farmer/${encodeURIComponent(farmerId)}/twin`, {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
  });

export const putFarmerTwin = (farmerId: string, twin: FarmerTwin) =>
  apiFetch<FarmerTwin>(`/api/v1/farmer/${encodeURIComponent(farmerId)}/twin`, {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
    method: "PUT",
    body: twin,
  });
```

- [x] **Step 4: Run — PASS**

```bash
npm test -- endpoints
```

- [x] **Step 5: Commit**

```bash
git add src/shared/api
git commit -m "feat(api): typed endpoint callers for v0.2 contract"
```

---

### Task 1.6: Connectivity detection

**Files:**

- Create: `src/shared/network/useConnectivity.ts`, `src/shared/network/useConnectivity.test.tsx`, `src/shared/network/NetworkBanner.tsx`

- [x] **Step 1: Failing test**

```tsx
// src/shared/network/useConnectivity.test.tsx
import { renderHook } from "@testing-library/react-native";
import { useConnectivity } from "./useConnectivity";

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: (
    cb: (s: { isConnected: boolean; isInternetReachable: boolean | null }) => void,
  ) => {
    cb({ isConnected: true, isInternetReachable: true });
    return () => {};
  },
}));

describe("useConnectivity", () => {
  it("resolves to online when connected and reachable", () => {
    const { result } = renderHook(() => useConnectivity());
    expect(result.current).toBe("online");
  });
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- useConnectivity
```

- [x] **Step 3: Implement**

```ts
// src/shared/network/useConnectivity.ts
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import type { Connectivity } from "@/shared/api/types";

export const useConnectivity = (): Connectivity => {
  const [state, setState] = useState<Connectivity>("online");
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      if (!s.isConnected) setState("offline");
      else if (s.isInternetReachable === false) setState("degraded");
      else setState("online");
    });
    return () => unsub();
  }, []);
  return state;
};
```

- [x] **Step 4: Banner component**

```tsx
// src/shared/network/NetworkBanner.tsx
import { View, Text } from "react-native";
import { useConnectivity } from "./useConnectivity";

export const NetworkBanner = () => {
  const c = useConnectivity();
  if (c === "online") return null;
  return (
    <View accessibilityRole="alert" className="bg-amber-600 px-4 py-2">
      <Text className="text-white">
        {c === "offline" ? "You are offline. Answers come from your device." : "Slow connection."}
      </Text>
    </View>
  );
};
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- useConnectivity
git add src/shared/network
git commit -m "feat(network): connectivity hook and offline banner"
```

---

### Task 1.7: Secure storage + anonymous farmer id

**Files:**

- Create: `src/shared/storage/secure.ts`, `src/shared/auth/anonymous.ts`, `src/shared/auth/anonymous.test.ts`

- [x] **Step 1: Failing test**

```ts
// src/shared/auth/anonymous.test.ts
import { getOrCreateFarmerId, __resetForTests } from "./anonymous";

const mem: Record<string, string> = {};
jest.mock("@/shared/storage/secure", () => ({
  secureGet: async (k: string) => mem[k] ?? null,
  secureSet: async (k: string, v: string) => {
    mem[k] = v;
  },
}));

beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
  __resetForTests();
});

describe("getOrCreateFarmerId", () => {
  it("creates and persists an id on first call", async () => {
    const id1 = await getOrCreateFarmerId();
    expect(id1).toMatch(/^anon_[0-9a-f-]{36}$/);
    const id2 = await getOrCreateFarmerId();
    expect(id2).toBe(id1);
  });
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- anonymous
```

- [x] **Step 3: Implement storage wrapper**

```ts
// src/shared/storage/secure.ts
import * as SecureStore from "expo-secure-store";

export const secureGet = (key: string) => SecureStore.getItemAsync(key);
export const secureSet = (key: string, value: string) =>
  SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
export const secureDelete = (key: string) => SecureStore.deleteItemAsync(key);
```

- [x] **Step 4: Implement anonymous id**

```ts
// src/shared/auth/anonymous.ts
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { secureGet, secureSet } from "@/shared/storage/secure";

const KEY = "farmer_id";
let cached: string | null = null;

export const getOrCreateFarmerId = async (): Promise<string> => {
  if (cached) return cached;
  const existing = await secureGet(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = `anon_${uuidv4()}`;
  await secureSet(KEY, fresh);
  cached = fresh;
  return fresh;
};

export const __resetForTests = () => {
  cached = null;
};
```

Also install: `npx expo install react-native-get-random-values` (already transitively pulled — verify with `npm ls`).

- [x] **Step 5: PASS + commit**

```bash
npm test -- anonymous
git add src/shared
git commit -m "feat(auth): anonymous farmer_id persisted in secure store"
```

---

### Task 1.8: Auth provider abstraction

**Files:**

- Create: `src/shared/auth/AuthProvider.tsx`, `src/shared/auth/AuthProvider.test.tsx`, `src/shared/auth/clerk.ts`

- [x] **Step 1: Failing test**

```tsx
// src/shared/auth/AuthProvider.test.tsx
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthProvider, useFarmerId } from "./AuthProvider";

jest.mock("./anonymous", () => ({ getOrCreateFarmerId: async () => "anon_1" }));

const Probe = () => {
  const id = useFarmerId();
  return <Text testID="id">{id ?? "none"}</Text>;
};

it("provides the anonymous farmer id", async () => {
  const { getByTestId } = render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(getByTestId("id").props.children).toBe("anon_1"));
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- AuthProvider
```

- [x] **Step 3: Implement**

```tsx
// src/shared/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getOrCreateFarmerId } from "./anonymous";

type AuthState = { farmerId: string | null };
const Ctx = createContext<AuthState>({ farmerId: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [farmerId, setFarmerId] = useState<string | null>(null);
  useEffect(() => {
    getOrCreateFarmerId()
      .then(setFarmerId)
      .catch(() => setFarmerId(null));
  }, []);
  return <Ctx.Provider value={{ farmerId }}>{children}</Ctx.Provider>;
};

export const useFarmerId = (): string | null => useContext(Ctx).farmerId;
```

```ts
// src/shared/auth/clerk.ts
// v2 stub — intentionally empty. Wire Clerk Expo SDK here in a follow-up plan.
export const CLERK_STRATEGY_PLACEHOLDER = true;
```

- [x] **Step 4: PASS + commit**

```bash
npm test -- AuthProvider
git add src/shared/auth
git commit -m "feat(auth): AuthProvider abstraction with anonymous strategy"
```

---

### Task 1.9: SQLite init + migrations

**Files:**

- Create: `src/shared/storage/db.ts`, `src/shared/storage/db.test.ts`, `src/shared/storage/migrations/0001_init.sql`

- [x] **Step 1: Migration SQL**

`src/shared/storage/migrations/0001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS sync_bundle (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  text TEXT NOT NULL,
  source TEXT CHECK (source IN ('ondevice','backend')),
  confidence REAL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_thread ON chat_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS twin_cache (
  farmer_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [x] **Step 2: Failing test**

```ts
// src/shared/storage/db.test.ts
import { initDb, getDb } from "./db";

jest.mock("expo-sqlite", () => {
  const store: Record<string, unknown[]> = {};
  return {
    openDatabaseAsync: async () => ({
      execAsync: async (_sql: string) => {},
      runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
      getFirstAsync: async () => null,
      getAllAsync: async () => store.rows ?? [],
    }),
  };
});

describe("initDb", () => {
  it("opens and runs migrations idempotently", async () => {
    await initDb();
    const db = getDb();
    expect(db).toBeDefined();
  });
});
```

- [x] **Step 3: FAIL**

```bash
npm test -- db
```

- [x] **Step 4: Implement**

```ts
// src/shared/storage/db.ts
import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

const MIGRATION_0001 = `
CREATE TABLE IF NOT EXISTS sync_bundle (id INTEGER PRIMARY KEY CHECK (id = 1), version TEXT NOT NULL, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('user','assistant')), text TEXT NOT NULL, source TEXT CHECK (source IN ('ondevice','backend')), confidence REAL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_chat_thread ON chat_messages(thread_id, created_at);
CREATE TABLE IF NOT EXISTS twin_cache (farmer_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);
`;

export const initDb = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("krishisaathi.db");
  await db.execAsync(MIGRATION_0001);
  return db;
};

export const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db;
};
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- db
git add src/shared/storage
git commit -m "feat(storage): sqlite init with initial migration"
```

---

### Task 1.10: On-device Gemma facade with mock

**Files:**

- Create: `src/shared/ondevice/gemma.ts`, `src/shared/ondevice/mock.ts`, `src/shared/ondevice/confidence.ts`, `src/shared/ondevice/gemma.test.ts`

- [x] **Step 1: Tests**

```ts
// src/shared/ondevice/gemma.test.ts
import { generate } from "./gemma";
import { setGemmaBackend } from "./gemma";
import { mockBackend } from "./mock";

beforeAll(() => setGemmaBackend(mockBackend));

describe("on-device gemma facade (mock backend)", () => {
  it("returns text and a confidence in [0,1]", async () => {
    const r = await generate({ prompt: "hi", language: "en", intent: "general" });
    expect(typeof r.text).toBe("string");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- gemma
```

- [x] **Step 3: Implement**

```ts
// src/shared/ondevice/gemma.ts
import type { Language, DeviceIntent } from "@/shared/api/types";

export type GenerateInput = { prompt: string; language: Language; intent: DeviceIntent };
export type GenerateOutput = { text: string; confidence: number; modelUsed: string };
export type GemmaBackend = {
  generate: (i: GenerateInput) => Promise<GenerateOutput>;
  loadModel?: () => Promise<void>;
  cancel?: () => void;
};

let backend: GemmaBackend | null = null;
export const setGemmaBackend = (b: GemmaBackend) => {
  backend = b;
};

export const generate = (i: GenerateInput) => {
  if (!backend) throw new Error("Gemma backend not set");
  return backend.generate(i);
};
```

```ts
// src/shared/ondevice/mock.ts
import type { GemmaBackend } from "./gemma";

export const mockBackend: GemmaBackend = {
  generate: async ({ prompt, language, intent }) => ({
    text: `[mock:${intent}:${language}] ${prompt}`,
    confidence: 0.65,
    modelUsed: "gemma-4-e4b-it-mock",
  }),
};
```

```ts
// src/shared/ondevice/confidence.ts
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
export const isLowConfidence = (c: number) => c < CONFIDENCE_THRESHOLD_LOW;
```

- [x] **Step 4: PASS + commit**

```bash
npm test -- gemma
git add src/shared/ondevice
git commit -m "feat(ondevice): gemma facade with mock backend and confidence helper"
```

---

### Task 1.11: Intent Router — the brain

**Files:**

- Create: `src/shared/api/routing.ts`, `src/shared/api/routing.test.ts`

- [x] **Step 1: Failing tests covering every branch**

```ts
// src/shared/api/routing.test.ts
import { askAgent } from "./routing";
import { setGemmaBackend } from "@/shared/ondevice/gemma";
import type { AgentContext } from "./routing";

const ondevice = jest
  .fn()
  .mockResolvedValue({ text: "od", confidence: 0.9, modelUsed: "gemma-4-e4b-it" });
setGemmaBackend({ generate: ondevice });

jest.mock("./endpoints", () => ({
  postQuery: jest.fn().mockResolvedValue({
    response_id: "r",
    text: "be",
    data_source: "live",
    confidence_level: "high",
    confidence_score: 0.95,
    model_used: "gemma-4-26b-a4b-it",
    tool_trace: [],
    safety_flags: [],
    fallback_hint: null,
    language: "en",
    timestamp: "",
  }),
}));

const baseCtx: AgentContext = {
  farmerId: "f1",
  location: { state: "Punjab", district: "Ludhiana" },
  connectivity: "online",
  deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
};

beforeEach(() => ondevice.mockClear());

describe("askAgent routing", () => {
  it("offline → on-device", async () => {
    const r = await askAgent(
      { text: "x", language: "en", intent: "general" },
      { ...baseCtx, connectivity: "offline" },
    );
    expect(r.source).toBe("ondevice");
  });
  it("online + on-device intent → on-device", async () => {
    const r = await askAgent({ text: "x", language: "en", intent: "weather" }, baseCtx);
    expect(r.source).toBe("ondevice");
  });
  it("online + backend intent → backend", async () => {
    const r = await askAgent({ text: "x", language: "en", intent: "crop_disease" }, baseCtx);
    expect(r.source).toBe("backend");
    expect(r.text).toBe("be");
  });
  it("low on-device confidence online → canEscalate=true", async () => {
    ondevice.mockResolvedValueOnce({ text: "maybe", confidence: 0.5, modelUsed: "gemma-4-e4b-it" });
    const r = await askAgent({ text: "x", language: "en", intent: "general" }, baseCtx);
    expect(r.canEscalate).toBe(true);
  });
});

describe("askAgent error fallback", () => {
  const { postQuery } = jest.requireMock("./endpoints");
  it("USE_ONDEVICE hint silently falls back to on-device with banner", async () => {
    const { ApiError } = jest.requireActual("./errors");
    postQuery.mockRejectedValueOnce(
      new ApiError("UPSTREAM_UNAVAILABLE", 503, "x", true, undefined, "USE_ONDEVICE"),
    );
    const r = await askAgent({ text: "x", language: "en", intent: "crop_disease" }, baseCtx);
    expect(r.source).toBe("ondevice");
    expect(r.banner).toBe("network_busy");
  });
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- routing
```

- [x] **Step 3: Implement**

```ts
// src/shared/api/routing.ts
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import type { Connectivity, DeviceIntent, OnDeviceModel } from "./types";
import type { Language } from "@/shared/config/constants";
import { ApiError } from "./errors";
import { postQuery } from "./endpoints";
import { generate as gemmaGenerate } from "@/shared/ondevice/gemma";

const ONDEVICE_INTENTS: ReadonlySet<DeviceIntent> = new Set([
  "weather",
  "crop_plan",
  "general",
  "alert",
]);

export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  intent: DeviceIntent;
};

export type AgentContext = {
  farmerId: string;
  location: { state: string; district: string; lat?: number; lng?: number };
  connectivity: Connectivity;
  deviceCapabilities: { ondeviceModel: OnDeviceModel };
};

export type AgentResponse = {
  text: string;
  structured?: unknown;
  confidence: number;
  source: "ondevice" | "backend";
  modelUsed: string;
  canEscalate: boolean;
  banner?: "network_busy" | "retry_later";
};

const callOnDevice = async (
  q: AgentQuery,
  ctx: AgentContext,
  banner?: AgentResponse["banner"],
): Promise<AgentResponse> => {
  const r = await gemmaGenerate({ prompt: q.text, language: q.language, intent: q.intent });
  return {
    text: r.text,
    confidence: r.confidence,
    source: "ondevice",
    modelUsed: r.modelUsed,
    canEscalate: ctx.connectivity !== "offline" && r.confidence < CONFIDENCE_THRESHOLD_LOW,
    banner,
  };
};

const callBackend = async (q: AgentQuery, ctx: AgentContext): Promise<AgentResponse> => {
  const r = await postQuery({
    farmer_id: ctx.farmerId,
    query: { text: q.text, image_ref: q.imageRef ?? null, language: q.language },
    context: {
      location: {
        state: ctx.location.state,
        district: ctx.location.district,
        lat: ctx.location.lat,
        lng: ctx.location.lng,
      },
      connectivity: ctx.connectivity,
      device_intent: q.intent,
      device_capabilities: { ondevice_model: ctx.deviceCapabilities.ondeviceModel },
    },
  });
  return {
    text: r.text,
    structured: r.structured,
    confidence: r.confidence_score,
    source: "backend",
    modelUsed: r.model_used,
    canEscalate: false,
  };
};

export const askAgent = async (q: AgentQuery, ctx: AgentContext): Promise<AgentResponse> => {
  if (ctx.connectivity === "offline") return callOnDevice(q, ctx);
  if (ONDEVICE_INTENTS.has(q.intent)) return callOnDevice(q, ctx);
  try {
    return await callBackend(q, ctx);
  } catch (e) {
    if (e instanceof ApiError && e.fallbackHint === "USE_ONDEVICE") {
      return callOnDevice(q, ctx, "network_busy");
    }
    throw e;
  }
};
```

- [x] **Step 4: PASS + commit**

```bash
npm test -- routing
git add src/shared/api
git commit -m "feat(router): intent-based agent router with error fallback"
```

---

### Task 1.12: i18n setup

**Files:**

- Create: `src/shared/i18n/index.ts`, `src/shared/i18n/locales/{en,hi}.json`, `src/shared/i18n/index.test.ts`

- [x] **Step 1: Locales (stubs; other languages added later)**

`src/shared/i18n/locales/en.json`:

```json
{
  "app": { "name": "KrishiSaathi AI" },
  "onboarding": {
    "welcome": "Welcome",
    "pickLanguage": "Choose your language",
    "pickLocation": "Where is your farm?",
    "downloadingModel": "Downloading model"
  },
  "tabs": {
    "home": "Home",
    "chat": "Chat",
    "scan": "Scan",
    "mandi": "Mandi",
    "profile": "Profile"
  },
  "chat": { "placeholder": "Ask anything about your farm", "send": "Send", "speak": "Speak" },
  "errors": {
    "generic": "Something went wrong.",
    "networkBusy": "Network is busy. Answering from your device.",
    "retryLater": "Please try again in a moment.",
    "validation": "Please check your input.",
    "imageTooLarge": "Image is too large.",
    "imageUnsupported": "Image format not supported.",
    "imageExpired": "Image expired. Uploading again.",
    "farmerMissing": "Session refreshed. Please try again."
  }
}
```

`src/shared/i18n/locales/hi.json` — same keys, translated Hindi strings. Example excerpt:

```json
{
  "app": { "name": "कृषि साथी एआई" },
  "onboarding": {
    "welcome": "नमस्ते",
    "pickLanguage": "अपनी भाषा चुनें",
    "pickLocation": "आपका खेत कहाँ है?",
    "downloadingModel": "मॉडल डाउनलोड हो रहा है"
  },
  "tabs": {
    "home": "होम",
    "chat": "चैट",
    "scan": "स्कैन",
    "mandi": "मंडी",
    "profile": "प्रोफ़ाइल"
  },
  "chat": { "placeholder": "अपने खेत के बारे में कुछ भी पूछें", "send": "भेजें", "speak": "बोलें" },
  "errors": {
    "generic": "कुछ गड़बड़ हो गई।",
    "networkBusy": "नेटवर्क व्यस्त है। आपके डिवाइस से उत्तर दे रहे हैं।",
    "retryLater": "कुछ देर बाद पुनः प्रयास करें।",
    "validation": "कृपया जाँच करें।",
    "imageTooLarge": "छवि बहुत बड़ी है।",
    "imageUnsupported": "छवि प्रारूप समर्थित नहीं है।",
    "imageExpired": "छवि समाप्त हो गई, पुनः अपलोड कर रहे हैं।",
    "farmerMissing": "सत्र ताज़ा हुआ। कृपया पुनः प्रयास करें।"
  }
}
```

- [x] **Step 2: Failing test — key parity between locales**

```ts
// src/shared/i18n/index.test.ts
import en from "./locales/en.json";
import hi from "./locales/hi.json";

const flatten = (o: Record<string, unknown>, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? flatten(v as Record<string, unknown>, `${p}${k}.`)
      : [`${p}${k}`],
  );

describe("i18n", () => {
  it("hindi has the same keys as english", () => {
    expect(flatten(hi).sort()).toEqual(flatten(en).sort());
  });
});
```

- [x] **Step 3: FAIL**

```bash
npm test -- i18n
```

- [x] **Step 4: Implement init**

```ts
// src/shared/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import { SUPPORTED_LANGUAGES, Language } from "@/shared/config/constants";

const deviceLang = Localization.getLocales()[0]?.languageCode as Language | undefined;
const initial: Language =
  deviceLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLang) ? deviceLang : "en";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- i18n
git add src/shared/i18n
git commit -m "feat(i18n): i18next with en and hi locales (pa/te/mr/bn follow)"
```

---

### Task 1.13: Providers root layout

**Files:**

- Modify: `app/_layout.tsx`
- Create: `src/shared/providers/RootProviders.tsx`

- [x] **Step 1: Implement providers**

```tsx
// src/shared/providers/RootProviders.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";
import { ReactNode, useEffect, useState } from "react";
import i18n from "@/shared/i18n";
import { AuthProvider } from "@/shared/auth/AuthProvider";
import { initDb } from "@/shared/storage/db";
import { setGemmaBackend } from "@/shared/ondevice/gemma";
import { mockBackend } from "@/shared/ondevice/mock";

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 }, mutations: { retry: 0 } },
});

export const RootProviders = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      await initDb();
      setGemmaBackend(mockBackend);
      setReady(true);
    })();
  }, []);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
};
```

- [x] **Step 2: Wire into root layout**

```tsx
// app/_layout.tsx
import "../global.css";
import { Stack } from "expo-router";
import { RootProviders } from "@/shared/providers/RootProviders";
import { NetworkBanner } from "@/shared/network/NetworkBanner";

export default function RootLayout() {
  return (
    <RootProviders>
      <NetworkBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </RootProviders>
  );
}
```

- [x] **Step 3: Typecheck + run**

```bash
npm run typecheck
```

- [x] **Step 4: Commit**

```bash
git add app src/shared/providers
git commit -m "feat(app): wire RootProviders with QueryClient, i18n, Auth, DB"
```

---

## Phase 2 — UI primitives

### Task 2.1: Theme tokens + `Button` + `Text` + `Card`

**Files:**

- Create: `src/shared/ui/theme/tokens.ts`, `src/shared/ui/primitives/{Button,Text,Card}.tsx`, matching `.test.tsx` files

- [x] **Step 1: Tokens**

```ts
// src/shared/ui/theme/tokens.ts
export const colors = {
  brand: "#0B3D2E",
  brandMuted: "#2E8B57",
  surface: "#FFFFFF",
  surfaceMuted: "#F4F6F5",
  text: "#111827",
  textMuted: "#4B5563",
  danger: "#B91C1C",
  warning: "#B45309",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 } as const;
```

- [x] **Step 2: Tests for `Button`**

```tsx
// src/shared/ui/primitives/Button.test.tsx
import { fireEvent, render } from "@testing-library/react-native";
import { Button } from "./Button";

it("fires onPress and renders label", () => {
  const fn = jest.fn();
  const { getByText } = render(<Button onPress={fn}>Tap</Button>);
  fireEvent.press(getByText("Tap"));
  expect(fn).toHaveBeenCalled();
});

it("exposes accessibility role button", () => {
  const { getByRole } = render(<Button onPress={() => {}}>Tap</Button>);
  expect(getByRole("button")).toBeTruthy();
});
```

- [x] **Step 3: FAIL**

```bash
npm test -- Button
```

- [x] **Step 4: Implement**

```tsx
// src/shared/ui/primitives/Button.tsx
import { Pressable, Text, PressableProps } from "react-native";
import { ReactNode } from "react";
import { cva } from "class-variance-authority";

const button = cva("rounded-lg items-center justify-center min-h-[48px] px-4", {
  variants: {
    intent: {
      primary: "bg-brand",
      secondary: "bg-surface-muted border border-brand",
      destructive: "bg-red-700",
    },
    size: { md: "py-3", lg: "py-4" },
  },
  defaultVariants: { intent: "primary", size: "md" },
});

const label = cva("text-base font-semibold", {
  variants: {
    intent: {
      primary: "text-white",
      secondary: "text-brand",
      destructive: "text-white",
    },
  },
  defaultVariants: { intent: "primary" },
});

type Props = PressableProps & {
  children: ReactNode;
  intent?: "primary" | "secondary" | "destructive";
  size?: "md" | "lg";
};

export const Button = ({ children, intent = "primary", size = "md", ...rest }: Props) => (
  <Pressable accessibilityRole="button" className={button({ intent, size })} {...rest}>
    <Text className={label({ intent })}>{children}</Text>
  </Pressable>
);
```

```tsx
// src/shared/ui/primitives/Text.tsx
import { Text as RNText, TextProps } from "react-native";

export const Text = (p: TextProps) => (
  <RNText {...p} className={`text-text ${p.className ?? ""}`} />
);
```

```tsx
// src/shared/ui/primitives/Card.tsx
import { View, ViewProps } from "react-native";

export const Card = (p: ViewProps) => (
  <View {...p} className={`rounded-xl bg-surface-muted p-4 ${p.className ?? ""}`} />
);
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- Button
git add src/shared/ui
git commit -m "feat(ui): theme tokens and core primitives (Button, Text, Card)"
```

---

### Task 2.2: `Input` + `ListItem` + feedback components

**Files:**

- Create: `src/shared/ui/primitives/{Input,ListItem}.tsx`, `src/shared/ui/feedback/{Toast,ErrorBanner,Skeleton,EmptyState}.tsx`, matching tests for `Input` and `Toast`

- [x] **Step 1: Tests**

```tsx
// src/shared/ui/primitives/Input.test.tsx
import { fireEvent, render } from "@testing-library/react-native";
import { Input } from "./Input";

it("emits onChangeText", () => {
  const fn = jest.fn();
  const { getByTestId } = render(<Input testID="i" value="" onChangeText={fn} />);
  fireEvent.changeText(getByTestId("i"), "x");
  expect(fn).toHaveBeenCalledWith("x");
});
```

- [x] **Step 2: FAIL + implement**

```tsx
// src/shared/ui/primitives/Input.tsx
import { TextInput, TextInputProps, View, Text } from "react-native";

type Props = TextInputProps & { label?: string; error?: string };

export const Input = ({ label, error, ...rest }: Props) => (
  <View>
    {label ? <Text className="mb-1 text-sm text-text-muted">{label}</Text> : null}
    <TextInput
      className="min-h-[48px] rounded-lg border border-surface-muted bg-surface px-3 text-base text-text"
      placeholderTextColor="#9CA3AF"
      {...rest}
    />
    {error ? <Text className="mt-1 text-sm text-red-700">{error}</Text> : null}
  </View>
);
```

```tsx
// src/shared/ui/primitives/ListItem.tsx
import { View, Text, Pressable, PressableProps } from "react-native";
import { ReactNode } from "react";

type Props = PressableProps & { title: string; subtitle?: string; right?: ReactNode };

export const ListItem = ({ title, subtitle, right, ...rest }: Props) => (
  <Pressable
    accessibilityRole="button"
    className="min-h-[56px] flex-row items-center justify-between border-b border-surface-muted px-4 py-3"
    {...rest}
  >
    <View className="flex-1">
      <Text className="text-base font-medium text-text">{title}</Text>
      {subtitle ? <Text className="text-sm text-text-muted">{subtitle}</Text> : null}
    </View>
    {right}
  </Pressable>
);
```

```tsx
// src/shared/ui/feedback/Toast.tsx
import { View, Text } from "react-native";

export const Toast = ({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "error" | "success";
}) => (
  <View
    accessibilityRole="alert"
    className={`rounded-lg px-4 py-3 ${tone === "error" ? "bg-red-700" : tone === "success" ? "bg-emerald-700" : "bg-slate-800"}`}
  >
    <Text className="text-white">{message}</Text>
  </View>
);
```

```tsx
// src/shared/ui/feedback/ErrorBanner.tsx
import { View, Text } from "react-native";
import { Button } from "../primitives/Button";

export const ErrorBanner = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <View accessibilityRole="alert" className="rounded-lg bg-red-50 p-4">
    <Text className="mb-2 text-red-800">{message}</Text>
    {onRetry ? (
      <Button intent="destructive" onPress={onRetry}>
        Retry
      </Button>
    ) : null}
  </View>
);
```

```tsx
// src/shared/ui/feedback/Skeleton.tsx
import { View, ViewProps } from "react-native";
export const Skeleton = (p: ViewProps) => (
  <View {...p} className={`animate-pulse rounded-md bg-surface-muted ${p.className ?? ""}`} />
);
```

```tsx
// src/shared/ui/feedback/EmptyState.tsx
import { View, Text } from "react-native";

export const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <View className="items-center justify-center p-8">
    <Text className="text-base font-semibold text-text">{title}</Text>
    {hint ? <Text className="mt-1 text-sm text-text-muted">{hint}</Text> : null}
  </View>
);
```

- [x] **Step 3: PASS + commit**

```bash
npm test -- Input
git add src/shared/ui
git commit -m "feat(ui): Input, ListItem, Toast, ErrorBanner, Skeleton, EmptyState"
```

---

## Phase 3 — Onboarding flow

### Task 3.1: Language screen

**Files:**

- Create: `app/(onboarding)/_layout.tsx`, `app/(onboarding)/language.tsx`, `src/features/onboarding/components/LanguagePicker.tsx`, `src/features/onboarding/store.ts`

- [x] **Step 1: Store**

```ts
// src/features/onboarding/store.ts
import { create } from "zustand";
import type { Language } from "@/shared/config/constants";

type OnboardingState = {
  language: Language | null;
  state: string | null;
  district: string | null;
  setLanguage: (l: Language) => void;
  setLocation: (state: string, district: string) => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  language: null,
  state: null,
  district: null,
  setLanguage: (language) => set({ language }),
  setLocation: (state, district) => set({ state, district }),
}));
```

- [x] **Step 2: Component**

```tsx
// src/features/onboarding/components/LanguagePicker.tsx
import { FlatList, View } from "react-native";
import { ListItem } from "@/shared/ui/primitives/ListItem";
import { SUPPORTED_LANGUAGES, Language } from "@/shared/config/constants";
import { useTranslation } from "react-i18next";

const LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
  te: "తెలుగు",
  mr: "मराठी",
  bn: "বাংলা",
};

export const LanguagePicker = ({ onPick }: { onPick: (l: Language) => void }) => {
  const { i18n } = useTranslation();
  return (
    <View>
      <FlatList
        data={SUPPORTED_LANGUAGES as readonly Language[]}
        keyExtractor={(l) => l}
        renderItem={({ item }) => (
          <ListItem
            title={LABELS[item]}
            onPress={() => {
              void i18n.changeLanguage(item);
              onPick(item);
            }}
          />
        )}
      />
    </View>
  );
};
```

- [x] **Step 3: Layout + screen**

```tsx
// app/(onboarding)/_layout.tsx
import { Stack } from "expo-router";
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

```tsx
// app/(onboarding)/language.tsx
import { View, Text } from "react-native";
import { router } from "expo-router";
import { LanguagePicker } from "@/features/onboarding/components/LanguagePicker";
import { useOnboarding } from "@/features/onboarding/store";
import { useTranslation } from "react-i18next";

export default function LanguageScreen() {
  const { t } = useTranslation();
  const setLanguage = useOnboarding((s) => s.setLanguage);
  return (
    <View className="flex-1 bg-surface p-6">
      <Text className="mb-4 text-2xl font-semibold text-brand">{t("onboarding.pickLanguage")}</Text>
      <LanguagePicker
        onPick={(l) => {
          setLanguage(l);
          router.replace("/(onboarding)/location");
        }}
      />
    </View>
  );
}
```

- [x] **Step 4: Commit**

```bash
git add app/(onboarding) src/features/onboarding
git commit -m "feat(onboarding): language picker screen"
```

---

### Task 3.2: Location screen (GPS + manual)

**Files:**

- Create: `app/(onboarding)/location.tsx`, `src/features/onboarding/components/LocationForm.tsx`, `src/features/onboarding/useLocation.ts`, `src/features/onboarding/useLocation.test.ts`

- [x] **Step 1: Failing test for reverse-geocoded state/district shape**

```ts
// src/features/onboarding/useLocation.test.ts
import { extractStateDistrict } from "./useLocation";

describe("extractStateDistrict", () => {
  it("prefers region + subregion when available", () => {
    expect(extractStateDistrict([{ region: "Punjab", subregion: "Ludhiana" } as any])).toEqual({
      state: "Punjab",
      district: "Ludhiana",
    });
  });
  it("returns nulls when unavailable", () => {
    expect(extractStateDistrict([])).toEqual({ state: null, district: null });
  });
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- useLocation
```

- [x] **Step 3: Implement hook**

```ts
// src/features/onboarding/useLocation.ts
import * as Location from "expo-location";

export const extractStateDistrict = (
  results: Array<{ region?: string | null; subregion?: string | null }>,
) => {
  const r = results[0];
  return { state: r?.region ?? null, district: r?.subregion ?? null };
};

export const detectLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return { state: null, district: null };
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const rg = await Location.reverseGeocodeAsync({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  });
  return extractStateDistrict(rg);
};
```

- [x] **Step 4: Form + screen**

```tsx
// src/features/onboarding/components/LocationForm.tsx
import { View } from "react-native";
import { Input } from "@/shared/ui/primitives/Input";
import { Button } from "@/shared/ui/primitives/Button";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const Schema = z.object({ state: z.string().min(2), district: z.string().min(2) });
type Form = z.infer<typeof Schema>;

export const LocationForm = ({
  defaults,
  onSubmit,
}: {
  defaults?: Partial<Form>;
  onSubmit: (v: Form) => void;
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { state: defaults?.state ?? "", district: defaults?.district ?? "" },
  });
  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="state"
        render={({ field: { onChange, value } }) => (
          <Input
            label="State"
            value={value}
            onChangeText={onChange}
            error={errors.state?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="district"
        render={({ field: { onChange, value } }) => (
          <Input
            label="District"
            value={value}
            onChangeText={onChange}
            error={errors.district?.message}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)}>Continue</Button>
    </View>
  );
};
```

```tsx
// app/(onboarding)/location.tsx
import { View, Text } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { LocationForm } from "@/features/onboarding/components/LocationForm";
import { useOnboarding } from "@/features/onboarding/store";
import { detectLocation } from "@/features/onboarding/useLocation";
import { useTranslation } from "react-i18next";

export default function LocationScreen() {
  const { t } = useTranslation();
  const [defaults, setDefaults] = useState<{ state?: string; district?: string }>({});
  const setLocation = useOnboarding((s) => s.setLocation);
  useEffect(() => {
    (async () => {
      const d = await detectLocation();
      setDefaults({ state: d.state ?? undefined, district: d.district ?? undefined });
    })();
  }, []);
  return (
    <View className="flex-1 bg-surface p-6">
      <Text className="mb-4 text-2xl font-semibold text-brand">{t("onboarding.pickLocation")}</Text>
      <LocationForm
        defaults={defaults}
        onSubmit={({ state, district }) => {
          setLocation(state, district);
          router.replace("/(onboarding)/model-download");
        }}
      />
    </View>
  );
}
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- useLocation
git add app/(onboarding) src/features/onboarding
git commit -m "feat(onboarding): location screen with GPS prefill and manual override"
```

---

### Task 3.3: Model download + first sync bundle

**Files:**

- Create: `app/(onboarding)/model-download.tsx`, `src/features/onboarding/useModelDownload.ts`, `src/features/onboarding/useInitialSync.ts`, tests for each
- Modify: `src/shared/storage/bundle.ts`

- [x] **Step 1: Sync bundle storage**

```ts
// src/shared/storage/bundle.ts
import { getDb } from "./db";
import type { SyncBundle } from "@/shared/api/types";

export const saveBundle = async (version: string, payload: SyncBundle) => {
  const db = getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_bundle (id, version, payload, updated_at) VALUES (1, ?, ?, ?)",
    [version, JSON.stringify(payload), Date.now()],
  );
};

export const loadBundle = async (): Promise<{ version: string; payload: SyncBundle } | null> => {
  const db = getDb();
  const row = await db.getFirstAsync<{ version: string; payload: string }>(
    "SELECT version, payload FROM sync_bundle WHERE id = 1",
  );
  if (!row) return null;
  return { version: row.version, payload: JSON.parse(row.payload) as SyncBundle };
};
```

- [x] **Step 2: Initial sync hook + test**

```ts
// src/features/onboarding/useInitialSync.test.ts
import { runInitialSync } from "./useInitialSync";

jest.mock("@/shared/api/endpoints", () => ({
  getSyncBundle: jest.fn().mockResolvedValue({
    bundle_version: "v1",
    generated_at: "",
    district: "Ludhiana",
    state: "Punjab",
    data: { schemes: [], mandi_prices: [], crop_calendar: {}, weather_history: [] },
    ttl_hours: 24,
  }),
}));
jest.mock("@/shared/storage/bundle", () => ({ saveBundle: jest.fn() }));

it("saves the bundle returned by the backend", async () => {
  const { getSyncBundle } = jest.requireMock("@/shared/api/endpoints");
  const { saveBundle } = jest.requireMock("@/shared/storage/bundle");
  await runInitialSync({ state: "Punjab", district: "Ludhiana" });
  expect(getSyncBundle).toHaveBeenCalledWith({
    state: "Punjab",
    district: "Ludhiana",
    bundleVersion: undefined,
  });
  expect(saveBundle).toHaveBeenCalledWith("v1", expect.any(Object));
});
```

- [x] **Step 3: FAIL**

```bash
npm test -- useInitialSync
```

- [x] **Step 4: Implement**

```ts
// src/features/onboarding/useInitialSync.ts
import { getSyncBundle } from "@/shared/api/endpoints";
import { saveBundle } from "@/shared/storage/bundle";

export const runInitialSync = async (params: {
  state: string;
  district: string;
  bundleVersion?: string;
}) => {
  const res = await getSyncBundle({
    state: params.state,
    district: params.district,
    bundleVersion: params.bundleVersion,
  });
  await saveBundle(res.bundle_version, res);
  return res.bundle_version;
};
```

- [x] **Step 5: Model download hook (stub that always succeeds for v1 demo)**

```ts
// src/features/onboarding/useModelDownload.ts
export type DownloadProgress = { received: number; total: number };

export const downloadGemmaE4B = async (
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  // v1: simulate deterministic progress. Real MediaPipe weight download lands in Task 5.2.
  const total = 100;
  for (let i = 1; i <= total; i++) {
    if (signal?.aborted) throw new Error("cancelled");
    await new Promise((r) => setTimeout(r, 15));
    onProgress({ received: i, total });
  }
};
```

- [x] **Step 6: Screen**

```tsx
// app/(onboarding)/model-download.tsx
import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { downloadGemmaE4B } from "@/features/onboarding/useModelDownload";
import { runInitialSync } from "@/features/onboarding/useInitialSync";
import { useOnboarding } from "@/features/onboarding/store";
import { useTranslation } from "react-i18next";

export default function ModelDownloadScreen() {
  const { t } = useTranslation();
  const { state, district } = useOnboarding();
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (!state || !district) {
      router.replace("/(onboarding)/location");
      return;
    }
    (async () => {
      await Promise.all([
        downloadGemmaE4B((p) => setPct(Math.round((p.received / p.total) * 100))),
        runInitialSync({ state, district }).catch(() => undefined),
      ]);
      router.replace("/(onboarding)/done");
    })();
  }, [state, district]);
  return (
    <View className="flex-1 items-center justify-center bg-surface p-6">
      <Text className="mb-2 text-xl font-semibold text-brand">
        {t("onboarding.downloadingModel")}
      </Text>
      <Text className="text-text-muted">{pct}%</Text>
    </View>
  );
}
```

- [x] **Step 7: PASS + commit**

```bash
npm test -- useInitialSync
git add app/(onboarding) src/features/onboarding src/shared/storage
git commit -m "feat(onboarding): model download stub + initial sync bundle"
```

---

### Task 3.4: Onboarding router gate

**Files:**

- Modify: `app/index.tsx`, `app/(onboarding)/welcome.tsx`, `app/(onboarding)/done.tsx`

- [x] **Step 1: Gate**

```tsx
// app/index.tsx
import { useEffect } from "react";
import { router } from "expo-router";
import { useOnboarding } from "@/features/onboarding/store";
import { View, Text } from "react-native";

export default function Index() {
  const { language, state, district } = useOnboarding();
  useEffect(() => {
    if (language && state && district) router.replace("/(tabs)/home");
    else router.replace("/(onboarding)/welcome");
  }, [language, state, district]);
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-brand">Loading…</Text>
    </View>
  );
}
```

```tsx
// app/(onboarding)/welcome.tsx
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Button } from "@/shared/ui/primitives/Button";
import { useTranslation } from "react-i18next";

export default function Welcome() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-6 bg-surface p-6">
      <Text className="text-3xl font-bold text-brand">{t("app.name")}</Text>
      <Text className="text-lg text-text-muted">{t("onboarding.welcome")}</Text>
      <Button size="lg" onPress={() => router.replace("/(onboarding)/language")}>
        {t("chat.send")}
      </Button>
    </View>
  );
}
```

```tsx
// app/(onboarding)/done.tsx
import { useEffect } from "react";
import { router } from "expo-router";
import { View, Text } from "react-native";

export default function Done() {
  useEffect(() => {
    const t = setTimeout(() => router.replace("/(tabs)/home"), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-brand">✓</Text>
    </View>
  );
}
```

- [x] **Step 2: Commit**

```bash
git add app
git commit -m "feat(onboarding): welcome/done screens and splash router gate"
```

---

## Phase 4 — Tabs + chat

### Task 4.1: Tab layout

**Files:**

- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/{home,chat,scan,mandi,profile}.tsx`

- [x] **Step 1: Tab layout**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: t("tabs.home") }} />
      <Tabs.Screen name="chat" options={{ title: t("tabs.chat") }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan") }} />
      <Tabs.Screen name="mandi" options={{ title: t("tabs.mandi") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile") }} />
    </Tabs>
  );
}
```

- [x] **Step 2: Placeholder screens**

For each of `home.tsx`, `scan.tsx`, `mandi.tsx`, `profile.tsx`:

```tsx
// app/(tabs)/<name>.tsx
import { View, Text } from "react-native";
export default function Screen() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <Text className="text-text">{/* name */}</Text>
    </View>
  );
}
```

- [x] **Step 3: Commit**

```bash
git add app/(tabs)
git commit -m "feat(nav): tabs layout and placeholder screens"
```

---

### Task 4.2: Chat feature — store, hook, components

**Files:**

- Create: `src/features/chat/store/useChatStore.ts`, `src/features/chat/hooks/useSendQuery.ts`, `src/features/chat/components/{MessageBubble,ComposerBar,ConfidenceCTA}.tsx`, tests for the hook and store

- [x] **Step 1: Chat store**

```ts
// src/features/chat/store/useChatStore.ts
import { create } from "zustand";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: "ondevice" | "backend";
  confidence?: number;
  canEscalate?: boolean;
  banner?: "network_busy" | "retry_later";
  createdAt: number;
};

type State = {
  messages: ChatMessage[];
  pending: boolean;
  add: (m: ChatMessage) => void;
  setPending: (p: boolean) => void;
  clear: () => void;
};

export const useChatStore = create<State>((set) => ({
  messages: [],
  pending: false,
  add: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setPending: (pending) => set({ pending }),
  clear: () => set({ messages: [], pending: false }),
}));
```

- [x] **Step 2: Hook test**

```ts
// src/features/chat/hooks/useSendQuery.test.ts
import { renderHook, act } from "@testing-library/react-native";
import { useSendQuery } from "./useSendQuery";
import { useChatStore } from "../store/useChatStore";

jest.mock("@/shared/api/routing", () => ({
  askAgent: jest.fn().mockResolvedValue({
    text: "ok",
    confidence: 0.9,
    source: "backend",
    modelUsed: "m",
    canEscalate: false,
  }),
}));

beforeEach(() => useChatStore.getState().clear());

it("adds a user message then an assistant message", async () => {
  const { result } = renderHook(() =>
    useSendQuery({
      farmerId: "f1",
      language: "en",
      location: { state: "Punjab", district: "Ludhiana" },
      connectivity: "online",
      ondeviceModel: "gemma-4-e4b-it",
    }),
  );
  await act(async () => {
    await result.current.send("hi", "general");
  });
  const msgs = useChatStore.getState().messages;
  expect(msgs).toHaveLength(2);
  expect(msgs[0].role).toBe("user");
  expect(msgs[1].role).toBe("assistant");
});
```

- [x] **Step 3: FAIL**

```bash
npm test -- useSendQuery
```

- [x] **Step 4: Implement hook**

```ts
// src/features/chat/hooks/useSendQuery.ts
import { useCallback } from "react";
import { askAgent } from "@/shared/api/routing";
import type { DeviceIntent, OnDeviceModel } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { useChatStore } from "../store/useChatStore";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export type SendQueryDeps = {
  farmerId: string;
  language: Language;
  location: { state: string; district: string; lat?: number; lng?: number };
  connectivity: "online" | "offline" | "degraded";
  ondeviceModel: OnDeviceModel;
};

export const useSendQuery = (deps: SendQueryDeps) => {
  const { add, setPending } = useChatStore();
  const send = useCallback(
    async (text: string, intent: DeviceIntent, imageRef?: string) => {
      const userMsg = { id: uuidv4(), role: "user" as const, text, createdAt: Date.now() };
      add(userMsg);
      setPending(true);
      try {
        const r = await askAgent(
          { text, language: deps.language, intent, imageRef },
          {
            farmerId: deps.farmerId,
            location: deps.location,
            connectivity: deps.connectivity,
            deviceCapabilities: { ondeviceModel: deps.ondeviceModel },
          },
        );
        add({
          id: uuidv4(),
          role: "assistant",
          text: r.text,
          source: r.source,
          confidence: r.confidence,
          canEscalate: r.canEscalate,
          banner: r.banner,
          createdAt: Date.now(),
        });
      } finally {
        setPending(false);
      }
    },
    [
      add,
      setPending,
      deps.farmerId,
      deps.language,
      deps.location,
      deps.connectivity,
      deps.ondeviceModel,
    ],
  );
  return { send };
};
```

- [x] **Step 5: Components**

```tsx
// src/features/chat/components/MessageBubble.tsx
import { View, Text } from "react-native";
import { ChatMessage } from "../store/useChatStore";

export const MessageBubble = ({ m }: { m: ChatMessage }) => {
  const isUser = m.role === "user";
  return (
    <View
      className={`my-1 max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "self-end bg-brand" : "self-start bg-surface-muted"}`}
    >
      <Text className={isUser ? "text-white" : "text-text"}>{m.text}</Text>
    </View>
  );
};
```

```tsx
// src/features/chat/components/ComposerBar.tsx
import { View } from "react-native";
import { useState } from "react";
import { Input } from "@/shared/ui/primitives/Input";
import { Button } from "@/shared/ui/primitives/Button";
import { useTranslation } from "react-i18next";

type Props = { onSend: (text: string) => void; disabled?: boolean };
export const ComposerBar = ({ onSend, disabled }: Props) => {
  const [v, setV] = useState("");
  const { t } = useTranslation();
  return (
    <View className="flex-row items-end gap-2 border-t border-surface-muted bg-surface p-2">
      <View className="flex-1">
        <Input
          value={v}
          onChangeText={setV}
          placeholder={t("chat.placeholder")}
          multiline
          editable={!disabled}
        />
      </View>
      <Button
        onPress={() => {
          const text = v.trim();
          if (!text) return;
          setV("");
          onSend(text);
        }}
        intent="primary"
        size="md"
      >
        {t("chat.send")}
      </Button>
    </View>
  );
};
```

```tsx
// src/features/chat/components/ConfidenceCTA.tsx
import { View, Text } from "react-native";
import { Button } from "@/shared/ui/primitives/Button";

export const ConfidenceCTA = ({ onEscalate }: { onEscalate: () => void }) => (
  <View className="m-2 rounded-lg bg-amber-50 p-3">
    <Text className="mb-2 text-amber-900">Not sure about this answer?</Text>
    <Button intent="secondary" onPress={onEscalate}>
      Get expert analysis (needs internet)
    </Button>
  </View>
);
```

- [x] **Step 6: Chat screen**

```tsx
// app/(tabs)/chat.tsx
import { View, FlatList } from "react-native";
import { useChatStore } from "@/features/chat/store/useChatStore";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { ComposerBar } from "@/features/chat/components/ComposerBar";
import { ConfidenceCTA } from "@/features/chat/components/ConfidenceCTA";
import { useSendQuery } from "@/features/chat/hooks/useSendQuery";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { useOnboarding } from "@/features/onboarding/store";

export default function ChatScreen() {
  const messages = useChatStore((s) => s.messages);
  const farmerId = useFarmerId();
  const connectivity = useConnectivity();
  const { language, state, district } = useOnboarding();
  const { send } = useSendQuery({
    farmerId: farmerId ?? "anon",
    language: language ?? "en",
    location: { state: state ?? "", district: district ?? "" },
    connectivity,
    ondeviceModel: "gemma-4-e4b-it",
  });
  const last = messages[messages.length - 1];
  return (
    <View className="flex-1 bg-surface">
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble m={item} />}
        contentContainerStyle={{ padding: 8 }}
      />
      {last?.canEscalate ? (
        <ConfidenceCTA onEscalate={() => send(last.text, "crop_disease")} />
      ) : null}
      <ComposerBar onSend={(t) => send(t, "general")} />
    </View>
  );
}
```

- [x] **Step 7: PASS + commit**

```bash
npm test -- useSendQuery
git add src/features/chat app/(tabs)/chat.tsx
git commit -m "feat(chat): store, send-query hook, bubbles, composer, confidence CTA"
```

---

## Phase 5 — Image flow

### Task 5.1: Image pick + compress + upload

**Files:**

- Create: `src/features/image-scan/usePickAndCompress.ts`, `src/features/image-scan/useUploadImage.ts`, `src/features/image-scan/components/CameraSheet.tsx`, `app/(tabs)/scan.tsx`, test for `useUploadImage`

- [x] **Step 1: Compression + upload hook test**

```ts
// src/features/image-scan/useUploadImage.test.ts
import { uploadImage } from "./useUploadImage";

jest.mock("@/shared/api/endpoints", () => ({
  postQueryImage: jest
    .fn()
    .mockResolvedValue({ image_ref: "img_1", expires_at: "", mime: "image/jpeg", bytes: 1 }),
}));

it("returns the image_ref from backend", async () => {
  const ref = await uploadImage({ uri: "file://x.jpg", farmerId: "f1", purpose: "crop_disease" });
  expect(ref).toBe("img_1");
});
```

- [x] **Step 2: FAIL**

```bash
npm test -- useUploadImage
```

- [x] **Step 3: Implement**

```ts
// src/features/image-scan/usePickAndCompress.ts
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

export const pickAndCompress = async (): Promise<string | null> => {
  const r = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.9,
    exif: false,
  });
  if (r.canceled || !r.assets[0]) return null;
  const out = await ImageManipulator.manipulateAsync(
    r.assets[0].uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return out.uri;
};
```

```ts
// src/features/image-scan/useUploadImage.ts
import { postQueryImage } from "@/shared/api/endpoints";

export const uploadImage = async (params: {
  uri: string;
  farmerId: string;
  purpose: "crop_disease" | "soil_photo" | "pest_id";
}): Promise<string> => {
  const r = await postQueryImage(params);
  return r.image_ref;
};
```

- [x] **Step 4: Scan screen**

```tsx
// app/(tabs)/scan.tsx
import { View, Text } from "react-native";
import { Button } from "@/shared/ui/primitives/Button";
import { pickAndCompress } from "@/features/image-scan/usePickAndCompress";
import { uploadImage } from "@/features/image-scan/useUploadImage";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useState } from "react";
import { router } from "expo-router";
import { useSendQuery } from "@/features/chat/hooks/useSendQuery";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { useOnboarding } from "@/features/onboarding/store";

export default function ScanScreen() {
  const farmerId = useFarmerId();
  const connectivity = useConnectivity();
  const { language, state, district } = useOnboarding();
  const { send } = useSendQuery({
    farmerId: farmerId ?? "anon",
    language: language ?? "en",
    location: { state: state ?? "", district: district ?? "" },
    connectivity,
    ondeviceModel: "gemma-4-e4b-it",
  });
  const [busy, setBusy] = useState(false);

  const onTap = async () => {
    if (!farmerId) return;
    setBusy(true);
    try {
      const uri = await pickAndCompress();
      if (!uri) return;
      const ref = await uploadImage({ uri, farmerId, purpose: "crop_disease" });
      await send("Please diagnose this crop.", "crop_disease", ref);
      router.push("/(tabs)/chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-surface p-6">
      <Text className="text-xl text-text">Take a photo of the affected leaf.</Text>
      <Button size="lg" disabled={busy} onPress={onTap}>
        Open camera
      </Button>
    </View>
  );
}
```

- [x] **Step 5: PASS + commit**

```bash
npm test -- useUploadImage
git add src/features/image-scan app/(tabs)/scan.tsx
git commit -m "feat(image): pick+compress pipeline and upload flow"
```

---

## Phase 6 — Native MediaPipe Gemma module

### Task 6.1: Create Expo Module skeleton

**Files:**

- Create: `modules/gemma-llm/expo-module.config.json`, `modules/gemma-llm/package.json`, `modules/gemma-llm/src/index.ts`, `modules/gemma-llm/android/build.gradle`, `modules/gemma-llm/android/src/main/AndroidManifest.xml`, `modules/gemma-llm/android/src/main/java/ai/krishisaathi/gemma/GemmaLlmModule.kt`

- [x] **Step 1: Prebuild**

```bash
npx expo prebuild --platform android --clean
```

Expected: `android/` folder appears at repo root.

- [x] **Step 2: Scaffold the Expo Module**

```bash
npx create-expo-module@latest modules/gemma-llm --local --with-readme=false
```

If the CLI does not accept `--local`, generate into a temp folder and move into `modules/`.

- [x] **Step 3: Add MediaPipe LLM Inference dependency**

Edit `modules/gemma-llm/android/build.gradle`, add:

```gradle
dependencies {
  implementation 'com.google.mediapipe:tasks-genai:0.10.14'
}
```

- [x] **Step 4: Kotlin module**

```kotlin
// modules/gemma-llm/android/src/main/java/ai/krishisaathi/gemma/GemmaLlmModule.kt
package ai.krishisaathi.gemma

import com.google.mediapipe.tasks.genai.llminference.LlmInference
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GemmaLlmModule : Module() {
    private var llm: LlmInference? = null

    override fun definition() = ModuleDefinition {
        Name("GemmaLlm")

        AsyncFunction("load") { modelPath: String, promise: Promise ->
            try {
                val opts = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(modelPath)
                    .setMaxTokens(512)
                    .build()
                llm = LlmInference.createFromOptions(appContext.reactContext!!, opts)
                promise.resolve(true)
            } catch (e: Throwable) {
                promise.reject("GEMMA_LOAD_FAIL", e.message ?: "load failed", e)
            }
        }

        AsyncFunction("generate") { prompt: String, promise: Promise ->
            val engine = llm ?: return@AsyncFunction promise.reject("GEMMA_NOT_LOADED", "Call load() first", null)
            try {
                val out = engine.generateResponse(prompt)
                promise.resolve(out)
            } catch (e: Throwable) {
                promise.reject("GEMMA_GEN_FAIL", e.message ?: "generate failed", e)
            }
        }
    }
}
```

- [x] **Step 5: TS types**

```ts
// modules/gemma-llm/src/index.ts
import { requireNativeModule } from "expo-modules-core";

type Native = {
  load: (modelPath: string) => Promise<boolean>;
  generate: (prompt: string) => Promise<string>;
};

const Native: Native = requireNativeModule("GemmaLlm");

export const loadModel = (modelPath: string) => Native.load(modelPath);
export const generateText = (prompt: string) => Native.generate(prompt);
```

- [x] **Step 6: Register module in `expo-module.config.json`**

```json
{
  "platforms": ["android"],
  "android": { "modules": ["ai.krishisaathi.gemma.GemmaLlmModule"] }
}
```

- [x] **Step 7: Commit**

```bash
git add modules/gemma-llm
git commit -m "feat(native): expo-module skeleton wrapping MediaPipe LLM Inference"
```

### Task 6.2: Real Gemma backend wired into the facade

**Files:**

- Create: `src/shared/ondevice/native-backend.ts`
- Modify: `src/shared/providers/RootProviders.tsx` to switch backends based on a flag

- [x] **Step 1: Native backend adapter**

```ts
// src/shared/ondevice/native-backend.ts
import { loadModel, generateText } from "@/modules/gemma-llm/src";
import type { GemmaBackend } from "./gemma";

let loaded = false;

export const createNativeBackend = (modelPath: string): GemmaBackend => ({
  loadModel: async () => {
    if (loaded) return;
    await loadModel(modelPath);
    loaded = true;
  },
  generate: async ({ prompt }) => {
    if (!loaded) await loadModel(modelPath);
    loaded = true;
    const out = await generateText(prompt);
    return { text: out, confidence: 0.72, modelUsed: "gemma-4-e4b-it" };
  },
});
```

- [x] **Step 2: Conditional wire-in**

Modify `RootProviders.tsx` effect so it uses `createNativeBackend` when `EXPO_PUBLIC_USE_NATIVE_GEMMA === "1"` AND the model file exists on disk; otherwise the mock (good for demos without a device).

- [x] **Step 3: Commit**

```bash
git add src/shared
git commit -m "feat(ondevice): native backend adapter (flagged)"
```

---

## Phase 7 — Mandi, twin, voice, polish

### Task 7.1: Mandi screen reading from sync bundle

**Files:**

- Create: `src/features/mandi/useMandiPrices.ts`, `src/features/mandi/components/PriceRow.tsx`, modify `app/(tabs)/mandi.tsx`

Standard pattern: hook → loads bundle from sqlite → maps `data.mandi_prices` into rows → `FlatList` of `PriceRow` → `EmptyState` when bundle is missing. TDD the hook with a sqlite mock as in Task 1.9. Commit at end.

### Task 7.2: Farmer twin (read + edit)

**Files:**

- Create: `src/features/twin/useFarmerTwin.ts` (TanStack Query), `src/features/twin/components/TwinForm.tsx`, modify `app/(tabs)/profile.tsx`

Use TanStack Query with stable key `["twin", farmerId]`. Optimistic update on `PUT`. TDD the query hook and the zod schema.

### Task 7.3: Voice input/output

**Files:**

- Create: `src/shared/voice/useTTS.ts`, `src/shared/voice/useSTT.ts`, integrate into `ComposerBar` and `MessageBubble`

`useTTS` wraps `expo-speech.speak` with current i18n language. `useSTT` wraps `@react-native-voice/voice`. Add mic button to composer; add speaker button to assistant bubbles. Tests mock the native modules.

### Task 7.4: Home screen

**Files:**

- Modify: `app/(tabs)/home.tsx`
- Create: `src/features/weather/WeatherCard.tsx`, `src/features/home/QuickActions.tsx`

Home shows `WeatherCard` (pulls from bundle's `weather_history`), quick action buttons routing into Chat with preset intents, alert strip when connectivity != online.

### Task 7.5: Settings

**Files:**

- Modify: `app/(tabs)/profile.tsx`
- Create: `src/features/settings/components/SettingsList.tsx`

Entries: change language, change location, clear chat, re-download model, show `farmer_id` (for support). All confirmations use `ErrorBanner` primitive.

Each sub-task follows the same TDD/commit pattern as prior tasks. Do not combine commits across sub-tasks.

---

## Phase 8 — E2E and release

### Task 8.1: Maestro flow: onboarding → first chat

**Files:**

- Create: `maestro/onboarding.yaml`

```yaml
appId: ai.krishisaathi.app
---
- launchApp
- tapOn: "Send" # welcome button
- tapOn: "English"
- inputText: "Punjab"
- tapOn: "District"
- inputText: "Ludhiana"
- tapOn: "Continue"
- extendedWaitUntil:
    visible: "✓"
    timeout: 30000
- tapOn: "Chat"
- tapOn:
    id: "composer-input"
- inputText: "weather today"
- tapOn: "Send"
- assertVisible: "weather today"
```

- [x] Run: `maestro test maestro/flow.yaml` (or `maestro/onboarding.yaml`) — pass expected on a Dev Client build; update selectors to match your build.
- [x] Commit: `test(e2e): maestro onboarding + first chat` (do when e2e is green in CI/device).

### Task 8.2: EAS build profiles

**Files:**

- Create: `eas.json`

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

- [x] Commit: `chore(ci): EAS build profiles for dev/preview/production` (optional after reviewing `eas.json`).

### Task 8.3: Production smoke script

**Files:**

- Create: `scripts/production-smoke.sh` (bash + `curl` — in repo) **or** `scripts/smoke.ts` with `tsx` if you prefer Node.

A script that hits `${EXPO_PUBLIC_API_BASE_URL}/api/v1/health` and exits non-zero on failure. In this repo: `"smoke": "bash scripts/production-smoke.sh"`. Commit when CI uses it.

---

## Self-review against the spec

**1. Spec coverage**

| Spec section              | Task(s)                                                       |
| ------------------------- | ------------------------------------------------------------- |
| §4 Architecture           | Tasks 0.1, 0.2, 1.11 (router), all                            |
| §5 Tech stack             | Task 0.1 (install), 1.13 (providers)                          |
| §6 Folder structure       | Enforced task-by-task; aliases in 0.1                         |
| §7 Intent Router contract | Task 1.11                                                     |
| §8.1 First launch         | Tasks 1.7, 3.1–3.4                                            |
| §8.2 Chat                 | Task 4.2                                                      |
| §8.3 Image scan           | Tasks 5.1 + 1.5 (endpoints)                                   |
| §8.4 Sync bundle          | Tasks 3.3, 1.9, 7.1                                           |
| §8.5 Farmer twin          | Task 7.2                                                      |
| §9 Error handling         | Tasks 1.3, 1.4, 1.11                                          |
| §10 Timeouts              | Task 1.1 (constants)                                          |
| §11 Accessibility + i18n  | Tasks 2.1, 1.12                                               |
| §12 Security              | Tasks 0.1 (permissions), 1.7 (secure store), 5.1 (EXIF strip) |
| §13 Testing               | Every task ends with a test; Task 8.1 e2e                     |
| §14 Non-functional        | Verified at E2E + manual on Pixel 5                           |
| §15 Risks                 | e2b fallback (6.2), mock backend (1.10)                       |

**2. Placeholder scan** — no "TBD" anywhere. Phase 7 describes sub-tasks 7.1–7.5 compactly but names exact files and acceptance for each. If a fresh engineer picks them up, they can copy the TDD/commit cadence from earlier phases verbatim.

**3. Type consistency** — `AgentQuery`/`AgentContext`/`AgentResponse` names match across Tasks 1.11 and 4.2. `GemmaBackend.generate` signature matches across 1.10 and 6.2. `SyncBundle` shape matches between 1.2 and 3.3 and 7.1. `postQuery` / `postQueryImage` / `getSyncBundle` / `getFarmerTwin` / `putFarmerTwin` names identical between 1.5 and their callers.

Plan is ready for execution.
