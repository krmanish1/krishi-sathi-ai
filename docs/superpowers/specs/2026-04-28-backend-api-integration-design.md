# Backend API Integration Design

**Date:** 2026-04-28
**Status:** Approved
**Backend:** https://nikesh2290-krishisaathi-backend.hf.space (OpenAPI 3.1.0, v0.2.0)

---

## Overview

Wire the KrishiSaathi AI Expo app to its production backend. All six endpoints are already coded in `src/shared/api/endpoints.ts`; the integration is about fixing the backend URL, aligning TypeScript types to the OpenAPI spec, and adding three missing behaviors: centralized API status tracking, onboarding twin sync, and the scan screen.

---

## Scope

| # | Concern | Files touched |
|---|---------|---------------|
| 1 | Environment URL | `.env.example`, `.env` |
| 2 | TypeScript type audit | `src/shared/api/types.ts` |
| 3 | `ApiStatusProvider` | `src/shared/api/apiStatus.tsx` *(new)*, `src/shared/providers/RootProviders.tsx`, `app/_layout.tsx` |
| 4 | Onboarding twin sync | `src/features/onboarding/useSyncTwin.ts` *(new)*, `app/(onboarding)/done.tsx` |
| 5 | Scan screen | `app/scan.tsx`, `src/features/chat/useSendQuery.ts`, `src/shared/api/routing.ts`, `en.json`, `hi.json` |

Dependencies flow downward only. No existing layer is restructured.

---

## 1. Environment

Update `EXPO_PUBLIC_API_BASE_URL` from the Android-emulator default to the production HF Space:

```
EXPO_PUBLIC_API_BASE_URL=https://nikesh2290-krishisaathi-backend.hf.space
EXPO_PUBLIC_USE_NATIVE_GEMMA=0
EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH=
```

---

## 2. TypeScript Type Audit

Full alignment of `src/shared/api/types.ts` against the OpenAPI spec. Only fields the app currently reads are narrowed; unused fields are typed `unknown` to avoid parse errors on future backend additions.

### `QueryResponse` (maps to backend `AgentResponse`)

| Field | Action |
|-------|--------|
| `response_id` | Add `string` |
| `text` | Already present — no change |
| `structured` | Narrow to `{ kind: string; data: unknown } \| null` |
| `data_source` | Add `"live" \| "offline"` |
| `confidence_level` | Add `"high" \| "medium" \| "low"` |
| `confidence_score` | Already present — no change |
| `model_used` | Already present — no change |
| `fallback_hint` | Verify `"USE_ONDEVICE" \| "RETRY_ONLINE_LATER" \| null` |
| `tool_trace`, `safety_flags`, `language`, `timestamp` | Add as `unknown` |

### `FarmerTwin`

Add missing optional fields:

```ts
land?: { total_acres?: number; soil_type?: string; irrigation?: string };
financial?: { kcc_loan_amount?: number; kcc_bank?: string; pm_fasal_bima?: boolean };
risk_profile?: string | null;
interaction_history?: unknown[];
preferred_language?: string | null;
```

### `QueryRequest`

Add `image_ref?: string | null` to the `query` payload — already mapped in `postQuery()`, just needs the type updated.

### `SyncBundle`

Verify field names match what `mandiFromBundle.ts`'s defensive `rowFromUnknown()` parser expects. Low risk — the parser already handles multiple field name variants.

**No breaking changes.** All additions are optional fields or `unknown`.

---

## 3. `ApiStatusProvider`

### State machine

```
unknown → cold → warm
               ↘ down
```

- **`unknown`** — before first health ping (app still booting)
- **`cold`** — health ping timed out; retrying every 8 s, up to 5 attempts
- **`warm`** — ping succeeded; stays warm for the session
- **`down`** — all 5 retries exhausted; app continues in offline / on-device mode

### Implementation

**`src/shared/api/apiStatus.tsx`** — new file:
- React context exposing `useApiStatus(): "unknown" | "cold" | "warm" | "down"`
- `ApiStatusProvider` component mounts inside `RootProviders` after `AuthProvider`
- Fires `getHealth()` (3 s timeout from `TIMEOUTS_MS.health`) once DB + auth are ready
- On timeout → `cold`, schedules 8 s retry; on success → `warm`; after 5 timeouts → `down`

**`src/shared/providers/RootProviders.tsx`** — wrap children with `ApiStatusProvider`.

### UI — `ServerWakingBanner`

Lives in `app/_layout.tsx` as a sibling of `NetworkBanner`:

- Shown only when status is `cold`: thin amber bar — *"Connecting to server…"* + small spinner
- Disappears automatically on transition to `warm` or `down`
- On `down`: one-time toast — *"Server unavailable — using on-device mode"*
- **Does not block any screen.** Chat, mandi, and scan all continue working in on-device mode while the server wakes.

---

## 4. Onboarding Twin Sync

### New hook: `src/features/onboarding/useSyncTwin.ts`

Keeps `done.tsx` thin and makes the sync unit-testable.

**Responsibilities:**
1. Build a minimal `FarmerTwin` from the onboarding Zustand store
2. Call `putFarmerTwin(farmerId, twin)` — fire-and-forget (does not block navigation)
3. On success or failure: call `setCachedTwin(twin)` to warm the local SQLite cache

**Payload at onboarding time:**

```ts
{
  farmer_id: farmerId,
  location: { state, district },
  preferred_language: language,
  // all other fields absent — backend treats missing fields as null
}
```

**Why fire-and-forget:** the server may still be cold at this moment. If `PUT` fails, `useFarmerTwin` in the profile screen already handles 404 by creating a draft from the local cache — nothing breaks. The twin will be fully synced when the user saves their profile.

### `app/(onboarding)/done.tsx` change

Add one `useSyncTwin()` call. The existing `setCompleted → setTimeout → router.replace` sequence is unchanged.

---

## 5. Scan Screen

### Flow

```
scan.tsx
  → expo-image-picker (camera or gallery)
  → show upload progress indicator
  → postQueryImage({ image, farmer_id, purpose: "crop_diagnosis" })
       → returns { image_ref }
  → appendMessage({ role: "user", text: t("scan.diagnosisRequest") })
       // writes user bubble to chat history directly
  → useSendChatMessage({
        text: t("scan.diagnosisRequest"),
        imageRef,
        forceBackend: true,    // Gemma cannot process images
        skipUserMessage: true  // user bubble already written above
    })
  → router.replace("/(tabs)/chat")
       // user lands on chat with diagnosis appearing
```

### Code changes

**`src/features/chat/useSendQuery.ts`**
- Add `imageRef?: string` to `SendQueryInput`
- Thread it through to the `askAgent` call as `AgentQuery.imageRef`

**`src/shared/api/routing.ts`**
- Pass `imageRef` from `AgentQuery` through `callBackend` → `postQuery` (the `image_ref` mapping already exists in the endpoint)

**`app/scan.tsx`**
- Image picker (camera or gallery via `expo-image-picker`)
- Upload state: idle → uploading → sending → done / error
- On `postQueryImage` failure: show inline error, do not navigate — farmer can retry without losing photo selection

**`src/shared/i18n/locales/en.json` + `hi.json`**
- Add `scan.title`, `scan.diagnosisRequest`, `scan.uploading`, `scan.retryUpload`, `scan.error`
- Both files updated in parity (enforced by `localeKeys.test.ts`)

---

## Error Handling Summary

| Scenario | Behaviour |
|----------|-----------|
| Server cold on startup | `cold` banner shown; on-device mode active |
| Server never wakes (5 retries) | `down` toast; on-device mode for session |
| Twin `PUT` fails at onboarding end | Cached locally; profile screen handles 404 gracefully |
| Image upload fails on scan screen | Inline error on scan screen; no navigation |
| Query fails after image upload | Error bubble in chat (existing `mapErr` handler) |

---

## Out of Scope

- Clerk authentication (v2)
- Voice audio (`voice_b64`) — app already transcribes speech to text before sending
- Retry queue / sync queue for failed twin writes
- Live mandi prices endpoint (no dedicated endpoint exists in v0.2.0; bundle remains the source)
