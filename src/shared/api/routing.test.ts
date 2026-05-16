import { askAgent, extractTextContent } from "./routing";
import { setGemmaBackend } from "@/shared/ondevice/gemma";
import type { AgentContext } from "./routing";
import { postQuery } from "./endpoints";
import { ApiError } from "./errors";
import { setModelReady, resetModelState, setPreferOffline } from "@/shared/ondevice/modelState";

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
  conversationId: "main",
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

  it("online + any intent → backend", async () => {
    for (const intent of ["general", "weather", "crop_plan", "alert", "crop_disease"] as const) {
      (postQuery as jest.Mock).mockClear();
      const r = await askAgent({ text: "x", language: "en", intent }, baseCtx);
      expect(r.source).toBe("backend");
    }
    expect(ondevice).not.toHaveBeenCalled();
  });

  it("USE_ONDEVICE fallback with low confidence → canEscalate true when online", async () => {
    (postQuery as jest.Mock).mockRejectedValueOnce(
      new ApiError("UPSTREAM_UNAVAILABLE", 503, "x", true, undefined, "USE_ONDEVICE"),
    );
    ondevice.mockResolvedValueOnce({ text: "maybe", confidence: 0.5, modelUsed: "gemma-4-e4b-it" });
    const r = await askAgent({ text: "x", language: "en", intent: "general" }, baseCtx);
    expect(r.source).toBe("ondevice");
    expect(r.canEscalate).toBe(true);
  });
});

describe("extractTextContent", () => {
  it("passes through plain text unchanged", () => {
    expect(extractTextContent("Hello!")).toBe("Hello!");
  });

  it("extracts text blocks from Python repr list", () => {
    const raw = `[{'type': 'thinking', 'thinking': 'some thought'}, {'type': 'text', 'text': 'Namaste! How can I help?'}]`;
    expect(extractTextContent(raw)).toBe("Namaste! How can I help?");
  });

  it("joins multiple text blocks with double newline", () => {
    const raw = `[{'type': 'text', 'text': 'Part one.'}, {'type': 'text', 'text': 'Part two.'}]`;
    expect(extractTextContent(raw)).toBe("Part one.\n\nPart two.");
  });

  it("unescapes \\n in text", () => {
    const raw = `[{'type': 'text', 'text': 'Line one\\nLine two'}]`;
    expect(extractTextContent(raw)).toBe("Line one\nLine two");
  });

  it("returns raw string if no text blocks found", () => {
    const raw = `[{'type': 'thinking', 'thinking': 'hmm'}]`;
    expect(extractTextContent(raw)).toBe(raw);
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

describe("askAgent preferOffline routing", () => {
  beforeEach(() => {
    resetModelState();
    (postQuery as jest.Mock).mockClear();
    ondevice.mockClear();
  });

  afterEach(() => {
    resetModelState();
  });

  it("uses backend when online and preferOffline is false", async () => {
    setModelReady("/model/path");
    setPreferOffline(false);
    const result = await askAgent({ text: "hello", language: "en", intent: "general" }, baseCtx);
    expect(result.source).toBe("backend");
  });

  it("uses ondevice when online and preferOffline is true and model is ready", async () => {
    setModelReady("/model/path");
    setPreferOffline(true);
    const result = await askAgent({ text: "hello", language: "en", intent: "general" }, baseCtx);
    expect(result.source).toBe("ondevice");
    expect(ondevice).toHaveBeenCalled();
  });

  it("uses backend when preferOffline is true but model is NOT ready", async () => {
    setPreferOffline(true);
    // model not ready (resetModelState called in beforeEach)
    const result = await askAgent({ text: "hello", language: "en", intent: "general" }, baseCtx);
    expect(result.source).toBe("backend");
  });

  it("uses backend when preferOffline is true but forceBackend is set", async () => {
    setModelReady("/model/path");
    setPreferOffline(true);
    const result = await askAgent(
      { text: "hello", language: "en", intent: "general" },
      baseCtx,
      { forceBackend: true },
    );
    expect(result.source).toBe("backend");
  });
});
