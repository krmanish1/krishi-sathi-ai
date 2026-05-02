import type { Connectivity } from "@/shared/api/types";
import type { FarmerTwin } from "@/shared/api/types";

/** Query value expected by backend: `?connectivity=online|offline` */
export function twinConnectivityForQuery(c: Connectivity): "online" | "offline" {
  return c === "offline" ? "offline" : "online";
}

export function twinTwinQueryString(connectivity: Connectivity): string {
  const q = new URLSearchParams({
    connectivity: twinConnectivityForQuery(connectivity),
  });
  return `?${q.toString()}`;
}

/** Normalize API irrigation strings to canonical irrigated | rainfed for internal storage. */
export function normalizeIrrigationFromApi(raw?: string | null): "irrigated" | "rainfed" | undefined {
  if (raw == null || raw === "") return undefined;
  const v = raw.toLowerCase();
  if (["yes", "true", "irrigated", "y"].includes(v)) {
    return "irrigated";
  }
  if (["no", "false", "rainfed", "n"].includes(v)) return "rainfed";
  return undefined;
}

function normalizeCurrentCrops(raw: unknown): NonNullable<FarmerTwin["current_crops"]> {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const x = item as { name?: unknown };
      if (typeof x.name !== "string" || !x.name.trim()) continue;
      out.push(x.name.trim());
    }
  }
  return out;
}

function normalizeLand(raw: unknown): FarmerTwin["land"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const land: NonNullable<FarmerTwin["land"]> = {};
  if (typeof o.total_acres === "number" && Number.isFinite(o.total_acres)) {
    land.total_acres = o.total_acres;
  }
  if (typeof o.soil_type === "string") land.soil_type = o.soil_type;
  if (typeof o.irrigation === "string") {
    const canon = normalizeIrrigationFromApi(o.irrigation);
    land.irrigation = canon ?? o.irrigation;
  }
  return Object.keys(land).length ? land : undefined;
}

function normalizeLocation(raw: unknown): FarmerTwin["location"] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const state = typeof o.state === "string" ? o.state : "";
  const district = typeof o.district === "string" ? o.district : "";
  const loc: FarmerTwin["location"] = { state, district };
  if (typeof o.village === "string") loc.village = o.village;
  if (typeof o.lat === "number" && Number.isFinite(o.lat)) loc.lat = o.lat;
  if (typeof o.lng === "number" && Number.isFinite(o.lng)) loc.lng = o.lng;
  return loc;
}

/**
 * Maps GET JSON into our in-app FarmerTwin (handles string[] crops from backend).
 */
export function normalizeTwinFromApi(raw: unknown): FarmerTwin {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid twin response");
  }
  const o = raw as Record<string, unknown>;
  const farmer_id = typeof o.farmer_id === "string" ? o.farmer_id : "";
  const location =
    normalizeLocation(o.location) ??
    ({ state: "", district: "" } satisfies FarmerTwin["location"]);

  const landNorm = normalizeLand(o.land);
  const twin: FarmerTwin = {
    farmer_id,
    location,
    current_crops: normalizeCurrentCrops(o.current_crops),
  };

  if (typeof o.name === "string") twin.name = o.name;
  if (typeof o.preferred_language === "string") twin.preferred_language = o.preferred_language;
  if (landNorm) twin.land = landNorm;

  if (o.financial && typeof o.financial === "object") {
    twin.financial = o.financial as NonNullable<FarmerTwin["financial"]>;
  }
  if (typeof o.risk_profile === "string" || o.risk_profile === null) {
    twin.risk_profile = o.risk_profile as string | null;
  }
  if (Array.isArray(o.interaction_history)) {
    twin.interaction_history = o.interaction_history;
  }
  if (Array.isArray(o.livestock) && o.livestock.length > 0) {
    twin.livestock = o.livestock as NonNullable<FarmerTwin["livestock"]>;
  }

  return twin;
}

/**
 * PUT body aligned with backend twin schema.
 */
export function serializeTwinForApi(twin: FarmerTwin): Record<string, unknown> {
  const current_crops = (twin.current_crops ?? []).map((c) => c.trim()).filter(Boolean);

  const totalAcres =
    typeof twin.land?.total_acres === "number" && Number.isFinite(twin.land.total_acres)
      ? twin.land.total_acres
      : 0;
  const soilRaw = twin.land?.soil_type?.trim();
  const soil_type = soilRaw && soilRaw.length > 0 ? soilRaw : "loamy";

  return {
    farmer_id: twin.farmer_id,
    name: twin.name ?? "",
    location: {
      state: twin.location.state ?? "",
      district: twin.location.district ?? "",
      village: twin.location.village ?? "",
      lat:
        typeof twin.location.lat === "number" && Number.isFinite(twin.location.lat)
          ? twin.location.lat
          : 0,
      lng:
        typeof twin.location.lng === "number" && Number.isFinite(twin.location.lng)
          ? twin.location.lng
          : 0,
    },
    land: {
      total_acres: totalAcres,
      soil_type,
    },
    current_crops,
    preferred_language: twin.preferred_language ?? "en",
  };
}
