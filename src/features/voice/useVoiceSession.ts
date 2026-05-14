import { useCallback, useRef, useEffect } from "react";
import { Platform } from "react-native";
import { useConnectivity } from "@/shared/network";
import { useVoice, speak as speakText } from "@/shared/voice";
import { askAgent, postVoiceToken } from "@/shared/api";
import { appendMessage, MAIN_THREAD_ID } from "@/features/chat";
import { useVoiceSessionStore } from "./useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

// Lazy loader — called at voice-session start time, AFTER registerGlobals() has run.
// Module-level require would execute before RootProviders calls registerGlobals(),
// making livekitRN permanently null even in dev builds.
function loadLiveKit(): {
  livekitClient: typeof import("livekit-client");
  livekitRN: typeof import("@livekit/react-native");
} | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lk = require("livekit-client") as typeof import("livekit-client");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lkRN = require("@livekit/react-native") as typeof import("@livekit/react-native");
    return { livekitClient: lk, livekitRN: lkRN };
  } catch {
    return null;
  }
}

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
  const roomRef = useRef<import("livekit-client").Room | null>(null);
  // True while stop() is executing — prevents Disconnected handler from double-resetting
  const stoppedByUser = useRef(false);

  // Cleanup room on unmount
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

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
      const livekit = loadLiveKit();
      if (!livekit) {
        throw new Error("LiveKit native module not available — running in Expo Go or web");
      }
      const { livekitClient, livekitRN } = livekit;
      const { Room: LKRoom, RoomEvent } = livekitClient;
      const { AudioSession, AndroidAudioTypePresets } = livekitRN;

      // Route audio to speaker by default (headset/bluetooth override automatically)
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ["speaker", "earpiece"],
          audioTypeOptions: AndroidAudioTypePresets.communication,
        },
        ios: { defaultOutput: "speaker" },
      });
      await AudioSession.startAudioSession();

      const { server_url, participant_token } = await postVoiceToken({
        farmer_id: input.farmerId,
        ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
        participant_identity: input.farmerId,
        language: input.language,
      });

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

      // When agent stops speaking, go back to listening for next query
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length === 0 && useVoiceSessionStore.getState().phase === "speaking") {
          store.setPhase("listening");
        }
      });

      // Reconnect resilience on brief network drops
      room.on(RoomEvent.Reconnecting, () => store.setPhase("connecting"));
      room.on(RoomEvent.Reconnected, () => store.setPhase("listening"));

      room.on(RoomEvent.Disconnected, async () => {
        if (stoppedByUser.current) return; // stop() handles its own cleanup
        // Unexpected disconnect (backend closed room after agent response)
        const { transcript } = useVoiceSessionStore.getState();
        if (transcript) {
          try {
            await appendMessage({ role: "user", text: transcript.user, threadId: MAIN_THREAD_ID });
            await appendMessage({ role: "assistant", text: transcript.agent, threadId: MAIN_THREAD_ID });
          } catch {
            // best-effort save
          }
        }
        roomRef.current = null;
        store.reset();
      });

      await room.connect(server_url, participant_token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      store.setPhase("listening");
    } catch (err) {
      // LiveKit failed — log for debugging then fall back to local STT
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn("[VoiceSession] startOnline failed, falling back to offline STT:", err);
      }
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
    stoppedByUser.current = true;
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
        const lk = loadLiveKit();
        if (lk) await lk.livekitRN.AudioSession.stopAudioSession();
      } catch {
        // ignore — web or mock env
      }
      roomRef.current = null;
    } else {
      await voice.stopListening();
      voice.cancelSpeech();
    }
    store.reset();
    stoppedByUser.current = false;
  }, [store, voice]);

  return { phase: store.phase, start, stop };
}
