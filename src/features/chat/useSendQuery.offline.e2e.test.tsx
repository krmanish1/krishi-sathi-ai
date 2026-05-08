import React, { useEffect } from "react";
import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import { useSendChatMessage } from "./useSendQuery";
import { clearThread, listThreadMessages, MAIN_THREAD_ID } from "./chatMessagesRepo";

// --- Mocks: keep the test offline, deterministic, and fast ---
jest.mock("@/shared/storage/db", () => {
  const state: { rows: any[] } = { rows: [] };

  const db = {
    async runAsync(sql: string, params: unknown[]) {
      if (sql.startsWith("DELETE FROM chat_messages WHERE thread_id")) {
        const threadId = String(params[0]);
        state.rows = state.rows.filter((r) => r.thread_id !== threadId);
        return;
      }
      if (sql.startsWith("DELETE FROM chat_messages")) {
        state.rows = [];
        return;
      }
      if (sql.startsWith("INSERT INTO chat_messages")) {
        const [id, thread_id, role, text, source, confidence, created_at, image_local_uri] = params as any[];
        state.rows.push({
          id,
          thread_id,
          role,
          text,
          source,
          confidence,
          created_at,
          image_local_uri,
          meta_json: null,
        });
        return;
      }
      throw new Error(`Unexpected SQL in test DB mock: ${sql}`);
    },
    async getAllAsync<T>(sql: string, params: unknown[]) {
      if (!sql.includes("FROM chat_messages WHERE thread_id")) {
        throw new Error(`Unexpected SELECT in test DB mock: ${sql}`);
      }
      const threadId = String(params[0]);
      const rows = state.rows
        .filter((r) => r.thread_id === threadId)
        .sort((a, b) => a.created_at - b.created_at)
        .map((r) => ({
          id: r.id,
          thread_id: r.thread_id,
          role: r.role,
          text: r.text,
          source: r.source,
          confidence: r.confidence,
          created_at: r.created_at,
          imageLocalUri: r.image_local_uri ?? undefined,
        }));
      return rows as unknown as T[];
    },
  };

  return { getDb: () => db };
});

jest.mock("@/shared/api/endpoints", () => ({
  postQuery: jest.fn(async () => {
    throw new Error("Backend must not be called in offline mode.");
  }),
}));

jest.mock("@/shared/ondevice/modelState", () => ({ isModelReady: () => true }));

const mockOnDeviceRun = jest.fn(async () => ({
  text: "Offline answer from small Gemma 4 model.",
  structured: undefined,
  confidence: 0.91,
  source: "ondevice" as const,
  modelUsed: "gemma-4-e4b-it",
  canEscalate: true,
  dataSource: "offline" as const,
}));

jest.mock("@/shared/ondevice/onDeviceAgent", () => ({
  onDeviceAgent: { run: (...args: unknown[]) => mockOnDeviceRun(...args) },
}));

function Harness(props: { onReady: () => void }) {
  const send = useSendChatMessage();
  useEffect(() => {
    void (async () => {
      await send.mutateAsync({
        text: "what is the weather tomorrow?",
        farmerId: "farmer-1",
        language: "en",
        state: "MH",
        district: "Pune",
        connectivity: "offline",
        conversationId: MAIN_THREAD_ID,
      });
      props.onReady();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Text testID="harness">ok</Text>;
}

describe("offline chat (integration)", () => {
  beforeEach(async () => {
    mockOnDeviceRun.mockClear();
    await clearThread(MAIN_THREAD_ID);
  });

  it("routes to on-device agent and persists messages (no backend)", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    let done = false;

    render(
      <QueryClientProvider client={qc}>
        <Harness onReady={() => { done = true; }} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(done).toBe(true));

    expect(mockOnDeviceRun).toHaveBeenCalledTimes(1);
    const [q, ctx] = mockOnDeviceRun.mock.calls[0] as [
      { text: string; language: string; intent: string },
      { district: string; state: string },
    ];
    expect(q.text).toContain("weather");
    expect(ctx).toEqual(expect.objectContaining({ district: "Pune", state: "MH" }));

    const rows = await listThreadMessages(MAIN_THREAD_ID);
    expect(rows.map((r) => r.role)).toEqual(["user", "assistant"]);
    expect(rows[1]?.source).toBe("ondevice");
    expect(rows[1]?.text).toContain("Offline answer");
  });
});

