import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { askAgent } from "@/shared/api/routing";
import { ApiError } from "@/shared/api/errors";
import type { Language } from "@/shared/config/constants";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import type { Connectivity } from "@/shared/api/types";
import {
  appendMessage,
  listThreadMessages,
  updateMessageText,
  MAIN_THREAD_ID,
  type ChatMessageRow,
} from "./chatMessagesRepo";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import { guessDeviceIntent } from "./guessDeviceIntent";
import { randomUUID } from "@/shared/utils/uuid";
import { detectModelVariant, modelVariantToOnDeviceModelId } from "@/shared/ondevice";
import { logOnDevice } from "@/shared/ondevice/ondeviceLog";

export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  lat?: number;
  lng?: number;
  connectivity: Connectivity;
  imageRef?: string;
  imageLocalUri?: string;
  skipUserMessage?: boolean;
  forceBackend?: boolean;
  conversationId?: string;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
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

async function syncThreadCache(
  qc: ReturnType<typeof useQueryClient>,
  threadId: string,
): Promise<ChatMessageRow[]> {
  const next = await listThreadMessages(threadId);
  qc.setQueryData(CHAT_THREAD_QUERY_KEY(threadId), next);
  return next;
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["chat", "sendFull"] as const,
    mutationFn: async (p: SendQueryInput) => {
      const text = p.text.trim();
      const threadId = p.conversationId ?? MAIN_THREAD_ID;
      const intent = guessDeviceIntent(text);

      await qc.cancelQueries({ queryKey: CHAT_THREAD_QUERY_KEY(threadId) });

      if (!p.skipUserMessage) {
        await appendMessage({
          role: "user",
          text,
          threadId,
          ...(p.imageLocalUri ? { imageLocalUri: p.imageLocalUri } : {}),
        });
        await syncThreadCache(qc, threadId);
      }

      const assistantId = randomUUID();
      let draftReply = "";
      await appendMessage({
        id: assistantId,
        role: "assistant",
        text: i18next.t("chat.thinking") || "Thinking…",
        source: "ondevice",
        confidence: null,
        threadId,
      });
      await syncThreadCache(qc, threadId);

      const onToken = (token: string) => {
        draftReply += token;
        p.onToken?.(token);
        qc.setQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(threadId), (old) =>
          (old ?? []).map((m) =>
            m.id === assistantId ? { ...m, text: draftReply || m.text } : m,
          ),
        );
      };

      try {
        const ondeviceModel = modelVariantToOnDeviceModelId(await detectModelVariant());
        const r = await askAgent(
          {
            text,
            language: p.language,
            intent,
            ...(p.imageRef ? { imageRef: p.imageRef } : {}),
            ...(p.signal ? { signal: p.signal } : {}),
            onToken,
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
            deviceCapabilities: { ondeviceModel },
          },
          p.forceBackend ? { forceBackend: true } : undefined,
        );

        const replyText =
          (r.text ?? "").trim() ||
          draftReply.trim() ||
          i18next.t("offline.generationTimeout");

        logOnDevice("agent_reply", {
          source: r.source,
          textLength: replyText.length,
          preview: replyText.slice(0, 160),
        });

        await updateMessageText(assistantId, replyText);
        qc.setQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(threadId), (old) =>
          (old ?? []).map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: replyText,
                  source: r.source,
                  confidence: r.confidence ?? m.confidence,
                }
              : m,
          ),
        );
        return { response: { ...r, text: replyText }, intent, text };
      } catch (e) {
        const errText = mapErr(e);
        logOnDevice("agent_reply", {
          source: "ondevice",
          textLength: errText.length,
          preview: errText.slice(0, 160),
          error: true,
        });
        await updateMessageText(assistantId, errText);
        qc.setQueryData<ChatMessageRow[]>(CHAT_THREAD_QUERY_KEY(threadId), (old) =>
          (old ?? []).map((m) =>
            m.id === assistantId ? { ...m, text: errText, source: "ondevice" } : m,
          ),
        );
        await syncThreadCache(qc, threadId);
        throw e;
      }
    },
    onSettled: async (_data, err, variables) => {
      if (!err) return;
      const threadId = variables?.conversationId ?? MAIN_THREAD_ID;
      await syncThreadCache(qc, threadId);
    },
  });
}

export { CONFIDENCE_THRESHOLD_LOW };
