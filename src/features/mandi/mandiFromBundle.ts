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

const readString = (o: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const readNumber = (o: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

function rowFromUnknown(u: unknown, i: number): MandiPriceRow {
  if (u && typeof u === "object") {
    const o = u as Record<string, unknown>;
    const label =
      readString(o, ["crop", "commodity", "commodity_name", "name", "item", "produce"]) ??
      `Item ${i + 1}`;
    const numericPrice = readNumber(o, [
      "price",
      "rate",
      "modal_price",
      "mandi_price",
      "price_per_quintal",
      "avg_price",
    ]);
    const rawPrice = o.price ?? o.rate ?? o.modal_price ?? o.mandi_price;
    const price =
      numericPrice != null
        ? `₹${numericPrice.toLocaleString("en-IN")}`
        : typeof rawPrice === "string" && rawPrice.trim().length > 0
          ? rawPrice
          : "—";
    const place =
      readString(o, ["mandi", "place", "market", "market_name", "mandi_name", "district"]) ?? "—";
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
