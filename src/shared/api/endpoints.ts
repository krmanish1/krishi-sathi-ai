import { Platform } from "react-native";
import { getApiBaseUrl, getDataGovApiKey } from "@/shared/config/env";
import { TIMEOUTS_MS } from "@/shared/config/constants";
import { apiFetch } from "./client";
import { withTransientRetry } from "./withTransientRetry";
import type {
  Connectivity,
  Conversation,
  ConversationHistoryResponse,
  DataGovMandiResponse,
  DataGovRecordsEnvelope,
  FarmerTwin,
  FarmerWeatherReport,
  ImageUploadResponse,
  QueryRequest,
  QueryResponse,
  SyncBundle,
  VoiceTokenRequest,
  VoiceTokenResponse,
} from "./types";
import { queryConnectivityWire } from "./types";
import { normalizeTwinFromApi, serializeTwinForApi, twinTwinQueryString } from "./twinWire";

/** JSON POST `/api/v1/query` — body shape matches `/api/v1/query/stream` (`QueryRequest`). */
export const postQuery = (req: QueryRequest, signal?: AbortSignal) =>
  apiFetch<QueryResponse>("/api/v1/query", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
    method: "POST",
    body: req,
    ...(signal ? { signal } : {}),
  });

const toJpegBlob = (source: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(source);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (result) => {
          URL.revokeObjectURL(objectUrl);
          if (result) resolve(result);
          else reject(new Error("JPEG conversion failed"));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });

/** Multipart POST `/api/v1/query/image` — fields: `image`, `farmer_id`, `purpose` (per backend OpenAPI). */
export const postQueryImage = async (
  params: { uri: string; farmerId: string; purpose: "crop_disease" | "soil_photo" | "pest_id" },
  signal?: AbortSignal,
) => {
  const fd = new FormData();
  if (Platform.OS === "web") {
    // On web, fetch the blob: URI and convert to JPEG — server rejects webp/other formats
    const res = await fetch(params.uri);
    let blob = await res.blob();
    if (blob.type !== "image/jpeg" && blob.type !== "image/png") {
      blob = await toJpegBlob(blob);
    }
    fd.append("image", blob, "image.jpg");
  } else {
    // React Native FormData extension: {uri, type, name} is handled by RN's fetch
    fd.append("image", { uri: params.uri, type: "image/jpeg", name: "image.jpg" } as unknown as Blob);
  }
  fd.append("farmer_id", params.farmerId);
  fd.append("purpose", params.purpose);
  return apiFetch<ImageUploadResponse>("/api/v1/query/image", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.queryImage,
    method: "POST",
    body: fd,
    ...(signal ? { signal } : {}),
  });
};

export const getHealth = (signal?: AbortSignal) =>
  apiFetch<{ status: string; version: string }>("/api/v1/health", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.health,
    ...(signal ? { signal } : {}),
  });

export const getSyncBundle = (params: { state: string; district: string; bundleVersion?: string }) => {
  const q = new URLSearchParams({ state: params.state, district: params.district });
  if (params.bundleVersion) {
    q.set("bundle_version", params.bundleVersion);
  }
  return apiFetch<SyncBundle>(`/api/v1/sync/bundle?${q.toString()}`, {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.syncBundle,
    headers: { "Accept-Encoding": "gzip" },
  });
};

export const getFarmerTwin = async (farmerId: string, connectivity: Connectivity): Promise<FarmerTwin> => {
  const raw = await apiFetch<unknown>(
    `/api/v1/farmer/${encodeURIComponent(farmerId)}/twin${twinTwinQueryString(connectivity)}`,
    {
      baseUrl: getApiBaseUrl(),
      timeoutMs: TIMEOUTS_MS.query,
    },
  );
  return normalizeTwinFromApi(raw);
};

export const putFarmerTwin = async (
  farmerId: string,
  twin: FarmerTwin,
  connectivity: Connectivity,
  accessToken?: string | null,
): Promise<FarmerTwin> => {
  const raw = await apiFetch<unknown>(
    `/api/v1/farmer/${encodeURIComponent(farmerId)}/twin${twinTwinQueryString(connectivity)}`,
    {
      baseUrl: getApiBaseUrl(),
      timeoutMs: TIMEOUTS_MS.query,
      method: "PUT",
      body: serializeTwinForApi(twin),
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  );
  return normalizeTwinFromApi(raw);
};

/** POST `/api/v1/sync/push` — triggers server-side sync; empty body. Sends Bearer when session exists. */
export const postSyncPush = (accessToken?: string | null, signal?: AbortSignal) =>
  withTransientRetry(
    () =>
      apiFetch<unknown>("/api/v1/sync/push", {
        baseUrl: getApiBaseUrl(),
        timeoutMs: TIMEOUTS_MS.syncPush,
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        ...(signal ? { signal } : {}),
      }),
    /** HF Spaces / mobile radios often drop long POSTs; backoff keeps load off the cold proxy. */
    { attempts: 3, baseDelayMs: 1_200, ...(signal ? { signal } : {}) },
  );

/** POST `/api/v1/conversation` — creates a new conversation session for the farmer. */
export const postConversation = (
  params: { farmerId: string; title: string },
  connectivity: Connectivity,
  signal?: AbortSignal,
) =>
  withTransientRetry(
    () =>
      apiFetch<Conversation>(
        `/api/v1/conversation?connectivity=${queryConnectivityWire(connectivity)}`,
        {
          baseUrl: getApiBaseUrl(),
          timeoutMs: TIMEOUTS_MS.conversationCreate,
          method: "POST",
          body: { farmer_id: params.farmerId, title: params.title },
          ...(signal ? { signal } : {}),
        },
      ),
    { attempts: 3, baseDelayMs: 500, ...(signal ? { signal } : {}) },
  );

/** GET `/api/v1/farmer/{farmer_id}/conversations` — lists all conversations for a farmer. */
export const getFarmerConversations = (
  farmerId: string,
  connectivity: Connectivity,
  signal?: AbortSignal,
) =>
  apiFetch<Conversation[]>(
    `/api/v1/farmer/${encodeURIComponent(farmerId)}/conversations?connectivity=${queryConnectivityWire(connectivity)}`,
    {
      baseUrl: getApiBaseUrl(),
      timeoutMs: TIMEOUTS_MS.conversation,
      ...(signal ? { signal } : {}),
    },
  );

/** GET `/api/v1/farmer/{farmer_id}/conversations/{conversation_id}/history` — server-stored turns for that session. */
export const getConversationHistory = (
  farmerId: string,
  conversationId: string,
  connectivity: Connectivity,
  signal?: AbortSignal,
) =>
  withTransientRetry(
    () =>
      apiFetch<ConversationHistoryResponse>(
        `/api/v1/farmer/${encodeURIComponent(farmerId)}/conversations/${encodeURIComponent(conversationId)}/history?connectivity=${queryConnectivityWire(connectivity)}`,
        {
          baseUrl: getApiBaseUrl(),
          timeoutMs: TIMEOUTS_MS.conversationHistory,
          ...(signal ? { signal } : {}),
        },
      ),
    { attempts: 3, baseDelayMs: 400, ...(signal ? { signal } : {}) },
  );

/** DELETE `/api/v1/farmer/{farmer_id}/conversations/{conversation_id}` — removes session on server. */
export const deleteFarmerConversation = (
  farmerId: string,
  conversationId: string,
  connectivity: Connectivity,
  signal?: AbortSignal,
) =>
  apiFetch<unknown>(
    `/api/v1/farmer/${encodeURIComponent(farmerId)}/conversations/${encodeURIComponent(conversationId)}?connectivity=${queryConnectivityWire(connectivity)}`,
    {
      baseUrl: getApiBaseUrl(),
      timeoutMs: TIMEOUTS_MS.conversation,
      method: "DELETE",
      ...(signal ? { signal } : {}),
    },
  );

/** POST `/api/v1/voice/token` — get LiveKit room credentials for a voice session. */
export const postVoiceToken = (req: VoiceTokenRequest, signal?: AbortSignal) =>
  apiFetch<VoiceTokenResponse>("/api/v1/voice/token", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.voiceToken,
    method: "POST",
    body: req,
    ...(signal ? { signal } : {}),
  });

const DATA_GOV_MANDI_URL =
  "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";

/**
 * GET data.gov.in AGMARKNET mandi prices.
 * External API — uses its own base URL and `api-key` query param (not our backend).
 * Filters by state and/or district when provided.
 * Returns `null` when the API key is not configured (key missing from env).
 */
export const getMandiPricesFromGov = async (params: {
  state?: string;
  district?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<DataGovMandiResponse | null> => {
  const apiKey = getDataGovApiKey();
  if (!apiKey) return null;

  const q = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(params.limit ?? 100),
    offset: String(params.offset ?? 0),
  });
  // API requires lowercase values; state uses `.keyword` suffix, district does not
  if (params.state) q.set("filters[state.keyword]", params.state.toLowerCase());
  if (params.district) q.set("filters[district]", params.district.toLowerCase());

  const url = `${DATA_GOV_MANDI_URL}?${q.toString()}`;
  if (__DEV__) console.info(`[MandiAPI] → GET state=${params.state ?? "*"} district=${params.district ?? "*"}`);

  const res = await fetch(url, params.signal ? { signal: params.signal } : undefined);
  if (!res.ok) {
    if (__DEV__) console.warn(`[MandiAPI] ✗ ${res.status} ${res.statusText}`);
    throw new Error(`data.gov.in mandi API error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as DataGovMandiResponse;
  if (__DEV__) console.info(`[MandiAPI] ✓ total=${data.total} count=${data.count} state=${params.state ?? "*"} district=${params.district ?? "*"}`);
  return data;
};

const DATA_GOV_ENAM_TRADE_URL =
  "https://api.data.gov.in/resource/5d623a19-f2ca-4b1f-9e3e-24e340f86ef2";

/**
 * eNAM / alternate mandi trade data on data.gov.in (fallback when AGMARKNET has no rows).
 * Uses `filters[State]` and optional `filters[District]` per published API examples.
 */
export const getEnamMandiPricesFromGov = async (params: {
  state?: string;
  district?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}): Promise<DataGovRecordsEnvelope | null> => {
  const apiKey = getDataGovApiKey();
  if (!apiKey) return null;

  const q = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    limit: String(params.limit ?? 100),
    offset: String(params.offset ?? 0),
  });
  if (params.state) q.set("filters[State]", params.state);
  if (params.district) q.set("filters[District]", params.district);

  const url = `${DATA_GOV_ENAM_TRADE_URL}?${q.toString()}`;
  if (__DEV__) console.info(`[MandiENAM] → GET state=${params.state ?? "*"} district=${params.district ?? "*"}`);

  const res = await fetch(url, params.signal ? { signal: params.signal } : undefined);
  if (!res.ok) {
    if (__DEV__) console.warn(`[MandiENAM] ✗ ${res.status}`);
    throw new Error(`data.gov.in eNAM mandi error: ${res.status}`);
  }
  const data = (await res.json()) as DataGovRecordsEnvelope;
  if (__DEV__) console.info(`[MandiENAM] ✓ total=${data.total} count=${data.count}`);
  return data;
};

/** GET `/api/v1/weather/{farmer_id}` — farmer-scoped weather; `force_refresh=true` bypasses server cache. */
export const getFarmerWeather = (
  farmerId: string,
  connectivity: Connectivity,
  opts?: { forceRefresh?: boolean; signal?: AbortSignal },
) => {
  const q = new URLSearchParams({
    connectivity: queryConnectivityWire(connectivity),
    force_refresh: opts?.forceRefresh === true ? "true" : "false",
  });
  const path = `/api/v1/weather/${encodeURIComponent(farmerId)}?${q.toString()}`;
  return withTransientRetry(
    () =>
      apiFetch<FarmerWeatherReport>(path, {
        baseUrl: getApiBaseUrl(),
        timeoutMs: TIMEOUTS_MS.weather,
        ...(opts?.signal ? { signal: opts.signal } : {}),
      }),
    { attempts: 3, baseDelayMs: 400, ...(opts?.signal ? { signal: opts.signal } : {}) },
  );
};
