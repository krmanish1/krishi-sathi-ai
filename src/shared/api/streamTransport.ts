import type { UIMessage } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { KrishiCompatChatTransport } from "@/shared/api/krishiCompatChatTransport";
import { getApiBaseUrl } from "@/shared/config/env";
import {
  queryConnectivityWire,
  type Connectivity,
  type DeviceIntent,
  type OnDeviceModel,
  type QueryRequest,
} from "@/shared/api/types";
import { withFetchLane } from "@/shared/api/fetchLane";
import { wrapFetchWithApiLogging } from "@/shared/api/requestLog";
import type { Language } from "@/shared/config/constants";

export type KrishiStreamTransportOpts = {
  farmerId: string;
  conversationId: string;
  language: Language;
  state: string;
  district: string;
  lat?: number;
  lng?: number;
  connectivity: Connectivity;
  /** Returns the current image ref at request time (read from a mutable ref). */
  getImageRef?: () => string | undefined;
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
): KrishiCompatChatTransport<UIMessage> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const api = `${base}/api/v1/query/stream`;

  return new KrishiCompatChatTransport<UIMessage>({
    api,
    fetch: wrapFetchWithApiLogging(
      (input, init) =>
        withFetchLane(() => (expoFetch as unknown as typeof globalThis.fetch)(input, init)),
      "POST",
    ),
    prepareSendMessagesRequest: ({ messages }) => {
      const text = lastUserPlainText(messages).trim();
      const intent = opts.guessIntent(text);
      const body: QueryRequest = {
        farmer_id: opts.farmerId,
        conversation_id: opts.conversationId,
        query: {
          text,
          voice_b64: "",
          image_ref: opts.getImageRef?.() ?? null,
          language: opts.language,
        },
        context: {
          location: {
            state: opts.state,
            district: opts.district,
            ...(opts.lat !== undefined ? { lat: opts.lat } : {}),
            ...(opts.lng !== undefined ? { lng: opts.lng } : {}),
          },
          connectivity: queryConnectivityWire(opts.connectivity),
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
