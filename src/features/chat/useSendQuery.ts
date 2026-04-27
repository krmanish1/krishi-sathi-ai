import { useMutation, useQueryClient } from "@tanstack/react-query";
import { askAgent } from "@/shared/api/routing";
import { ApiError } from "@/shared/api/errors";
import type { Language } from "@/shared/config/constants";
import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import type { Connectivity } from "@/shared/api/types";
import { appendMessage, MAIN_THREAD_ID } from "./chatMessagesRepo";
import { CHAT_THREAD_QUERY_KEY } from "./useChatThread";
import { guessDeviceIntent } from "./guessDeviceIntent";

export type SendQueryInput = {
  text: string;
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  connectivity: Connectivity;
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
    mutationFn: async (p: SendQueryInput) => {
      const text = p.text.trim();
      const intent = guessDeviceIntent(text);
      if (!p.skipUserMessage) {
        await appendMessage({ role: "user", text });
      }
      try {
        const r = await askAgent(
          { text, language: p.language, intent },
          {
            farmerId: p.farmerId,
            location: { state: p.state, district: p.district },
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
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: CHAT_THREAD_QUERY_KEY(MAIN_THREAD_ID) });
    },
  });
}

export { CONFIDENCE_THRESHOLD_LOW };
