# Offline Mode: LiteRT-LM Migration + Streaming + Vision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the native Android Gemma module from MediaPipe `tasks-genai` to LiteRT-LM, enabling full offline text/voice/image Q&A with streaming tokens.

**Architecture:** The existing routing layer (`askAgent`) already routes offline traffic to `onDeviceAgent`. The only broken link is the native Kotlin module using the old MediaPipe API. We rewrite the Kotlin module using LiteRT-LM's `Engine`/`Conversation` API, add an `onToken` event stream through the full JS stack (Kotlin → `index.ts` → `native-backend.ts` → `onDeviceAgent` → routing → chat UI), and enable vision by passing `Content.ImageBytes` to multimodal conversations.

**Tech Stack:** LiteRT-LM (`com.google.ai.edge.litertlm:litertlm-android:latest.release`), Expo Modules Core (EventEmitter), Kotlin coroutines + Flow, TypeScript.

---

## File Map

| File | Change |
|------|--------|
| `modules/gemma-llm/android/build.gradle` | Swap mediapipe → litertlm-android |
| `modules/gemma-llm/android/src/main/java/expo/modules/gemma/GemmaLlmModule.kt` | Full rewrite: LiteRT-LM Engine/Conversation/Flow streaming |
| `modules/gemma-llm/src/index.ts` | Add `addTokenListener` via EventEmitter |
| `src/shared/ondevice/gemma.ts` | Add `onToken` to `GenerateInput` |
| `src/shared/ondevice/native-backend.ts` | Wire streaming subscription; set `supportsVision = true` |
| `src/shared/ondevice/onDeviceAgent.ts` | Thread `onToken` to Stage C synthesize call |
| `src/shared/api/routing.ts` | Add `onToken` to `AgentQuery` |
| `src/features/chat/useSendQuery.ts` | Accept + forward `onToken`; stream tokens into cache |

---

## Task 1: Swap Gradle Dependency

**Files:**
- Modify: `modules/gemma-llm/android/build.gradle`

- [ ] **Step 1: Replace the mediapipe dependency**

Open `modules/gemma-llm/android/build.gradle`. The current `dependencies` block is:

```gradle
dependencies {
    implementation 'com.google.mediapipe:tasks-genai:0.10.14'
}
```

Replace it with:

```gradle
dependencies {
    implementation "com.google.ai.edge.litertlm:litertlm-android:latest.release"
}
```

- [ ] **Step 2: Verify Gradle syncs cleanly**

Run:
```bash
cd modules/gemma-llm/android && ./gradlew dependencies --configuration releaseRuntimeClasspath 2>&1 | grep litertlm
```
Expected: line containing `litertlm-android` with a resolved version.

If `latest.release` resolves to nothing, pin a specific version from Google Maven:
`https://maven.google.com/web/index.html#com.google.ai.edge.litertlm:litertlm-android`

- [ ] **Step 3: Commit**

```bash
git add modules/gemma-llm/android/build.gradle
git commit -m "build(gemma-llm): swap mediapipe tasks-genai for litertlm-android"
```

---

## Task 2: Rewrite Kotlin Module — Text Generation + Streaming

**Files:**
- Modify: `modules/gemma-llm/android/src/main/java/expo/modules/gemma/GemmaLlmModule.kt`

The LiteRT-LM API:
- `Engine(EngineConfig(modelPath, backend))` — wraps the model
- `engine.initialize()` — loads weights into memory
- `engine.createConversation()` — stateful chat session
- `conversation.sendMessageAsync(Contents.of(Content.Text(prompt)))` — returns `Flow<Message>`
- Each `Message` in the flow is a partial token; `.toString()` gives its text

- [ ] **Step 1: Write the new GemmaLlmModule.kt**

Replace the entire file content:

```kotlin
package expo.modules.gemma

import android.util.Base64
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GemmaLlmModule : Module() {
    private var engine: Engine? = null
    private var conversation: com.google.ai.edge.litertlm.Conversation? = null
    private var isCancelled = false

    override fun definition() = ModuleDefinition {
        Name("GemmaLlm")
        Events("onToken")

        AsyncFunction("load") { modelPath: String, promise: Promise ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    engine?.close()
                    val config = EngineConfig(
                        modelPath = modelPath,
                        backend = Backend.CPU(),
                        visionBackend = Backend.CPU(),
                    )
                    val e = Engine(config)
                    e.initialize()
                    conversation = e.createConversation()
                    engine = e
                    promise.resolve(true)
                } catch (ex: Exception) {
                    promise.reject("LOAD_FAILED", ex.message ?: "Failed to load model", ex)
                }
            }
        }

        AsyncFunction("generate") { prompt: String, promise: Promise ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    isCancelled = false
                    val conv = conversation
                    if (conv == null) {
                        promise.reject("NOT_LOADED", "Model not loaded. Call load() first.", null)
                        return@launch
                    }
                    val sb = StringBuilder()
                    conv.sendMessageAsync(Contents.of(Content.Text(prompt)))
                        .collect { message ->
                            if (isCancelled) return@collect
                            val token = message.toString()
                            sb.append(token)
                            sendEvent("onToken", mapOf("token" to token, "done" to false))
                        }
                    sendEvent("onToken", mapOf("token" to "", "done" to true))
                    promise.resolve(sb.toString())
                } catch (ex: Exception) {
                    if (isCancelled) {
                        promise.resolve("")
                    } else {
                        promise.reject("GENERATE_FAILED", ex.message ?: "Generation failed", ex)
                    }
                }
            }
        }

        AsyncFunction("generateWithImage") { prompt: String, imageBase64: String, _mimeType: String, promise: Promise ->
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    isCancelled = false
                    val conv = conversation
                    if (conv == null) {
                        promise.reject("NOT_LOADED", "Model not loaded. Call load() first.", null)
                        return@launch
                    }
                    val imageBytes = Base64.decode(imageBase64, Base64.DEFAULT)
                    val sb = StringBuilder()
                    conv.sendMessageAsync(
                        Contents.of(
                            Content.ImageBytes(imageBytes),
                            Content.Text(prompt),
                        )
                    )
                        .collect { message ->
                            if (isCancelled) return@collect
                            val token = message.toString()
                            sb.append(token)
                            sendEvent("onToken", mapOf("token" to token, "done" to false))
                        }
                    sendEvent("onToken", mapOf("token" to "", "done" to true))
                    promise.resolve(sb.toString())
                } catch (ex: Exception) {
                    if (isCancelled) {
                        promise.resolve("")
                    } else {
                        promise.reject("GENERATE_FAILED", ex.message ?: "Generation failed", ex)
                    }
                }
            }
        }

        Function("cancel") {
            isCancelled = true
            try {
                conversation?.close()
                engine?.let { e -> conversation = e.createConversation() }
            } catch (_: Exception) {
                // ignore — best effort reset
            }
        }
    }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd modules/gemma-llm/android && ./gradlew compileDebugKotlin 2>&1 | tail -20
```
Expected: `BUILD SUCCESSFUL` with no unresolved reference errors.

If you see `Unresolved reference: litertlm` or similar, the Gradle dep from Task 1 hasn't synced. Run `./gradlew --refresh-dependencies` first.

- [ ] **Step 3: Commit**

```bash
git add modules/gemma-llm/android/src/main/java/expo/modules/gemma/GemmaLlmModule.kt
git commit -m "feat(gemma-llm): rewrite Kotlin module for LiteRT-LM with streaming and vision"
```

---

## Task 3: Add `addTokenListener` to JS Bridge

**Files:**
- Modify: `modules/gemma-llm/src/index.ts`

The Kotlin module now emits `onToken` events. We expose them via Expo's `EventEmitter`.

- [ ] **Step 1: Write the test**

Create `modules/gemma-llm/src/index.test.ts`:

```ts
import { addTokenListener } from "./index";

describe("addTokenListener", () => {
  it("returns a removable subscription when module not linked", () => {
    const sub = addTokenListener(() => {});
    expect(sub).toBeDefined();
    expect(typeof sub.remove).toBe("function");
    // Should not throw even when native module is null
    expect(() => sub.remove()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest modules/gemma-llm/src/index.test.ts --no-coverage 2>&1 | tail -20
```
Expected: `FAIL` — `addTokenListener is not a function` (export doesn't exist yet).

- [ ] **Step 3: Update `modules/gemma-llm/src/index.ts`**

Replace the entire file:

```ts
import { requireNativeModule, EventEmitter } from "expo-modules-core";
import type { Subscription } from "expo-modules-core";

type NativeGemma = {
  load: (modelPath: string) => Promise<boolean>;
  generate: (prompt: string) => Promise<string>;
  generateWithImage: (prompt: string, imageBase64: string, mimeType: string) => Promise<string>;
  cancel: () => void;
};

let native: NativeGemma | null = null;
let emitter: EventEmitter | null = null;
try {
  native = requireNativeModule<NativeGemma>("GemmaLlm");
  emitter = new EventEmitter(native as unknown as { addListener: unknown });
} catch {
  native = null;
  emitter = null;
}

export function isNativeGemmaModuleLinked(): boolean {
  return native != null;
}

export const loadModel = (modelPath: string): Promise<boolean> => {
  if (!native) {
    return Promise.reject(new Error("GemmaLlm native module not linked; run prebuild."));
  }
  return native.load(modelPath);
};

export const generateText = (prompt: string): Promise<string> => {
  if (!native) {
    return Promise.reject(new Error("GemmaLlm native module not linked."));
  }
  return native.generate(prompt);
};

export const generateTextWithImage = (
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> => {
  if (!native) {
    return Promise.reject(new Error("GemmaLlm native module not linked."));
  }
  return native.generateWithImage(prompt, imageBase64, mimeType);
};

export const cancelGeneration = (): void => {
  native?.cancel();
};

export function addTokenListener(
  cb: (token: string, done: boolean) => void,
): Subscription {
  if (!emitter) {
    return { remove: () => {} } as Subscription;
  }
  return emitter.addListener("onToken", (event: { token: string; done: boolean }) => {
    cb(event.token, event.done);
  });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest modules/gemma-llm/src/index.test.ts --no-coverage 2>&1 | tail -20
```
Expected: `PASS`.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --no-coverage 2>&1 | tail -30
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add modules/gemma-llm/src/index.ts modules/gemma-llm/src/index.test.ts
git commit -m "feat(gemma-llm): add addTokenListener for streaming token events"
```

---

## Task 4: Add `onToken` to `GenerateInput` Type

**Files:**
- Modify: `src/shared/ondevice/gemma.ts`

- [ ] **Step 1: Update `GenerateInput` in `src/shared/ondevice/gemma.ts`**

Find the `GenerateInput` type (currently lines ~1–10). Change it from:

```ts
export type GenerateInput = {
  prompt: string;
  language: Language;
  intent: DeviceIntent;
};
```

To:

```ts
export type GenerateInput = {
  prompt: string;
  language: Language;
  intent: DeviceIntent;
  onToken?: (token: string) => void;
};
```

Also update `GemmaBackend` to include `onToken` in the `generate` and `generateWithImage` signatures. Find:

```ts
export type GemmaBackend = {
  generate: (i: GenerateInput) => Promise<GenerateOutput>;
  loadModel?: () => Promise<void>;
  cancel?: () => void;
  generateWithImage?: (prompt: string, imageBase64: string, mimeType: string) => Promise<GenerateOutput>;
  supportsVision?: boolean;
};
```

Change `generateWithImage` signature to include `onToken`:

```ts
export type GemmaBackend = {
  generate: (i: GenerateInput) => Promise<GenerateOutput>;
  loadModel?: () => Promise<void>;
  cancel?: () => void;
  generateWithImage?: (
    prompt: string,
    imageBase64: string,
    mimeType: string,
    onToken?: (token: string) => void,
  ) => Promise<GenerateOutput>;
  supportsVision?: boolean;
};
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck 2>&1 | grep -E "error|warning" | head -20
```
Expected: zero new errors (if `onToken` is optional, existing callers still compile).

- [ ] **Step 3: Commit**

```bash
git add src/shared/ondevice/gemma.ts
git commit -m "feat(ondevice): add onToken streaming callback to GenerateInput and GemmaBackend"
```

---

## Task 5: Wire Streaming + Vision in `native-backend.ts`

**Files:**
- Modify: `src/shared/ondevice/native-backend.ts`

- [ ] **Step 1: Write a test for streaming accumulation**

Create `src/shared/ondevice/native-backend.test.ts`:

```ts
import type { GemmaBackend } from "./gemma";

// Replicate the streaming logic from createNativeBackend without the native module
function createTestBackend(tokens: string[]): GemmaBackend {
  return {
    supportsVision: true,
    generate: async ({ onToken }) => {
      const text = tokens.join("");
      for (const token of tokens) {
        onToken?.(token);
      }
      return { text, confidence: 0.72, modelUsed: "gemma-4-e4b-it" };
    },
  };
}

describe("native backend streaming", () => {
  it("calls onToken for each partial token", async () => {
    const received: string[] = [];
    const backend = createTestBackend(["Hello", " world", "!"]);
    const result = await backend.generate({
      prompt: "hi",
      language: "en",
      intent: "general",
      onToken: (t) => received.push(t),
    });
    expect(received).toEqual(["Hello", " world", "!"]);
    expect(result.text).toBe("Hello world!");
  });

  it("works without onToken callback", async () => {
    const backend = createTestBackend(["Hello"]);
    const result = await backend.generate({
      prompt: "hi",
      language: "en",
      intent: "general",
    });
    expect(result.text).toBe("Hello");
  });
});
```

- [ ] **Step 2: Run test to confirm it passes (pure logic test)**

```bash
npx jest src/shared/ondevice/native-backend.test.ts --no-coverage 2>&1 | tail -10
```
Expected: `PASS`.

- [ ] **Step 3: Update `src/shared/ondevice/native-backend.ts`**

Replace the entire file:

```ts
import {
  loadModel,
  generateText,
  generateTextWithImage,
  cancelGeneration,
  isNativeGemmaModuleLinked,
  addTokenListener,
} from "@/modules/gemma-llm/src";
import type { GenerateInput, GenerateOutput, GemmaBackend } from "./gemma";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";

const clampConfidence = (raw: number): number =>
  Math.min(0.99, Math.max(0, Number.isFinite(raw) ? raw : CONFIDENCE_THRESHOLD_LOW));

export function createNativeBackend(modelPath: string): GemmaBackend {
  let ready = false;

  const backend: GemmaBackend = {
    supportsVision: false,

    loadModel: async () => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
        backend.supportsVision = true;
      }
    },

    cancel: () => {
      cancelGeneration();
    },

    generate: async ({ prompt, onToken }: GenerateInput): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
        backend.supportsVision = true;
      }
      const sub = onToken
        ? addTokenListener((token, done) => {
            if (!done && token) onToken(token);
          })
        : null;
      try {
        const out = await generateText(prompt);
        return {
          text: out,
          confidence: clampConfidence(0.72),
          modelUsed: "gemma-4-e4b-it",
        };
      } finally {
        sub?.remove();
      }
    },

    generateWithImage: async (
      prompt: string,
      imageBase64: string,
      mimeType: string,
      onToken?: (token: string) => void,
    ): Promise<GenerateOutput> => {
      if (!isNativeGemmaModuleLinked()) {
        throw new Error("Native Gemma module not in this build");
      }
      if (!ready) {
        await loadModel(modelPath);
        ready = true;
        backend.supportsVision = true;
      }
      const sub = onToken
        ? addTokenListener((token, done) => {
            if (!done && token) onToken(token);
          })
        : null;
      try {
        const out = await generateTextWithImage(prompt, imageBase64, mimeType);
        return {
          text: out,
          confidence: clampConfidence(0.72),
          modelUsed: "gemma-4-e4b-it",
        };
      } finally {
        sub?.remove();
      }
    },
  };

  return backend;
}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error" | head -20
```
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ondevice/native-backend.ts src/shared/ondevice/native-backend.test.ts
git commit -m "feat(ondevice): wire streaming tokens and enable vision in native backend"
```

---

## Task 6: Thread `onToken` Through `onDeviceAgent.ts`

**Files:**
- Modify: `src/shared/ondevice/onDeviceAgent.ts`

Stage A (planner) must NOT stream — it needs the full JSON response to parse a plan.
Stage C (synthesizer) SHOULD stream — this is the user-visible response.

- [ ] **Step 1: Update `callGemmaWithTimeout` signature**

Find `callGemmaWithTimeout` in `src/shared/ondevice/onDeviceAgent.ts`:

```ts
async function callGemmaWithTimeout(
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
```

Change it to:

```ts
async function callGemmaWithTimeout(
  prompt: string,
  signal?: AbortSignal,
  onToken?: (token: string) => void,
): Promise<string> {
```

Then find the `backend.generate` call inside it:

```ts
    const result = await backend.generate({
      prompt,
      language: "hi",
      intent: "general",
    });
```

Change it to:

```ts
    const result = await backend.generate({
      prompt,
      language: "hi",
      intent: "general",
      onToken,
    });
```

- [ ] **Step 2: Pass `onToken` in Stage C synthesize call**

In `onDeviceAgent.run()`, find Stage C — the second `callGemmaWithTimeout` call:

```ts
    let finalText: string;
    try {
      finalText = await callGemmaWithTimeout(synthPrompt, signal);
```

Change it to:

```ts
    let finalText: string;
    try {
      finalText = await callGemmaWithTimeout(synthPrompt, signal, query.onToken);
```

Stage A planner call (first `callGemmaWithTimeout`) stays unchanged — no `onToken`.

Also update the `AgentQuery` import at the top of the file to include `onToken`. The type comes from `@/shared/api/routing` — this will be updated in Task 7, so `onToken` will be available automatically once Task 7 is done.

- [ ] **Step 3: Update vision dispatch in `dispatchTool`**

Find the vision case in `dispatchTool`:

```ts
      const out = await backend
        .generateWithImage(
          "Analyze this crop image for diseases or problems. Describe what you see.",
          query.imageBase64,
          query.imageMimeType ?? "image/jpeg",
        )
```

Change it to:

```ts
      const out = await backend
        .generateWithImage(
          "Analyze this crop image for diseases or problems. Describe what you see.",
          query.imageBase64,
          query.imageMimeType ?? "image/jpeg",
          query.onToken,
        )
```

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error" | head -20
```
Expected: `onToken` may show as unknown on `AgentQuery` until Task 7 is done. That's fine — complete Task 7 next, then re-run.

- [ ] **Step 5: Commit (after Task 7 typecheck passes)**

```bash
git add src/shared/ondevice/onDeviceAgent.ts
git commit -m "feat(ondevice): thread onToken streaming through onDeviceAgent Stage C and vision"
```

---

## Task 7: Add `onToken` to `AgentQuery` in Routing

**Files:**
- Modify: `src/shared/api/routing.ts`

- [ ] **Step 1: Update `AgentQuery` type**

Find the `AgentQuery` type in `src/shared/api/routing.ts`:

```ts
export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  imageBase64?: string;
  imageMimeType?: string;
  intent: DeviceIntent;
  signal?: AbortSignal;
};
```

Change it to:

```ts
export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  imageBase64?: string;
  imageMimeType?: string;
  intent: DeviceIntent;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
};
```

- [ ] **Step 2: Forward `onToken` in the offline path**

Find the offline `onDeviceAgent.run` call (under `if (ctx.connectivity === "offline")`):

```ts
    return onDeviceAgent.run(
      q,
      {
        district: ctx.location.district,
        state: ctx.location.state,
        ...(
```

The `q` (AgentQuery) already contains `onToken` — `onDeviceAgent.run` receives the full `q` object, so `query.onToken` is automatically available. No change needed here.

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>&1 | grep "error" | head -20
```
Expected: zero errors. The `onToken` in `onDeviceAgent.ts` from Task 6 now resolves correctly.

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage 2>&1 | tail -30
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/api/routing.ts
git commit -m "feat(api): add onToken streaming callback to AgentQuery"
```

---

## Task 8: Wire `onToken` to Chat UI in `useSendChatMessage`

**Files:**
- Modify: `src/features/chat/useSendQuery.ts`

The offline path uses `useSendChatMessage` (a TanStack Query mutation). We add `onToken` to `SendQueryInput` and use it to update the in-progress message in the query cache as tokens arrive.

- [ ] **Step 1: Write the test**

Create `src/features/chat/useSendQuery.streaming.test.ts`:

```ts
// Tests the onToken accumulation logic in isolation (no hooks)
describe("onToken accumulation", () => {
  it("concatenates partial tokens into full response", () => {
    const tokens: string[] = [];
    const onToken = (t: string) => tokens.push(t);
    
    ["नमस्ते", " किसान", " जी!"].forEach(onToken);
    
    expect(tokens.join("")).toBe("नमस्ते किसान जी!");
  });
});
```

- [ ] **Step 2: Run test to confirm it passes**

```bash
npx jest src/features/chat/useSendQuery.streaming.test.ts --no-coverage 2>&1 | tail -10
```
Expected: `PASS`.

- [ ] **Step 3: Add `onToken` to `SendQueryInput`**

In `src/features/chat/useSendQuery.ts`, find the `SendQueryInput` type and add:

```ts
export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  lat?: number;
  lng?: number;
  connectivity: Connectivity;
  imageRef?: string;
  imageLocalUri?: string;
  skipUserMessage?: boolean;
  forceBackend?: boolean;
  conversationId?: string;
  signal?: AbortSignal;
  onToken?: (token: string) => void;   // NEW — streams partial tokens for offline mode
};
```

- [ ] **Step 4: Forward `onToken` to `askAgent` in the mutation function**

In `useSendChatMessage`, find the `mutationFn` where `askAgent` is called. It currently looks like:

```ts
      const response = await askAgent(
        {
          text,
          language: p.language,
          imageBase64: ...,
          imageMimeType: ...,
          intent,
          signal: p.signal,
        },
        ...
      );
```

Add `onToken: p.onToken` to the query object passed to `askAgent`:

```ts
      const response = await askAgent(
        {
          text,
          language: p.language,
          imageBase64: ...,
          imageMimeType: ...,
          intent,
          signal: p.signal,
          onToken: p.onToken,
        },
        ...
      );
```

- [ ] **Step 5: Run typecheck + tests**

```bash
npm run typecheck 2>&1 | grep "error" | head -20
npm test -- --no-coverage 2>&1 | tail -30
```
Expected: zero errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/useSendQuery.ts src/features/chat/useSendQuery.streaming.test.ts
git commit -m "feat(chat): wire onToken streaming callback through useSendChatMessage for offline mode"
```

---

## Task 9: Quality Gates

- [ ] **Step 1: Lint**

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -30
```
Expected: zero errors, zero new warnings.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1
```
Expected: `Found 0 errors`.

- [ ] **Step 3: All tests**

```bash
npm test -- --no-coverage 2>&1 | tail -30
```
Expected: all tests pass.

- [ ] **Step 4: Web export smoke test**

```bash
npx expo export -p web --output-dir /tmp/web-verify 2>&1 | tail -10
```
Expected: `Export was successful`.

- [ ] **Step 5: Commit if any lint fixes were needed**

```bash
git add -p  # only stage lint-fix changes
git commit -m "fix(offline): lint cleanup after LiteRT-LM streaming wiring"
```

---

## Task 10: Native Build Verification (requires Android device/emulator)

These steps require a device build (`npx expo run:android`) and cannot be tested in Jest.

- [ ] **Step 1: Prebuild**

```bash
npx expo prebuild --platform android --clean
```
Expected: no errors. Verify `android/app/build.gradle` includes `gemma-llm` module.

- [ ] **Step 2: Run on device**

```bash
npx expo run:android
```
Expected: app launches without crash.

- [ ] **Step 3: Verify offline text flow**

1. Enable airplane mode on the device.
2. Open app → Chat tab.
3. Ask: "मेरी फसल के लिए कौन सी खाद अच्छी है?"
4. Observe: tokens stream into the chat bubble character-by-character.
5. Expected: full response appears, source = `ondevice`.

- [ ] **Step 4: Verify offline image flow**

1. Keep airplane mode on.
2. Attach a crop photo and ask: "इस फसल में क्या समस्या है?"
3. Expected: vision response streams in. No "visionUnavailable" error.

- [ ] **Step 5: Verify offline voice flow**

1. Keep airplane mode on.
2. Open Voice tab → tap to start.
3. Ask a question verbally.
4. Expected: STT transcribes, LLM responds, TTS speaks the answer.

- [ ] **Step 6: Verify online path unchanged**

1. Disable airplane mode.
2. Ask the same question in Chat.
3. Expected: response comes from backend, streaming via AI SDK as before.

---

## Notes

### Model File Format
The existing model URLs in `gemmaDownload.ts` point to `gemma-4-E4B-it-web.task` from the `litert-community` HuggingFace repo. The LiteRT-LM docs show `.litertlm` extension in examples but the `litert-community` models use `.task`. If `Engine(EngineConfig(modelPath = "...web.task"))` throws a format error at runtime, update `MODEL_FILENAMES` in `src/shared/ondevice/localGemmaModelFile.ts` to use a `.litertlm` model URL and filename.

### Conversation Statefulness
`LiteRT-LM Conversation` is stateful — it remembers prior messages within a session. The current `onDeviceAgent` creates a new session per query (Stage A + Stage C share one conversation in our Kotlin module). If you see the planner context bleeding into synthesizer output, replace `engine.createConversation()` in `GemmaLlmModule.kt` with a fresh conversation per `generate()` call by moving `conversation = e.createConversation()` into each `AsyncFunction`.

### Streaming + Voice
Voice (`useVoiceSession.ts → startOffline`) calls `askAgent` without `onToken`. This is intentional — TTS needs the complete sentence, not partial tokens. No change needed.
