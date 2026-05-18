import { Platform } from "react-native";

const mockEnable = jest.fn();
const mockDisable = jest.fn();

jest.mock("@/modules/voice-audio/src", () => ({
  enableAndroidVoiceMode: (...args: unknown[]) => mockEnable(...args),
  disableAndroidVoiceMode: (...args: unknown[]) => mockDisable(...args),
}));

const mockConfigureAudio = jest.fn().mockResolvedValue(undefined);
const mockStartAudioSession = jest.fn().mockResolvedValue(undefined);
const mockStopAudioSession = jest.fn().mockResolvedValue(undefined);
const mockSetDefaultRemoteAudioTrackVolume = jest.fn().mockResolvedValue(undefined);
const mockSetAppleAudioConfiguration = jest.fn().mockResolvedValue(undefined);

const livekitRN = {
  AudioSession: {
    configureAudio: mockConfigureAudio,
    startAudioSession: mockStartAudioSession,
    stopAudioSession: mockStopAudioSession,
    setDefaultRemoteAudioTrackVolume: mockSetDefaultRemoteAudioTrackVolume,
    setAppleAudioConfiguration: mockSetAppleAudioConfiguration,
  },
  AndroidAudioTypePresets: {
    communication: { audioMode: "inCommunication" },
    media: { audioMode: "normal" },
  },
  getDefaultAppleAudioConfigurationForMode: jest.fn(() => ({ audioCategory: "playAndRecord" })),
};

import {
  setLiveKitSpeakerRoute,
  startLiveKitVoiceAudio,
  stopLiveKitVoiceAudio,
} from "@/shared/voice/liveKitVoiceAudio";

describe("liveKitVoiceAudio", () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = "android";
  });

  afterEach(() => {
    Platform.OS = originalOs;
  });

  it("enables native voice mode and LiveKit communication preset before session start", async () => {
    await startLiveKitVoiceAudio(livekitRN as never);

    expect(mockEnable).toHaveBeenCalled();
    expect(mockConfigureAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          audioTypeOptions: expect.objectContaining({
            audioMode: "inCommunication",
            audioStreamType: "music",
            audioAttributesUsageType: "media",
          }),
        }),
      }),
    );
    expect(mockStartAudioSession).toHaveBeenCalled();
    expect(mockSetDefaultRemoteAudioTrackVolume).toHaveBeenCalledWith(1.0);
  });

  it("stops LiveKit session and disables native voice mode on Android", async () => {
    await stopLiveKitVoiceAudio(livekitRN as never);

    expect(mockStopAudioSession).toHaveBeenCalled();
    expect(mockDisable).toHaveBeenCalled();
  });

  it("skips native voice mode on iOS", async () => {
    Platform.OS = "ios";
    await startLiveKitVoiceAudio(livekitRN as never, { speakerFirst: false });

    expect(mockEnable).not.toHaveBeenCalled();
    expect(mockConfigureAudio).toHaveBeenCalledWith(
      expect.objectContaining({ ios: { defaultOutput: "earpiece" } }),
    );
    expect(mockSetDefaultRemoteAudioTrackVolume).toHaveBeenCalledWith(1.0);
  });

  it("setLiveKitSpeakerRoute reconfigures output without starting session", async () => {
    await setLiveKitSpeakerRoute(livekitRN as never, false);
    expect(mockConfigureAudio).toHaveBeenCalled();
    expect(mockStartAudioSession).not.toHaveBeenCalled();
    expect(mockEnable).not.toHaveBeenCalled();
  });
});
