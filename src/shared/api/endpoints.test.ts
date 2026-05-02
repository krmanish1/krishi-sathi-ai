import {
  deleteFarmerConversation,
  getConversationHistory,
  getFarmerWeather,
  postQuery,
  postSyncPush,
} from "./endpoints";

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

describe("getConversationHistory", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("GETs encoded path and connectivity query", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [] }),
    } as Response);
    global.fetch = fetchMock;

    await getConversationHistory("farmer-1", "conv-uuid", "online");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/farmer/farmer-1/conversations/conv-uuid/history?connectivity=online",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });
});

describe("deleteFarmerConversation", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("DELETEs encoded path and connectivity query", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    } as Response);
    global.fetch = fetchMock;

    await deleteFarmerConversation("farmer-1", "conv-uuid", "online");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/farmer/farmer-1/conversations/conv-uuid?connectivity=online",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });
});

describe("getFarmerWeather", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("GETs encoded farmer id with connectivity and force_refresh=false by default", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    } as Response);
    global.fetch = fetchMock;

    await getFarmerWeather("farmer-1", "online");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/weather/farmer-1?connectivity=online&force_refresh=false",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
  });

  it("sends force_refresh=true when opts.forceRefresh is true", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    } as Response);
    global.fetch = fetchMock;

    await getFarmerWeather("f-2", "offline", { forceRefresh: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/weather/f-2?connectivity=offline&force_refresh=true",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("encodes special characters in farmer id", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    } as Response);
    global.fetch = fetchMock;

    await getFarmerWeather("a/b", "online");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/weather/a%2Fb?connectivity=online&force_refresh=false",
      expect.anything(),
    );
  });

  it("maps degraded connectivity to online query param", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({}),
    } as Response);
    global.fetch = fetchMock;

    await getFarmerWeather("x", "degraded");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("connectivity=online"),
      expect.anything(),
    );
  });
});
