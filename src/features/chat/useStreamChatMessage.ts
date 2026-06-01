import { useCallback, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { isReasoningUIPart, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError } from "@/shared/api/errors";
import { isNetworkFetchError } from "@/shared/api/networkErrors";
import { askAgent, tripBackendCircuit } from "@/shared/api/routing";
import { createKrishiSathiChatTransport } from "@/shared/api/streamTransport";
import type { Connectivity } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";
import { appendMessage, listThreadMessages, MAIN_THREAD_ID } from "./chatMessagesRepo";
import { guessDeviceIntent } from "./guessDeviceIntent";
import { detectModelVariant, modelVariantToOnDeviceModelId } from "@/shared/ondevice";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import type { StageEvent } from "./thinkingStages";

export type BackendStage = "routing" | "planning" | "tools" | "synthesizing" | "clarify";
export type StreamPhase = BackendStage | "idle";

export type UseStreamChatMessageOpts = {
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  lat?: number;
  lng?: number;
  connectivity: Connectivity;
  /** Backend conversation UUID (from chatStore). Defaults to MAIN_THREAD_ID. */
  conversationId?: string;
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

/** AI SDK chain-of-thought / reasoning stream (`reasoning` UI parts). */
function extractReasoningText(message: UIMessage): string {
  return message.parts
    .filter(isReasoningUIPart)
    .map((p) => p.text)
    .join("");
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
      const d = p.data as Record<string, unknown>;
      const raw = d.stage;
      const stage = typeof raw === "string" ? raw : "";
      if (
        stage === "routing" ||
        stage === "planning" ||
        stage === "tools" ||
        stage === "synthesizing" ||
        stage === "clarify"
      ) {
        return stage as BackendStage;
      }
    }
  }
  return undefined;
}

export function useStreamChatMessage(opts: UseStreamChatMessageOpts) {
  const qc = useQueryClient();
  const [inFlight, setInFlight] = useState(false);
  /** Full `data` payload per `data-stage` SSE event (backend-controlled copy). */
  const [stageEvents, setStageEvents] = useState<StageEvent[]>([]);
  /** Mutable ref so the transport closure reads the current imageRef at request time. */
  const imageRefRef = useRef<string | undefined>(undefined);
  const getImageRef = useCallback(() => imageRefRef.current, []);
  /** Last user text sent via `send` — used for on-device fallback when stream fetch fails. */
  const lastSentTextRef = useRef("");

  const conversationId = opts.conversationId ?? MAIN_THREAD_ID;

  /**
   * `conversationId` IS part of chatId so AI SDK reinitialises its internal
   * message list whenever a new backend session is created. Without this, the SDK
   * keeps the old transport (built when conversationId was still "main") cached
   * under the same chatId, even after the transport prop changes.
   */
  const chatId = useMemo(
    () =>
      `krishi-stream-${opts.farmerId}-${conversationId}-${opts.connectivity}-${opts.language}-${opts.state}-${opts.district}-${opts.lat ?? ""}-${opts.lng ?? ""}`,
    [
      opts.farmerId,
      conversationId,
      opts.connectivity,
      opts.language,
      opts.state,
      opts.district,
      opts.lat,
      opts.lng,
    ],
  );

  /* eslint-disable react-hooks/refs */
  const transport = useMemo(
    () =>
      createKrishiSathiChatTransport({
        farmerId: opts.farmerId,
        conversationId,
        language: opts.language,
        state: opts.state,
        district: opts.district,
        ...(opts.lat !== undefined ? { lat: opts.lat } : {}),
        ...(opts.lng !== undefined ? { lng: opts.lng } : {}),
        connectivity: opts.connectivity,
        // imageRef is read from the ref at request time — not captured at construction.
        getImageRef,
        guessIntent: guessDeviceIntent,
      }),
    [
      opts.farmerId,
      conversationId,
      opts.language,
      opts.state,
      opts.district,
      opts.lat,
      opts.lng,
      opts.connectivity,
      getImageRef,
    ],
  );
  /* eslint-enable react-hooks/refs */

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
    // Accept custom `data-*` parts emitted by the backend stream.
    // Without this, AI SDK can ignore or drop unknown data parts.
    dataPartSchemas: useMemo(
      () => ({
        // Accept any JSON object from `data-stage` so titles/descriptions/tools come from the server.
        stage: z.record(z.string(), z.unknown()),
        metadata: z.unknown(),
      }),
      [],
    ),
    onFinish: ({ message, isAbort, isError }) => {
      imageRefRef.current = undefined;
      setInFlight(false);
      if (isAbort || isError) return;
      void (async () => {
        const text = extractAssistantText(message).trim();
        if (!text) return;
        const meta = extractMetadata(message);
        const source: "backend" | "ondevice" =
          meta?.data_source === "live" ? "backend" : "ondevice";
        await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
        await appendMessage({
          role: "assistant",
          text,
          source,
          confidence: meta?.confidence_score ?? null,
          threadId: conversationId,
        });
        const next = await listThreadMessages(conversationId);
        qc.setQueryData(CHAT_THREAD_QUERY_KEY(conversationId), next);
      })();
    },
    onError: (err) => {
      imageRefRef.current = undefined;
      setInFlight(false);
      void (async () => {
        const text = lastSentTextRef.current.trim();
        if (text && isNetworkFetchError(err)) {
          tripBackendCircuit();
          try {
            const intent = guessDeviceIntent(text);
            const imageRef = getImageRef();
            const ondeviceModel = modelVariantToOnDeviceModelId(await detectModelVariant());
            const r = await askAgent(
              {
                text,
                language: opts.language,
                intent,
                ...(imageRef !== undefined ? { imageRef } : {}),
              },
              {
                farmerId: opts.farmerId,
                conversationId,
                location: {
                  state: opts.state,
                  district: opts.district,
                  ...(opts.lat !== undefined ? { lat: opts.lat } : {}),
                  ...(opts.lng !== undefined ? { lng: opts.lng } : {}),
                },
                connectivity: opts.connectivity,
                deviceCapabilities: { ondeviceModel },
              },
            );
            await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
            await appendMessage({
              role: "assistant",
              text: r.text,
              source: r.source,
              confidence: r.confidence,
              threadId: conversationId,
            });
            const next = await listThreadMessages(conversationId);
            qc.setQueryData(CHAT_THREAD_QUERY_KEY(conversationId), next);
            return;
          } catch {
            /* fall through to generic error message */
          }
        }
        await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
        await appendMessage({
          role: "assistant",
          text: mapErr(err),
          source: "ondevice",
          confidence: null,
          threadId: conversationId,
        });
        const next = await listThreadMessages(conversationId);
        qc.setQueryData(CHAT_THREAD_QUERY_KEY(conversationId), next);
      })();
    },
    onData: (part) => {
      if (part.type !== "data-stage") return;
      const data = part.data;
      if (data == null || typeof data !== "object" || Array.isArray(data)) return;
      setStageEvents((prev) => [...prev, { data: data as Record<string, unknown> }]);
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
  const streamingReasoning = lastAssistant ? extractReasoningText(lastAssistant) : "";

  const send = useCallback(
    async (
      text: string,
      streamOpts?: { skipUserMessage?: boolean; imageRef?: string; imageLocalUri?: string },
    ) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      lastSentTextRef.current = trimmed;
      imageRefRef.current = streamOpts?.imageRef;
      setStageEvents([]);
      if (!streamOpts?.skipUserMessage) {
        // Same pattern as offline `useSendChatMessage`: cancel in-flight thread reads so a stale
        // refetch cannot resolve after `appendMessage` and overwrite the cache with [].
        await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(conversationId) });
        await appendMessage({
          role: "user",
          text: trimmed,
          threadId: conversationId,
          ...(streamOpts?.imageLocalUri ? { imageLocalUri: streamOpts.imageLocalUri } : {}),
        });
        const next = await listThreadMessages(conversationId);
        qc.setQueryData(CHAT_THREAD_QUERY_KEY(conversationId), next);
      }
      setInFlight(true);
      await sendMessage({ text: trimmed });
    },
    [qc, sendMessage, conversationId],
  );

  return {
    send,
    streamingText,
    streamingReasoning,
    streamPhase,
    stageEvents,
    isStreaming,
    streamError: error,
    status,
  };
}
