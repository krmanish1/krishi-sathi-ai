import { useMutation, useQueryClient } from "@tanstack/react-query";
import { askAgent } from "@/shared/api/routing";
import { ApiError } from "@/shared/api/errors";
import type { Language } from "@/shared/config/constants";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import type { Connectivity } from "@/shared/api/types";
import { appendMessage, MAIN_THREAD_ID, type ChatMessageRow } from "./chatMessagesRepo";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import { guessDeviceIntent } from "./guessDeviceIntent";
import { randomUUID } from "@/shared/utils/uuid";

export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  /** Onboarding / twin GPS; included in backend context when set. */
  lat?: number;
  lng?: number;
  connectivity: Connectivity;
  imageRef?: string;
  imageLocalUri?: string;
  /** Re-ask on server without writing another user row (e.g. low-confidence CTA). */
  skipUserMessage?: boolean;
  forceBackend?: boolean;
  /** Backend conversation UUID. Defaults to MAIN_THREAD_ID when not provided (offline path). */
  conversationId?: string;
};

const mapErr = (e: unknown): string => {
  if (e instanceof ApiError) {
    return e.message;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return "Something went wrong.";
};

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "sendFull"] as const,
    onMutate: async (p: SendQueryInput) => {
      if (p.skipUserMessage) return;
      const threadId = p.conversationId ?? MAIN_THREAD_ID;
      // Cancel in-flight queries so the optimistic update isn't overwritten
      await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(threadId) });
      const prev = qc.getQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(threadId));
      const optimistic: ChatMessageRow = {
        id: `opt-${randomUUID()}`,
        thread_id: threadId,
        role: "user",
        text: p.text.trim(),
        source: null,
        confidence: null,
        created_at: Date.now(),
        ...(p.imageLocalUri ? { imageLocalUri: p.imageLocalUri } : {}),
      };
      qc.setQueryData<ChatMessageRow[]>(
        CHAT_THREAD_QUERY_KEY(threadId),
        (old) => [...(old ?? []), optimistic],
      );
      return { prev, threadId };
    },
    mutationFn: async (p: SendQueryInput) => {
      const text = p.text.trim();
      const threadId = p.conversationId ?? MAIN_THREAD_ID;
      const intent = guessDeviceIntent(text);
      if (!p.skipUserMessage) {
        await appendMessage({
          role: "user",
          text,
          threadId,
          ...(p.imageLocalUri ? { imageLocalUri: p.imageLocalUri } : {}),
        });
      }
      try {
        const r = await askAgent(
          {
            text,
            language: p.language,
            intent,
            ...(p.imageRef ? { imageRef: p.imageRef } : {}),
          },
          {
            farmerId: p.farmerId,
            conversationId: threadId,
            location: {
              state: p.state,
              district: p.district,
              ...(p.lat !== undefined ? { lat: p.lat } : {}),
              ...(p.lng !== undefined ? { lng: p.lng } : {}),
            },
            connectivity: p.connectivity,
            deviceCapabilities: { ondeviceModel: "gemma-4-e4b-it" },
          },
          p.forceBackend ? { forceBackend: true } : undefined,
        );
        await appendMessage({
          role: "assistant",
          text: r.text,
          source: r.source,
          confidence: r.confidence,
          threadId,
        });
        return { response: r, intent, text };
      } catch (e) {
        await appendMessage({
          role: "assistant",
          text: mapErr(e),
          source: "ondevice",
          confidence: null,
          threadId,
        });
        throw e;
      }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { prev?: ChatMessageRow[]; threadId?: string } | undefined;
      const threadId = ctx?.threadId ?? MAIN_THREAD_ID;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(CHAT_THREAD_QUERY_KEY(threadId), ctx.prev);
      }
    },
    onSettled: async (_data, _err, variables) => {
      const threadId = variables?.conversationId ?? MAIN_THREAD_ID;
      await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(threadId) });
    },
  });
}

export { CONFIDENCE_THRESHOLD_LOW };
