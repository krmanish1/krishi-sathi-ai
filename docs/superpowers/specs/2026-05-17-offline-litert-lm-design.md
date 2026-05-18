# Offline Mode: LiteRT-LM Migration + Streaming + Vision

**Date:** 2026-05-17  
**Branch:** feat/voice-session-restart  
**Scope:** Android only

## Summary

Migrate the native Gemma module from MediaPipe `tasks-genai` to **LiteRT-LM**, enabling:
- Full offline text chat (already routed, just needs working native backend)
- Offline image analysis (vision) via single multimodal model (Gemma 3n E4B)
- Offline voice Q&A (already routed via `startOffline()`, needs working backend)
- Streaming token output from on-device inference for real-time chat UX

## What Already Works (No Change)

| Component | File | Status |
|-----------|------|--------|
| Offline routing | `src/shared/api/routing.ts` | ✅ routes `offline` → `onDeviceAgent` |
| Vision intent dispatch | `src/shared/ondevice/onDeviceAgent.ts` | ✅ calls `generateWithImage` if `supportsVision` |
| Voice offline path | `src/features/voice/useVoiceSession.ts` | ✅ `startOffline()` uses expo-speech-recognition + `askAgent` |
| Model state management | `src/shared/ondevice/modelState.ts` | ✅ `isModelReady`, `getPreferOffline` |
| Model download flow | `src/shared/ondevice/gemmaDownload.ts` | ✅ keep as-is, update URL only |
| Offline bundle fallback | `src/shared/ondevice/offlineFallback.ts` | ✅ used when model not ready |

## Architecture

### Data Flow — Offline Text/Voice

```
User types or speaks
        ↓
connectivity === "offline"  OR  (isModelReady() && getPreferOffline())
        ↓
askAgent(query, ctx) → onDeviceAgent.run()
        ↓ Stage A: Plan (1 Gemma call, no streaming — needs full JSON)
GemmaLlmModule.generate(prompt)
        ↓ Stage B: Tool dispatch (SQLite, rules — no LLM)
        ↓ Stage C: Synthesize (1 Gemma call, WITH streaming)
GemmaLlmModule.generate(prompt, onToken) → tokens stream to UI
        ↓
AgentResponse.text → chat UI
```

### Data Flow — Offline Image

```
User attaches image + asks question
        ↓
onDeviceAgent dispatches "vision" tool
        ↓
backend.generateWithImage(prompt, imageBase64, mimeType, onToken)
        ↓
GemmaLlmModule.generateWithImage() → LiteRT-LM session + addImage()
        ↓
streaming tokens → UI
```

### Data Flow — Offline Voice

```
User speaks → expo-speech-recognition (on-device STT, no change)
        ↓
transcribed text → askAgent (same as text flow above)
        ↓
AgentResponse.text → expo-speech TTS speaks answer
(voice skips onToken streaming — TTS needs full sentence)
```

## Files Changed

### 1. `modules/gemma-llm/android/build.gradle`

```gradle
// REMOVE:
implementation 'com.google.mediapipe:tasks-genai:0.10.14'
// ADD:
implementation 'com.google.ai.edge.litert:litert-lm-android:0.1.1'
```

### 2. `modules/gemma-llm/android/src/main/java/expo/modules/gemma/GemmaLlmModule.kt`

Full rewrite using LiteRT-LM API:

- `load(modelPath)` — `LlmInference.Options.builder().setModelPath().setMaxTokens().build()`
- `generate(prompt)` — `generateResponseAsync(prompt) { partial, done → sendEvent("onToken", ...) }`
- `generateWithImage(prompt, imageBase64, mimeType)` — `createSession()` + `addImage(bitmap)` + `addQueryChunk(prompt)` + `generateResponseAsync`
- `cancelGeneration()` — `llmInference.close()` or session cancel
- Events emitted: `onToken: { token: string, done: boolean }`

### 3. `modules/gemma-llm/src/index.ts`

```ts
// generateText / generateTextWithImage return Promise<void>
// Response arrives via event subscription
export function addTokenListener(
  cb: (token: string, done: boolean) => void
): Subscription
```

### 4. `src/shared/ondevice/gemma.ts`

Add `onToken` to `GenerateInput`:

```ts
type GenerateInput = {
  prompt: string;
  language: Language;
  intent: DeviceIntent;
  onToken?: (token: string) => void;  // optional streaming callback
};
// Same addition to generateWithImage signature
```

### 5. `src/shared/ondevice/native-backend.ts`

- `loadModel()`: set `backend.supportsVision = true` after successful load (LiteRT-LM multimodal model)
- `generate()`: subscribe to `addTokenListener`, call `onToken` per partial token, resolve on `done=true`
- `generateWithImage()`: same streaming wiring for image sessions

### 6. `src/shared/ondevice/onDeviceAgent.ts`

- Stage A (plan call): no `onToken` — needs complete JSON response
- Stage C (synthesize call): pass `onToken` through from query
- Expose `onToken` in `AgentQuery` and forward it down

### 7. `src/shared/api/routing.ts`

```ts
type AgentQuery = {
  // ...existing fields...
  onToken?: (token: string) => void;  // NEW — forwarded to onDeviceAgent/backend
};
```

Backend path does not use `onToken` (backend streaming handled separately via `useStreamChatMessage`).

### 8. Chat UI wiring

`useSendQuery.ts` / `useStreamChatMessage.ts`: pass `onToken` callback that appends partial tokens to the in-progress message bubble — same pattern already used for streaming backend responses.

### 9. Model URL (env / config only)

Update `EXPO_PUBLIC_GEMMA_MODEL_URL` (or equivalent constant) to point to Gemma 3n E4B `.task` file that supports both text and vision. No code change.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Model not downloaded | `isModelReady()=false` → `offlineFallback()` (bundle canned responses) |
| LiteRT-LM load fails | `loadModel` throws → `setModelReady` never called → stays unready |
| Generation timeout >60s | Existing `MAX_GEN_MS` abort in `callGemmaWithTimeout` — no change |
| Vision on non-multimodal model | `generateWithImage` rejects → `onDeviceAgent` returns i18n `"offline.visionUnavailable"` |
| Streaming interrupted (app backgrounded) | `cancelGeneration()` → `done=true` event → Promise resolves with partial text |
| LiteRT-LM not linked (non-native build) | `isNativeGemmaModuleLinked()` check throws early — existing guard |

## Streaming Behavior

- **Stage A (planner):** No streaming. Needs full JSON response to parse plan.
- **Stage C (synthesizer):** Streams tokens via `onToken`. UI appends tokens to message bubble.
- **Voice:** No streaming. Full response handed to TTS after generation completes.
- **Image:** Streams tokens same as text synthesizer stage.

## Testing

- Unit tests: mock `GemmaBackend` with streaming `onToken` — verify token accumulation
- Integration: `connectivity="offline"` → `askAgent` → tokens stream → full response assembled correctly
- Vision: `imageBase64` present + `supportsVision=true` → `generateWithImage` called
- Fallback: `isModelReady()=false` + `offline` → `offlineFallback` returns bundle response
- Existing tests in `guessDeviceIntent.test.ts` and API endpoint tests must continue to pass

## Out of Scope

- iOS offline (future work)
- Streaming for backend responses (separate system, already exists)
- Second model for vision (single multimodal model chosen)
- New model download UI (keep existing flow)
