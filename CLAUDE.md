# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # Expo dev server (press a/i/w to choose platform)
npm run android        # expo run:android (with native modules)
npm run ios            # expo run:ios
npm run web            # expo start --web
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm test               # Jest (both test projects)
npm run test:watch     # Jest watch mode
npm run format         # Prettier write
```

Run a single test file:
```bash
npx jest src/features/chat/guessDeviceIntent.test.ts
```

When touching web-impacting code, also verify:
```bash
npx expo export -p web --output-dir /tmp/web-verify
```

For native modules (e.g. Gemma), a dev client is required:
```bash
npx expo prebuild --platform android
npx expo run:android
```

**Quality gates before claiming done:** `lint` + `typecheck` + `test` must all pass.

## Architecture

Three-layer feature-sliced design; dependencies flow **downward only**:

```
app/          ← thin route files: composition, navigation, wiring only
src/features/ ← domain (hooks, stores, repos) per product feature
src/shared/   ← cross-cutting kernel: API client, storage, auth, UI primitives, i18n, providers
```

- `app/(onboarding)/` — onboarding flow screens
- `app/(tabs)/` — main app tabs (home, chat, mandi, profile)
- `src/features/chat/` — `useSendChatMessage`, `chatMessagesRepo`, `guessDeviceIntent`
- `src/features/mandi/` — market price data from bundled assets
- `src/features/onboarding/` — Zustand store, `useInitialSync`, `onboardingStorage`
- `src/features/twin/` — farmer digital twin cache + hook
- `src/shared/api/` — `apiFetch` client, endpoints, types, errors, `askAgent` routing logic
- `src/shared/ondevice/` — Gemma LLM abstraction (`setGemmaBackend` / `generate`)
- `src/shared/storage/` — `db` (SQLite / web fallback) and `secure` (SecureStore / web fallback)
- `src/shared/providers/` — `RootProviders` (TanStack Query, i18n, fonts, DB init)

**Query routing** (`src/shared/api/routing.ts`): `askAgent` tries on-device Gemma for `weather/crop_plan/general/alert` intents; falls back to `POST /api/v1/query` when offline is false or confidence is low. `ApiError` with `fallbackHint: "USE_ONDEVICE"` triggers graceful degradation.

## Path aliases

| Alias | Maps to |
|-------|---------|
| `@/app/*` | `app/*` |
| `@/features/*` | `src/features/*` |
| `@/shared/*` | `src/shared/*` |
| `@/modules/*` | `modules/*` |

Always import from the **barrel** (`index.ts`), not internal file paths:
```ts
// good
import { useSendChatMessage } from "@/features/chat";
import { Button } from "@/shared/ui/primitives";
import { apiFetch } from "@/shared/api";
```

## Platform-specific files

Metro resolves `.native.ts` (iOS + Android), `.web.ts` (web), or the default `.ts` for Node/tests. Examples: `src/shared/storage/db.*`, `src/shared/storage/secure.*`, `src/shared/network/useConnectivity.*`.

**Never** import `expo-sqlite`, `expo-secure-store`, or `@react-native-community/netinfo` directly from shared or default files — use the facades.

## Common pitfalls (things AI agents commonly get wrong)

- **UUID generation** — use `@/shared/utils/uuid`, not the `uuid` package (wraps `expo-crypto`).
- **Storage** — use `@/shared/storage` facades, not `expo-sqlite`/`expo-secure-store` directly.
- **Network** — use `@/shared/network/useConnectivity`; the web impl already handles `navigator.onLine`.
- **Hardcoded strings** — all user-facing copy must go through `t("key")` with entries in **both** `en.json` and `hi.json`. The parity test (`src/shared/i18n/localeKeys.test.ts`) enforces this.
- **File placement** — no loose `components/` at repo root; UI goes in `src/shared/ui/primitives/` or `src/features/<name>/components/`.
- **Over-bucketing** — don't create empty `api/`, `components/`, `hooks/`, `types/` folders speculatively. Follow the grow rule: add subfolders only when a feature exceeds ~6 files.

## Where to put new code

| Adding… | Destination |
|---------|-------------|
| New screen / route | `app/` (thin — delegate to a feature hook) |
| Domain hook, store, repo | `src/features/<name>/` |
| Reusable UI primitive | `src/shared/ui/primitives/` |
| API endpoint or shared type | `src/shared/api/` |
| Cross-cutting provider | `src/shared/providers/` |
| New locale string | `src/shared/i18n/locales/en.json` + `hi.json` (parity required) |
| Platform-only impl | Same basename with `.web.ts` / `.native.ts` next to the default |

## Testing

- `*.test.ts` — `ts-jest` in Node (no RN modules); for pure logic.
- `*.test.tsx` / `*.test.jsx` — `jest-expo` for React Native component tests.
- Tests live next to source files.
- Add or update a test whenever domain logic (hooks, repos, intent guessing) changes.

## Environment variables

Copy `.env.example` to `.env`. Client-bundle vars must use `EXPO_PUBLIC_` prefix.

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL (default: Android emulator `10.0.2.2:8000`) |
| `EXPO_PUBLIC_USE_NATIVE_GEMMA` | `1` only after native prebuild with Gemma linked |
| `EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH` | On-device model path |

## Commit conventions

Conventional Commits: `type(scope): subject` (imperative, lowercase).  
Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`.  
Branch names: `feat/<area>-<short>`, `fix/<area>-<short>`, `chore/<short>`.

**Never commit or push without explicit user approval.**
