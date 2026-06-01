import i18next from "i18next";
import { guessDeviceIntent } from "@/features/chat/guessDeviceIntent";
import type { AgentQuery, AgentResponse } from "@/shared/api/routing";
import type { SyncBundle } from "@/shared/api/types";
import { getModelPath, isModelReady } from "./modelState";
import { logOnDevice } from "./ondeviceLog";
import { toNativeFilesystemPath } from "./nativeModelPath";

export type OfflineFallbackReason = "not_downloaded" | "inference_failed" | "wrong_format";

const isLegacyWebTaskModelPath = (path: string): boolean => /-web\.task$/i.test(path.trim());

function schemesSummary(bundle?: SyncBundle): string {
  const schemes = bundle?.data?.schemes;
  if (!Array.isArray(schemes) || schemes.length === 0) return "";
  return schemes
    .slice(0, 3)
    .map((s: unknown) => {
      const row = s as Record<string, unknown>;
      return `• ${String(row.name ?? row.scheme_name ?? "Scheme")}: ${String(row.benefits ?? row.eligibility ?? "")}`.slice(0, 120);
    })
    .join("\n");
}

function mandiSummary(bundle?: SyncBundle, district?: string): string {
  const prices = bundle?.data?.mandi_prices;
  if (!Array.isArray(prices) || prices.length === 0) return "";
  const filtered = district
    ? prices.filter((p: unknown) => {
        const row = p as Record<string, unknown>;
        return String(row.district ?? "").toLowerCase().includes(district.toLowerCase());
      })
    : prices;
  return (filtered.length > 0 ? filtered : prices)
    .slice(0, 5)
    .map((p: unknown) => {
      const row = p as Record<string, unknown>;
      return `• ${String(row.crop ?? "")} @ ₹${String(row.price_inr ?? "")}/${String(row.unit ?? "q")} (${String(row.mandi ?? "")})`;
    })
    .join("\n");
}

function baseOfflineMessage(
  intent: ReturnType<typeof guessDeviceIntent>,
  reason?: OfflineFallbackReason,
): string {
  const path = getModelPath();
  if (reason === "wrong_format" || (path && isLegacyWebTaskModelPath(path))) {
    return i18next.t("offline.modelWrongFormat");
  }
  if (reason === "inference_failed" || isModelReady()) {
    return intent === "weather"
      ? i18next.t("offline.inferenceFailedWeather")
      : i18next.t("offline.inferenceFailed");
  }
  return intent === "weather"
    ? i18next.t("offline.modelNotDownloadedWeather")
    : i18next.t("offline.modelNotDownloaded");
}

export function offlineFallback(
  query: AgentQuery,
  bundle?: SyncBundle,
  opts?: { reason?: OfflineFallbackReason; error?: unknown },
): AgentResponse {
  const intent = guessDeviceIntent(query.text);
  const lead = baseOfflineMessage(intent, opts?.reason);
  logOnDevice("offline_fallback", {
    reason: opts?.reason ?? (isModelReady() ? "inference_failed" : "not_downloaded"),
    intent,
    modelReady: isModelReady(),
    path: getModelPath() ? toNativeFilesystemPath(getModelPath()) : null,
    error: opts?.error instanceof Error ? opts.error.message : opts?.error ? String(opts.error) : null,
  });
  let text = lead;

  switch (intent) {
    case "scheme_query": {
      const summary = schemesSummary(bundle);
      text = summary ? `${lead}\n\n${summary}` : lead;
      break;
    }
    case "market_price": {
      const summary = mandiSummary(bundle);
      text = summary ? `${lead}\n\n${summary}` : lead;
      break;
    }
    case "weather":
      text = lead;
      break;
    default:
      text = lead;
  }

  return {
    text,
    confidence: 0,
    source: "ondevice",
    modelUsed: "fallback",
    canEscalate: true,
  };
}
