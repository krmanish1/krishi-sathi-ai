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

/** Backend uses irrigated / rainfed (see OpenAPI examples). */
export function irrigationToApi(irrigationUi: boolean): "irrigated" | "rainfed" {
  return irrigationUi ? "irrigated" : "rainfed";
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
  const out: NonNullable<FarmerTwin["current_crops"]> = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({ name: item.trim(), area_acres: 0 });
      continue;
    }
    if (item && typeof item === "object" && "name" in item) {
      const x = item as { name?: unknown; area_acres?: unknown; sown_on?: unknown };
      if (typeof x.name !== "string" || !x.name.trim()) continue;
      const acres =
        typeof x.area_acres === "number" && Number.isFinite(x.area_acres) ? x.area_acres : 0;
      const row: { name: string; area_acres: number; sown_on?: string } = {
        name: x.name.trim(),
        area_acres: acres,
      };
      if (typeof x.sown_on === "string" && x.sown_on) row.sown_on = x.sown_on;
      out.push(row);
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

function irrigationForPutBody(ir?: string | null): "irrigated" | "rainfed" {
  const n = normalizeIrrigationFromApi(ir ?? undefined);
  if (n) return n;
  const v = ir?.toLowerCase() ?? "";
  if (v === "yes") return "irrigated";
  if (v === "no") return "rainfed";
  return "rainfed";
}

/**
 * Body shape aligned with backend PUT (string crop names, irrigation enum).
 */
export function serializeTwinForApi(twin: FarmerTwin): Record<string, unknown> {
  const current_crops =
    twin.current_crops?.map((c) => (typeof c === "string" ? c : c.name)).filter(Boolean) ?? [];

  const land =
    twin.land && Object.keys(twin.land).length > 0
      ? {
          ...(typeof twin.land.total_acres === "number" ? { total_acres: twin.land.total_acres } : {}),
          ...(twin.land.soil_type ? { soil_type: twin.land.soil_type } : {}),
          irrigation: irrigationForPutBody(twin.land.irrigation ?? undefined),
        }
      : undefined;

  const body: Record<string, unknown> = {
    farmer_id: twin.farmer_id,
    ...(twin.name !== undefined && twin.name !== null ? { name: twin.name } : {}),
    location: {
      state: twin.location.state,
      district: twin.location.district,
      ...(twin.location.village ? { village: twin.location.village } : {}),
      ...(typeof twin.location.lat === "number" ? { lat: twin.location.lat } : {}),
      ...(typeof twin.location.lng === "number" ? { lng: twin.location.lng } : {}),
    },
    ...(land && Object.keys(land).length ? { land } : {}),
    current_crops,
    ...(twin.financial ? { financial: twin.financial } : {}),
    ...(twin.risk_profile !== undefined ? { risk_profile: twin.risk_profile } : {}),
    ...(twin.preferred_language !== undefined && twin.preferred_language !== null
      ? { preferred_language: twin.preferred_language }
      : {}),
    ...(Array.isArray(twin.interaction_history) ? { interaction_history: twin.interaction_history } : {}),
    ...(twin.livestock?.length ? { livestock: twin.livestock } : {}),
  };

  return body;
}
