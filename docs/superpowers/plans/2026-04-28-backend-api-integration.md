# Backend API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the KrishiSaathi Expo app to its production backend at `https://nikesh2290-krishisaathi-backend.hf.space` by fixing the URL, aligning TypeScript types, adding a centralized API-status banner, syncing the farmer twin at onboarding completion, and finishing the scan-screen image-to-chat flow.

**Architecture:** Three-layer feature-sliced repo (`app/` → `src/features/` → `src/shared/`); all new code follows existing patterns. `ApiStatusProvider` is a new React context inside `RootProviders`. `useSyncTwin` is a new hook/function in `src/features/onboarding/`. No existing layers are restructured.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript strict, NativeWind, TanStack Query v5, Zustand, i18next, expo-sqlite, ts-jest (unit-ts project for `.test.ts`), jest-expo (app project for `.test.tsx`)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.env.example` | Modify | Production backend URL |
| `.env` | Modify/Create | Local env (git-ignored) |
| `src/shared/api/types.ts` | Modify | Align to OpenAPI spec |
| `src/shared/api/apiStatus.tsx` | **Create** | ApiStatusProvider + useApiStatus |
| `src/shared/api/apiStatus.test.tsx` | **Create** | State-machine tests |
| `src/shared/api/ServerWakingBanner.tsx` | **Create** | Cold-start UI banner |
| `src/features/onboarding/useSyncTwin.ts` | **Create** | syncTwinOnboarding + useSyncTwin |
| `src/features/onboarding/useSyncTwin.test.ts` | **Create** | Unit tests for pure sync fn |
| `src/features/onboarding/index.ts` | Modify | Export useSyncTwin |
| `src/features/twin/useFarmerTwin.ts` | Modify | Draft objects use new field names |
| `app/(tabs)/profile.tsx` | Modify | Use preferred_language, current_crops |
| `src/features/chat/useSendQuery.ts` | Modify | Add imageRef to SendQueryInput |
| `src/shared/providers/RootProviders.tsx` | Modify | Mount ApiStatusProvider |
| `app/_layout.tsx` | Modify | Render ServerWakingBanner |
| `app/(onboarding)/done.tsx` | Modify | Call useSyncTwin |
| `app/scan.tsx` | Modify | Full image→query→chat flow |
| `src/shared/i18n/locales/en.json` | Modify | server.* + scan.* keys |
| `src/shared/i18n/locales/hi.json` | Modify | Same keys in Hindi |

---

## Task 1: Environment URL

**Files:**
- Modify: `.env.example`
- Modify/Create: `.env`

- [ ] **Step 1.1: Update `.env.example`**

Replace the file contents entirely:

```
EXPO_PUBLIC_API_BASE_URL=https://nikesh2290-krishisaathi-backend.hf.space
EXPO_PUBLIC_USE_NATIVE_GEMMA=0
EXPO_PUBLIC_NATIVE_GEMMA_MODEL_PATH=
```

- [ ] **Step 1.2: Update your local `.env`**

```bash
cp .env.example .env
```

If `.env` already exists, set `EXPO_PUBLIC_API_BASE_URL=https://nikesh2290-krishisaathi-backend.hf.space` and leave other values unchanged.

- [ ] **Step 1.3: Verify the health endpoint responds**

```bash
curl -s https://nikesh2290-krishisaathi-backend.hf.space/api/v1/health
```

Expected: JSON response (may take 30–60 s if the Space is cold). A timeout is fine — the app handles it.

---

## Task 2: TypeScript Type Audit

**Files:**
- Modify: `src/shared/api/types.ts`
- Modify: `src/features/twin/useFarmerTwin.ts`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 2.1: Replace `src/shared/api/types.ts` with the corrected version**

```typescript
import type { Language } from "@/shared/config/constants";

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

// Matches backend: "live" (from network) | "offline" (served from server cache)
export type DataSource = "live" | "offline";

export type QueryRequest = {
  farmer_id: string;
  query: {
    text: string;
    voice_b64?: string | null;
    image_ref: string | null;
    language: Language;
  };
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
  structured?: { kind: string; data: unknown } | null;
  data_source: DataSource;
  confidence_level: "low" | "medium" | "high";
  confidence_score: number;
  model_used: string;
  tool_trace: unknown;
  safety_flags: unknown;
  fallback_hint: "USE_ONDEVICE" | "RETRY_ONLINE_LATER" | null;
  language: string;
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

// Aligned to backend AgentTwin schema.
// preferred_language replaces the old `language` field.
// current_crops replaces the old `crops` field.
export type FarmerTwin = {
  farmer_id: string;
  name?: string | null;
  preferred_language?: string | null;
  location: {
    district: string;
    state: string;
    village?: string;
    lat?: number;
    lng?: number;
  };
  current_crops?: { name: string; area_acres: number; sown_on?: string }[];
  land?: { total_acres?: number; soil_type?: string; irrigation?: string };
  financial?: {
    kcc_loan_amount?: number;
    kcc_bank?: string;
    pm_fasal_bima?: boolean;
  };
  risk_profile?: string | null;
  interaction_history?: unknown[];
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

- [ ] **Step 2.2: Update the draft objects in `src/features/twin/useFarmerTwin.ts`**

Find the two places where a draft `FarmerTwin` is constructed (offline fallback and 404 path) and update them. Replace `language` with `preferred_language` and `crops` with `current_crops`:

```typescript
// Offline fallback (inside queryFn, connectivity === "offline" branch):
return {
  farmer_id: farmerId,
  preferred_language: lang,
  location: { state: locState ?? "—", district: locDistrict ?? "—" },
  current_crops: [],
};

// 404 draft (inside the catch block, e.status === 404 branch):
const draft: FarmerTwin = {
  farmer_id: farmerId,
  preferred_language: lang,
  location: { state: locState ?? "—", district: locDistrict ?? "—" },
  current_crops: [],
};
```

- [ ] **Step 2.3: Update `app/(tabs)/profile.tsx` to use new field names**

In the `useEffect` that seeds the form:
```typescript
useEffect(() => {
  if (!twin) return;
  queueMicrotask(() => {
    setName(twin.name ?? "");
    setCrops(twin.current_crops?.map((c) => c.name).join(", ") ?? "");
  });
}, [twin]);
```

In the save `Pressable` onPress handler, replace the `next: FarmerTwin` construction:
```typescript
const lg: Language = APP_LANG.includes(i18n.language as Language)
  ? (i18n.language as Language)
  : ((twin.preferred_language as Language | null) ?? "en");
const next: FarmerTwin = {
  farmer_id: twin.farmer_id,
  preferred_language: lg,
  location: twin.location,
  current_crops: names.map((n) => ({ name: n, area_acres: 0 })),
  ...(nm ? { name: nm } : {}),
  ...(twin.livestock ? { livestock: twin.livestock } : {}),
};
```

- [ ] **Step 2.4: Run typecheck — must pass with zero errors**

```bash
npm run typecheck
```

Expected: no output (exit code 0).

---

## Task 3: i18n Additions

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/hi.json`

- [ ] **Step 3.1: Add keys to `en.json`**

Add a `"server"` top-level key after `"network"` and new keys inside the existing `"scan"` object:

```json
"server": {
  "waking": "Connecting to server…",
  "down": "Server unavailable — using on-device mode"
},
```

Inside `"scan"`, add after the existing `"permission"` key:
```json
"diagnosisRequest": "Analyse this crop image",
"uploading": "Uploading image…",
"retryUpload": "Retry",
"error": "Could not send image for analysis"
```

- [ ] **Step 3.2: Add the same keys to `hi.json` (parity required)**

Add `"server"` top-level key:
```json
"server": {
  "waking": "सर्वर से जुड़ रहे हैं…",
  "down": "सर्वर उपलब्ध नहीं — ऑन-डिवाइस मोड चालू है"
},
```

Inside `"scan"`, add after `"permission"`:
```json
"diagnosisRequest": "इस फसल की छवि का विश्लेषण करें",
"uploading": "छवि अपलोड हो रही है…",
"retryUpload": "पुनः प्रयास करें",
"error": "विश्लेषण के लिए छवि नहीं भेजी जा सकी"
```

- [ ] **Step 3.3: Run the locale parity test**

```bash
npx jest src/shared/i18n/localeKeys.test.ts --testProject unit-ts
```

Expected: PASS. If it fails, the two JSON files have a structural mismatch — fix until green.

---

## Task 4: `ApiStatusProvider` (TDD)

**Files:**
- Create: `src/shared/api/apiStatus.tsx`
- Create: `src/shared/api/apiStatus.test.tsx`

- [ ] **Step 4.1: Write the failing test — `src/shared/api/apiStatus.test.tsx`**

```typescript
import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { ApiStatusProvider, useApiStatus } from "./apiStatus";

jest.mock("./endpoints", () => ({ getHealth: jest.fn() }));
import { getHealth } from "./endpoints";
const mockHealth = getHealth as jest.Mock;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiStatusProvider>{children}</ApiStatusProvider>
);

describe("useApiStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts as unknown", () => {
    mockHealth.mockResolvedValue({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    expect(result.current).toBe("unknown");
  });

  it("transitions to warm when getHealth succeeds", async () => {
    mockHealth.mockResolvedValue({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {});
    expect(result.current).toBe("warm");
  });

  it("transitions to cold after first failure", async () => {
    mockHealth.mockRejectedValue(new Error("timeout"));
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {});
    expect(result.current).toBe("cold");
  });

  it("transitions to down after 5 failures", async () => {
    mockHealth.mockRejectedValue(new Error("timeout"));
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    // First failure
    await act(async () => {});
    expect(result.current).toBe("cold");
    // Failures 2–5 via timer advances
    for (let i = 1; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(8_000);
        await Promise.resolve();
      });
    }
    expect(result.current).toBe("down");
  });

  it("stays warm after first success even if later calls would fail", async () => {
    mockHealth.mockResolvedValueOnce({ status: "ok" });
    const { result } = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => {});
    expect(result.current).toBe("warm");
    // No more pings after warm — status stays
    expect(result.current).toBe("warm");
  });
});
```

- [ ] **Step 4.2: Run to confirm failure**

```bash
npx jest src/shared/api/apiStatus.test.tsx --testProject app
```

Expected: FAIL with "Cannot find module './apiStatus'".

- [ ] **Step 4.3: Create `src/shared/api/apiStatus.tsx`**

```typescript
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getHealth } from "./endpoints";

export type ApiStatus = "unknown" | "cold" | "warm" | "down";

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 8_000;

const ApiStatusContext = createContext<ApiStatus>("unknown");

export const useApiStatus = (): ApiStatus => useContext(ApiStatusContext);

export const ApiStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<ApiStatus>("unknown");
  const s = useRef({ attempts: 0, cancelled: false, timer: null as ReturnType<typeof setTimeout> | null });

  useEffect(() => {
    s.current.cancelled = false;
    s.current.attempts = 0;

    const ping = async (): Promise<void> => {
      try {
        await getHealth();
        if (!s.current.cancelled) setStatus("warm");
      } catch {
        if (s.current.cancelled) return;
        s.current.attempts += 1;
        if (s.current.attempts >= MAX_RETRIES) {
          setStatus("down");
        } else {
          setStatus("cold");
          s.current.timer = setTimeout(() => { void ping(); }, RETRY_INTERVAL_MS);
        }
      }
    };

    void ping();

    return () => {
      s.current.cancelled = true;
      if (s.current.timer) clearTimeout(s.current.timer);
    };
  }, []);

  return (
    <ApiStatusContext.Provider value={status}>
      {children}
    </ApiStatusContext.Provider>
  );
};
```

- [ ] **Step 4.4: Run the test — must pass**

```bash
npx jest src/shared/api/apiStatus.test.tsx --testProject app
```

Expected: 5 tests PASS.

---

## Task 5: `ServerWakingBanner` + Provider Wiring

**Files:**
- Create: `src/shared/api/ServerWakingBanner.tsx`
- Modify: `src/shared/providers/RootProviders.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 5.1: Create `src/shared/api/ServerWakingBanner.tsx`**

```typescript
import { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { useApiStatus } from "./apiStatus";

export const ServerWakingBanner = () => {
  const { t } = useTranslation();
  const status = useApiStatus();
  const shownDown = useRef(false);

  useEffect(() => {
    if (status === "down" && !shownDown.current) {
      shownDown.current = true;
      Alert.alert(t("server.down"));
    }
  }, [status, t]);

  if (status !== "cold") return null;

  return (
    <View className="flex-row items-center justify-center gap-2 bg-amber/10 px-4 py-2">
      <ActivityIndicator size="small" color="#B45309" />
      <Text className="font-body text-sm text-amber">{t("server.waking")}</Text>
    </View>
  );
};
```

- [ ] **Step 5.2: Wrap children with `ApiStatusProvider` in `src/shared/providers/RootProviders.tsx`**

Add the import at the top of the file:
```typescript
import { ApiStatusProvider } from "@/shared/api/apiStatus";
```

Inside the `return` statement, wrap `{children}` (and `<StatusBar>`) with `<ApiStatusProvider>`:
```typescript
<AuthProvider>
  <ApiStatusProvider>
    <StatusBar style="dark" />
    {children}
  </ApiStatusProvider>
</AuthProvider>
```

- [ ] **Step 5.3: Render `ServerWakingBanner` in `app/_layout.tsx`**

Add the import:
```typescript
import { ServerWakingBanner } from "@/shared/api/ServerWakingBanner";
```

Add it alongside `<NetworkBanner />`:
```typescript
<RootProviders>
  <View className="flex-1">
    <NetworkBanner />
    <ServerWakingBanner />
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9F9F9" } }}
    />
  </View>
</RootProviders>
```

- [ ] **Step 5.4: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

---

## Task 6: `useSyncTwin` (TDD)

**Files:**
- Create: `src/features/onboarding/useSyncTwin.ts`
- Create: `src/features/onboarding/useSyncTwin.test.ts`
- Modify: `src/features/onboarding/index.ts`
- Modify: `app/(onboarding)/done.tsx`

- [ ] **Step 6.1: Write the failing test — `src/features/onboarding/useSyncTwin.test.ts`**

```typescript
import { syncTwinOnboarding } from "./useSyncTwin";
import * as endpoints from "@/shared/api/endpoints";
import * as twinCache from "@/features/twin/twinCache";

jest.mock("@/shared/api/endpoints");
jest.mock("@/features/twin/twinCache");

const mockPut = endpoints.putFarmerTwin as jest.Mock;
const mockSet = twinCache.setCachedTwin as jest.Mock;

describe("syncTwinOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
  });

  it("calls putFarmerTwin with minimal twin payload and caches the server response", async () => {
    const serverResponse = {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    };
    mockPut.mockResolvedValue(serverResponse);

    await syncTwinOnboarding({
      farmerId: "anon_abc",
      state: "Punjab",
      district: "Ludhiana",
      language: "hi",
    });

    expect(mockPut).toHaveBeenCalledWith("anon_abc", {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
    expect(mockSet).toHaveBeenCalledWith("anon_abc", serverResponse);
  });

  it("caches the local draft when putFarmerTwin rejects", async () => {
    mockPut.mockRejectedValue(new Error("network error"));

    await syncTwinOnboarding({
      farmerId: "anon_abc",
      state: "Punjab",
      district: "Ludhiana",
      language: "hi",
    });

    expect(mockSet).toHaveBeenCalledWith("anon_abc", {
      farmer_id: "anon_abc",
      location: { state: "Punjab", district: "Ludhiana" },
      preferred_language: "hi",
      current_crops: [],
    });
  });

  it("does nothing when farmerId is null", async () => {
    await syncTwinOnboarding({ farmerId: null, state: "Punjab", district: "Ludhiana", language: "hi" });
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("does nothing when state is null", async () => {
    await syncTwinOnboarding({ farmerId: "anon_abc", state: null, district: "Ludhiana", language: "hi" });
    expect(mockPut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6.2: Run to confirm failure**

```bash
npx jest src/features/onboarding/useSyncTwin.test.ts --testProject unit-ts
```

Expected: FAIL with "Cannot find module './useSyncTwin'".

- [ ] **Step 6.3: Create `src/features/onboarding/useSyncTwin.ts`**

```typescript
import { useCallback } from "react";
import { putFarmerTwin } from "@/shared/api/endpoints";
import { setCachedTwin } from "@/features/twin/twinCache";
import type { FarmerTwin } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/store";

export type SyncTwinParams = {
  farmerId: string | null;
  state: string | null;
  district: string | null;
  language: Language | null;
};

export const syncTwinOnboarding = async (p: SyncTwinParams): Promise<void> => {
  if (!p.farmerId || !p.state || !p.district) return;
  const twin: FarmerTwin = {
    farmer_id: p.farmerId,
    location: { state: p.state, district: p.district },
    preferred_language: p.language,
    current_crops: [],
  };
  try {
    const saved = await putFarmerTwin(p.farmerId, twin);
    await setCachedTwin(p.farmerId, saved);
  } catch {
    await setCachedTwin(p.farmerId, twin);
  }
};

export const useSyncTwin = (): (() => void) => {
  const farmerId = useFarmerId();
  const state = useOnboarding((s) => s.state);
  const district = useOnboarding((s) => s.district);
  const language = useOnboarding((s) => s.language);

  return useCallback(() => {
    void syncTwinOnboarding({ farmerId, state, district, language });
  }, [farmerId, state, district, language]);
};
```

- [ ] **Step 6.4: Run the test — must pass**

```bash
npx jest src/features/onboarding/useSyncTwin.test.ts --testProject unit-ts
```

Expected: 4 tests PASS.

- [ ] **Step 6.5: Export from `src/features/onboarding/index.ts`**

Add at the end of the file:
```typescript
export { useSyncTwin, syncTwinOnboarding } from "./useSyncTwin";
```

- [ ] **Step 6.6: Update `app/(onboarding)/done.tsx`**

Replace the entire file:
```typescript
import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useOnboarding } from "@/features/onboarding/store";
import { useSyncTwin } from "@/features/onboarding";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DoneScreen() {
  const insets = useSafeAreaInsets();
  const setCompleted = useOnboarding((s) => s.setCompleted);
  const syncTwin = useSyncTwin();

  useEffect(() => {
    setCompleted(true);
    syncTwin();
    const t = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 500);
    return () => clearTimeout(t);
  }, [setCompleted, syncTwin]);

  return (
    <View
      className="bg-paper flex-1 items-center justify-center"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-brand/10">
        <Text className="text-3xl text-brand" accessibilityLabel="OK">
          ✓
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 6.7: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

---

## Task 7: Scan Screen Wire-Up

**Files:**
- Modify: `src/features/chat/useSendQuery.ts`
- Modify: `app/scan.tsx`

- [ ] **Step 7.1: Add `imageRef` to `SendQueryInput` in `src/features/chat/useSendQuery.ts`**

Add `imageRef?: string` to the type and thread it through to `askAgent`:

```typescript
export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  connectivity: Connectivity;
  imageRef?: string;
  /** Re-ask on server without writing another user row (e.g. low-confidence CTA). */
  skipUserMessage?: boolean;
  forceBackend?: boolean;
};
```

In the `mutationFn`, update the `askAgent` call to pass `imageRef`:
```typescript
const r = await askAgent(
  {
    text,
    language: p.language,
    intent,
    ...(p.imageRef ? { imageRef: p.imageRef } : {}),
  },
  {
    farmerId: p.farmerId,
    location: { state: p.state, district: p.district },
    connectivity: p.connectivity,
    deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
  },
  p.forceBackend ? { forceBackend: true } : undefined,
);
```

- [ ] **Step 7.2: Replace `app/scan.tsx` with the fully-wired version**

```typescript
import { useState } from "react";
import { View, Text, Pressable, Image, ActivityIndicator, ScrollView } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { postQueryImage } from "@/shared/api/endpoints";
import { appendMessage } from "@/features/chat/chatMessagesRepo";
import { useSendChatMessage } from "@/features/chat/useSendQuery";
import { useFarmerId } from "@/shared/auth/AuthProvider";
import { useOnboarding } from "@/features/onboarding/store";
import { useConnectivity } from "@/shared/network/useConnectivity";
import { ApiError } from "@/shared/api/errors";
import type { Language } from "@/shared/config/constants";

export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const farmerId = useFarmerId();
  const language = (useOnboarding((s) => s.language) ?? "en") as Language;
  const state = useOnboarding((s) => s.state) ?? "—";
  const district = useOnboarding((s) => s.district) ?? "—";
  const connectivity = useConnectivity();
  const send = useSendChatMessage();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const busy = uploading || send.isPending;

  const pick = async (src: "camera" | "library") => {
    setErr(null);
    const perm =
      src === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErr(t("scan.permission"));
      return;
    }
    const res =
      src === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [4, 3] });
    if (res.canceled || !res.assets[0]) return;
    setLocalUri(res.assets[0].uri);
  };

  const upload = async () => {
    if (!localUri || !farmerId || busy) return;
    setErr(null);
    setUploading(true);
    try {
      const m = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const r = await postQueryImage({ uri: m.uri, farmerId, purpose: "crop_disease" });
      setUploading(false);
      // Write the user bubble directly so skipUserMessage=true works below
      await appendMessage({ role: "user", text: t("scan.diagnosisRequest") });
      await send.mutateAsync({
        text: t("scan.diagnosisRequest"),
        imageRef: r.image_ref,
        farmerId,
        language,
        state,
        district,
        connectivity,
        skipUserMessage: true,
        forceBackend: true,
      });
      router.replace("/(tabs)/chat");
    } catch (e) {
      setUploading(false);
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("errors.generic");
      setErr(msg);
    }
  };

  return (
    <View
      className="flex-1 bg-page"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center border-b border-border/60 bg-card px-4 py-3">
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => router.back()}
          className="mr-2 rounded-full p-1"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0D631B" />
        </Pressable>
        <Text className="font-display text-lg text-title-green">{t("scan.title")}</Text>
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="mb-4 font-body text-ink-muted">{t("scan.body")}</Text>
        {localUri ? (
          <Image
            source={{ uri: localUri }}
            className="mb-4 aspect-[4/3] w-full rounded-2xl bg-muted"
            resizeMode="cover"
            accessibilityLabel={t("scan.preview")}
          />
        ) : null}
        {err ? <Text className="mb-2 text-sm text-danger">{err}</Text> : null}
        <View className="gap-2">
          <Pressable
            className="border-primary min-h-[48px] items-center justify-center rounded-2xl border bg-card"
            disabled={busy}
            onPress={() => { void pick("camera"); }}
          >
            <Text className="font-body-semibold text-title-green">{t("scan.camera")}</Text>
          </Pressable>
          <Pressable
            className="border-primary min-h-[48px] items-center justify-center rounded-2xl border bg-card"
            disabled={busy}
            onPress={() => { void pick("library"); }}
          >
            <Text className="font-body-semibold text-title-green">{t("scan.library")}</Text>
          </Pressable>
          <Pressable
            className="mt-2 min-h-[48px] items-center justify-center rounded-2xl bg-brand"
            disabled={!localUri || !farmerId || busy}
            onPress={() => { void upload(); }}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-body-semibold text-white">{t("scan.upload")}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 7.3: Run full quality gate**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: lint clean, zero type errors, all tests PASS.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ §1 Environment URL — Task 1
- ✅ §2 Type audit (`QueryResponse`, `FarmerTwin`, `DataSource`, `structured` nullability) — Task 2
- ✅ §3 `ApiStatusProvider` state machine (unknown→cold→warm/down, 5 retries, 8 s interval) — Task 4
- ✅ §3 `ServerWakingBanner` (cold: amber bar; down: Alert) — Task 5
- ✅ §3 Provider mounted in `RootProviders`, banner rendered in `_layout` — Task 5
- ✅ §4 `useSyncTwin` fire-and-forget with local cache fallback — Task 6
- ✅ §4 `done.tsx` calls `useSyncTwin()` without blocking navigation — Task 6
- ✅ §5 `imageRef` threaded through `SendQueryInput` → `askAgent` — Task 7
- ✅ §5 `scan.tsx` upload → query → chat redirect with inline error on failure — Task 7
- ✅ i18n parity for all new keys — Task 3

**Type consistency:** `FarmerTwin` uses `preferred_language` and `current_crops` consistently across `types.ts` (Task 2), `useFarmerTwin.ts` (Task 2), `profile.tsx` (Task 2), and `useSyncTwin.ts` (Task 6). `SendQueryInput.imageRef` defined in Task 7 step 1, consumed in step 2.
