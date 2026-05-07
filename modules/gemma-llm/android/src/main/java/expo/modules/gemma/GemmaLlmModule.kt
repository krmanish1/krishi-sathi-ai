package expo.modules.gemma

import android.graphics.BitmapFactory
import android.util.Base64
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
          inference.generateResponseAsync(prompt) { partial, done ->
            if (cancelled) return@generateResponseAsync
            sb.append(partial)
            sendEvent("onToken", mapOf("token" to partial, "done" to done))
            if (done) {
              promise.resolve(sb.toString())
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
          // Decode base64 image
          val imageBytes = Base64.decode(imageBase64, Base64.DEFAULT)
          val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            ?: run {
              promise.reject("IMAGE_DECODE_ERROR", "Could not decode image", null)
              return@launch
            }
          cancelled = false
          val sb = StringBuilder()
          // For multimodal, prepend image context to prompt (MediaPipe LLM text mode)
          val fullPrompt = "[Image provided for analysis]\n$prompt"
          inference.generateResponseAsync(fullPrompt) { partial, done ->
            if (cancelled) return@generateResponseAsync
            sb.append(partial)
            if (done) {
              promise.resolve(sb.toString())
            }
          }
          bitmap.recycle()
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
