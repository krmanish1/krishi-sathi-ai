import { askAgent } from "./routing";
import { setGemmaBackend } from "@/shared/ondevice/gemma";
import type { AgentContext } from "./routing";
import { postQuery } from "./endpoints";
import { ApiError } from "./errors";

const ondevice = jest.fn().mockResolvedValue({
  text: "od",
  confidence: 0.9,
  modelUsed: "gemma-4-e4b-it",
});

beforeAll(() => {
  setGemmaBackend({ generate: ondevice });
});

jest.mock("./endpoints", () => ({
  postQuery: jest.fn().mockResolvedValue({
    response_id: "r",
    text: "be",
    data_source: "live",
    confidence_level: "high",
    confidence_score: 0.95,
    model_used: "gemma-4-26b-a4b-it",
    tool_trace: [],
    safety_flags: [],
    fallback_hint: null,
    language: "en",
    timestamp: "",
  }),
}));

const baseCtx: AgentContext = {
  farmerId: "f1",
  location: { state: "Punjab", district: "Ludhiana" },
  connectivity: "online",
  deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
};

beforeEach(() => {
  ondevice.mockClear();
  (postQuery as jest.Mock).mockClear();
  (postQuery as jest.Mock).mockResolvedValue({
    response_id: "r",
    text: "be",
    data_source: "live",
    confidence_level: "high",
    confidence_score: 0.95,
    model_used: "gemma-4-26b-a4b-it",
    tool_trace: [],
    safety_flags: [],
    fallback_hint: null,
    language: "en",
    timestamp: "",
  });
});

describe("askAgent routing", () => {
  it("offline → on-device", async () => {
    const r = await askAgent(
      { text: "x", language: "en", intent: "general" },
      { ...baseCtx, connectivity: "offline" },
    );
    expect(r.source).toBe("ondevice");
  });

  it("online + on-device intent → on-device", async () => {
    const r = await askAgent({ text: "x", language: "en", intent: "weather" }, baseCtx);
    expect(r.source).toBe("ondevice");
  });

  it("online + backend intent → backend", async () => {
    const r = await askAgent({ text: "x", language: "en", intent: "crop_disease" }, baseCtx);
    expect(r.source).toBe("backend");
    expect(r.text).toBe("be");
  });

  it("low on-device confidence online → canEscalate=true", async () => {
    ondevice.mockResolvedValueOnce({ text: "maybe", confidence: 0.5, modelUsed: "gemma-4-e4b-it" });
    const r = await askAgent({ text: "x", language: "en", intent: "general" }, baseCtx);
    expect(r.canEscalate).toBe(true);
  });

  it("forceBackend uses server even for on-device intents", async () => {
    ondevice.mockClear();
    const r = await askAgent({ text: "x", language: "en", intent: "weather" }, baseCtx, {
      forceBackend: true,
    });
    expect(r.source).toBe("backend");
    expect(ondevice).not.toHaveBeenCalled();
  });
});

describe("askAgent error fallback", () => {
  it("USE_ONDEVICE hint silently falls back to on-device with banner", async () => {
    (postQuery as jest.Mock).mockRejectedValueOnce(
      new ApiError("UPSTREAM_UNAVAILABLE", 503, "x", true, undefined, "USE_ONDEVICE"),
    );
    const r = await askAgent({ text: "x", language: "en", intent: "crop_disease" }, baseCtx);
    expect(r.source).toBe("ondevice");
    expect(r.banner).toBe("network_busy");
  });
});
