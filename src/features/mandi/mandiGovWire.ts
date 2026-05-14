import type { MandiPriceRow } from "./mandiFromBundle";

const readString = (o: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return null;
};

const readNumber = (o: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.-]/g, "");
      const parsed = Number(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

/** Extract state names from legacy data.gov.in-style directory rows (tests / future use). */
export function stateNameFromDirectoryRow(u: unknown): string | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const direct = readString(o, [
    "State_Name",
    "state_name",
    "STATE_NAME",
    "State_UT_Name",
    "state_ut_name",
    "state",
    "stname",
    "STNAME",
  ]);
  if (direct) return direct;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== "string" || !v.trim()) continue;
    const lk = k.toLowerCase();
    if (lk.includes("state") && !lk.includes("district")) return v.trim();
  }
  return null;
}

/** Extract district names from legacy data.gov.in-style directory rows (tests / future use). */
export function districtNameFromDirectoryRow(u: unknown): string | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const direct = readString(o, [
    "District_Name",
    "district_name",
    "DISTRICT_NAME",
    "District",
    "district",
    "District_Name_In_English",
    "dtname",
    "DTNAME",
  ]);
  if (direct) return direct;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v !== "string" || !v.trim()) continue;
    const lk = k.toLowerCase();
    if (lk.includes("district") || lk === "dtname") return v.trim();
  }
  return null;
}

/**
 * Map an eNAM / alternate mandi trade row (data.gov.in resource 5d623a19…) into UI row shape.
 * Field ids vary by dataset version — try common spellings.
 */
export function mandiRowFromEnamRecord(u: unknown, i: number): MandiPriceRow | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const label =
    readString(o, ["commodity", "Commodity", "commodity_name", "Crop_Name", "crop_name"]) ??
    `Item ${i + 1}`;
  const modal = readNumber(o, ["modal_price", "Modal_Price", "modal_price_rs", "price", "Price"]);
  const min = readNumber(o, ["min_price", "Min_Price", "min_price_rs"]);
  const max = readNumber(o, ["max_price", "Max_Price", "max_price_rs"]);
  const price =
    modal != null ? `₹${modal.toLocaleString("en-IN")}` : typeof o.price === "string" ? o.price : "—";
  const place =
    readString(o, [
      "market",
      "Market",
      "apmc_name",
      "APMC_Name",
      "mandi",
      "Mandi",
      "market_name",
      "Market_Name",
    ]) ?? "—";
  let changeLabel = "—";
  if (min != null && max != null && min !== max) {
    changeLabel = `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
  }
  return { label, price, place, changeLabel, up: null };
}

export function mandiRowsFromEnamRecords(records: unknown[]): MandiPriceRow[] {
  const out: MandiPriceRow[] = [];
  let j = 0;
  for (const r of records) {
    const row = mandiRowFromEnamRecord(r, j);
    if (row) {
      out.push(row);
      j += 1;
    }
  }
  return out;
}
