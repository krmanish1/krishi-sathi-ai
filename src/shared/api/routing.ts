import type { Language } from "@/shared/config/constants";
import { queryConnectivityWire, type Connectivity, type DeviceIntent, type OnDeviceModel } from "./types";
import { ApiError } from "./errors";
import { postQuery } from "./endpoints";
import { isModelReady } from "@/shared/ondevice/modelState";
import { onDeviceAgent } from "@/shared/ondevice/onDeviceAgent";
import { offlineFallback } from "@/shared/ondevice/offlineFallback";
import { loadBundlePayload } from "@/shared/storage/bundle";

export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  imageBase64?: string;
  imageMimeType?: string;
  intent: DeviceIntent;
  signal?: AbortSignal;
};

export type AgentContext = {
  farmerId: string;
  /** Same id as local chat thread — sent as `conversation_id` on query APIs. */
  conversationId: string;
  location: { state: string; district: string; lat?: number; lng?: number };
  connectivity: Connectivity;
  deviceCapabilities: { ondeviceModel: OnDeviceModel };
  land?: number;
  hasAadhaar?: boolean;
};

export type AgentResponse = {
  text: string;
  structured?: unknown;
  confidence: number;
  source: "ondevice" | "backend";
  modelUsed: string;
  canEscalate: boolean;
  banner?: "network_busy" | "retry_later";
  toolTrace?: unknown[];
  dataSource?: "offline" | "live";
};

// Backend may return text as a Python repr list:
// "[{'type': 'thinking', ...}, {'type': 'text', 'text': 'actual reply'}]"
// Extract only the 'text'-type blocks. Text value may be single- or double-quoted
// (Python uses double quotes when the string contains apostrophes).
export function extractTextContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[{")) return raw;
  const unescape = (s: string) =>
    s
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"');
  const re = /'type':\s*'text'.*?'text':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/gs;
  const parts = [...trimmed.matchAll(re)].map((m) => unescape((m[1] ?? m[2]) ?? ""));
  return parts.length > 0 ? parts.join("\n\n") : raw;
}

const callBackend = async (q: AgentQuery, ctx: AgentContext): Promise<AgentResponse> => {
  const r = await postQuery(
    {
      farmer_id: ctx.farmerId,
      conversation_id: ctx.conversationId,
      query: {
        text: q.text,
        voice_b64: "",
        image_ref: q.imageRef ?? null,
        language: q.language,
      },
      context: {
        location: {
          state: ctx.location.state,
          district: ctx.location.district,
          ...(ctx.location.lat !== undefined ? { lat: ctx.location.lat } : {}),
          ...(ctx.location.lng !== undefined ? { lng: ctx.location.lng } : {}),
        },
        connectivity: queryConnectivityWire(ctx.connectivity),
        device_intent: q.intent,
        device_capabilities: { ondevice_model: ctx.deviceCapabilities.ondeviceModel },
      },
    },
    q.signal,
  );
  return {
    text: extractTextContent(r.text),
    structured: r.structured,
    confidence: r.confidence_score,
    source: "backend",
    modelUsed: r.model_used,
    canEscalate: false,
    dataSource: "live",
  };
};

export type AskAgentOptions = { forceBackend?: boolean };

export const askAgent = async (
  q: AgentQuery,
  ctx: AgentContext,
  opts?: AskAgentOptions,
): Promise<AgentResponse> => {
  if (ctx.connectivity === "offline") {
    if (!isModelReady()) {
      const bundle = await loadBundlePayload().catch(() => null);
      return offlineFallback(q, bundle ?? undefined);
    }
    return onDeviceAgent.run(
      q,
      {
        district: ctx.location.district,
        state: ctx.location.state,
        ...(ctx.land !== undefined ? { land: ctx.land } : {}),
        ...(ctx.hasAadhaar !== undefined ? { hasAadhaar: ctx.hasAadhaar } : {}),
      },
      q.signal,
    );
  }

  // Online or degraded: backend first, fall back to on-device on USE_ONDEVICE hint
  try {
    return await callBackend(q, ctx);
  } catch (e) {
    if (e instanceof ApiError && e.fallbackHint === "USE_ONDEVICE") {
      if (!isModelReady()) {
        const bundle = await loadBundlePayload().catch(() => null);
        return { ...offlineFallback(q, bundle ?? undefined), banner: "network_busy" };
      }
      const result = await onDeviceAgent.run(
        q,
        {
          district: ctx.location.district,
          state: ctx.location.state,
          ...(ctx.land !== undefined ? { land: ctx.land } : {}),
          ...(ctx.hasAadhaar !== undefined ? { hasAadhaar: ctx.hasAadhaar } : {}),
        },
        q.signal,
      );
      return { ...result, banner: "network_busy" };
    }
    throw e;
  }
};
