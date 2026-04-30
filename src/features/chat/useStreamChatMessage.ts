import { useCallback, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { createKrishiSathiChatTransport } from "@/shared/api/streamTransport";
import type { Connectivity } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { appendMessage, MAIN_THREAD_ID } from "./chatMessagesRepo";
import { guessDeviceIntent } from "./guessDeviceIntent";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";

export type BackendStage = "routing" | "planning" | "tools" | "synthesizing" | "clarify";
export type StreamPhase = BackendStage | "idle";

export type UseStreamChatMessageOpts = {
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  connectivity: Connectivity;
  imageRef?: string;
};

function mapErr(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}

function extractAssistantText(message: UIMessage): string {
  const textPart = message.parts.find((p) => p.type === "text");
  if (textPart && "text" in textPart && typeof textPart.text === "string") {
    return textPart.text;
  }
  return "";
}

function extractMetadata(message: UIMessage): {
  data_source?: string;
  confidence_score?: number;
} | undefined {
  const part = message.parts.find((p) => p.type === "data-metadata");
  if (!part || !("data" in part) || part.data == null || typeof part.data !== "object") {
    return undefined;
  }
  return part.data as { data_source?: string; confidence_score?: number };
}

function extractLatestStage(message: UIMessage | undefined): BackendStage | undefined {
  if (!message) return undefined;
  for (let i = message.parts.length - 1; i >= 0; i--) {
    const p = message.parts[i];
    if (!p) continue;
    if (p.type === "data-stage" && "data" in p && p.data && typeof p.data === "object") {
      const stage = (p.data as { stage?: BackendStage }).stage;
      if (
        stage === "routing" ||
        stage === "planning" ||
        stage === "tools" ||
        stage === "synthesizing" ||
        stage === "clarify"
      ) {
        return stage;
      }
    }
  }
  return undefined;
}

export function useStreamChatMessage(opts: UseStreamChatMessageOpts) {
  const qc = useQueryClient();
  const [inFlight, setInFlight] = useState(false);
  const [stageHistory, setStageHistory] = useState<BackendStage[]>([]);

  const chatId = useMemo(
    () =>
      `krishi-stream-${opts.farmerId}-${opts.connectivity}-${opts.language}-${opts.state}-${opts.district}`,
    [opts.farmerId, opts.connectivity, opts.language, opts.state, opts.district],
  );

  const transport = useMemo(
    () =>
      createKrishiSathiChatTransport({
        farmerId: opts.farmerId,
        language: opts.language,
        state: opts.state,
        district: opts.district,
        connectivity: opts.connectivity,
        ...(opts.imageRef !== undefined ? { imageRef: opts.imageRef } : {}),
        guessIntent: guessDeviceIntent,
      }),
    [
      opts.farmerId,
      opts.language,
      opts.state,
      opts.district,
      opts.connectivity,
      opts.imageRef,
    ],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
    // Accept custom `data-*` parts emitted by the backend stream.
    // Without this, AI SDK can ignore or drop unknown data parts.
    dataPartSchemas: useMemo(
      () => ({
        stage: z.object({
          stage: z.enum(["routing", "planning", "tools", "synthesizing", "clarify"]),
        }),
        metadata: z.unknown(),
      }),
      [],
    ),
    onFinish: ({ message, isAbort, isError }) => {
      setInFlight(false);
      if (isAbort || isError) return;
      void (async () => {
        const text = extractAssistantText(message).trim();
        if (!text) return;
        const meta = extractMetadata(message);
        const source: "backend" | "ondevice" =
          meta?.data_source === "live" ? "backend" : "ondevice";
        await appendMessage({
          role: "assistant",
          text,
          source,
          confidence: meta?.confidence_score ?? null,
        });
        await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
      })();
    },
    onError: (err) => {
      setInFlight(false);
      void (async () => {
        await appendMessage({
          role: "assistant",
          text: mapErr(err),
          source: "ondevice",
          confidence: null,
        });
        await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
      })();
    },
    onData: (part) => {
      // Record stage progression so the UI can show "what's happening" even before tokens arrive.
      if (part.type === "data-stage") {
        const stage = (part.data as { stage?: BackendStage } | undefined)?.stage;
        if (
          stage === "routing" ||
          stage === "planning" ||
          stage === "tools" ||
          stage === "synthesizing" ||
          stage === "clarify"
        ) {
          setStageHistory((prev) => (prev[prev.length - 1] === stage ? prev : [...prev, stage]));
        }
      }
    },
  });

  const isStreaming = inFlight || status === "streaming" || status === "submitted";

  const lastAssistant = useMemo(() => {
    return [...messages].reverse().find((m) => m.role === "assistant");
  }, [messages]);

  const streamPhase: StreamPhase = isStreaming
    ? (extractLatestStage(lastAssistant) ?? "routing")
    : "idle";

  const streamingText = lastAssistant ? extractAssistantText(lastAssistant) : "";

  const send = useCallback(
    async (text: string, streamOpts?: { skipUserMessage?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStageHistory([]);
      if (!streamOpts?.skipUserMessage) {
        await appendMessage({ role: "user", text: trimmed });
        await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
      }
      setInFlight(true);
      await sendMessage({ text: trimmed });
    },
    [qc, sendMessage],
  );

  return {
    send,
    streamingText,
    streamPhase,
    stageHistory,
    isStreaming,
    streamError: error,
    status,
  };
}
