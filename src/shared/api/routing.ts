import { CONFIDENCE_THRESHOLD_LOW } from "@/shared/config/constants";
import type { Language } from "@/shared/config/constants";
import { generate as gemmaGenerate } from "@/shared/ondevice/gemma";
import type { Connectivity, DeviceIntent, OnDeviceModel } from "./types";
import { ApiError } from "./errors";
import { postQuery } from "./endpoints";

const ONDEVICE_INTENTS: ReadonlySet<DeviceIntent> = new Set([
  "weather",
  "crop_plan",
  "general",
  "alert",
]);

export type AgentQuery = {
  text: string;
  language: Language;
  imageRef?: string;
  intent: DeviceIntent;
};

export type AgentContext = {
  farmerId: string;
  location: { state: string; district: string; lat?: number; lng?: number };
  connectivity: Connectivity;
  deviceCapabilities: { ondeviceModel: OnDeviceModel };
};

export type AgentResponse = {
  text: string;
  structured?: unknown;
  confidence: number;
  source: "ondevice" | "backend";
  modelUsed: string;
  canEscalate: boolean;
  banner?: "network_busy" | "retry_later";
};

const callOnDevice = async (
  q: AgentQuery,
  ctx: AgentContext,
  banner?: AgentResponse["banner"],
): Promise<AgentResponse> => {
  const r = await gemmaGenerate({ prompt: q.text, language: q.language, intent: q.intent });
  return {
    text: r.text,
    confidence: r.confidence,
    source: "ondevice",
    modelUsed: r.modelUsed,
    canEscalate: ctx.connectivity !== "offline" && r.confidence < CONFIDENCE_THRESHOLD_LOW,
    ...(banner ? { banner } : {}),
  };
};

const callBackend = async (q: AgentQuery, ctx: AgentContext): Promise<AgentResponse> => {
  const r = await postQuery({
    farmer_id: ctx.farmerId,
    query: {
      text: q.text,
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
      connectivity: ctx.connectivity,
      device_intent: q.intent,
      device_capabilities: { ondevice_model: ctx.deviceCapabilities.ondeviceModel },
    },
  });
  return {
    text: r.text,
    structured: r.structured,
    confidence: r.confidence_score,
    source: "backend",
    modelUsed: r.model_used,
    canEscalate: false,
  };
};

export type AskAgentOptions = { forceBackend?: boolean };

export const askAgent = async (
  q: AgentQuery,
  ctx: AgentContext,
  opts?: AskAgentOptions,
): Promise<AgentResponse> => {
  if (ctx.connectivity === "offline") {
    return callOnDevice(q, ctx);
  }
  if (opts?.forceBackend) {
    try {
      return await callBackend(q, ctx);
    } catch (e) {
      if (e instanceof ApiError && e.fallbackHint === "USE_ONDEVICE") {
        return callOnDevice(q, ctx, "network_busy");
      }
      throw e;
    }
  }
  if (ONDEVICE_INTENTS.has(q.intent)) {
    return callOnDevice(q, ctx);
  }
  try {
    return await callBackend(q, ctx);
  } catch (e) {
    if (e instanceof ApiError && e.fallbackHint === "USE_ONDEVICE") {
      return callOnDevice(q, ctx, "network_busy");
    }
    throw e;
  }
};
