# Background Model Download — Design Spec
**Date:** 2026-05-16  
**Status:** Approved

## Summary

Allow users to download the on-device Gemma model in the background while continuing to use online mode. On completion, a push notification lets them enable offline mode from settings. Onboarding no longer blocks on model download.

---

## Architecture

### New files

```
src/features/model-download/
  modelDownloadStore.ts           Zustand store (status, progress, variant, dismissed)
  useBackgroundModelDownload.ts   Download orchestrator hook
  ModelDownloadBanner.tsx         Home screen dismissible banner
  ModelDownloadNotification.ts    expo-notifications helpers
```

### Modified files

- `app/(onboarding)/_layout.tsx` — remove `model-download` screen from route stack
- `app/(tabs)/home.tsx` — mount `<ModelDownloadBanner />`
- `app/settings.tsx` — add Download section and offline-mode toggle
- `src/shared/api/routing.ts` — check `PREFER_OFFLINE` preference in `askAgent`

---

## State Machine

```
idle ──► downloading ──► completed
              │
              ▼
           failed  (retryable → idle)
```

Persisted to `AsyncStorage` via Zustand `persist` middleware. Fields:
- `status: "idle" | "downloading" | "completed" | "failed"`
- `progress: number` (0–100)
- `variant: "e2b" | "e4b" | null`
- `bannerDismissed: boolean`
- `preferOffline: boolean`

---

## Download Flow

1. User taps **Download** (banner or settings)
2. Request `expo-notifications` permission (once; skip if already granted)
3. Detect variant via existing `detectModelVariant()`
4. Set `status = "downloading"`, post sticky progress notification
5. Call existing `downloadGemmaModel(onProgress, abortSignal, variant)`
6. `onProgress` → update `store.progress`; update notification every 5%
7. **Complete** → `setModelReady(path)` → `status = "completed"` → completion notification
8. **Cancel** → `abortSignal.abort()` → `status = "idle"` → dismiss notification
9. **Fail** → `status = "failed"` → failure notification

---

## Notifications

| Event | Content |
|-------|---------|
| Download starts | `"Downloading offline model… 0%"` (sticky, updates) |
| Progress (every 5%) | `"Downloading offline model… 42%"` |
| Complete | `"Offline model ready! Open app to enable offline mode."` |
| Failed | `"Download failed. Open app to retry."` |

Uses `expo-notifications` local notifications. No server push needed.

---

## Home Screen Banner (`ModelDownloadBanner`)

**Shown when:** `status === "idle" && !bannerDismissed`  
**Text:** `"Use Krishisath AI without internet — download the offline model (~1.5 GB)"`  
**Actions:** `[Download]` `[×]`  
- `×` sets `bannerDismissed = true` (permanent, persisted)

**While downloading:** banner morphs to show progress bar + **Cancel** button  
**While completed:** banner hidden entirely

---

## Settings Screen — Download Section

| State | UI |
|-------|-----|
| `idle` | "Download Offline Model" button |
| `downloading` | Progress bar (0–100%) + Cancel button |
| `failed` | Error text + "Retry" button |
| `completed` | "✓ Offline model ready" label |

**Offline mode toggle** (visible only when `status === "completed"`):  
`"Prefer offline mode when available"` — writes `preferOffline` to store.  
Default: `false` (online preferred even after model is downloaded).

---

## Routing Change

`askAgent` in `src/shared/api/routing.ts` currently routes to on-device when `connectivity === "offline"`. Add additional check:

```
if (isModelReady() && store.preferOffline && connectivity !== "offline") {
  // use on-device even when online
}
```

Existing offline fallback behaviour unchanged.

---

## Onboarding Change

Remove `model-download` screen from `app/(onboarding)/_layout.tsx` route stack.  
New users start with online mode by default.  
Existing users with model already on disk: `checkLocalGemmaModelOnDisk()` (runs at boot in `RootProviders`) already marks model ready — no change needed.

---

## Error Handling

- Network error mid-download → `status = "failed"`, notification, retry in settings
- Insufficient storage → catch `FileSystem` error, show specific message
- Permission denied for notifications → download still works, no notification shown (silent)
- App killed mid-download → `status` persists as `"downloading"` → on next boot, detect stale state, reset to `"idle"`

---

## Out of Scope

- True OS background download (requires background fetch entitlement)
- Automatic model updates / version checks
- Download over cellular (always warns + blocks; user must use WiFi)
