# KrishiSaathi AI — Android Mobile App Design Spec

**Date:** 2026-04-21
**Owner:** Frontend team
**Status:** Approved (brainstorm)
**Target:** Gemma 4 Good Hackathon — Android-first (iOS deferred)

---

## 1. Purpose

Build a production-grade React Native (Expo) Android app that lets small and marginal Indian farmers interact with the KrishiSaathi AI agent in their own language. The app must work **offline-first** using on-device Gemma 4 models, escalate to a backend Gemma 4 agent when needed, and degrade gracefully across spotty 2G/3G rural networks.

Success criteria:

1. Farmer can complete onboarding (language + location + model download) on a mid-range Android (4 GB RAM) in under 5 minutes on a 4G connection.
2. Farmer can ask a question in Hindi / Punjabi / Telugu / Marathi / Bengali / English, get an answer within the latency budgets in §9, with correct routing between on-device and backend.
3. App functions end-to-end with the device in airplane mode for the intents listed in handoff §2 (`weather`, `crop_plan`, `general`, `alert`).
4. All error codes from API contract §6 are handled with the exact `fallback_hint` behaviour from handoff §4.

## 2. Scope

### In scope (this spec)

- Onboarding (language, location, anonymous farmer id, model download, first sync bundle)
- Main AI chat (text + voice in/out) with intent router, confidence CTA, and error fallback
- Image flow: crop-disease photo upload and follow-up query
- Mandi prices and schemes — bundle-backed, offline-first reads
- Weather card and alerts on home screen
- Farmer twin read/update
- Settings (language, location override, clear cache, model re-download)
- On-device Gemma 4 E4B / E2B integration via MediaPipe LLM Inference (Android)
- Typed backend API client aligned with `api_contract.md` v0.2

### Out of scope (explicit non-goals)

- iOS build (folder stubbed only; no iOS native module this milestone)
- Clerk auth (abstraction prepared; concrete adapter deferred to v2)
- Push notifications registration beyond a feature flag and scaffolding
- Payment / marketplace transactions
- Multi-device sync beyond the backend's sync bundle
- Admin / back-office screens

## 3. Users and devices

- **Primary user:** small-holder farmer, age 25–60, variable literacy, native speaker of one of: Hindi, Punjabi, Telugu, Marathi, Bengali, English.
- **Device target:** Android 10+ (API 29+), 3–6 GB RAM, 720p–1080p screens. Tablets supported but not optimized.
- **Network:** from fibre down to 2G edge and extended offline windows.

Implication: large touch targets (≥48 dp), high-contrast palette, TTS/STT on every primary action, zero jank on 60 Hz, and bundle sizes kept small (no heavy third-party charting libs until proven necessary).

## 4. Architecture overview

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer (Expo Router, NativeWind, RN primitives)       │
│  - Each screen = feature slice; a11y + i18n baked in     │
└───────────────┬──────────────────────────┬───────────────┘
                │                          │
       ┌────────▼────────┐        ┌────────▼────────┐
       │  TanStack Query │        │  Zustand stores │
       │  (server state) │        │  (UI/local only)│
       └────────┬────────┘        └─────────────────┘
                │
   ┌────────────▼────────────────────────────────────┐
   │  Intent Router (src/shared/api/routing.ts)      │
   │  - reads connectivity + device_intent           │
   │  - decides: on-device vs backend                │
   │  - applies confidence<0.70 CTA                  │
   │  - applies error.fallback_hint                  │
   └─┬──────────────────────────────────────┬────────┘
     │                                      │
┌────▼───────────────┐           ┌──────────▼────────────┐
│ Backend API client │           │ On-device Gemma facade│
│ fetch + error      │           │ Expo Module wrapping  │
│ envelope parser    │           │ MediaPipe LLM Infer.  │
│ (POST /query, etc) │           │ (gemma-4-e4b / e2b)   │
└────┬───────────────┘           └─────────┬─────────────┘
     │                                     │
     └──────────────┬──────────────────────┘
                    │
       ┌────────────▼────────────────────┐
       │ Local persistence               │
       │ - expo-sqlite: sync bundle,     │
       │   chat history, twin cache      │
       │ - expo-secure-store: farmer_id  │
       │ - expo-file-system: model bins  │
       └─────────────────────────────────┘
```

Guiding rule: the Intent Router is the **single** place that decides on-device vs backend. Every feature calls `askAgent(query, context)` and reads a unified `AgentResponse`.

## 5. Tech stack

| Layer          | Choice                                                                    | Rationale                                               |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Framework      | Expo SDK 52 + Prebuild + Dev Client + EAS Build                           | Full native access for MediaPipe + Expo DX              |
| Language       | TypeScript strict                                                         | Matches senior-dev rules                                |
| Navigation     | Expo Router v4 (typed routes)                                             | Modern Expo standard, typed deep links                  |
| Styling        | NativeWind 4 + theme tokens                                               | Fast iteration, easy Figma-token mapping                |
| Server state   | TanStack Query v5                                                         | Matches user rule; single source of server state        |
| Client state   | Zustand                                                                   | Matches user rule; domain-scoped slices                 |
| Forms          | react-hook-form + zod                                                     | Production standard, type-safe                          |
| i18n           | i18next + react-i18next + expo-localization                               | 6 scripts, lazy namespace loading                       |
| Local DB       | expo-sqlite                                                               | First-party, works with Prebuild out of the box         |
| Secure storage | expo-secure-store                                                         | Android Keystore backed                                 |
| Network        | @react-native-community/netinfo                                           | Drives connectivity state for router                    |
| Camera/image   | expo-image-picker + expo-image-manipulator                                | Upload pipeline compresses before send                  |
| Voice          | expo-speech (TTS) + @react-native-voice/voice (STT)                       | Non-negotiable for low-literacy users                   |
| Push           | expo-notifications (feature-flagged scaffold)                             | Future weather alerts                                   |
| On-device LLM  | Custom Expo Module wrapping MediaPipe LLM Inference (Android)             | Only supported path for Gemma on Android                |
| Auth           | Abstraction; v1 anonymous UUID, v2 Clerk Expo SDK                         | Contract uses farmer_id in body; Clerk slots in cleanly |
| Testing        | Jest + @testing-library/react-native + Maestro (e2e)                      | Maestro > Detox for Expo                                |
| Lint/format    | ESLint (`eslint-config-expo`) + Prettier + tsc strict                     | Uniform with Expo ecosystem                             |
| CI/CD          | GitHub Actions (lint, type-check, unit, maestro) + EAS Build + EAS Submit | Production deploy path                                  |

## 6. Folder structure

```
krishisaathi-ai-mobile/
├── app/                             # Expo Router routes/layouts only; no business logic
│   ├── _layout.tsx                  # Providers: QueryClient, i18n, theme, auth, network
│   ├── index.tsx                    # Splash → onboarding or (tabs)
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── language.tsx
│   │   ├── location.tsx             # state + district, GPS prefill + manual
│   │   ├── model-download.tsx       # Gemma-4 E4B/E2B + first sync bundle
│   │   └── done.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Bottom tabs
│   │   ├── home.tsx                 # Weather card, alerts, quick actions
│   │   ├── chat.tsx                 # Main AI chat
│   │   ├── scan.tsx                 # Crop-disease camera
│   │   ├── mandi.tsx                # Market prices (bundle-backed)
│   │   └── profile.tsx              # Farmer twin, settings
│   ├── chat/[id].tsx
│   ├── scheme/[id].tsx
│   └── +not-found.tsx
│
├── src/
│   ├── features/                    # Vertical slices by bounded capability
│   │   ├── chat/
│   │   │   ├── api/                 # useSendQuery mutation, chat history queries
│   │   │   ├── components/          # MessageBubble, ComposerBar, VoiceButton, ConfidenceCTA
│   │   │   ├── hooks/               # useAgentResponse
│   │   │   ├── store/               # Zustand: composer, streaming flags
│   │   │   └── types.ts
│   │   ├── onboarding/
│   │   ├── image-scan/              # /query/image + /query with image_ref
│   │   ├── mandi/
│   │   ├── schemes/
│   │   ├── weather/
│   │   ├── twin/                    # GET/PUT /farmer/{id}/twin
│   │   └── settings/
│   │
│   ├── shared/                      # Cross-feature infrastructure
│   │   ├── api/
│   │   │   ├── client.ts            # fetch wrapper; timeouts from handoff §9
│   │   │   ├── endpoints.ts         # Typed per-endpoint callers
│   │   │   ├── errors.ts            # ErrorEnvelope parsing; mapError; retry policy
│   │   │   ├── routing.ts           # Intent Router (the brain)
│   │   │   └── types.ts             # Shared API types (generated from OpenAPI when available)
│   │   ├── ondevice/
│   │   │   ├── gemma.ts             # JS facade: loadModel, generate, cancel
│   │   │   ├── confidence.ts        # CONFIDENCE_THRESHOLD_LOW = 0.70
│   │   │   └── mock.ts              # Deterministic mock for demos without model
│   │   ├── storage/
│   │   │   ├── db.ts                # expo-sqlite init + migrations
│   │   │   ├── bundle.ts            # Sync bundle read/write/version check
│   │   │   ├── chat.ts              # Chat history persistence
│   │   │   └── secure.ts            # expo-secure-store wrapper
│   │   ├── i18n/
│   │   │   ├── index.ts
│   │   │   └── locales/{en,hi,pa,te,mr,bn}.json
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx     # Strategy abstraction
│   │   │   ├── anonymous.ts         # v1 UUID → farmer_id
│   │   │   └── clerk.ts             # v2 stub
│   │   ├── network/
│   │   │   ├── useConnectivity.ts   # → "online" | "offline" | "degraded"
│   │   │   └── NetworkBanner.tsx
│   │   ├── voice/
│   │   │   ├── useTTS.ts
│   │   │   └── useSTT.ts
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   │   ├── tokens.ts        # Figma-sourced colors, typography, spacing
│   │   │   │   └── ThemeProvider.tsx
│   │   │   ├── primitives/          # Text, Button, Card, Input, Sheet, ListItem
│   │   │   ├── feedback/            # Toast, ErrorBanner, Skeleton, EmptyState
│   │   │   └── icons.ts
│   │   ├── hooks/                   # useDebounce, useAppState, useInterval
│   │   ├── utils/                   # date, format, guards
│   │   └── config/
│   │       ├── env.ts               # Typed public env access
│   │       └── constants.ts         # Timeouts, thresholds from handoff
│
├── modules/
│   └── gemma-llm/                   # Expo Module: MediaPipe LLM Inference wrapper
│       ├── android/
│       ├── ios/                     # stub
│       ├── expo-module.config.json
│       └── src/                     # TS types + JS fallback
│
├── assets/
│   ├── fonts/                       # Noto Sans for all 6 scripts
│   ├── images/
│   └── lottie/
│
├── scripts/
│   ├── gen-api-types.ts
│   └── download-models.ts
│
├── __tests__/                       # e2e/integration; unit tests co-located as *.test.ts
├── maestro/                         # e2e flows
│
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
│
├── app.config.ts
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json                    # strict, path aliases @/features, @/shared
├── eslint.config.js
├── .env.example
├── package.json
└── README.md
```

Decomposition rules:

- **`app/` holds only routes and layouts.** Screens re-export feature screens.
- **`src/features/*` are vertical slices.** api + components + hooks + store + types live together.
- **`src/shared/*` is cross-cutting infra**, each subfolder owns a single responsibility.
- **`modules/gemma-llm/` is an Expo Module** — the blessed way to ship a TurboModule in an Expo prebuild project.

## 7. Intent Router contract

`src/shared/api/routing.ts` exposes:

```ts
export type DeviceIntent =
  | "crop_disease"
  | "scheme_query"
  | "market_price"
  | "financial"
  | "weather"
  | "crop_plan"
  | "general"
  | "alert";

export type Connectivity = "online" | "offline" | "degraded";
export type Language = "hi" | "en" | "pa" | "te" | "mr" | "bn";

export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  intent: DeviceIntent;
};

export type AgentResponse = {
  text: string;
  structured?: unknown;
  confidence: number;
  source: "ondevice" | "backend";
  modelUsed: string;
  canEscalate: boolean; // true when source=ondevice && confidence<0.70 && network available
  banner?: "network_busy" | "retry_later";
};

export type AgentContext = {
  farmerId: string;
  location: { state: string; district: string; lat?: number; lng?: number };
  connectivity: Connectivity;
  deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" | "gemma-4-e2b-it" };
};

export async function askAgent(query: AgentQuery, context: AgentContext): Promise<AgentResponse>;
```

Routing decision (handoff §2 verbatim):

1. If `connectivity === "offline"` → on-device (`e4b` by default, `e2b` if RAM < 4 GB).
2. Else if `intent ∈ {weather, crop_plan, general, alert}` → on-device.
3. Else → backend `POST /api/v1/query`.

Error fallback (handoff §4):

- Backend returns `fallback_hint: "USE_ONDEVICE"` → silently re-run on-device; response carries `banner: "network_busy"`.
- `"RETRY_ONLINE_LATER"` → surface retry CTA; do **not** auto-rerun on-device.
- `null` → surface error message.

Confidence (handoff §3):

- On-device response with `confidence < 0.70` → `canEscalate: true`; UI renders "Get expert analysis (needs internet)" CTA.

## 8. Data flows

### 8.1 First launch

1. Load i18n (device locale → supported language or default `en`).
2. Issue anonymous `farmer_id` (UUID v4) and persist in `expo-secure-store`.
3. Onboarding: language → location (GPS with manual override) → model download + first sync bundle in parallel → done.
4. Persist `bundle_version` from `X-Bundle-Version`.

### 8.2 Chat message

1. User types / speaks (STT) → submits.
2. `askAgent` → router chooses path.
3. TanStack Query mutation streams response into Zustand composer store; message persisted to sqlite.
4. Errors mapped via `mapError` → banner, toast, or retry CTA.
5. TTS offered on the assistant bubble.

### 8.3 Image scan

1. `expo-image-picker` → `expo-image-manipulator` (resize to 1280 px longest side, JPEG Q 80, strip EXIF) — ensures ≤5 MB per API §3.
2. `POST /query/image` → `{ image_ref, expires_at }`. Cache `image_ref` in-memory only.
3. `askAgent` with `imageRef` set.
4. If `IMAGE_REF_EXPIRED` (404) → re-upload transparently once, then surface.

### 8.4 Sync bundle

1. On launch (if `connectivity !== "offline"`), `GET /api/v1/sync/bundle?state=X&district=Y&bundle_version=Z`.
2. `304` → no-op. `200` → gunzip, parse, write to sqlite transactionally, update `bundle_version`.
3. All mandi/schemes/weather reads hit sqlite.

### 8.5 Farmer twin

- `GET /farmer/{id}/twin` on settings open; cached in sqlite with TTL 24 h.
- `PUT` on save; optimistic update, revert on failure with error envelope.

## 9. Error handling

`src/shared/api/errors.ts` exposes:

```ts
export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retry_after_seconds?: number;
    fallback_hint?: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  };
};

export class ApiError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  retryAfterSeconds?: number;
  fallbackHint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
}

export function parseErrorResponse(status: number, body: unknown): ApiError;
export function mapError(e: unknown): {
  userMessage: string; // i18n key
  action: "banner" | "toast" | "retry" | "silent-ondevice";
  retryAfterMs?: number;
};
```

Code-table handling (API §6):

| Code                                                         | Action                                     |
| ------------------------------------------------------------ | ------------------------------------------ |
| `VALIDATION_ERROR`                                           | toast (developer surface) + log            |
| `FARMER_NOT_FOUND`                                           | recreate anonymous farmer_id + retry once  |
| `IMAGE_REF_EXPIRED`                                          | silent re-upload, retry once               |
| `LLM_TIMEOUT`, `UPSTREAM_RATE_LIMIT`, `UPSTREAM_UNAVAILABLE` | silent-ondevice + `banner: "network_busy"` |
| `IMAGE_TOO_LARGE`, `IMAGE_UNSUPPORTED_TYPE`                  | toast with actionable copy                 |
| `INTERNAL_ERROR`                                             | retry CTA with `retry_later` banner        |

## 10. Timeouts (handoff §9)

Constants in `src/shared/config/constants.ts`:

```ts
export const TIMEOUTS_MS = {
  query: 10_000,
  queryImage: 5_000,
  syncBundle: 15_000,
  health: 3_000,
} as const;
```

All fetch calls explicitly pass `AbortController` with the matching timeout.

## 11. Accessibility and i18n

- Every interactive element has `accessibilityRole` and `accessibilityLabel` keyed by i18n.
- Minimum touch target 48 × 48 dp.
- Noto Sans fonts bundled for Devanagari, Gurmukhi, Telugu, Bengali, Latin so scripts render reliably.
- Primary actions offer both STT (input) and TTS (output).
- Colour palette meets WCAG AA for text against `surface` and `brand` tokens.

## 12. Security

- No API keys in the client. The backend holds Gemma 4 keys.
- `expo-secure-store` for `farmer_id` and (later) Clerk tokens.
- Strip EXIF from uploaded images.
- Disable JS-debug-remote in release builds; enable Hermes bytecode.
- Validate every network response with zod at the client boundary.

## 13. Testing strategy

- **Unit:** `routing.ts`, `errors.ts`, `confidence.ts`, `bundle.ts`, i18n key presence.
- **Component:** primitives, `ComposerBar`, `MessageBubble`, `ConfidenceCTA`, `NetworkBanner`.
- **Integration:** MSW-native stubbed backend; happy path + every error code in §9.
- **E2E (Maestro):** onboarding → first query (mocked), offline query, image scan, language switch.
- Coverage target v1: 60 % lines for `src/shared`, 40 % overall.

## 14. Non-functional targets

- Cold start < 2.5 s on Pixel 5 (mid-range proxy).
- 60 FPS scroll on chat list with 200 messages.
- APK ≤ 80 MB excluding model binaries (models live in `expo-file-system` app documents).
- 0 network requests on offline paths (verify with `netinfo` fake).

## 15. Risks and mitigations

| Risk                                                  | Mitigation                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| MediaPipe LLM Inference immaturity on low-end devices | Fallback to `gemma-4-e2b-it` below 4 GB RAM; ship a deterministic mock for demos                              |
| Model download size / time on 2G                      | Retriable chunked download with progress UI; allow onboarding to complete without a model and lazy-init later |
| i18n coverage for scientific/scheme terminology       | Allow English fallback per-namespace; never block rendering on a missing key                                  |
| Figma access blocked for the MCP                      | Proceed with route + component shells; theme tokens get finalized once Figma is unblocked                     |
| Clerk not yet integrated but required by user rules   | Auth abstraction ships v1; Clerk adapter delivered in a follow-up plan without touching feature code          |

## 16. Open items (tracked, not blocking)

1. Exact Figma tokens (colors, typography, spacing) — applied once Figma MCP access is granted.
2. Final screen copy in all 6 languages — placeholder English + Hindi ship in v1 locales.
3. Clerk adapter — follow-up plan after v1 demo.

## 17. Acceptance

Implementation plan (next artifact) must produce:

- Working Expo Android app launchable via `eas build --profile development --platform android`.
- Happy-path chat with mocked on-device model.
- Real backend integration verified against local `http://localhost:8000`.
- All error codes from §9 exercised by integration tests.
- Onboarding flow completing with persisted `farmer_id` and sync bundle.
