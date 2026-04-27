import { getApiBaseUrl } from "@/shared/config/env";
import { TIMEOUTS_MS } from "@/shared/config/constants";
import { apiFetch } from "./client";
import type {
  FarmerTwin,
  ImageUploadResponse,
  QueryRequest,
  QueryResponse,
  SyncBundle,
} from "./types";

export const postQuery = (req: QueryRequest, signal?: AbortSignal) =>
  apiFetch<QueryResponse>("/api/v1/query", {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
    method: "POST",
    body: req,
    ...(signal ? { signal } : {}),
  });

export const postQueryImage = (
  params: { uri: string; farmerId: string; purpose: "crop_disease" | "soil_photo" | "pest_id" },
  signal?: AbortSignal,
) => {
  const fd = new FormData();
  fd.append("image", { uri: params.uri, type: "image/jpeg", name: "image.jpg" } as unknown as Blob);
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

export const getFarmerTwin = (farmerId: string) =>
  apiFetch<FarmerTwin>(`/api/v1/farmer/${encodeURIComponent(farmerId)}/twin`, {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
  });

export const putFarmerTwin = (farmerId: string, twin: FarmerTwin) =>
  apiFetch<FarmerTwin>(`/api/v1/farmer/${encodeURIComponent(farmerId)}/twin`, {
    baseUrl: getApiBaseUrl(),
    timeoutMs: TIMEOUTS_MS.query,
    method: "PUT",
    body: twin,
  });
