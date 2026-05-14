# Voice Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent floating mic button (FAB) that runs LiveKit voice sessions when online and falls back to on-device STT (expo-speech-recognition + Gemma) when offline, saving transcripts to the SQLite chat thread.

**Architecture:** Approach A — dual-mode `useVoiceSession` hook inside a new `src/features/voice/` feature slice. Online: fetch LiveKit token → connect Room → publish mic → backend voice worker handles STT/LLM/TTS. Offline: `useVoice` (existing hook) → `askAgent` on-device → `speak`. `VoiceFAB` + `VoiceSessionSheet` mount inside `RootProviders` and share state via Zustand.

**Tech Stack:** `@livekit/react-native` + `livekit-client`, Zustand (`create`), expo-speech-recognition (offline), expo-speech (offline TTS), TypeScript, jest-expo

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/features/voice/useVoiceSessionStore.ts` | Zustand store: session phase, transcript, error |
| `src/features/voice/useVoiceSessionStore.test.ts` | State transition unit tests |
| `src/features/voice/useVoiceSession.ts` | Main hook: LiveKit online path + local STT offline path |
| `src/features/voice/useVoiceSession.test.tsx` | Integration tests for both paths |
| `src/features/voice/components/VoiceWaveform.tsx` | Animated waveform bars (speaking indicator) |
| `src/features/voice/components/VoiceFAB.tsx` | Floating mic button, platform-aware |
| `src/features/voice/components/VoiceSessionSheet.tsx` | Bottom sheet overlay for active sessions |
| `src/features/voice/index.ts` | Barrel export |

### Modified files
| File | Change |
|---|---|
| `src/shared/config/constants.ts` | Add `voiceToken: 5_000` to `TIMEOUTS_MS` |
| `src/shared/api/types.ts` | Add `VoiceTokenRequest`, `VoiceTokenResponse` |
| `src/shared/api/endpoints.ts` | Add `postVoiceToken()` function |
| `src/shared/api/index.ts` | Export new types and function |
| `src/shared/api/endpoints.test.ts` | Add `postVoiceToken` test |
| `src/shared/i18n/locales/en.json` | Add `voice` key block |
| `src/shared/i18n/locales/hi.json` | Add `voice` key block (parity required) |
| `src/shared/providers/RootProviders.tsx` | Add `<VoiceFAB />` and `<VoiceSessionSheet />` |
| Expo config (`app.config.ts` or `app.config.js`) | Add LiveKit Expo plugins |

---

## Task 1: Install LiveKit packages and configure Expo plugins

**Files:**
- Modify: `package.json` (via npm install)
- Modify: Expo config file (`app.config.ts` / `app.config.js` — whichever exists in the repo root)
- Modify: `src/shared/providers/RootProviders.tsx` (add `registerGlobals` call)

- [ ] **Step 1: Install npm packages**

Run from repo root:
```bash
npm install @livekit/react-native @livekit/react-native-expo-plugin @livekit/react-native-webrtc @config-plugins/react-native-webrtc livekit-client
```

Expected: packages added to `node_modules` and `package.json` dependencies. No errors.

- [ ] **Step 2: Add LiveKit Expo config plugins**

Open the Expo config file (likely `app.config.ts` or `app.config.js` at repo root). Add the two LiveKit plugins to the `plugins` array. Example for a TypeScript config:

```ts
// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  // ... existing config ...
  plugins: [
    // ... existing plugins (e.g. expo-router, expo-speech-recognition) ...
    "@livekit/react-native-expo-plugin",
    ["@config-plugins/react-native-webrtc", {}],
  ],
};

export default config;
```

If the config is JSON (`app.json`), add to the `expo.plugins` array:
```json
{
  "expo": {
    "plugins": [
      "@livekit/react-native-expo-plugin",
      ["@config-plugins/react-native-webrtc", {}]
    ]
  }
}
```

- [ ] **Step 3: Register LiveKit globals in RootProviders**

Open `src/shared/providers/RootProviders.tsx`. Add this at the top of the file (after all existing imports), before any component code. Use a dynamic require to prevent web crashes:

```ts
// At module level, after imports — runs once when the module loads
import { Platform } from "react-native";
if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerGlobals } = require("@livekit/react-native") as {
    registerGlobals: () => void;
  };
  registerGlobals();
}
```

- [ ] **Step 4: Run typecheck to confirm no breakage**

```bash
npm run typecheck
```

Expected: 0 errors. If TypeScript can't find `@livekit/react-native` types, confirm the install succeeded in Step 1.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/shared/providers/RootProviders.tsx
git commit -m "build(voice): install LiveKit SDK, register globals, add Expo plugins"
```

---

## Task 2: Add VoiceToken API endpoint (TDD)

**Files:**
- Modify: `src/shared/config/constants.ts`
- Modify: `src/shared/api/types.ts`
- Modify: `src/shared/api/endpoints.ts`
- Modify: `src/shared/api/index.ts`
- Modify: `src/shared/api/endpoints.test.ts`

- [ ] **Step 1: Write the failing test**

Open `src/shared/api/endpoints.test.ts`. Add after the existing `postSyncPush` describe block:

```ts
describe("postVoiceToken", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("POSTs to /api/v1/voice/token with farmer_id and language", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          serverUrl: "wss://example.livekit.cloud",
          token: "tok123",
          room: "room-xyz",
        }),
    } as Response);
    global.fetch = fetchMock;

    const { postVoiceToken } = await import("./endpoints");
    const result = await postVoiceToken({ farmer_id: "f1", language: "hi" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/voice/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.serverUrl).toBe("wss://example.livekit.cloud");
    expect(result.token).toBe("tok123");
    expect(result.room).toBe("room-xyz");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/shared/api/endpoints.test.ts --testNamePattern "postVoiceToken" --no-coverage
```

Expected: FAIL — "postVoiceToken is not a function" or similar.

- [ ] **Step 3: Add `voiceToken` timeout constant**

Open `src/shared/config/constants.ts`. Add to `TIMEOUTS_MS`:

```ts
export const TIMEOUTS_MS = {
  query: 90_000,
  queryImage: 30_000,
  syncBundle: 45_000,
  syncPush: 45_000,
  health: 60_000,
  conversation: 20_000,
  conversationCreate: 50_000,
  conversationHistory: 45_000,
  weather: 45_000,
  voiceToken: 5_000,  // ← add this line
} as const;
```

- [ ] **Step 4: Add VoiceToken types**

Open `src/shared/api/types.ts`. Add at the end of the file (before any closing):

```ts
export type VoiceTokenRequest = {
  farmer_id: string;
  conversation_id?: string;
  language?: Language;
};

export type VoiceTokenResponse = {
  serverUrl: string;
  token: string;
  room: string;
};
```

Note: `Language` is already imported/used in this file (it's `import type { Language } from "@/shared/config/constants"`). Confirm the import exists at the top of `types.ts`.

- [ ] **Step 5: Add `postVoiceToken` function**

Open `src/shared/api/endpoints.ts`. Add after `postQueryImage` (or at the end of the existing endpoint functions, before the data.gov section):

```ts
/** POST `/api/v1/voice/token` — get LiveKit room credentials for a voice session. */
export const postVoiceToken = (req: VoiceTokenRequest, signal?: AbortSignal) =>
  apiFetch<VoiceTokenResponse>("/api/v1/voice/token", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.voiceToken,
    method: "POST",
    body: req,
    ...(signal ? { signal } : {}),
  });
```

Also add `VoiceTokenRequest` and `VoiceTokenResponse` to the imports at the top of `endpoints.ts`:

```ts
import type {
  // ... existing imports ...
  VoiceTokenRequest,
  VoiceTokenResponse,
} from "./types";
```

- [ ] **Step 6: Export from API barrel**

Open `src/shared/api/index.ts`. Add `postVoiceToken` to the endpoints export and add the new types:

```ts
// In the endpoints export block, add:
export {
  // ... existing exports ...
  postVoiceToken,
} from "./endpoints";

// In the types export block, add:
export type {
  // ... existing type exports ...
  VoiceTokenRequest,
  VoiceTokenResponse,
} from "./types";
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx jest src/shared/api/endpoints.test.ts --testNamePattern "postVoiceToken" --no-coverage
```

Expected: PASS.

- [ ] **Step 8: Run full test suite to check no regressions**

```bash
npm test -- --no-coverage
```

Expected: all existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/shared/config/constants.ts src/shared/api/types.ts src/shared/api/endpoints.ts src/shared/api/index.ts src/shared/api/endpoints.test.ts
git commit -m "feat(api): add postVoiceToken endpoint for LiveKit room credentials"
```

---

## Task 3: Add i18n voice keys

**Files:**
- Modify: `src/shared/i18n/locales/en.json`
- Modify: `src/shared/i18n/locales/hi.json`

The parity test (`src/shared/i18n/localeKeys.test.ts`) will fail if both files don't have identical key structure.

- [ ] **Step 1: Add English voice keys**

Open `src/shared/i18n/locales/en.json`. Add a `"voice"` key block at the top level (alongside other top-level keys like `"chat"`, `"mandi"`, etc.):

```json
"voice": {
  "start": "Start voice session",
  "stop": "Stop",
  "listening": "Listening…",
  "speaking": "Speaking…",
  "connecting": "Connecting…",
  "endSession": "End session",
  "error": {
    "noInternet": "Voice requires internet connection",
    "noMic": "Microphone permission needed",
    "unavailable": "Voice unavailable, try later",
    "webUnsupported": "Voice requires Android or iOS"
  }
}
```

- [ ] **Step 2: Add Hindi voice keys**

Open `src/shared/i18n/locales/hi.json`. Add the same `"voice"` block with Hindi translations:

```json
"voice": {
  "start": "आवाज़ सत्र शुरू करें",
  "stop": "रोकें",
  "listening": "सुन रहा हूँ…",
  "speaking": "बोल रहा हूँ…",
  "connecting": "जोड़ रहा हूँ…",
  "endSession": "सत्र समाप्त करें",
  "error": {
    "noInternet": "आवाज़ के लिए इंटरनेट चाहिए",
    "noMic": "माइक्रोफ़ोन अनुमति चाहिए",
    "unavailable": "आवाज़ उपलब्ध नहीं, बाद में आज़माएँ",
    "webUnsupported": "आवाज़ Android या iOS पर काम करती है"
  }
}
```

- [ ] **Step 3: Run parity test**

```bash
npx jest src/shared/i18n --no-coverage
```

Expected: PASS. If it fails with a missing key error, compare the `voice` block structure between both files — they must have identical keys.

- [ ] **Step 4: Commit**

```bash
git add src/shared/i18n/locales/en.json src/shared/i18n/locales/hi.json
git commit -m "feat(i18n): add voice session locale keys (en + hi)"
```

---

## Task 4: Create Zustand session store (TDD)

**Files:**
- Create: `src/features/voice/useVoiceSessionStore.ts`
- Create: `src/features/voice/useVoiceSessionStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/voice/useVoiceSessionStore.test.ts`:

```ts
import { useVoiceSessionStore } from "./useVoiceSessionStore";

describe("useVoiceSessionStore", () => {
  beforeEach(() => {
    useVoiceSessionStore.getState().reset();
  });

  it("starts in idle phase with no transcript or error", () => {
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcript).toBeNull();
    expect(s.errorMessage).toBeNull();
  });

  it("setPhase transitions to connecting then listening", () => {
    const { setPhase } = useVoiceSessionStore.getState();
    setPhase("connecting");
    expect(useVoiceSessionStore.getState().phase).toBe("connecting");
    setPhase("listening");
    expect(useVoiceSessionStore.getState().phase).toBe("listening");
  });

  it("setPhase transitions to speaking", () => {
    useVoiceSessionStore.getState().setPhase("speaking");
    expect(useVoiceSessionStore.getState().phase).toBe("speaking");
  });

  it("setError sets phase to error and stores the message", () => {
    useVoiceSessionStore.getState().setError("voice.error.noMic");
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("error");
    expect(s.errorMessage).toBe("voice.error.noMic");
  });

  it("setTranscript stores user and agent text", () => {
    useVoiceSessionStore
      .getState()
      .setTranscript({ user: "hello", agent: "namaste" });
    const s = useVoiceSessionStore.getState();
    expect(s.transcript).toEqual({ user: "hello", agent: "namaste" });
  });

  it("reset clears all state back to idle", () => {
    const store = useVoiceSessionStore.getState();
    store.setPhase("speaking");
    store.setTranscript({ user: "a", agent: "b" });
    store.setError("some error");
    useVoiceSessionStore.getState().reset();
    const s = useVoiceSessionStore.getState();
    expect(s.phase).toBe("idle");
    expect(s.transcript).toBeNull();
    expect(s.errorMessage).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/features/voice/useVoiceSessionStore.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module './useVoiceSessionStore'".

- [ ] **Step 3: Implement the store**

Create `src/features/voice/useVoiceSessionStore.ts`:

```ts
import { create } from "zustand";

export type VoicePhase = "idle" | "connecting" | "listening" | "speaking" | "error";

type VoiceSessionStore = {
  phase: VoicePhase;
  errorMessage: string | null;
  transcript: { user: string; agent: string } | null;
  setPhase: (p: VoicePhase) => void;
  setTranscript: (t: { user: string; agent: string } | null) => void;
  setError: (msg: string) => void;
  reset: () => void;
};

export const useVoiceSessionStore = create<VoiceSessionStore>((set) => ({
  phase: "idle",
  errorMessage: null,
  transcript: null,
  setPhase: (phase) => set({ phase }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (errorMessage) => set({ phase: "error", errorMessage }),
  reset: () => set({ phase: "idle", errorMessage: null, transcript: null }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/features/voice/useVoiceSessionStore.test.ts --no-coverage
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/voice/useVoiceSessionStore.ts src/features/voice/useVoiceSessionStore.test.ts
git commit -m "feat(voice): add voice session Zustand store with phase state"
```

---

## Task 5: Create `useVoiceSession` hook (TDD)

**Files:**
- Create: `src/features/voice/useVoiceSession.ts`
- Create: `src/features/voice/useVoiceSession.test.tsx`

This hook is the core of the voice feature. It contains all branching logic.

- [ ] **Step 1: Write failing tests**

Create `src/features/voice/useVoiceSession.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react-native";
import { useVoiceSession } from "./useVoiceSession";
import { useVoiceSessionStore } from "./useVoiceSessionStore";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/shared/network", () => ({
  useConnectivity: jest.fn(() => "online" as const),
}));

const mockStartListening = jest.fn().mockResolvedValue(undefined);
const mockStopListening = jest.fn().mockResolvedValue(undefined);
const mockSpeakFn = jest.fn().mockResolvedValue(undefined);
const mockCancelSpeech = jest.fn();
let capturedSpeechResult: ((text: string) => Promise<void>) | undefined;

jest.mock("@/shared/voice", () => ({
  useVoice: jest.fn((opts: { onSpeechResult?: (t: string) => Promise<void> }) => {
    capturedSpeechResult = opts?.onSpeechResult;
    return {
      startListening: mockStartListening,
      stopListening: mockStopListening,
      speak: mockSpeakFn,
      cancelSpeech: mockCancelSpeech,
      listening: false,
      speaking: false,
    };
  }),
  speak: jest.fn().mockResolvedValue(undefined),
  cancelSpeech: jest.fn(),
}));

const mockPostVoiceToken = jest.fn().mockResolvedValue({
  serverUrl: "wss://lk.test",
  token: "tok",
  room: "r1",
});
const mockAskAgent = jest.fn().mockResolvedValue({
  text: "agent response",
  confidence: 0.9,
  source: "ondevice",
  canEscalate: false,
  dataSource: "live",
});
const mockAppendMessage = jest.fn().mockResolvedValue({});

jest.mock("@/shared/api", () => ({
  postVoiceToken: (...args: unknown[]) => mockPostVoiceToken(...args),
  askAgent: (...args: unknown[]) => mockAskAgent(...args),
}));

jest.mock("@/features/chat", () => ({
  appendMessage: (...args: unknown[]) => mockAppendMessage(...args),
  MAIN_THREAD_ID: "main",
}));

const mockRoomDisconnect = jest.fn();
const mockSetMicEnabled = jest.fn().mockResolvedValue(undefined);
const mockRoomConnect = jest.fn().mockResolvedValue(undefined);
const mockRoomOn = jest.fn();

jest.mock("livekit-client", () => ({
  Room: jest.fn().mockImplementation(() => ({
    connect: mockRoomConnect,
    disconnect: mockRoomDisconnect,
    on: mockRoomOn,
    localParticipant: { setMicrophoneEnabled: mockSetMicEnabled },
  })),
  RoomEvent: { DataReceived: "dataReceived", Disconnected: "disconnected" },
}));

jest.mock("@livekit/react-native", () => ({
  AudioSession: {
    startAudioSession: jest.fn().mockResolvedValue(undefined),
    stopAudioSession: jest.fn().mockResolvedValue(undefined),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const INPUT = {
  farmerId: "farmer1",
  language: "hi" as const,
  state: "Punjab",
  district: "Ludhiana",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useVoiceSession — online path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceSessionStore.getState().reset();
    const { useConnectivity } = require("@/shared/network") as {
      useConnectivity: jest.Mock;
    };
    useConnectivity.mockReturnValue("online");
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    expect(result.current.phase).toBe("idle");
  });

  it("start() fetches token and connects LiveKit room", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    expect(mockPostVoiceToken).toHaveBeenCalledWith(
      expect.objectContaining({ farmer_id: "farmer1", language: "hi" }),
    );
    expect(mockRoomConnect).toHaveBeenCalledWith("wss://lk.test", "tok", expect.any(Object));
    expect(mockSetMicEnabled).toHaveBeenCalledWith(true);
    expect(result.current.phase).toBe("listening");
  });

  it("stop() disconnects room and saves transcript", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    // Simulate a transcript being set
    act(() => {
      useVoiceSessionStore
        .getState()
        .setTranscript({ user: "question", agent: "answer" });
    });
    await act(async () => {
      await result.current.stop();
    });
    expect(mockRoomDisconnect).toHaveBeenCalled();
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", text: "question" }),
    );
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", text: "answer" }),
    );
  });

  it("ignores second start() call when already active", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.start(); // second call — should no-op
    });
    expect(mockPostVoiceToken).toHaveBeenCalledTimes(1);
  });
});

describe("useVoiceSession — offline path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceSessionStore.getState().reset();
    const { useConnectivity } = require("@/shared/network") as {
      useConnectivity: jest.Mock;
    };
    useConnectivity.mockReturnValue("offline");
  });

  it("start() uses local STT when offline", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    expect(mockPostVoiceToken).not.toHaveBeenCalled();
    expect(mockStartListening).toHaveBeenCalled();
    expect(result.current.phase).toBe("listening");
  });

  it("speech result triggers askAgent and speak and appendMessage", async () => {
    const { speak: mockSpeak } = require("@/shared/voice") as {
      speak: jest.Mock;
    };
    renderHook(() => useVoiceSession(INPUT));

    await act(async () => {
      await capturedSpeechResult?.("what is the weather");
    });

    expect(mockAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ text: "what is the weather", language: "hi" }),
      expect.objectContaining({ farmerId: "farmer1" }),
    );
    expect(mockSpeak).toHaveBeenCalledWith("agent response", "hi");
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", text: "what is the weather" }),
    );
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", text: "agent response" }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/features/voice/useVoiceSession.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module './useVoiceSession'".

- [ ] **Step 3: Implement `useVoiceSession`**

Create `src/features/voice/useVoiceSession.ts`:

```ts
import { useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { Room } from "livekit-client";
import { useConnectivity } from "@/shared/network";
import { useVoice, speak as speakText } from "@/shared/voice";
import { askAgent, postVoiceToken } from "@/shared/api";
import { appendMessage, MAIN_THREAD_ID } from "@/features/chat";
import { useVoiceSessionStore } from "./useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

export type VoiceSessionInput = {
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  conversationId?: string;
};

export function useVoiceSession(input: VoiceSessionInput) {
  const connectivity = useConnectivity();
  const store = useVoiceSessionStore();
  const roomRef = useRef<Room | null>(null);

  const handleSpeechResult = useCallback(
    async (text: string) => {
      store.setPhase("speaking");
      try {
        const response = await askAgent(
          { text, language: input.language, intent: "general" },
          {
            farmerId: input.farmerId,
            conversationId: input.conversationId ?? MAIN_THREAD_ID,
            location: { state: input.state, district: input.district },
            connectivity,
            deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
          },
        );
        store.setTranscript({ user: text, agent: response.text });
        await speakText(response.text, input.language);
        await appendMessage({ role: "user", text, threadId: MAIN_THREAD_ID });
        await appendMessage({
          role: "assistant",
          text: response.text,
          threadId: MAIN_THREAD_ID,
        });
      } catch {
        store.setError("voice.error.unavailable");
      } finally {
        store.reset();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.farmerId, input.language, input.state, input.district, input.conversationId, connectivity],
  );

  const voice = useVoice({ onSpeechResult: handleSpeechResult });

  const startOffline = useCallback(async () => {
    const locale = input.language === "hi" ? "hi-IN" : input.language;
    await voice.startListening(locale);
    store.setPhase("listening");
  }, [input.language, voice, store]);

  const startOnline = useCallback(async () => {
    store.setPhase("connecting");
    try {
      const { AudioSession } = (await import(
        "@livekit/react-native"
      )) as typeof import("@livekit/react-native");
      const { Room: LKRoom, RoomEvent } = (await import(
        "livekit-client"
      )) as typeof import("livekit-client");

      const { serverUrl, token } = await postVoiceToken({
        farmer_id: input.farmerId,
        language: input.language,
      });
      await AudioSession.startAudioSession();
      const room = new LKRoom();
      roomRef.current = room;

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as {
            type?: string;
            user?: string;
            agent?: string;
          };
          if (msg.type === "transcript" && msg.user && msg.agent) {
            store.setTranscript({ user: msg.user, agent: msg.agent });
            store.setPhase("speaking");
          }
        } catch {
          // malformed data message — ignore
        }
      });

      room.on(RoomEvent.Disconnected, () => store.reset());

      await room.connect(serverUrl, token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      store.setPhase("listening");
    } catch {
      // LiveKit failed — fall back to local STT
      roomRef.current = null;
      await startOffline();
    }
  }, [input.farmerId, input.language, store, startOffline]);

  const start = useCallback(async () => {
    if (store.phase !== "idle") return;
    if (Platform.OS === "web") {
      store.setError("voice.error.webUnsupported");
      return;
    }
    if (connectivity !== "offline") {
      await startOnline();
    } else {
      await startOffline();
    }
  }, [connectivity, store, startOnline, startOffline]);

  const stop = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      const { transcript } = useVoiceSessionStore.getState();
      if (transcript) {
        await appendMessage({
          role: "user",
          text: transcript.user,
          threadId: MAIN_THREAD_ID,
        });
        await appendMessage({
          role: "assistant",
          text: transcript.agent,
          threadId: MAIN_THREAD_ID,
        });
      }
      room.disconnect();
      try {
        const { AudioSession } = (await import(
          "@livekit/react-native"
        )) as typeof import("@livekit/react-native");
        await AudioSession.stopAudioSession();
      } catch {
        // ignore — web or mock env
      }
      roomRef.current = null;
    } else {
      await voice.stopListening();
      voice.cancelSpeech();
    }
    store.reset();
  }, [store, voice]);

  return { phase: store.phase, start, stop };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/features/voice/useVoiceSession.test.tsx --no-coverage
```

Expected: PASS (5 tests). If `@testing-library/react-native` is missing, install with `npm install --save-dev @testing-library/react-native`.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/voice/useVoiceSession.ts src/features/voice/useVoiceSession.test.tsx
git commit -m "feat(voice): add useVoiceSession hook with LiveKit + local STT fallback"
```

---

## Task 6: Create VoiceWaveform component

**Files:**
- Create: `src/features/voice/components/VoiceWaveform.tsx`

No TDD for pure animation component — visual correctness verified manually.

- [ ] **Step 1: Create the component**

Create `src/features/voice/components/VoiceWaveform.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

type Props = {
  active: boolean;
  color?: string;
};

const BAR_COUNT = 5;
const BAR_WIDTH = 4;
const BAR_MAX_HEIGHT = 24;
const BAR_MIN_HEIGHT = 6;
const ANIMATION_DURATION = 500;

export function VoiceWaveform({ active, color = "#4CAF50" }: Props) {
  const animations = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(BAR_MIN_HEIGHT)),
  ).current;

  useEffect(() => {
    if (!active) {
      animations.forEach((a) => a.setValue(BAR_MIN_HEIGHT));
      return;
    }
    const loops = animations.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, {
            toValue: BAR_MAX_HEIGHT,
            duration: ANIMATION_DURATION,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: BAR_MIN_HEIGHT,
            duration: ANIMATION_DURATION,
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, animations]);

  return (
    <View style={styles.container}>
      {animations.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: anim, backgroundColor: color, marginHorizontal: 2 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_MAX_HEIGHT,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/voice/components/VoiceWaveform.tsx
git commit -m "feat(voice): add VoiceWaveform animated bar component"
```

---

## Task 7: Create VoiceFAB component

**Files:**
- Create: `src/features/voice/components/VoiceFAB.tsx`

- [ ] **Step 1: Create the component**

`VoiceFAB` is a **presentation component** — it receives `phase`, `onStart`, `onStop` as props. The smart wiring (farmerId, session hook) lives in `VoiceFABConnector` inside RootProviders (Task 9). This separation ensures VoiceSessionSheet's "End session" button calls the real `stop()` that disconnects the LiveKit room.

Create `src/features/voice/components/VoiceFAB.tsx`:

```tsx
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
} from "react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { VoiceWaveform } from "./VoiceWaveform";
import type { VoicePhase } from "../useVoiceSessionStore";

type Props = {
  phase: VoicePhase;
  onStart: () => void;
  onStop: () => void;
};

function PhaseIcon({ phase }: { phase: VoicePhase }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "listening") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase, pulseAnim]);

  if (phase === "connecting") {
    return <ActivityIndicator color="#fff" size="small" />;
  }
  if (phase === "speaking") {
    return <VoiceWaveform active color="#fff" />;
  }
  return (
    <Animated.Text
      style={[styles.micIcon, { transform: [{ scale: pulseAnim }] }]}
    >
      🎤
    </Animated.Text>
  );
}

function fabColor(phase: VoicePhase): string {
  switch (phase) {
    case "idle":    return "#2E7D32"; // green
    case "connecting": return "#F9A825"; // amber
    case "listening":  return "#C62828"; // red
    case "speaking":   return "#1565C0"; // blue
    case "error":      return "#616161"; // grey
  }
}

export function VoiceFAB({ phase, onStart, onStop }: Props) {
  const { t } = useTranslation();

  const handlePress = () => {
    if (phase === "idle" || phase === "error") {
      onStart();
    } else {
      onStop();
    }
  };

  const label =
    phase === "idle"      ? t("voice.start")
    : phase === "connecting" ? t("voice.connecting")
    : phase === "listening"  ? t("voice.listening")
    : phase === "speaking"   ? t("voice.speaking")
    : t("voice.start");

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.fab, { backgroundColor: fabColor(phase) }]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <PhaseIcon phase={phase} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
  micIcon: { fontSize: 22 },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Fix any type errors related to `useOnboarding()` field names before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/features/voice/components/VoiceFAB.tsx
git commit -m "feat(voice): add VoiceFAB floating mic button component"
```

---

## Task 8: Create VoiceSessionSheet component

**Files:**
- Create: `src/features/voice/components/VoiceSessionSheet.tsx`

- [ ] **Step 1: Create the component**

Create `src/features/voice/components/VoiceSessionSheet.tsx`:

```tsx
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useVoiceSessionStore } from "../useVoiceSessionStore";
import { VoiceWaveform } from "./VoiceWaveform";

type Props = {
  onStop: () => void;
};

export function VoiceSessionSheet({ onStop }: Props) {
  const { t } = useTranslation();
  const { phase, transcript, errorMessage } = useVoiceSessionStore();
  const visible = phase !== "idle";

  const phaseLabel = (() => {
    switch (phase) {
      case "connecting":
        return t("voice.connecting");
      case "listening":
        return t("voice.listening");
      case "speaking":
        return t("voice.speaking");
      case "error":
        return errorMessage ?? t("voice.error.unavailable");
      default:
        return "";
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onStop}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          {/* Phase indicator */}
          <View style={styles.phaseRow}>
            {phase === "speaking" && (
              <VoiceWaveform active color="#4CAF50" />
            )}
            <Text style={styles.phaseLabel}>{phaseLabel}</Text>
          </View>

          {/* Transcript (shown once available) */}
          {transcript && (
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptUser}>
                🎤 {transcript.user}
              </Text>
              <Text style={styles.transcriptAgent}>
                🤖 {transcript.agent}
              </Text>
            </View>
          )}

          {/* End session button */}
          <Pressable
            style={styles.stopButton}
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={t("voice.endSession")}
          >
            <Text style={styles.stopButtonText}>{t("voice.endSession")}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "center",
  },
  phaseLabel: {
    color: "#E0E0E0",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  transcriptBox: {
    backgroundColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  transcriptUser: {
    color: "#90CAF9",
    fontSize: 14,
  },
  transcriptAgent: {
    color: "#A5D6A7",
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: "#C62828",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  stopButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/voice/components/VoiceSessionSheet.tsx
git commit -m "feat(voice): add VoiceSessionSheet bottom sheet overlay"
```

---

## Task 9: Create barrel and wire into RootProviders

**Files:**
- Create: `src/features/voice/index.ts`
- Modify: `src/shared/providers/RootProviders.tsx`

- [ ] **Step 1: Create barrel**

Create `src/features/voice/index.ts`:

```ts
export { useVoiceSession } from "./useVoiceSession";
export type { VoiceSessionInput } from "./useVoiceSession";
export { useVoiceSessionStore } from "./useVoiceSessionStore";
export type { VoicePhase } from "./useVoiceSessionStore";
export { VoiceFAB } from "./components/VoiceFAB";
export { VoiceSessionSheet } from "./components/VoiceSessionSheet";
export { VoiceWaveform } from "./components/VoiceWaveform";
```

- [ ] **Step 2: Wire VoiceFAB and VoiceSessionSheet into RootProviders**

Open `src/shared/providers/RootProviders.tsx`.

Add these imports near the top (with other feature imports):

```ts
import { VoiceFAB, VoiceSessionSheet } from "@/features/voice";
import { useVoiceSession } from "@/features/voice";
import { useOnboarding } from "@/features/onboarding";
```

Replace the `{children}` block inside `<ApiStatusProvider>` with:

```tsx
<ApiStatusProvider>
  <StatusBar style="light" />
  {children}
  <VoiceFABConnector />
</ApiStatusProvider>
```

Add `VoiceFABConnector` inside the same file (above `RootProviders`, below the existing helper components like `SyncOnResumeEffect`):

```tsx
/**
 * Single component that owns the useVoiceSession hook instance.
 * Both VoiceFAB and VoiceSessionSheet receive the same start/stop callbacks,
 * so "End session" in the sheet properly disconnects the LiveKit room.
 *
 * farmerId: this codebase uses Clerk auth (src/shared/auth/clerk.ts).
 * Import the Clerk hook that gives the user ID. Open app/(tabs)/chat.tsx
 * to see the exact hook used — common pattern:
 *   import { useUser } from "@clerk/clerk-expo";
 *   const { user } = useUser();
 *   const farmerId = user?.id ?? "";
 */
function VoiceFABConnector() {
  // ── Replace this block with the real farmerId hook from your auth layer ──
  // The codebase uses Clerk (src/shared/auth/). Check app/(tabs)/chat.tsx
  // for the pattern. Example:
  //   import { useUser } from "@clerk/clerk-expo";
  //   const { user } = useUser();
  //   const farmerId = user?.id ?? "";
  const farmerId = ""; // TODO: replace with Clerk / auth hook — see comment above

  // useOnboarding() comes from src/features/onboarding/store.ts.
  // Check what fields it returns (run: grep -n 'return\|state\|district\|language' src/features/onboarding/store.ts)
  // Common field names are state/district/preferredLanguage or selectedState/selectedDistrict/language.
  const onboarding = useOnboarding();
  const state = (onboarding as Record<string, unknown>).state as string ?? "";
  const district = (onboarding as Record<string, unknown>).district as string ?? "";
  const language = (onboarding as Record<string, unknown>).preferredLanguage as string ?? "hi";

  const { phase, start, stop } = useVoiceSession({
    farmerId,
    language: language as import("@/shared/config/constants").Language,
    state,
    district,
  });

  return (
    <>
      <VoiceFAB phase={phase} onStart={start} onStop={stop} />
      <VoiceSessionSheet onStop={stop} />
    </>
  );
}
```

**After writing this, immediately do two things:**

1. Open `src/features/onboarding/store.ts`. Find the shape that `useOnboarding()` returns. Replace the `(onboarding as Record<string, unknown>)` casts with the proper destructuring. For example if the store has `state`, `district`, `preferredLanguage` fields:
   ```ts
   const { state, district, preferredLanguage: language } = useOnboarding();
   ```

2. Open `app/(tabs)/chat.tsx`. Find where `farmerId` is obtained. Copy that pattern into `VoiceFABConnector`. Then remove the `const farmerId = ""` placeholder and the `// TODO` comment.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors. Fix any issues with field names from `useOnboarding()` in VoiceFAB.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests pass. The new voice tests plus all existing tests.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Fix any lint issues (unused imports, missing exhaustive-deps, etc.).

- [ ] **Step 6: Commit**

```bash
git add src/features/voice/index.ts src/shared/providers/RootProviders.tsx
git commit -m "feat(voice): wire VoiceFAB + VoiceSessionSheet into RootProviders"
```

---

## Task 10: Native prebuild and manual verification

This task requires a physical Android device or emulator. Not automated.

- [ ] **Step 1: Run native prebuild**

```bash
npx expo prebuild --platform android --clean
```

Expected: `android/` directory generated with LiveKit/WebRTC native modules linked.

- [ ] **Step 2: Build and run on Android**

```bash
npm run android
```

Expected: app launches on device/emulator.

- [ ] **Step 3: Verify FAB appears**

Confirm the green mic button appears in the bottom-right corner above the tab bar on all screens (Home, Chat, Mandi, Profile).

- [ ] **Step 4: Verify online voice session**

Ensure the backend voice worker is running (`docker compose up voice-agent` per backend team docs). Tap the FAB. Confirm:
- FAB shows amber spinner (connecting)
- Sheet slides up showing "Connecting…"
- FAB turns red (listening) once connected
- Speaking into the mic triggers "Speaking…" state when agent responds
- Tapping "End session" disconnects and closes the sheet
- If a transcript was received via data channel, it appears in the chat thread

- [ ] **Step 5: Verify offline fallback**

Enable airplane mode. Tap the FAB. Confirm:
- No token fetch (no network request visible in logs)
- Device STT activates immediately
- On-device Gemma responds via `expo-speech`
- Transcript saved to chat thread after session ends

- [ ] **Step 6: Final quality gate**

```bash
npm run lint && npm run typecheck && npm test
```

Expected: all pass.

- [ ] **Step 7: Final commit**

```bash
git add -p  # review any remaining unstaged changes
git commit -m "feat(voice): complete LiveKit voice session feature with offline STT fallback"
```
