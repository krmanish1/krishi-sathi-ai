# Background Model Download — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users download the on-device Gemma model in the background while continuing to use online mode; show a home-screen banner and settings section; send push notifications on progress/completion; remove the blocking model-download onboarding screen.

**Architecture:** A new `src/features/model-download/` feature owns the Zustand store (persisted to AsyncStorage), the download orchestrator hook, the banner component, and notification helpers. `preferOffline` is mirrored into `src/shared/ondevice/modelState.ts` so `askAgent` in `src/shared/api/routing.ts` can read it without a layer violation (features importing shared is fine; shared importing features is not).

**Tech Stack:** Zustand 5 + `persist` middleware, `@react-native-async-storage/async-storage`, `expo-notifications` (new install), `expo-file-system/legacy`, `expo-router`, `react-i18next`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/features/model-download/modelDownloadStore.ts` | Zustand store + AsyncStorage persist |
| Create | `src/features/model-download/ModelDownloadNotification.ts` | expo-notifications helpers |
| Create | `src/features/model-download/useBackgroundModelDownload.ts` | Download orchestrator hook |
| Create | `src/features/model-download/ModelDownloadBanner.tsx` | Home screen dismissible banner |
| Create | `src/features/model-download/index.ts` | Barrel export |
| Create | `src/features/model-download/modelDownloadStore.test.ts` | Unit tests for store |
| Modify | `src/shared/ondevice/modelState.ts` | Add `preferOffline` state |
| Modify | `src/shared/ondevice/index.ts` | Export new preferOffline functions |
| Modify | `src/shared/api/routing.ts` | Add preferOffline branch in `askAgent` |
| Modify | `src/shared/providers/RootProviders.tsx` | Stale-download reset + preferOffline sync at boot |
| Modify | `src/shared/i18n/locales/en.json` | Add `modelDownload.*` keys |
| Modify | `src/shared/i18n/locales/hi.json` | Add `modelDownload.*` keys (parity) |
| Modify | `app/settings.tsx` | Add "Offline Model" section |
| Modify | `app/(tabs)/home.tsx` | Mount `<ModelDownloadBanner />` |
| Modify | `app/(onboarding)/location.tsx` | Navigate to `done` instead of `model-download` |

---

### Task 1: Install expo-notifications

**Files:**
- Modify: `package.json` (via expo install)

- [ ] **Step 1: Install the package**

```bash
npx expo install expo-notifications
```

Expected output: `expo-notifications` added to `package.json` dependencies.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing expo-notifications (the module resolves).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: install expo-notifications for background model download"
```

---

### Task 2: Extend modelState.ts with preferOffline

**Files:**
- Modify: `src/shared/ondevice/modelState.ts`
- Modify: `src/shared/ondevice/index.ts`

`routing.ts` already imports from `modelState.ts`. Adding `preferOffline` here avoids a layer violation.

- [ ] **Step 1: Write a failing test for the new functions**

Create `src/shared/ondevice/modelState.test.ts`:

```typescript
import {
  setModelReady,
  isModelReady,
  resetModelState,
  setPreferOffline,
  getPreferOffline,
} from "./modelState";

describe("modelState preferOffline", () => {
  beforeEach(() => resetModelState());

  it("defaults to false", () => {
    expect(getPreferOffline()).toBe(false);
  });

  it("setPreferOffline(true) returns true", () => {
    setPreferOffline(true);
    expect(getPreferOffline()).toBe(true);
  });

  it("resetModelState clears preferOffline", () => {
    setPreferOffline(true);
    resetModelState();
    expect(getPreferOffline()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/shared/ondevice/modelState.test.ts -t "preferOffline" --no-coverage
```

Expected: FAIL — `setPreferOffline is not a function`

- [ ] **Step 3: Implement the changes**

In `src/shared/ondevice/modelState.ts`, add after the existing variables:

```typescript
let _preferOffline = false;

export const setPreferOffline = (value: boolean): void => {
  _preferOffline = value;
};

export const getPreferOffline = (): boolean => _preferOffline;
```

Also update `resetModelState` to clear it:

```typescript
export const resetModelState = (): void => {
  _ready = false;
  _modelPath = "";
  _preferOffline = false;
};
```

- [ ] **Step 4: Export from index**

In `src/shared/ondevice/index.ts`, add to the `modelState` export line:

```typescript
export { isModelReady, setModelReady, getModelPath, resetModelState, setPreferOffline, getPreferOffline } from "./modelState";
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest src/shared/ondevice/modelState.test.ts --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/shared/ondevice/modelState.ts src/shared/ondevice/modelState.test.ts src/shared/ondevice/index.ts
git commit -m "feat(ondevice): add preferOffline state to modelState"
```

---

### Task 3: Create modelDownloadStore.ts

**Files:**
- Create: `src/features/model-download/modelDownloadStore.ts`
- Create: `src/features/model-download/modelDownloadStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/model-download/modelDownloadStore.test.ts`:

```typescript
import { useModelDownloadStore } from "./modelDownloadStore";

// Zustand stores can be tested by calling getState() directly
describe("modelDownloadStore", () => {
  beforeEach(() => {
    useModelDownloadStore.setState({
      status: "idle",
      progress: 0,
      variant: null,
      bannerDismissed: false,
      preferOffline: false,
    });
  });

  it("initial status is idle", () => {
    expect(useModelDownloadStore.getState().status).toBe("idle");
  });

  it("setStatus updates status", () => {
    useModelDownloadStore.getState().setStatus("downloading");
    expect(useModelDownloadStore.getState().status).toBe("downloading");
  });

  it("setProgress updates progress", () => {
    useModelDownloadStore.getState().setProgress(42);
    expect(useModelDownloadStore.getState().progress).toBe(42);
  });

  it("dismissBanner sets bannerDismissed", () => {
    useModelDownloadStore.getState().dismissBanner();
    expect(useModelDownloadStore.getState().bannerDismissed).toBe(true);
  });

  it("setPreferOffline updates preferOffline", () => {
    useModelDownloadStore.getState().setPreferOffline(true);
    expect(useModelDownloadStore.getState().preferOffline).toBe(true);
  });

  it("resetToIdle resets status and progress", () => {
    useModelDownloadStore.getState().setStatus("downloading");
    useModelDownloadStore.getState().setProgress(55);
    useModelDownloadStore.getState().resetToIdle();
    expect(useModelDownloadStore.getState().status).toBe("idle");
    expect(useModelDownloadStore.getState().progress).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/features/model-download/modelDownloadStore.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './modelDownloadStore'`

- [ ] **Step 3: Create the store**

Create `src/features/model-download/modelDownloadStore.ts`:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type DownloadStatus = "idle" | "downloading" | "completed" | "failed";

type State = {
  status: DownloadStatus;
  progress: number;
  variant: "e2b" | "e4b" | null;
  bannerDismissed: boolean;
  preferOffline: boolean;
};

type Actions = {
  setStatus: (status: DownloadStatus) => void;
  setProgress: (progress: number) => void;
  setVariant: (variant: "e2b" | "e4b") => void;
  dismissBanner: () => void;
  setPreferOffline: (prefer: boolean) => void;
  resetToIdle: () => void;
};

export const useModelDownloadStore = create<State & Actions>()(
  persist(
    (set) => ({
      status: "idle",
      progress: 0,
      variant: null,
      bannerDismissed: false,
      preferOffline: false,
      setStatus: (status) => set({ status }),
      setProgress: (progress) => set({ progress }),
      setVariant: (variant) => set({ variant }),
      dismissBanner: () => set({ bannerDismissed: true }),
      setPreferOffline: (preferOffline) => set({ preferOffline }),
      resetToIdle: () => set({ status: "idle", progress: 0 }),
    }),
    {
      name: "krishi-model-download",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        status: s.status,
        progress: s.progress,
        variant: s.variant,
        bannerDismissed: s.bannerDismissed,
        preferOffline: s.preferOffline,
      }),
    },
  ),
);
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest src/features/model-download/modelDownloadStore.test.ts --no-coverage
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/model-download/modelDownloadStore.ts src/features/model-download/modelDownloadStore.test.ts
git commit -m "feat(model-download): add Zustand store with AsyncStorage persistence"
```

---

### Task 4: Create ModelDownloadNotification.ts

**Files:**
- Create: `src/features/model-download/ModelDownloadNotification.ts`

No unit tests here — expo-notifications requires a native runtime. Manual verification in the smoke test at the end.

- [ ] **Step 1: Create the file**

Create `src/features/model-download/ModelDownloadNotification.ts`:

```typescript
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let _progressNotifId: string | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function showProgressNotification(progress: number): Promise<void> {
  try {
    if (_progressNotifId) {
      await Notifications.dismissNotificationAsync(_progressNotifId).catch(() => undefined);
    }
    _progressNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Downloading offline model… ${progress}%`,
        body: "You can continue using the app.",
      },
      trigger: null,
    });
  } catch {
    // notifications not available (Expo Go, permission denied) — silent
  }
}

export async function dismissProgressNotification(): Promise<void> {
  if (!_progressNotifId) return;
  try {
    await Notifications.dismissNotificationAsync(_progressNotifId);
  } catch {
    // ignore
  }
  _progressNotifId = null;
}

export async function showCompletionNotification(): Promise<void> {
  await dismissProgressNotification();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Offline model ready!",
        body: "Open app to enable offline mode.",
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}

export async function showFailureNotification(): Promise<void> {
  await dismissProgressNotification();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Download failed.",
        body: "Open app to retry.",
      },
      trigger: null,
    });
  } catch {
    // silent
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep ModelDownloadNotification
```

Expected: no output (no errors in this file).

- [ ] **Step 3: Commit**

```bash
git add src/features/model-download/ModelDownloadNotification.ts
git commit -m "feat(model-download): add expo-notifications helpers"
```

---

### Task 5: Create useBackgroundModelDownload.ts

**Files:**
- Create: `src/features/model-download/useBackgroundModelDownload.ts`

- [ ] **Step 1: Create the hook**

Create `src/features/model-download/useBackgroundModelDownload.ts`:

```typescript
import { useCallback, useRef } from "react";
import { useModelDownloadStore } from "./modelDownloadStore";
import {
  downloadGemmaModel,
  checkIsOnWifi,
  detectModelVariant,
} from "@/features/onboarding/useModelDownload";
import { setPreferOffline as syncPreferOfflineToRouting } from "@/shared/ondevice/modelState";
import {
  requestNotificationPermission,
  showProgressNotification,
  dismissProgressNotification,
  showCompletionNotification,
  showFailureNotification,
} from "./ModelDownloadNotification";

export function useBackgroundModelDownload() {
  const store = useModelDownloadStore();
  const abortRef = useRef<AbortController | null>(null);
  const lastNotifiedPct = useRef(-1);

  const startDownload = useCallback(async () => {
    if (store.status === "downloading" || store.status === "completed") return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    lastNotifiedPct.current = -1;

    await requestNotificationPermission();

    const v = await detectModelVariant();
    store.setVariant(v);
    store.setStatus("downloading");
    store.setProgress(0);

    await showProgressNotification(0);

    try {
      await downloadGemmaModel(
        ({ received, total }) => {
          if (ctrl.signal.aborted) return;
          const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
          store.setProgress(pct);
          if (pct - lastNotifiedPct.current >= 5) {
            lastNotifiedPct.current = pct;
            void showProgressNotification(pct);
          }
        },
        ctrl.signal,
        v,
      );

      if (ctrl.signal.aborted) return;
      store.setProgress(100);
      store.setStatus("completed");
      await showCompletionNotification();
    } catch (err) {
      if (ctrl.signal.aborted) {
        store.resetToIdle();
        await dismissProgressNotification();
        return;
      }
      store.setStatus("failed");
      await showFailureNotification();
    }
  }, [store]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const setPreferOffline = useCallback(
    (prefer: boolean) => {
      store.setPreferOffline(prefer);
      syncPreferOfflineToRouting(prefer);
    },
    [store],
  );

  return {
    status: store.status,
    progress: store.progress,
    variant: store.variant,
    bannerDismissed: store.bannerDismissed,
    preferOffline: store.preferOffline,
    startDownload,
    cancelDownload,
    dismissBanner: store.dismissBanner,
    setPreferOffline,
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep useBackgroundModelDownload
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/features/model-download/useBackgroundModelDownload.ts
git commit -m "feat(model-download): add download orchestrator hook"
```

---

### Task 6: Create ModelDownloadBanner.tsx

**Files:**
- Create: `src/features/model-download/ModelDownloadBanner.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/model-download/ModelDownloadBanner.tsx`:

```typescript
import { View, Text, StyleSheet, Pressable } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useBackgroundModelDownload } from "./useBackgroundModelDownload";

const INK = "#001E2B";
const INK_MUTED = "#5C6C75";
const ACCENT = "#1B3A28";

export function ModelDownloadBanner() {
  const { t } = useTranslation();
  const { status, progress, bannerDismissed, startDownload, cancelDownload, dismissBanner } =
    useBackgroundModelDownload();

  if (status === "completed" || (status === "idle" && bannerDismissed)) return null;
  if (status === "failed" && bannerDismissed) return null;

  const isDownloading = status === "downloading";

  return (
    <View style={styles.banner}>
      {!isDownloading ? (
        <>
          <MaterialCommunityIcons name="download-circle-outline" size={20} color={ACCENT} />
          <Text style={styles.text} numberOfLines={2}>
            {t("modelDownload.bannerText")}
          </Text>
          <Pressable
            onPress={() => void startDownload()}
            style={styles.actionBtn}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnText}>
              {status === "failed" ? t("modelDownload.retry") : t("modelDownload.download")}
            </Text>
          </Pressable>
          <Pressable
            onPress={dismissBanner}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel={t("modelDownload.dismiss")}
          >
            <MaterialCommunityIcons name="close" size={16} color={INK_MUTED} />
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.progressGroup}>
            <Text style={styles.text}>{t("modelDownload.downloading", { pct: progress })}</Text>
            <View style={styles.trackBg}>
              <View style={[styles.trackFill, { width: `${progress}%` as `${number}%` }]} />
            </View>
          </View>
          <Pressable onPress={cancelDownload} style={styles.actionBtn} accessibilityRole="button">
            <Text style={styles.actionBtnText}>{t("modelDownload.cancel")}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FCDDB5",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: INK,
  },
  progressGroup: { flex: 1, gap: 6 },
  trackBg: {
    height: 4,
    backgroundColor: "rgba(0,30,43,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: ACCENT,
    borderRadius: 20,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  closeBtn: { padding: 4 },
});
```

- [ ] **Step 2: Create barrel index.ts**

Create `src/features/model-download/index.ts`:

```typescript
export { useModelDownloadStore } from "./modelDownloadStore";
export type { DownloadStatus } from "./modelDownloadStore";
export { useBackgroundModelDownload } from "./useBackgroundModelDownload";
export { ModelDownloadBanner } from "./ModelDownloadBanner";
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -E "ModelDownloadBanner|model-download/index"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/features/model-download/ModelDownloadBanner.tsx src/features/model-download/index.ts
git commit -m "feat(model-download): add banner component and feature barrel"
```

---

### Task 7: Add i18n strings

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/hi.json`

- [ ] **Step 1: Add to en.json**

In `src/shared/i18n/locales/en.json`, add a new top-level key `"modelDownload"` before the closing `}` of the JSON:

```json
  "modelDownload": {
    "bannerText": "Use Krishisaath AI without internet — download the offline model (~1.5 GB)",
    "download": "Download",
    "dismiss": "Dismiss",
    "cancel": "Cancel",
    "retry": "Retry",
    "downloading": "Downloading… {{pct}}%",
    "completed": "✓ Offline model ready",
    "failed": "Download failed. Tap to retry.",
    "settingsSection": "Offline Model",
    "settingsDownloadBtn": "Download Offline Model",
    "settingsStatus": "✓ Offline model ready",
    "preferOfflineLabel": "Prefer offline mode when available"
  }
```

- [ ] **Step 2: Add to hi.json**

In `src/shared/i18n/locales/hi.json`, add a matching `"modelDownload"` key:

```json
  "modelDownload": {
    "bannerText": "बिना इंटरनेट के Krishisaath AI उपयोग करें — ऑफलाइन मॉडल डाउनलोड करें (~1.5 GB)",
    "download": "डाउनलोड",
    "dismiss": "बंद करें",
    "cancel": "रद्द करें",
    "retry": "फिर से प्रयास करें",
    "downloading": "डाउनलोड हो रहा है… {{pct}}%",
    "completed": "✓ ऑफलाइन मॉडल तैयार",
    "failed": "डाउनलोड विफल। फिर से प्रयास करें।",
    "settingsSection": "ऑफलाइन मॉडल",
    "settingsDownloadBtn": "ऑफलाइन मॉडल डाउनलोड करें",
    "settingsStatus": "✓ ऑफलाइन मॉडल तैयार",
    "preferOfflineLabel": "उपलब्ध होने पर ऑफलाइन मोड प्राथमिकता दें"
  }
```

- [ ] **Step 3: Run i18n parity test**

```bash
npx jest src/shared/i18n/localeKeys.test.ts --no-coverage
```

Expected: PASS — all keys present in both locales.

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/locales/en.json src/shared/i18n/locales/hi.json
git commit -m "feat(i18n): add modelDownload keys to en and hi locales"
```

---

### Task 8: Update routing.ts — preferOffline branch

**Files:**
- Modify: `src/shared/api/routing.ts`

- [ ] **Step 1: Write a failing test**

Create `src/shared/api/routing.test.ts` (or add to it if it exists):

```typescript
import { askAgent, type AgentQuery, type AgentContext } from "./routing";
import { setModelReady, resetModelState, setPreferOffline } from "@/shared/ondevice/modelState";
import { onDeviceAgent } from "@/shared/ondevice/onDeviceAgent";

jest.mock("@/shared/ondevice/onDeviceAgent", () => ({
  onDeviceAgent: { run: jest.fn().mockResolvedValue({ text: "ondevice", source: "ondevice", confidence: 0.9, modelUsed: "gemma", canEscalate: false }) },
}));
jest.mock("./endpoints", () => ({
  postQuery: jest.fn().mockResolvedValue({ text: "backend", structured: null, confidence_score: 0.8, model_used: "gpt" }),
}));
jest.mock("@/shared/storage/bundle", () => ({
  loadBundlePayload: jest.fn().mockResolvedValue(null),
}));

const q: AgentQuery = { text: "hello", language: "en", intent: "general" };
const ctx: AgentContext = {
  farmerId: "f1",
  conversationId: "c1",
  location: { state: "MH", district: "Pune" },
  connectivity: "online",
  deviceCapabilities: { ondeviceModel: "gemma-4-e4b" },
};

describe("askAgent preferOffline", () => {
  beforeEach(() => {
    resetModelState();
    jest.clearAllMocks();
  });

  it("uses backend when online and preferOffline is false", async () => {
    setModelReady("/model/path");
    setPreferOffline(false);
    const result = await askAgent(q, ctx);
    expect(result.source).toBe("backend");
  });

  it("uses ondevice when online and preferOffline is true and model is ready", async () => {
    setModelReady("/model/path");
    setPreferOffline(true);
    const result = await askAgent(q, ctx);
    expect(result.source).toBe("ondevice");
    expect(onDeviceAgent.run).toHaveBeenCalled();
  });

  it("uses backend when preferOffline is true but model is NOT ready", async () => {
    setPreferOffline(true);
    // model not ready
    const result = await askAgent(q, ctx);
    expect(result.source).toBe("backend");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest src/shared/api/routing.test.ts -t "preferOffline" --no-coverage
```

Expected: FAIL — `"uses ondevice when online and preferOffline is true"` fails (currently always calls backend when online).

- [ ] **Step 3: Add preferOffline branch to askAgent**

In `src/shared/api/routing.ts`, add this import:

```typescript
import { isModelReady, getPreferOffline } from "@/shared/ondevice/modelState";
```

(The `isModelReady` import is already there — just add `getPreferOffline` to it.)

Then, inside `askAgent`, add the preferOffline branch **before** the `try { callBackend }` block:

```typescript
  // Prefer on-device when user opted in and model is ready (online but wants offline quality)
  if (isModelReady() && getPreferOffline() && ctx.connectivity !== "offline") {
    return onDeviceAgent.run(
      q,
      {
        district: ctx.location.district,
        state: ctx.location.state,
        ...(ctx.land !== undefined ? { land: ctx.land } : {}),
        ...(ctx.hasAadhaar !== undefined ? { hasAadhaar: ctx.hasAadhaar } : {}),
      },
      q.signal,
    );
  }
```

The full `askAgent` function after the offline block and before the existing `try`:

```typescript
export const askAgent = async (
  q: AgentQuery,
  ctx: AgentContext,
  opts?: AskAgentOptions,
): Promise<AgentResponse> => {
  if (ctx.connectivity === "offline") {
    if (!isModelReady()) {
      const bundle = await loadBundlePayload().catch(() => null);
      return offlineFallback(q, bundle ?? undefined);
    }
    return onDeviceAgent.run(
      q,
      {
        district: ctx.location.district,
        state: ctx.location.state,
        ...(ctx.land !== undefined ? { land: ctx.land } : {}),
        ...(ctx.hasAadhaar !== undefined ? { hasAadhaar: ctx.hasAadhaar } : {}),
      },
      q.signal,
    );
  }

  // Prefer on-device when user opted in and model is ready
  if (!opts?.forceBackend && isModelReady() && getPreferOffline()) {
    return onDeviceAgent.run(
      q,
      {
        district: ctx.location.district,
        state: ctx.location.state,
        ...(ctx.land !== undefined ? { land: ctx.land } : {}),
        ...(ctx.hasAadhaar !== undefined ? { hasAadhaar: ctx.hasAadhaar } : {}),
      },
      q.signal,
    );
  }

  // Online or degraded: backend first, fall back to on-device on USE_ONDEVICE hint
  try {
    return await callBackend(q, ctx);
  } catch (e) {
    // ... existing fallback code unchanged ...
  }
};
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest src/shared/api/routing.test.ts --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/routing.ts src/shared/api/routing.test.ts
git commit -m "feat(routing): route to on-device when user prefers offline mode"
```

---

### Task 9: Update settings.tsx — Offline Model section

**Files:**
- Modify: `app/settings.tsx`

- [ ] **Step 1: Add imports to settings.tsx**

Add these imports at the top of `app/settings.tsx`:

```typescript
import { Switch } from "react-native";
import { useBackgroundModelDownload } from "@/features/model-download";
```

- [ ] **Step 2: Call the hook inside SettingsScreen**

Inside `SettingsScreen()`, after the existing hook calls, add:

```typescript
  const {
    status: dlStatus,
    progress: dlProgress,
    preferOffline,
    startDownload,
    cancelDownload,
    setPreferOffline,
  } = useBackgroundModelDownload();
```

- [ ] **Step 3: Add the download section JSX**

Inside the `ScrollView` `contentContainerStyle`, add a new section between "App Information" and "Notifications":

```tsx
        {/* Offline Model section */}
        <Text style={styles.sectionLabel}>{t("modelDownload.settingsSection")}</Text>
        <View style={styles.card}>
          {dlStatus === "idle" || dlStatus === "failed" ? (
            <>
              {dlStatus === "failed" ? (
                <View style={[styles.row, { paddingBottom: 4 }]}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#DC2626" />
                  </View>
                  <Text style={[styles.rowLabel, { color: "#DC2626" }]}>
                    {t("modelDownload.failed")}
                  </Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => void startDownload()}
                style={{ opacity: 1 }}
              >
                <View style={styles.row}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="download-outline" size={18} color={INK_MUTED} />
                  </View>
                  <Text style={styles.rowLabel}>{t("modelDownload.settingsDownloadBtn")}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={INK_MUTED} />
                </View>
              </Pressable>
            </>
          ) : dlStatus === "downloading" ? (
            <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 10 }]}>
              <Text style={styles.rowLabel}>
                {t("modelDownload.downloading", { pct: dlProgress })}
              </Text>
              <View style={dlStyles.trackBg}>
                <View style={[dlStyles.trackFill, { width: `${dlProgress}%` as `${number}%` }]} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={cancelDownload}
                style={dlStyles.cancelBtn}
              >
                <Text style={dlStyles.cancelBtnText}>{t("modelDownload.cancel")}</Text>
              </Pressable>
            </View>
          ) : (
            // completed
            <>
              <View style={styles.row}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16A34A" />
                </View>
                <Text style={[styles.rowLabel, { color: "#16A34A" }]}>
                  {t("modelDownload.settingsStatus")}
                </Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="wifi-off" size={18} color={INK_MUTED} />
                </View>
                <Text style={styles.rowLabel}>{t("modelDownload.preferOfflineLabel")}</Text>
                <Switch
                  value={preferOffline}
                  onValueChange={setPreferOffline}
                  trackColor={{ true: "#1B3A28" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>
```

- [ ] **Step 4: Add dlStyles**

At the end of `app/settings.tsx`, add:

```typescript
const dlStyles = StyleSheet.create({
  trackBg: {
    height: 6,
    backgroundColor: "rgba(0,30,43,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  trackFill: {
    height: 6,
    backgroundColor: "#1B3A28",
    borderRadius: 3,
  },
  cancelBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#1B3A28",
    borderRadius: 20,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep settings
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/settings.tsx
git commit -m "feat(settings): add Offline Model download section"
```

---

### Task 10: Mount ModelDownloadBanner in home.tsx

**Files:**
- Modify: `app/(tabs)/home.tsx`

- [ ] **Step 1: Add import**

In `app/(tabs)/home.tsx`, add to existing imports:

```typescript
import { ModelDownloadBanner } from "@/features/model-download";
```

- [ ] **Step 2: Mount the banner**

Find the `<ScrollView` in `home.tsx`. Place `<ModelDownloadBanner />` immediately before the `<ScrollView`:

```tsx
      <ModelDownloadBanner />
      <ScrollView
        // ... existing props unchanged
```

The banner is self-contained — it renders `null` when hidden, so no conditional needed here.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "home.tsx"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/home.tsx
git commit -m "feat(home): mount ModelDownloadBanner"
```

---

### Task 11: Update RootProviders.tsx — stale state reset + preferOffline sync

**Files:**
- Modify: `src/shared/providers/RootProviders.tsx`

On boot: if the persisted store says `status === "downloading"`, the app was killed mid-download — reset to idle. Also sync `preferOffline` from the persisted store into `modelState.ts` so routing uses the right value immediately.

- [ ] **Step 1: Add imports**

In `src/shared/providers/RootProviders.tsx`, add:

```typescript
import { useModelDownloadStore } from "@/features/model-download";
import { setPreferOffline as syncPreferOffline } from "@/shared/ondevice";
```

- [ ] **Step 2: Add sync logic to the boot useEffect**

Inside the `(async () => { ... })()` in the boot `useEffect`, add after the `checkLocalGemmaModelOnDisk()` line:

```typescript
        // Sync persisted model-download preferences into routing state
        const dlState = useModelDownloadStore.getState();
        if (dlState.status === "downloading") {
          // App was killed mid-download — treat as idle so user can retry
          dlState.resetToIdle();
        }
        if (dlState.preferOffline) {
          syncPreferOffline(true);
        }
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep RootProviders
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/shared/providers/RootProviders.tsx
git commit -m "feat(providers): reset stale download state and sync preferOffline at boot"
```

---

### Task 12: Update onboarding — skip model-download screen

**Files:**
- Modify: `app/(onboarding)/location.tsx`

`location.tsx` currently navigates to `/(onboarding)/model-download` after saving location. Change it to go directly to `/(onboarding)/done`.

- [ ] **Step 1: Change the navigation target**

In `app/(onboarding)/location.tsx`, line ~87:

```typescript
// Before:
router.push("/(onboarding)/model-download");

// After:
router.push("/(onboarding)/done");
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "location.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/(onboarding)/location.tsx
git commit -m "feat(onboarding): skip model-download screen, go directly to done"
```

---

### Task 13: Run quality gates

**Files:** none (verification only)

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Tests**

```bash
npm test
```

Expected: all tests pass, including new tests for `modelState`, `modelDownloadStore`, and `routing`.

- [ ] **Step 4: Fix any issues before proceeding**

If any quality gate fails, fix the error in the relevant file and re-run the failing gate.

---

### Task 14: Final integration commit

- [ ] **Step 1: Verify nothing uncommitted**

```bash
git status
```

Expected: clean working tree (all changes committed in prior tasks).

- [ ] **Step 2: Tag the feature complete**

```bash
git log --oneline -10
```

Review the commit chain. All 10+ feature commits should be present.

---

## Manual Smoke Test Checklist

After building the dev client (`npx expo run:android` or `npx expo run:ios`):

1. **Home screen** — Banner shows with "Download" and "×" buttons.
2. **Dismiss** — tap "×", banner disappears and does not return.
3. **Download** — tap "Download"; banner shows progress bar and "Cancel"; notification appears.
4. **Cancel** — tap "Cancel"; banner reverts to idle (or hides if dismissed).
5. **Completion** — let download finish; banner disappears; notification "Offline model ready!" fires.
6. **Settings** — navigate to Settings → "Offline Model" section shows "✓ Offline model ready" and "Prefer offline mode" toggle.
7. **preferOffline toggle** — enable toggle; send a chat message online; verify model uses on-device (check `source` in response or add a console.log).
8. **Onboarding** — create a new account; onboarding goes directly to "Done" screen, no model-download screen.
9. **Kill + restart** — start download, kill app, reopen; banner should be back in idle (not stuck on "Downloading").
