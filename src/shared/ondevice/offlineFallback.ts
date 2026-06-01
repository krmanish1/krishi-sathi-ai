import i18next from "i18next";
import { guessDeviceIntent } from "@/features/chat/guessDeviceIntent";
import type { AgentQuery, AgentResponse } from "@/shared/api/routing";
import type { SyncBundle } from "@/shared/api/types";

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

export function offlineFallback(
  query: AgentQuery,
  bundle?: SyncBundle,
): AgentResponse {
  const intent = guessDeviceIntent(query.text);
  let text = "";

  switch (intent) {
    case "scheme_query": {
      const summary = schemesSummary(bundle);
      text = summary
        ? `${i18next.t("offline.modelNotDownloaded")}\n\n${summary}`
        : i18next.t("offline.modelNotDownloaded");
      break;
    }
    case "market_price": {
      const summary = mandiSummary(bundle);
      text = summary
        ? `${i18next.t("offline.modelNotDownloaded")}\n\n${summary}`
        : i18next.t("offline.modelNotDownloaded");
      break;
    }
    case "weather":
      text = i18next.t("offline.modelNotDownloadedWeather");
      break;
    default:
      text = i18next.t("offline.modelNotDownloaded");
  }

  return {
    text,
    confidence: 0,
    source: "ondevice",
    modelUsed: "fallback",
    canEscalate: true,
  };
}
