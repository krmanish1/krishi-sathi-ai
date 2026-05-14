# Voice Feature Design — KrishiSaathi AI

**Date:** 2026-05-14  
**Status:** Approved  
**Context:** Gemma 4 Good Hackathon — backend handoff integration

---

## 1. Overview

Add a persistent floating voice button (FAB) to the app that lets farmers speak queries in Hindi (or their selected language). Online: connects to a LiveKit room where the backend voice worker handles STT (Deepgram), LLM (Gemma 4), and TTS (Deepgram). Offline: falls back to device-local STT via `expo-speech-recognition` + on-device Gemma. Transcripts are saved to the SQLite chat thread after each session.

---

## 2. Architecture

### Feature slice

```
src/features/voice/
  index.ts                        ← barrel export
  useVoiceSession.ts              ← main hook (LiveKit + local STT)
  voiceTokenApi.ts                ← postVoiceToken() API call
  useVoiceSessionStore.ts         ← Zustand: session phase state
  components/
    VoiceFAB.tsx                  ← floating mic button
    VoiceSessionSheet.tsx         ← bottom sheet overlay
    VoiceWaveform.tsx             ← animated waveform bars
```

### Placement

`VoiceFAB` and `VoiceSessionSheet` mount inside `src/shared/providers/RootProviders.tsx`. Session state lives in a Zustand store so both components stay in sync without prop drilling.

### Dependencies

```
src/features/voice/
  → @/shared/api         (postVoiceToken, apiFetch, connectivity types)
  → @/shared/voice       (existing voiceStt + speak + cancelSpeech — offline fallback)
  → @/features/chat      (appendMessage, MAIN_THREAD_ID — transcript writes)
  → @livekit/react-native (LiveKitRoom, AudioSession, Room, RoomEvent)
  → livekit-client       (Room, RoomEvent types)
```

### New packages required

```
@livekit/react-native
@livekit/react-native-expo-plugin
@livekit/react-native-webrtc
@config-plugins/react-native-webrtc
livekit-client
```

**Note:** LiveKit RN SDK requires `expo-dev-client` and native prebuild. Not compatible with Expo Go.

---

## 3. Session State Machine

```
idle → connecting → listening → speaking → idle
         ↓              ↓           ↓
       error          error       error
         ↓              ↓           ↓
       idle           idle        idle
```

State lives in `useVoiceSessionStore.ts` (Zustand):

```ts
type VoicePhase = "idle" | "connecting" | "listening" | "speaking" | "error";

type VoiceSessionStore = {
  phase: VoicePhase;
  errorMessage: string | null;
  transcript: { user: string; agent: string } | null;
  setPhase: (p: VoicePhase) => void;
  setTranscript: (t: { user: string; agent: string } | null) => void;
  setError: (msg: string) => void;
  reset: () => void;
};
```

---

## 4. Data Flow

### Online path (LiveKit)

1. User taps FAB → `useVoiceSession.start()`.
2. Check `connectivity` from `useConnectivity()`. If online/degraded:
3. `POST /api/v1/voice/token` `{ farmer_id, language? }` → `{ serverUrl, token, room }`.
4. `AudioSession.startAudioSession()`.
5. Connect LiveKit `Room` with `serverUrl` + `token`. Publish mic (`audio: true`).
6. Set phase → `listening`.
7. Backend voice worker joins room → Deepgram STT → `/api/v1/query/stream` → Deepgram TTS → audio back via LiveKit.
8. App listens `RoomEvent.DataReceived` for `{ type: "transcript", user: string, agent: string }` messages from backend worker.
9. On transcript receipt → set phase `speaking` (while agent audio plays) → back to `listening`.
10. User taps FAB stop → `room.disconnect()` → `AudioSession.stopAudioSession()`.
11. Write transcript to SQLite via `appendMessage` (user role + agent role) using `MAIN_THREAD_ID`.

### Offline path (local STT fallback)

Triggered when `connectivity === "offline"` or token fetch fails (`fallback_hint === "USE_ONDEVICE"` or network error).

1. `voiceStt.start(lang)` → `onSpeechResults` → extract text.
2. `askAgent({ text, intent, language }, ctx)` → on-device Gemma or bundle offline fallback.
3. `speak(response.text, lang)` via `expo-speech`.
4. `appendMessage` both sides to chat thread.

### Token API

New function in `src/shared/api/endpoints.ts`:

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

export const postVoiceToken = (req: VoiceTokenRequest, signal?: AbortSignal) =>
  apiFetch<VoiceTokenResponse>("/api/v1/voice/token", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.voiceToken, // new constant: 5000ms
    method: "POST",
    body: req,
    ...(signal ? { signal } : {}),
  });
```

Also export from `src/shared/api/index.ts` and add `VoiceTokenRequest`, `VoiceTokenResponse` to `types.ts`.

---

## 5. Component Specs

### VoiceFAB

- Fixed position: bottom-right, `bottom: 90` (above tab bar height), `right: 16`.
- States:
  - `idle`: mic icon, green tint.
  - `connecting`: `ActivityIndicator`.
  - `listening`: pulsing red mic icon (CSS animation via `Animated`).
  - `speaking`: waveform bars (green).
  - `error`: mic-off icon, grey.
- Tap while `idle` → `useVoiceSession.start()`.
- Tap while active → `useVoiceSession.stop()`.
- On web platform: disabled with toast "Voice requires Android/iOS".

### VoiceSessionSheet

- React Native bottom sheet (uses `react-native-gesture-handler` already in deps).
- Shown when phase is not `idle`.
- Content: current phase label, transcript lines as they arrive, "End session" button.
- Language badge top-right (e.g. "हिन्दी").
- Dismissible only via "End session" button (not swipe-to-dismiss, to prevent accidental close).

### VoiceWaveform

- 5 vertical bars, heights animated via `Animated.loop` with staggered delays.
- Active when phase === `speaking`.

---

## 6. Error Handling

| Condition | Behavior |
|---|---|
| Token fetch fails (network) | Fall back to local STT; show "network busy" banner |
| `fallback_hint === "USE_ONDEVICE"` | Silent fallback to local STT |
| `fallback_hint === "RETRY_ONLINE_LATER"` | Toast: "Voice unavailable, try later"; stay idle |
| LiveKit connect timeout (>10s) | Disconnect; toast "Voice unavailable, using text mode" |
| Mic permission denied | Toast "Microphone permission needed"; FAB stays idle |
| Session end without transcript | Write nothing to chat (silent) |

Mic permission requested via `expo-av` on first FAB tap (not at app launch).

---

## 7. i18n

New locale keys required in both `en.json` and `hi.json`:

```
voice.start             — "Start voice session" / "आवाज़ सत्र शुरू करें"
voice.stop              — "Stop" / "रोकें"
voice.listening         — "Listening…" / "सुन रहा हूँ…"
voice.speaking          — "Speaking…" / "बोल रहा हूँ…"
voice.connecting        — "Connecting…" / "जोड़ रहा हूँ…"
voice.error.noInternet  — "Voice requires internet" / "आवाज़ के लिए इंटरनेट चाहिए"
voice.error.noMic       — "Microphone permission needed" / "माइक्रोफ़ोन अनुमति चाहिए"
voice.error.unavailable — "Voice unavailable, try later" / "आवाज़ उपलब्ध नहीं, बाद में आज़माएँ"
voice.fallback          — "Using offline mode" / "ऑफ़लाइन मोड का उपयोग"
voice.webUnsupported    — "Voice requires Android or iOS" / "आवाज़ Android या iOS पर काम करती है"
```

---

## 8. Native Build Requirements

Add to `app.json` plugins:

```json
"plugins": [
  "@livekit/react-native-expo-plugin",
  "@config-plugins/react-native-webrtc"
]
```

After install: `npx expo prebuild --platform android` and `npx expo run:android`.

Register globals in app entry (before any LiveKit usage):
```ts
import { registerGlobals } from "@livekit/react-native";
registerGlobals();
```

---

## 9. Testing Plan

### Unit tests (ts-jest, no RN modules)

- `voiceTokenApi.test.ts` — mock `apiFetch`; assert `POST /api/v1/voice/token` body shape.
- `useVoiceSessionStore.test.ts` — state transitions: idle→connecting→listening→speaking→idle, error resets to idle.

### Integration tests (jest-expo)

- `useVoiceSession.test.tsx`:
  - Online path: mock LiveKit SDK + token API; assert room connect called, `appendMessage` called on stop.
  - Offline path: mock `connectivity === "offline"`; assert `voiceStt.start()` called, `askAgent` called, `speak` called.
  - Fallback on token failure: token rejects → local STT path triggered.

### Not tested via Jest

- Audio playback, WebRTC connection, waveform animation — require real dev client + manual verification.

### Quality gates

`npm run lint && npm run typecheck && npm test` must all pass before merge.

---

## 10. Out of Scope

- Web platform voice support (LiveKit RN SDK not web-compatible; web shows disabled state).
- Multi-turn voice conversations beyond a single session (one session = one exchange).
- Push-to-talk vs. always-on toggle (always push-to-talk in this design).
- Voice-only mode with no text chat (voice always coexists with text chat).
