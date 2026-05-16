import {
  deleteFarmerConversation,
  getConversationHistory,
  getFarmerWeather,
  postConversation,
  postQuery,
  postSyncPush,
} from "@/shared/api/endpoints";

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
    const fetchMock = jest.fn().mockResolvedValue({
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
    global.fetch = fetchMock;

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
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.body).toContain('"connectivity":"online"');
    expect(JSON.stringify(init?.headers)).not.toContain("X-Client-Connectivity");
  });
});

describe("postConversation", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
    jest.useRealTimers();
  });

  it("retries once on transient network failure", async () => {
    jest.useFakeTimers();
    const body = {
      conversation_id: "c1",
      farmer_id: "farmer-1",
      title: "Chat session",
      created_at: "",
      updated_at: "",
    };
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      } as Response);
    global.fetch = fetchMock;

    const p = postConversation({ farmerId: "farmer-1", title: "Chat session" }, "online");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(550);
    const r = await p;
    expect(r.conversation_id).toBe("c1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it("retries GET history once on transient network failure", async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ messages: [] }),
      } as Response);
    global.fetch = fetchMock;

    const p = getConversationHistory("farmer-1", "conv-uuid", "online");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(450);
    await expect(p).resolves.toEqual({ messages: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
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

describe("postVoiceToken", () => {
  const orig = global.fetch;

  afterEach(() => {
    global.fetch = orig;
  });

  it("POSTs to /api/v1/voice/token with farmer_id and language", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          server_url: "wss://example.livekit.cloud",
          participant_token: "tok123",
          room_name: "room-xyz",
          participant_identity: "farmer-f1",
        }),
    } as Response);
    global.fetch = fetchMock;

    const { postVoiceToken } = await import("@/shared/api/endpoints");
    const result = await postVoiceToken({ farmer_id: "f1", language: "hi" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://test/api/v1/voice/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.server_url).toBe("wss://example.livekit.cloud");
    expect(result.participant_token).toBe("tok123");
    expect(result.room_name).toBe("room-xyz");
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
      expect.stringMatching(/connectivity=online/),
      expect.anything(),
    );
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).not.toContain("client_connectivity");
  });
});
