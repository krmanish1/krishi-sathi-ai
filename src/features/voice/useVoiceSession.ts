import { useCallback, useRef, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { LocalAudioTrack, RemoteAudioTrack } from "livekit-client";
import { useConnectivity } from "@/shared/network";
import { useVoice, speak as speakText } from "@/shared/voice";
import { askAgent, postVoiceToken } from "@/shared/api";
import { appendMessage, MAIN_THREAD_ID } from "@/features/chat";
import { useVoiceSessionStore } from "./useVoiceSessionStore";
import type { Language } from "@/shared/config/constants";

export type VoiceSessionAudioTracks = {
  localMic?: LocalAudioTrack;
  remoteAgent?: RemoteAudioTrack;
};

const STT_LOCALE: Record<string, string> = {
  hi: "hi-IN",
  en: "en-IN",
  pa: "pa-IN",
  te: "te-IN",
  mr: "mr-IN",
  bn: "bn-IN",
};

function toSttLocale(lang: string): string {
  return STT_LOCALE[lang] ?? `${lang}-IN`;
}

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
  const [audioTracks, setAudioTracks] = useState<VoiceSessionAudioTracks>({});
  // True while stop() is executing — prevents Disconnected handler from double-resetting
  const stoppedByUser = useRef(false);
  const stopGenRef = useRef(0);
  const [stopping, setStopping] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const syncAudioFromRoom = useCallback(() => {
    const r = roomRef.current;
    const lk = loadLiveKit();
    if (!r || !lk) {
      setAudioTracks({});
      return;
    }
    const { Track } = lk.livekitClient;
    const localPub = r.localParticipant.getTrackPublication(Track.Source.Microphone);
    let localMic: LocalAudioTrack | undefined;
    if (localPub?.track?.kind === Track.Kind.Audio) {
      localMic = localPub.track as LocalAudioTrack;
    }
    let remoteAgent: RemoteAudioTrack | undefined;
    for (const p of r.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track?.kind === Track.Kind.Audio) {
          remoteAgent = pub.track as RemoteAudioTrack;
          break;
        }
      }
      if (remoteAgent) break;
    }
    const next: VoiceSessionAudioTracks = {};
    if (localMic !== undefined) next.localMic = localMic;
    if (remoteAgent !== undefined) next.remoteAgent = remoteAgent;
    setAudioTracks(next);
    store.setAgentJoined(r.remoteParticipants.size > 0);
  }, [store]);

  // Cleanup room on unmount
  useEffect(() => {
    return () => {
      const r = roomRef.current;
      roomRef.current = null;
      if (r) {
        r.removeAllListeners();
        try { r.disconnect(); } catch { /* ignore */ }
      }
    };
  }, []);

  const startOfflineRef = useRef<(() => Promise<void>) | null>(null);

  const handleSpeechResult = useCallback(
    async (text: string) => {
      store.setPhase("speaking");
      let hadError = false;
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
        hadError = true;
        store.setError("voice.error.unavailable");
      } finally {
        if (!hadError && !stoppedByUser.current) {
          // Stay active — restart STT for next query
          store.setPhase("listening");
          startOfflineRef.current?.().catch(() => store.setError("voice.error.unavailable"));
        } else if (!stoppedByUser.current) {
          // Error state — leave error visible, don't reset
        }
        // If stoppedByUser: stop() is handling cleanup, do nothing
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.farmerId, input.language, input.state, input.district, input.conversationId, connectivity],
  );

  const voice = useVoice({ onSpeechResult: handleSpeechResult });

  const startOffline = useCallback(async () => {
    setAudioTracks({});
    const locale = toSttLocale(input.language);
    await voice.startListening(locale);
    store.setPhase("listening");
  }, [input.language, voice, store]);

  useEffect(() => {
    startOfflineRef.current = startOffline;
  }, [startOffline]);

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

      // Fire audio config and token fetch in parallel — saves ~300ms on first connect.
      const tokenPromise = postVoiceToken({
        farmer_id: input.farmerId,
        ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
        participant_identity: input.farmerId,
        language: input.language,
      });

      // Route audio to speaker by default (headset/bluetooth override automatically)
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: ["speaker", "earpiece"],
          audioTypeOptions: AndroidAudioTypePresets.media,
        },
        ios: { defaultOutput: "speaker" },
      });
      await AudioSession.startAudioSession();

      // Disconnect any stale room before creating a new one.
      // removeAllListeners() first — prevents stale room's WebSocket error
      // from becoming an unhandled promise rejection after disconnect.
      if (roomRef.current) {
        const stale = roomRef.current;
        roomRef.current = null;
        stale.removeAllListeners();
        try { stale.disconnect(); } catch { /* ignore */ }
      }

      const { server_url, participant_token } = await tokenPromise;

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

      const onRoomTracksChanged = () => {
        syncAudioFromRoom();
      };
      room.on(RoomEvent.TrackPublished, onRoomTracksChanged);
      room.on(RoomEvent.TrackUnpublished, onRoomTracksChanged);
      room.on(RoomEvent.TrackSubscribed, onRoomTracksChanged);
      room.on(RoomEvent.TrackUnsubscribed, onRoomTracksChanged);
      room.on(RoomEvent.LocalTrackPublished, onRoomTracksChanged);
      room.on(RoomEvent.LocalTrackUnpublished, onRoomTracksChanged);
      room.on(RoomEvent.ParticipantConnected, onRoomTracksChanged);
      room.on(RoomEvent.ParticipantDisconnected, onRoomTracksChanged);

      // Track agent speaking state via active speakers
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const agentSpeaking = speakers.some((s) => s.sid !== room.localParticipant.sid);
        if (agentSpeaking) {
          store.setPhase("speaking");
        } else if (useVoiceSessionStore.getState().phase === "speaking") {
          store.setPhase("listening");
        }
      });

      // Reconnect resilience on brief network drops
      room.on(RoomEvent.Reconnecting, () => store.setPhase("connecting"));
      room.on(RoomEvent.Reconnected, () => {
        store.setPhase("listening");
        syncAudioFromRoom();
      });

      room.on(RoomEvent.Disconnected, async () => {
        if (stoppedByUser.current) return;
        const { transcript } = useVoiceSessionStore.getState();
        if (transcript) {
          try {
            await appendMessage({ role: "user", text: transcript.user, threadId: MAIN_THREAD_ID });
            await appendMessage({ role: "assistant", text: transcript.agent, threadId: MAIN_THREAD_ID });
          } catch {
            // best-effort save
          }
        }
        setAudioTracks({});
        roomRef.current = null;
        store.reset();
      });

      await room.connect(server_url, participant_token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      syncAudioFromRoom();
      store.setPhase("listening");
    } catch (err) {
      if (__DEV__) {
        console.warn("[VoiceSession] startOnline failed, falling back to offline STT:", err);
      }
      roomRef.current = null;
      setAudioTracks({});
      await startOffline();
    }
  }, [input.farmerId, input.language, input.conversationId, store, startOffline, syncAudioFromRoom]);

  const start = useCallback(async () => {
    // Allow restart from error state
    if (store.phase === "error") store.reset();
    if (store.phase !== "idle") return;
    // Invalidate any in-flight stop() so it won't reset this new session
    stopGenRef.current += 1;
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
    const myGen = ++stopGenRef.current;
    setStopping(true);
    stoppedByUser.current = true;
    setAudioTracks({});
    const room = roomRef.current;
    if (room) {
      const { transcript } = useVoiceSessionStore.getState();
      if (transcript) {
        try {
          await appendMessage({ role: "user", text: transcript.user, threadId: MAIN_THREAD_ID });
          await appendMessage({ role: "assistant", text: transcript.agent, threadId: MAIN_THREAD_ID });
        } catch {
          // best-effort save
        }
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
    // Only reset if no newer session was started while we were awaiting
    if (stopGenRef.current === myGen) {
      store.reset();
      stoppedByUser.current = false;
    }
    setStopping(false);
  }, [store, voice.stopListening, voice.cancelSpeech]);

  const toggleSpeaker = useCallback(async () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      const lk = loadLiveKit();
      if (!lk) return;
      const { AudioSession, AndroidAudioTypePresets } = lk.livekitRN;
      await AudioSession.configureAudio({
        android: {
          preferredOutputList: next ? ["speaker", "earpiece"] : ["earpiece", "speaker"],
          audioTypeOptions: AndroidAudioTypePresets.media,
        },
        ios: { defaultOutput: next ? "speaker" : "earpiece" },
      });
      await AudioSession.startAudioSession();
    } catch {
      // ignore — web or mock env
    }
  }, [speakerOn]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    const nextMuted = !useVoiceSessionStore.getState().muted;
    store.setMuted(nextMuted);
    if (room) {
      try {
        await room.localParticipant.setMicrophoneEnabled(!nextMuted);
        syncAudioFromRoom();
      } catch {
        // ignore — may not be connected yet
      }
    }
  }, [store, syncAudioFromRoom]);

  return {
    phase: store.phase,
    agentJoined: store.agentJoined,
    muted: store.muted,
    speakerOn,
    audioTracks,
    start,
    stop,
    toggleMute,
    toggleSpeaker,
    stopping,
  };
}
