import { DefaultChatTransport, type UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { getApiBaseUrl } from "@/shared/config/env";
import type { Connectivity, DeviceIntent, OnDeviceModel, QueryRequest } from "@/shared/api/types";
import type { Language } from "@/shared/config/constants";

export type KrishiStreamTransportOpts = {
  farmerId: string;
  language: Language;
  state: string;
  district: string;
  connectivity: Connectivity;
  /** Optional uploaded image ref when backend supports streaming multimodal later */
  imageRef?: string;
  guessIntent: (text: string) => DeviceIntent;
  ondeviceModel?: OnDeviceModel;
};

function lastUserPlainText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  for (const part of lastUser.parts) {
    if (part.type === "text" && "text" in part && typeof part.text === "string") {
      return part.text;
    }
  }
  return "";
}

export function createKrishiSathiChatTransport(
  opts: KrishiStreamTransportOpts,
): DefaultChatTransport<UIMessage> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const api = `${base}/api/v1/query/stream`;

  return new DefaultChatTransport<UIMessage>({
    api,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    prepareSendMessagesRequest: ({ messages }) => {
      const text = lastUserPlainText(messages).trim();
      const intent = opts.guessIntent(text);
      const body: QueryRequest = {
        farmer_id: opts.farmerId,
        query: {
          text,
          voice_b64: "",
          image_ref: opts.imageRef ?? null,
          language: opts.language,
        },
        context: {
          location: {
            state: opts.state,
            district: opts.district,
          },
          connectivity: opts.connectivity,
          device_intent: intent,
          device_capabilities: {
            ondevice_model: opts.ondeviceModel ?? "gemma-4-e4b-it",
          },
        },
      };
      return { body };
    },
  });
}
