package expo.modules.gemma

import com.google.mediapipe.tasks.genai.llminference.LlmInference
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GemmaLlmModule : Module() {
  private var llmInference: LlmInference? = null
  private var cancelled = false
  private val GENERATE_TIMEOUT_MS = 60_000L

  override fun definition() = ModuleDefinition {
    Name("GemmaLlm")

    AsyncFunction("load") { modelPath: String, promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val file = File(modelPath)
          if (!file.exists()) {
            promise.reject("FILE_NOT_FOUND", "Model file not found at: $modelPath", null)
            return@launch
          }
          val options = LlmInference.LlmInferenceOptions.builder()
            .setModelPath(modelPath)
            .setMaxTokens(1024)
            .setTopK(40)
            .setTemperature(0.7f)
            .setRandomSeed(0)
            .build()
          llmInference?.close()
          llmInference = LlmInference.createFromOptions(appContext.reactContext!!, options)
          promise.resolve(true)
        } catch (e: Exception) {
          promise.reject("LOAD_ERROR", e.message ?: "Failed to load model", e)
        }
      }
    }

    AsyncFunction("generate") { prompt: String, promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val inference = llmInference
          if (inference == null) {
            promise.reject("NOT_LOADED", "Model not loaded. Call load() first.", null)
            return@launch
          }
          cancelled = false
          val sb = StringBuilder()
          var resolved = false
          val timeout = java.util.Timer()
          timeout.schedule(object : java.util.TimerTask() {
            override fun run() {
              if (resolved) return
              resolved = true
              promise.reject("GENERATE_TIMEOUT", "Generation timed out", null)
            }
          }, GENERATE_TIMEOUT_MS)

          try {
            inference.generateResponseAsync(prompt) { partial, done ->
              if (resolved) return@generateResponseAsync
              if (cancelled) {
                resolved = true
                timeout.cancel()
                promise.reject("CANCELLED", "Generation cancelled", null)
                return@generateResponseAsync
              }
              sb.append(partial)
              sendEvent("onToken", mapOf("token" to partial, "done" to done))
              if (done) {
                resolved = true
                timeout.cancel()
                promise.resolve(sb.toString())
              }
            }
          } catch (e: Exception) {
            if (!resolved) {
              resolved = true
              timeout.cancel()
              promise.reject("GENERATE_ERROR", e.message ?: "Generation failed", e)
            }
          }
        } catch (e: Exception) {
          promise.reject("GENERATE_ERROR", e.message ?: "Generation failed", e)
        }
      }
    }

    AsyncFunction("generateWithImage") { prompt: String, imageBase64: String, mimeType: String, promise: Promise ->
      CoroutineScope(Dispatchers.IO).launch {
        try {
          val inference = llmInference
          if (inference == null) {
            promise.reject("NOT_LOADED", "Model not loaded. Call load() first.", null)
            return@launch
          }
          // This module currently supports text-only generation.
          // Keep this method for API compatibility, but reject so callers can fall back.
          promise.reject("VISION_UNSUPPORTED", "Vision/multimodal generation is not supported in this build", null)
        } catch (e: Exception) {
          promise.reject("GENERATE_IMAGE_ERROR", e.message ?: "Image generation failed", e)
        }
      }
    }

    Function("cancel") {
      cancelled = true
    }

    Events("onToken")
  }
}
