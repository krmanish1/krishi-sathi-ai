/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react-native";
import { useVoiceSession } from "@/features/voice/useVoiceSession";
import { useVoiceSessionStore } from "@/features/voice/useVoiceSessionStore";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/shared/network", () => ({
  useConnectivity: jest.fn(() => "online" as const),
  useApiConnectivity: jest.fn(() => "online" as const),
}));

const mockStartListening = jest.fn().mockResolvedValue(undefined);
const mockStopListening = jest.fn().mockResolvedValue(undefined);
const mockSpeakFn = jest.fn().mockResolvedValue(undefined);
const mockCancelSpeech = jest.fn();
let capturedSpeechResult: ((text: string) => Promise<void>) | undefined;

jest.mock("@/shared/voice", () => ({
  useVoice: jest.fn((opts: { onSpeechResult?: (t: string) => Promise<void> }) => {
    capturedSpeechResult = opts?.onSpeechResult;
    return {
      startListening: mockStartListening,
      stopListening: mockStopListening,
      speak: mockSpeakFn,
      cancelSpeech: mockCancelSpeech,
      listening: false,
      speaking: false,
    };
  }),
  speak: jest.fn().mockResolvedValue(undefined),
  cancelSpeech: jest.fn(),
}));

const mockPostVoiceToken = jest.fn().mockResolvedValue({
  server_url: "wss://lk.test",
  participant_token: "tok",
  room_name: "r1",
  participant_identity: "farmer1",
});
const mockAskAgent = jest.fn().mockResolvedValue({
  text: "agent response",
  confidence: 0.9,
  source: "ondevice",
  canEscalate: false,
  dataSource: "live",
});
const mockAppendMessage = jest.fn().mockResolvedValue({});

jest.mock("@/shared/api", () => ({
  postVoiceToken: (...args: unknown[]) => mockPostVoiceToken(...args),
  askAgent: (...args: unknown[]) => mockAskAgent(...args),
}));

jest.mock("@/features/chat", () => ({
  appendMessage: (...args: unknown[]) => mockAppendMessage(...args),
  MAIN_THREAD_ID: "main",
}));

const mockRoomDisconnect = jest.fn();
const mockSetMicEnabled = jest.fn().mockResolvedValue(undefined);
const mockRoomConnect = jest.fn().mockResolvedValue(undefined);
const mockRoomOn = jest.fn();

const mockRegisterTextStreamHandler = jest.fn();
const mockUnregisterTextStreamHandler = jest.fn();

jest.mock("livekit-client", () => ({
  Room: jest.fn().mockImplementation(() => ({
    connect: mockRoomConnect,
    disconnect: mockRoomDisconnect,
    on: mockRoomOn,
    removeAllListeners: jest.fn(),
    registerTextStreamHandler: mockRegisterTextStreamHandler,
    unregisterTextStreamHandler: mockUnregisterTextStreamHandler,
    remoteParticipants: new Map(),
    localParticipant: {
      identity: "farmer1",
      setMicrophoneEnabled: mockSetMicEnabled,
      getTrackPublication: jest.fn(() => null),
    },
  })),
  RoomEvent: {
    DataReceived: "dataReceived",
    TranscriptionReceived: "transcriptionReceived",
    Disconnected: "disconnected",
    TrackPublished: "trackPublished",
    TrackUnpublished: "trackUnpublished",
    TrackSubscribed: "trackSubscribed",
    TrackUnsubscribed: "trackUnsubscribed",
    LocalTrackPublished: "localTrackPublished",
    LocalTrackUnpublished: "localTrackUnpublished",
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    ActiveSpeakersChanged: "activeSpeakersChanged",
    Reconnecting: "reconnecting",
    Reconnected: "reconnected",
  },
  Track: {
    Source: { Microphone: "microphone" },
    Kind: { Audio: "audio", Video: "video" },
  },
}));

jest.mock("@livekit/react-native", () => ({
  AudioSession: {
    configureAudio: jest.fn().mockResolvedValue(undefined),
    startAudioSession: jest.fn().mockResolvedValue(undefined),
    stopAudioSession: jest.fn().mockResolvedValue(undefined),
    setDefaultRemoteAudioTrackVolume: jest.fn().mockResolvedValue(undefined),
    setAppleAudioConfiguration: jest.fn().mockResolvedValue(undefined),
  },
  AndroidAudioTypePresets: {
    communication: { audioMode: "inCommunication" },
    media: { audioMode: "normal" },
  },
  getDefaultAppleAudioConfigurationForMode: jest.fn(() => ({ audioCategory: "playAndRecord" })),
}));

const mockStartLiveKitVoiceAudio = jest.fn().mockResolvedValue(undefined);
const mockStopLiveKitVoiceAudio = jest.fn().mockResolvedValue(undefined);

const mockSetLiveKitSpeakerRoute = jest.fn().mockResolvedValue(undefined);

jest.mock("@/shared/voice/liveKitVoiceAudio", () => ({
  startLiveKitVoiceAudio: (...args: unknown[]) => mockStartLiveKitVoiceAudio(...args),
  stopLiveKitVoiceAudio: (...args: unknown[]) => mockStopLiveKitVoiceAudio(...args),
  setLiveKitSpeakerRoute: (...args: unknown[]) => mockSetLiveKitSpeakerRoute(...args),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const INPUT = {
  farmerId: "farmer1",
  language: "hi" as const,
  state: "Punjab",
  district: "Ludhiana",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("useVoiceSession — online path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceSessionStore.getState().reset();
    const { useApiConnectivity } = require("@/shared/network") as {
      useApiConnectivity: jest.Mock;
    };
    useApiConnectivity.mockReturnValue("online");
  });

  it("starts idle", () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    expect(result.current.phase).toBe("idle");
  });

  it("start() fetches token and connects LiveKit room", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    expect(mockPostVoiceToken).toHaveBeenCalledWith(
      expect.objectContaining({ farmer_id: "farmer1", language: "hi" }),
    );
    expect(mockStartLiveKitVoiceAudio).toHaveBeenCalled();
    expect(mockRoomConnect).toHaveBeenCalledWith("wss://lk.test", "tok", expect.any(Object));
    const audioOrder = mockStartLiveKitVoiceAudio.mock.invocationCallOrder[0];
    const connectOrder = mockRoomConnect.mock.invocationCallOrder[0];
    expect(audioOrder).toBeDefined();
    expect(connectOrder).toBeDefined();
    expect(audioOrder!).toBeLessThan(connectOrder!);
    expect(mockSetMicEnabled).toHaveBeenCalledWith(true);
    expect(mockRegisterTextStreamHandler).toHaveBeenCalledWith(
      "lk.transcription",
      expect.any(Function),
    );
    expect(result.current.phase).toBe("listening");
  });

  it("stop() disconnects room and saves transcript", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    // Simulate a transcript being set
    act(() => {
      const store = useVoiceSessionStore.getState();
      store.patchTranscript({ user: "question" });
      store.patchTranscript({ agent: "answer" });
    });
    await act(async () => {
      await result.current.stop();
    });
    expect(mockRoomDisconnect).toHaveBeenCalled();
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", text: "question" }),
    );
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", text: "answer" }),
    );
  });

  it("sets webUnsupported error on web platform", async () => {
    const Platform = require("react-native").Platform as { OS: string };
    const original = Platform.OS;
    Platform.OS = "web";
    try {
      const { result } = renderHook(() => useVoiceSession(INPUT));
      await act(async () => {
        await result.current.start();
      });
      expect(result.current.phase).toBe("error");
      expect(useVoiceSessionStore.getState().errorMessage).toBe("voice.error.webUnsupported");
      expect(mockPostVoiceToken).not.toHaveBeenCalled();
    } finally {
      Platform.OS = original;
    }
  });

  it("ignores second start() call when already active", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.start(); // second call — should no-op
    });
    expect(mockPostVoiceToken).toHaveBeenCalledTimes(1);
  });
});

describe("useVoiceSession — offline path", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceSessionStore.getState().reset();
    const { useApiConnectivity } = require("@/shared/network") as {
      useApiConnectivity: jest.Mock;
    };
    useApiConnectivity.mockReturnValue("offline");
  });

  it("start() uses local STT when offline", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    expect(mockPostVoiceToken).not.toHaveBeenCalled();
    expect(mockStartListening).toHaveBeenCalled();
    expect(result.current.phase).toBe("listening");
  });

  it("stop() calls stopListening and cancelSpeech when offline", async () => {
    const { result } = renderHook(() => useVoiceSession(INPUT));
    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.stop();
    });
    expect(mockStopListening).toHaveBeenCalled();
    expect(mockCancelSpeech).toHaveBeenCalled();
  });

  it("speech result triggers askAgent and speak and appendMessage", async () => {
    const { speak: mockSpeak } = require("@/shared/voice") as {
      speak: jest.Mock;
    };
    renderHook(() => useVoiceSession(INPUT));

    await act(async () => {
      await capturedSpeechResult?.("what is the weather");
    });

    expect(mockAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ text: "what is the weather", language: "hi" }),
      expect.objectContaining({ farmerId: "farmer1" }),
    );
    expect(mockSpeak).toHaveBeenCalledWith("agent response", "hi");
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user", text: "what is the weather" }),
    );
    expect(mockAppendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant", text: "agent response" }),
    );
  });
});
