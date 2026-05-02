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
      // Cancel in-flight queries so the optimistic update isn't overwritten
      await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
      const prev = qc.getQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID));
      const optimistic: ChatMessageRow = {
        id: `opt-${randomUUID()}`,
        thread_id: MAIN_THREAD_ID,
        role: "user",
        text: p.text.trim(),
        source: null,
        confidence: null,
        created_at: Date.now(),
        ...(p.imageLocalUri ? { imageLocalUri: p.imageLocalUri } : {}),
      };
      qc.setQueryData<ChatMessageRow[]>(
        CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID),
        (old) => [...(old ?? []), optimistic],
      );
      return { prev };
    },
    mutationFn: async (p: SendQueryInput) => {
      const text = p.text.trim();
      const intent = guessDeviceIntent(text);
      if (!p.skipUserMessage) {
        await appendMessage({
          role: "user",
          text,
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
            conversationId: MAIN_THREAD_ID,
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
        });
        return { response: r, intent, text };
      } catch (e) {
        await appendMessage({
          role: "assistant",
          text: mapErr(e),
          source: "ondevice",
          confidence: null,
        });
        throw e;
      }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as { prev?: ChatMessageRow[] } | undefined;
      if (ctx?.prev !== undefined) {
        qc.setQueryData(CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID), ctx.prev);
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
    },
  });
}

export { CONFIDENCE_THRESHOLD_LOW };
