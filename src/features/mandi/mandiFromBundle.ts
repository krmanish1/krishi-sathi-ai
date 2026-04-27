import { useQuery } from "@tanstack/react-query";
import { loadBundlePayload } from "@/shared/storage/bundle";
import { useOnboarding } from "@/features/onboarding/store";

export const MANDI_QUERY_KEY = ["mandi", "bundle"] as const;

export type MandiPriceRow = {
  label: string;
  price: string;
  place: string;
  changeLabel: string;
  up: boolean | null;
};

function rowFromUnknown(u: unknown, i: number): MandiPriceRow {
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    const label =
      (typeof o.crop === "string" && o.crop) ||
      (typeof o.commodity === "string" && o.commodity) ||
      (typeof o.name === "string" && o.name) ||
      `Item ${i + 1}`;
    const priceRaw = o.price ?? o.rate;
    const price =
      typeof priceRaw === "number"
        ? `₹${priceRaw.toLocaleString("en-IN")}`
        : String(priceRaw ?? "—");
    const place =
      typeof o.mandi === "string" ? o.mandi : typeof o.place === "string" ? o.place : "—";
    const ch = o.change_pct ?? o.change;
    let up: boolean | null = null;
    let changeLabel = "—";
    if (typeof ch === "number") {
      up = ch >= 0;
      changeLabel = `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%`;
    } else if (typeof ch === "string") {
      changeLabel = ch;
    }
    return { label, price, place, changeLabel, up };
  }
  return { label: `Row ${i + 1}`, price: "—", place: "—", changeLabel: "—", up: null };
}

export function useMandiFromBundle() {
  const st = useOnboarding((s) => s.state);
  const dist = useOnboarding((s) => s.district);
  return useQuery({
    queryKey: MANDI_QUERY_KEY,
    queryFn: loadBundlePayload,
    select: (bundle) => {
      if (!bundle) {
        return { rows: [] as MandiPriceRow[], district: dist ?? "—", state: st ?? "—" };
      }
      const prices = bundle.data?.mandi_prices;
      if (!prices || !Array.isArray(prices)) {
        return { rows: [] as MandiPriceRow[], district: bundle.district, state: bundle.state };
      }
      return {
        rows: prices.map((u, i) => rowFromUnknown(u, i)),
        district: bundle.district,
        state: bundle.state,
      };
    },
  });
}
