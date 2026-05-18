package expo.modules.voiceaudio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager

/**
 * Forces MODE_IN_COMMUNICATION before WebRTC/LiveKit connects.
 * Prevents Android from reinitializing the mic pipeline every few seconds (choppy speech).
 */
internal object VoiceAudioManager {
    private var focusRequest: AudioFocusRequest? = null

    fun enableVoiceMode(context: Context) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        @Suppress("DEPRECATION")
        audioManager.isSpeakerphoneOn = true

        // Samsung devices may bounce routing to phantom Bluetooth SCO endpoints.
        try {
            audioManager.stopBluetoothSco()
            @Suppress("DEPRECATION")
            audioManager.isBluetoothScoOn = false
        } catch (_: Exception) {
            // Best-effort — some API levels/devices omit SCO controls.
        }

        focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }

        val request =
            AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build(),
                )
                .build()
        focusRequest = request
        audioManager.requestAudioFocus(request)
    }

    fun disableVoiceMode(context: Context) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        focusRequest?.let {
            audioManager.abandonAudioFocusRequest(it)
            focusRequest = null
        }
        audioManager.mode = AudioManager.MODE_NORMAL
        @Suppress("DEPRECATION")
        audioManager.isSpeakerphoneOn = false
    }
}
