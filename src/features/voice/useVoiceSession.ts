import { useCallback, useRef, useEffect, useState } from "react";
import { Platform } from "react-native";
import type { RemoteAudioTrack } from "livekit-client";
import { useConnectivity } from "@/shared/network";
import { useVoice, speak as speakText } from "@/shared/voice";
import {
  setLiveKitSpeakerRoute,
  startLiveKitVoiceAudio,
  stopLiveKitVoiceAudio,
} from "@/shared/voice/liveKitVoiceAudio";
import { ApiError, askAgent, postVoiceToken } from "@/shared/api";
import { appendMessage, MAIN_THREAD_ID } from "@/features/chat";
import type { Language } from "@/shared/config/constants";
import {
  consumeLiveKitTranscriptionStream,
  collectLocalAudioTrackIds,
  LIVEKIT_TRANSCRIPTION_TOPIC,
  type LiveKitTranscriptSegmentUpdate,
  type TranscriptionRoleContext,
} from "./liveKitTranscriptionStream";
import { parseVoiceDataMessage } from "./parseVoiceDataMessage";
import { parseVoiceTranscriptionSegments } from "./parseVoiceTranscription";
import { useVoiceSessionStore } from "./useVoiceSessionStore";

export type VoiceSessionInput = {
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  conversationId?: string;
};

export type VoiceSessionAudioTracks = {
  localMic?: import("livekit-client").LocalAudioTrack;
  remoteAgent?: RemoteAudioTrack;
};

function applySegmentUpdate(update: LiveKitTranscriptSegmentUpdate): void {
  const store = useVoiceSessionStore.getState();
  store.applyLiveKitTranscript({
    segmentId: update.segmentId,
    role: update.role,
    text: update.text,
    final: update.final,
  });
  if (update.role === "agent") {
    store.setPhase("speaking");
  } else if (store.phase !== "speaking") {
    store.setPhase("listening");
  }
}

function applyTranscriptUpdate(
  patch: { user?: string; agent?: string },
): void {
  const store = useVoiceSessionStore.getState();
  store.patchTranscript(patch);
  if (patch.agent) {
    store.setPhase("speaking");
  } else if (patch.user && store.phase !== "speaking") {
    store.setPhase("listening");
  }
}

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

export function useVoiceSession(input: VoiceSessionInput) {
  const connectivity = useConnectivity();
  const store = useVoiceSessionStore();
  const roomRef = useRef<import("livekit-client").Room | null>(null);
  const connectionAbortRef = useRef<AbortController | null>(null);
  // True while stop() is executing — prevents Disconnected handler from double-resetting
  const stoppedByUser = useRef(false);
  const transcriptionViaTextStreamRef = useRef(false);
  const stopGenRef = useRef(0);
  const [stopping, setStopping] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const volumeRetryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncAudioFromRoom = useCallback(() => {
    const r = roomRef.current;
    const lk = loadLiveKit();
    if (!r || !lk) {
      return;
    }
    const { Track } = lk.livekitClient;
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
    if (remoteAgent !== undefined) {
      try {
        remoteAgent.setVolume(1.0);
      } catch {
        // ignore
      }
      // Found the track — stop retrying
      if (volumeRetryRef.current) {
        clearInterval(volumeRetryRef.current);
        volumeRetryRef.current = null;
      }
    }
    store.setAgentJoined(r.remoteParticipants.size > 0);
  }, [store]);

  // Cleanup room on unmount
  useEffect(() => {
    return () => {
      if (volumeRetryRef.current) {
        clearInterval(volumeRetryRef.current);
        volumeRetryRef.current = null;
      }
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
      store.setInterimUserText("");
      store.setInterimAgentText("");
      store.setPhase("speaking");
      try {
        const response = await askAgent(
          {
            text,
            language: input.language,
            intent: "general",
            onToken: (token) => store.setInterimAgentText(token),
          },
          {
            farmerId: input.farmerId,
            conversationId: input.conversationId ?? MAIN_THREAD_ID,
            location: { state: input.state, district: input.district },
            connectivity,
            deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
          },
        );
        store.setInterimAgentText("");
        store.patchTranscript({ user: text });
        store.appendAgentMessage(response.text);
        // Restart STT immediately — no await on TTS
        if (!stoppedByUser.current) {
          store.setPhase("listening");
          startOfflineRef.current?.().catch(() => store.setError("voice.error.unavailable"));
        }
        // Fire-and-forget TTS + SQLite persistence
        speakText(response.text, input.language).then(() => {
          if (!stoppedByUser.current) {
            appendMessage({ role: "user", text, threadId: MAIN_THREAD_ID }).catch(() => {});
            appendMessage({ role: "assistant", text: response.text, threadId: MAIN_THREAD_ID }).catch(() => {});
          }
        });
      } catch {
        store.setError("voice.error.unavailable");
        if (!stoppedByUser.current) {
          store.setPhase("listening");
          startOfflineRef.current?.().catch(() => store.setError("voice.error.unavailable"));
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.farmerId, input.language, input.state, input.district, input.conversationId, connectivity],
  );

  const voice = useVoice({
    onSpeechResult: handleSpeechResult,
    onSpeechInterim: useCallback((text: string) => {
      store.setInterimUserText(text);
    }, [store]),
  });

  const startOffline = useCallback(async () => {
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

      const tokenPromise = postVoiceToken({
        farmer_id: input.farmerId,
        ...(input.conversationId ? { conversation_id: input.conversationId } : {}),
        participant_identity: input.farmerId,
        language: input.language,
      });

      // Voice-call audio mode + token in parallel — mic ready sooner before connect.
      const [, tokenResult] = await Promise.all([
        startLiveKitVoiceAudio(livekitRN, { speakerFirst: true }),
        tokenPromise,
      ]);

      // Disconnect any stale room before creating a new one.
      // removeAllListeners() first — prevents stale room's WebSocket error
      // from becoming an unhandled promise rejection after disconnect.
      if (roomRef.current) {
        const stale = roomRef.current;
        roomRef.current = null;
        stale.removeAllListeners();
        try { stale.disconnect(); } catch { /* ignore */ }
      }

      const { server_url, participant_token } = tokenResult;

      const room = new LKRoom({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      roomRef.current = room;

      const onDataPayload = (payload: Uint8Array) => {
        if (!guard()) return;
        if (transcriptionViaTextStreamRef.current) return;
        const parsed = parseVoiceDataMessage(payload);
        if (!parsed) {
          if (__DEV__) {
            try {
              const raw = new TextDecoder().decode(payload);
              if (raw.trim()) console.log("[VoiceSession] Unhandled data:", raw.slice(0, 200));
            } catch {
              // ignore
            }
          }
          return;
        }
        applyTranscriptUpdate(parsed.patch);
      };

      room.on(RoomEvent.DataReceived, onDataPayload);

      const buildRoleContext = (
        participantIdentity: string,
      ): TranscriptionRoleContext => ({
        localIdentity: room.localParticipant.identity || input.farmerId,
        localAudioTrackIds: collectLocalAudioTrackIds(
          room.localParticipant.audioTrackPublications.values(),
        ),
        participantIdentity,
      });

      transcriptionViaTextStreamRef.current = false;
      if (typeof room.registerTextStreamHandler === "function") {
        room.registerTextStreamHandler(LIVEKIT_TRANSCRIPTION_TOPIC, (reader, participantInfo) => {
          if (!guard()) return;
          const roleCtx = buildRoleContext(participantInfo.identity);
          void consumeLiveKitTranscriptionStream(
            reader,
            roleCtx,
            (update) => {
              if (!guard()) return;
              transcriptionViaTextStreamRef.current = true;
              applySegmentUpdate(update);
            },
          ).catch((err) => {
            if (__DEV__) {
              console.warn("[VoiceSession] lk.transcription stream error:", err);
            }
          });
        });
      }

      if (RoomEvent.TranscriptionReceived != null) {
        room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
          if (!guard()) return;
          if (transcriptionViaTextStreamRef.current) return;
          const isLocal =
            participant?.identity === room.localParticipant.identity ||
            participant?.sid === room.localParticipant.sid;
          const parsed = parseVoiceTranscriptionSegments(
            segments as { id?: string; text?: string; final?: boolean }[],
            isLocal,
          );
          for (const seg of parsed) {
            applySegmentUpdate({
              segmentId: seg.segmentId,
              role: seg.role,
              text: seg.text,
              final: seg.final,
            });
          }
        });
      }

      const guard = () => roomRef.current === room;

      const onRoomTracksChanged = () => {
        if (!guard()) return;
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
        if (!guard()) return;
        const agentSpeaking = speakers.some((s) => s.sid !== room.localParticipant.sid);
        if (agentSpeaking) {
          store.setPhase("speaking");
        } else if (useVoiceSessionStore.getState().phase === "speaking") {
          store.setPhase("listening");
        }
      });

      // Reconnect resilience on brief network drops
      room.on(RoomEvent.Reconnecting, () => {
        if (!guard()) return;
        store.setPhase("connecting");
      });
      room.on(RoomEvent.Reconnected, () => {
        if (!guard()) return;
        store.setPhase("listening");
        syncAudioFromRoom();
      });

      room.on(RoomEvent.Disconnected, async () => {
        if (stoppedByUser.current) return;
        if (guard()) roomRef.current = null;
        store.setPhase("error");
        store.setError("voice.error.unavailable");
      });

      // prepareConnection is an optimization — if it fails (e.g. region DNS issue),
      // the SDK internally retries other regions. Don't let a failure here block connect().
      if (typeof room.prepareConnection === "function") {
        connectionAbortRef.current = new AbortController();
        try {
          await room.prepareConnection(server_url, participant_token);
        } catch (prepareErr) {
          if (__DEV__) {
            console.warn("[VoiceSession] prepareConnection failed, will retry via connect():", prepareErr);
          }
        }
      }

      await room.connect(server_url, participant_token, { autoSubscribe: true });
      await room.localParticipant.setMicrophoneEnabled(true);
      syncAudioFromRoom();
      // Keep retrying volume until the remote agent track is subscribed
      // (tracks can arrive late, especially on slow networks)
      volumeRetryRef.current = setInterval(() => syncAudioFromRoom(), 800);
      store.setPhase("listening");
    } catch (err) {
      roomRef.current = null;
      const liveKitMissing =
        err instanceof Error &&
        err.message.includes("LiveKit native module not available");
      if (liveKitMissing) {
        if (__DEV__) {
          console.warn("[VoiceSession] LiveKit unavailable, falling back to offline STT:", err);
        }
        await startOffline();
        return;
      }
      if (__DEV__) {
        console.warn("[VoiceSession] startOnline failed:", err);
      }
      if (err instanceof ApiError && (err.code === "LLM_TIMEOUT" || err.status === 0)) {
        store.setError("voice.error.serverWaking");
        return;
      }
      store.setError("voice.error.unavailable");
    }
  }, [input.farmerId, input.language, input.conversationId, store, startOffline, syncAudioFromRoom]);

  const start = useCallback(async () => {
    // Allow restart from error state
    if (store.phase === "error") store.reset();
    if (store.phase !== "idle") return;
    stoppedByUser.current = false;
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
    // Abort any pending prepareConnection
    connectionAbortRef.current?.abort();
    connectionAbortRef.current = null;
    // Stop volume retry
    if (volumeRetryRef.current) {
      clearInterval(volumeRetryRef.current);
      volumeRetryRef.current = null;
    }
    const room = roomRef.current;
    if (room) {
      if (typeof room.unregisterTextStreamHandler === "function") {
        try {
          room.unregisterTextStreamHandler(LIVEKIT_TRANSCRIPTION_TOPIC);
        } catch {
          // ignore
        }
      }
      transcriptionViaTextStreamRef.current = false;
      const { transcriptMessages } = useVoiceSessionStore.getState();
      if (transcriptMessages.length > 0) {
        try {
          for (const msg of transcriptMessages) {
            if (!msg.text.trim()) continue;
            await appendMessage({
              role: msg.role === "user" ? "user" : "assistant",
              text: msg.text,
              threadId: MAIN_THREAD_ID,
            });
          }
        } catch {
          // best-effort save
        }
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(false);
      } catch {
        // ignore
      }
      room.removeAllListeners();
      room.disconnect();
      try {
        const lk = loadLiveKit();
        if (lk) await stopLiveKitVoiceAudio(lk.livekitRN);
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
    }
    setStopping(false);
  }, [store, voice.stopListening, voice.cancelSpeech]);

  const toggleSpeaker = useCallback(async () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    try {
      const lk = loadLiveKit();
      if (!lk) return;
      await setLiveKitSpeakerRoute(lk.livekitRN, next);
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
    start,
    stop,
    toggleMute,
    toggleSpeaker,
    stopping,
  };
}
