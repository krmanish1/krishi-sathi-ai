import { Platform } from "react-native";
import { getApiBaseUrl } from "@/shared/config/env";
import { TIMEOUTS_MS } from "@/shared/config/constants";
import { apiFetch } from "./client";
import type {
  Connectivity,
  FarmerTwin,
  ImageUploadResponse,
  QueryRequest,
  QueryResponse,
  SyncBundle,
} from "./types";
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
        (result) => { URL.revokeObjectURL(objectUrl); result ? resolve(result) : reject(new Error("JPEG conversion failed")); },
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

export const getSyncBundle = (params: {
  state: string;
  district: string;
  bundleVersion?: string;
}) => {
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
  apiFetch<unknown>("/api/v1/sync/push", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.syncPush,
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(signal ? { signal } : {}),
  });
