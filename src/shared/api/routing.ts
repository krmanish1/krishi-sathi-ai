import type { Language } from "@/shared/config/constants";
import { queryConnectivityWire, type Connectivity, type DeviceIntent, type OnDeviceModel } from "./types";
import { ApiError } from "./errors";
import { postQuery } from "./endpoints";
import { syncModelReadyFromDisk } from "@/shared/ondevice";
import { logOnDevice } from "@/shared/ondevice/ondeviceLog";
import { toNativeFilesystemPath } from "@/shared/ondevice/nativeModelPath";
import { getModelPath, isModelReady, getPreferOffline } from "@/shared/ondevice/modelState";
import { onDeviceAgent } from "@/shared/ondevice/onDeviceAgent";
import { offlineFallback } from "@/shared/ondevice/offlineFallback";
import { loadBundlePayload } from "@/shared/storage/bundle";
import { isNetworkFetchError } from "./networkErrors";

// Circuit breaker: after a network-level failure (UnknownHost / fetch failed),
// skip the backend for CIRCUIT_OPEN_MS to avoid repeated 10s DNS timeouts.
const CIRCUIT_OPEN_MS = 2 * 60 * 1000; // 2 minutes
let backendDownUntil = 0;

function isCircuitOpen(): boolean {
  return Date.now() < backendDownUntil;
}

/** Open circuit so subsequent queries skip backend DNS timeout. */
export function tripBackendCircuit(): void {
  backendDownUntil = Date.now() + CIRCUIT_OPEN_MS;
}

/** True while recent network failures mean the backend should not be polled. */
export function isBackendCircuitOpen(): boolean {
  return isCircuitOpen();
}

function resetCircuit(): void {
  backendDownUntil = 0;
}

/** Clears circuit after a successful backend response (e.g. health warm). */
export function resetBackendCircuit(): void {
  resetCircuit();
}

export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  imageBase64?: string;
  imageMimeType?: string;
  intent: DeviceIntent;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
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
    q.onToken,
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
  // "offline" = no network; "degraded" = WiFi up but internet not reachable.
  // Both cases go straight to on-device rather than timing out against the backend.
  if (ctx.connectivity === "offline" || ctx.connectivity === "degraded") {
    if (!isModelReady()) {
      await syncModelReadyFromDisk().catch(() => undefined);
    }
    logOnDevice("routing_offline", {
      connectivity: ctx.connectivity,
      modelReady: isModelReady(),
      path: getModelPath() ? toNativeFilesystemPath(getModelPath()) : null,
    });
    if (!isModelReady()) {
      const bundle = await loadBundlePayload().catch(() => null);
      return offlineFallback(q, bundle ?? undefined, { reason: "not_downloaded" });
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

  // Route to on-device when user has opted in and model is ready
  if (!opts?.forceBackend && isModelReady() && getPreferOffline()) {
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

  // Online: always try cloud first; fall back to on-device only after the request fails.
  try {
    const result = await callBackend(q, ctx);
    resetCircuit(); // successful response — backend reachable again
    return result;
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
    // Network unreachable (airplane mode / server down) but NetInfo still reports online.
    // Trip the circuit so subsequent queries skip the DNS timeout entirely.
    if (isNetworkFetchError(e)) {
      tripBackendCircuit();
      if (isModelReady()) {
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
      const bundle = await loadBundlePayload().catch(() => null);
      return { ...offlineFallback(q, bundle ?? undefined), banner: "network_busy" };
    }
    throw e;
  }
};
