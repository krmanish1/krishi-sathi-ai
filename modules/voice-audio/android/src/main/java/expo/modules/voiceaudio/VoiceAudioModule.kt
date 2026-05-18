package expo.modules.voiceaudio

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VoiceAudioModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("VoiceAudio")

        Function("enableVoiceMode") {
            appContext.reactContext?.applicationContext?.let { context ->
                VoiceAudioManager.enableVoiceMode(context)
            }
            null
        }

        Function("disableVoiceMode") {
            appContext.reactContext?.applicationContext?.let { context ->
                VoiceAudioManager.disableVoiceMode(context)
            }
            null
        }
    }
}
