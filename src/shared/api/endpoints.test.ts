import { postQuery } from "./endpoints";

jest.mock("@/shared/config/env", () => ({ getApiBaseUrl: () => "http://test" }));

describe("postQuery", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("returns a typed QueryResponse", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          response_id: "r1",
          text: "hello f1",
          data_source: "live",
          confidence_level: "high",
          confidence_score: 0.9,
          model_used: "gemma-4-26b-a4b-it",
          tool_trace: [],
          safety_flags: [],
          fallback_hint: null,
          language: "en",
          timestamp: new Date().toISOString(),
        }),
    } as Response);

    const r = await postQuery({
      farmer_id: "f1",
      query: { text: "hi", image_ref: null, language: "en" },
      context: {
        location: { district: "Ludhiana", state: "Punjab" },
        connectivity: "online",
        device_intent: "general",
        device_capabilities: { ondevice_model: "gemma-4-e4b-it" },
      },
    });
    expect(r.text).toBe("hello f1");
  });
});
