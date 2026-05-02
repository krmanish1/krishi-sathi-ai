import { postQuery, postSyncPush } from "./endpoints";

jest.mock("@/shared/config/env", () => ({ getApiBaseUrl: () => "http://test" }));

describe("postSyncPush", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("POSTs without body and sends Bearer when token is set", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    } as Response);
    global.fetch = fetchMock;

    await postSyncPush("tok");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/sync/push",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer tok",
        }),
      }),
    );
  });

  it("POSTs without Authorization when token is absent", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "",
    } as Response);
    global.fetch = fetchMock;

    await postSyncPush(null);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.headers).toEqual(
      expect.objectContaining({
        Accept: "application/json",
      }),
    );
    expect(JSON.stringify(init?.headers)).not.toContain("Authorization");
  });
});

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
      conversation_id: "main",
      query: { text: "hi", voice_b64: "", image_ref: null, language: "en" },
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
